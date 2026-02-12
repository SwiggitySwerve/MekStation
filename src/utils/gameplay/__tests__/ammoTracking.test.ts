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
  isEnergyWeapon,
  IAmmoConstructionData,
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

describe('resolveAmmoExplosion', () => {
  it('calculates damage as remainingRounds × damagePerRound', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 15 }) };
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'none');

    expect(result!.totalDamage).toBe(150);
  });

  it('returns 0 damage for empty bin', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 0 }) };
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'none');

    expect(result!.totalDamage).toBe(0);
    expect(result!.binDestroyed).toBe(true);
  });

  it('returns null for non-existent bin', () => {
    const result = resolveAmmoExplosion({}, 'nonexistent', 10, 'none');
    expect(result).toBeNull();
  });

  it('marks bin as destroyed (0 rounds remaining)', () => {
    const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 10 }) };
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'none');

    expect(result!.updatedAmmoState['bin-1'].remainingRounds).toBe(0);
    expect(result!.binDestroyed).toBe(true);
  });

  it('SRM-6 explosion: 3 rounds × 12 damage = 36', () => {
    const ammoState = {
      'srm-1': makeAmmoBin({
        binId: 'srm-1',
        weaponType: 'SRM 6',
        remainingRounds: 3,
      }),
    };
    const result = resolveAmmoExplosion(ammoState, 'srm-1', 12, 'none');
    expect(result!.totalDamage).toBe(36);
  });
});

// =============================================================================
// Tasks 6.7, 6.8, 6.9: CASE Protection
// =============================================================================

describe('calculateCASEEffects', () => {
  it('CASE: no transfer, no pilot damage', () => {
    const result = calculateCASEEffects(150, 'case');
    expect(result.transferDamage).toBe(0);
    expect(result.pilotDamage).toBe(0);
  });

  it('CASE II: 1 point transfer, no pilot damage', () => {
    const result = calculateCASEEffects(150, 'case_ii');
    expect(result.transferDamage).toBe(1);
    expect(result.pilotDamage).toBe(0);
  });

  it('No CASE: full transfer, pilot takes 1 damage', () => {
    const result = calculateCASEEffects(150, 'none');
    expect(result.transferDamage).toBe(150);
    expect(result.pilotDamage).toBe(1);
  });

  it('zero damage = no effects regardless of CASE', () => {
    expect(calculateCASEEffects(0, 'none')).toEqual({
      transferDamage: 0,
      pilotDamage: 0,
    });
    expect(calculateCASEEffects(0, 'case')).toEqual({
      transferDamage: 0,
      pilotDamage: 0,
    });
    expect(calculateCASEEffects(0, 'case_ii')).toEqual({
      transferDamage: 0,
      pilotDamage: 0,
    });
  });
});

describe('resolveAmmoExplosion with CASE variants', () => {
  const ammoState = { 'bin-1': makeAmmoBin({ remainingRounds: 10 }) };

  it('CASE limits explosion to location', () => {
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'case');
    expect(result!.totalDamage).toBe(100);
    expect(result!.transferDamage).toBe(0);
    expect(result!.pilotDamage).toBe(0);
  });

  it('CASE II transfers only 1 point', () => {
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'case_ii');
    expect(result!.totalDamage).toBe(100);
    expect(result!.transferDamage).toBe(1);
    expect(result!.pilotDamage).toBe(0);
  });

  it('No CASE: full transfer + pilot damage', () => {
    const result = resolveAmmoExplosion(ammoState, 'bin-1', 10, 'none');
    expect(result!.totalDamage).toBe(100);
    expect(result!.transferDamage).toBe(100);
    expect(result!.pilotDamage).toBe(1);
  });
});

// =============================================================================
// Task 6.10: Clan OmniMech Default CASE
// =============================================================================

describe('getCASEProtection', () => {
  it('returns none by default', () => {
    expect(getCASEProtection('right_torso')).toBe('none');
  });

  it('returns explicit CASE when configured', () => {
    expect(getCASEProtection('right_torso', { right_torso: 'case' })).toBe(
      'case',
    );
  });

  it('returns explicit CASE II when configured', () => {
    expect(getCASEProtection('right_torso', { right_torso: 'case_ii' })).toBe(
      'case_ii',
    );
  });

  it('Clan OmniMech gets default CASE in side torsos', () => {
    expect(getCASEProtection('left_torso', {}, true)).toBe('case');
    expect(getCASEProtection('right_torso', {}, true)).toBe('case');
  });

  it('Clan OmniMech does NOT get CASE in other locations', () => {
    expect(getCASEProtection('center_torso', {}, true)).toBe('none');
    expect(getCASEProtection('left_arm', {}, true)).toBe('none');
    expect(getCASEProtection('right_leg', {}, true)).toBe('none');
    expect(getCASEProtection('head', {}, true)).toBe('none');
  });

  it('explicit CASE II overrides Clan OmniMech default CASE', () => {
    expect(
      getCASEProtection('right_torso', { right_torso: 'case_ii' }, true),
    ).toBe('case_ii');
  });
});

// =============================================================================
// Task 6.11: Gauss Rifle Explosion
// =============================================================================

describe('resolveGaussExplosion', () => {
  it('always deals exactly 20 damage', () => {
    const result = resolveGaussExplosion('right_arm', 'none');
    expect(result.totalDamage).toBe(20);
  });

  it('respects CASE protection', () => {
    const withCase = resolveGaussExplosion('right_torso', 'case');
    expect(withCase.transferDamage).toBe(0);
    expect(withCase.pilotDamage).toBe(0);
  });

  it('no CASE: transfers full 20 damage + pilot damage', () => {
    const noCase = resolveGaussExplosion('right_torso', 'none');
    expect(noCase.transferDamage).toBe(20);
    expect(noCase.pilotDamage).toBe(1);
  });

  it('CASE II: transfers only 1 point', () => {
    const caseII = resolveGaussExplosion('right_torso', 'case_ii');
    expect(caseII.transferDamage).toBe(1);
    expect(caseII.pilotDamage).toBe(0);
  });
});

// =============================================================================
// Heat-Induced Ammo Explosion
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
