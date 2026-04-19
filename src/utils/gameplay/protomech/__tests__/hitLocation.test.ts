/**
 * ProtoMech hit-location tests — exhaustive direction × roll coverage.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §3
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import {
  PROTO_FRONT_HIT_TABLE,
  PROTO_REAR_HIT_TABLE,
  PROTO_SIDE_HIT_TABLE_LEFT,
  PROTO_SIDE_HIT_TABLE_RIGHT,
  ProtoAttackDirection,
  ProtoHitSlot,
  determineProtoHitLocation,
  determineProtoHitLocationFromRoll,
  getProtoHitLocationTable,
  isProtoTACRoll,
  mapSlotToLocation,
} from '../hitLocation';

describe('PROTO_FRONT_HIT_TABLE', () => {
  const expected: Array<[number, ProtoHitSlot]> = [
    [2, 'torso'],
    [3, 'right_arm'],
    [4, 'right_arm'],
    [5, 'torso'],
    [6, 'torso'],
    [7, 'torso'],
    [8, 'left_arm'],
    [9, 'left_arm'],
    [10, 'legs'],
    [11, 'main_gun'],
    [12, 'head'],
  ];
  it.each(expected)('roll %i → %s', (roll, slot) => {
    expect(PROTO_FRONT_HIT_TABLE[roll]).toBe(slot);
  });
});

describe('PROTO_SIDE_HIT_TABLE_LEFT', () => {
  const expected: Array<[number, ProtoHitSlot]> = [
    [2, 'torso'],
    [3, 'legs'],
    [4, 'legs'],
    [5, 'legs'],
    [6, 'left_arm'],
    [7, 'left_arm'],
    [8, 'torso'],
    [9, 'torso'],
    [10, 'torso'],
    [11, 'main_gun'],
    [12, 'head'],
  ];
  it.each(expected)('roll %i → %s', (roll, slot) => {
    expect(PROTO_SIDE_HIT_TABLE_LEFT[roll]).toBe(slot);
  });
});

describe('PROTO_SIDE_HIT_TABLE_RIGHT', () => {
  it('roll 6 → right_arm (mirrors left table)', () => {
    expect(PROTO_SIDE_HIT_TABLE_RIGHT[6]).toBe('right_arm');
  });
  it('roll 7 → right_arm', () => {
    expect(PROTO_SIDE_HIT_TABLE_RIGHT[7]).toBe('right_arm');
  });
  it('rolls 3-5 still go to legs', () => {
    expect(PROTO_SIDE_HIT_TABLE_RIGHT[3]).toBe('legs');
    expect(PROTO_SIDE_HIT_TABLE_RIGHT[4]).toBe('legs');
    expect(PROTO_SIDE_HIT_TABLE_RIGHT[5]).toBe('legs');
  });
});

describe('PROTO_REAR_HIT_TABLE', () => {
  const expected: Array<[number, ProtoHitSlot]> = [
    [2, 'torso'],
    [3, 'legs'],
    [4, 'legs'],
    [5, 'legs'],
    [6, 'torso'],
    [7, 'torso'],
    [8, 'torso'],
    [9, 'right_arm'],
    [10, 'left_arm'],
    [11, 'main_gun'],
    [12, 'head'],
  ];
  it.each(expected)('roll %i → %s', (roll, slot) => {
    expect(PROTO_REAR_HIT_TABLE[roll]).toBe(slot);
  });
});

describe('getProtoHitLocationTable', () => {
  it("returns the Front table for 'front'", () => {
    expect(getProtoHitLocationTable('front')).toBe(PROTO_FRONT_HIT_TABLE);
  });
  it("returns the Side-Left table for 'left'", () => {
    expect(getProtoHitLocationTable('left')).toBe(PROTO_SIDE_HIT_TABLE_LEFT);
  });
  it("returns the Side-Right table for 'right'", () => {
    expect(getProtoHitLocationTable('right')).toBe(PROTO_SIDE_HIT_TABLE_RIGHT);
  });
  it("returns the Rear table for 'rear'", () => {
    expect(getProtoHitLocationTable('rear')).toBe(PROTO_REAR_HIT_TABLE);
  });
});

describe('isProtoTACRoll', () => {
  it('true only on natural 2 (sum of 1+1)', () => {
    expect(isProtoTACRoll(2)).toBe(true);
    expect(isProtoTACRoll(12)).toBe(false);
    expect(isProtoTACRoll(7)).toBe(false);
  });
});

describe('mapSlotToLocation — Biped/Glider/Ultraheavy', () => {
  it.each([
    ['head', ProtoLocation.HEAD],
    ['torso', ProtoLocation.TORSO],
    ['legs', ProtoLocation.LEGS],
    ['left_arm', ProtoLocation.LEFT_ARM],
    ['right_arm', ProtoLocation.RIGHT_ARM],
  ] as Array<[ProtoHitSlot, ProtoLocation]>)(
    'Biped %s → %s',
    (slot, location) => {
      expect(mapSlotToLocation(slot, ProtoChassis.BIPED, true)).toBe(location);
    },
  );

  it('main_gun → MAIN_GUN when hasMainGun = true', () => {
    expect(mapSlotToLocation('main_gun', ProtoChassis.BIPED, true)).toBe(
      ProtoLocation.MAIN_GUN,
    );
  });

  it('main_gun → TORSO when hasMainGun = false', () => {
    expect(mapSlotToLocation('main_gun', ProtoChassis.BIPED, false)).toBe(
      ProtoLocation.TORSO,
    );
  });

  it('Glider chassis uses same mapping as Biped', () => {
    expect(mapSlotToLocation('legs', ProtoChassis.GLIDER, false)).toBe(
      ProtoLocation.LEGS,
    );
  });

  it('Ultraheavy chassis uses same mapping as Biped', () => {
    expect(mapSlotToLocation('left_arm', ProtoChassis.ULTRAHEAVY, false)).toBe(
      ProtoLocation.LEFT_ARM,
    );
  });
});

describe('mapSlotToLocation — Quad remap', () => {
  it('legs → REAR_LEGS for Quad', () => {
    expect(mapSlotToLocation('legs', ProtoChassis.QUAD, false)).toBe(
      ProtoLocation.REAR_LEGS,
    );
  });
  it('left_arm → FRONT_LEGS for Quad', () => {
    expect(mapSlotToLocation('left_arm', ProtoChassis.QUAD, false)).toBe(
      ProtoLocation.FRONT_LEGS,
    );
  });
  it('right_arm → FRONT_LEGS for Quad', () => {
    expect(mapSlotToLocation('right_arm', ProtoChassis.QUAD, false)).toBe(
      ProtoLocation.FRONT_LEGS,
    );
  });
  it('head/torso stay Head/Torso for Quad', () => {
    expect(mapSlotToLocation('head', ProtoChassis.QUAD, false)).toBe(
      ProtoLocation.HEAD,
    );
    expect(mapSlotToLocation('torso', ProtoChassis.QUAD, false)).toBe(
      ProtoLocation.TORSO,
    );
  });
});

describe('determineProtoHitLocationFromRoll', () => {
  it('resolves front 7 → TORSO (Biped)', () => {
    const r = determineProtoHitLocationFromRoll('front', [3, 4], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    expect(r.roll).toBe(7);
    expect(r.slot).toBe('torso');
    expect(r.location).toBe(ProtoLocation.TORSO);
    expect(r.isTAC).toBe(false);
  });

  it('natural 2 on front → TORSO + isTAC', () => {
    const r = determineProtoHitLocationFromRoll('front', [1, 1], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    expect(r.slot).toBe('torso');
    expect(r.isTAC).toBe(true);
  });

  it('front 11 → MAIN_GUN when hasMainGun', () => {
    const r = determineProtoHitLocationFromRoll('front', [5, 6], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
    });
    expect(r.location).toBe(ProtoLocation.MAIN_GUN);
  });

  it('front 11 → TORSO when no main gun', () => {
    const r = determineProtoHitLocationFromRoll('front', [5, 6], {
      chassisType: ProtoChassis.BIPED,
      hasMainGun: false,
    });
    expect(r.location).toBe(ProtoLocation.TORSO);
  });

  it('quad front arm roll → FRONT_LEGS', () => {
    const r = determineProtoHitLocationFromRoll(
      'front',
      [1, 2], // roll 3 → right_arm
      { chassisType: ProtoChassis.QUAD, hasMainGun: false },
    );
    expect(r.slot).toBe('right_arm');
    expect(r.location).toBe(ProtoLocation.FRONT_LEGS);
  });
});

describe('determineProtoHitLocation — uses injected dice roller', () => {
  it('honours diceRoller argument', () => {
    const rollSequence = [4, 3];
    const roller = () => rollSequence.shift() ?? 1;
    const r = determineProtoHitLocation(
      'front' as ProtoAttackDirection,
      { chassisType: ProtoChassis.BIPED, hasMainGun: true },
      roller,
    );
    expect(r.dice).toEqual([4, 3]);
    expect(r.roll).toBe(7);
    expect(r.slot).toBe('torso');
  });
});
