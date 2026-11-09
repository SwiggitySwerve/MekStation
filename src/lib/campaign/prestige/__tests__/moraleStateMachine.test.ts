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
  it('moves morale up by exactly one step on victories', () => {
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
    // The helper's default is payMet: true, a day on which costs were paid.
    const result = evaluateMoraleTransition(
      MoraleState.Steady,
      signals(),
      OCCURRED_AT,
    );
    expect(result.direction).toBeNull();
    expect(result.transition).toBeNull();
    expect(result.to).toBe(MoraleState.Steady);

    // A balanced day also holds: one victory cancelled by one defeat.
    const balanced = evaluateMoraleTransition(
      MoraleState.Steady,
      signals({ recentVictories: 1, recentDefeats: 1 }),
      OCCURRED_AT,
    );
    expect(balanced.direction).toBeNull();
    expect(balanced.transition).toBeNull();
    expect(balanced.to).toBe(MoraleState.Steady);
  });

  // App-design rule (Root ruling for K-M4, not MekHQ parity): paid costs are
  // the baseline and score 0; only a missed payment scores, at -1.
  describe('met pay is the baseline (0); missed pay is -1', () => {
    it('does not raise morale by itself', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ payMet: true }),
        OCCURRED_AT,
      );

      expect(result.direction).toBeNull();
      expect(result.to).toBe(MoraleState.Steady);
    });

    it('lowers morale by itself when pay is missed', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ payMet: false }),
        OCCURRED_AT,
      );

      expect(result.direction).toBe('down');
      expect(result.to).toBe(MoraleState.Unhappy);
    });

    it('lets a victory raise morale whether or not the costs were paid', () => {
      for (const payMet of [true, null]) {
        const result = evaluateMoraleTransition(
          MoraleState.Steady,
          signals({ recentVictories: 1, payMet }),
          OCCURRED_AT,
        );
        expect(result.to).toBe(MoraleState.High);
      }
    });

    it('does not let paid costs soften a defeat', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentDefeats: 1, payMet: true }),
        OCCURRED_AT,
      );

      expect(result.to).toBe(MoraleState.Unhappy);
    });

    it('lets a victory and a missed payment cancel out', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentVictories: 1, payMet: false }),
        OCCURRED_AT,
      );

      expect(result.direction).toBeNull();
    });

    it('names a victory, not paid costs, as the reason for a rise', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentVictories: 2, payMet: true }),
        OCCURRED_AT,
      );

      expect(result.transition?.reason).toMatch(/victory/);
      expect(result.transition?.reason).not.toMatch(/pay/);
    });

    it('names missed pay as a reason for a fall', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ payMet: false }),
        OCCURRED_AT,
      );

      expect(result.transition?.reason).toMatch(/pay missed/);
    });
  });

  describe('a null pay signal (no costs event that day) is neutral', () => {
    it('holds morale when nothing else happened', () => {
      const result = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ payMet: null }),
        OCCURRED_AT,
      );

      expect(result.direction).toBeNull();
      expect(result.transition).toBeNull();
      expect(result.to).toBe(MoraleState.Steady);
    });

    it('lets a single victory raise morale, and a single defeat lower it', () => {
      const up = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentVictories: 1, payMet: null }),
        OCCURRED_AT,
      );
      const down = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentDefeats: 1, payMet: null }),
        OCCURRED_AT,
      );

      expect(up.to).toBe(MoraleState.High);
      expect(down.to).toBe(MoraleState.Unhappy);
    });

    it('does not claim pay was met or missed in the reason', () => {
      const up = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentVictories: 1, payMet: null }),
        OCCURRED_AT,
      );
      const down = evaluateMoraleTransition(
        MoraleState.Steady,
        signals({ recentDefeats: 1, payMet: null }),
        OCCURRED_AT,
      );

      expect(up.transition?.reason).not.toMatch(/pay/);
      expect(down.transition?.reason).not.toMatch(/pay/);
    });
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
