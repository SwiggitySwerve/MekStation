/**
 * Tests for the AI Heat Planner — multi-turn heat projection.
 *
 * Covers `add-ai-resource-planning` Requirement "Multi-Turn Heat Projection":
 * scenarios "Rising heat curve flags the shutdown turn", "Sustainable fire
 * list reports no risk", and the `heatLookaheadTurns: 0` skip path.
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Multi-Turn Heat Projection
 */

import {
  SHUTDOWN_RISK_HEAT,
  effectiveHeatBudget,
  projectHeat,
} from '../ai/AIHeatPlanner';

describe('AIHeatPlanner.projectHeat', () => {
  describe('rising heat curve flags the shutdown turn', () => {
    it('reports the first turn projected heat crosses the ceiling', () => {
      // Start at 8 heat, generate 12/turn, dissipate 6/turn → net +6/turn.
      // Turn 0: 8 + 6 = 14 (>= 14 ceiling). Shutdown predicted at turn 0.
      const projection = projectHeat(8, 6, 12, 4);
      expect(projection.perTurnHeat).toEqual([14, 20, 26, 32]);
      expect(projection.shutdownRiskTurn).toBe(0);
    });

    it('flags a shutdown a few turns out when the curve builds slowly', () => {
      // Start at 2, generate 9, dissipate 6 → net +3/turn.
      // Turn 0: 5, turn 1: 8, turn 2: 11, turn 3: 14 (>= ceiling).
      const projection = projectHeat(2, 6, 9, 5);
      expect(projection.perTurnHeat).toEqual([5, 8, 11, 14, 17]);
      expect(projection.shutdownRiskTurn).toBe(3);
    });
  });

  describe('sustainable fire list reports no risk', () => {
    it('returns shutdownRiskTurn -1 when generated <= dissipated', () => {
      // Net heat per turn is zero — the curve is flat at the start value.
      const projection = projectHeat(5, 10, 10, 4);
      expect(projection.perTurnHeat).toEqual([5, 5, 5, 5]);
      expect(projection.shutdownRiskTurn).toBe(-1);
    });

    it('returns -1 when the curve cools toward zero', () => {
      // Generate less than dissipated — heat falls and floors at zero.
      const projection = projectHeat(8, 10, 4, 3);
      expect(projection.perTurnHeat).toEqual([2, 0, 0]);
      expect(projection.shutdownRiskTurn).toBe(-1);
    });

    it('a curve that rises but stays under the ceiling reports -1', () => {
      // Net +2/turn from 4 → 6, 8, 10, 12 — never reaches 14.
      const projection = projectHeat(4, 4, 6, 4);
      expect(projection.perTurnHeat).toEqual([6, 8, 10, 12]);
      expect(projection.shutdownRiskTurn).toBe(-1);
    });
  });

  describe('heatLookaheadTurns: 0 skips projection entirely', () => {
    it('returns an empty projection with no risk', () => {
      const projection = projectHeat(20, 0, 30, 0);
      expect(projection.perTurnHeat).toEqual([]);
      expect(projection.shutdownRiskTurn).toBe(-1);
    });

    it('treats negative lookahead the same as zero', () => {
      const projection = projectHeat(20, 0, 30, -3);
      expect(projection.perTurnHeat).toEqual([]);
      expect(projection.shutdownRiskTurn).toBe(-1);
    });
  });

  describe('determinism — pure function of its arguments', () => {
    it('repeated calls with identical arguments are identical', () => {
      const a = projectHeat(8, 6, 12, 4);
      const b = projectHeat(8, 6, 12, 4);
      expect(a).toEqual(b);
    });
  });

  it('SHUTDOWN_RISK_HEAT is the canonical heat-14 ceiling', () => {
    expect(SHUTDOWN_RISK_HEAT).toBe(14);
  });
});

describe('AIHeatPlanner.effectiveHeatBudget', () => {
  it('passes the base budget through unchanged when no shutdown predicted', () => {
    const projection = projectHeat(4, 4, 6, 4); // never crosses ceiling
    expect(effectiveHeatBudget(13, projection, 4)).toBe(13);
  });

  it('lowers the budget when a shutdown is predicted in the window', () => {
    // Shutdown at turn 0 with a large overshoot — budget must drop.
    const projection = projectHeat(8, 6, 12, 4);
    expect(projection.shutdownRiskTurn).toBe(0);
    const lowered = effectiveHeatBudget(13, projection, 8);
    expect(lowered).toBeLessThan(13);
    // Never trimmed below the heat already on the track.
    expect(lowered).toBeGreaterThanOrEqual(8);
  });

  it('softens the correction for a more distant predicted shutdown', () => {
    // Two projections with the SAME overshoot at the shutdown turn but
    // predicted at different distances — the nearer one gets the harsher
    // budget reduction (proximity scales the correction down).
    // Near: start 14, +6/turn → turn 0 at 20 (overshoot 6).
    const nearTerm = projectHeat(14, 0, 6, 4);
    // Far: start 2, +9/turn → 11, 20 — shutdown turn 1, overshoot 6.
    const farTerm = projectHeat(2, 0, 9, 4);
    expect(nearTerm.shutdownRiskTurn).toBe(0);
    expect(farTerm.shutdownRiskTurn).toBe(1);
    const nearBudget = effectiveHeatBudget(20, nearTerm, 0);
    const farBudget = effectiveHeatBudget(20, farTerm, 0);
    expect(20 - nearBudget).toBeGreaterThan(20 - farBudget);
  });

  it('never lowers the budget below current heat', () => {
    // A unit already running hot (25 heat) with a high base budget. Even
    // with a predicted shutdown the budget must not be trimmed below the
    // heat already on the track — that would cull every weapon pointlessly.
    const projection = projectHeat(25, 5, 30, 3);
    expect(projection.shutdownRiskTurn).toBeGreaterThanOrEqual(0);
    const lowered = effectiveHeatBudget(40, projection, 25, 5, 0);
    expect(lowered).toBeGreaterThanOrEqual(25);
  });
});
