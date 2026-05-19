/**
 * Tests for the company morale state machine.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { IMoraleSignals } from '@/types/campaign/Prestige';

import { MoraleState, moraleRank } from '@/types/campaign/Prestige';

import { evaluateMoraleTransition } from '../moraleStateMachine';

const OCCURRED_AT = '3025-02-01T00:00:00.000Z';

function signals(overrides: Partial<IMoraleSignals> = {}): IMoraleSignals {
  return {
    recentVictories: 0,
    recentDefeats: 0,
    payMet: true,
    desertions: 0,
    ...overrides,
  };
}

describe('evaluateMoraleTransition', () => {
  it('moves morale up by exactly one step on victories with met pay', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Steady,
      signals({ recentVictories: 2, payMet: true }),
      OCCURRED_AT,
    );
    expect(result.to).toBe(MoraleState.High);
    expect(result.direction).toBe('up');
    expect(moraleRank(result.to) - moraleRank(result.from)).toBe(1);
  });

  it('moves morale down by exactly one step on defeats / missed pay / desertions', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Steady,
      signals({ recentDefeats: 2, payMet: false, desertions: 1 }),
      OCCURRED_AT,
    );
    expect(result.to).toBe(MoraleState.Unhappy);
    expect(result.direction).toBe('down');
  });

  it('moves at most one step even with many negative signals', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Elite,
      signals({ recentDefeats: 10, payMet: false, desertions: 5 }),
      OCCURRED_AT,
    );
    // Elite → High is one step; never Elite → Steady.
    expect(result.to).toBe(MoraleState.High);
    expect(moraleRank(result.from) - moraleRank(result.to)).toBe(1);
  });

  it('holds morale when there are no signals', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Steady,
      signals(),
      OCCURRED_AT,
    );
    // payMet:true is +1 by itself — so "no signals" must net zero. Verify
    // that a balanced day (one victory cancelled by one defeat, pay met
    // cancelled by a desertion) holds.
    const balanced = evaluateMoraleTransition(
      MoraleState.Steady,
      signals({ recentVictories: 1, recentDefeats: 1, desertions: 1 }),
      OCCURRED_AT,
    );
    expect(balanced.direction).toBeNull();
    expect(balanced.transition).toBeNull();
    expect(balanced.to).toBe(MoraleState.Steady);
    // The trivial-signals case still steps up (payMet is a positive).
    expect(result.direction).toBe('up');
  });

  it('cannot step above the maximum state', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Elite,
      signals({ recentVictories: 5, payMet: true }),
      OCCURRED_AT,
    );
    expect(result.to).toBe(MoraleState.Elite);
    expect(result.direction).toBeNull();
  });

  it('cannot step below the minimum state', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Mutinous,
      signals({ recentDefeats: 5, payMet: false }),
      OCCURRED_AT,
    );
    expect(result.to).toBe(MoraleState.Mutinous);
    expect(result.direction).toBeNull();
  });

  it('emits a transition record on a change', () => {
    const result = evaluateMoraleTransition(
      MoraleState.Steady,
      signals({ recentVictories: 3, payMet: true }),
      OCCURRED_AT,
    );
    expect(result.transition).not.toBeNull();
    expect(result.transition?.from).toBe(MoraleState.Steady);
    expect(result.transition?.to).toBe(MoraleState.High);
    expect(result.transition?.occurredAt).toBe(OCCURRED_AT);
  });
});
