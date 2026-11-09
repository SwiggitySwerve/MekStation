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
import type {
  AerospaceState,
  IAerospaceArmorAllocation,
} from '@/stores/aerospaceState';
import type { IAerospaceMountedEquipment } from '@/types/unit/AerospaceInterfaces';

import { getAerospaceEquipmentLocationAbbr } from '@/services/printing/recordsheet/equipmentLocations';
import { aerospaceContractArc } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { getAerospaceArcs } from '@/types/construction/aerospaceArcLabels';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { aerospaceBVUnitFromState } from '@/utils/construction/aerospace/aerospaceBVUnitAdapter';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the aerospace unit-object builder reads. */
export interface AerospaceUnitObjectInput extends RecordSheetUnitIdentityWithTonnageInput {
  unitType:
    | UnitType.AEROSPACE
    | UnitType.CONVENTIONAL_FIGHTER
    | UnitType.SMALL_CRAFT;
  isFixedWingSupport?: boolean;
  barRating?: number;
  motionType?: AerospaceMotionType;
  structuralIntegrity: number;
  fuelPoints: number;
  safeThrust: number;
  maxThrust: number;
  heatSinks: number;
  doubleHeatSinks: boolean;
  armorType: ArmorTypeEnum;
  armorTypeByArc?: AerospaceState['armorTypeByArc'];
  armorAllocation: IAerospaceArmorAllocation;
  hasBombBay: boolean;
  bombCapacity: number;
  equipment: readonly IAerospaceMountedEquipment[];
}

/**
 * Translate the store's keyed arc armor into the record-sheet
 * `{ arc: { current } }` map, keyed by the label the sheet prints for this
 * hull (small craft: Left Side/Right Side; fighters: wings). The store keys
 * stay the persisted `AerospaceLocation` values.
 *
 * No `maximum`: MML `UnitUtil.getMaxArmor` has no per-arc cap for aerospace,
 * so echoing `current` would print a fabricated cap on the skeleton fallback.
 */
function toArmorArcs(
  allocation: IAerospaceArmorAllocation,
  smallCraft: boolean,
): Record<string, { current: number }> {
  const result: Record<string, { current: number }> = {};
  for (const { arc, label } of getAerospaceArcs(smallCraft))
    result[label] = { current: allocation[arc] ?? 0 };
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
  const bv = calculateBattleValueForUnit(aerospaceBVUnitFromState(input));
  if (!bv || bv.kind !== 'aerospace')
    throw new TypeError('Expected aerospace BV');
  return {
    ...buildRecordSheetUnitIdentity(input),
    battleValue: bv.breakdown.final,
    isConventional: input.unitType === UnitType.CONVENTIONAL_FIGHTER,
    smallCraftMotionType:
      input.unitType === UnitType.SMALL_CRAFT
        ? (input.motionType ?? AerospaceMotionType.AERODYNE)
        : undefined,
    // Small craft share the aerospace extractor, with explicit hull context.
    unitType:
      input.unitType === UnitType.SMALL_CRAFT
        ? UnitType.AEROSPACE
        : input.unitType,
    structuralIntegrity: input.structuralIntegrity,
    fuelPoints: input.fuelPoints,
    safeThrust: input.safeThrust,
    maxThrust: input.maxThrust,
    heatSinks: {
      type: input.doubleHeatSinks ? 'Double' : 'Single',
      count: input.heatSinks,
    },
    armorType: String(input.armorType),
    // MML PrintEntity.drawArmor prints "BAR: n" for support craft with BAR armor.
    barRating: input.isFixedWingSupport ? input.barRating : undefined,
    armorArcs: toArmorArcs(
      input.armorAllocation,
      input.unitType === UnitType.SMALL_CRAFT,
    ),
    bombBaySlots: input.hasBombBay ? input.bombCapacity : 0,
    equipment: input.equipment.map((eq) => ({
      id: eq.id,
      equipmentId: eq.equipmentId,
      name: eq.name,
      location: String(eq.location),
      locationAbbr: getAerospaceEquipmentLocationAbbr(
        aerospaceContractArc(
          eq.location,
          input.unitType === UnitType.SMALL_CRAFT,
        ),
      ),
    })),
  };
}
