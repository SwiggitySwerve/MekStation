/**
 * Canonical ProtoMech BV 2.0 fixture tests.
 *
 * @spec openspec/changes/add-protomech-battle-value/tasks.md section 9.2
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

import { armor, buildProto, mount } from './protoMechBV.test.helpers';

// =============================================================================
// Canonical proto fixtures (5 required by section 9.2)
// =============================================================================

describe('calculateProtoMechBV - canonical proto fixtures', () => {
  /** Minotaur - Heavy biped, 9 t, walk 4, no jump */
  const minotaur = buildProto({
    id: 'minotaur',
    chassis: 'Minotaur',
    model: 'Prime',
    tonnage: 9,
    chassisType: ProtoChassis.BIPED,
    weightClass: ProtoWeightClass.HEAVY,
    walkMP: 4,
    runMP: 5,
    jumpMP: 0,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 3,
      [ProtoLocation.TORSO]: 15,
      [ProtoLocation.LEFT_ARM]: 6,
      [ProtoLocation.RIGHT_ARM]: 6,
      [ProtoLocation.LEGS]: 10,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 9,
      [ProtoLocation.LEFT_ARM]: 3,
      [ProtoLocation.RIGHT_ARM]: 3,
      [ProtoLocation.LEGS]: 6,
    }),
  });

  /** Satyr - Light biped, 4 t, walk 5 */
  const satyr = buildProto({
    id: 'satyr',
    chassis: 'Satyr',
    tonnage: 4,
    chassisType: ProtoChassis.BIPED,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 5,
    runMP: 6,
    jumpMP: 0,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 8,
      [ProtoLocation.LEFT_ARM]: 3,
      [ProtoLocation.RIGHT_ARM]: 3,
      [ProtoLocation.LEGS]: 4,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEFT_ARM]: 2,
      [ProtoLocation.RIGHT_ARM]: 2,
      [ProtoLocation.LEGS]: 3,
    }),
  });

  /** Sprite - Light glider, 2 t, walk 6 jump 4 (wings fold into jumpMP) */
  const sprite = buildProto({
    id: 'sprite',
    chassis: 'Sprite',
    tonnage: 2,
    chassisType: ProtoChassis.GLIDER,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 6,
    runMP: 7,
    jumpMP: 4,
    glidingWings: true,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEGS]: 2,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.LEGS]: 1,
    }),
  });

  /** Ares - Ultraheavy biped, 13 t, walk 3 */
  const ares = buildProto({
    id: 'ares',
    chassis: 'Ares',
    tonnage: 13,
    chassisType: ProtoChassis.ULTRAHEAVY,
    weightClass: ProtoWeightClass.ULTRAHEAVY,
    walkMP: 3,
    runMP: 4,
    jumpMP: 0,
    hasMainGun: true,
    mainGunWeaponId: 'clan-er-ppc',
    equipment: [mount('clan-er-ppc', ProtoLocation.MAIN_GUN, true)],
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 3,
      [ProtoLocation.TORSO]: 20,
      [ProtoLocation.LEFT_ARM]: 8,
      [ProtoLocation.RIGHT_ARM]: 8,
      [ProtoLocation.LEGS]: 15,
      [ProtoLocation.MAIN_GUN]: 5,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 13,
      [ProtoLocation.LEFT_ARM]: 4,
      [ProtoLocation.RIGHT_ARM]: 4,
      [ProtoLocation.LEGS]: 8,
      [ProtoLocation.MAIN_GUN]: 1,
    }),
  });

  /** Siren - Light glider, 3 t, walk 8 jump 6 */
  const siren = buildProto({
    id: 'siren',
    chassis: 'Siren',
    tonnage: 3,
    chassisType: ProtoChassis.GLIDER,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 8,
    runMP: 9,
    jumpMP: 6,
    glidingWings: true,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 6,
      [ProtoLocation.LEGS]: 3,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.LEGS]: 2,
    }),
  });

  it.each([
    ['Minotaur', minotaur, ProtoChassis.BIPED, 1.0],
    ['Satyr', satyr, ProtoChassis.BIPED, 1.0],
    ['Sprite', sprite, ProtoChassis.GLIDER, 0.9],
    ['Ares', ares, ProtoChassis.ULTRAHEAVY, 1.15],
    ['Siren', siren, ProtoChassis.GLIDER, 0.9],
  ])(
    '%s computes a positive, finite final BV with expected chassis multiplier',
    (_name, unit, chassis, multiplier) => {
      const bv = calculateProtoMechBV(unit);
      expect(bv.chassisMultiplier).toBe(multiplier);
      expect(Number.isFinite(bv.final)).toBe(true);
      expect(bv.final).toBeGreaterThan(0);
      expect(unit.chassisType).toBe(chassis);
    },
  );

  it('Ares main-gun PPC contributes weapon BV (non-zero offensive weapon term)', () => {
    const bv = calculateProtoMechBV(ares);
    expect(bv.weaponBV).toBeGreaterThan(0);
  });

  it('Sprite (Glider) final BV reflects 0.9 multiplier vs an equivalent biped', () => {
    const bipedSprite = buildProto({
      ...sprite,
      chassisType: ProtoChassis.BIPED,
    });
    const bipedBV = calculateProtoMechBV(bipedSprite);
    const gliderBV = calculateProtoMechBV(sprite);
    expect(gliderBV.final).toBeLessThanOrEqual(bipedBV.final);
  });
});
