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

  const repositories = repoData?.repositories ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-lg font-medium text-white">repositories</h1>
          <p className="text-xs text-gray-600 mt-1">
            connect github repos containing skill definitions
          </p>
        </div>
        <button
          onClick={() => setShowConnect(true)}
          className="btn-primary"
        >
          connect repo
        </button>
      </div>

      {reposLoading ? (
        <PageLoader />
      ) : repositories.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-sm text-gray-500 mb-6">
            no repositories connected yet
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="btn-primary"
          >
            connect your first repository
          </button>
        </div>
      ) : (
        <div className="space-y-px">
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/repository/${repo.id}`}
              className="flex items-center justify-between p-4 border-b border-[#111] hover:bg-[#0a0a0a] transition-colors group"
            >
              <div>
                <span className="text-sm text-white group-hover:text-gray-200">
                  {repo.fullName}
                </span>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span>{repo.selectedBranch ?? repo.defaultBranch}</span>
                  <span>{repo.rootPath}</span>
                  {repo.lastSyncedAt && (
                    <span>
                      {new Date(repo.lastSyncedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-sm font-mono text-gray-400">
                    {repo._count.skillNodes}
                  </span>
                  <span className="text-xs text-gray-600 ml-1">skills</span>
                </div>
                <svg
                  className="w-4 h-4 text-gray-700 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="panel p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-white">connect repository</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-8"><PageLoader /></div>
        ) : selectedRepo ? (
          <div className="space-y-4">
            <div className="p-3 bg-[#111] rounded-md">
              <div className="text-sm text-white">{selectedRepo.full_name}</div>
              {selectedRepo.description && (
                <div className="text-xs text-gray-500 mt-1">{selectedRepo.description}</div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder={selectedRepo.default_branch}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">root path</label>
              <input
                type="text"
                value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                placeholder="/"
                className="input-field"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-md p-2.5">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setSelectedRepo(null)} className="btn-secondary flex-1">
                back
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {connecting && <LoadingSpinner size="sm" />}
                {connecting ? "syncing..." : "connect & sync"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search..."
              className="input-field mb-3"
            />
            <div className="overflow-y-auto flex-1 space-y-px">
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    setBranch(repo.default_branch);
                  }}
                  className="w-full text-left p-3 rounded-md hover:bg-[#111] transition-colors"
                >
                  <div className="text-sm text-gray-300">{repo.full_name}</div>
                  {repo.description && (
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">{repo.description}</div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-600">no repos found</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
