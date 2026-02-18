"use client";

import { useParams } from "next/navigation";
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
  const { data, loading, refetch } = useApi<RepoData>(`/api/repositories/${id}`);
  const [syncing, setSyncing] = useState(false);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-sm text-red-400/60">not found</div>;

  const repo = data.repository;
  const invalidFiles = repo.fileIndices.filter((f) => !f.isValid);

  async function handleSync() {
    setSyncing(true);
    try {
      await apiPost(`/api/repositories/${id}/sync`, {});
      refetch();
    } catch {
      // handled
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-600 hover:text-gray-400 mb-2 block">
            &larr; back
          </Link>
          <h1 className="text-lg font-medium text-white">{repo.fullName}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 font-mono">
            <span>{repo.selectedBranch ?? repo.defaultBranch}</span>
            <span>{repo.rootPath}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2"
          >
            {syncing && <LoadingSpinner size="sm" />}
            {syncing ? "syncing..." : "re-sync"}
          </button>
          <Link href={`/repository/${id}/graph`} className="btn-primary">
            graph
          </Link>
          <Link href={`/repository/${id}/compose`} className="btn-secondary">
            compose
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        <div className="stat-card">
          <div className="text-lg font-mono text-gray-300">{repo._count.skillNodes}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">skills</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-mono text-gray-300">{repo._count.skillDependencies}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">dependencies</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-mono text-gray-300">{repo._count.executionLogs}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">executions</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-mono text-gray-300">{invalidFiles.length}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">invalid</div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-6">
        <span className="text-xs text-gray-600 uppercase tracking-wider">
          skills ({repo.skillNodes.length})
        </span>
      </div>

      {repo.skillNodes.length === 0 ? (
        <div className="panel p-6">
          <p className="text-xs text-gray-500 mb-4">
            no valid skill files found. markdown files must contain yaml frontmatter matching the synapse schema:
          </p>
          <pre className="text-[11px] text-gray-600 bg-black rounded-md p-4 overflow-x-auto font-mono">{`---
title: My Skill Name
description: What this skill does
version: "1.0.0"
domain: my-domain
priority: 0.5
activation:
  triggers: [keyword1, keyword2]
  required_context: []
inputs:
  - name: input_name
    schema: "string"
    required: true
outputs:
  - name: output_name
    schema: "string"
dependencies:
  required: []
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria: [criterion]
  failure_modes: [failure mode]
---

## Procedure
Step-by-step instructions.

## Reasoning
Why this skill exists.`}</pre>
        </div>
      ) : (
        <div className="space-y-px mb-10">
          {repo.skillNodes.map((skill) => (
            <Link
              key={skill.id}
              href={`/repository/${id}/skill/${skill.id}`}
              className="flex items-center justify-between p-3.5 border-b border-[#111] hover:bg-[#0a0a0a] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {skill.title}
                  </span>
                  <span className="badge-purple">{skill.domain}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                  {skill.description}
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4 text-xs font-mono text-gray-600">
                <span>p:{skill.priority}</span>
                <span>c:{skill.contextBudgetCost}</span>
                <svg className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Invalid Files */}
      {invalidFiles.length > 0 && (
        <div>
          <div className="mb-4">
            <span className="text-xs text-gray-600 uppercase tracking-wider">
              invalid files ({invalidFiles.length})
            </span>
          </div>
          <div className="space-y-1">
            {invalidFiles.map((file) => (
              <div key={file.filePath} className="p-3 rounded-md bg-[#0a0a0a] border border-[#1a1a1a]">
                <div className="font-mono text-xs text-red-400/60">{file.filePath}</div>
                {file.errorMessage && (
                  <div className="text-[11px] text-gray-600 mt-1">{file.errorMessage}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
