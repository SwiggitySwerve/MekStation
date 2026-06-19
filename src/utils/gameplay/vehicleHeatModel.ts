/**
 * Vehicle Heat Model
 *
 * Vehicles don't track heat like mechs. Per TW Combat Vehicles:
 *   - ICE and Fuel Cell vehicles have NO heat track.
 *   - Fusion-engine vehicles have a heat track but with different scale:
 *     shutdown cap at 6+ (much lower than mechs).
 *
 * This module returns a policy descriptor the combat engine consults.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/tasks.md §10
 */

import { EngineType } from '@/types/construction/EngineType';

/**
 * Heat policy for a vehicle combat pipeline.
 */
export interface IVehicleHeatModel {
  /** True if the vehicle has any heat tracking at all. */
  readonly hasHeatTrack: boolean;
  /** Threshold at which the vehicle shuts down (undefined when no track). */
  readonly shutdownCap?: number;
  /** Human-readable rationale (e.g. "ICE engine — no heat track"). */
  readonly rationale: string;
}
const noHeatTrackEngineModels: Partial<Record<EngineType, IVehicleHeatModel>> =
  {
    [EngineType.ICE]: {
      hasHeatTrack: false,
      rationale:
        'ICE engine — vehicles with internal-combustion have no heat track (TW p.196).',
    },
    [EngineType.FUEL_CELL]: {
      hasHeatTrack: false,
      rationale: 'Fuel Cell engine — no heat track.',
    },
  };

const fusionClassEngines = new Set<EngineType | string | number>([
  EngineType.STANDARD,
  EngineType.XL_IS,
  EngineType.XL_CLAN,
  EngineType.LIGHT,
  EngineType.XXL,
  EngineType.COMPACT,
  EngineType.FISSION,
]);

const fusionClassHeatModel: IVehicleHeatModel = {
  hasHeatTrack: true,
  shutdownCap: 6,
  rationale:
    'Fusion-class engine — vehicle-scale heat tracking, shutdown at 6+.',
};

/**
 * Compute the heat model for a vehicle given its engine type.
 *
 * The underlying engine type is a string enum (`EngineType`); some unit
 * interfaces carry it as a numeric code, so we accept the enum value, a
 * raw string, or a numeric fallback for future compatibility.
 */
export function getVehicleHeatModel(
  engineType: EngineType | string | number,
): IVehicleHeatModel {
  if (typeof engineType === 'string' && engineType in noHeatTrackEngineModels) {
    return noHeatTrackEngineModels[engineType as EngineType]!;
  }
  if (fusionClassEngines.has(engineType)) {
    return fusionClassHeatModel;
  }
  return {
    hasHeatTrack: false,
    rationale: `Unknown engine type ${engineType} — defaulting to no heat track.`,
  };
}
