import type {
  ExecutionPlan,
  OrderedSkillEntry,
  ActivationScore,
  DependencyGraph,
} from "@/lib/types";
import { topologicalSort } from "@/lib/graph";
import { SkillNode } from "@prisma/client";

const DEFAULT_CONTEXT_BUDGET = 10.0;

export function buildExecutionPlan(
  activatedSkillIds: string[],
  graph: DependencyGraph,
  skillMap: Map<string, SkillNode>,
  contextBudget: number = DEFAULT_CONTEXT_BUDGET
): ExecutionPlan {
  const reasoning: string[] = [];
  const unresolvedDependencies: string[] = [];

  const relevantNodeIds = new Set<string>();
  const visited = new Set<string>();

  function collectDependencies(skillId: string): void {
    if (visited.has(skillId)) return;
    visited.add(skillId);

    if (!graph.nodes.has(skillId)) {
      unresolvedDependencies.push(skillId);
      return;
    }

    relevantNodeIds.add(skillId);

    const neighbors = graph.adjacency.get(skillId) ?? [];
    for (const neighbor of neighbors) {
      const edge = graph.edges.find(
        (e) => e.from === skillId && e.to === neighbor
      );
      if (edge?.type === "required") {
        collectDependencies(neighbor);
      }
    }
  }

  for (const skillId of activatedSkillIds) {
    collectDependencies(skillId);
  }

  reasoning.push(
    `Collected ${relevantNodeIds.size} skills from ${activatedSkillIds.length} activated roots`
  );

  if (unresolvedDependencies.length > 0) {
    reasoning.push(
      `Found ${unresolvedDependencies.length} unresolved dependencies`
    );
  }

  const subgraphNodes = new Map<string, typeof graph.nodes extends Map<string, infer V> ? V : never>();
  const subgraphEdges = graph.edges.filter(
    (e) => relevantNodeIds.has(e.from) && relevantNodeIds.has(e.to)
  );
  const subgraphAdj = new Map<string, string[]>();
  const subgraphRevAdj = new Map<string, string[]>();

  for (const nodeId of relevantNodeIds) {
    const node = graph.nodes.get(nodeId);
    if (node) subgraphNodes.set(nodeId, node);
    subgraphAdj.set(nodeId, []);
    subgraphRevAdj.set(nodeId, []);
  }

  for (const edge of subgraphEdges) {
    subgraphAdj.get(edge.from)?.push(edge.to);
    subgraphRevAdj.get(edge.to)?.push(edge.from);
  }

  const subgraph: DependencyGraph = {
    nodes: subgraphNodes,
    edges: subgraphEdges,
    adjacency: subgraphAdj,
    reverseAdjacency: subgraphRevAdj,
  };

  const sortedIds = topologicalSort(subgraph);

  if (!sortedIds) {
    reasoning.push("Cycle detected in dependency subgraph, using priority-based ordering");

    const fallbackOrder = Array.from(relevantNodeIds).sort((a, b) => {
      const pa = graph.nodes.get(a)?.priority ?? 0;
      const pb = graph.nodes.get(b)?.priority ?? 0;
      return pb - pa;
    });

    return buildPlanFromOrder(
      fallbackOrder,
      graph,
      skillMap,
      contextBudget,
      reasoning,
      unresolvedDependencies
    );
  }

  reasoning.push(`Topological sort produced ${sortedIds.length} ordered skills`);

  // Reverse: dependencies should execute first
  const executionOrder = sortedIds.reverse();

  return buildPlanFromOrder(
    executionOrder,
    graph,
    skillMap,
    contextBudget,
    reasoning,
    unresolvedDependencies
  );
}

function buildPlanFromOrder(
  orderedIds: string[],
  graph: DependencyGraph,
  skillMap: Map<string, SkillNode>,
  contextBudget: number,
  reasoning: string[],
  unresolvedDependencies: string[]
): ExecutionPlan {
  const orderedSkills: OrderedSkillEntry[] = [];
  let contextUsage = 0;

  for (const skillId of orderedIds) {
    const skill = skillMap.get(skillId);
    if (!skill) continue;

    const cost = skill.contextBudgetCost;

    if (contextUsage + cost > contextBudget) {
      reasoning.push(
        `Skipping "${skill.title}" - would exceed context budget (${contextUsage + cost} > ${contextBudget})`
      );
      continue;
    }

    contextUsage += cost;

    const deps = graph.adjacency.get(skillId) ?? [];
    const requiredDeps = deps.filter((d) =>
      graph.edges.some(
        (e) => e.from === skillId && e.to === d && e.type === "required"
      )
    );

    const inputs = Array.isArray(skill.inputSchema)
      ? (skill.inputSchema as Array<{ name: string; schema: string; required: boolean }>)
      : [];
    const outputs = Array.isArray(skill.outputSchema)
      ? (skill.outputSchema as Array<{ name: string; schema: string }>)
      : [];

    orderedSkills.push({
      skillId,
      title: skill.title,
      domain: skill.domain,
      priority: skill.priority,
      contextCost: cost,
      inputs,
      outputs,
      dependsOn: requiredDeps.map(
        (d) => skillMap.get(d)?.title ?? d
      ),
    });
  }

  reasoning.push(
    `Final plan: ${orderedSkills.length} skills, context usage: ${contextUsage}/${contextBudget}`
  );

  return {
    orderedSkills,
    reasoning,
    contextUsage: Math.round(contextUsage * 100) / 100,
    contextBudget,
    unresolvedDependencies,
  };
}

export function validateInputOutputChain(
  plan: ExecutionPlan
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const availableOutputs = new Map<string, string>();

  for (const skill of plan.orderedSkills) {
    for (const input of skill.inputs) {
      if (input.required && !availableOutputs.has(input.name)) {
        const hasProvider = plan.orderedSkills.some(
          (s) =>
            s.skillId !== skill.skillId &&
            s.outputs.some((o) => o.name === input.name)
        );
        if (!hasProvider) {
          issues.push(
            `Skill "${skill.title}" requires input "${input.name}" but no prior skill provides it`
          );
        }
      }
    }

    for (const output of skill.outputs) {
      availableOutputs.set(output.name, skill.skillId);
    }
  }

  return { valid: issues.length === 0, issues };
}
