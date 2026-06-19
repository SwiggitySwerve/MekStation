import type { IUnitGameState } from '@/types/gameplay';

import { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  initializeAmmoState,
  consumeAmmo,
  hasAmmoForWeapon,
  getFireableWeapons,
  resolveAmmoExplosion,
  calculateCASEEffects,
  getCASEProtection,
  resolveGaussExplosion,
  getHeatAmmoExplosionTN,
  checkHeatAmmoExplosion,
  selectRandomAmmoBin,
  getTotalAmmo,
  getAmmoBinsAtLocation,
  findAvailableAmmoBin,
  isEnergyWeapon,
  normalizeAmmoWeaponType,
  IAmmoConstructionData,
  applyAmmoExplosionRearArmorBlowout,
  caseProtectionForLocation,
  resolveCaseAdjustedAmmoExplosionDamage,
  resolveBattleMechAmmoExplosionPilotDamage,
} from '../ammoTracking';

// =============================================================================
// Test Helpers
// =============================================================================

function makeAmmoBin(overrides: Partial<IAmmoSlotState> = {}): IAmmoSlotState {
  return {
    binId: 'bin-1',
    weaponType: 'AC/10',
    location: 'right_torso',
    remainingRounds: 10,
    maxRounds: 10,
    isExplosive: true,
    ...overrides,
  };
}

function makeConstructionData(
  overrides: Partial<IAmmoConstructionData> = {},
): IAmmoConstructionData {
  return {
    binId: 'bin-1',
    weaponType: 'AC/10',
    location: 'right_torso',
    maxRounds: 10,
    damagePerRound: 10,
    isExplosive: true,
    ...overrides,
  };
}

function makeCaseUnit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
  return {
    armor: {},
    structure: {},
    destroyedLocations: [],
    caseProtection: {},
    ...overrides,
  } as IUnitGameState;
}

const fixedDiceRoller = (value: number) => () => value;

// =============================================================================
// Task 6.3: Initialize Ammo State
// =============================================================================

describe('getHeatAmmoExplosionTN', () => {
  it('returns null below heat 19', () => {
    expect(getHeatAmmoExplosionTN(0)).toBeNull();
    expect(getHeatAmmoExplosionTN(10)).toBeNull();
    expect(getHeatAmmoExplosionTN(18)).toBeNull();
  });

  it('returns TN 4 at heat 19-22', () => {
    expect(getHeatAmmoExplosionTN(19)).toBe(4);
    expect(getHeatAmmoExplosionTN(22)).toBe(4);
  });

  it('applies heat target-number modifiers', () => {
    expect(getHeatAmmoExplosionTN(19, -1)).toBe(3);
    expect(getHeatAmmoExplosionTN(23, -1)).toBe(5);
    expect(getHeatAmmoExplosionTN(28, -1)).toBe(7);
  });

  it('returns TN 6 at heat 23-27', () => {
    expect(getHeatAmmoExplosionTN(23)).toBe(6);
    expect(getHeatAmmoExplosionTN(27)).toBe(6);
  });

  it('returns TN 8 at heat 28-29', () => {
    expect(getHeatAmmoExplosionTN(28)).toBe(8);
    expect(getHeatAmmoExplosionTN(29)).toBe(8);
  });

  it('returns Infinity at heat 30+', () => {
    expect(getHeatAmmoExplosionTN(30)).toBe(Infinity);
    expect(getHeatAmmoExplosionTN(35)).toBe(Infinity);
  });
});

describe('checkHeatAmmoExplosion', () => {
  it('returns false below heat 19', () => {
    expect(checkHeatAmmoExplosion(10, fixedDiceRoller(1))).toBe(false);
  });

  it('returns true at heat 30+ (auto-explode)', () => {
    expect(checkHeatAmmoExplosion(30, fixedDiceRoller(6))).toBe(true);
  });

  it('returns true when roll fails TN at heat 19', () => {
    // TN 4, roll 1+1=2, below 4 → explosion
    expect(checkHeatAmmoExplosion(19, fixedDiceRoller(1))).toBe(true);
  });

  it('returns false when roll meets TN at heat 19', () => {
    // TN 4, roll 3+3=6, ≥4 → no explosion
    expect(checkHeatAmmoExplosion(19, fixedDiceRoller(3))).toBe(false);
  });
  it('applies heat target-number modifiers to the explosion check', () => {
    // Base TN 4, Hot Dog-style -1 modifier, roll 1+2=3 meets TN 3.
    let next = 0;
    const dice = [1, 2];

    expect(checkHeatAmmoExplosion(19, () => dice[next++] ?? 1, -1)).toBe(false);
  });
});

describe('selectRandomAmmoBin', () => {
  it('returns null when no non-empty bins exist', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 0 }) };
    expect(selectRandomAmmoBin(ammoState, fixedDiceRoller(1))).toBeNull();
  });

  it('selects a non-empty bin', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({ binId: 'bin-1', remainingRounds: 5 }),
      'bin-2': makeAmmoBin({ binId: 'bin-2', remainingRounds: 0 }),
    };
    const result = selectRandomAmmoBin(ammoState, fixedDiceRoller(1));
    expect(result).toBe('bin-1');
  });
});

// =============================================================================
// Utility Functions
// =============================================================================

describe('getTotalAmmo', () => {
  it('sums rounds across all bins of a weapon type', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({ binId: 'bin-1', remainingRounds: 5 }),
      'bin-2': makeAmmoBin({ binId: 'bin-2', remainingRounds: 3 }),
      'bin-3': makeAmmoBin({
        binId: 'bin-3',
        weaponType: 'SRM 6',
        remainingRounds: 10,
      }),
    };
    expect(getTotalAmmo(ammoState, 'AC/10')).toBe(8);
    expect(getTotalAmmo(ammoState, 'SRM 6')).toBe(10);
    expect(getTotalAmmo(ammoState, 'LRM 20')).toBe(0);
  });
});

describe('getAmmoBinsAtLocation', () => {
  it('returns bins at specified location', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({ binId: 'bin-1', location: 'right_torso' }),
      'bin-2': makeAmmoBin({ binId: 'bin-2', location: 'left_torso' }),
      'bin-3': makeAmmoBin({ binId: 'bin-3', location: 'right_torso' }),
    };
    const bins = getAmmoBinsAtLocation(ammoState, 'right_torso');
    expect(bins).toHaveLength(2);
  });
});

describe('isEnergyWeapon', () => {
  it('identifies energy weapons', () => {
    expect(isEnergyWeapon('Medium Laser')).toBe(true);
    expect(isEnergyWeapon('Large Pulse Laser')).toBe(true);
    expect(isEnergyWeapon('PPC')).toBe(true);
    expect(isEnergyWeapon('ER PPC')).toBe(true);
    expect(isEnergyWeapon('Flamer')).toBe(true);
  });

  it('identifies ballistic/missile weapons as non-energy', () => {
    expect(isEnergyWeapon('AC/10')).toBe(false);
    expect(isEnergyWeapon('LRM 20')).toBe(false);
    expect(isEnergyWeapon('SRM 6')).toBe(false);
    expect(isEnergyWeapon('Machine Gun')).toBe(false);
    expect(isEnergyWeapon('Gauss Rifle')).toBe(false);
  });

  it('treats MegaMek plasma AmmoWeapon families as ammo-fed despite energy flags', () => {
    expect(isEnergyWeapon('Plasma Cannon (Clan)')).toBe(false);
    expect(isEnergyWeapon('CLPlasmaCannon')).toBe(false);
    expect(isEnergyWeapon('Plasma Rifle')).toBe(false);
    expect(isEnergyWeapon('ISPlasmaRifle')).toBe(false);
  });
});

// =============================================================================
// Integration: Ammo Consumption Flow
// =============================================================================

describe('full ammo consumption flow', () => {
  it('consumes from first bin until empty, then switches to second', () => {
    const constructionData: IAmmoConstructionData[] = [
      makeConstructionData({ binId: 'ac10-1', maxRounds: 2 }),
      makeConstructionData({ binId: 'ac10-2', maxRounds: 5 }),
    ];

    let ammoState = initializeAmmoState(constructionData);
    expect(getTotalAmmo(ammoState, 'AC/10')).toBe(7);

    // Shot 1: from bin 1
    let result = consumeAmmo(ammoState, 'unit-1', 'AC/10')!;
    ammoState = result.updatedAmmoState;
    expect(result.event.binId).toBe('ac10-1');
    expect(ammoState['ac10-1'].remainingRounds).toBe(1);

    // Shot 2: from bin 1 (last round)
    result = consumeAmmo(ammoState, 'unit-1', 'AC/10')!;
    ammoState = result.updatedAmmoState;
    expect(result.event.binId).toBe('ac10-1');
    expect(ammoState['ac10-1'].remainingRounds).toBe(0);

    // Shot 3: bin 1 empty, switches to bin 2
    result = consumeAmmo(ammoState, 'unit-1', 'AC/10')!;
    ammoState = result.updatedAmmoState;
    expect(result.event.binId).toBe('ac10-2');
    expect(ammoState['ac10-2'].remainingRounds).toBe(4);
  });

  it('weapon cannot fire when all bins depleted', () => {
    let ammoState = initializeAmmoState([
      makeConstructionData({ binId: 'ac10-1', maxRounds: 1 }),
    ]);

    expect(hasAmmoForWeapon(ammoState, 'AC/10')).toBe(true);

    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10')!;
    ammoState = result.updatedAmmoState;

    expect(hasAmmoForWeapon(ammoState, 'AC/10')).toBe(false);
    expect(consumeAmmo(ammoState, 'unit-1', 'AC/10')).toBeNull();
  });
});

describe('ammo explosion integration with CASE', () => {
  it('Clan OmniMech side torso explosion is CASE-protected', () => {
    const ammoState = {
      'lrm-1': makeAmmoBin({
        binId: 'lrm-1',
        weaponType: 'LRM 20',
        location: 'right_torso',
        remainingRounds: 6,
      }),
    };

    const caseLevel = getCASEProtection('right_torso', {}, true);
    expect(caseLevel).toBe('case');

    const result = resolveAmmoExplosion(ammoState, 'lrm-1', 1, caseLevel);
    expect(result!.totalDamage).toBe(6);
    expect(result!.transferDamage).toBe(0);
    expect(result!.pilotDamage).toBe(0);
  });

  it('IS mech without CASE suffers full explosion effects', () => {
    const ammoState = {
      'ac20-1': makeAmmoBin({
        binId: 'ac20-1',
        weaponType: 'AC/20',
        location: 'right_torso',
        remainingRounds: 5,
      }),
    };

    const caseLevel = getCASEProtection('right_torso', {}, false);
    expect(caseLevel).toBe('none');

    const result = resolveAmmoExplosion(ammoState, 'ac20-1', 20, caseLevel);
    expect(result!.totalDamage).toBe(100);
    expect(result!.transferDamage).toBe(100);
    expect(result!.pilotDamage).toBe(1);
  });
});

describe('resolveBattleMechAmmoExplosionPilotDamage', () => {
  it('applies the default BattleMech ammo-explosion pilot damage', () => {
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        caseProtection: 'none',
      }),
    ).toBe(2);
  });

  it('reduces ammo-explosion pilot damage for Iron Man and Pain Resistance', () => {
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        pilotAbilities: ['iron-man'],
      }),
    ).toBe(1);
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        pilotAbilities: ['pain_resistance'],
      }),
    ).toBe(1);
  });

  it('does not apply the local Iron Will alias to source-backed Iron Man ammo-explosion relief', () => {
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        pilotAbilities: ['iron-will'],
      }),
    ).toBe(2);
  });

  it('suppresses ammo-explosion pilot damage with artificial pain shunt', () => {
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        pilotAbilities: ['artificial_pain_shunt'],
      }),
    ).toBe(0);
  });

  it('only applies the optional CASE pilot-damage reduction when enabled', () => {
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        caseProtection: 'case',
      }),
    ).toBe(2);
    expect(
      resolveBattleMechAmmoExplosionPilotDamage({
        totalDamage: 100,
        caseProtection: 'case',
        advancedCasePilotDamage: true,
      }),
    ).toBe(1);
  });
});
