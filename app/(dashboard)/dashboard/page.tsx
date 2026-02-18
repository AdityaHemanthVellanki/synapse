"use client";

import { useState } from "react";
import { useApi, apiPost } from "@/hooks/use-api";
import { LoadingSpinner, PageLoader } from "@/components/ui/LoadingSpinner";
import Link from "next/link";

interface Repository {
  id: string;
  fullName: string;
  defaultBranch: string;
  selectedBranch: string | null;
  rootPath: string;
  lastSyncedAt: string | null;
  _count: {
    skillNodes: number;
    executionLogs: number;
  };
}

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  default_branch: string;
  description: string | null;
}

export default function DashboardPage() {
  const {
    data: repoData,
    loading: reposLoading,
    refetch: refetchRepos,
  } = useApi<{ repositories: Repository[] }>("/api/repositories");

  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const repositories = repoData?.repositories ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Skill Repositories</h1>
          <p className="text-gray-400 mt-1">
            Connect GitHub repositories containing skill definitions
          </p>
        </div>
        <button
          onClick={() => setShowConnect(true)}
          className="btn-primary"
        >
          Connect Repository
        </button>
      </div>

      {reposLoading ? (
        <PageLoader />
      ) : repositories.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No repositories connected
          </h3>
          <p className="text-gray-400 mb-6">
            Connect a GitHub repository containing skill markdown files to get
            started.
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="btn-primary"
          >
            Connect Your First Repository
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/repository/${repo.id}`}
              className="card flex items-center justify-between hover:border-synapse-500/30"
            >
              <div>
                <h3 className="text-lg font-medium text-white">
                  {repo.fullName}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>Branch: {repo.selectedBranch ?? repo.defaultBranch}</span>
                  <span>Path: {repo.rootPath}</span>
                  {repo.lastSyncedAt && (
                    <span>
                      Synced: {new Date(repo.lastSyncedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-synapse-400">
                    {repo._count.skillNodes}
                  </div>
                  <div className="text-gray-500">Skills</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-400">
                    {repo._count.executionLogs}
                  </div>
                  <div className="text-gray-500">Executions</div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onConnected={() => {
            setShowConnect(false);
            refetchRepos();
          }}
        />
      )}
    </div>
  );
}

function ConnectModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const { data, loading } = useApi<{ repos: GitHubRepo[] }>(
    "/api/github/repos"
  );
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branch, setBranch] = useState("");
  const [rootPath, setRootPath] = useState("/");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const repos = data?.repos ?? [];
  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleConnect() {
    if (!selectedRepo) return;
    setConnecting(true);
    setError(null);

    try {
      await apiPost("/api/repositories", {
        githubId: selectedRepo.id,
        fullName: selectedRepo.full_name,
        defaultBranch: selectedRepo.default_branch,
        selectedBranch: branch || selectedRepo.default_branch,
        rootPath: rootPath || "/",
      });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Connect Repository</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-8">
            <PageLoader />
          </div>
        ) : selectedRepo ? (
          <div className="space-y-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="font-medium text-white">{selectedRepo.full_name}</div>
              {selectedRepo.description && (
                <div className="text-sm text-gray-400 mt-1">
                  {selectedRepo.description}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder={selectedRepo.default_branch}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Root Path
              </label>
              <input
                type="text"
                value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                placeholder="/"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path within the repo to search for skill files
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRepo(null)}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {connecting && <LoadingSpinner size="sm" />}
                {connecting ? "Connecting..." : "Connect & Sync"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="input-field mb-4"
            />
            <div className="overflow-y-auto flex-1 space-y-2">
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    setBranch(repo.default_branch);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-gray-600 transition-colors"
                >
                  <div className="font-medium text-white">{repo.full_name}</div>
                  {repo.description && (
                    <div className="text-sm text-gray-400 mt-1 line-clamp-1">
                      {repo.description}
                    </div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No repositories found
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
