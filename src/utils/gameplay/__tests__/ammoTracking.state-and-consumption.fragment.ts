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

describe('initializeAmmoState', () => {
  it('creates ammo bins from construction data', () => {
    const data: IAmmoConstructionData[] = [
      makeConstructionData({
        binId: 'ac10-1',
        weaponType: 'AC/10',
        maxRounds: 10,
      }),
      makeConstructionData({
        binId: 'srm6-1',
        weaponType: 'SRM 6',
        location: 'left_torso',
        maxRounds: 15,
      }),
    ];

    const state = initializeAmmoState(data);

    expect(Object.keys(state)).toHaveLength(2);
    expect(state['ac10-1'].remainingRounds).toBe(10);
    expect(state['ac10-1'].maxRounds).toBe(10);
    expect(state['ac10-1'].weaponType).toBe('AC/10');
    expect(state['srm6-1'].remainingRounds).toBe(15);
    expect(state['srm6-1'].location).toBe('left_torso');
  });

  it('initializes remainingRounds equal to maxRounds', () => {
    const data = [makeConstructionData({ maxRounds: 20 })];
    const state = initializeAmmoState(data);
    expect(state['bin-1'].remainingRounds).toBe(state['bin-1'].maxRounds);
  });

  it('handles empty construction data', () => {
    const state = initializeAmmoState([]);
    expect(Object.keys(state)).toHaveLength(0);
  });

  it('tracks each ton of ammo as separate bin', () => {
    const data = [
      makeConstructionData({ binId: 'ac10-rt-1', location: 'right_torso' }),
      makeConstructionData({ binId: 'ac10-rt-2', location: 'right_torso' }),
    ];
    const state = initializeAmmoState(data);
    expect(Object.keys(state)).toHaveLength(2);
    expect(state['ac10-rt-1']).toBeDefined();
    expect(state['ac10-rt-2']).toBeDefined();
  });
});

// =============================================================================
// Task 6.4: Consume Ammo
// =============================================================================

describe('consumeAmmo', () => {
  it('decrements rounds by 1 from matching bin', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 10 }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10');

    expect(result).not.toBeNull();
    expect(result!.updatedAmmoState['bin-1'].remainingRounds).toBe(9);
    expect(result!.success).toBe(true);
  });

  it('emits correct AmmoConsumed event payload', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 5 }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10');

    expect(result!.event).toEqual({
      unitId: 'unit-1',
      binId: 'bin-1',
      weaponType: 'AC/10',
      roundsConsumed: 1,
      roundsRemaining: 4,
    });
  });

  it('returns null when no matching ammo exists', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ weaponType: 'SRM 6' }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10');
    expect(result).toBeNull();
  });

  it('returns null when matching bin is empty', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 0 }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10');
    expect(result).toBeNull();
  });

  it('uses first non-empty bin when multiple exist', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({ binId: 'bin-1', remainingRounds: 0 }),
      'bin-2': makeAmmoBin({ binId: 'bin-2', remainingRounds: 5 }),
    };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10');

    expect(result!.event.binId).toBe('bin-2');
    expect(result!.updatedAmmoState['bin-2'].remainingRounds).toBe(4);
  });

  it('does not mutate original state', () => {
    const original = makeAmmoBin({ remainingRounds: 10 });
    const ammoState = { 'bin-1': original };
    consumeAmmo(ammoState, 'unit-1', 'AC/10');
    expect(ammoState['bin-1'].remainingRounds).toBe(10);
  });

  it('consumes multiple rounds when specified', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 10 }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10', 3);
    expect(result!.updatedAmmoState['bin-1'].remainingRounds).toBe(7);
    expect(result!.event.roundsConsumed).toBe(3);
  });

  it('clamps to 0 when consuming more than available', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 2 }) };
    const result = consumeAmmo(ammoState, 'unit-1', 'AC/10', 5);
    expect(result!.updatedAmmoState['bin-1'].remainingRounds).toBe(0);
  });

  it('matches equivalent catalog IDs, slashes, and display names', () => {
    expect(normalizeAmmoWeaponType('AC/20')).toBe('ac-20');
    expect(normalizeAmmoWeaponType('AC-20')).toBe('ac-20');
    expect(normalizeAmmoWeaponType('LRM 20')).toBe('lrm-20');
    expect(normalizeAmmoWeaponType('Ultra AC/5')).toBe('uac-5');
    expect(normalizeAmmoWeaponType('Ultra AC/5 (Clan)')).toBe('clan-uac-5');

    const ammoState = {
      'ac20-1': makeAmmoBin({
        binId: 'ac20-1',
        weaponType: 'AC/20',
        remainingRounds: 5,
      }),
      'lrm20-1': makeAmmoBin({
        binId: 'lrm20-1',
        weaponType: 'lrm-20',
        remainingRounds: 5,
      }),
      'clan-uac5-1': makeAmmoBin({
        binId: 'clan-uac5-1',
        weaponType: 'Ultra AC/5 (Clan)',
        remainingRounds: 5,
      }),
    };

    expect(consumeAmmo(ammoState, 'unit-1', 'ac-20')?.event.binId).toBe(
      'ac20-1',
    );
    expect(consumeAmmo(ammoState, 'unit-1', 'LRM 20')?.event.binId).toBe(
      'lrm20-1',
    );
    expect(consumeAmmo(ammoState, 'unit-1', 'clan-uac-5')?.event.binId).toBe(
      'clan-uac5-1',
    );
  });

  it('does not merge Clan and Inner Sphere ammo bins during normalized matching', () => {
    const ammoState = {
      'clan-uac5-1': makeAmmoBin({
        binId: 'clan-uac5-1',
        weaponType: 'clan-uac-5',
        remainingRounds: 5,
      }),
    };

    expect(consumeAmmo(ammoState, 'unit-1', 'uac-5')).toBeNull();
    expect(
      consumeAmmo(ammoState, 'unit-1', 'Ultra AC/5 (Clan)'),
    ).not.toBeNull();
  });

  it('matches official AMS ammo names to AMS launchers', () => {
    expect(normalizeAmmoWeaponType('AMS Ammo')).toBe('ams');
    expect(normalizeAmmoWeaponType('Anti-Missile System Ammo')).toBe('ams');
    expect(normalizeAmmoWeaponType('ISAMS Ammo')).toBe('ams');
    expect(normalizeAmmoWeaponType('CLAMS Ammo')).toBe('clan-ams');

    const ammoState = {
      'ams-1': makeAmmoBin({
        binId: 'ams-1',
        weaponType: 'AMS Ammo',
        remainingRounds: 5,
      }),
      'clan-ams-1': makeAmmoBin({
        binId: 'clan-ams-1',
        weaponType: 'CLAMS Ammo',
        remainingRounds: 5,
      }),
    };

    expect(consumeAmmo(ammoState, 'unit-1', 'ams')?.event.binId).toBe('ams-1');
    expect(consumeAmmo(ammoState, 'unit-1', 'clan-ams')?.event.binId).toBe(
      'clan-ams-1',
    );
  });

  it('matches source-backed plasma ammo aliases to ammo-fed plasma weapons', () => {
    expect(normalizeAmmoWeaponType('CLPlasmaCannonAmmo')).toBe(
      'clan-plasma-cannon',
    );
    expect(normalizeAmmoWeaponType('Plasma Cannon Ammo')).toBe(
      'clan-plasma-cannon',
    );
    expect(normalizeAmmoWeaponType('ISPlasmaRifleAmmo')).toBe('plasma-rifle');
    expect(normalizeAmmoWeaponType('Plasma Rifle Ammo')).toBe('plasma-rifle');

    const ammoState = {
      'clan-plasma-1': makeAmmoBin({
        binId: 'clan-plasma-1',
        weaponType: 'CLPlasmaCannonAmmo',
        remainingRounds: 10,
      }),
      'is-plasma-1': makeAmmoBin({
        binId: 'is-plasma-1',
        weaponType: 'ISPlasmaRifleAmmo',
        remainingRounds: 10,
      }),
    };

    expect(
      consumeAmmo(ammoState, 'unit-1', 'clan-plasma-cannon')?.event.binId,
    ).toBe('clan-plasma-1');
    expect(consumeAmmo(ammoState, 'unit-1', 'Plasma Rifle')?.event.binId).toBe(
      'is-plasma-1',
    );
  });

  it('matches semi-guided LRM ammo to the base LRM launcher while preserving the selected variant', () => {
    expect(normalizeAmmoWeaponType('Semi-Guided LRM 10')).toBe('lrm-10');
    expect(normalizeAmmoWeaponType('LRM 10 Semi-Guided')).toBe('lrm-10');
    expect(normalizeAmmoWeaponType('SG LRM 10')).toBe('lrm-10');

    const ammoState = {
      'sg-lrm10-1': makeAmmoBin({
        binId: 'sg-lrm10-1',
        weaponType: 'Semi-Guided LRM 10',
        remainingRounds: 5,
      }),
    };

    expect(hasAmmoForWeapon(ammoState, 'lrm-10')).toBe(true);
    expect(findAvailableAmmoBin(ammoState, 'LRM 10')?.weaponType).toBe(
      'Semi-Guided LRM 10',
    );
    expect(consumeAmmo(ammoState, 'unit-1', 'lrm-10')?.event.binId).toBe(
      'sg-lrm10-1',
    );
  });
});

// =============================================================================
// Task 6.5: Weapon Firing Restrictions
// =============================================================================

describe('hasAmmoForWeapon', () => {
  it('returns true when ammo is available', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 5 }) };
    expect(hasAmmoForWeapon(ammoState, 'AC/10')).toBe(true);
  });

  it('returns false when all bins are empty', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 0 }) };
    expect(hasAmmoForWeapon(ammoState, 'AC/10')).toBe(false);
  });

  it('returns false when no matching weapon type', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ weaponType: 'LRM 20' }) };
    expect(hasAmmoForWeapon(ammoState, 'AC/10')).toBe(false);
  });

  it('returns true for energy weapons regardless of ammo', () => {
    expect(hasAmmoForWeapon({}, 'Medium Laser', true)).toBe(true);
  });

  it('uses normalized weapon-type matching for availability and totals', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({
        binId: 'bin-1',
        weaponType: 'AC/20',
        remainingRounds: 4,
      }),
      'bin-2': makeAmmoBin({
        binId: 'bin-2',
        weaponType: 'ac-20',
        remainingRounds: 3,
      }),
    };

    expect(hasAmmoForWeapon(ammoState, 'AC-20')).toBe(true);
    expect(getTotalAmmo(ammoState, 'AC/20')).toBe(7);
  });
});

describe('getFireableWeapons', () => {
  it('filters out weapons with no ammo', () => {
    const ammoState = {
      'bin-1': makeAmmoBin({ weaponType: 'AC/10', remainingRounds: 5 }),
    };
    const weapons = [
      { weaponId: 'w1', weaponType: 'AC/10', isEnergy: false },
      { weaponId: 'w2', weaponType: 'SRM 6', isEnergy: false },
      { weaponId: 'w3', weaponType: 'Medium Laser', isEnergy: true },
    ];

    const fireable = getFireableWeapons(ammoState, weapons);
    expect(fireable).toEqual(['w1', 'w3']);
  });
});

// =============================================================================
// Task 6.6: Ammo Explosion
// =============================================================================
