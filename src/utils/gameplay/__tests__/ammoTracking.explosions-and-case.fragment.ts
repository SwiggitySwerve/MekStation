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

describe('CASE-adjusted ammo explosion damage', () => {
  it('reports no protection when a location has no CASE entry', () => {
    const unit = makeCaseUnit();

    expect(caseProtectionForLocation(unit, 'right_torso')).toBe('none');
  });

  it('caps standard CASE damage to 10 before local damage resolution', () => {
    const unit = makeCaseUnit({
      armor: { right_torso: 12 },
      structure: { right_torso: 10 },
      caseProtection: { right_torso: 'case' },
    });

    expect(
      resolveCaseAdjustedAmmoExplosionDamage(unit, 'right_torso', 100),
    ).toEqual({
      caseProtection: 'case',
      damageToApply: 10,
    });
  });

  it('caps CASE II damage to 1 before local damage resolution', () => {
    const unit = makeCaseUnit({
      armor: { right_torso: 12 },
      structure: { right_torso: 10 },
      caseProtection: { right_torso: 'case_ii' },
    });

    expect(
      resolveCaseAdjustedAmmoExplosionDamage(unit, 'right_torso', 100),
    ).toEqual({
      caseProtection: 'case_ii',
      damageToApply: 1,
    });
  });

  it('never applies more protected damage than the local internal structure can hold', () => {
    const unit = makeCaseUnit({
      armor: { right_torso: 4 },
      structure: { right_torso: 3 },
      caseProtection: { right_torso: 'case' },
    });

    expect(
      resolveCaseAdjustedAmmoExplosionDamage(unit, 'right_torso', 100),
    ).toEqual({
      caseProtection: 'case',
      damageToApply: 3,
    });
  });

  it('blows out protected torso rear armor when the internal structure survives', () => {
    const result = applyAmmoExplosionRearArmorBlowout(
      {
        armor: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 12,
          right_torso_rear: 6,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        rearArmor: {
          center_torso: 0,
          left_torso: 0,
          right_torso: 6,
        },
        structure: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 15,
          right_torso_rear: 15,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        destroyedLocations: [],
        pilotWounds: 0,
        pilotConscious: true,
        destroyed: false,
      },
      'right_torso',
      'case',
      10,
    );

    expect(result.state.armor.right_torso).toBe(12);
    expect(result.state.armor.right_torso_rear).toBe(0);
    expect(result.state.rearArmor.right_torso).toBe(0);
    expect(result.state.structure.right_torso).toBe(15);
    expect(result.locationDamages).toEqual([
      expect.objectContaining({
        location: 'right_torso_rear',
        damage: 6,
        armorDamage: 6,
        structureDamage: 0,
        armorRemaining: 0,
        structureRemaining: 15,
        destroyed: false,
      }),
    ]);
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
