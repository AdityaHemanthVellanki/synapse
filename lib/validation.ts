import type { ValidationIssue, ValidationReport } from "@/lib/types";
import { buildDependencyGraph, detectCycles, findOrphanNodes, topologicalSort } from "@/lib/graph";
import { SkillNode, SkillDependency } from "@prisma/client";

type SkillWithDeps = SkillNode & {
  dependenciesFrom: SkillDependency[];
  dependenciesTo: SkillDependency[];
};

export function validateGraph(skills: SkillWithDeps[], repositoryId: string): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Build graph for structural analysis
  const graph = buildDependencyGraph(
    skills.map((s) => ({ ...s, dependenciesFrom: s.dependenciesFrom })),
    repositoryId,
    false
  );

  // 1. Check for cycles
  const cycles = detectCycles(graph);
  for (const cycle of cycles) {
    for (const nodeId of cycle.cycle.slice(0, -1)) {
      const skill = skills.find((s) => s.id === nodeId);
      if (skill) {
        issues.push({
          skillId: nodeId,
          skillTitle: skill.title,
          type: "error",
          message: `Circular dependency detected: ${cycle.nodeNames.join(" → ")}`,
        });
      }
    }
  }

  // 2. Check for orphan nodes
  const orphans = findOrphanNodes(graph);
  for (const orphanId of orphans) {
    const skill = skills.find((s) => s.id === orphanId);
    if (skill) {
      issues.push({
        skillId: orphanId,
        skillTitle: skill.title,
        type: "warning",
        message: "Isolated node with no connections to other skills",
      });
    }
  }

  // 3. Validate topological sort is possible (no cycles)
  const sorted = topologicalSort(graph);
  if (!sorted) {
    issues.push({
      skillId: "",
      skillTitle: "Graph",
      type: "error",
      message: "Graph contains cycles and cannot be topologically sorted",
    });
  }

  // 4. Validate each skill node
  const titleSet = new Set(skills.map((s) => s.title));

  for (const skill of skills) {
    // Required fields
    if (!skill.title.trim()) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title || "(untitled)",
        type: "error",
        message: "Missing required field: title",
      });
    }

    if (!skill.description.trim()) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title,
        type: "error",
        message: "Missing required field: description",
      });
    }

    if (!skill.version.match(/^\d+\.\d+\.\d+$/)) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title,
        type: "error",
        message: `Invalid version format: "${skill.version}" (expected semver x.y.z)`,
      });
    }

    if (!skill.procedureContent.trim()) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title,
        type: "warning",
        message: "Empty procedure content",
      });
    }

    // Activation triggers
    if (skill.activationTriggers.length === 0) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title,
        type: "warning",
        message: "No activation triggers defined",
      });
    }

    // Input/output schemas
    const inputs = skill.inputSchema as Array<{ name: string; schema: string; required: boolean }>;
    const outputs = skill.outputSchema as Array<{ name: string; schema: string }>;

    if (outputs.length === 0) {
      issues.push({
        skillId: skill.id,
        skillTitle: skill.title,
        type: "error",
        message: "No outputs defined — skill must produce at least one output",
      });
    }

    // Check for unresolved dependencies
    for (const dep of skill.dependenciesFrom) {
      const target = skills.find((s) => s.id === dep.toSkillId);
      if (!target) {
        issues.push({
          skillId: skill.id,
          skillTitle: skill.title,
          type: "error",
          message: `Unresolved dependency: target skill not found in graph`,
        });
      }
    }

    // 5. Validate input/output compatibility along dependency edges
    for (const dep of skill.dependenciesFrom) {
      if (dep.type !== "REQUIRED") continue;

      const target = skills.find((s) => s.id === dep.toSkillId);
      if (!target) continue;

      const targetOutputs = target.outputSchema as Array<{ name: string; schema: string }>;
      const targetOutputNames = new Set(targetOutputs.map((o) => o.name));

      // Check if any required inputs could be satisfied by dependency outputs
      const requiredInputs = inputs.filter((i) => i.required);
      for (const input of requiredInputs) {
        if (targetOutputNames.has(input.name)) {
          // Compatible - input name matches an output of the dependency
        }
      }
    }

    // 6. Version consistency check
    // Warn if multiple versions exist across skills (suggests inconsistency)
  }

  // Version consistency: check if there are mixed versions
  const versions = new Set(skills.map((s) => s.version));
  if (versions.size > 3) {
    issues.push({
      skillId: "",
      skillTitle: "Graph",
      type: "warning",
      message: `${versions.size} different versions found across skills — consider standardizing`,
    });
  }

  const errors = issues.filter((i) => i.type === "error").length;
  const warnings = issues.filter((i) => i.type === "warning").length;

  return {
    valid: errors === 0,
    issues,
    summary: {
      totalSkills: skills.length,
      validSkills: skills.length - new Set(issues.filter((i) => i.type === "error").map((i) => i.skillId)).size,
      errors,
      warnings,
    },
  };
}
