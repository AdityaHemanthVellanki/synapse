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
    <div className="w-80 bg-[#0a0a0a] border-l border-[#1a1a1a] overflow-y-auto">
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-10">
        <h3 className="text-sm font-medium text-white">{skill.title}</h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">{skill.description}</p>

        <div className="flex items-center gap-2">
          <span className="badge-purple">{skill.domain}</span>
          <span className="text-xs text-gray-600 font-mono">v{skill.version}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#111] rounded-md p-2.5 text-center">
            <div className="text-sm font-mono text-gray-300">{skill.priority}</div>
            <div className="text-[10px] text-gray-600 mt-0.5">priority</div>
          </div>
          <div className="bg-[#111] rounded-md p-2.5 text-center">
            <div className="text-sm font-mono text-gray-300">{skill.contextBudgetCost}</div>
            <div className="text-[10px] text-gray-600 mt-0.5">ctx cost</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">triggers</div>
          <div className="flex flex-wrap gap-1">
            {skill.activationTriggers.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#111] text-gray-500">
                {t}
              </span>
            ))}
          </div>
        </div>

        {skill.activationRequiredContext.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">context</div>
            <div className="flex flex-wrap gap-1">
              {skill.activationRequiredContext.map((c) => (
                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[#111] text-gray-500">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">procedure</div>
          <pre className="text-[11px] text-gray-400 bg-[#080808] rounded-md p-3 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
            {skill.procedureContent}
          </pre>
        </div>

        <Link
          href={`/repository/${repoId}/skill/${skill.id}`}
          className="block text-center text-xs text-gray-500 hover:text-white py-2 border border-[#1a1a1a] rounded-md transition-colors"
        >
          view full details
        </Link>
      </div>
    </div>
  );
}
