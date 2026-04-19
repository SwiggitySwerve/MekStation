/**
 * Platoon barrage firepower tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §6 (Platoon Fire Resolution)
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import { computePlatoonFirepower, firingTrooperCount } from '../platoonFire';
import { createInfantryCombatState } from '../state';

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    ...createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    }),
    ...overrides,
  };
}

describe('firingTrooperCount', () => {
  it('returns surviving troopers minus field-gun crew', () => {
    const s = baseState({ survivingTroopers: 20, fieldGunCrew: 3 });
    expect(firingTrooperCount(s)).toBe(17);
  });

  it('returns 0 when pinned', () => {
    const s = baseState({ survivingTroopers: 20, pinned: true });
    expect(firingTrooperCount(s)).toBe(0);
  });

  it('returns 0 when routed', () => {
    const s = baseState({ survivingTroopers: 20, routed: true });
    expect(firingTrooperCount(s)).toBe(0);
  });

  it('returns 0 when destroyed', () => {
    const s = baseState({ survivingTroopers: 0, destroyed: true });
    expect(firingTrooperCount(s)).toBe(0);
  });

  it('clamps negatives to 0 when crew > surviving', () => {
    const s = baseState({ survivingTroopers: 2, fieldGunCrew: 5 });
    expect(firingTrooperCount(s)).toBe(0);
  });
});

describe('computePlatoonFirepower', () => {
  it('primary only: floor(20 × 0.26 / 1) = 5', () => {
    const s = baseState({ survivingTroopers: 20 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 0.26, divisor: 1 },
    });
    expect(r.firingTroopers).toBe(20);
    expect(r.primaryDamage).toBe(5);
    expect(r.secondaryDamage).toBe(0);
    expect(r.totalDamage).toBe(5);
  });

  it('uses primary divisor correctly: 28 × 1 / 2 = 14', () => {
    const s = baseState({ survivingTroopers: 28 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 1, divisor: 2 },
    });
    expect(r.primaryDamage).toBe(14);
  });

  it('secondary weapon with ratio 1-per-7 adds extra damage', () => {
    // 28 troopers: 28/7 = 4 secondary shooters × 0.5 / 1 = 2 extra damage
    const s = baseState({ survivingTroopers: 28 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 0.26, divisor: 1 },
      secondary: { rating: 0.5, divisor: 1 },
      secondaryRatio: 7,
    });
    expect(r.primaryDamage).toBe(7); // floor(28 × 0.26) = 7
    expect(r.secondaryDamage).toBe(2);
    expect(r.totalDamage).toBe(9);
  });

  it('zero firing troopers → zero damage', () => {
    const s = baseState({ survivingTroopers: 10, pinned: true });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 1, divisor: 1 },
    });
    expect(r.firingTroopers).toBe(0);
    expect(r.totalDamage).toBe(0);
  });

  it('field-gun crew excluded from barrage', () => {
    const s = baseState({ survivingTroopers: 20, fieldGunCrew: 5 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 1, divisor: 1 },
    });
    expect(r.firingTroopers).toBe(15);
    expect(r.primaryDamage).toBe(15);
  });

  it('zero or missing divisor defaults to 1 (no crash)', () => {
    const s = baseState({ survivingTroopers: 10 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 1, divisor: 0 },
    });
    expect(r.primaryDamage).toBe(10);
  });

  it('secondary ignored if ratio is 0 or undefined', () => {
    const s = baseState({ survivingTroopers: 28 });
    const r = computePlatoonFirepower({
      state: s,
      primary: { rating: 0.26, divisor: 1 },
      secondary: { rating: 1, divisor: 1 },
      secondaryRatio: 0,
    });
    expect(r.secondaryDamage).toBe(0);
  });
});
