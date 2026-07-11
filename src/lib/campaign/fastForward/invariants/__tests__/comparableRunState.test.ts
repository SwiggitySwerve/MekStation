/**
 * `assertRunStatesEqual` failure-shape tests (design D7 anti-tautology rule
 * 2, spec "Live-Parity Acceptance on Seam Invariants" scenario "Divergence
 * carries the recorded consequence").
 *
 * Why this file exists (W3 group 6 spec-coverage audit finding): the 5.2
 * and 5.3 integration suites only ever exercise the PASSING branch of
 * `assertRunStatesEqual` (both runs happen to agree) — the spec's
 * "Divergence carries the recorded consequence" scenario is a claim about
 * what happens when they DON'T, and nothing constructed two deliberately
 * divergent `ComparableRunState` snapshots to prove the thrown message
 * actually names the diverging field and appends the council-consequence
 * text. This is that missing case, isolated at the comparator's own unit
 * level (deliberately-violated-fixture style, matching the invariants/
 * suite's own convention) rather than fought through a live end-to-end run.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */
import { describe, expect, it } from '@jest/globals';

import {
  assertRunStatesEqual,
  type ComparableRunState,
} from '../comparableRunState';

/** A minimal, internally-consistent baseline state — every field populated so field-substitution tests stay realistic. */
function makeBaselineState(): ComparableRunState {
  return {
    battles: [
      {
        scenarioId: 'scenario-1',
        contractId: 'contract-1',
        winner: 'Player',
        endReason: 'Victory',
        unitDeltas: [
          {
            unitId: 'player-0-atlas-as7-d',
            side: 'Player',
            destroyed: false,
            finalStatus: 'Active',
            armorRemaining: { CT: 10 },
            internalsRemaining: { CT: 5 },
          },
        ],
      },
    ],
    balanceDeltaCents: 5_000,
    transactions: [{ type: 'Income', amountCents: 10_000 }],
    xpCounters: [
      {
        unitId: 'ff-roster-unit-1',
        xp: 4,
        campaignXpEarned: 4,
        campaignKills: 1,
        campaignMissions: 1,
      },
    ],
    contractStatuses: [{ contractId: 'contract-1', status: 'Fulfilled' }],
    repairTickets: [{ kind: 'ArmorRepair', count: 2 }],
  };
}

describe('assertRunStatesEqual', () => {
  it('passes when two independently-built states are equal on every seam invariant field', () => {
    const a = makeBaselineState();
    const b = makeBaselineState();
    expect(() => assertRunStatesEqual(a, b)).not.toThrow();
  });

  it('throws naming the diverging field when balanceDeltaCents differs', () => {
    const a = makeBaselineState();
    const b: ComparableRunState = {
      ...makeBaselineState(),
      balanceDeltaCents: 4_999,
    };
    expect(() => assertRunStatesEqual(a, b)).toThrow(
      /seam invariant "balanceDeltaCents" diverged/,
    );
  });

  it('throws naming the diverging field when xpCounters differs, and reports both sides’ values', () => {
    const a = makeBaselineState();
    const b: ComparableRunState = {
      ...makeBaselineState(),
      xpCounters: [{ ...makeBaselineState().xpCounters[0]!, xp: 999 }],
    };
    expect(() =>
      assertRunStatesEqual(a, b, { labelA: 'run A', labelB: 'run B' }),
    ).toThrow(
      /seam invariant "xpCounters" diverged between run A and run B[\s\S]*run A\.xpCounters[\s\S]*run B\.xpCounters/,
    );
  });

  it('appends the supplied council-consequence text to the thrown message (design D7 anti-tautology rule 2)', () => {
    const a = makeBaselineState();
    const b: ComparableRunState = {
      ...makeBaselineState(),
      balanceDeltaCents: 0,
    };
    expect(() =>
      assertRunStatesEqual(a, b, {
        consequenceMessage:
          'Scenario packs minted from fast-forward runs remain triage-only until the acceptance is green again.',
      }),
    ).toThrow(
      /Scenario packs minted from fast-forward runs remain triage-only/,
    );
  });

  it('reports the FIRST diverging field in declaration order, never masking it behind a later one', () => {
    const a = makeBaselineState();
    // Both `battles` (earlier in SEAM_INVARIANT_FIELDS) and `transactions`
    // (later) diverge — the thrown message must name `battles`, not
    // `transactions`, proving the comparator stops at the first mismatch
    // rather than reporting an arbitrary or last-checked field.
    const b: ComparableRunState = {
      ...makeBaselineState(),
      battles: [],
      transactions: [{ type: 'Expense', amountCents: 1 }],
    };
    expect(() => assertRunStatesEqual(a, b)).toThrow(
      /seam invariant "battles" diverged/,
    );
  });
});
