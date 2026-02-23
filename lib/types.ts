import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export interface SkillInput {
  name: string;
  schema: string;
  required: boolean;
}

export interface SkillOutput {
  name: string;
  schema: string;
}

export interface SkillActivation {
  triggers: string[];
  required_context: string[];
}

export interface SkillEvaluation {
  success_criteria: string[];
  failure_modes: string[];
}

export interface SkillDependencies {
  required: string[];
  optional: string[];
}

export interface SkillFrontmatter {
  title: string;
  description: string;
  version: string;
  domain: string;
  priority: number;
  activation: SkillActivation;
  inputs: SkillInput[];
  outputs: SkillOutput[];
  dependencies: SkillDependencies;
  context_budget_cost: number;
  evaluation: SkillEvaluation;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  procedure: string;
  reasoning: string;
  references: string;
  rawContent: string;
}

export interface GraphNode {
  id: string;
  title: string;
  domain: string;
  priority: number;
  contextCost: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "required" | "optional";
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
}

export interface CycleInfo {
  cycle: string[];
  nodeNames: string[];
}

export interface GraphAnalysis {
  totalNodes: number;
  totalEdges: number;
  cycles: CycleInfo[];
  orphanNodes: string[];
  rootNodes: string[];
  averageDepth: number;
  maxDepth: number;
  averageContextCost: number;
}

export interface GitHubFile {
  path: string;
  sha: string;
  type: "blob" | "tree";
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  tree: GitHubFile[];
  truncated: boolean;
}

export interface ValidationIssue {
  skillId: string;
  skillTitle: string;
  type: "error" | "warning";
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalSkills: number;
    validSkills: number;
    errors: number;
    warnings: number;
  };
}

export interface ExportManifest {
  name: string;
  version: string;
  skills: string[];
  exportedAt: string;
  source: string;
}
