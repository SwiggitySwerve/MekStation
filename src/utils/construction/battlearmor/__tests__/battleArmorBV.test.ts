/**
 * Battle Armor BV unit tests.
 *
 * Covers the formula tables, defensive/offensive component math, squad scaling,
 * pilot multiplier application, and public breakdown shape. Canonical archetype
 * scenarios live in battleArmorBV.archetypes.test.ts.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';

import {
  calculateBADefensiveBV,
  calculateBAOffensiveBV,
  calculateBattleArmorBV,
  getBAArmorBVMultiplier,
  getBAManipulatorMeleeBV,
  getBAMoveClassMultiplier,
} from '../battleArmorBV';
import { baseInput } from './battleArmorBV.test.helpers';

describe('getBAArmorBVMultiplier', () => {
  it('maps BA armor types to their BV multipliers', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.STANDARD)).toBe(1.0);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_BASIC)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_IMPROVED)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_PROTOTYPE)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.MIMETIC)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.REACTIVE)).toBe(1.3);
    expect(getBAArmorBVMultiplier(BAArmorType.REFLECTIVE)).toBe(1.3);
    expect(getBAArmorBVMultiplier(BAArmorType.FIRE_RESISTANT)).toBe(1.1);
  });
});

describe('getBAMoveClassMultiplier', () => {
  it('maps BA weight classes to move BV multipliers', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.PA_L)).toBe(0.5);
    expect(getBAMoveClassMultiplier(BAWeightClass.LIGHT)).toBe(0.5);
    expect(getBAMoveClassMultiplier(BAWeightClass.MEDIUM)).toBe(0.75);
    expect(getBAMoveClassMultiplier(BAWeightClass.HEAVY)).toBe(1.0);
    expect(getBAMoveClassMultiplier(BAWeightClass.ASSAULT)).toBe(1.5);
  });
});

describe('getBAManipulatorMeleeBV', () => {
  it('maps melee manipulators to BV and ignores utility manipulators', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.VIBRO_CLAW)).toBe(3);
    expect(getBAManipulatorMeleeBV(BAManipulator.HEAVY_CLAW)).toBe(2);
    expect(getBAManipulatorMeleeBV(BAManipulator.BATTLE_CLAW)).toBe(1);
    expect(getBAManipulatorMeleeBV(BAManipulator.BASIC_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.NONE)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.CARGO_LIFTER)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.INDUSTRIAL_DRILL)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MAGNET)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MINE_CLEARANCE)).toBe(0);
  });
});

describe('calculateBADefensiveBV', () => {
  it('computes armor BV from armor points, 2.5 base rate, and armor multiplier', () => {
    expect(
      calculateBADefensiveBV(
        baseInput({
          armorPointsPerTrooper: 5,
          armorType: BAArmorType.STANDARD,
        }),
      ).armorBV,
    ).toBe(12.5);
    expect(
      calculateBADefensiveBV(
        baseInput({
          armorPointsPerTrooper: 5,
          armorType: BAArmorType.STEALTH_BASIC,
        }),
      ).armorBV,
    ).toBe(18.75);
  });

  it('computes movement, jump/UMU, anti-mech, and total defensive BV', () => {
    expect(
      calculateBADefensiveBV(
        baseInput({ weightClass: BAWeightClass.MEDIUM, groundMP: 2 }),
      ).moveBV,
    ).toBeCloseTo(1.5, 10);

    expect(
      calculateBADefensiveBV(baseInput({ jumpMP: 3, umuMP: 0 })).jumpBV,
    ).toBe(1.5);
    expect(
      calculateBADefensiveBV(baseInput({ jumpMP: 0, umuMP: 4 })).jumpBV,
    ).toBe(2);
    expect(
      calculateBADefensiveBV(baseInput({ jumpMP: 2, umuMP: 4 })).jumpBV,
    ).toBe(2);

    const withoutClamp = calculateBADefensiveBV(baseInput());
    const withClamp = calculateBADefensiveBV(
      baseInput({ hasMagneticClamp: true }),
    );
    expect(withoutClamp.antiMechBonus).toBe(0);
    expect(withClamp.antiMechBonus).toBe(5);
    expect(withClamp.total - withoutClamp.total).toBe(5);

    const total = calculateBADefensiveBV(
      baseInput({
        armorPointsPerTrooper: 10,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 1,
        jumpMP: 0,
        hasMagneticClamp: true,
      }),
    );
    expect(total.armorBV).toBe(25);
    expect(total.moveBV).toBe(1);
    expect(total.jumpBV).toBe(0);
    expect(total.antiMechBonus).toBe(5);
    expect(total.total).toBe(31);
  });
});

describe('calculateBAOffensiveBV', () => {
  it('sums manipulator BV from both arms', () => {
    expect(
      calculateBAOffensiveBV(
        baseInput({
          manipulators: {
            left: BAManipulator.VIBRO_CLAW,
            right: BAManipulator.VIBRO_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(6);

    expect(
      calculateBAOffensiveBV(
        baseInput({
          manipulators: {
            left: BAManipulator.BATTLE_CLAW,
            right: BAManipulator.HEAVY_CLAW,
          },
        }),
      ).manipulatorBV,
    ).toBe(3);
  });

  it('sums weapon, ammo, and manipulator BV', () => {
    const weaponOnly = calculateBAOffensiveBV(
      baseInput({ weapons: [{ id: 'srm-2', bvOverride: 21 }] }),
    );
    expect(weaponOnly.weaponBV).toBe(21);

    const ammo = calculateBAOffensiveBV(
      baseInput({
        weapons: [{ id: 'srm-2', bvOverride: 21 }],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      }),
    );
    expect(ammo.ammoBV).toBe(3);

    const total = calculateBAOffensiveBV(
      baseInput({
        weapons: [
          { id: 'srm-2', bvOverride: 21 },
          { id: 'flamer', bvOverride: 6 },
        ],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
        manipulators: {
          left: BAManipulator.BATTLE_CLAW,
          right: BAManipulator.BATTLE_CLAW,
        },
      }),
    );
    expect(total.weaponBV).toBe(27);
    expect(total.ammoBV).toBe(3);
    expect(total.manipulatorBV).toBe(2);
    expect(total.total).toBe(32);
  });
});

describe('calculateBattleArmorBV squad scaling', () => {
  it('scales per-trooper BV by squad size before pilot multiplier', () => {
    const clan = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(clan.perTrooper.total).toBe(100);
    expect(clan.squadSize).toBe(5);
    expect(clan.squadTotal).toBe(500);

    const innerSphere = calculateBattleArmorBV(
      baseInput({
        squadSize: 4,
        armorPointsPerTrooper: 10,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 53 }],
      }),
    );
    expect(innerSphere.perTrooper.total).toBe(80);
    expect(innerSphere.squadSize).toBe(4);
    expect(innerSphere.squadTotal).toBe(320);
  });

  it('applies pilot multiplier at the end and clamps squad size', () => {
    const elite = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
        gunnery: 3,
        piloting: 4,
      }),
    );
    expect(elite.pilotMultiplier).toBe(1.32);
    expect(elite.final).toBe(660);

    const baseline = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(baseline.pilotMultiplier).toBe(1.0);
    expect(baseline.final).toBe(500);

    expect(calculateBattleArmorBV(baseInput({ squadSize: 0 })).squadSize).toBe(
      1,
    );
  });
});

describe('IBABreakdown shape', () => {
  it('exposes per-trooper, squad, pilot, and final fields', () => {
    const b = calculateBattleArmorBV(baseInput());
    expect(b).toHaveProperty('perTrooper');
    expect(b.perTrooper).toHaveProperty('defensive');
    expect(b.perTrooper).toHaveProperty('offensive');
    expect(b).toHaveProperty('squadTotal');
    expect(b).toHaveProperty('pilotMultiplier');
    expect(b).toHaveProperty('final');
    expect(typeof b.final).toBe('number');
    expect(Number.isInteger(b.final)).toBe(true);
  });

  it('offensive increases when an SRM-2 is added to each trooper', () => {
    const before =
      calculateBattleArmorBV(baseInput()).perTrooper.offensive.total;
    const after = calculateBattleArmorBV(
      baseInput({ weapons: [{ id: 'srm-2', bvOverride: 21 }] }),
    ).perTrooper.offensive.total;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBe(21);
  });
});
