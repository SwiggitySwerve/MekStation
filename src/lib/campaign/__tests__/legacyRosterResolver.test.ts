/**
 * T1 legacy roster match: never invents an attribution. A design that
 * fought more than once in one battle needs per-delta pilot agreement; a
 * force-record or design candidate whose current pilot disagrees with the
 * delta's pilot is conflicting evidence; there is no bare roster-pool
 * fallback; and two deltas claiming one roster unit are both refused.
 */
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { UNKNOWN_PILOT_REF } from '@/lib/campaign/pilotRefPlaceholder';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { resolveLegacyBattleUnitManifest } from '../legacyRosterResolver';

const TEAM = 'team-force-1';
const SCENARIO = `scn-contract-1-3025-06-14-${TEAM}`;

function campaignWithTeam(unitIds: readonly string[]) {
  return {
    forces: new Map([
      [
        TEAM,
        { id: TEAM, name: 'Team', subForceIds: [], unitIds: [...unitIds] },
      ],
    ]) as never,
  };
}

function roster(
  ...units: readonly [unitId: string, unitRef: string, pilotId?: string][]
): IRosterUnitProjection[] {
  return units.map(([unitId, unitRef, pilotId]) => ({
    unitId,
    unitName: unitId,
    unitRef,
    ...(pilotId ? { pilotId } : {}),
  })) as unknown as IRosterUnitProjection[];
}

function player(unitId: string, unitRef: string, pilotRef?: string) {
  return {
    unitId,
    unitRef,
    side: GameSide.Player,
    ...(pilotRef ? { pilotRef } : {}),
  };
}

describe('resolveLegacyBattleUnitManifest', () => {
  it('maps a design that fought once through the force record', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a']),
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({
      'player-1-atlas-as7-d': { rosterUnitId: 'roster-a' },
    });
  });

  it('never resolves a design that fought twice by force or design alone', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a']),
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [
          player('player-1-atlas-as7-d', 'atlas-as7-d'),
          player('player-2-atlas-as7-d', 'atlas-as7-d'),
        ],
      },
    );
    expect(result.manifest).toEqual({});
    expect(Object.keys(result.unresolved).sort()).toEqual([
      'player-1-atlas-as7-d',
      'player-2-atlas-as7-d',
    ]);
  });

  it('resolves a design that fought twice when each delta agrees with one pilot', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a', 'roster-b']),
      roster(
        ['roster-a', 'atlas-as7-d', 'pilot-a'],
        ['roster-b', 'atlas-as7-d', 'pilot-b'],
      ),
      {
        scenarioId: SCENARIO,
        unitDeltas: [
          player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-b'),
          player('player-2-atlas-as7-d', 'atlas-as7-d', 'pilot-a'),
        ],
      },
    );
    expect(result.manifest).toEqual({
      'player-1-atlas-as7-d': { rosterUnitId: 'roster-b' },
      'player-2-atlas-as7-d': { rosterUnitId: 'roster-a' },
    });
  });

  it('treats a force-record unit whose current pilot disagrees as conflicting evidence', () => {
    // Atlas B fought (pilot-b); afterwards Atlas A (pilot-a) replaced it.
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a']),
      roster(
        ['roster-a', 'atlas-as7-d', 'pilot-a'],
        ['roster-b', 'atlas-as7-d', 'pilot-b'],
      ),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-b')],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']).toEqual({
      reason: 'conflicting-pilot',
      candidates: ['roster-a'],
    });
  });

  it('treats a unique-design unit whose current pilot disagrees as conflicting evidence', () => {
    const result = resolveLegacyBattleUnitManifest(
      { forces: new Map() as never },
      roster(['roster-a', 'atlas-as7-d', 'pilot-a']),
      {
        scenarioId: null,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-b')],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']?.reason).toBe(
      'conflicting-pilot',
    );
  });

  it('has no roster-pool fallback: one design, two roster units, no evidence', () => {
    const result = resolveLegacyBattleUnitManifest(
      { forces: new Map() as never },
      roster(['roster-a', 'atlas-as7-d'], ['roster-b', 'atlas-as7-d']),
      {
        scenarioId: null,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']).toEqual({
      reason: 'ambiguous',
      candidates: ['roster-a', 'roster-b'],
    });
  });

  it('refuses both deltas when two of them claim one roster unit', () => {
    const result = resolveLegacyBattleUnitManifest(
      { forces: new Map() as never },
      roster(['roster-a', 'atlas-as7-d', 'pilot-a']),
      {
        scenarioId: null,
        unitDeltas: [
          player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-a'),
          player('player-2-atlas-as7-d', 'atlas-as7-d', 'pilot-a'),
        ],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']?.reason).toBe(
      'double-claim',
    );
  });
});

describe('resolveLegacyBattleUnitManifest review round 3', () => {
  it('N4 (probe B2): a pilot now linked to another roster unit is conflicting evidence, even against a pilotless candidate', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-b']),
      roster(
        ['roster-a', 'atlas-as7-d', 'pilot-p'],
        ['roster-b', 'atlas-as7-d'],
      ),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-p')],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']?.reason).toBe(
      'conflicting-pilot',
    );
  });

  it('N5 (probe B3): a design that fought twice is attributed all or none', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a', 'roster-b']),
      roster(
        ['roster-a', 'atlas-as7-d', 'pilot-q'],
        ['roster-b', 'atlas-as7-d', 'pilot-p'],
      ),
      {
        scenarioId: SCENARIO,
        unitDeltas: [
          player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-p'),
          player('player-2-atlas-as7-d', 'atlas-as7-d', 'pilot-r'),
        ],
      },
    );
    expect(result.manifest).toEqual({});
    expect(Object.keys(result.unresolved).sort()).toEqual([
      'player-1-atlas-as7-d',
      'player-2-atlas-as7-d',
    ]);
  });

  it('N7: the session builder placeholder pilot is not evidence', () => {
    // The one constant the campaign session builder stamps on unassigned units.
    expect(UNKNOWN_PILOT_REF).toBe('Unknown');
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a']),
      roster(['roster-a', 'atlas-as7-d', 'pilot-a']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [
          player('player-1-atlas-as7-d', 'atlas-as7-d', UNKNOWN_PILOT_REF),
        ],
      },
    );
    expect(result.manifest).toEqual({
      'player-1-atlas-as7-d': { rosterUnitId: 'roster-a' },
    });
  });
});

describe('resolveLegacyBattleUnitManifest review round 4', () => {
  it('a no-pilotRef delta is unresolved when the force still lists a unit no longer on the roster', () => {
    // Two Atlases fought in the force; roster-b was later removed from the
    // roster, which does not touch the force record.
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a', 'roster-b']),
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({});
    expect(result.unresolved['player-1-atlas-as7-d']?.reason).toBe('ambiguous');
  });
});

describe('resolveLegacyBattleUnitManifest closed rule (review round 5)', () => {
  it('X1: a delta with a pilotRef whose pilot is on no roster unit is unresolved, even with one Atlas left in the force', () => {
    // roster-b (pilot-p) fought; afterwards roster-b left the roster. The
    // force record still lists it; pilotless roster-a is the only Atlas left.
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a', 'roster-b']),
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-p')],
      },
    );
    expect(result.manifest).toEqual({});
  });

  it('X2: with no force record a pilotless delta is unresolved, even with one Atlas on the roster', () => {
    const result = resolveLegacyBattleUnitManifest(
      { forces: new Map() as never },
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: null,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({});
  });

  it('X3: a force record with no units is not evidence', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam([]),
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({});
  });

  it('X4: a bridged encounter pointing at a deleted force is no force record, with no fallback', () => {
    const result = resolveLegacyBattleUnitManifest(
      {
        ...campaignWithTeam(['roster-a', 'roster-b']),
        bridgedEncounters: {
          [SCENARIO]: { playerForce: { forceId: 'deleted-force' } },
        } as never,
      },
      roster(['roster-a', 'atlas-as7-d']),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d')],
      },
    );
    expect(result.manifest).toEqual({});
  });

  it('(A) a pilot on a unit of another design is not evidence', () => {
    const result = resolveLegacyBattleUnitManifest(
      campaignWithTeam(['roster-a', 'roster-l']),
      roster(
        ['roster-a', 'atlas-as7-d'],
        ['roster-l', 'locust-lct-1v', 'pilot-p'],
      ),
      {
        scenarioId: SCENARIO,
        unitDeltas: [player('player-1-atlas-as7-d', 'atlas-as7-d', 'pilot-p')],
      },
    );
    expect(result.manifest).toEqual({});
  });
});
