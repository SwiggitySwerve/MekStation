/**
 * The ProtoMech jump-jet mounts behind the jump spinner (4.1-b3c).
 *
 * MegaMekLab 62bf193 makes the jump MP the number of jump-jet mounts: the Jump Type combo
 * is Jump Jet, Extended Jump Jet System or UMU (TestEntity.java:443-447); the shown type is
 * the first jump or UMU mount, else Jump Jet (MovementView.java:216-222); the spinner
 * removes mounts from the end and adds them at LOC_BODY (PMStructureTab.jumpChanged
 * :584-624); a type change removes the other types' mounts (jumpTypeChanged :627-637).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import type { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import {
  PROTO_JUMP_JET_TYPE,
  findProtoJumpJetType,
  readProtoJumpJetType,
  reconcileProtoJumpMounts,
  setProtoJumpMounts,
} from '../jumpJets';

const STD = PROTO_JUMP_JET_TYPE.STANDARD;
const XJJ = PROTO_JUMP_JET_TYPE.EXTENDED;
const UMU = PROTO_JUMP_JET_TYPE.UMU;

const mount = (
  id: string,
  equipmentId: string,
): IProtoMechMountedEquipment => ({
  id,
  equipmentId,
  name: equipmentId,
  location: ProtoMechLocation.TORSO,
});

let next = 0;
const makeId = () => `new-${++next}`;
beforeEach(() => {
  next = 0;
});

describe('the jump-jet type of a loadout', () => {
  it('is the first jump-jet or UMU mount, else the standard jet', () => {
    expect(readProtoJumpJetType([])).toBe(STD);
    expect(findProtoJumpJetType([])).toBeUndefined();
    expect(
      readProtoJumpJetType([mount('a', 'CLERMediumLaser'), mount('b', XJJ)]),
    ).toBe(XJJ);
    expect(readProtoJumpJetType([mount('a', UMU), mount('b', STD)])).toBe(UMU);
  });

  it('matches BLK spellings of the ids', () => {
    expect(readProtoJumpJetType([mount('a', 'extended jump jet system')])).toBe(
      XJJ,
    );
    expect(readProtoJumpJetType([mount('a', 'ProtoMech Jump Jet')])).toBe(STD);
  });
});

describe('setProtoJumpMounts', () => {
  const laser = mount('laser', 'CLERMediumLaser');

  it('adds mounts at the end, as the loader shapes them (Body block, Torso location)', () => {
    const result = setProtoJumpMounts([laser], STD, 2, makeId);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(laser);
    expect(result.slice(1)).toEqual([
      expect.objectContaining({
        id: 'new-1',
        equipmentId: STD,
        name: STD,
        location: ProtoMechLocation.TORSO,
        blkSource: expect.objectContaining({
          lookupName: STD,
          blockKey: 'Body',
          errors: [],
        }),
      }),
      expect.objectContaining({ id: 'new-2', equipmentId: STD }),
    ]);
  });

  it('removes mounts from the end of the type', () => {
    const jets = [mount('j1', STD), mount('j2', STD), mount('j3', STD)];
    const result = setProtoJumpMounts(
      [jets[0], laser, jets[1], jets[2]],
      STD,
      1,
      makeId,
    );
    expect(result.map((m) => m.id)).toEqual(['j1', 'laser']);
  });

  it('removes the other editable type before creating the chosen one', () => {
    const result = setProtoJumpMounts(
      [mount('x1', XJJ), laser, mount('x2', XJJ)],
      STD,
      2,
      makeId,
    );
    expect(result.map((m) => m.equipmentId)).toEqual([
      'CLERMediumLaser',
      STD,
      STD,
    ]);
  });

  it('removes every mount of the type at a count of 0', () => {
    expect(
      setProtoJumpMounts([mount('j1', STD), laser], STD, 0, makeId),
    ).toEqual([laser]);
  });

  it('returns the same array when nothing changes', () => {
    const equipment = [mount('j1', STD), mount('j2', STD), laser];
    expect(setProtoJumpMounts(equipment, STD, 2, makeId)).toBe(equipment);
    expect(setProtoJumpMounts([laser], STD, 0, makeId)).toEqual([laser]);
  });

  it('leaves UMU mounts alone', () => {
    const umu = mount('u1', UMU);
    expect(setProtoJumpMounts([umu], STD, 1, makeId)).toEqual([
      umu,
      expect.objectContaining({ equipmentId: STD }),
    ]);
  });
});

describe('reconcileProtoJumpMounts (the stored jump changed)', () => {
  it('is a no-op while the stored jump is unchanged, even with no mounts (old units)', () => {
    const equipment = [mount('laser', 'CLERMediumLaser')];
    expect(reconcileProtoJumpMounts(equipment, 3, 3, makeId)).toBe(equipment);
  });

  it('keeps the current type and makes the mounts match the new jump', () => {
    const equipment = [mount('x1', XJJ), mount('x2', XJJ), mount('x3', XJJ)];
    expect(
      reconcileProtoJumpMounts(equipment, 3, 2, makeId).map((m) => m.id),
    ).toEqual(['x1', 'x2']);
    expect(
      reconcileProtoJumpMounts([], 3, 2, makeId).map((m) => m.equipmentId),
    ).toEqual([STD, STD]);
  });

  it('does not touch a UMU loadout', () => {
    const equipment = [mount('u1', UMU)];
    expect(reconcileProtoJumpMounts(equipment, 1, 0, makeId)).toBe(equipment);
  });
});
