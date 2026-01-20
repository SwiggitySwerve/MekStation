/**
 * CausalityEdge Component
 * Arrow/line connecting two nodes in the causality graph.
 * Uses CSS borders and transforms for styling (no SVG needed).
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';
import { ICausedBy } from '@/types/events';

// =============================================================================
// Types
// =============================================================================

export interface CausalityEdgeProps {
  /** Relationship type determines edge styling */
  relationship: ICausedBy['relationship'];
  /** Starting position (from node center-right) */
  from: { x: number; y: number };
  /** Ending position (to node center-left) */
  to: { x: number; y: number };
}

// =============================================================================
// Configuration
// =============================================================================

type EdgeStyle = {
  color: string;
  dashArray: string;
  arrowColor: string;
  lineClass: string;
};

const EDGE_STYLES: Record<ICausedBy['relationship'], EdgeStyle> = {
  triggered: {
    color: 'rgb(251, 191, 36)', // amber-400
    dashArray: 'none',
    arrowColor: 'border-l-amber-400',
    lineClass: 'bg-amber-400/80',
  },
  derived: {
    color: 'rgb(34, 211, 238)', // cyan-400
    dashArray: '4 4',
    arrowColor: 'border-l-cyan-400',
    lineClass: 'bg-cyan-400/80',
  },
  undone: {
    color: 'rgb(248, 113, 113)', // red-400
    dashArray: 'none',
    arrowColor: 'border-l-red-400',
    lineClass: 'bg-red-400/80',
  },
  superseded: {
    color: 'rgb(167, 139, 250)', // violet-400
    dashArray: '2 2',
    arrowColor: 'border-l-violet-400',
    lineClass: 'bg-violet-400/80',
  },
};

// =============================================================================
// Component
// =============================================================================

export function CausalityEdge({
  relationship,
  from,
  to,
}: CausalityEdgeProps): React.ReactElement {
  const style = EDGE_STYLES[relationship];

  // Calculate edge geometry
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Arrow size
  const arrowSize = 8;
  const lineLength = Math.max(0, length - arrowSize);

  // For strikethrough effect on "undone" relationship
  const isUndone = relationship === 'undone';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        height: 0,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}deg)`,
      }}
    >
      {/* Main line */}
      <div
        className={`absolute top-0 left-0 h-[2px] ${style.lineClass}`}
        style={{
          width: lineLength,
          transform: 'translateY(-50%)',
          // For dashed lines
          ...(style.dashArray !== 'none' && {
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 4px,
              currentColor 4px,
              currentColor 8px
            )`,
            backgroundColor: 'transparent',
            backgroundSize: style.dashArray === '2 2' ? '4px 2px' : '8px 2px',
          }),
        }}
      />

      {/* Strikethrough for undone relationship */}
      {isUndone && (
        <div
          className="absolute top-0 left-1/2 w-4 h-[2px] bg-red-500 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: 'translateX(-50%) translateY(-50%) rotate(45deg)',
          }}
        />
      )}

      {/* Arrow head using CSS borders */}
      <div
        className={`absolute top-0 w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] ${style.arrowColor}`}
        style={{
          left: lineLength,
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}

export default CausalityEdge;
