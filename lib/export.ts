import JSZip from "jszip";
import { SkillNode, SkillDependency } from "@prisma/client";
import { buildDependencyGraph, resolveDependencies, topologicalSort } from "@/lib/graph";
import { validateGraph } from "@/lib/validation";
import type { ExportManifest } from "@/lib/types";
import { createHash } from "crypto";

type SkillWithDeps = SkillNode & {
  dependenciesFrom: SkillDependency[];
  dependenciesTo: SkillDependency[];
};

function sanitizeName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateIndexYaml(skill: SkillWithDeps, allSkills: SkillWithDeps[]): string {
  const inputs = skill.inputSchema as Array<{ name: string; schema: string; required: boolean }>;
  const outputs = skill.outputSchema as Array<{ name: string; schema: string }>;

  const depTitles = skill.dependenciesFrom
    .filter((d) => d.type === "REQUIRED")
    .map((d) => {
      const target = allSkills.find((s) => s.id === d.toSkillId);
      return target ? sanitizeName(target.title) : null;
    })
    .filter(Boolean);

  const optionalDepTitles = skill.dependenciesFrom
    .filter((d) => d.type === "OPTIONAL")
    .map((d) => {
      const target = allSkills.find((s) => s.id === d.toSkillId);
      return target ? sanitizeName(target.title) : null;
    })
    .filter(Boolean);

  let yaml = `name: ${sanitizeName(skill.title)}\n`;
  yaml += `description: ${skill.description}\n`;
  yaml += `version: ${skill.version}\n`;
  yaml += `activation_triggers:\n`;
  for (const trigger of skill.activationTriggers) {
    yaml += `  - ${trigger}\n`;
  }
  yaml += `inputs:\n`;
  for (const input of inputs) {
    yaml += `  - name: ${input.name}\n`;
    yaml += `    type: ${input.schema}\n`;
    if (input.required) {
      yaml += `    required: true\n`;
    }
  }
  yaml += `outputs:\n`;
  for (const output of outputs) {
    yaml += `  - name: ${output.name}\n`;
    yaml += `    type: ${output.schema}\n`;
  }
  if (depTitles.length > 0) {
    yaml += `dependencies:\n`;
    for (const dep of depTitles) {
      yaml += `  - ${dep}\n`;
    }
  }
  if (optionalDepTitles.length > 0) {
    yaml += `# optional_dependencies:\n`;
    for (const dep of optionalDepTitles) {
      yaml += `#   - ${dep}\n`;
    }
  }

  return yaml;
}

function generateImplementation(skill: SkillWithDeps): string {
  const inputs = skill.inputSchema as Array<{ name: string; schema: string; required: boolean }>;
  const outputs = skill.outputSchema as Array<{ name: string; schema: string }>;

  const inputParams = inputs.map((i) => `${i.name}: ${mapSchemaToTs(i.schema)}`).join(", ");
  const outputType = outputs.length === 1
    ? `{ ${outputs[0].name}: ${mapSchemaToTs(outputs[0].schema)} }`
    : `{ ${outputs.map((o) => `${o.name}: ${mapSchemaToTs(o.schema)}`).join("; ")} }`;

  let code = `/**\n`;
  code += ` * ${skill.title}\n`;
  code += ` * ${skill.description}\n`;
  code += ` *\n`;
  code += ` * Domain: ${skill.domain}\n`;
  code += ` * Version: ${skill.version}\n`;
  code += ` */\n\n`;

  code += `export interface Inputs {\n`;
  for (const input of inputs) {
    code += `  ${input.name}${input.required ? "" : "?"}: ${mapSchemaToTs(input.schema)};\n`;
  }
  code += `}\n\n`;

  code += `export interface Outputs {\n`;
  for (const output of outputs) {
    code += `  ${output.name}: ${mapSchemaToTs(output.schema)};\n`;
  }
  code += `}\n\n`;

  code += `export default async function execute(inputs: Inputs): Promise<Outputs> {\n`;

  // Include procedure as comments
  if (skill.procedureContent.trim()) {
    code += `  /**\n`;
    code += `   * Procedure:\n`;
    for (const line of skill.procedureContent.split("\n")) {
      code += `   * ${line}\n`;
    }
    code += `   */\n\n`;
  }

  code += `  // TODO: implement skill logic\n`;
  code += `  throw new Error("Not implemented");\n`;
  code += `}\n`;

  return code;
}

function generateMetadata(skill: SkillWithDeps, allSkills: SkillWithDeps[]): string {
  const deps = skill.dependenciesFrom.map((d) => {
    const target = allSkills.find((s) => s.id === d.toSkillId);
    return {
      name: target ? sanitizeName(target.title) : d.toSkillId,
      type: d.type.toLowerCase(),
    };
  });

  const metadata = {
    domain: skill.domain,
    priority: skill.priority,
    context_budget_cost: skill.contextBudgetCost,
    activation: {
      triggers: skill.activationTriggers,
      required_context: skill.activationRequiredContext,
    },
    dependencies: deps,
    evaluation: {
      success_criteria: skill.evaluationSuccess,
      failure_modes: skill.evaluationFailure,
    },
  };

  return JSON.stringify(metadata, null, 2);
}

function mapSchemaToTs(schema: string): string {
  const lower = schema.toLowerCase();
  if (lower.includes("number") || lower.includes("float") || lower.includes("int")) return "number";
  if (lower.includes("boolean") || lower.includes("bool")) return "boolean";
  if (lower.includes("array") || lower.includes("list") || lower.includes("[]")) return "any[]";
  if (lower.includes("object") || lower.includes("map") || lower.includes("record")) return "Record<string, any>";
  if (lower.includes("string")) return "string";
  return "any";
}

export interface ExportOptions {
  repositoryId: string;
  repoFullName: string;
  selectedNodeIds?: string[];
  skills: SkillWithDeps[];
}

export interface ExportResult {
  zipBuffer: Buffer;
  manifest: ExportManifest;
  versionHash: string;
  exportedNodeIds: string[];
}

export async function exportToClaudeCode(options: ExportOptions): Promise<ExportResult> {
  const { repositoryId, repoFullName, selectedNodeIds, skills } = options;

  // Determine which skills to export
  let skillsToExport: SkillWithDeps[];

  if (selectedNodeIds && selectedNodeIds.length > 0) {
    // Build graph to resolve dependencies
    const graph = buildDependencyGraph(
      skills.map((s) => ({ ...s, dependenciesFrom: s.dependenciesFrom })),
      repositoryId,
      false
    );

    // Resolve all required dependencies for selected nodes
    const allNeededIds = new Set<string>();
    for (const nodeId of selectedNodeIds) {
      const resolved = resolveDependencies(nodeId, graph, false);
      for (const id of resolved) {
        allNeededIds.add(id);
      }
    }

    skillsToExport = skills.filter((s) => allNeededIds.has(s.id));
  } else {
    skillsToExport = skills;
  }

  // Validate before export
  const validation = validateGraph(skillsToExport, repositoryId);
  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i) => i.type === "error")
      .map((i) => `${i.skillTitle}: ${i.message}`)
      .join("; ");
    throw new Error(`Export blocked — validation failed: ${errorMessages}`);
  }

  // Generate version hash
  const hashInput = skillsToExport
    .map((s) => `${s.title}:${s.version}:${s.contentHash}`)
    .sort()
    .join("|");
  const versionHash = createHash("sha256").update(hashInput).digest("hex").slice(0, 12);

  // Build zip
  const zip = new JSZip();
  const skillsFolder = zip.folder("skills")!;

  for (const skill of skillsToExport) {
    const name = sanitizeName(skill.title);
    const folder = skillsFolder.folder(name)!;

    folder.file("index.yaml", generateIndexYaml(skill, skillsToExport));
    folder.file("implementation.ts", generateImplementation(skill));
    folder.file("metadata.json", generateMetadata(skill, skillsToExport));
  }

  // Add manifest
  const manifest: ExportManifest = {
    name: sanitizeName(repoFullName.split("/").pop() ?? "skills"),
    version: versionHash,
    skills: skillsToExport.map((s) => sanitizeName(s.title)),
    exportedAt: new Date().toISOString(),
    source: repoFullName,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return {
    zipBuffer,
    manifest,
    versionHash,
    exportedNodeIds: skillsToExport.map((s) => s.id),
  };
}
