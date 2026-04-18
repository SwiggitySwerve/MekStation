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
 * Armor per-location is capped by ProtoMech weight table values; until
 * add-protomech-construction lands the caps are approximated from tonnage.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: ProtoMech 5-Location Compact Diagram
 */

import React, { useCallback } from 'react';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { ArmorLocationBlock } from '../armor/ArmorLocationBlock';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Approximate per-location armor caps from tonnage.
 * TODO(add-protomech-construction): replace with canonical weight-table caps.
 */
function getLocationMax(tonnage: number, loc: ProtoMechLocation): number {
  // ProtoMechs can mount up to 2× structure points in armor per location;
  // structure approximates tonnage / 5 per location (simplified).
  const base = Math.max(1, Math.ceil(tonnage / 5));
  switch (loc) {
    case ProtoMechLocation.TORSO:
      return base * 3;
    case ProtoMechLocation.HEAD:
      return base;
    case ProtoMechLocation.LEFT_ARM:
    case ProtoMechLocation.RIGHT_ARM:
      return base * 2;
    case ProtoMechLocation.LEGS:
      return base * 2;
    case ProtoMechLocation.MAIN_GUN:
      return base;
    default:
      return base;
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
  { loc: ProtoMechLocation.HEAD, label: 'Head' },
  { loc: ProtoMechLocation.TORSO, label: 'Torso' },
  { loc: ProtoMechLocation.LEFT_ARM, label: 'LA' },
  { loc: ProtoMechLocation.RIGHT_ARM, label: 'RA' },
  { loc: ProtoMechLocation.LEGS, label: 'Legs' },
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
  className = '',
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
    ? [...BASE_LOCATIONS, { loc: ProtoMechLocation.MAIN_GUN, label: 'MG' }]
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
              <input
                type="number"
                value={current}
                min={0}
                max={max}
                onChange={(e) => handleChange(loc, Number(e.target.value))}
                className="w-full rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-[10px] text-white"
                aria-label={`${label} armor value`}
                data-testid={`proto-armor-input-${loc}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProtoMechArmorDiagram;
