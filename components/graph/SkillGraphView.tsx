"use client";

import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeTypes,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

interface SkillNodeData {
  id: string;
  title: string;
  domain: string;
  priority: number;
  contextBudgetCost: number;
  description: string;
  activationTriggers: string[];
  version: string;
}

interface DepData {
  id: string;
  fromSkillId: string;
  toSkillId: string;
  type: string;
}

interface CycleInfo {
  cycle: string[];
  nodeNames: string[];
}

interface SkillGraphViewProps {
  skills: SkillNodeData[];
  dependencies: DepData[];
  cycles: CycleInfo[];
  onNodeClick: (skillId: string) => void;
}

function SkillFlowNode({ data }: { data: SkillNodeData & { isCyclic: boolean } }) {
  const borderColor =
    data.priority > 0.7
      ? "border-red-500/60"
      : data.priority > 0.4
      ? "border-synapse-500/60"
      : "border-gray-600/60";

  const bgColor =
    data.priority > 0.7
      ? "bg-red-950/50"
      : data.priority > 0.4
      ? "bg-synapse-950/50"
      : "bg-gray-900/50";

  return (
    <div
      className={`${bgColor} ${borderColor} border-2 rounded-xl px-4 py-3 backdrop-blur-sm min-w-[180px] ${
        data.isCyclic ? "ring-2 ring-yellow-500/50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-synapse-300 uppercase tracking-wider">
          {data.domain}
        </span>
        <span
          className={`text-xs font-bold ${
            data.priority > 0.7 ? "text-red-400" : "text-gray-400"
          }`}
        >
          P:{data.priority}
        </span>
      </div>
      <div className="font-semibold text-white text-sm">{data.title}</div>
      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
        {data.description}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">v{data.version}</span>
        <span className="text-xs text-yellow-400/70">
          Cost: {data.contextBudgetCost}
        </span>
      </div>
      {data.isCyclic && (
        <div className="text-xs text-yellow-400 mt-1 font-medium">
          Cycle detected
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  skill: SkillFlowNode,
};

export function SkillGraphView({
  skills,
  dependencies,
  cycles,
  onNodeClick,
}: SkillGraphViewProps) {
  const cyclicNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of cycles) {
      for (const id of c.cycle) {
        ids.add(id);
      }
    }
    return ids;
  }, [cycles]);

  const initialNodes: Node[] = useMemo(() => {
    // Simple force-directed layout approximation
    const cols = Math.ceil(Math.sqrt(skills.length));
    return skills.map((skill, i) => ({
      id: skill.id,
      type: "skill",
      position: {
        x: (i % cols) * 280 + Math.random() * 40,
        y: Math.floor(i / cols) * 180 + Math.random() * 30,
      },
      data: {
        ...skill,
        isCyclic: cyclicNodeIds.has(skill.id),
      },
    }));
  }, [skills, cyclicNodeIds]);

  const initialEdges: Edge[] = useMemo(() => {
    return dependencies.map((dep) => ({
      id: dep.id,
      source: dep.fromSkillId,
      target: dep.toSkillId,
      animated: dep.type === "REQUIRED",
      style: {
        stroke: dep.type === "REQUIRED" ? "#4c6ef5" : "#555",
        strokeWidth: dep.type === "REQUIRED" ? 2 : 1,
        strokeDasharray: dep.type === "OPTIONAL" ? "5 5" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: dep.type === "REQUIRED" ? "#4c6ef5" : "#555",
      },
      label: dep.type === "OPTIONAL" ? "optional" : undefined,
      labelStyle: { fill: "#666", fontSize: 10 },
    }));
  }, [dependencies]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
      >
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          nodeColor={(node) => {
            const data = node.data as SkillNodeData & { isCyclic: boolean };
            if (data.isCyclic) return "#eab308";
            if (data.priority > 0.7) return "#ef4444";
            if (data.priority > 0.4) return "#4c6ef5";
            return "#6b7280";
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1a1a2e" />

        <Panel position="top-left" className="glass-panel p-3 text-xs space-y-1">
          <div className="font-medium text-white mb-2">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-400">High priority (&gt;0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-synapse-500" />
            <span className="text-gray-400">Standard priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-600" />
            <span className="text-gray-400">Low priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0 border border-synapse-500" />
            <span className="text-gray-400">Required dep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0 border border-dashed border-gray-500" />
            <span className="text-gray-400">Optional dep</span>
          </div>
          {cycles.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded ring-2 ring-yellow-500 bg-transparent" />
              <span className="text-yellow-400">Cycle member</span>
            </div>
          )}
        </Panel>

        {cycles.length > 0 && (
          <Panel position="top-right" className="glass-panel p-3 border-yellow-500/30">
            <div className="text-sm font-medium text-yellow-400 mb-1">
              Cycles Detected ({cycles.length})
            </div>
            {cycles.map((c, i) => (
              <div key={i} className="text-xs text-gray-400">
                {c.nodeNames.join(" → ")}
              </div>
            ))}
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
