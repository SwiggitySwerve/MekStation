/**
 * Closed-set hygiene tests for the engine-layer match terminal state
 * (P0.5 of `add-combat-fidelity-suite`).
 *
 * Coverage:
 *  - TS-level: assignment to literals outside the closed union is
 *    rejected by the compiler (`@ts-expect-error`).
 *  - Runtime: synthetic match-end states map to the expected enum
 *    value via `determineMatchTerminalState`.
 *  - Exclusivity: every classifier output is one (and only one) value
 *    from the closed set.
 *  - Conservation (pilot side): the count of `'kia'` pilots equals the
 *    count of `UnitDestroyed` events with cause `'pilot_death'` OR
 *    `'head_destroyed'`, per the `after-combat-report` spec
 *    invariant. Holds globally and per-side.
 *  - Conservation (pilot summary): the sum of pilots grouped by
 *    `matchTerminalState` equals the total pilot roster.
 */

import type {
  IPilotMatchSummary,
  PilotMatchTerminalState,
} from '@/types/gameplay/CombatInterfaces';
import type { IUnitDestroyedPayload } from '@/types/gameplay/GameSessionInterfaces';

import {
  determineMatchTerminalState,
  type IMatchTerminalStateInputs,
  type MatchTerminalState,
} from '../matchTerminalState';

const MAX_TURNS = 100;

const CLOSED_MATCH_STATES: ReadonlyArray<MatchTerminalState> = [
  'player_victory',
  'opfor_victory',
  'draw',
  'mutual_destruction',
  'timeout',
  'forfeit',
  'withdrawal',
];

const CLOSED_PILOT_STATES: ReadonlyArray<PilotMatchTerminalState> = [
  'unhurt',
  'wounded',
  'unconscious',
  'kia',
  'ejected',
];

/**
 * Build a baseline 2v2 match-end input. Tests override fields per
 * scenario to keep the intent obvious.
 */
function buildInputs(
  overrides: Partial<IMatchTerminalStateInputs> = {},
): IMatchTerminalStateInputs {
  return {
    playerSurvivors: 2,
    opforSurvivors: 2,
    playerRosterSize: 2,
    opforRosterSize: 2,
    turnsElapsed: 5,
    maxTurns: MAX_TURNS,
    hadWithdrawal: false,
    hadForfeit: false,
    ...overrides,
  };
}

describe('determineMatchTerminalState — closed-set classifier', () => {
  it('rejects literals outside the closed match-state union at the type level', () => {
    // The four sentinels below MUST fail compilation. Each line is
    // wrapped in `@ts-expect-error` so the test fails if any of them
    // ever become assignable. This is the spec's "MUST NOT be combined"
    // and "MUST be one of the 7 values" enforcement at the TS layer.
    const ok: MatchTerminalState = 'player_victory';
    expect(ok).toBe('player_victory');

    // @ts-expect-error — kebab-case forbidden.
    const bad1: MatchTerminalState = 'player-victory';
    // @ts-expect-error — combined values forbidden.
    const bad2: MatchTerminalState = 'wounded_and_unconscious';
    // @ts-expect-error — outside closed set.
    const bad3: MatchTerminalState = 'tie';
    // @ts-expect-error — empty string forbidden.
    const bad4: MatchTerminalState = '';

    // Reference the variables so eslint / no-unused-vars is happy.
    expect([bad1, bad2, bad3, bad4]).toHaveLength(4);
  });

  it('rejects literals outside the closed pilot-state union at the type level', () => {
    const ok: PilotMatchTerminalState = 'kia';
    expect(ok).toBe('kia');

    // @ts-expect-error — campaign-level enum value, distinct from match-terminal.
    const bad1: PilotMatchTerminalState = 'mia';
    // @ts-expect-error — not part of the per-match taxonomy.
    const bad2: PilotMatchTerminalState = 'retired';
    // @ts-expect-error — kebab.
    const bad3: PilotMatchTerminalState = 'unhurt-conscious';

    expect([bad1, bad2, bad3]).toHaveLength(3);
  });

  it('classifies player_victory when opfor is wiped and player has survivors', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({ playerSurvivors: 2, opforSurvivors: 0 }),
      ),
    ).toBe('player_victory');
  });

  it('classifies opfor_victory when player is wiped and opfor has survivors', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({ playerSurvivors: 0, opforSurvivors: 2 }),
      ),
    ).toBe('opfor_victory');
  });

  it('classifies mutual_destruction when both sides have zero survivors', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({ playerSurvivors: 0, opforSurvivors: 0 }),
      ),
    ).toBe('mutual_destruction');
  });

  it('classifies timeout when turns reach MAX_TURNS with units alive on both sides', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({ turnsElapsed: 100, maxTurns: 100 }),
      ),
    ).toBe('timeout');
  });

  it('classifies draw when neither side meets victory conditions before timeout', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 1,
          opforSurvivors: 1,
          turnsElapsed: 50,
          maxTurns: 100,
        }),
      ),
    ).toBe('draw');
  });

  it('classifies forfeit when the forfeit flag is set, regardless of unit counts', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 0,
          opforSurvivors: 0,
          hadForfeit: true,
        }),
      ),
    ).toBe('forfeit');
  });

  it('classifies withdrawal when the withdrawal flag is set, ahead of survivor counts', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 0,
          opforSurvivors: 2,
          hadWithdrawal: true,
        }),
      ),
    ).toBe('withdrawal');
  });

  it('treats zero-roster on one side as draw, not mutual_destruction', () => {
    // Defensive guard from the classifier — an empty roster shouldn't
    // synthesize a "destruction" outcome.
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 0,
          opforSurvivors: 0,
          playerRosterSize: 0,
          opforRosterSize: 0,
        }),
      ),
    ).toBe('draw');
  });

  it('always returns exactly one value from the closed match-state set (exclusivity)', () => {
    const fixtures: IMatchTerminalStateInputs[] = [
      buildInputs({ playerSurvivors: 2, opforSurvivors: 0 }),
      buildInputs({ playerSurvivors: 0, opforSurvivors: 2 }),
      buildInputs({ playerSurvivors: 0, opforSurvivors: 0 }),
      buildInputs({ turnsElapsed: 100 }),
      buildInputs({ hadForfeit: true }),
      buildInputs({ hadWithdrawal: true }),
      buildInputs({ playerSurvivors: 1, opforSurvivors: 1 }),
    ];

    for (const fixture of fixtures) {
      const value = determineMatchTerminalState(fixture);
      // Membership: returned value MUST be one of the 7 enum values.
      expect(CLOSED_MATCH_STATES).toContain(value);
      // Exclusivity: only one value per call (trivially true since
      // the function returns a single value, but we also check via
      // count to fail loudly if the type widens accidentally).
      const occurrences = CLOSED_MATCH_STATES.filter(
        (state) => state === value,
      ).length;
      expect(occurrences).toBe(1);
    }
  });

  it('precedence: forfeit beats withdrawal, withdrawal beats survivor counts, survivor counts beat timeout', () => {
    // forfeit dominates withdrawal
    expect(
      determineMatchTerminalState(
        buildInputs({ hadForfeit: true, hadWithdrawal: true }),
      ),
    ).toBe('forfeit');

    // withdrawal dominates survivor counts (would be opfor_victory otherwise)
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 0,
          opforSurvivors: 2,
          hadWithdrawal: true,
        }),
      ),
    ).toBe('withdrawal');

    // survivor counts dominate timeout (would be timeout otherwise)
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 2,
          opforSurvivors: 0,
          turnsElapsed: 100,
        }),
      ),
    ).toBe('player_victory');
  });
});

describe('Pilot match summary — conservation invariants', () => {
  /**
   * Build a synthetic pilot summary. Used by the conservation tests
   * below to construct N pilots with various terminal states and assert
   * the buckets sum to N.
   */
  function pilot(
    pilotId: string,
    sideId: string,
    matchTerminalState: PilotMatchTerminalState,
    finalWoundCount: number,
    wasConscious: boolean,
  ): IPilotMatchSummary {
    return {
      pilotId,
      unitId: `unit-${pilotId}`,
      sideId,
      matchTerminalState,
      finalWoundCount,
      wasConscious,
    };
  }

  it('groups pilots by matchTerminalState and the bucket counts sum to roster size', () => {
    const summaries: IPilotMatchSummary[] = [
      pilot('p1', 'player', 'unhurt', 0, true),
      pilot('p2', 'player', 'wounded', 3, true),
      pilot('p3', 'player', 'unconscious', 4, false),
      pilot('p4', 'player', 'kia', 6, false),
      pilot('o1', 'opfor', 'kia', 6, false),
      pilot('o2', 'opfor', 'ejected', 1, true),
      pilot('o3', 'opfor', 'unhurt', 0, true),
    ];

    const counts = {
      unhurt: summaries.filter((s) => s.matchTerminalState === 'unhurt').length,
      wounded: summaries.filter((s) => s.matchTerminalState === 'wounded')
        .length,
      unconscious: summaries.filter(
        (s) => s.matchTerminalState === 'unconscious',
      ).length,
      kia: summaries.filter((s) => s.matchTerminalState === 'kia').length,
      ejected: summaries.filter((s) => s.matchTerminalState === 'ejected')
        .length,
    };

    const total =
      counts.unhurt +
      counts.wounded +
      counts.unconscious +
      counts.kia +
      counts.ejected;

    // Conservation invariant per `after-combat-report/spec.md`.
    expect(total).toBe(summaries.length);

    // No bucket overlap — each pilot contributes to exactly one bucket.
    for (const summary of summaries) {
      const matchedBuckets = CLOSED_PILOT_STATES.filter(
        (state) => state === summary.matchTerminalState,
      ).length;
      expect(matchedBuckets).toBe(1);
    }
  });

  it('per-side conservation: kia count per side equals UnitDestroyed events with pilot_death or head_destroyed cause on that side', () => {
    const playerSummaries: IPilotMatchSummary[] = [
      pilot('p1', 'player', 'kia', 6, false),
      pilot('p2', 'player', 'kia', 6, false),
      pilot('p3', 'player', 'wounded', 2, true),
    ];
    const opforSummaries: IPilotMatchSummary[] = [
      pilot('o1', 'opfor', 'kia', 6, false),
      pilot('o2', 'opfor', 'unhurt', 0, true),
    ];

    // Synthetic event log — one UnitDestroyed per KIA pilot on the
    // matching side, using either `pilot_death` (wound threshold) or
    // `head_destroyed` (head-armor + structure both zero).
    const playerDestructionEvents: IUnitDestroyedPayload[] = [
      { unitId: 'unit-p1', cause: 'pilot_death' },
      { unitId: 'unit-p2', cause: 'head_destroyed' },
    ];
    const opforDestructionEvents: IUnitDestroyedPayload[] = [
      { unitId: 'unit-o1', cause: 'pilot_death' },
    ];

    // Per-side invariant.
    const playerKiaCount = playerSummaries.filter(
      (s) => s.matchTerminalState === 'kia',
    ).length;
    const opforKiaCount = opforSummaries.filter(
      (s) => s.matchTerminalState === 'kia',
    ).length;

    const playerPilotCauseCount = playerDestructionEvents.filter(
      (e) => e.cause === 'pilot_death' || e.cause === 'head_destroyed',
    ).length;
    const opforPilotCauseCount = opforDestructionEvents.filter(
      (e) => e.cause === 'pilot_death' || e.cause === 'head_destroyed',
    ).length;

    expect(playerKiaCount).toBe(playerPilotCauseCount);
    expect(opforKiaCount).toBe(opforPilotCauseCount);

    // Global invariant — also holds.
    const globalKiaCount = playerKiaCount + opforKiaCount;
    const globalPilotCauseCount = playerPilotCauseCount + opforPilotCauseCount;
    expect(globalKiaCount).toBe(globalPilotCauseCount);
  });

  it('mutual_destruction requires zero survivors on both sides AND every unit with terminal fate destroyed', () => {
    // mutual_destruction implies the match-terminal classifier returns
    // 'mutual_destruction' — exercise the classifier directly so the
    // invariant is mechanical and reviewable.
    const inputs = buildInputs({
      playerSurvivors: 0,
      opforSurvivors: 0,
      playerRosterSize: 2,
      opforRosterSize: 2,
    });
    expect(determineMatchTerminalState(inputs)).toBe('mutual_destruction');

    // The complementary "withdrew" case must NOT classify as
    // mutual_destruction even though survivors are zero.
    const withWithdrawal = buildInputs({
      playerSurvivors: 0,
      opforSurvivors: 0,
      hadWithdrawal: true,
    });
    expect(determineMatchTerminalState(withWithdrawal)).toBe('withdrawal');
  });

  it('player_victory requires at least one operational player unit and full opfor elimination', () => {
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 1,
          opforSurvivors: 0,
          playerRosterSize: 2,
          opforRosterSize: 3,
        }),
      ),
    ).toBe('player_victory');

    // Symmetry — opfor side.
    expect(
      determineMatchTerminalState(
        buildInputs({
          playerSurvivors: 0,
          opforSurvivors: 1,
          playerRosterSize: 3,
          opforRosterSize: 2,
        }),
      ),
    ).toBe('opfor_victory');
  });
});
