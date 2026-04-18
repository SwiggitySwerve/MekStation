/**
 * Aerospace damage chain tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import { aerospaceResolveDamage } from '../damage';
import { AerospaceEventType } from '../events';
import { createAerospaceCombatState } from '../state';

function makeState(
  overrides: Partial<{
    nose: number;
    aft: number;
    si: number;
    fuel: number;
  }> = {},
) {
  return createAerospaceCombatState({
    maxSI: overrides.si ?? 6,
    armorByArc: {
      nose: overrides.nose ?? 20,
      leftWing: 15,
      rightWing: 15,
      aft: overrides.aft ?? 10,
    },
    heatSinks: 10,
    fuelPoints: overrides.fuel ?? 20,
    safeThrust: 6,
    maxThrust: 9,
  });
}

// Deterministic D6 roller that returns 5 every time.
// - 2d6 = 10 → control roll passes (10 + pilot 4 = 14 ≥ TN 8)
// - Crit slot 10-11 = `controlSurfaces` (no SI change, no destruction)
// Tests that specifically need a pass/fail or specific crit category override
// this with their own roller.
const alwaysPass = () => 5;

describe('aerospaceResolveDamage — armor absorption', () => {
  it('15 damage vs Nose 20 armor reduces nose to 5, no SI loss', () => {
    const state = makeState();
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 15,
      diceRoller: alwaysPass,
    });
    expect(r.state.armorByArc.nose).toBe(5);
    expect(r.state.currentSI).toBe(6);
    expect(r.armorAbsorbed).toBe(15);
    expect(r.siLost).toBe(0);
  });
});

describe('aerospaceResolveDamage — SI reduction', () => {
  it('20 damage after armor is 0 reduces SI by 2 (floor(20/10))', () => {
    const state = makeState({ nose: 0 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 20,
      diceRoller: alwaysPass,
    });
    expect(r.state.currentSI).toBe(4);
    expect(r.siLost).toBeGreaterThanOrEqual(2);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.SI_REDUCED),
    ).toBeDefined();
  });

  it('9 damage vs 0 armor adds no SI loss (floor(9/10) = 0)', () => {
    const state = makeState({ nose: 0, si: 6 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 9,
      diceRoller: alwaysPass,
    });
    // Pre-hit SI was 6; 9 > 0.6 triggers control roll. With alwaysPass, +1 pilot skill 4
    // roll 6+6=12 + 4 + floor(9/5)=1 = 17. Passes. So no penalty SI damage applied.
    expect(r.state.currentSI).toBe(6);
  });
});

describe('aerospaceResolveDamage — destruction', () => {
  it('damage that drives SI to 0 destroys the unit', () => {
    const state = makeState({ nose: 0, si: 1 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 20,
      diceRoller: alwaysPass,
    });
    expect(r.state.destroyed).toBe(true);
    expect(r.state.currentSI).toBe(0);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.UNIT_DESTROYED),
    ).toBeDefined();
    expect(r.destroyedThisHit).toBe(true);
  });
});

describe('aerospaceResolveDamage — control roll trigger', () => {
  it('damage > 0.1 × currentSI triggers a control roll', () => {
    // SI = 10 → threshold is 1.0. A 3-damage hit triggers the roll.
    const state = makeState({ nose: 0, si: 10 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 3,
      diceRoller: alwaysPass,
    });
    expect(r.controlRollTriggered).toBe(true);
    expect(r.controlRoll).toBeDefined();
    expect(
      r.events.find((e) => e.type === AerospaceEventType.CONTROL_ROLL),
    ).toBeDefined();
  });

  it('damage ≤ 0.1 × currentSI does NOT trigger a control roll', () => {
    const state = makeState({ nose: 100, si: 10 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 1,
      diceRoller: alwaysPass,
    });
    expect(r.controlRollTriggered).toBe(false);
    expect(r.controlRoll).toBeUndefined();
  });

  it('failed control roll costs +1 SI and +1 thrust penalty', () => {
    // Roller that always returns 1 → 2d6 = 2. Pilot skill 4 + mod = low. TN=8.
    const alwaysFail = () => 1;
    const state = makeState({ nose: 0, si: 10 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 3, // excess 3 → 0 SI from floor(3/10), control roll applies +1 SI
      pilotSkill: 0,
      diceRoller: alwaysFail,
    });
    expect(r.controlRoll?.passed).toBe(false);
    expect(r.state.currentSI).toBe(9); // lost 1 to failure
    expect(r.state.thrustPenalty).toBe(1);
  });
});

describe('aerospaceResolveDamage — no arc-to-arc transfer', () => {
  it('excess SI damage does not leak into other arcs', () => {
    const state = makeState({ nose: 5, aft: 10 });
    const r = aerospaceResolveDamage({
      unitId: 'asf-1',
      state,
      arc: AerospaceArc.NOSE,
      damage: 50, // 5 armor absorbs, 45 → SI loss 4
      diceRoller: alwaysPass,
    });
    expect(r.state.armorByArc.nose).toBe(0);
    expect(r.state.armorByArc.aft).toBe(10); // unchanged
    expect(r.state.currentSI).toBeLessThan(6);
  });
});
