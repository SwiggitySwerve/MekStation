/**
 * CausalityGraph Component
 * Container for visualizing cause-effect relationships as a DAG.
 * Horizontal layout with root on left, effects flowing right.
 * Uses CSS transforms for pan/zoom.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';

import { ICausalityChain, ICausalityNode } from '@/hooks/audit';

import { CausalityEdge } from './CausalityEdge';
import { CausalityNode } from './CausalityNode';
import { CausalityZoomControls } from './CausalityZoomControls';

// =============================================================================
// Types
// =============================================================================

export interface CausalityGraphProps {
  /** The causality chain to visualize */
  chain: ICausalityChain | null;
  /** Handler for node clicks */
  onNodeClick?: (nodeId: string) => void;
  /** Currently selected node ID */
  selectedNodeId?: string;
  /** Additional CSS classes */
  className?: string;
}

/** Calculated position for a node */
interface NodePosition {
  node: ICausalityNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// Layout Constants
// =============================================================================

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 24;
const PADDING = 40;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

// =============================================================================
// Layout Algorithm
// =============================================================================

/**
 * Calculate positions for all nodes using a hierarchical layout.
 * Root at x=0, each depth level adds (nodeWidth + gap) to x.
 * Nodes at same depth are stacked vertically, centered relative to parent.
 */
function calculateLayout(chain: ICausalityChain): NodePosition[] {
  const positions: NodePosition[] = [];
  const depthCounts = new Map<number, number>();
  const depthOffsets = new Map<number, number>();

  // First pass: count nodes at each depth
  for (const node of chain.allNodes) {
    depthCounts.set(node.depth, (depthCounts.get(node.depth) || 0) + 1);
  }

  // Calculate vertical offsets for centering each depth level
  const maxNodesAtAnyDepth = Math.max(...Array.from(depthCounts.values()));
  Array.from(depthCounts.entries()).forEach(([depth, count]) => {
    const totalHeight = count * NODE_HEIGHT + (count - 1) * VERTICAL_GAP;
    const maxHeight =
      maxNodesAtAnyDepth * NODE_HEIGHT +
      (maxNodesAtAnyDepth - 1) * VERTICAL_GAP;
    depthOffsets.set(depth, (maxHeight - totalHeight) / 2);
  });

  // Track current Y position at each depth
  const depthY = new Map<number, number>();

  // Process nodes depth by depth to ensure proper ordering
  const nodesByDepth = new Map<number, ICausalityNode[]>();
  for (const node of chain.allNodes) {
    const nodes = nodesByDepth.get(node.depth) || [];
    nodes.push(node);
    nodesByDepth.set(node.depth, nodes);
  }

  // Sort depths and process
  const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
  for (const depth of depths) {
    const nodes = nodesByDepth.get(depth) || [];
    const offset = depthOffsets.get(depth) || 0;

    for (const node of nodes) {
      const currentY = depthY.get(depth) || offset;

      positions.push({
        node,
        x: PADDING + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: PADDING + currentY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });

      depthY.set(depth, currentY + NODE_HEIGHT + VERTICAL_GAP);
    }
  }

  return positions;
}

/**
 * Calculate the total bounds of the graph.
 */
function calculateBounds(positions: NodePosition[]): {
  width: number;
  height: number;
} {
  if (positions.length === 0) {
    return { width: 400, height: 300 };
  }

  let maxX = 0;
  let maxY = 0;

  for (const pos of positions) {
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  return {
    width: maxX + PADDING,
    height: maxY + PADDING,
  };
}

// =============================================================================
// Component
// =============================================================================

export function CausalityGraph({
  chain,
  onNodeClick,
  selectedNodeId,
  className = '',
}: CausalityGraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate layout
  const positions = useMemo(() => {
    if (!chain) return [];
    return calculateLayout(chain);
  }, [chain]);

  const bounds = useMemo(() => calculateBounds(positions), [positions]);

  // Create position lookup map
  const positionMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const pos of positions) {
      map.set(pos.node.event.id, pos);
    }
    return map;
  }, [positions]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFit = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scaleX = containerWidth / bounds.width;
    const scaleY = containerHeight / bounds.height;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add some padding

    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
    setPan({ x: 0, y: 0 });
  }, [bounds]);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  // Fit on initial render or chain change
  useEffect(() => {
    if (chain && positions.length > 0) {
      // Small delay to ensure container is measured
      const timer = setTimeout(handleFit, 100);
      return () => clearTimeout(timer);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [chain?.focusEvent.id]); // Intentionally only trigger on chain change, not position recalcs

  // Empty state
  if (!chain) {
    return (
      <div
        className={`bg-surface-deep/50 border-border-theme-subtle text-text-theme-muted flex items-center justify-center rounded-xl border ${className} `}
      >
        <div className="p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto mb-3 h-12 w-12 opacity-40"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <p className="text-sm">Select an event to view its causality chain</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-deep/30 border-border-theme-subtle relative overflow-hidden rounded-xl border ${className}`}
    >
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-20">
        <CausalityZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
          onFit={handleFit}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />
      </div>

      {/* Stats bar */}
      <div className="bg-surface-base/80 border-border-theme-subtle text-text-theme-muted absolute top-3 left-3 z-20 flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs backdrop-blur-sm">
        <span>
          <span className="text-text-theme-secondary">
            {chain.stats.totalEvents}
          </span>{' '}
          events
        </span>
        <span className="bg-border-theme-subtle h-3 w-px" />
        <span>
          <span className="text-text-theme-secondary">
            {chain.stats.maxDepth}
          </span>{' '}
          depth
        </span>
        <span className="bg-border-theme-subtle h-3 w-px" />
        <span>
          <span className="text-amber-400">
            {chain.stats.byRelationship.triggered}
          </span>{' '}
          triggered
        </span>
        <span>
          <span className="text-cyan-400">
            {chain.stats.byRelationship.derived}
          </span>{' '}
          derived
        </span>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        className={`h-full min-h-[400px] w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="relative origin-top-left transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: bounds.width,
            height: bounds.height,
          }}
        >
          {/* Render edges first (behind nodes) */}
          {positions.map((pos) => {
            if (!pos.node.cause) return null;

            const parentPos = positionMap.get(pos.node.cause.event.id);
            if (!parentPos) return null;

            const fromX = parentPos.x + parentPos.width;
            const fromY = parentPos.y + parentPos.height / 2;
            const toX = pos.x;
            const toY = pos.y + pos.height / 2;

            return (
              <CausalityEdge
                key={`edge-${pos.node.cause.event.id}-${pos.node.event.id}`}
                relationship={pos.node.relationship || 'triggered'}
                from={{ x: fromX, y: fromY }}
                to={{ x: toX, y: toY }}
              />
            );
          })}

          {/* Render nodes */}
          {positions.map((pos) => (
            <div
              key={pos.node.event.id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.width,
              }}
            >
              <CausalityNode
                node={pos.node}
                onClick={
                  onNodeClick ? () => onNodeClick(pos.node.event.id) : undefined
                }
                isSelected={selectedNodeId === pos.node.event.id}
                isFocusEvent={chain.focusEvent.id === pos.node.event.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient overlays for depth effect */}
      <div className="from-surface-deep/50 pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent" />
      <div className="from-surface-deep/50 pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent" />
    </div>
  );
}

export default CausalityGraph;
