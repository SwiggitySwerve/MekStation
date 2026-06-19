/**
 * buildAerospaceUnitObject — aerospace store → record-sheet unit object
 *
 * Pure builder mapping the aerospace store's fields onto the
 * `IAerospaceRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The `unitType` hint resolves via
 * `dispatchTargetFromUnit` to the `'aerospace'` dispatch kind for both
 * Aerospace Fighters and Conventional Fighters.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IAerospaceRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IAerospaceArmorAllocation } from '@/stores/aerospaceState';
import type { IAerospaceMountedEquipment } from '@/types/unit/AerospaceInterfaces';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the aerospace unit-object builder reads. */
export interface AerospaceUnitObjectInput extends RecordSheetUnitIdentityWithTonnageInput {
  unitType: UnitType.AEROSPACE | UnitType.CONVENTIONAL_FIGHTER;
  structuralIntegrity: number;
  fuelPoints: number;
  safeThrust: number;
  maxThrust: number;
  heatSinks: number;
  doubleHeatSinks: boolean;
  armorType: ArmorTypeEnum;
  armorAllocation: IAerospaceArmorAllocation;
  hasBombBay: boolean;
  bombCapacity: number;
  equipment: readonly IAerospaceMountedEquipment[];
}

/**
 * Translate the store's keyed arc armor into the record-sheet
 * `{ arc: { current, maximum } }` map. The store keys are the four arc
 * location enum strings (Nose / Left Wing / Right Wing / Aft) which match the
 * extractor's `ARC_ORDER` labels exactly.
 */
function toArmorArcs(
  allocation: IAerospaceArmorAllocation,
): Record<string, { current: number; maximum: number }> {
  const arcs: AerospaceLocation[] = [
    AerospaceLocation.NOSE,
    AerospaceLocation.LEFT_WING,
    AerospaceLocation.RIGHT_WING,
    AerospaceLocation.AFT,
  ];
  const result: Record<string, { current: number; maximum: number }> = {};
  for (const arc of arcs) {
    const points = allocation[arc] ?? 0;
    // Maximum is unknown from the store alone — use the allocated value.
    result[arc] = { current: points, maximum: points };
  }
  return result;
}

/**
 * Build the discriminated aerospace unit object for the record-sheet service.
 *
 * The `unitType` field is the dispatch hint: 'Aerospace' and
 * 'Conventional Fighter' both normalize to the `'aerospace'` kind.
 */
export function buildAerospaceUnitObject(
  input: AerospaceUnitObjectInput,
): IAerospaceRecordSheetUnitInput {
  return {
    ...buildRecordSheetUnitIdentity(input),
    // Dispatch hint — resolves to the 'aerospace' kind for both sub-types.
    unitType: input.unitType,
    structuralIntegrity: input.structuralIntegrity,
    fuelPoints: input.fuelPoints,
    safeThrust: input.safeThrust,
    maxThrust: input.maxThrust,
    heatSinks: {
      type: input.doubleHeatSinks ? 'Double' : 'Single',
      count: input.heatSinks,
    },
    armorType: String(input.armorType),
    armorArcs: toArmorArcs(input.armorAllocation),
    bombBaySlots: input.hasBombBay ? input.bombCapacity : 0,
    equipment: input.equipment.map((eq) => ({
      id: eq.id,
      name: eq.name,
      location: String(eq.location),
    })),
  };
}
