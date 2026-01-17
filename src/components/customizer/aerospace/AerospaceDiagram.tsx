/**
 * Aerospace Diagram Component
 *
 * Visual representation of aerospace armor distribution by firing arc.
 * Shows a top-down view of the fighter with armor values per arc.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.3
 */

import React, { useMemo } from 'react';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';

// =============================================================================
// Types
// =============================================================================

interface AerospaceDiagramProps {
  className?: string;
  compact?: boolean;
}

interface ArmorArcProps {
  label: string;
  value: number;
  maxValue?: number;
}

// =============================================================================
// Helper Components
// =============================================================================

function ArmorArc({ label, value, maxValue }: ArmorArcProps): React.ReactElement {
  const fillPercent = maxValue && maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-text-theme-secondary uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-lg font-bold tabular-nums ${
          value === 0
            ? 'text-text-theme-secondary/50'
            : fillPercent > 75
            ? 'text-cyan-400'
            : fillPercent > 50
            ? 'text-green-400'
            : fillPercent > 25
            ? 'text-amber-400'
            : 'text-red-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AerospaceDiagram({
  className = '',
  compact = false,
}: AerospaceDiagramProps): React.ReactElement {
  // Get state from store
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);

  // Calculate max armor for each arc
  const maxArmor = useMemo(() => {
    const baseArmor = Math.floor(tonnage * 0.8);
    return {
      nose: Math.floor(baseArmor * 0.35),
      wing: Math.floor(baseArmor * 0.25),
      aft: Math.floor(baseArmor * 0.15),
    };
  }, [tonnage]);

  if (compact) {
    return (
      <div className={`text-center ${className}`}>
        <div className="inline-grid grid-cols-3 gap-2 text-xs">
          <div />
          <div className="text-cyan-400 font-mono">{armorAllocation[AerospaceLocation.NOSE] ?? 0}</div>
          <div />
          <div className="text-cyan-400 font-mono">{armorAllocation[AerospaceLocation.LEFT_WING] ?? 0}</div>
          <div className="text-text-theme-secondary/50">-</div>
          <div className="text-cyan-400 font-mono">{armorAllocation[AerospaceLocation.RIGHT_WING] ?? 0}</div>
          <div />
          <div className="text-cyan-400 font-mono">{armorAllocation[AerospaceLocation.AFT] ?? 0}</div>
          <div />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Header */}
      <div className="text-xs text-text-theme-secondary mb-2">
        Aerospace Fighter • {safeThrust}/{maxThrust} Thrust
      </div>

      {/* Main Diagram */}
      <div className="relative w-full max-w-xs aspect-square">
        {/* Fighter Body SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
        >
          {/* Main body (fuselage) */}
          <path
            d="M 100 20 L 120 60 L 120 160 L 100 180 L 80 160 L 80 60 Z"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Left wing */}
          <path
            d="M 80 80 L 20 120 L 30 130 L 80 100"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Right wing */}
          <path
            d="M 120 80 L 180 120 L 170 130 L 120 100"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Nose cone */}
          <circle
            cx="100"
            cy="40"
            r="8"
            className="stroke-cyan-500 fill-cyan-900/30"
            strokeWidth="2"
          />

          {/* Engine exhausts */}
          <ellipse
            cx="90"
            cy="175"
            rx="6"
            ry="4"
            className="stroke-amber-500 fill-amber-900/30"
            strokeWidth="1"
          />
          <ellipse
            cx="110"
            cy="175"
            rx="6"
            ry="4"
            className="stroke-amber-500 fill-amber-900/30"
            strokeWidth="1"
          />
        </svg>

        {/* Armor Values Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-4">
          {/* Nose */}
          <ArmorArc
            label="Nose"
            value={armorAllocation[AerospaceLocation.NOSE] ?? 0}
            maxValue={maxArmor.nose}
          />

          {/* Wings Row */}
          <div className="flex items-center justify-between w-full px-2">
            <ArmorArc
              label="L.Wing"
              value={armorAllocation[AerospaceLocation.LEFT_WING] ?? 0}
              maxValue={maxArmor.wing}
            />
            <div className="text-center">
              <span className="text-[10px] text-text-theme-secondary">SI</span>
              <div className="text-sm font-bold text-white">
                {Math.ceil(tonnage / 10)}
              </div>
            </div>
            <ArmorArc
              label="R.Wing"
              value={armorAllocation[AerospaceLocation.RIGHT_WING] ?? 0}
              maxValue={maxArmor.wing}
            />
          </div>

          {/* Aft */}
          <ArmorArc
            label="Aft"
            value={armorAllocation[AerospaceLocation.AFT] ?? 0}
            maxValue={maxArmor.aft}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-text-theme-secondary">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Armor
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Engines
        </span>
      </div>
    </div>
  );
}

export default AerospaceDiagram;
