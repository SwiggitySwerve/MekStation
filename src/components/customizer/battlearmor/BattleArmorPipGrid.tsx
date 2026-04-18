/**
 * BattleArmorPipGrid
 *
 * Per-trooper pip grid for Battle Armor squads.
 * Renders one column per trooper (4–6) with M pip rows per column, where M
 * is the suit's max armor pips derived from chassis weight class:
 *
 *   PA(L)   → 3 pips
 *   Light   → 5 pips   (TM uses 5 for generic Light)
 *   Medium  → 7 pips
 *   Heavy   → 11 pips
 *   Assault → 15 pips
 *
 * Damage tracking: individual trooper damage can be tracked; pips clear
 * from the top as damage is taken (fully damage-tracked model is stubbed
 * with trooper 0-indexed damage array defaulting to 0).
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: BattleArmor Per-Trooper Grid
 */

import React from "react";

import { useBattleArmorStore } from "@/stores/useBattleArmorStore";
import { BattleArmorWeightClass } from "@/types/unit/PersonnelInterfaces";

import { ArmorPipRow } from "../armor/ArmorPipRow";

// =============================================================================
// Constants
// =============================================================================

/**
 * Max armor pips per trooper by weight class — TechManual values.
 */
const MAX_PIPS_BY_WEIGHT_CLASS: Record<BattleArmorWeightClass, number> = {
  [BattleArmorWeightClass.PA_L]: 3,
  [BattleArmorWeightClass.LIGHT]: 5,
  [BattleArmorWeightClass.MEDIUM]: 7,
  [BattleArmorWeightClass.HEAVY]: 11,
  [BattleArmorWeightClass.ASSAULT]: 15,
};

// =============================================================================
// Types
// =============================================================================

interface BattleArmorPipGridProps {
  /**
   * Per-trooper damage array (index = trooper index, value = pips lost).
   * Defaults to all-zeros (full health) when not supplied.
   * TODO(add-battlearmor-combat-behavior): wire from combat session state.
   */
  damageByTrooper?: number[];
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Grid of armor pips, one column per trooper.
 *
 * Each column shows max pip slots for the chassis weight class; filled pips
 * represent remaining armor. The squad leader (trooper index 0) is indicated
 * with a small crown marker.
 */
export function BattleArmorPipGrid({
  damageByTrooper,
  className = "",
}: BattleArmorPipGridProps): React.ReactElement {
  const squadSize = useBattleArmorStore((s) => s.squadSize);
  const armorPerTrooper = useBattleArmorStore((s) => s.armorPerTrooper);
  const weightClass = useBattleArmorStore((s) => s.weightClass);
  const chassisType = useBattleArmorStore((s) => s.chassisType);

  // Derive pip max from weight class; fall back to armorPerTrooper if class unknown
  const maxPips = MAX_PIPS_BY_WEIGHT_CLASS[weightClass] ?? armorPerTrooper;

  const troopers = Array.from({ length: squadSize }, (_, i) => i);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-3 rounded-lg border p-4 ${className}`}
      data-testid="battlearmor-pip-grid"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Armor Pips</h4>
        <span className="text-text-theme-secondary text-xs">
          {chassisType} • {squadSize} troopers
        </span>
      </div>

      {/* Trooper columns */}
      <div
        className="flex justify-center gap-3 overflow-x-auto"
        role="region"
        aria-label="Battle Armor squad armor pips"
      >
        {troopers.map((i) => {
          const damage = damageByTrooper?.[i] ?? 0;
          const remaining = Math.max(0, maxPips - damage);

          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5"
              data-testid={`ba-trooper-col-${i}`}
            >
              {/* Squad leader indicator */}
              {i === 0 && (
                <span
                  className="text-amber-400"
                  title="Squad leader"
                  aria-label="Squad leader"
                  style={{ fontSize: 10 }}
                >
                  ★
                </span>
              )}
              {i !== 0 && (
                // Spacer to keep columns aligned
                <span style={{ fontSize: 10, visibility: "hidden" }}>★</span>
              )}

              {/* Pip column — delegates to shared primitive */}
              <ArmorPipRow
                label={`Trooper ${i + 1}`}
                current={remaining}
                max={maxPips}
                orientation="column"
                pipSize={10}
              />

              {/* Trooper index label */}
              <span className="text-text-theme-secondary text-[9px] tabular-nums">
                T{i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Squad summary */}
      <div className="border-border-theme-subtle flex justify-between border-t pt-2 text-xs">
        <span className="text-text-theme-secondary">
          Armor per trooper:{" "}
          <span className="font-mono text-cyan-400">{maxPips}</span>
        </span>
        <span className="text-text-theme-secondary">
          Total:{" "}
          <span className="font-mono text-cyan-400">{maxPips * squadSize}</span>
        </span>
      </div>
    </div>
  );
}

export default BattleArmorPipGrid;
