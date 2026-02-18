import type { ActivationScore, DependencyGraph } from "@/lib/types";
import { SkillNode } from "@prisma/client";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeTriggerScore(
  query: string,
  triggers: string[]
): { score: number; matches: string[] } {
  const queryTokens = tokenize(query);
  const matches: string[] = [];
  let totalScore = 0;

  for (const trigger of triggers) {
    const triggerTokens = tokenize(trigger);
    let matchCount = 0;

    for (const tt of triggerTokens) {
      for (const qt of queryTokens) {
        if (qt === tt) {
          matchCount++;
        } else if (qt.includes(tt) || tt.includes(qt)) {
          matchCount += 0.5;
        }
      }
    }

    if (matchCount > 0) {
      matches.push(trigger);
      totalScore += matchCount / Math.max(triggerTokens.length, 1);
    }
  }

  return {
    score: triggers.length > 0 ? totalScore / triggers.length : 0,
    matches,
  };
}

function computeDomainRelevance(query: string, domain: string): number {
  const queryTokens = tokenize(query);
  const domainTokens = tokenize(domain);

  let relevance = 0;
  for (const dt of domainTokens) {
    for (const qt of queryTokens) {
      if (qt === dt) {
        relevance += 1.0;
      } else if (qt.includes(dt) || dt.includes(qt)) {
        relevance += 0.3;
      }
    }
  }

  return Math.min(relevance, 1.0);
}

function computeContextOverlap(
  contextState: string[],
  requiredContext: string[]
): { score: number; overlap: string[] } {
  if (requiredContext.length === 0) {
    return { score: 1.0, overlap: [] };
  }

  const overlap: string[] = [];
  const contextLower = contextState.map((c) => c.toLowerCase());

  for (const req of requiredContext) {
    const reqLower = req.toLowerCase();
    if (contextLower.some((c) => c.includes(reqLower) || reqLower.includes(c))) {
      overlap.push(req);
    }
  }

  return {
    score: overlap.length / requiredContext.length,
    overlap,
  };
}

export function scoreSkills(
  skills: SkillNode[],
  query: string,
  contextState: string[] = []
): ActivationScore[] {
  const scores: ActivationScore[] = [];

  for (const skill of skills) {
    const triggerResult = computeTriggerScore(
      query,
      skill.activationTriggers
    );
    const domainRelevance = computeDomainRelevance(query, skill.domain);
    const contextResult = computeContextOverlap(
      contextState,
      skill.activationRequiredContext
    );

    const weightedScore =
      triggerResult.score * 0.4 +
      domainRelevance * 0.2 +
      contextResult.score * 0.2 +
      skill.priority * 0.2;

    scores.push({
      skillId: skill.id,
      title: skill.title,
      score: Math.round(weightedScore * 1000) / 1000,
      triggerMatches: triggerResult.matches,
      contextOverlap: contextResult.overlap,
      domainRelevance: Math.round(domainRelevance * 1000) / 1000,
      priorityWeight: skill.priority,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  return scores;
}

export function selectRootSkills(
  scores: ActivationScore[],
  minScore: number = 0.1
): ActivationScore[] {
  return scores.filter((s) => s.score >= minScore);
}

export function expandDependencies(
  rootSkillId: string,
  graph: DependencyGraph,
  allSkillScores: Map<string, ActivationScore>
): ActivationScore[] {
  const expanded: ActivationScore[] = [];
  const visited = new Set<string>();

  function expand(skillId: string): void {
    if (visited.has(skillId)) return;
    visited.add(skillId);

    const neighbors = graph.adjacency.get(skillId) ?? [];
    for (const neighbor of neighbors) {
      const edge = graph.edges.find(
        (e) => e.from === skillId && e.to === neighbor
      );
      if (edge?.type === "required") {
        expand(neighbor);
      }
    }

    const score = allSkillScores.get(skillId);
    if (score) {
      expanded.push(score);
    }
  }

  expand(rootSkillId);
  return expanded;
}
