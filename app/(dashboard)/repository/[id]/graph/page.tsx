"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { SkillGraphView } from "@/components/graph/SkillGraphView";
import { SkillSidePanel } from "@/components/graph/SkillSidePanel";
import Link from "next/link";
import { useState, useMemo } from "react";

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
  dependenciesFrom: Array<{
    id: string;
    fromSkillId: string;
    toSkillId: string;
    type: string;
  }>;
}

interface RepoData {
  repository: {
    id: string;
    fullName: string;
    skillNodes: SkillNode[];
  };
}

interface AnalyticsData {
  analysis: {
    totalNodes: number;
    totalEdges: number;
    cycles: Array<{ cycle: string[]; nodeNames: string[] }>;
    orphanNodes: Array<{ id: string; title: string }>;
    rootNodes: string[];
    averageDepth: number;
    maxDepth: number;
    averageContextCost: number;
  };
  topActivated: Array<{ skillId: string; title: string; activationCount: number }>;
  domains: Record<string, number>;
  totalExecutions: number;
}

export default function GraphPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, loading } = useApi<RepoData>(`/api/repositories/${id}`);
  const { data: analytics } = useApi<AnalyticsData>(
    `/api/repositories/${id}/analytics`
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const selectedSkill = useMemo(() => {
    if (!selectedSkillId || !data) return null;
    return data.repository.skillNodes.find((s) => s.id === selectedSkillId) ?? null;
  }, [selectedSkillId, data]);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-red-400">Repository not found</div>;

  const repo = data.repository;
  const allDependencies = repo.skillNodes.flatMap((s) => s.dependenciesFrom);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link
            href={`/repository/${id}`}
            className="text-sm text-gray-500 hover:text-gray-300 mb-1 block"
          >
            &larr; Back to {repo.fullName}
          </Link>
          <h1 className="text-xl font-bold text-white">Skill Graph</h1>
        </div>

        {analytics && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <span className="text-synapse-400 font-bold">
                {analytics.analysis.totalNodes}
              </span>
              <span className="text-gray-500 ml-1">nodes</span>
            </div>
            <div className="text-center">
              <span className="text-blue-400 font-bold">
                {analytics.analysis.totalEdges}
              </span>
              <span className="text-gray-500 ml-1">edges</span>
            </div>
            <div className="text-center">
              <span
                className={`font-bold ${
                  analytics.analysis.cycles.length > 0
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {analytics.analysis.cycles.length}
              </span>
              <span className="text-gray-500 ml-1">cycles</span>
            </div>
            <div className="text-center">
              <span className="text-gray-400 font-bold">
                {analytics.analysis.averageDepth}
              </span>
              <span className="text-gray-500 ml-1">avg depth</span>
            </div>
            <div className="text-center">
              <span className="text-yellow-400 font-bold">
                {analytics.analysis.averageContextCost}
              </span>
              <span className="text-gray-500 ml-1">avg cost</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 rounded-xl overflow-hidden border border-gray-700/50">
        <div className="flex-1">
          {repo.skillNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No skills to visualize. Sync your repository first.
            </div>
          ) : (
            <SkillGraphView
              skills={repo.skillNodes}
              dependencies={allDependencies}
              cycles={analytics?.analysis.cycles ?? []}
              onNodeClick={setSelectedSkillId}
            />
          )}
        </div>

        {selectedSkill && (
          <SkillSidePanel
            skill={selectedSkill}
            repoId={id}
            onClose={() => setSelectedSkillId(null)}
          />
        )}
      </div>
    </div>
  );
}
