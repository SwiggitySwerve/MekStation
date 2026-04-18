/**
 * Aerospace AI bot-behavior tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 12)
 */

import {
  buildAerospaceFiringPlan,
  decideAerospaceBotTurn,
  rankStrafeTargets,
  shouldAerospaceWithdraw,
} from '../aiBehavior';
import { createAerospaceCombatState } from '../state';

function mkState(overrides: Partial<{ si: number; fuel: number }> = {}) {
  return {
    ...createAerospaceCombatState({
      maxSI: 10,
      armorByArc: { nose: 10, leftWing: 10, rightWing: 10, aft: 10 },
      heatSinks: 10,
      fuelPoints: overrides.fuel ?? 20,
      safeThrust: 6,
      maxThrust: 9,
    }),
    currentSI: overrides.si ?? 10,
  };
}

describe('shouldAerospaceWithdraw', () => {
  it('destroyed unit never withdraws', () => {
    const r = shouldAerospaceWithdraw({ ...mkState(), destroyed: true });
    expect(r.shouldWithdraw).toBe(false);
  });

  it('SI ≤ 30% triggers withdraw', () => {
    const r = shouldAerospaceWithdraw(mkState({ si: 3 }));
    expect(r.shouldWithdraw).toBe(true);
    expect(r.reason).toMatch(/SI/);
  });

  it('fuel < 2 turns triggers withdraw', () => {
    // safeThrust=6 → cap=12 → burnPerTurn = max(1, 12/2)=6. fuel < 2*6=12
    const r = shouldAerospaceWithdraw(mkState({ si: 10, fuel: 5 }));
    expect(r.shouldWithdraw).toBe(true);
    expect(r.reason).toMatch(/fuel/);
  });

  it('healthy unit does not withdraw', () => {
    const r = shouldAerospaceWithdraw(mkState({ si: 10, fuel: 20 }));
    expect(r.shouldWithdraw).toBe(false);
  });
});

describe('rankStrafeTargets', () => {
  it('sorts alive targets by BV descending and drops dead ones', () => {
    const result = rankStrafeTargets([
      { unitId: 'a', bv: 1000, alive: true },
      { unitId: 'b', bv: 2500, alive: true },
      { unitId: 'c', bv: 999999, alive: false },
      { unitId: 'd', bv: 500, alive: true },
    ]);
    expect(result.map((t) => t.unitId)).toEqual(['b', 'a', 'd']);
  });
});

describe('buildAerospaceFiringPlan', () => {
  it('adds weapons until heat cap hit, greedy by expectedDamage', () => {
    const state = mkState({ si: 10 });
    // heat cap = 9 + heatSinks(10) = 19
    const plan = buildAerospaceFiringPlan(state, [
      { id: 'ppc', heat: 10, expectedDamage: 10 },
      { id: 'ml', heat: 3, expectedDamage: 5 },
      { id: 'srm', heat: 2, expectedDamage: 4 },
      { id: 'big', heat: 20, expectedDamage: 15 },
    ]);
    // sorted by dmg: big(heat=20 > cap → skip), ppc(heat=10 → +10=10 OK),
    // ml(+3=13 OK), srm(+2=15 OK)
    expect(plan.firingPlan).toEqual(['ppc', 'ml', 'srm']);
    // predictedHeat = (state.heat=0 + 10+3+2 = 15) then - heatSinks(10) = 5
    expect(plan.predictedHeat).toBe(5);
  });

  it('returns empty plan when nothing fits', () => {
    const state = { ...mkState({ si: 10 }), heatSinks: 0 };
    const plan = buildAerospaceFiringPlan(state, [
      { id: 'big', heat: 30, expectedDamage: 10 },
    ]);
    // cap = 9+0=9. big is 30 → skip.
    expect(plan.firingPlan.length).toBe(0);
  });
});

describe('decideAerospaceBotTurn', () => {
  it('returns a composite decision', () => {
    const d = decideAerospaceBotTurn({
      state: mkState({ si: 10, fuel: 20 }),
      groundTargets: [
        { unitId: 'a', bv: 1000, alive: true },
        { unitId: 'b', bv: 2500, alive: true },
      ],
      availableWeapons: [
        { id: 'ppc', heat: 10, expectedDamage: 10 },
        { id: 'ml', heat: 3, expectedDamage: 5 },
      ],
    });
    expect(d.shouldWithdraw).toBe(false);
    expect(d.strafeOrder[0].unitId).toBe('b');
    expect(d.firingPlan.length).toBeGreaterThan(0);
  });
});
