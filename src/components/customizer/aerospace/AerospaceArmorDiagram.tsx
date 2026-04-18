/**
 * AerospaceArmorDiagram
 *
 * Per-type armor diagram for aerospace fighters and conventional fighters.
 * Renders 4 firing arcs (Nose / Left Wing / Right Wing / Aft) plus a
 * Structural Integrity (SI) bar above the arcs.
 *
 * SI data does not yet exist on the aerospace store — a TODO is left here
 * referencing the add-aerospace-construction proposal that will populate it.
 *
 * All arc pip strips delegate to <ArmorPipRow> via <ArmorLocationBlock>.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Aerospace Diagram Geometry
 */

import React, { useCallback } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';

import { ArmorLocationBlock } from '../armor/ArmorLocationBlock';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Arc max armor — mirrors the logic already used in AerospaceArmorTab.
 * add-aerospace-construction will refine these caps when it lands.
 */
function getArcMax(tonnage: number, arc: AerospaceLocation): number {
  const base = Math.floor(tonnage * 0.8);
  switch (arc) {
    case AerospaceLocation.NOSE:
      return Math.floor(base * 0.35);
    case AerospaceLocation.LEFT_WING:
    case AerospaceLocation.RIGHT_WING:
      return Math.floor(base * 0.25);
    case AerospaceLocation.AFT:
      return Math.floor(base * 0.15);
    default:
      return 0;
  }
}

// =============================================================================
// Types
// =============================================================================

interface AerospaceArmorDiagramProps {
  className?: string;
}

// Arc display order with labels matching aerospace-unit-system spec arc names
const ARCS: { arc: AerospaceLocation; label: string }[] = [
  { arc: AerospaceLocation.NOSE, label: 'Nose' },
  { arc: AerospaceLocation.LEFT_WING, label: 'Left Wing' },
  { arc: AerospaceLocation.RIGHT_WING, label: 'Right Wing' },
  { arc: AerospaceLocation.AFT, label: 'Aft' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Aerospace armor diagram showing 4 arcs + SI bar.
 *
 * The SI bar uses a placeholder value (Math.ceil(tonnage / 10)) until the
 * add-aerospace-construction proposal adds SI as a first-class store field.
 * TODO(add-aerospace-construction): replace placeholder SI with store value.
 */
export function AerospaceArmorDiagram({
  className = '',
}: AerospaceArmorDiagramProps): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const setArcArmor = useAerospaceStore((s) => s.setArcArmor);

  // TODO(add-aerospace-construction): read SI from store when available.
  const si = Math.ceil(tonnage / 10);
  const siMax = Math.ceil(tonnage / 10); // structural integrity equals SI rating

  const handleChange = useCallback(
    (arc: AerospaceLocation, raw: number) => {
      const max = getArcMax(tonnage, arc);
      setArcArmor(arc, Math.max(0, Math.min(max, raw)));
    },
    [setArcArmor, tonnage],
  );

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="aerospace-armor-diagram"
    >
      {/* Header */}
      <h4 className="text-sm font-semibold text-white">Armor Diagram</h4>

      {/* SI bar — rendered separately above the arc diagram per spec */}
      <div
        className="flex flex-col gap-1"
        aria-label={`Structural Integrity: ${si} of ${siMax}`}
        data-testid="aerospace-si-bar"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-text-theme-secondary text-[10px] font-medium tracking-wide uppercase">
            Structural Integrity
          </span>
          <span className="font-mono text-xs text-amber-400 tabular-nums">
            {si}
            <span className="text-text-theme-secondary">/{siMax}</span>
          </span>
        </div>
        {/* Horizontal progress bar */}
        <div className="h-2 w-full overflow-hidden rounded bg-slate-700">
          <div
            className="h-full rounded bg-amber-500 transition-all"
            style={{
              width: siMax > 0 ? `${(si / siMax) * 100}%` : '0%',
            }}
          />
        </div>
        <p className="text-text-theme-secondary text-[9px] italic">
          SI placeholder — add-aerospace-construction will populate this field.
        </p>
      </div>

      {/* Fighter silhouette */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 160 180"
          className="w-full max-w-[140px]"
          aria-hidden="true"
        >
          {/* Fuselage */}
          <path
            d="M 80 15 L 95 55 L 95 145 L 80 160 L 65 145 L 65 55 Z"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Left wing */}
          <path
            d="M 65 75 L 15 115 L 22 122 L 65 95"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Right wing */}
          <path
            d="M 95 75 L 145 115 L 138 122 L 95 95"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Nose highlight */}
          <circle
            cx="80"
            cy="30"
            r="6"
            className="fill-cyan-900/30 stroke-cyan-500"
            strokeWidth="1.5"
          />
          {/* Engine exhaust */}
          <ellipse
            cx="75"
            cy="152"
            rx="5"
            ry="3"
            className="fill-amber-900/30 stroke-amber-500"
            strokeWidth="1"
          />
          <ellipse
            cx="85"
            cy="152"
            rx="5"
            ry="3"
            className="fill-amber-900/30 stroke-amber-500"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Arc location blocks */}
      <div className="grid grid-cols-2 gap-3">
        {ARCS.map(({ arc, label }) => {
          const current = (armorAllocation as Record<string, number>)[arc] ?? 0;
          const max = getArcMax(tonnage, arc);
          return (
            <div key={arc} className="flex flex-col gap-1">
              <ArmorLocationBlock
                label={label}
                current={current}
                max={max}
                accentClass="text-cyan-400"
              />
              <input
                type="number"
                value={current}
                min={0}
                max={max}
                onChange={(e) => handleChange(arc, Number(e.target.value))}
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-center text-xs text-white"
                aria-label={`${label} armor value`}
                data-testid={`aerospace-arc-diagram-input-${arc}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AerospaceArmorDiagram;
