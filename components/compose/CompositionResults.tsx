"use client";

interface ActivationScore {
  skillId: string;
  title: string;
  score: number;
  triggerMatches: string[];
  contextOverlap: string[];
  domainRelevance: number;
  priorityWeight: number;
}

interface OrderedSkillEntry {
  skillId: string;
  title: string;
  domain: string;
  priority: number;
  contextCost: number;
  inputs: Array<{ name: string; schema: string; required: boolean }>;
  outputs: Array<{ name: string; schema: string }>;
  dependsOn: string[];
}

interface ExecutionPlan {
  orderedSkills: OrderedSkillEntry[];
  reasoning: string[];
  contextUsage: number;
  contextBudget: number;
  unresolvedDependencies: string[];
}

interface GraphAnalysis {
  totalNodes: number;
  totalEdges: number;
  cycles: Array<{ cycle: string[]; nodeNames: string[] }>;
  orphanNodes: string[];
  rootNodes: string[];
  averageDepth: number;
  maxDepth: number;
  averageContextCost: number;
}

interface CompositionResultsProps {
  result: {
    activationRanking: ActivationScore[];
    selectedRootSkill: ActivationScore | null;
    executionPlan: ExecutionPlan;
    graphAnalysis: GraphAnalysis;
    reasoning: string[];
  };
}

export function CompositionResults({ result }: CompositionResultsProps) {
  const budgetPercent =
    result.executionPlan.contextBudget > 0
      ? (result.executionPlan.contextUsage / result.executionPlan.contextBudget) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Root Skill */}
      {result.selectedRootSkill && (
        <div className="panel p-5">
          <div className="text-xs text-gray-600 mb-2 font-mono">root skill</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">
                {result.selectedRootSkill.title}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500 font-mono">
                  score: {result.selectedRootSkill.score.toFixed(3)}
                </span>
                {result.selectedRootSkill.triggerMatches.length > 0 && (
                  <span className="text-xs text-gray-600">
                    matched: {result.selectedRootSkill.triggerMatches.join(", ")}
                  </span>
                )}
              </div>
            </div>
            <div className="text-2xl font-mono text-white">
              {Math.round(result.selectedRootSkill.score * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Context Budget */}
      <div className="panel p-5">
        <div className="text-xs text-gray-600 mb-3 font-mono">context budget</div>
        <div className="flex items-center gap-4 mb-1">
          <div className="flex-1 bg-[#111] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent > 90
                  ? "bg-red-500/70"
                  : budgetPercent > 70
                  ? "bg-yellow-500/70"
                  : "bg-white/40"
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
            {result.executionPlan.contextUsage} / {result.executionPlan.contextBudget}
          </span>
        </div>
      </div>

      {/* Execution Order */}
      <div className="panel p-5">
        <div className="text-xs text-gray-600 mb-4 font-mono">
          execution plan · {result.executionPlan.orderedSkills.length} skills
        </div>
        <div className="space-y-2">
          {result.executionPlan.orderedSkills.map((skill, index) => (
            <div
              key={skill.skillId}
              className="flex items-start gap-3 p-3 bg-[#111] rounded-lg border border-[#1a1a1a]"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-gray-500 font-mono text-xs">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{skill.title}</span>
                  <span className="badge-blue text-xs">{skill.domain}</span>
                  <span className="text-xs text-gray-600 font-mono">
                    cost: {skill.contextCost}
                  </span>
                </div>
                {skill.dependsOn.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    depends on: {skill.dependsOn.join(", ")}
                  </div>
                )}
                <div className="flex gap-4 mt-1.5 text-xs">
                  {skill.inputs.length > 0 && (
                    <div>
                      <span className="text-gray-600">in: </span>
                      {skill.inputs.map((i) => (
                        <span key={i.name} className="text-gray-400 mr-1 font-mono">
                          {i.name}
                          {i.required && "*"}
                        </span>
                      ))}
                    </div>
                  )}
                  {skill.outputs.length > 0 && (
                    <div>
                      <span className="text-gray-600">out: </span>
                      {skill.outputs.map((o) => (
                        <span key={o.name} className="text-emerald-400/70 mr-1 font-mono">
                          {o.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {result.executionPlan.orderedSkills.length === 0 && (
            <div className="text-center py-4 text-gray-600 text-sm">
              no skills activated for this query
            </div>
          )}
        </div>
      </div>

      {/* Unresolved Dependencies */}
      {result.executionPlan.unresolvedDependencies.length > 0 && (
        <div className="panel p-5 border-yellow-500/20">
          <div className="text-xs text-yellow-500/70 mb-3 font-mono">
            unresolved dependencies
          </div>
          <ul className="space-y-1">
            {result.executionPlan.unresolvedDependencies.map((dep) => (
              <li key={dep} className="text-sm text-gray-500 flex items-center gap-2">
                <span className="text-yellow-500/70 text-xs">!</span>
                {dep}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Activation Ranking */}
      <div className="panel p-5">
        <div className="text-xs text-gray-600 mb-4 font-mono">activation ranking</div>
        <div className="space-y-2">
          {result.activationRanking.slice(0, 10).map((score, index) => (
            <div
              key={score.skillId}
              className="flex items-center gap-3 text-sm"
            >
              <span className="text-gray-600 w-5 text-right font-mono text-xs">{index + 1}</span>
              <div className="flex-1 bg-[#111] rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-white/30 rounded-full"
                  style={{ width: `${score.score * 100}%` }}
                />
              </div>
              <span className="text-gray-400 w-44 truncate text-xs">{score.title}</span>
              <span className="text-gray-600 w-10 text-right font-mono text-xs">
                {Math.round(score.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reasoning Trace */}
      <div className="panel p-5">
        <div className="text-xs text-gray-600 mb-3 font-mono">reasoning trace</div>
        <div className="space-y-1">
          {result.reasoning.map((reason, i) => (
            <div key={i} className="text-xs text-gray-500 flex items-start gap-2">
              <span className="text-gray-600 mt-0.5 flex-shrink-0">-</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Output */}
      <details className="panel p-5">
        <summary className="text-xs text-gray-600 cursor-pointer font-mono hover:text-gray-400 transition-colors">
          raw json output
        </summary>
        <pre className="mt-3 text-xs text-gray-500 bg-black rounded-lg p-4 overflow-x-auto max-h-80 overflow-y-auto border border-[#1a1a1a]">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}
