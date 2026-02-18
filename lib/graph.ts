import type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
  CycleInfo,
  GraphAnalysis,
} from "@/lib/types";
import { SkillNode, SkillDependency } from "@prisma/client";

type SkillWithDeps = SkillNode & {
  dependenciesFrom: SkillDependency[];
};

const graphCache = new Map<string, { graph: DependencyGraph; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function buildDependencyGraph(
  skills: SkillWithDeps[],
  repositoryId: string,
  useCache: boolean = true
): DependencyGraph {
  if (useCache) {
    const cached = graphCache.get(repositoryId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.graph;
    }
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  for (const skill of skills) {
    nodes.set(skill.id, {
      id: skill.id,
      title: skill.title,
      domain: skill.domain,
      priority: skill.priority,
      contextCost: skill.contextBudgetCost,
    });
    adjacency.set(skill.id, []);
    reverseAdjacency.set(skill.id, []);
  }

  for (const skill of skills) {
    for (const dep of skill.dependenciesFrom) {
      if (nodes.has(dep.toSkillId)) {
        edges.push({
          from: dep.fromSkillId,
          to: dep.toSkillId,
          type: dep.type === "REQUIRED" ? "required" : "optional",
        });
        adjacency.get(dep.fromSkillId)?.push(dep.toSkillId);
        reverseAdjacency.get(dep.toSkillId)?.push(dep.fromSkillId);
      }
    }
  }

  const graph: DependencyGraph = { nodes, edges, adjacency, reverseAdjacency };

  graphCache.set(repositoryId, { graph, timestamp: Date.now() });

  return graph;
}

export function invalidateGraphCache(repositoryId: string): void {
  graphCache.delete(repositoryId);
}

export function detectCycles(graph: DependencyGraph): CycleInfo[] {
  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = path.slice(cycleStart);
        cycles.push({
          cycle: [...cyclePath, neighbor],
          nodeNames: cyclePath.map(
            (id) => graph.nodes.get(id)?.title ?? id
          ),
        });
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

export function topologicalSort(graph: DependencyGraph): string[] | null {
  const inDegree = new Map<string, number>();

  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const edge of graph.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => {
      const pa = graph.nodes.get(a)?.priority ?? 0;
      const pb = graph.nodes.get(b)?.priority ?? 0;
      return pb - pa;
    });

    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = graph.adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== graph.nodes.size) {
    return null; // cycle detected
  }

  return sorted;
}

export function findOrphanNodes(graph: DependencyGraph): string[] {
  const orphans: string[] = [];

  for (const nodeId of graph.nodes.keys()) {
    const outgoing = graph.adjacency.get(nodeId) ?? [];
    const incoming = graph.reverseAdjacency.get(nodeId) ?? [];

    if (outgoing.length === 0 && incoming.length === 0) {
      orphans.push(nodeId);
    }
  }

  return orphans;
}

export function findRootNodes(graph: DependencyGraph): string[] {
  const roots: string[] = [];

  for (const nodeId of graph.nodes.keys()) {
    const incoming = graph.reverseAdjacency.get(nodeId) ?? [];
    if (incoming.length === 0) {
      roots.push(nodeId);
    }
  }

  return roots;
}

function computeDepth(
  nodeId: string,
  graph: DependencyGraph,
  memo: Map<string, number>
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!;

  const neighbors = graph.adjacency.get(nodeId) ?? [];
  if (neighbors.length === 0) {
    memo.set(nodeId, 0);
    return 0;
  }

  let maxChildDepth = 0;
  for (const neighbor of neighbors) {
    const childDepth = computeDepth(neighbor, graph, memo);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  const depth = maxChildDepth + 1;
  memo.set(nodeId, depth);
  return depth;
}

export function analyzeGraph(graph: DependencyGraph): GraphAnalysis {
  const cycles = detectCycles(graph);
  const orphanNodes = findOrphanNodes(graph);
  const rootNodes = findRootNodes(graph);

  const depthMemo = new Map<string, number>();
  let totalDepth = 0;
  let maxDepth = 0;

  for (const nodeId of graph.nodes.keys()) {
    const depth = computeDepth(nodeId, graph, depthMemo);
    totalDepth += depth;
    maxDepth = Math.max(maxDepth, depth);
  }

  const nodeCount = graph.nodes.size;
  const averageDepth = nodeCount > 0 ? totalDepth / nodeCount : 0;

  let totalContextCost = 0;
  for (const node of graph.nodes.values()) {
    totalContextCost += node.contextCost;
  }
  const averageContextCost = nodeCount > 0 ? totalContextCost / nodeCount : 0;

  return {
    totalNodes: nodeCount,
    totalEdges: graph.edges.length,
    cycles,
    orphanNodes,
    rootNodes,
    averageDepth: Math.round(averageDepth * 100) / 100,
    maxDepth,
    averageContextCost: Math.round(averageContextCost * 100) / 100,
  };
}

export function resolveDependencies(
  skillId: string,
  graph: DependencyGraph,
  includeOptional: boolean = false
): string[] {
  const resolved = new Set<string>();
  const visiting = new Set<string>();

  function resolve(id: string): void {
    if (resolved.has(id) || visiting.has(id)) return;
    visiting.add(id);

    const neighbors = graph.adjacency.get(id) ?? [];
    for (const neighbor of neighbors) {
      const edge = graph.edges.find(
        (e) => e.from === id && e.to === neighbor
      );
      if (edge && (edge.type === "required" || includeOptional)) {
        resolve(neighbor);
      }
    }

    visiting.delete(id);
    resolved.add(id);
  }

  resolve(skillId);
  return Array.from(resolved);
}
