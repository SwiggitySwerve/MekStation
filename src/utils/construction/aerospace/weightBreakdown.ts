/**
 * Aerospace Weight Breakdown Calculator
 *
 * Aggregates all weight components into an IAerospaceBreakdown summary.
 * Used by the status bar and validation to show/check tonnage budget.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
  IAerospaceBreakdown,
  ISmallCraftCrew,
} from '../../../types/unit/AerospaceInterfaces';
import { aerospaceEngineWeight } from './engineWeightAerospace';
import { siExtraWeightTons } from './siCalculations';

// ============================================================================
// Cockpit Tonnage by Cockpit Type
// ============================================================================

/** Cockpit tonnage by cockpit type name. Standard = 3, Small = 2. */
const COCKPIT_TONS: Record<string, number> = {
  Standard: 3,
  Small: 2,
  Primitive: 5,
  'Command Console': 6,
};

/** Return tonnage for a cockpit type string. Defaults to 3 (standard). */
export function cockpitTons(cockpitType: string): number {
  return COCKPIT_TONS[cockpitType] ?? 3;
}

// ============================================================================
// Heat Sink Tonnage
// ============================================================================

/**
 * Aerospace baseline: 10 heat sinks are engine-integral and cost no tonnage.
 * Additional sinks each weigh 1 ton (SHS) or 1 ton (DHS — same weight, more dissipation).
 */
const ENGINE_FREE_HEAT_SINKS = 10;

/**
 * Return tonnage consumed by heat sinks above the engine-free baseline.
 */
export function heatSinkExtraTons(totalHeatSinks: number): number {
  return Math.max(0, totalHeatSinks - ENGINE_FREE_HEAT_SINKS);
}

// ============================================================================
// Full Breakdown
// ============================================================================

export interface WeightBreakdownInput {
  readonly tonnage: number;
  readonly subType: AerospaceSubType;
  readonly engineRating: number;
  readonly engineType: AerospaceEngineType;
  readonly structuralIntegrity: number;
  readonly fuelTons: number;
  readonly armorTons: number;
  readonly totalHeatSinks: number;
  readonly cockpitType: string;
  /** Total equipment tonnage (sum of all mounted items) */
  readonly equipmentTons: number;
  /** Only relevant for small craft; null for ASF/CF */
  readonly crew: ISmallCraftCrew | null;
}

/**
 * Compute a complete weight breakdown for an aerospace unit.
 * All values in tons. Remaining = tonnage - totalUsed.
 */
export function computeWeightBreakdown(
  input: WeightBreakdownInput,
): IAerospaceBreakdown {
  const engineTons = aerospaceEngineWeight(
    input.engineRating,
    input.engineType,
  );
  const siTons = siExtraWeightTons(input.structuralIntegrity, input.tonnage);
  const heatSinkTons = heatSinkExtraTons(input.totalHeatSinks);
  const cpTons = cockpitTons(input.cockpitType);
  const quartersTons = input.crew ? input.crew.quartersTons : 0;

  const totalUsed =
    engineTons +
    siTons +
    input.fuelTons +
    input.armorTons +
    heatSinkTons +
    cpTons +
    quartersTons +
    input.equipmentTons;

  return {
    engineTons,
    siTons,
    fuelTons: input.fuelTons,
    armorTons: input.armorTons,
    heatSinkTons,
    cockpitTons: cpTons,
    quartersTons,
    equipmentTons: input.equipmentTons,
    totalUsed,
    remaining: input.tonnage - totalUsed,
  };
}
