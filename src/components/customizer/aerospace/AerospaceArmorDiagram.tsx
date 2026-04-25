/**
 * AerospaceArmorDiagram
 *
 * Per-type armor diagram for aerospace fighters and conventional fighters.
 * Renders 4 firing arcs (Nose / Left Wing / Right Wing / Aft) plus a
 * Structural Integrity (SI) bar above the arcs.
 *
 * Per-arc capacity: derived from `tonnage * pointsPerTon(armorType)` and the
 * arc-share splits used by the store's auto-allocate routine. This keeps the
 * diagram caps consistent with the store's actual allocation logic and uses
 * the configured armor type (Standard / Ferro / etc.) rather than a static
 * 16 pts/ton assumption.
 *
 * Auto-Allocate: delegates to `useAerospaceStore.autoAllocateArmor()` which
 * already encapsulates the per-arc share table. The button is gated by the
 * fighter-vs-small-craft cap implicitly via the store's pointsPerTon lookup.
 *
 * Accessibility:
 *   - Per-arc inputs use the shared <ArmorAllocationInput> primitive which
 *     supports clamp + ArrowLeft/ArrowRight focus navigation between siblings
 *     in the 'aerospace-armor' group.
 *   - Auto-Allocate prompts a confirm() dialog if the user has already
 *     manually allocated armor (any arc > 0).
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Aerospace Diagram Geometry
 */

import React, { useCallback, useMemo } from "react";

import { useAerospaceStore } from "@/stores/useAerospaceStore";
import { getArmorDefinition } from "@/types/construction/ArmorType";
import { AerospaceLocation } from "@/types/construction/UnitLocation";
import { AerospaceSubType } from "@/types/unit/AerospaceInterfaces";

import { ArmorAllocationInput } from "../armor/ArmorAllocationInput";
import { ArmorLocationBlock } from "../armor/ArmorLocationBlock";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Per-arc share of total armor points (matches store's autoAllocateArmor splits).
 *   Nose 35% / Wings 25% each / Aft 15%  → totals 100%
 */
const ARC_SHARE: Record<AerospaceLocation, number> = {
  [AerospaceLocation.NOSE]: 0.35,
  [AerospaceLocation.LEFT_WING]: 0.25,
  [AerospaceLocation.RIGHT_WING]: 0.25,
  [AerospaceLocation.AFT]: 0.15,
  [AerospaceLocation.FUSELAGE]: 0,
};

/**
 * Hard tonnage cap on armor per the rules:
 *   - Aerospace fighters: max 8 × tonnage points (per TM Aerospace).
 *   - Small craft: max 16 × tonnage points (per StratOps).
 *
 * Used as an upper-bound sanity cap when computing per-arc maxima so the
 * diagram never displays a max greater than the rules permit even if the
 * raw armor tonnage is over-allocated by the user.
 */
function maxTotalArmorPoints(
  tonnage: number,
  subType: AerospaceSubType,
): number {
  if (subType === AerospaceSubType.SMALL_CRAFT) {
    return tonnage * 16;
  }
  return tonnage * 8;
}

/**
 * Per-arc maximum armor points.
 *
 * = min(armorTonnage * pointsPerTon, maxTotalArmorPoints) * arcShare
 *
 * Honours the configured armor type's points-per-ton (Standard 16, Ferro 17.92, …)
 * and applies the chassis cap so arcs can never exceed legal limits.
 */
function getArcMax(
  tonnage: number,
  armorTonnage: number,
  pointsPerTon: number,
  subType: AerospaceSubType,
  arc: AerospaceLocation,
): number {
  const requested = Math.floor(armorTonnage * pointsPerTon);
  const cap = maxTotalArmorPoints(tonnage, subType);
  const total = Math.max(0, Math.min(requested, cap));
  return Math.floor(total * (ARC_SHARE[arc] ?? 0));
}

// =============================================================================
// Types
// =============================================================================

interface AerospaceArmorDiagramProps {
  className?: string;
}

// Arc display order with labels matching aerospace-unit-system spec arc names
const ARCS: { arc: AerospaceLocation; label: string }[] = [
  { arc: AerospaceLocation.NOSE, label: "Nose" },
  { arc: AerospaceLocation.LEFT_WING, label: "Left Wing" },
  { arc: AerospaceLocation.RIGHT_WING, label: "Right Wing" },
  { arc: AerospaceLocation.AFT, label: "Aft" },
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
  className = "",
}: AerospaceArmorDiagramProps): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const armorTonnage = useAerospaceStore((s) => s.armorTonnage);
  const armorType = useAerospaceStore((s) => s.armorType);
  const subType = useAerospaceStore((s) => s.aerospaceSubType);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const setArcArmor = useAerospaceStore((s) => s.setArcArmor);
  const autoAllocateArmor = useAerospaceStore((s) => s.autoAllocateArmor);

  // TODO(add-aerospace-construction): read SI from store when available.
  const si = Math.ceil(tonnage / 10);
  const siMax = Math.ceil(tonnage / 10); // structural integrity equals SI rating

  // Resolve points-per-ton for the configured armor type (defaults to 16).
  const pointsPerTon = useMemo(() => {
    const def = getArmorDefinition(armorType);
    return def?.pointsPerTon ?? 16;
  }, [armorType]);

  const handleChange = useCallback(
    (arc: AerospaceLocation, raw: number) => {
      const max = getArcMax(tonnage, armorTonnage, pointsPerTon, subType, arc);
      setArcArmor(arc, Math.max(0, Math.min(max, raw)));
    },
    [setArcArmor, tonnage, armorTonnage, pointsPerTon, subType],
  );

  // Detect any non-default arc allocation for the confirm gate
  const hasNonDefaultArmor = useMemo(
    () =>
      Object.values(armorAllocation as Record<string, number>).some(
        (v) => (v ?? 0) > 0,
      ),
    [armorAllocation],
  );

  const availablePoints = Math.floor(armorTonnage * pointsPerTon);

  const handleAutoAllocate = useCallback(() => {
    if (hasNonDefaultArmor) {
      const ok =
        typeof window === "undefined" ||
        // eslint-disable-next-line no-alert -- intentional confirm for destructive action
        window.confirm(
          "Auto-allocate will overwrite your current armor distribution. Continue?",
        );
      if (!ok) return;
    }
    autoAllocateArmor();
  }, [autoAllocateArmor, hasNonDefaultArmor]);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="aerospace-armor-diagram"
    >
      {/* Header + Auto-Allocate */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Armor Diagram</h4>
        <button
          onClick={handleAutoAllocate}
          disabled={availablePoints === 0}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="aerospace-armor-auto-allocate"
        >
          Auto-Allocate
        </button>
      </div>

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
              width: siMax > 0 ? `${(si / siMax) * 100}%` : "0%",
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
          const max = getArcMax(
            tonnage,
            armorTonnage,
            pointsPerTon,
            subType,
            arc,
          );
          return (
            <div key={arc} className="flex flex-col gap-1">
              <ArmorLocationBlock
                label={label}
                current={current}
                max={max}
                accentClass="text-cyan-400"
              />
              <ArmorAllocationInput
                label={label}
                value={current}
                max={max}
                groupId="aerospace-armor"
                data-testid={`aerospace-arc-diagram-input-${arc}`}
                onChange={(next) => handleChange(arc, next)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AerospaceArmorDiagram;
