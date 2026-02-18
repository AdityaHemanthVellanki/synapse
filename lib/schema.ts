import { z } from "zod";

export const SkillInputSchema = z.object({
  name: z.string().min(1, "Input name is required"),
  schema: z.string().min(1, "Input schema is required"),
  required: z.boolean(),
});

export const SkillOutputSchema = z.object({
  name: z.string().min(1, "Output name is required"),
  schema: z.string().min(1, "Output schema is required"),
});

export const SkillActivationSchema = z.object({
  triggers: z.array(z.string().min(1)).min(1, "At least one trigger is required"),
  required_context: z.array(z.string()),
});

export const SkillEvaluationSchema = z.object({
  success_criteria: z.array(z.string()).min(1, "At least one success criterion is required"),
  failure_modes: z.array(z.string()),
});

export const SkillDependenciesSchema = z.object({
  required: z.array(z.string()),
  optional: z.array(z.string()),
});

export const SkillFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., 1.0.0)"),
  domain: z.string().min(1, "Domain is required"),
  priority: z.number().min(0).max(1),
  activation: SkillActivationSchema,
  inputs: z.array(SkillInputSchema),
  outputs: z.array(SkillOutputSchema).min(1, "At least one output is required"),
  dependencies: SkillDependenciesSchema,
  context_budget_cost: z.number().min(0),
  evaluation: SkillEvaluationSchema,
});

export type ValidatedSkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export interface ValidationResult {
  valid: boolean;
  data?: ValidatedSkillFrontmatter;
  errors?: z.ZodError["issues"];
}

export function validateSkillFrontmatter(data: unknown): ValidationResult {
  const result = SkillFrontmatterSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, errors: result.error.issues };
}
