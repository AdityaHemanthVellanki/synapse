"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useApi, apiPost } from "@/hooks/use-api";
import { PageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CompositionResults } from "@/components/compose/CompositionResults";
import Link from "next/link";

export default function ComposePage() {
  const params = useParams();
  const id = params.id as string;
  const { data: repoData, loading } = useApi<{
    repository: { fullName: string };
  }>(`/api/repositories/${id}`);

  const [query, setQuery] = useState("");
  const [contextState, setContextState] = useState("");
  const [contextBudget, setContextBudget] = useState("10");
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (!repoData) return <div className="text-red-400">Repository not found</div>;

  async function handleCompose() {
    if (!query.trim()) return;
    setComposing(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiPost<Record<string, unknown>>("/api/agent/compose", {
        repositoryId: id,
        query: query.trim(),
        contextState: contextState
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        contextBudget: parseFloat(contextBudget) || 10,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Composition failed");
    } finally {
      setComposing(false);
    }
  }

  return (
    <div>
      <Link
        href={`/repository/${id}`}
        className="text-sm text-gray-500 hover:text-gray-300 mb-4 block"
      >
        &larr; Back to {repoData.repository.fullName}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">
        Skill Composition Engine
      </h1>
      <p className="text-gray-400 mb-8">
        Enter a query to activate and compose skills into an execution plan
      </p>

      <div className="glass-panel p-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompose()}
              placeholder="e.g., I need to assess risk and size a position for a volatile asset"
              className="input-field text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Context State (comma-separated)
              </label>
              <input
                type="text"
                value={contextState}
                onChange={(e) => setContextState(e.target.value)}
                placeholder="e.g., market_data, portfolio_state"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current context available to the agent
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Context Budget
              </label>
              <input
                type="number"
                value={contextBudget}
                onChange={(e) => setContextBudget(e.target.value)}
                placeholder="10"
                min="1"
                max="100"
                step="0.5"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum context units to allocate
              </p>
            </div>
          </div>

          <button
            onClick={handleCompose}
            disabled={composing || !query.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {composing && <LoadingSpinner size="sm" />}
            {composing ? "Composing..." : "Compose Skill Chain"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-8">
          {error}
        </div>
      )}

      {result && <CompositionResults result={result as never} />}
    </div>
  );
}
