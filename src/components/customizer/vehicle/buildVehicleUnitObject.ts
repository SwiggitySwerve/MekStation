/**
 * buildVehicleUnitObject — vehicle store → record-sheet unit object
 *
 * Pure builder that maps the vehicle store's fields onto the
 * `IVehicleRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The returned object carries a `unitType`
 * hint that `dispatchTargetFromUnit` resolves to the `'vehicle'` dispatch kind.
 *
 * Extracted from `VehiclePreviewTab` so the builder can be unit-tested
 * independently of React rendering.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IVehicleRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type {
  IVehicleArmorAllocation,
  IVTOLArmorAllocation,
} from '@/stores/vehicleState';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the vehicle unit-object builder reads. */
export interface VehicleUnitObjectInput extends RecordSheetUnitIdentityWithTonnageInput {
  unitType: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE;
  motionType: GroundMotionType;
  cruiseMP: number;
  flankMP: number;
  armorType: ArmorTypeEnum;
  armorAllocation: IVehicleArmorAllocation | IVTOLArmorAllocation;
  barRating: number | null;
  equipment: readonly IVehicleMountedEquipment[];
}

/**
 * Map a `GroundMotionType` to the record-sheet vehicle motion label.
 * The extractor accepts a small closed set; everything else falls back to
 * 'Tracked' (the extractor's own default).
 */
function toMotionLabel(
  motionType: GroundMotionType,
): IVehicleRecordSheetUnitInput['motionType'] {
  switch (motionType) {
    case GroundMotionType.WHEELED:
      return 'Wheeled';
    case GroundMotionType.HOVER:
      return 'Hover';
    case GroundMotionType.VTOL:
      return 'VTOL';
    case GroundMotionType.NAVAL:
      return 'Naval';
    case GroundMotionType.WIGE:
      return 'WiGE';
    case GroundMotionType.TRACKED:
    default:
      return 'Tracked';
  }
}

/**
 * Translate the store's keyed armor allocation into the record-sheet
 * `{ location: { current, maximum } }` map. The store keys are location enum
 * strings (Front / Left / Right / Rear / Turret / Turret 2 / Body / Rotor);
 * the extractor recognises the human labels in `VEHICLE_LOCATION_ORDER`.
 */
function toArmorAllocation(
  allocation: IVehicleArmorAllocation | IVTOLArmorAllocation,
): Record<string, { current: number; maximum: number }> {
  // Map the store's location keys onto the extractor's expected label set.
  const keyToLabel: Record<string, string> = {
    Front: 'Front',
    Left: 'Left Side',
    Right: 'Right Side',
    Rear: 'Rear',
    Turret: 'Turret',
    'Turret 2': 'Turret',
    Body: 'Body',
    Rotor: 'Rotor',
  };

  const result: Record<string, { current: number; maximum: number }> = {};
  for (const [key, points] of Object.entries(allocation)) {
    const label = keyToLabel[key];
    if (label === undefined || typeof points !== 'number') continue;
    // Maximum is unknown from the store alone — use the allocated value so the
    // bar renders full; the extractor only needs current/maximum to draw.
    result[label] = { current: points, maximum: points };
  }
  return result;
}

/**
 * Build the discriminated vehicle unit object for the record-sheet service.
 *
 * The `unitType` field is the dispatch hint: it carries the store's exact
 * `UnitType` ('Vehicle' / 'VTOL' / 'Support Vehicle'), all of which
 * `getRecordSheetDispatchKind` normalizes to the `'vehicle'` kind.
 */
export function buildVehicleUnitObject(
  input: VehicleUnitObjectInput,
): IVehicleRecordSheetUnitInput {
  return {
    ...buildRecordSheetUnitIdentity(input),
    // Dispatch hint — resolves to the 'vehicle' kind for all three sub-types.
    unitType: input.unitType,
    motionType: toMotionLabel(input.motionType),
    cruiseMP: input.cruiseMP,
    flankMP: input.flankMP,
    armorType: String(input.armorType),
    armorAllocation: toArmorAllocation(input.armorAllocation),
    barRating: input.barRating ?? undefined,
    equipment: input.equipment.map((eq) => ({
      id: eq.id,
      name: eq.name,
      location: String(eq.location),
    })),
  };
}
