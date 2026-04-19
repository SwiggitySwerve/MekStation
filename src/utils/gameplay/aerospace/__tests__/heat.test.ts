/**
 * Aerospace heat tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 10)
 */

import {
  AERO_HEAT_AUTO_SHUTDOWN_THRESHOLD,
  AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD,
  AERO_HEAT_THRUST_PENALTY_THRESHOLD,
  classifyAerospaceHeat,
  resolveAerospaceHeat,
} from '../heat';
import { createAerospaceCombatState } from '../state';

function mkState(heat = 0, heatSinks = 10, thrustPenalty = 0) {
  return {
    ...createAerospaceCombatState({
      maxSI: 6,
      armorByArc: { nose: 10, leftWing: 10, rightWing: 10, aft: 10 },
      heatSinks,
      fuelPoints: 20,
      safeThrust: 6,
      maxThrust: 9,
    }),
    heat,
    thrustPenalty,
  };
}

describe('classifyAerospaceHeat — thresholds', () => {
  it('heat below penalty threshold → no effect', () => {
    const e = classifyAerospaceHeat(AERO_HEAT_THRUST_PENALTY_THRESHOLD - 1);
    expect(e.thrustPenalty).toBe(0);
    expect(e.shutdownCheckRequired).toBe(false);
    expect(e.autoShutdown).toBe(false);
  });

  it('heat at penalty threshold → -1 thrust', () => {
    const e = classifyAerospaceHeat(AERO_HEAT_THRUST_PENALTY_THRESHOLD);
    expect(e.thrustPenalty).toBe(1);
    expect(e.shutdownCheckRequired).toBe(false);
  });

  it('heat at shutdown-check threshold → -1 thrust + check TN=10', () => {
    const e = classifyAerospaceHeat(AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD);
    expect(e.thrustPenalty).toBe(1);
    expect(e.shutdownCheckRequired).toBe(true);
    expect(e.shutdownCheckTN).toBe(10);
  });

  it('heat at shutdown-check threshold + 3 → check TN=13', () => {
    const e = classifyAerospaceHeat(AERO_HEAT_SHUTDOWN_CHECK_THRESHOLD + 3);
    expect(e.shutdownCheckTN).toBe(13);
  });

  it('heat at auto-shutdown threshold → autoShutdown=true, penalty=2', () => {
    const e = classifyAerospaceHeat(AERO_HEAT_AUTO_SHUTDOWN_THRESHOLD);
    expect(e.autoShutdown).toBe(true);
    expect(e.thrustPenalty).toBe(2);
  });
});

describe('resolveAerospaceHeat — apply generation + dissipation', () => {
  it('heat dissipates by heatSinks each turn', () => {
    const state = mkState(5, 10);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 3, // 5+3-10 = -2 → clamps to 0
    });
    expect(r.state.heat).toBe(0);
    expect(r.effect.thrustPenalty).toBe(0);
  });

  it('heat 0 + 12 generated - 10 sinks = 2; no penalty', () => {
    const state = mkState(0, 10);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 12,
    });
    expect(r.state.heat).toBe(2);
    expect(r.effect.thrustPenalty).toBe(0);
  });

  it('heat 5 + 10 generated - 5 sinks = 10 → thrust penalty 1', () => {
    const state = mkState(5, 5);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 10,
    });
    expect(r.state.heat).toBe(10);
    expect(r.effect.thrustPenalty).toBe(1);
    expect(r.state.thrustPenalty).toBe(1);
  });

  it('shutdown check fails when 2d6 < TN', () => {
    // heat=15 → TN=10. Use roller returning 1 → 2d6=2 → fails.
    const state = mkState(15, 0);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 0,
      diceRoller: () => 1,
    });
    expect(r.effect.shutdownCheckRequired).toBe(true);
    expect(r.shutdownCheckFailed).toBe(true);
    expect(r.shutdownCheckDice).toEqual([1, 1]);
  });

  it('shutdown check passes when 2d6 >= TN', () => {
    const state = mkState(15, 0);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 0,
      diceRoller: () => 6,
    });
    expect(r.effect.shutdownCheckRequired).toBe(true);
    expect(r.shutdownCheckFailed).toBe(false);
  });

  it('auto-shutdown threshold skips the dice roll', () => {
    const state = mkState(25, 0);
    const r = resolveAerospaceHeat({
      state,
      heatGeneratedThisTurn: 0,
    });
    expect(r.effect.autoShutdown).toBe(true);
    expect(r.effect.shutdownCheckRequired).toBe(false);
  });
});
