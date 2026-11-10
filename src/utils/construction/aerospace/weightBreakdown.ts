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
import { cockpitTons, heatSinkExtraTons } from './sourceWeight';
export { cockpitTons, heatSinkExtraTons } from './sourceWeight';

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
  // Fighter SI is derived and weighs nothing in MegaMek; only small craft
  // pay for SI above the default.
  const siTons =
    input.subType === AerospaceSubType.SMALL_CRAFT
      ? siExtraWeightTons(input.structuralIntegrity, input.tonnage)
      : 0;
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
