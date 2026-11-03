/**
 * buildProtoMechUnitObject — protomech store → record-sheet unit object
 *
 * Pure builder mapping the protomech store's fields onto the
 * `IProtoMechRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The `unitType` hint resolves via
 * `dispatchTargetFromUnit` to the `'protomech'` dispatch kind.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IProtoMechRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { IProtoMechArmorAllocation } from '@/stores/protoMechState';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

/** ProtoMech location label set used by the record-sheet extractor. */
type ProtoLoc =
  | 'Head'
  | 'Torso'
  | 'Left Arm'
  | 'Right Arm'
  | 'Legs'
  | 'Main Gun';

/** Store fields the protomech unit-object builder reads. */
export interface ProtoMechUnitObjectInput extends RecordSheetUnitIdentityWithTonnageInput {
  source?: ProtoMechState;
  pointSize: number;
  armorByLocation: IProtoMechArmorAllocation;
  mainGunWeaponId: string | undefined;
  walkMP: number;
  jumpMP: number;
  glidingWings: boolean;
}

/**
 * Translate the store's single keyed armor map into the per-location
 * `{ current, maximum }` map the extractor expects. The store's
 * `ProtoMechLocation` enum string values match the extractor's `ProtoLoc`
 * labels exactly.
 */
function toArmorByLocation(
  allocation: IProtoMechArmorAllocation,
): Partial<Record<ProtoLoc, { current: number; maximum: number }>> {
  const locs: ProtoMechLocation[] = [
    ProtoMechLocation.HEAD,
    ProtoMechLocation.TORSO,
    ProtoMechLocation.LEFT_ARM,
    ProtoMechLocation.RIGHT_ARM,
    ProtoMechLocation.LEGS,
    ProtoMechLocation.MAIN_GUN,
  ];
  const result: Partial<
    Record<ProtoLoc, { current: number; maximum: number }>
  > = {};
  for (const loc of locs) {
    const points = allocation[loc] ?? 0;
    // Maximum is unknown from the store alone — use the allocated value.
    result[loc as ProtoLoc] = { current: points, maximum: points };
  }
  return result;
}

/**
 * Build the discriminated protomech unit object for the record-sheet service.
 *
 * A ProtoMech point shares one chassis design, so every proto in the point
 * carries the same store armor map. The `unitType` hint resolves to the
 * `'protomech'` dispatch kind.
 */
export function buildProtoMechUnitObject(
  input: ProtoMechUnitObjectInput,
): IProtoMechRecordSheetUnitInput {
  const source = input.source;
  const bv = source
    ? calculateBattleValueForUnit({
        unitType: source.unitType,
        editorState: source,
      })
    : undefined;
  if (source && bv?.kind !== 'protomech')
    throw new TypeError('Expected ProtoMech BV');
  const armorByLocation = toArmorByLocation(input.armorByLocation);
  const protos = Array.from({ length: input.pointSize }, (_, i) => ({
    index: i + 1,
    armorByLocation,
  }));

  return {
    ...buildRecordSheetUnitIdentity(input),
    battleValue: bv?.breakdown.final,
    isQuad: source?.chassisType === ProtoChassis.QUAD,
    hasMainGun: source?.hasMainGun,
    equipment: source?.equipment.map(({ id, equipmentId, name, location }) => ({
      id,
      equipmentId,
      name,
      location,
    })),
    // Dispatch hint — resolves to the 'protomech' kind.
    unitType: 'protomech',
    pointSize: input.pointSize,
    protos,
    mainGun: input.mainGunWeaponId,
    walkMP: input.walkMP,
    jumpMP: input.jumpMP,
    isGlider: source
      ? source.chassisType === ProtoChassis.GLIDER
      : input.glidingWings,
  };
}
