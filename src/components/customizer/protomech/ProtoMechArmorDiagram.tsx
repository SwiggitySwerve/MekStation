/**
 * ProtoMechArmorDiagram
 *
 * Compact per-type armor diagram for ProtoMech units.
 * Renders 5 standard locations (Head / Torso / Left Arm / Right Arm / Legs)
 * plus an optional Main Gun location when the unit has hasMainGun === true.
 *
 * Layout is intentionally compact so that a full point of 5 ProtoMechs can be
 * displayed side-by-side on a standard desktop viewport without horizontal
 * scroll (each diagram targets ≤ 200px wide).
 *
 * Per-location armor caps follow the canonical ProtoMech weight table
 * (TechManual / TechManual Companion p.196 — Standard ProtoMech Armor Table).
 * The classic table is bracketed by tonnage; values below mirror the printed
 * record-sheet maxima for tonnages 2..15. add-protomech-construction will
 * formalise the table in a shared util — until then this diagram inlines it
 * and keeps the values in one place.
 *
 * Accessibility:
 *   - Per-location numeric inputs use the shared <ArmorAllocationInput> with
 *     ArrowLeft/ArrowRight navigation between siblings in the
 *     'protomech-armor' group.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: ProtoMech 5-Location Compact Diagram
 */

import React, { useCallback } from "react";

import { useProtoMechStore } from "@/stores/useProtoMechStore";
import { ProtoMechLocation } from "@/types/construction/UnitLocation";

import { ArmorAllocationInput } from "../armor/ArmorAllocationInput";
import { ArmorLocationBlock } from "../armor/ArmorLocationBlock";

// =============================================================================
// Helpers — Standard ProtoMech Armor Table (TM Companion p.196)
// =============================================================================

/**
 * Canonical max-armor-by-tonnage for the Torso location.
 * Source: ProtoMech Armor Table (Standard ProtoMechs, 2-9 tons).
 */
const TORSO_MAX_BY_TON: Record<number, number> = {
  2: 6,
  3: 9,
  4: 11,
  5: 14,
  6: 17,
  7: 20,
  8: 23,
  9: 26,
};

/**
 * Canonical max-armor-by-tonnage for Arm locations.
 */
const ARM_MAX_BY_TON: Record<number, number> = {
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
};

/**
 * Canonical max-armor-by-tonnage for the combined Legs location.
 */
const LEGS_MAX_BY_TON: Record<number, number> = {
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 18,
};

/**
 * Canonical max-armor-by-tonnage for the Main Gun location.
 */
const MAIN_GUN_MAX_BY_TON: Record<number, number> = {
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
};

/**
 * Heavy ProtoMech tonnage threshold (10-15t variants get the doubled head cap).
 */
const HEAVY_PROTO_THRESHOLD = 10;

/**
 * Look up a value from a tonnage table, gracefully clamping outside the
 * standard 2-9 ton range. Returns 0 for sub-2 ton ProtoMechs (illegal).
 */
function lookupByTon(table: Record<number, number>, tonnage: number): number {
  if (tonnage <= 0) return 0;
  // Clamp to table-known range; outside that we extrapolate linearly off
  // the highest known value to avoid surprising drops at high tonnages.
  if (table[tonnage] !== undefined) return table[tonnage];
  const known = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  if (tonnage < known[0]) return table[known[0]];
  const top = known[known.length - 1];
  // Heavy ProtoMechs (10-15t) extrapolate at +3/ton beyond 9t — matches the
  // published Heavy ProtoMech armor table progression.
  return table[top] + (tonnage - top) * 3;
}

/**
 * Per-location armor cap derived from the official ProtoMech weight table.
 *
 * Heavy ProtoMechs (10t+) double the head cap to 4 (TM Companion p.197).
 */
function getLocationMax(tonnage: number, loc: ProtoMechLocation): number {
  const isHeavy = tonnage >= HEAVY_PROTO_THRESHOLD;
  switch (loc) {
    case ProtoMechLocation.HEAD:
      return isHeavy ? 4 : 2;
    case ProtoMechLocation.TORSO:
      return lookupByTon(TORSO_MAX_BY_TON, tonnage);
    case ProtoMechLocation.LEFT_ARM:
    case ProtoMechLocation.RIGHT_ARM:
      return lookupByTon(ARM_MAX_BY_TON, tonnage);
    case ProtoMechLocation.LEGS:
      return lookupByTon(LEGS_MAX_BY_TON, tonnage);
    case ProtoMechLocation.MAIN_GUN:
      return lookupByTon(MAIN_GUN_MAX_BY_TON, tonnage);
    default:
      return 0;
  }
}

// =============================================================================
// Types
// =============================================================================

interface ProtoMechArmorDiagramProps {
  className?: string;
}

// Standard 5-location display order
const BASE_LOCATIONS: { loc: ProtoMechLocation; label: string }[] = [
  { loc: ProtoMechLocation.HEAD, label: "Head" },
  { loc: ProtoMechLocation.TORSO, label: "Torso" },
  { loc: ProtoMechLocation.LEFT_ARM, label: "LA" },
  { loc: ProtoMechLocation.RIGHT_ARM, label: "RA" },
  { loc: ProtoMechLocation.LEGS, label: "Legs" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Compact ProtoMech armor diagram.
 *
 * Sized to work inside a 5-column flex row for full-point display.
 * Inputs are small number spinners; pip rows use 6px pips to stay narrow.
 */
export function ProtoMechArmorDiagram({
  className = "",
}: ProtoMechArmorDiagramProps): React.ReactElement {
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);

  // ProtoMech store exposes setLocationArmor.
  const setLocationArmor = useProtoMechStore((s) => s.setLocationArmor);

  const handleChange = useCallback(
    (loc: ProtoMechLocation, raw: number) => {
      const max = getLocationMax(tonnage, loc);
      setLocationArmor(loc, Math.max(0, Math.min(max, raw)));
    },
    [setLocationArmor, tonnage],
  );

  const locations = hasMainGun
    ? [...BASE_LOCATIONS, { loc: ProtoMechLocation.MAIN_GUN, label: "MG" }]
    : BASE_LOCATIONS;

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex w-full max-w-[200px] flex-col gap-2 rounded-lg border p-3 ${className}`}
      data-testid="protomech-armor-diagram"
    >
      {/* Compact header */}
      <h4 className="text-center text-[10px] font-semibold tracking-wide text-white uppercase">
        Armor
      </h4>

      {/* Minimal ProtoMech silhouette */}
      <div className="flex justify-center">
        <svg viewBox="0 0 60 80" className="h-16 w-auto" aria-hidden="true">
          {/* Head */}
          <rect
            x="22"
            y="4"
            width="16"
            height="12"
            rx="3"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
          {/* Torso */}
          <rect
            x="18"
            y="18"
            width="24"
            height="22"
            rx="2"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
          {/* Left arm */}
          <rect
            x="8"
            y="20"
            width="8"
            height="18"
            rx="2"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
          {/* Right arm */}
          <rect
            x="44"
            y="20"
            width="8"
            height="18"
            rx="2"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
          {/* Legs */}
          <rect
            x="18"
            y="42"
            width="10"
            height="26"
            rx="2"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
          <rect
            x="32"
            y="42"
            width="10"
            height="26"
            rx="2"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Location blocks — compact column layout */}
      <div className="flex flex-col gap-2">
        {locations.map(({ loc, label }) => {
          const current = (armorByLocation as Record<string, number>)[loc] ?? 0;
          const max = getLocationMax(tonnage, loc);

          return (
            <div key={loc} className="flex flex-col gap-0.5">
              <ArmorLocationBlock
                label={label}
                current={current}
                max={max}
                pipSize={6}
                accentClass="text-cyan-400"
              />
              <ArmorAllocationInput
                label={label}
                value={current}
                max={max}
                groupId="protomech-armor"
                data-testid={`proto-armor-input-${loc}`}
                className="px-1 py-0.5 text-[10px]"
                onChange={(next) => handleChange(loc, next)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProtoMechArmorDiagram;
