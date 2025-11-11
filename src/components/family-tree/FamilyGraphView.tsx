import React, { useMemo, useState } from 'react';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { FamilyMember, RelationType } from '@/types';
import { GraphNode } from './GraphNode';

// Optional: we will try to integrate a force-directed layout using reactflow when available.
// Keep a fallback grid layout so the component works without additional deps during dev.

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;
const GAP_X = 80;
const GAP_Y = 28;
const MARGIN = 40;

export const FamilyGraphView: React.FC = () => {
  const { getFamilyMembers, relations, selectPerson, selectedPersonId } = useFamilyTreeStore();
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

  // Node positions (fallback grid layout)
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

    return positions;
  }, [members, groups]);

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

  // Enhanced SVG rendering: draw bezier curves for edges and show an interactive hover tooltip
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

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
