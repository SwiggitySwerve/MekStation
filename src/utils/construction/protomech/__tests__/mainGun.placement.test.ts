/**
 * Main Gun and arm placement rules, from the pinned MegaMek verifier.
 *
 * Pin: MegaMek 48fcb2f64, TestProtoMek.java.
 *   maxSlotsByLocation (606-629): arms 1 slot (0 on a quad), Main Gun 1 slot
 *   (2 for a quad that is also ultraheavy).
 *   maxWeightByLocation (651-678): arms 0.5 t (1.0 t ultraheavy, 0 on a quad),
 *   Main Gun unlimited.
 *   requiresSlot (572-585): ammunition, MASC, UMU, jump jets and the EI
 *   interface take no slot.
 *   hasIllegalEquipmentCombinations (296-380): a weapon without F_PROTO_WEAPON
 *   is illegal; the slot and weight limits apply per location.
 * Ultraheavy means above 9 t (MAX_STD_TONNAGE, line 65).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import {
  ProtoChassis,
  ProtoLocation as P,
} from '@/types/unit/ProtoMechInterfaces';
import {
  getProtoLocationSlotLimit,
  getProtoLocationWeightLimit,
  validateProtoMainGun,
} from '@/utils/construction/protomech';

type Placement = { equipmentId: string; location: P };

function check(
  tonnage: number,
  chassisType: ProtoChassis,
  equipmentPlacements: Placement[],
) {
  return validateProtoMainGun({ tonnage, chassisType, equipmentPlacements });
}
const messages = (r: ReturnType<typeof check>) =>
  r.findings.map((f) => f.message);

const MICRO = 'CLERMicroLaser'; // 0.25 t
const SMALL = 'CLERSmallLaser'; // 0.5 t
const MEDIUM = 'CLERMediumLaser'; // 1.0 t
const PULSE = 'CLMediumPulseLaser'; // 2.0 t

describe('location limits (TestProtoMek.java:606-678)', () => {
  it.each([
    // [location, quad, ultra, slots, weight]
    [P.MAIN_GUN, false, false, 1, Infinity],
    [P.MAIN_GUN, true, false, 1, Infinity],
    [P.MAIN_GUN, false, true, 1, Infinity],
    [P.MAIN_GUN, true, true, 2, Infinity],
    [P.LEFT_ARM, false, false, 1, 0.5],
    [P.RIGHT_ARM, false, true, 1, 1.0],
    [P.LEFT_ARM, true, false, 0, 0],
    [P.RIGHT_ARM, true, true, 0, 0],
  ])('%s quad=%s ultra=%s', (location, quad, ultra, slots, weight) => {
    expect(getProtoLocationSlotLimit(location, quad, ultra)).toBe(slots);
    expect(getProtoLocationWeightLimit(location, quad, ultra)).toBe(weight);
  });
});

describe('Main Gun', () => {
  it('accepts one weapon, whatever it is and however heavy', () => {
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: PULSE, location: P.MAIN_GUN },
      ]).passed,
    ).toBe(true);
  });

  it('accepts an enabled Main Gun with nothing in it, as Java does', () => {
    expect(check(5, ProtoChassis.BIPED, []).passed).toBe(true);
  });

  it('no longer rejects weapons that were missing from the hand-written list', () => {
    // CLSRM2 and CLERMicroLaser were never in the nine-id approved list.
    for (const id of ['CLSRM2', MICRO, 'CLAPGaussRifle', 'CLProtoMechAC2']) {
      expect(
        check(5, ProtoChassis.BIPED, [
          { equipmentId: id, location: P.MAIN_GUN },
        ]).passed,
      ).toBe(true);
    }
  });

  it('rejects a second weapon on a biped', () => {
    const result = check(5, ProtoChassis.BIPED, [
      { equipmentId: MICRO, location: P.MAIN_GUN },
      { equipmentId: SMALL, location: P.MAIN_GUN },
    ]);
    expect(result.passed).toBe(false);
    expect(messages(result)).toEqual([
      'Exceeds 1 slot limit in Main Gun (2 mounted).',
    ]);
  });

  it('allows two on a quad ultraheavy and rejects a third', () => {
    const two: Placement[] = [
      { equipmentId: MICRO, location: P.MAIN_GUN },
      { equipmentId: SMALL, location: P.MAIN_GUN },
    ];
    expect(check(10, ProtoChassis.QUAD, two).passed).toBe(true);
    expect(
      check(10, ProtoChassis.QUAD, [
        ...two,
        { equipmentId: MEDIUM, location: P.MAIN_GUN },
      ]).passed,
    ).toBe(false);
  });

  it('does not allow two on a quad at 9 t (not ultraheavy) or on a biped ultraheavy', () => {
    const two: Placement[] = [
      { equipmentId: MICRO, location: P.MAIN_GUN },
      { equipmentId: SMALL, location: P.MAIN_GUN },
    ];
    expect(check(9, ProtoChassis.QUAD, two).passed).toBe(false);
    expect(check(10, ProtoChassis.ULTRAHEAVY, two).passed).toBe(false);
  });

  it('does not count ammunition, jump jets or the EI interface as slots', () => {
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: MICRO, location: P.MAIN_GUN },
        { equipmentId: 'Clan Ammo SRM-2 (10)', location: P.MAIN_GUN },
        { equipmentId: 'ProtoMechJumpJet', location: P.MAIN_GUN },
        { equipmentId: 'EIInterface', location: P.MAIN_GUN },
        { equipmentId: 'CLMyomerBooster', location: P.MAIN_GUN },
      ]).passed,
    ).toBe(true);
  });
});

describe('arms', () => {
  it('accepts a weapon at exactly the limit (0.5 t at 9 t)', () => {
    expect(
      check(9, ProtoChassis.BIPED, [
        { equipmentId: SMALL, location: P.LEFT_ARM },
      ]).passed,
    ).toBe(true);
  });

  it('rejects a weapon over the limit, in kilograms as Java reports it', () => {
    const result = check(9, ProtoChassis.BIPED, [
      { equipmentId: MEDIUM, location: P.LEFT_ARM },
    ]);
    expect(messages(result)).toEqual(['Exceeds 500 kg limit in Left Arm.']);
  });

  it('raises the weight limit to 1.0 t just above 9 t', () => {
    const arm: Placement[] = [{ equipmentId: MEDIUM, location: P.RIGHT_ARM }];
    expect(check(9, ProtoChassis.BIPED, arm).passed).toBe(false);
    expect(check(10, ProtoChassis.ULTRAHEAVY, arm).passed).toBe(true);
    expect(
      check(10, ProtoChassis.ULTRAHEAVY, [
        { equipmentId: PULSE, location: P.RIGHT_ARM },
      ]).passed,
    ).toBe(false);
  });

  it('rejects a second weapon in one arm even when both are light', () => {
    const result = check(5, ProtoChassis.BIPED, [
      { equipmentId: MICRO, location: P.LEFT_ARM },
      { equipmentId: MICRO, location: P.LEFT_ARM },
    ]);
    expect(messages(result)).toEqual([
      'Exceeds 1 slot limit in Left Arm (2 mounted).',
    ]);
  });

  it('counts each arm separately', () => {
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: MICRO, location: P.LEFT_ARM },
        { equipmentId: MICRO, location: P.RIGHT_ARM },
      ]).passed,
    ).toBe(true);
  });

  it('gives a quad no arm capacity at all', () => {
    const result = check(5, ProtoChassis.QUAD, [
      { equipmentId: MICRO, location: P.LEFT_ARM },
    ]);
    expect(messages(result)).toContain(
      'Exceeds 0 slot limit in Left Arm (1 mounted).',
    );
  });

  it('reports the pinned weapon exclusion as well as the arm weight limit', () => {
    // Java excludes this weapon from ProtoMechs independently of its weight.
    const arm = check(5, ProtoChassis.BIPED, [
      { equipmentId: 'CLGaussRifle', location: P.LEFT_ARM },
    ]);
    expect(messages(arm)).toEqual([
      '"CLGaussRifle" is not a legal ProtoMech weapon.',
      'Exceeds 500 kg limit in Left Arm.',
    ]);
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: 'CLGaussRifle', location: P.MAIN_GUN },
      ]).passed,
    ).toBe(false);
  });

  it('does not invent a weight for equipment whose weight depends on the unit', () => {
    // The catalog marks the magnetic clamp "Variable weight"; only its slot counts.
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: 'ProtoMagneticClamp', location: P.LEFT_ARM },
      ]).passed,
    ).toBe(true);
  });
});

describe('weapon legality (F_PROTO_WEAPON through the catalog)', () => {
  it('rejects a weapon the catalog says is not for ProtoMechs, in any location', () => {
    const result = check(5, ProtoChassis.BIPED, [
      { equipmentId: 'autocannon-5-primitive-registry', location: P.TORSO },
    ]);
    expect(messages(result)).toEqual([
      '"autocannon-5-primitive-registry" is not a legal ProtoMech weapon.',
    ]);
  });

  it('accepts a weapon the catalog flags for ProtoMechs', () => {
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: 'clheavyflamer-registry', location: P.TORSO },
      ]).passed,
    ).toBe(true);
  });

  it('does not reject a weapon the catalog does not describe', () => {
    // Most plain catalog entries carry no allowedUnitTypes. Java accepts every
    // canonical unit's weapons, so an absent flag is unknown, never illegal.
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: 'CLSRM2', location: P.TORSO },
      ]).passed,
    ).toBe(true);
    expect(
      check(5, ProtoChassis.BIPED, [
        { equipmentId: 'not-in-the-catalog', location: P.TORSO },
      ]).passed,
    ).toBe(true);
  });
});
