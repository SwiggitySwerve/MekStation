import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import {
  calculateInfantryBV,
  calculateInfantryPerTrooperBV,
  calculateInfantryPrimaryBV,
  calculateInfantrySecondaryBV,
  getInfantryMotiveMultiplier,
  type InfantryWeaponRef,
} from '../infantryBV';
import { baseInput } from './infantryBV.test.helpers';

describe('Infantry Per-Trooper BV - Primary Weapon (spec.md Primary weapon contribution)', () => {
  it('primary Laser Rifle (BV 12, divisor 1) contributes 12', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-laser-rifle',
      bvOverride: 12,
      damageDivisor: 1,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(12);
  });

  it('higher damage divisor divides weapon BV proportionally', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-rifle',
      bvOverride: 30,
      damageDivisor: 10,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(3);
  });

  it('returns 0 when damage divisor is 0 (defensive guard)', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-broken',
      bvOverride: 50,
      damageDivisor: 0,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(0);
  });
});

describe('Infantry Per-Trooper BV - Secondary Ratio (spec.md Secondary ratio scaling)', () => {
  it('secondary SRM launcher (BV 25, divisor 1) at ratio 4 = 6.25', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 1,
      secondaryRatio: 4,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBeCloseTo(6.25, 5);
  });

  it('returns 0 when secondary weapon is undefined', () => {
    expect(calculateInfantrySecondaryBV(undefined)).toBe(0);
  });

  it('returns 0 when ratio is 0', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 1,
      secondaryRatio: 0,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBe(0);
  });

  it('divides by both damageDivisor and ratio (SRM BV 25, div 6, ratio 4)', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 6,
      secondaryRatio: 4,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBeCloseTo(
      (25 / 6) * (1 / 4),
      5,
    );
  });
});

describe('Infantry Per-Trooper BV - Armor Kit Modifier (spec.md Armor kit modifier)', () => {
  it('Sneak Camo adds 3 BV per trooper', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.SNEAK_CAMO,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 12,
        damageDivisor: 1,
      },
    });
    expect(calculateInfantryPerTrooperBV(input)).toBe(15);
  });

  it('Flak kit adds 2 BV per trooper', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.FLAK,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 10,
        damageDivisor: 10,
      },
    });
    expect(calculateInfantryPerTrooperBV(input)).toBe(3);
  });

  it('NONE kit contributes 0 BV', () => {
    const input = baseInput({ armorKit: InfantryArmorKit.NONE });
    expect(calculateInfantryPerTrooperBV(input)).toBe(12);
  });

  it('clamps per-trooper BV at 0 (never negative)', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.NONE,
      primaryWeapon: {
        id: 'inf-bad',
        bvOverride: -100,
        damageDivisor: 1,
      },
    });
    expect(calculateInfantryPerTrooperBV(input)).toBe(0);
  });
});

describe('Infantry Platoon BV - Motive Multiplier (spec.md Infantry Platoon BV with Motive Multiplier)', () => {
  it('Foot multiplier = 1.0', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.FOOT)).toBe(1.0);
  });

  it('Jump multiplier = 1.1', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.JUMP)).toBe(1.1);
  });

  it('Motorized multiplier = 1.05', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.MOTORIZED)).toBe(1.05);
  });

  it('Mechanized variants all = 1.15', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_TRACKED)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_WHEELED)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_HOVER)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_VTOL)).toBe(
      1.15,
    );
  });

  it('Foot 28-trooper perTrooperBV 15 -> platoonBV 420 (pre-pilot)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.perTrooper).toBe(15);
    expect(result.platoonBV).toBeCloseTo(420, 5);
    expect(result.final).toBe(420);
  });

  it('Mechanized 20-trooper perTrooperBV 20 -> platoonBV 460', () => {
    const input = baseInput({
      motive: InfantryMotive.MECHANIZED_TRACKED,
      totalTroopers: 20,
      primaryWeapon: {
        id: 'inf-mg',
        bvOverride: 20,
        damageDivisor: 1,
      },
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.platoonBV).toBeCloseTo(460, 5);
    expect(result.final).toBe(460);
  });
});

describe('Infantry Anti-Mech Training Multiplier (spec.md Infantry Anti-Mech Training Multiplier)', () => {
  it('trained Foot platoonBV 420 becomes 462 (x1.1)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      hasAntiMechTraining: true,
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.antiMechMultiplier).toBe(1.1);
    expect(result.platoonBV).toBeCloseTo(462, 5);
  });

  it('untrained multiplier = 1.0', () => {
    const input = baseInput({ hasAntiMechTraining: false });
    const result = calculateInfantryBV(input);
    expect(result.antiMechMultiplier).toBe(1.0);
  });
});
