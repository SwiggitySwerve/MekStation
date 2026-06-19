/**
 * Battle Armor BV canonical archetype scenarios.
 *
 * Covers the five canonical BA archetypes called out by the change
 * (Elemental, Cavalier, Sylph, IS Standard, Gnome). Uses `bvOverride` for
 * weapons/ammo so tests are catalog-independent.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';

import { calculateBattleArmorBV } from '../battleArmorBV';

describe('canonical BA archetypes', () => {
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

    expect(b.perTrooper.defensive.total).toBeCloseTo(32.5, 10);
    expect(b.perTrooper.offensive.total).toBe(35);
    expect(b.perTrooper.total).toBeCloseTo(67.5, 10);
    expect(b.squadSize).toBe(5);
    expect(b.squadTotal).toBeCloseTo(337.5, 10);
    expect(b.final).toBe(338);
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

    expect(b.perTrooper.defensive.total).toBe(19);
    expect(b.perTrooper.offensive.total).toBe(13);
    expect(b.perTrooper.total).toBe(32);
    expect(b.squadTotal).toBe(128);
    expect(b.final).toBe(128);
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

    expect(b.perTrooper.defensive.total).toBe(14);
    expect(b.perTrooper.offensive.total).toBe(17);
    expect(b.perTrooper.total).toBe(31);
    expect(b.squadTotal).toBe(155);
    expect(b.final).toBe(155);
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

    expect(b.perTrooper.defensive.total).toBeCloseTo(22.25, 10);
    expect(b.perTrooper.offensive.total).toBe(26);
    expect(b.perTrooper.total).toBeCloseTo(48.25, 10);
    expect(b.squadTotal).toBe(193);
    expect(b.final).toBe(193);
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

    expect(b.perTrooper.defensive.total).toBe(41.5);
    expect(b.perTrooper.offensive.total).toBe(63);
    expect(b.perTrooper.total).toBe(104.5);
    expect(b.squadTotal).toBe(522.5);
    expect(b.final).toBe(523);
  });
});
