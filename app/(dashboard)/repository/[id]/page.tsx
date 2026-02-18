"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi, apiPost } from "@/hooks/use-api";
import { PageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useState } from "react";

interface SkillNode {
  id: string;
  title: string;
  description: string;
  domain: string;
  priority: number;
  version: string;
  contextBudgetCost: number;
  filePath: string;
  activationTriggers: string[];
}

interface FileIndex {
  filePath: string;
  isValid: boolean;
  errorMessage: string | null;
  lastIndexed: string;
}

interface RepoData {
  repository: {
    id: string;
    fullName: string;
    defaultBranch: string;
    selectedBranch: string | null;
    rootPath: string;
    lastSyncedAt: string | null;
    skillNodes: SkillNode[];
    fileIndices: FileIndex[];
    _count: {
      skillNodes: number;
      skillDependencies: number;
      executionLogs: number;
    };
  };
}

export default function RepositoryPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, loading, refetch } = useApi<RepoData>(
    `/api/repositories/${id}`
  );
  const [syncing, setSyncing] = useState(false);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-red-400">Repository not found</div>;

  const repo = data.repository;
  const invalidFiles = repo.fileIndices.filter((f) => !f.isValid);

  async function handleSync() {
    setSyncing(true);
    try {
      await apiPost(`/api/repositories/${id}/sync`, {});
      refetch();
    } catch {
      // error handled by UI
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 mb-2 block">
            &larr; Back to repositories
          </Link>
          <h1 className="text-2xl font-bold text-white">{repo.fullName}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span>Branch: {repo.selectedBranch ?? repo.defaultBranch}</span>
            <span>Path: {repo.rootPath}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2"
          >
            {syncing && <LoadingSpinner size="sm" />}
            {syncing ? "Syncing..." : "Re-sync"}
          </button>
          <Link href={`/repository/${id}/graph`} className="btn-primary">
            View Graph
          </Link>
          <Link href={`/repository/${id}/compose`} className="btn-primary">
            Compose
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-2xl font-bold text-synapse-400">
            {repo._count.skillNodes}
          </div>
          <div className="text-sm text-gray-400 mt-1">Skills</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-blue-400">
            {repo._count.skillDependencies}
          </div>
          <div className="text-sm text-gray-400 mt-1">Dependencies</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-green-400">
            {repo._count.executionLogs}
          </div>
          <div className="text-sm text-gray-400 mt-1">Executions</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-yellow-400">
            {invalidFiles.length}
          </div>
          <div className="text-sm text-gray-400 mt-1">Invalid Files</div>
        </div>
      </div>

      {/* Skills */}
      <h2 className="text-lg font-semibold text-white mb-4">
        Skill Nodes ({repo.skillNodes.length})
      </h2>

      {repo.skillNodes.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-gray-400">
            No valid skill files found. Make sure your markdown files have valid YAML frontmatter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 mb-8">
          {repo.skillNodes.map((skill) => (
            <Link
              key={skill.id}
              href={`/repository/${id}/skill/${skill.id}`}
              className="card flex items-center justify-between hover:border-synapse-500/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-white">{skill.title}</h3>
                  <span className="badge-blue">{skill.domain}</span>
                  <span className="text-xs text-gray-500">v{skill.version}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                  {skill.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {skill.activationTriggers.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                    >
                      {t}
                    </span>
                  ))}
                  {skill.activationTriggers.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{skill.activationTriggers.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 ml-4">
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${
                      skill.priority > 0.7
                        ? "text-red-400"
                        : skill.priority > 0.4
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {skill.priority}
                  </div>
                  <div className="text-xs text-gray-500">Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-400">
                    {skill.contextBudgetCost}
                  </div>
                  <div className="text-xs text-gray-500">Cost</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Invalid Files */}
      {invalidFiles.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">
            Invalid Files ({invalidFiles.length})
          </h2>
          <div className="space-y-2">
            {invalidFiles.map((file) => (
              <div
                key={file.filePath}
                className="glass-panel p-4 border-red-500/20"
              >
                <div className="font-mono text-sm text-red-400">
                  {file.filePath}
                </div>
                {file.errorMessage && (
                  <div className="text-sm text-gray-400 mt-1">
                    {file.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
