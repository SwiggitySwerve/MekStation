/**
 * Valued fixtures exercise pinned armor/internal and movement defense.
 * These are not native-source total-BV goldens; complete totals await part 2.
 * @spec openspec/specs/battle-value-system/spec.md
 */

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';

import { calculateBattleArmorBV } from '../battleArmorBV';

describe('BA defensive fixtures (complete totals pending part 2)', () => {
  // MegaMek 48fcb2f64 BattleArmorBVCalculator.java:84-111,257-274.
  it.todo(
    'BA BV part 2: full archetype goldens from pinned sources, not valued fixture overrides',
  );
  it('Clan Elemental (Heavy, 5 troopers, SRM-2 + Small Laser)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.HEAVY,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 3,
      umuMP: 0,
      armorPointsPerTrooper: 10,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [
        { id: 'srm-2', bvOverride: 21 },
        { id: 'small-laser', bvOverride: 9 },
      ],
      ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });

    expect(b.perTrooper.defensive.total).toBeCloseTo(33.8, 10);
    expect(b.squadSize).toBe(5);
  });

  it('IS Cavalier (Medium, 4 troopers, twin MG + Battle Claw)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.MEDIUM,
      squadSize: 4,
      groundMP: 2,
      jumpMP: 0,
      umuMP: 0,
      armorPointsPerTrooper: 7,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [
        { id: 'machine-gun', bvOverride: 5 },
        { id: 'machine-gun', bvOverride: 5 },
      ],
      ammo: [{ id: 'mg-ammo', bvOverride: 1 }],
      hasMagneticClamp: false,
      gunnery: 4,
      piloting: 5,
    });

    expect(b.perTrooper.defensive.total).toBeCloseTo(20.35, 10);
  });

  it('Clan Sylph (Light VTOL, 5 troopers, ER Small Laser)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.LIGHT,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 7,
      umuMP: 0,
      armorPointsPerTrooper: 4,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.NONE,
        right: BAManipulator.NONE,
      },
      weapons: [{ id: 'er-small-laser', bvOverride: 17 }],
      ammo: [],
      hasMagneticClamp: false,
      gunnery: 4,
      piloting: 5,
    });

    expect(b.perTrooper.defensive.total).toBe(16.5);
  });

  it('IS Standard (Medium, 4 troopers, SRM-2)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.MEDIUM,
      squadSize: 4,
      groundMP: 1,
      jumpMP: 3,
      umuMP: 0,
      armorPointsPerTrooper: 6,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [{ id: 'srm-2', bvOverride: 21 }],
      ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });

    expect(b.perTrooper.defensive.total).toBeCloseTo(20.8, 10);
  });

  it('Clan Gnome (Assault, 5 troopers, Heavy Battle Claw + heavy armor)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.ASSAULT,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 0,
      umuMP: 0,
      armorPointsPerTrooper: 14,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.HEAVY_CLAW,
        right: BAManipulator.HEAVY_CLAW,
      },
      weapons: [
        { id: 'srm-4', bvOverride: 39 },
        { id: 'heavy-support-laser', bvOverride: 15 },
      ],
      ammo: [{ id: 'srm-4-ammo', bvOverride: 5 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });

    expect(b.perTrooper.defensive.total).toBeCloseTo(39.6, 10);
  });
});
