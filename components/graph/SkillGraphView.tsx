"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
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
  selectedId?: string | null;
}

// Domain -> color mapping
const domainColors: Record<string, string> = {
  "quantitative-analysis": "#8b5cf6",
  "risk-management": "#ef4444",
  "portfolio-management": "#3b82f6",
  execution: "#10b981",
  "signal-generation": "#f59e0b",
  "data-analysis": "#06b6d4",
  "market-microstructure": "#ec4899",
  validation: "#6366f1",
  analytics: "#14b8a6",
};

function getColor(domain: string): string {
  return domainColors[domain] ?? "#666666";
}

function CircleNode({
  data,
  selected,
}: {
  data: SkillNodeData & { connectionCount: number; isSelected: boolean };
  selected: boolean;
}) {
  const color = getColor(data.domain);
  const baseSize = 8 + data.connectionCount * 3;
  const size = Math.min(Math.max(baseSize, 10), 28);
  const isActive = data.isSelected || selected;

  return (
    <div className="relative group" style={{ width: size * 2, height: size * 2 }}>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Glow */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-40"
          style={{ background: color, transform: "scale(2)" }}
        />
      )}

      {/* Node circle */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-200 cursor-pointer"
        style={{
          background: isActive ? color : `${color}88`,
          boxShadow: isActive
            ? `0 0 20px ${color}66, 0 0 40px ${color}22`
            : `0 0 6px ${color}33`,
          border: `1.5px solid ${isActive ? color : `${color}66`}`,
        }}
      />

      {/* Label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none transition-opacity duration-200"
        style={{
          top: size * 2 + 6,
          opacity: isActive ? 1 : 0.6,
        }}
      >
        <span
          className="text-[10px] font-medium"
          style={{ color: isActive ? "#e0e0e0" : "#555" }}
        >
          {data.title.toLowerCase().replace(/ /g, "-")}
        </span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  circle: CircleNode,
};

// Simple force-directed-ish layout using circular arrangement with domain clustering
function computeLayout(
  skills: SkillNodeData[],
  dependencies: DepData[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group by domain
  const domains = new Map<string, SkillNodeData[]>();
  for (const skill of skills) {
    const group = domains.get(skill.domain) ?? [];
    group.push(skill);
    domains.set(skill.domain, group);
  }

  const domainList = Array.from(domains.entries());
  const totalNodes = skills.length;
  const radius = Math.max(200, totalNodes * 18);
  const centerX = 0;
  const centerY = 0;

  let globalIndex = 0;

  for (let d = 0; d < domainList.length; d++) {
    const [, domainSkills] = domainList[d];
    const domainAngle = (d / domainList.length) * Math.PI * 2;
    const domainCenterX = centerX + radius * 0.5 * Math.cos(domainAngle);
    const domainCenterY = centerY + radius * 0.5 * Math.sin(domainAngle);

    for (let i = 0; i < domainSkills.length; i++) {
      const spread = 120 + domainSkills.length * 25;
      const angle = domainAngle + ((i - domainSkills.length / 2) * 0.5);
      const dist = spread * (0.5 + Math.random() * 0.5);

      positions.set(domainSkills[i].id, {
        x: domainCenterX + dist * Math.cos(angle) + (Math.random() - 0.5) * 60,
        y: domainCenterY + dist * Math.sin(angle) + (Math.random() - 0.5) * 60,
      });
      globalIndex++;
    }
  }

  // Simple spring simulation (few iterations for connected nodes)
  const idToPos = positions;
  for (let iter = 0; iter < 30; iter++) {
    // Attraction along edges
    for (const dep of dependencies) {
      const a = idToPos.get(dep.fromSkillId);
      const b = idToPos.get(dep.toSkillId);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 150) * 0.01;

      a.x += dx / dist * force;
      a.y += dy / dist * force;
      b.x -= dx / dist * force;
      b.y -= dy / dist * force;
    }

    // Repulsion between all nodes
    const allIds = Array.from(idToPos.keys());
    for (let i = 0; i < allIds.length; i++) {
      for (let j = i + 1; j < allIds.length; j++) {
        const a = idToPos.get(allIds[i])!;
        const b = idToPos.get(allIds[j])!;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 100) {
          const force = (100 - dist) * 0.05;
          a.x -= dx / dist * force;
          a.y -= dy / dist * force;
          b.x += dx / dist * force;
          b.y += dy / dist * force;
        }
      }
    }
  }

  return positions;
}

export function SkillGraphView({
  skills,
  dependencies,
  cycles,
  onNodeClick,
  selectedId,
}: SkillGraphViewProps) {
  // Count connections per node
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dep of dependencies) {
      counts.set(dep.fromSkillId, (counts.get(dep.fromSkillId) ?? 0) + 1);
      counts.set(dep.toSkillId, (counts.get(dep.toSkillId) ?? 0) + 1);
    }
    return counts;
  }, [dependencies]);

  const positions = useMemo(
    () => computeLayout(skills, dependencies),
    [skills, dependencies]
  );

  // Connected node IDs for selected node
  const connectedIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const ids = new Set<string>([selectedId]);
    for (const dep of dependencies) {
      if (dep.fromSkillId === selectedId) ids.add(dep.toSkillId);
      if (dep.toSkillId === selectedId) ids.add(dep.fromSkillId);
    }
    return ids;
  }, [selectedId, dependencies]);

  const initialNodes: Node[] = useMemo(() => {
    return skills.map((skill) => {
      const pos = positions.get(skill.id) ?? { x: 0, y: 0 };
      return {
        id: skill.id,
        type: "circle",
        position: pos,
        data: {
          ...skill,
          connectionCount: connectionCounts.get(skill.id) ?? 0,
          isSelected: selectedId ? connectedIds.has(skill.id) : false,
        },
      };
    });
  }, [skills, positions, connectionCounts, selectedId, connectedIds]);

  const initialEdges: Edge[] = useMemo(() => {
    return dependencies.map((dep) => {
      const isHighlighted =
        selectedId &&
        (dep.fromSkillId === selectedId || dep.toSkillId === selectedId);

      const isOptional = dep.type === "OPTIONAL";

      return {
        id: dep.id,
        source: dep.fromSkillId,
        target: dep.toSkillId,
        type: "default",
        style: {
          stroke: isHighlighted ? "#666" : isOptional ? "#1a1a1a" : "#222",
          strokeWidth: isHighlighted ? 1.5 : 0.8,
          strokeDasharray: isOptional ? "4 4" : undefined,
          opacity: selectedId ? (isHighlighted ? 1 : 0.15) : 0.6,
        },
        animated: false,
      };
    });
  }, [dependencies, selectedId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  const handlePaneClick = useCallback(() => {
    onNodeClick("");
  }, [onNodeClick]);

  return (
    <div className="w-full h-full bg-black">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} showZoom={true} showFitView={true} />
      </ReactFlow>
    </div>
  );
}
