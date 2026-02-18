"use client";

import { useParams, useRouter } from "next/navigation";
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
  if (!data) return <div className="text-red-400">Skill not found</div>;

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
        className="text-sm text-gray-500 hover:text-gray-300 mb-4 block"
      >
        &larr; Back to repository
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{skill.title}</h1>
          <p className="text-gray-400 mt-1">{skill.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="badge-blue">{skill.domain}</span>
            <span className="text-sm text-gray-500">v{skill.version}</span>
            <span className="text-sm text-gray-500 font-mono">
              {skill.filePath}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setEditing(!editing);
            setEditContent("");
          }}
          className="btn-secondary"
        >
          {editing ? "Cancel Edit" : "Edit & Commit"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div
            className={`text-2xl font-bold ${
              skill.priority > 0.7 ? "text-red-400" : "text-synapse-400"
            }`}
          >
            {skill.priority}
          </div>
          <div className="text-sm text-gray-400 mt-1">Priority</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-yellow-400">
            {skill.contextBudgetCost}
          </div>
          <div className="text-sm text-gray-400 mt-1">Context Cost</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-green-400">
            {skill.dependenciesFrom.length}
          </div>
          <div className="text-sm text-gray-400 mt-1">Dependencies</div>
        </div>
      </div>

      {editing && (
        <div className="glass-panel p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Edit Skill Content
          </h3>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Paste your updated markdown content here (with YAML frontmatter)..."
            className="input-field font-mono text-sm h-64 mb-4"
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message (optional)"
              className="input-field flex-1"
            />
            <button
              onClick={handleCommit}
              disabled={committing || !editContent.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {committing && <LoadingSpinner size="sm" />}
              Commit to GitHub
            </button>
          </div>
          {commitError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {commitError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Activation */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Activation</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">Triggers</div>
              <div className="flex flex-wrap gap-2">
                {skill.activationTriggers.map((t) => (
                  <span key={t} className="badge-green">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Required Context</div>
              {skill.activationRequiredContext.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skill.activationRequiredContext.map((c) => (
                    <span key={c} className="badge-yellow">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-600 text-sm">None</span>
              )}
            </div>
          </div>
        </div>

        {/* I/O Schema */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Input/Output Schema
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-2">Inputs</div>
              {skill.inputSchema.map((inp) => (
                <div
                  key={inp.name}
                  className="flex items-center gap-2 mb-1 text-sm"
                >
                  <span className="font-mono text-synapse-300">{inp.name}</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-gray-400">{inp.schema}</span>
                  {inp.required && (
                    <span className="badge-red text-xs">required</span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2">Outputs</div>
              {skill.outputSchema.map((out) => (
                <div
                  key={out.name}
                  className="flex items-center gap-2 mb-1 text-sm"
                >
                  <span className="font-mono text-green-300">{out.name}</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-gray-400">{out.schema}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Dependencies
          </h3>
          {skill.dependenciesFrom.length === 0 ? (
            <p className="text-gray-500 text-sm">No outgoing dependencies</p>
          ) : (
            <div className="space-y-2">
              {skill.dependenciesFrom.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/repository/${repoId}/skill/${dep.toSkill?.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50"
                >
                  <span
                    className={`badge ${
                      dep.type === "REQUIRED" ? "badge-red" : "badge-yellow"
                    }`}
                  >
                    {dep.type.toLowerCase()}
                  </span>
                  <span className="text-gray-300">
                    {dep.toSkill?.title ?? "Unknown"}
                  </span>
                  <span className="text-xs text-gray-600">
                    {dep.toSkill?.domain}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {skill.dependenciesTo.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-500 mb-2">Depended on by</div>
              {skill.dependenciesTo.map((dep) => (
                <Link
                  key={dep.id}
                  href={`/repository/${repoId}/skill/${dep.fromSkill?.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50"
                >
                  <span className="text-gray-300">
                    {dep.fromSkill?.title ?? "Unknown"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Evaluation</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-2">
                Success Criteria
              </div>
              <ul className="space-y-1">
                {skill.evaluationSuccess.map((c, i) => (
                  <li key={i} className="text-sm text-green-400 flex items-start gap-2">
                    <span className="mt-0.5">&#10003;</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2">Failure Modes</div>
              <ul className="space-y-1">
                {skill.evaluationFailure.map((f, i) => (
                  <li key={i} className="text-sm text-red-400 flex items-start gap-2">
                    <span className="mt-0.5">&#10007;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Procedure */}
      <div className="glass-panel p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Procedure</h3>
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4">
            {skill.procedureContent}
          </pre>
        </div>
      </div>

      {skill.reasoningContent && (
        <div className="glass-panel p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Reasoning</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4">
            {skill.reasoningContent}
          </pre>
        </div>
      )}
    </div>
  );
}
