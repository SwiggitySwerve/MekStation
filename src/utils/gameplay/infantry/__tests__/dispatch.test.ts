/**
 * Infantry combat dispatch tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Combat Dispatch
 */

import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import {
  dispatchResolveCriticalHitsForInfantry,
  dispatchResolveInfantryDamage,
  isInfantryTarget,
} from '../dispatch';
import { createInfantryCombatState } from '../state';

describe('isInfantryTarget', () => {
  it('true for INFANTRY unitType', () => {
    expect(isInfantryTarget({ unitType: UnitType.INFANTRY })).toBe(true);
  });

  it('false for BATTLEMECH', () => {
    expect(isInfantryTarget({ unitType: UnitType.BATTLEMECH })).toBe(false);
  });

  it('false for VEHICLE', () => {
    expect(isInfantryTarget({ unitType: UnitType.VEHICLE })).toBe(false);
  });
});

describe('dispatchResolveInfantryDamage', () => {
  it('routes infantry target through infantryResolveDamage', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    let groundCalled = false;
    const result = dispatchResolveInfantryDamage(
      { unitType: UnitType.INFANTRY },
      {
        unitId: 'pl-1',
        state,
        rawDamage: 5,
        weaponCategory: 'energy',
      },
      () => {
        groundCalled = true;
        return { kind: 'ground' as const };
      },
    );
    expect(groundCalled).toBe(false);
    // Infantry path returns IInfantryDamageResult (has casualties field)
    expect(
      typeof (result as { casualties?: number }).casualties === 'number',
    ).toBe(true);
  });

  it('falls through to onGround for non-infantry targets', () => {
    const state = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    let groundCalled = false;
    const result = dispatchResolveInfantryDamage(
      { unitType: UnitType.BATTLEMECH },
      {
        unitId: 'pl-1',
        state,
        rawDamage: 5,
        weaponCategory: 'energy',
      },
      () => {
        groundCalled = true;
        return { kind: 'ground' as const };
      },
    );
    expect(groundCalled).toBe(true);
    expect(result).toEqual({ kind: 'ground' });
  });
});

describe('dispatchResolveCriticalHitsForInfantry', () => {
  it('returns null for infantry targets (crits skipped)', () => {
    let groundCalled = false;
    const result = dispatchResolveCriticalHitsForInfantry(
      { unitType: UnitType.INFANTRY },
      () => {
        groundCalled = true;
        return [{ crit: true }];
      },
    );
    expect(result).toBeNull();
    expect(groundCalled).toBe(false);
  });

  it('delegates to onGround for non-infantry targets', () => {
    let groundCalled = false;
    const result = dispatchResolveCriticalHitsForInfantry(
      { unitType: UnitType.BATTLEMECH },
      () => {
        groundCalled = true;
        return [{ crit: true }];
      },
    );
    expect(groundCalled).toBe(true);
    expect(result).toEqual([{ crit: true }]);
  });
});
