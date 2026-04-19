/**
 * ProtoMech combat state — construction + lookup helpers.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/protomech-unit-system/spec.md
 *   #requirement protomech-combat-state
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import {
  createProtoMechCombatState,
  getProtoArmor,
  getProtoStructure,
  protoHasLocation,
} from '../state';

describe('createProtoMechCombatState', () => {
  it('builds a Biped with all five locations + main gun', () => {
    const s = createProtoMechCombatState({
      unitId: 'proto-1',
      chassisType: ProtoChassis.BIPED,
      hasMainGun: true,
      armorByLocation: {
        [ProtoLocation.HEAD]: 1,
        [ProtoLocation.TORSO]: 8,
        [ProtoLocation.LEFT_ARM]: 3,
        [ProtoLocation.RIGHT_ARM]: 3,
        [ProtoLocation.LEGS]: 5,
        [ProtoLocation.MAIN_GUN]: 2,
      },
      structureByLocation: {
        [ProtoLocation.HEAD]: 1,
        [ProtoLocation.TORSO]: 4,
        [ProtoLocation.LEFT_ARM]: 2,
        [ProtoLocation.RIGHT_ARM]: 2,
        [ProtoLocation.LEGS]: 3,
        [ProtoLocation.MAIN_GUN]: 1,
      },
    });
    expect(s.unitId).toBe('proto-1');
    expect(s.chassisType).toBe(ProtoChassis.BIPED);
    expect(s.hasMainGun).toBe(true);
    expect(s.engineHits).toBe(0);
    expect(s.mpPenalty).toBe(0);
    expect(s.destroyed).toBe(false);
    expect(s.immobilized).toBe(false);
    expect(s.mainGunRemoved).toBe(false);
    expect(s.pilotWounded).toBe(false);
    expect(s.altitude).toBeUndefined();
  });

  it('builds a Quad with FrontLegs + RearLegs, no arms', () => {
    const s = createProtoMechCombatState({
      unitId: 'proto-q',
      chassisType: ProtoChassis.QUAD,
      hasMainGun: false,
      armorByLocation: {
        [ProtoLocation.HEAD]: 1,
        [ProtoLocation.TORSO]: 6,
        [ProtoLocation.FRONT_LEGS]: 4,
        [ProtoLocation.REAR_LEGS]: 4,
      },
      structureByLocation: {
        [ProtoLocation.HEAD]: 1,
        [ProtoLocation.TORSO]: 3,
        [ProtoLocation.FRONT_LEGS]: 2,
        [ProtoLocation.REAR_LEGS]: 2,
      },
    });
    expect(protoHasLocation(s, ProtoLocation.FRONT_LEGS)).toBe(true);
    expect(protoHasLocation(s, ProtoLocation.REAR_LEGS)).toBe(true);
    expect(protoHasLocation(s, ProtoLocation.LEFT_ARM)).toBe(false);
    expect(protoHasLocation(s, ProtoLocation.LEGS)).toBe(false);
  });

  it('Glider chassis initializes altitude (defaults 0)', () => {
    const s = createProtoMechCombatState({
      unitId: 'glider-1',
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
      armorByLocation: { [ProtoLocation.TORSO]: 4 },
      structureByLocation: { [ProtoLocation.TORSO]: 2 },
    });
    expect(s.altitude).toBe(0);
  });

  it('Glider chassis respects explicit altitude', () => {
    const s = createProtoMechCombatState({
      unitId: 'glider-1',
      chassisType: ProtoChassis.GLIDER,
      hasMainGun: false,
      armorByLocation: { [ProtoLocation.TORSO]: 4 },
      structureByLocation: { [ProtoLocation.TORSO]: 2 },
      altitude: 3,
    });
    expect(s.altitude).toBe(3);
  });

  it('non-Glider chassis leaves altitude undefined regardless of input', () => {
    const s = createProtoMechCombatState({
      unitId: 'biped-1',
      chassisType: ProtoChassis.BIPED,
      hasMainGun: false,
      armorByLocation: { [ProtoLocation.TORSO]: 4 },
      structureByLocation: { [ProtoLocation.TORSO]: 2 },
      altitude: 5,
    });
    expect(s.altitude).toBeUndefined();
  });
});

describe('getProtoArmor / getProtoStructure / protoHasLocation', () => {
  const s = createProtoMechCombatState({
    unitId: 'proto-1',
    chassisType: ProtoChassis.BIPED,
    hasMainGun: true,
    armorByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 8,
    },
    structureByLocation: {
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 4,
    },
  });

  it('returns value for present locations', () => {
    expect(getProtoArmor(s, ProtoLocation.HEAD)).toBe(1);
    expect(getProtoArmor(s, ProtoLocation.TORSO)).toBe(8);
    expect(getProtoStructure(s, ProtoLocation.TORSO)).toBe(4);
  });

  it('returns 0 for absent locations', () => {
    expect(getProtoArmor(s, ProtoLocation.MAIN_GUN)).toBe(0);
    expect(getProtoStructure(s, ProtoLocation.LEGS)).toBe(0);
  });

  it('protoHasLocation reports presence correctly', () => {
    expect(protoHasLocation(s, ProtoLocation.HEAD)).toBe(true);
    expect(protoHasLocation(s, ProtoLocation.LEGS)).toBe(false);
  });
});
