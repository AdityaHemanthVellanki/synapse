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
  if (!data) return <div className="text-red-400/60 text-sm">not found</div>;

  const repo = data.repository;
  const allDependencies = repo.skillNodes.flatMap((s) => s.dependenciesFrom);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]" style={{ margin: "-2rem -1.5rem 0", padding: 0 }}>
      {/* Minimal top bar overlaid on graph */}
      <div className="absolute top-16 left-6 z-10 flex items-center gap-4">
        <Link
          href={`/repository/${id}`}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          &larr; back
        </Link>
        {analytics && (
          <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono">
            <span>{analytics.analysis.totalNodes} nodes</span>
            <span className="text-gray-800">|</span>
            <span>{analytics.analysis.totalEdges} edges</span>
            {analytics.analysis.cycles.length > 0 && (
              <>
                <span className="text-gray-800">|</span>
                <span className="text-yellow-600">
                  {analytics.analysis.cycles.length} cycles
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {repo.skillNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-600">
              no skills to visualize
            </div>
          ) : (
            <SkillGraphView
              skills={repo.skillNodes}
              dependencies={allDependencies}
              cycles={analytics?.analysis.cycles ?? []}
              onNodeClick={(id) => setSelectedSkillId(id || null)}
              selectedId={selectedSkillId}
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
