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
    <div className="space-y-6">
      {/* Root Skill */}
      {result.selectedRootSkill && (
        <div className="glass-panel p-6 border-synapse-500/30">
          <h3 className="text-lg font-semibold text-white mb-2">
            Selected Root Skill
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-synapse-300">
                {result.selectedRootSkill.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-400">
                  Score: {result.selectedRootSkill.score}
                </span>
                {result.selectedRootSkill.triggerMatches.length > 0 && (
                  <span className="text-xs text-gray-500">
                    Matched: {result.selectedRootSkill.triggerMatches.join(", ")}
                  </span>
                )}
              </div>
            </div>
            <div className="text-3xl font-bold text-synapse-400">
              {Math.round(result.selectedRootSkill.score * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Context Budget */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          Context Budget
        </h3>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent > 90
                  ? "bg-red-500"
                  : budgetPercent > 70
                  ? "bg-yellow-500"
                  : "bg-synapse-500"
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <span className="text-sm text-gray-400 whitespace-nowrap">
            {result.executionPlan.contextUsage} / {result.executionPlan.contextBudget}
          </span>
        </div>
      </div>

      {/* Execution Order */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Execution Plan ({result.executionPlan.orderedSkills.length} skills)
        </h3>
        <div className="space-y-3">
          {result.executionPlan.orderedSkills.map((skill, index) => (
            <div
              key={skill.skillId}
              className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-synapse-600/30 flex items-center justify-center text-synapse-300 font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{skill.title}</span>
                  <span className="badge-blue text-xs">{skill.domain}</span>
                  <span className="text-xs text-yellow-400/70">
                    Cost: {skill.contextCost}
                  </span>
                </div>
                {skill.dependsOn.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Depends on: {skill.dependsOn.join(", ")}
                  </div>
                )}
                <div className="flex gap-4 mt-2 text-xs">
                  {skill.inputs.length > 0 && (
                    <div>
                      <span className="text-gray-500">In: </span>
                      {skill.inputs.map((i) => (
                        <span key={i.name} className="text-synapse-300 mr-1">
                          {i.name}
                          {i.required && "*"}
                        </span>
                      ))}
                    </div>
                  )}
                  {skill.outputs.length > 0 && (
                    <div>
                      <span className="text-gray-500">Out: </span>
                      {skill.outputs.map((o) => (
                        <span key={o.name} className="text-green-300 mr-1">
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
            <div className="text-center py-4 text-gray-500">
              No skills activated for this query
            </div>
          )}
        </div>
      </div>

      {/* Unresolved Dependencies */}
      {result.executionPlan.unresolvedDependencies.length > 0 && (
        <div className="glass-panel p-6 border-yellow-500/30">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">
            Unresolved Dependencies
          </h3>
          <ul className="space-y-1">
            {result.executionPlan.unresolvedDependencies.map((dep) => (
              <li key={dep} className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-yellow-500">&#9888;</span>
                {dep}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Activation Ranking */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Activation Ranking
        </h3>
        <div className="space-y-2">
          {result.activationRanking.slice(0, 10).map((score, index) => (
            <div
              key={score.skillId}
              className="flex items-center gap-3 text-sm"
            >
              <span className="text-gray-600 w-6 text-right">{index + 1}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-synapse-500 rounded-full"
                  style={{ width: `${score.score * 100}%` }}
                />
              </div>
              <span className="text-gray-300 w-48 truncate">{score.title}</span>
              <span className="text-gray-500 w-12 text-right">
                {Math.round(score.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reasoning Trace */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          Reasoning Trace
        </h3>
        <div className="space-y-1">
          {result.reasoning.map((reason, i) => (
            <div key={i} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-synapse-500 mt-0.5 flex-shrink-0">&#9656;</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Output */}
      <details className="glass-panel p-6">
        <summary className="text-lg font-semibold text-white cursor-pointer">
          Raw JSON Output
        </summary>
        <pre className="mt-4 text-xs text-gray-400 bg-gray-800/50 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}
