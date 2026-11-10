/**
 * ProtoMech jump-jet mounts: the single owner of the mounts behind the jump MP.
 *
 * MegaMekLab 62bf193 makes a ProtoMech's jump MP the number of its jump-jet mounts:
 *   - the Jump Type combo is Jump Jet, Extended Jump Jet System or UMU
 *     (TestEntity.validJumpJets, TestEntity.java:443-447);
 *   - the type shown is the first jump-jet or UMU mount, else the first combo item
 *     (MovementView.setFromEntity, MovementView.java:216-222);
 *   - changing the jump removes mounts of the type from the end, or adds them at
 *     LOC_BODY until the count fits (PMStructureTab.jumpChanged, :584-624);
 *   - changing the type removes the other types' mounts, then re-creates the current jump
 *     as the new type (jumpTypeChanged :627-637); a UMU keeps original jump MP at 0.
 *
 * The editor offers the jump jet and the Extended Jump Jet System. UMU is read and kept but
 * not edited here: Battle Value has no UMU input yet (RULES.md), so a UMU build would get a
 * wrong BV. A mount made here has the shape the BLK loader gives a source mount (Torso
 * location, Body block), so an edited unit and a loaded one are the same data.
 *
 * Pure: no React or store imports. Ids come from the caller.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';

import {
  PROTO_EXTENDED_JUMP_JET_ID,
  PROTO_JUMP_JET_ID,
  PROTO_UMU_ID,
  isProtoExtendedJumpJet,
  isProtoStandardJumpJet,
  isProtoUmu,
} from './movementRules';

export const PROTO_JUMP_JET_TYPE = {
  STANDARD: PROTO_JUMP_JET_ID,
  EXTENDED: PROTO_EXTENDED_JUMP_JET_ID,
  UMU: PROTO_UMU_ID,
} as const;

export type ProtoJumpJetType =
  (typeof PROTO_JUMP_JET_TYPE)[keyof typeof PROTO_JUMP_JET_TYPE];

/** The types the editor can create (MML's labels). UMU waits on BV support. */
export type ProtoEditableJumpJetType =
  | typeof PROTO_JUMP_JET_TYPE.STANDARD
  | typeof PROTO_JUMP_JET_TYPE.EXTENDED;

export const PROTO_JUMP_JET_OPTIONS: readonly {
  readonly type: ProtoEditableJumpJetType;
  readonly label: string;
}[] = [
  { type: PROTO_JUMP_JET_TYPE.STANDARD, label: 'Jump Jet' },
  { type: PROTO_JUMP_JET_TYPE.EXTENDED, label: 'Extended Jump Jet System' },
];

type Mount = IProtoMechMountedEquipment;

function mountType(mount: Mount): ProtoJumpJetType | undefined {
  if (isProtoStandardJumpJet(mount.equipmentId))
    return PROTO_JUMP_JET_TYPE.STANDARD;
  if (isProtoExtendedJumpJet(mount.equipmentId))
    return PROTO_JUMP_JET_TYPE.EXTENDED;
  if (isProtoUmu(mount.equipmentId)) return PROTO_JUMP_JET_TYPE.UMU;
  return undefined;
}

/** The type of the first jump-jet or UMU mount, or undefined when there is none. */
export function findProtoJumpJetType(
  equipment: readonly Mount[],
): ProtoJumpJetType | undefined {
  for (const mount of equipment) {
    const type = mountType(mount);
    if (type !== undefined) return type;
  }
  return undefined;
}

/** What the Jump Type combo shows: the mounted type, else the first item. */
export function readProtoJumpJetType(
  equipment: readonly Mount[],
): ProtoJumpJetType {
  return findProtoJumpJetType(equipment) ?? PROTO_JUMP_JET_TYPE.STANDARD;
}

function createJumpJetMount(type: ProtoEditableJumpJetType, id: string): Mount {
  return {
    id,
    equipmentId: type,
    name: type,
    location: ProtoMechLocation.TORSO,
    blkSource: { ...readBlkProtoEquipmentEntry(type), blockKey: 'Body' },
  };
}

/**
 * Make the mounts of `type` number `count`: the other editable type's mounts go, then
 * extra mounts of `type` go from the end, or new ones are appended. UMU mounts are left
 * alone. Returns the same array when nothing changes.
 */
export function setProtoJumpMounts(
  equipment: readonly Mount[],
  type: ProtoEditableJumpJetType,
  count: number,
  makeId: () => string,
): Mount[] {
  const other =
    type === PROTO_JUMP_JET_TYPE.STANDARD
      ? PROTO_JUMP_JET_TYPE.EXTENDED
      : PROTO_JUMP_JET_TYPE.STANDARD;
  let next = equipment.filter((mount) => mountType(mount) !== other);
  const own = next.filter((mount) => mountType(mount) === type);
  if (own.length > count) {
    const drop = new Set(own.slice(count));
    next = next.filter((mount) => !drop.has(mount));
  } else {
    for (let i = own.length; i < count; i++) {
      next = [...next, createJumpJetMount(type, makeId())];
    }
  }
  const unchanged =
    next.length === equipment.length &&
    next.every((mount, index) => mount === equipment[index]);
  return unchanged ? (equipment as Mount[]) : next;
}

/**
 * The stored jump changed from `previous` to `next`: make the mounts of the current type
 * match, as MML's spinner does. A jump that did not change touches nothing, so an old unit
 * whose jump has no mounts gains them only on a real edit. A UMU loadout is not edited.
 */
export function reconcileProtoJumpMounts(
  equipment: readonly Mount[],
  previous: number,
  next: number,
  makeId: () => string,
): Mount[] {
  const type = readProtoJumpJetType(equipment);
  if (previous === next || type === PROTO_JUMP_JET_TYPE.UMU) {
    return equipment as Mount[];
  }
  return setProtoJumpMounts(equipment, type, next, makeId);
}
