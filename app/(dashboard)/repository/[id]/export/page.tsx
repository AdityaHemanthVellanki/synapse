"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { PageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useState, useMemo } from "react";

interface SkillNode {
  id: string;
  title: string;
  description: string;
  domain: string;
  version: string;
  dependenciesFrom: Array<{
    id: string;
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

interface ValidationIssue {
  skillId: string;
  skillTitle: string;
  type: "error" | "warning";
  message: string;
}

interface ValidationData {
  validation: {
    valid: boolean;
    issues: ValidationIssue[];
    summary: {
      totalSkills: number;
      validSkills: number;
      errors: number;
      warnings: number;
    };
  };
}

export default function ExportPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, loading } = useApi<RepoData>(`/api/repositories/${id}`);
  const { data: validationData, loading: validating } = useApi<ValidationData>(
    `/api/repositories/${id}/validate`
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mode, setMode] = useState<"full" | "subset">("full");

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-sm text-gray-500">not found</div>;

  const repo = data.repository;
  const skills = repo.skillNodes;
  const validation = validationData?.validation;
  const isValid = validation?.valid ?? false;
  const canExport = isValid && skills.length > 0;

  function toggleSkill(skillId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(skills.map((s) => s.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  // Resolve dependency tree for selected nodes
  const resolvedIds = useMemo(() => {
    if (mode === "full") return new Set(skills.map((s) => s.id));

    const resolved = new Set<string>();
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    function resolve(id: string) {
      if (resolved.has(id)) return;
      resolved.add(id);
      const skill = skillMap.get(id);
      if (!skill) return;
      for (const dep of skill.dependenciesFrom) {
        if (dep.type === "REQUIRED") {
          resolve(dep.toSkillId);
        }
      }
    }

    for (const id of selectedIds) {
      resolve(id);
    }

    return resolved;
  }, [mode, selectedIds, skills]);

  const autoIncluded = useMemo(() => {
    const auto = new Set<string>();
    for (const id of resolvedIds) {
      if (!selectedIds.has(id) && mode === "subset") {
        auto.add(id);
      }
    }
    return auto;
  }, [resolvedIds, selectedIds, mode]);

  async function handleExport() {
    setExporting(true);
    setExportError(null);

    try {
      const body: Record<string, unknown> = { repositoryId: id };
      if (mode === "subset" && selectedIds.size > 0) {
        body.selectedNodeIds = Array.from(selectedIds);
      }

      const res = await fetch("/api/export/claude-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Download the zip
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ?? "claude-code-skills.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  // Group skills by domain
  const domains = useMemo(() => {
    const map = new Map<string, SkillNode[]>();
    for (const skill of skills) {
      const group = map.get(skill.domain) ?? [];
      group.push(skill);
      map.set(skill.domain, group);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills]);

  return (
    <div>
      <Link
        href={`/repository/${id}`}
        className="text-xs text-gray-600 hover:text-gray-400 mb-6 block transition-colors"
      >
        &larr; back to repository
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-white">export to claude code</h1>
          <p className="text-sm text-gray-500 mt-1">
            generate a claude code-compatible skill package
          </p>
        </div>
      </div>

      {/* Validation Status */}
      <div className="panel p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-600 font-mono">validation</div>
          {validating ? (
            <span className="text-xs text-gray-600">checking...</span>
          ) : validation ? (
            <span className={`text-xs font-mono ${isValid ? "text-emerald-400/80" : "text-red-400/80"}`}>
              {isValid ? "passed" : "failed"}
            </span>
          ) : null}
        </div>

        {validation && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-[#111] rounded-md p-2.5 text-center">
                <div className="text-sm font-mono text-gray-300">{validation.summary.totalSkills}</div>
                <div className="text-[10px] text-gray-600">total</div>
              </div>
              <div className="bg-[#111] rounded-md p-2.5 text-center">
                <div className="text-sm font-mono text-emerald-400/80">{validation.summary.validSkills}</div>
                <div className="text-[10px] text-gray-600">valid</div>
              </div>
              <div className="bg-[#111] rounded-md p-2.5 text-center">
                <div className="text-sm font-mono text-red-400/80">{validation.summary.errors}</div>
                <div className="text-[10px] text-gray-600">errors</div>
              </div>
              <div className="bg-[#111] rounded-md p-2.5 text-center">
                <div className="text-sm font-mono text-yellow-400/80">{validation.summary.warnings}</div>
                <div className="text-[10px] text-gray-600">warnings</div>
              </div>
            </div>

            {validation.issues.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {validation.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`text-xs flex items-start gap-2 p-2 rounded ${
                      issue.type === "error" ? "bg-red-500/5 text-red-400/70" : "bg-yellow-500/5 text-yellow-400/70"
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      {issue.type === "error" ? "×" : "!"}
                    </span>
                    <span>
                      {issue.skillTitle && <span className="text-gray-400">{issue.skillTitle}: </span>}
                      {issue.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Mode */}
      <div className="panel p-5 mb-6">
        <div className="text-xs text-gray-600 font-mono mb-3">export mode</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("full")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              mode === "full"
                ? "bg-white text-black"
                : "bg-[#111] text-gray-500 hover:text-gray-300"
            }`}
          >
            full graph
          </button>
          <button
            onClick={() => setMode("subset")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              mode === "subset"
                ? "bg-white text-black"
                : "bg-[#111] text-gray-500 hover:text-gray-300"
            }`}
          >
            select skills
          </button>
        </div>

        {mode === "full" && (
          <p className="text-xs text-gray-600 mt-3">
            exports all {skills.length} skills with full dependency tree
          </p>
        )}
      </div>

      {/* Skill Selection */}
      {mode === "subset" && (
        <div className="panel p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-600 font-mono">
              select skills ({selectedIds.size} selected{autoIncluded.size > 0 ? ` + ${autoIncluded.size} auto-included` : ""})
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                all
              </button>
              <button onClick={selectNone} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                none
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {domains.map(([domain, domainSkills]) => (
              <div key={domain}>
                <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">
                  {domain}
                </div>
                <div className="space-y-px">
                  {domainSkills.map((skill) => {
                    const isSelected = selectedIds.has(skill.id);
                    const isAutoIncluded = autoIncluded.has(skill.id);

                    return (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(skill.id)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                          isSelected
                            ? "bg-white/5 text-white"
                            : isAutoIncluded
                            ? "bg-[#0d0d0d] text-gray-400"
                            : "hover:bg-[#111] text-gray-500"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "bg-white border-white"
                              : isAutoIncluded
                              ? "bg-gray-700 border-gray-600"
                              : "border-gray-700"
                          }`}
                        >
                          {(isSelected || isAutoIncluded) && (
                            <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs truncate">{skill.title}</span>
                        {isAutoIncluded && (
                          <span className="text-[9px] text-gray-600 ml-auto flex-shrink-0">dep</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Preview */}
      <div className="panel p-5 mb-6">
        <div className="text-xs text-gray-600 font-mono mb-3">
          export preview · {resolvedIds.size} skills
        </div>
        <div className="bg-[#080808] rounded-md p-3 font-mono text-[11px] text-gray-500 max-h-48 overflow-y-auto">
          <div className="text-gray-400">claude-code-skills.zip/</div>
          <div className="ml-2 text-gray-500">manifest.json</div>
          <div className="ml-2 text-gray-500">skills/</div>
          {skills
            .filter((s) => resolvedIds.has(s.id))
            .map((skill) => {
              const name = skill.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              return (
                <div key={skill.id} className="ml-4">
                  <div className="text-gray-400">{name}/</div>
                  <div className="ml-2">index.yaml</div>
                  <div className="ml-2">implementation.ts</div>
                  <div className="ml-2">metadata.json</div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Export Button */}
      {exportError && (
        <div className="panel p-4 mb-4 border-red-500/20">
          <div className="text-xs text-red-400/80">{exportError}</div>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={!canExport || exporting || (mode === "subset" && selectedIds.size === 0)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {exporting && <LoadingSpinner size="sm" />}
        {exporting
          ? "generating..."
          : !canExport
          ? "fix validation errors to export"
          : mode === "subset" && selectedIds.size === 0
          ? "select skills to export"
          : `export ${resolvedIds.size} skills to claude code`}
      </button>
    </div>
  );
}
