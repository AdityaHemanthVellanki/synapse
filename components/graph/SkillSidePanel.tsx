"use client";

import Link from "next/link";

interface SkillNode {
  id: string;
  title: string;
  description: string;
  domain: string;
  priority: number;
  version: string;
  contextBudgetCost: number;
  activationTriggers: string[];
  activationRequiredContext: string[];
  procedureContent: string;
}

interface SkillSidePanelProps {
  skill: SkillNode | null;
  repoId: string;
  onClose: () => void;
}

export function SkillSidePanel({ skill, repoId, onClose }: SkillSidePanelProps) {
  if (!skill) return null;

  return (
    <div className="w-96 glass-panel border-l border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900/90 backdrop-blur-xl z-10">
        <h3 className="font-semibold text-white">{skill.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-400">{skill.description}</p>

        <div className="flex items-center gap-3">
          <span className="badge-blue">{skill.domain}</span>
          <span className="text-sm text-gray-500">v{skill.version}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div
              className={`text-xl font-bold ${
                skill.priority > 0.7 ? "text-red-400" : "text-synapse-400"
              }`}
            >
              {skill.priority}
            </div>
            <div className="text-xs text-gray-500">Priority</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">
              {skill.contextBudgetCost}
            </div>
            <div className="text-xs text-gray-500">Context Cost</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-2">Triggers</div>
          <div className="flex flex-wrap gap-1">
            {skill.activationTriggers.map((t) => (
              <span key={t} className="badge-green text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>

        {skill.activationRequiredContext.length > 0 && (
          <div>
            <div className="text-sm text-gray-500 mb-2">Required Context</div>
            <div className="flex flex-wrap gap-1">
              {skill.activationRequiredContext.map((c) => (
                <span key={c} className="badge-yellow text-xs">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm text-gray-500 mb-2">Procedure</div>
          <pre className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {skill.procedureContent}
          </pre>
        </div>

        <Link
          href={`/repository/${repoId}/skill/${skill.id}`}
          className="btn-primary w-full text-center block"
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
}
