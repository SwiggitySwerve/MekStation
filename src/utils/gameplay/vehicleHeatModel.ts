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
  switch (engineType) {
    case EngineType.ICE:
      return {
        hasHeatTrack: false,
        rationale:
          'ICE engine — vehicles with internal-combustion have no heat track (TW p.196).',
      };
    case EngineType.FUEL_CELL:
      return {
        hasHeatTrack: false,
        rationale: 'Fuel Cell engine — no heat track.',
      };
    case EngineType.STANDARD:
    case EngineType.XL_IS:
    case EngineType.XL_CLAN:
    case EngineType.LIGHT:
    case EngineType.XXL:
    case EngineType.COMPACT:
    case EngineType.FISSION:
      return {
        hasHeatTrack: true,
        shutdownCap: 6,
        rationale:
          'Fusion-class engine — vehicle-scale heat tracking, shutdown at 6+.',
      };
    default:
      return {
        hasHeatTrack: false,
        rationale: `Unknown engine type ${engineType} — defaulting to no heat track.`,
      };
  }
}
