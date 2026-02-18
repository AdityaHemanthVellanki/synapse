"use client";

import { useParams } from "next/navigation";
import { useApi, apiPost } from "@/hooks/use-api";
import { PageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useState } from "react";

interface SkillDep {
  id: string;
  type: string;
  toSkill?: { id: string; title: string; domain: string };
  fromSkill?: { id: string; title: string; domain: string };
}

interface SkillData {
  skill: {
    id: string;
    repositoryId: string;
    filePath: string;
    title: string;
    description: string;
    version: string;
    domain: string;
    priority: number;
    activationTriggers: string[];
    activationRequiredContext: string[];
    inputSchema: Array<{ name: string; schema: string; required: boolean }>;
    outputSchema: Array<{ name: string; schema: string }>;
    contextBudgetCost: number;
    procedureContent: string;
    reasoningContent: string | null;
    evaluationSuccess: string[];
    evaluationFailure: string[];
    contentHash: string;
    createdAt: string;
    updatedAt: string;
    dependenciesFrom: SkillDep[];
    dependenciesTo: SkillDep[];
    repository: { userId: string; fullName: string };
  };
}

export default function SkillDetailPage() {
  const params = useParams();
  const repoId = params.id as string;
  const skillId = params.skillId as string;
  const { data, loading } = useApi<SkillData>(`/api/skills/${skillId}`);
  const [editing, setEditing] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [editContent, setEditContent] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-gray-500 text-sm">skill not found</div>;

  const skill = data.skill;

  async function handleCommit() {
    setCommitting(true);
    setCommitError(null);
    try {
      await apiPost(`/api/skills/${skillId}/commit`, {
        content: editContent,
        message: commitMessage || `Update skill: ${skill.title}`,
      });
      setEditing(false);
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div>
      <Link
        href={`/repository/${repoId}`}
        className="text-xs text-gray-600 hover:text-gray-400 mb-6 block transition-colors"
      >
        &larr; back to repository
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-white">{skill.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="badge-blue">{skill.domain}</span>
            <span className="text-xs text-gray-600 font-mono">v{skill.version}</span>
            <span className="text-xs text-gray-600 font-mono">
              {skill.filePath}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setEditing(!editing);
            setEditContent("");
          }}
          className="btn-secondary text-xs"
        >
          {editing ? "cancel" : "edit & commit"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="stat-card">
          <div className="text-lg font-mono text-white">
            {skill.priority}
          </div>
          <div className="text-xs text-gray-600 mt-1">priority</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-mono text-white">
            {skill.contextBudgetCost}
          </div>
          <div className="text-xs text-gray-600 mt-1">context cost</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-mono text-white">
            {skill.dependenciesFrom.length}
          </div>
          <div className="text-xs text-gray-600 mt-1">dependencies</div>
        </div>
      </div>

      {editing && (
        <div className="panel p-5 mb-8">
          <div className="text-xs text-gray-600 mb-3 font-mono">edit skill content</div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="paste updated markdown content here (with yaml frontmatter)..."
            className="input-field font-mono text-xs h-64 mb-3"
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="commit message (optional)"
              className="input-field flex-1 text-xs"
            />
            <button
              onClick={handleCommit}
              disabled={committing || !editContent.trim()}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {committing && <LoadingSpinner size="sm" />}
              commit to github
            </button>
          </div>
          {commitError && (
            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400/80 text-xs">
              {commitError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Activation */}
        <div className="panel p-5">
          <div className="text-xs text-gray-600 mb-3 font-mono">activation</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1.5">triggers</div>
              <div className="flex flex-wrap gap-1.5">
                {skill.activationTriggers.map((t) => (
                  <span key={t} className="badge-green text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1.5">required context</div>
              {skill.activationRequiredContext.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skill.activationRequiredContext.map((c) => (
                    <span key={c} className="badge-yellow text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-700 text-xs">none</span>
              )}
            </div>
          </div>
        </div>

        {/* I/O Schema */}
        <div className="panel p-5">
          <div className="text-xs text-gray-600 mb-3 font-mono">input / output</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1.5">inputs</div>
              {skill.inputSchema.map((inp) => (
                <div
                  key={inp.name}
                  className="flex items-center gap-2 mb-1 text-xs"
                >
                  <span className="font-mono text-gray-300">{inp.name}</span>
                  <span className="text-gray-700">:</span>
                  <span className="text-gray-500 truncate">{inp.schema}</span>
                  {inp.required && (
                    <span className="badge-red text-xs">req</span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1.5">outputs</div>
              {skill.outputSchema.map((out) => (
                <div
                  key={out.name}
                  className="flex items-center gap-2 mb-1 text-xs"
                >
                  <span className="font-mono text-emerald-400/70">{out.name}</span>
                  <span className="text-gray-700">:</span>
                  <span className="text-gray-500 truncate">{out.schema}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="panel p-5">
          <div className="text-xs text-gray-600 mb-3 font-mono">dependencies</div>
          {skill.dependenciesFrom.length === 0 ? (
            <p className="text-gray-700 text-xs">no outgoing dependencies</p>
          ) : (
            <div className="space-y-1">
              {skill.dependenciesFrom.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/repository/${repoId}/skill/${dep.toSkill?.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#111] transition-colors"
                >
                  <span
                    className={`badge text-xs ${
                      dep.type === "REQUIRED" ? "badge-red" : "badge-yellow"
                    }`}
                  >
                    {dep.type.toLowerCase()}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {dep.toSkill?.title ?? "unknown"}
                  </span>
                  <span className="text-xs text-gray-700 font-mono">
                    {dep.toSkill?.domain}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {skill.dependenciesTo.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
              <div className="text-xs text-gray-600 mb-1.5">depended on by</div>
              {skill.dependenciesTo.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/repository/${repoId}/skill/${dep.fromSkill?.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#111] transition-colors"
                >
                  <span className="text-gray-400 text-xs">
                    {dep.fromSkill?.title ?? "unknown"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation */}
        <div className="panel p-5">
          <div className="text-xs text-gray-600 mb-3 font-mono">evaluation</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1.5">success criteria</div>
              <ul className="space-y-1">
                {skill.evaluationSuccess.map((c, i) => (
                  <li key={i} className="text-xs text-emerald-400/70 flex items-start gap-1.5">
                    <span className="mt-0.5 text-emerald-500/50">+</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1.5">failure modes</div>
              <ul className="space-y-1">
                {skill.evaluationFailure.map((f, i) => (
                  <li key={i} className="text-xs text-red-400/70 flex items-start gap-1.5">
                    <span className="mt-0.5 text-red-500/50">-</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Procedure */}
      <div className="panel p-5 mt-4">
        <div className="text-xs text-gray-600 mb-3 font-mono">procedure</div>
        <pre className="whitespace-pre-wrap text-xs text-gray-400 bg-black rounded-lg p-4 border border-[#1a1a1a]">
          {skill.procedureContent}
        </pre>
      </div>

      {skill.reasoningContent && (
        <div className="panel p-5 mt-4">
          <div className="text-xs text-gray-600 mb-3 font-mono">reasoning</div>
          <pre className="whitespace-pre-wrap text-xs text-gray-400 bg-black rounded-lg p-4 border border-[#1a1a1a]">
            {skill.reasoningContent}
          </pre>
        </div>
      )}
    </div>
  );
}
