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
  if (!repoData) return <div className="text-sm text-red-400/60">not found</div>;

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
        className="text-xs text-gray-600 hover:text-gray-400 mb-6 block"
      >
        &larr; back
      </Link>

      <h1 className="text-lg font-medium text-white mb-1">compose</h1>
      <p className="text-xs text-gray-600 mb-8">
        query to activate and compose skills into an execution plan
      </p>

      <div className="panel p-5 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompose()}
              placeholder="e.g., assess risk and size a position for a volatile asset"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">context state</label>
              <input
                type="text"
                value={contextState}
                onChange={(e) => setContextState(e.target.value)}
                placeholder="market_data, portfolio_state"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">budget</label>
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
            </div>
          </div>

          <button
            onClick={handleCompose}
            disabled={composing || !query.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {composing && <LoadingSpinner size="sm" />}
            {composing ? "composing..." : "compose"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400/60 bg-red-500/5 border border-red-500/10 rounded-md p-3 mb-8">
          {error}
        </div>
      )}

      {result && <CompositionResults result={result as never} />}
    </div>
  );
}
