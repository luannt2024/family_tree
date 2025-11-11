import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { FamilyMember, RelationType } from '@/types';
import { GraphNode } from './GraphNode';

// React Flow integration (optional): will be used when user toggles force layout.
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge as rfAddEdge,
} from 'reactflow';
import { ReactFlowGraphNode } from './ReactFlowGraphNode';

// ensure reactflow css is imported by the app's root; if not, users should add `import 'reactflow/dist/style.css'`.

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;
const GAP_X = 80;
const GAP_Y = 28;
const MARGIN = 40;

export const FamilyGraphView: React.FC = () => {
  const { getFamilyMembers, relations, selectPerson, selectedPersonId, updatePerson } = useFamilyTreeStore();
  const members = getFamilyMembers();
  const [useForce, setUseForce] = useState(false);

  // Determine grouping for layout: prefer the first family entry of a person, otherwise 'ungrouped'
  const groupOf = (m: FamilyMember) => {
    if (m.families && m.families.length > 0) return m.families[0];
    // fallback to relationFamilyId when available from direct relation
    if ((m as any).relationFamilyId) return (m as any).relationFamilyId;
    return 'ungrouped';
  };

  // Groups in deterministic order
  const groups = useMemo(() => {
    const set = new Map<string, number>();
    members.forEach(m => {
      const g = groupOf(m) || 'ungrouped';
      if (!set.has(g)) set.set(g, set.size);
    });
    return Array.from(set.keys());
  }, [members]);

  // Node positions (fallback grid layout) — overridden by stored member.position if present
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};

    groups.forEach((g, gi) => {
      const nodesInGroup = members.filter(m => groupOf(m) === g);
      nodesInGroup.forEach((m, idx) => {
        const x = MARGIN + gi * (NODE_WIDTH + GAP_X);
        const y = MARGIN + idx * (NODE_HEIGHT + GAP_Y);
        positions[m.id] = { x, y };
      });
    });

    // For any member not placed (edge cases), place them in last column
    members.forEach((m, i) => {
      if (!positions[m.id]) {
        const gi = Math.max(0, groups.length - 1);
        const idx = i;
        const x = MARGIN + gi * (NODE_WIDTH + GAP_X);
        const y = MARGIN + idx * (NODE_HEIGHT + GAP_Y);
        positions[m.id] = { x, y };
      }
    });

    // Override with any stored absolute positions on the person (persisted from React Flow)
    members.forEach(m => {
      if (m.position && typeof m.position.x === 'number' && typeof m.position.y === 'number') {
        positions[m.id] = { x: Math.round(m.position.x), y: Math.round(m.position.y) };
      }
    });

    return positions;
  }, [members, groups]);

  // Compute per-family cluster bounding boxes (for SVG fallback outlines)
  const clusterBoxes = useMemo(() => {
    const pad = 28;
    const boxes: Record<string, { x: number; y: number; width: number; height: number; count: number }> = {};

    groups.forEach((g) => {
      if (!g || g === 'ungrouped') return; // skip ungrouped
      const nodesInGroup = members.filter(m => groupOf(m) === g);
      if (nodesInGroup.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodesInGroup.forEach(n => {
        const p = nodePositions[n.id];
        if (!p) return;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + NODE_WIDTH);
        maxY = Math.max(maxY, p.y + NODE_HEIGHT);
      });

      if (minX === Infinity) return;
      const x = minX - pad;
      const y = minY - pad;
      const width = Math.max((maxX - minX) + pad * 2, NODE_WIDTH + pad * 2);
      const height = Math.max((maxY - minY) + pad * 2, NODE_HEIGHT + pad * 2);

      boxes[g] = { x, y, width, height, count: nodesInGroup.length };
    });

    return boxes;
  }, [groups, members, nodePositions]);

  // Simple deterministic cluster color generator
  const getClusterColor = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return {
      fill: `hsl(${hue}, 78%, 92%)`,
      stroke: `hsl(${hue}, 60%, 45%)`
    };
  };

  // Compute canvas size
  const canvasWidth = Math.max(800, groups.length * (NODE_WIDTH + GAP_X) + MARGIN * 2);
  const numRows = Math.max(...members.map(m => {
    const g = groupOf(m);
    return members.filter(mm => groupOf(mm) === g).length;
  }), 1);
  const canvasHeight = Math.max(600, numRows * (NODE_HEIGHT + GAP_Y) + MARGIN * 2);

  // Build edges from relations
  const edges = useMemo(() => {
    const edgesAcc: Array<{
      id: string;
      sourceId: string;
      targetId: string;
      type: RelationType;
      label?: string;
      familyId?: string;
    }> = [];

    relations.forEach(r => {
      // Prefer explicit parent-child when available
      if (r.parentId && r.childId) {
        edgesAcc.push({ id: r.id, sourceId: r.parentId, targetId: r.childId, type: r.type, label: r.label as string | undefined, familyId: r.familyId });
      } else {
        // Fallback: use personA/personB
        edgesAcc.push({ id: r.id, sourceId: r.personAId, targetId: r.personBId, type: r.type, label: r.label as string | undefined, familyId: r.familyId });
      }
    });

    return edgesAcc.filter(e => nodePositions[e.sourceId] && nodePositions[e.targetId]);
  }, [relations, nodePositions]);

  const handleNodeClick = (m: FamilyMember) => {
    selectPerson(m.id);
  };

  const getEdgeColor = (type: RelationType) => {
    switch (type) {
      case RelationType.PARENT:
        return '#4F46E5'; // indigo
      case RelationType.SPOUSE:
        return '#10B981'; // green
      case RelationType.SIBLING:
        return '#F59E0B'; // amber
      default:
        return '#6B7280'; // gray
    }
  };

  // React Flow nodes/edges (used when useForce is true)
  const initialRfNodes = useMemo(() => members.map(m => ({
    id: m.id,
    type: 'graphNode',
    data: { member: m },
    position: nodePositions[m.id] || { x: MARGIN, y: MARGIN },
    draggable: true,
    style: { width: NODE_WIDTH, height: NODE_HEIGHT }
  })), [members, nodePositions]);

  const initialRfEdges = useMemo(() => edges.map(e => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    label: e.label || undefined,
    animated: false,
    style: { stroke: getEdgeColor(e.type) },
    arrowHeadType: e.type === RelationType.PARENT ? MarkerType.ArrowClosed : undefined
  })), [edges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialRfNodes as any);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialRfEdges as any);

  // Keep nodes/edges in sync if members/relations change
  useEffect(() => {
    setRfNodes(initialRfNodes as any);
  }, [initialRfNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(initialRfEdges as any);
  }, [initialRfEdges, setRfEdges]);

  const onConnect = useCallback((params) => setRfEdges((eds) => rfAddEdge({ ...params, animated: false }, eds)), [setRfEdges]);

  // Enhanced SVG rendering: draw bezier curves for edges and show an interactive hover tooltip (fallback grid mode)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  if (useForce) {
    return (
      <div className="w-full h-[700px]">
        <div className="flex items-center space-x-2 p-2">
          <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm" onClick={() => setUseForce(false)}>Use SVG fallback</button>
        </div>

        <ReactFlow
          nodes={rfNodes as any}
          edges={rfEdges as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={(_event, node) => {
            // Persist node position back to the store so positions survive reloads
            try {
              updatePerson({ personId: node.id, updates: { position: { x: Math.round(node.position.x), y: Math.round(node.position.y) } } });
            } catch (err) {
              // swallow errors; store may not be ready in some test contexts
              // console.warn('Failed to persist node position', err);
            }
          }}
          fitView
          nodeTypes={{ graphNode: ReactFlowGraphNode }}
          nodesDraggable
        >
          <Background />
          <Controls />
          <MiniMap nodeStrokeColor={() => '#888'} nodeColor={() => '#ddd'} />
        </ReactFlow>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-transparent" style={{ minHeight: canvasHeight }}>
      <div className="flex items-center space-x-2 p-2">
        <label className="inline-flex items-center space-x-2 text-sm">
          <input type="checkbox" checked={useForce} onChange={(e) => setUseForce(e.target.checked)} />
          <span>Sử dụng layout force-directed (reactflow nếu có)</span>
        </label>
      </div>

      <svg className="absolute inset-0 w-full h-full" width={canvasWidth} height={canvasHeight}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L10,5 L0,10 z" fill="#4F46E5" />
          </marker>
        </defs>

        {/* Render family cluster outlines (rounded rect + label) behind edges/nodes */}
        {Object.entries(clusterBoxes).map(([cid, box]) => {
          const color = getClusterColor(cid);
          return (
            <g key={`cluster-${cid}`}>
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                rx={12}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.5}
                opacity={0.95}
              />

              {/* Cluster label */}
              <g transform={`translate(${box.x + 12}, ${box.y + 18})`}>
                <text fontSize={13} fill={color.stroke} fontWeight={600}>{cid}</text>
                {/** Optionally show count */}
                <text x={Math.max(120, 140)} fontSize={11} fill={color.stroke} opacity={0.8}>({box.count})</text>
              </g>
            </g>
          );
        })}


        {edges.map(edge => {
          const s = nodePositions[edge.sourceId];
          const t = nodePositions[edge.targetId];
          if (!s || !t) return null;
          const x1 = s.x + NODE_WIDTH / 2;
          const y1 = s.y + NODE_HEIGHT / 2;
          const x2 = t.x + NODE_WIDTH / 2;
          const y2 = t.y + NODE_HEIGHT / 2;
          const color = getEdgeColor(edge.type);

          // Compute simple bezier control points to curve edges away from overlapping
          const dx = x2 - x1;
          const dy = y2 - y1;
          const qx = x1 + dx * 0.5 - dy * 0.15;
          const qy = y1 + dy * 0.5 + dx * 0.05;
          const pathD = `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;

          return (
            <g key={edge.id} onMouseEnter={() => setHoveredEdge(edge.id)} onMouseLeave={() => setHoveredEdge(null)}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                markerEnd={edge.type === RelationType.PARENT ? 'url(#arrow)' : undefined}
                strokeLinecap="round"
                opacity={hoveredEdge === edge.id ? 1 : 0.85}
              />

              {edge.label && (
                <text>
                  <textPath href={`#${edge.id}-path`} startOffset="50%" textAnchor="middle" fontSize={12} fill="#111">
                    {edge.label}
                  </textPath>
                </text>
              )}

              {/* Hidden anchor path so textPath can reference it */}
              <path id={`${edge.id}-path`} d={pathD} fill="none" stroke="transparent" />

              {hoveredEdge === edge.id && (
                <foreignObject x={(x1 + x2) / 2 - 80} y={(y1 + y2) / 2 - 40} width={160} height={80} style={{ pointerEvents: 'none' }}>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded shadow text-xs text-gray-800 dark:text-gray-200">
                    <div><strong>{edge.label || edge.type}</strong></div>
                    {edge.familyId && <div className="text-gray-500 text-xs">Gia đình: {edge.familyId}</div>}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Render nodes on top of edges */}
      <div style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}>
        {members.map(m => {
          const pos = nodePositions[m.id] || { x: MARGIN, y: MARGIN };
          const isSelected = selectedPersonId === m.id;
          return (
            <div key={m.id} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
              <GraphNode member={m} onClick={handleNodeClick} isSelected={!!isSelected} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
