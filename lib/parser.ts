import matter from "gray-matter";
import { validateSkillFrontmatter, type ValidationResult } from "@/lib/schema";
import type { ParsedSkill, SkillFrontmatter } from "@/lib/types";
import { createHash } from "crypto";

interface ParseResult {
  success: boolean;
  skill?: ParsedSkill;
  validation?: ValidationResult;
  error?: string;
}

function extractSection(content: string, heading: string): string {
  const regex = new RegExp(
    `## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i"
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

export function parseSkillMarkdown(rawContent: string): ParseResult {
  try {
    const { data, content } = matter(rawContent);

    const validation = validateSkillFrontmatter(data);
    if (!validation.valid) {
      return {
        success: false,
        validation,
        error: "YAML frontmatter validation failed",
      };
    }

    const procedure = extractSection(content, "Procedure");
    if (!procedure) {
      return {
        success: false,
        error: "Missing required ## Procedure section",
      };
    }

    const reasoning = extractSection(content, "Reasoning");
    const references = extractSection(content, "References");

    return {
      success: true,
      skill: {
        frontmatter: validation.data as SkillFrontmatter,
        procedure,
        reasoning,
        references,
        rawContent,
      },
      validation,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse markdown: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
