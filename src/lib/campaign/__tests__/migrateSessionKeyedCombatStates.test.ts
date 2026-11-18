/**
 * T1 legacy migration against a real campaign saved by main 3dcb06123
 * (see fixtures/README.md), plus synthetic cases for what must be left
 * and flagged.
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { IAppliedCombatOutcome } from '@/types/combat/CombatOutcome';

import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  isSessionKeyedUnitId,
  migrateSessionKeyedCombatStates,
} from '../migrateSessionKeyedCombatStates';
import {
  applyUnitDelta,
  isLostOnField,
  playerWon,
} from '../processors/postBattleProcessor.helpers';
import legacyFixture from './fixtures/legacySessionKeyedCampaign.json';

const PLAYER_KEY = 'player-1-atlas-as7-d';
const OPPONENT_KEY = 'opponent-1-marauder-mad-3r';
const ROSTER_ID = 'ff-roster-unit-1';
const MIGRATED_AT = '2026-11-18T12:00:00.000Z';

interface ILegacyFixture {
  readonly envelope: SerializedCampaign;
}

function loadFixture(): {
  campaign: ICampaign;
  roster: SerializedCampaignRosterState;
} {
  const { envelope } = legacyFixture as unknown as ILegacyFixture;
  const roster = envelope.body.rosterProjection;
  if (!roster) throw new Error('fixture has no roster projection');
  return { campaign: deserializeCampaignBody(envelope.body), roster };
}

/** Re-apply every retained delta for `sessionUnitId` under `rosterUnitId`, in apply order. */
function reapply(
  campaign: ICampaign,
  sessionUnitId: string,
  rosterUnitId: string,
): IUnitCombatState | undefined {
  let state: IUnitCombatState | undefined;
  for (const outcome of campaign.recentlyAppliedOutcomes ?? []) {
    for (const delta of outcome.unitDeltas) {
      if (delta.unitId !== sessionUnitId) continue;
      state = applyUnitDelta(
        state,
        { ...delta, unitId: rosterUnitId },
        outcome.matchId,
        outcome.appliedOn ?? MIGRATED_AT,
        isLostOnField(outcome, delta, playerWon(outcome)),
      );
    }
  }
  return state;
}

/** What the page-close keepalive flush measures (`useCampaignPersistenceStore`). */
function keepaliveBytes(
  campaign: ICampaign,
  roster: SerializedCampaignRosterState,
): { bytes: number; json: string } {
  const json = JSON.stringify({
    envelope: buildSerializedCampaign(campaign, 'device', 2, roster),
    baseVersion: 1,
  });
  return { bytes: new TextEncoder().encode(json).length, json };
}

describe('migrateSessionKeyedCombatStates on a save from main 3dcb06123', () => {
  it('the fixture really holds the legacy phantom entries', () => {
    const { campaign } = loadFixture();
    expect(Object.keys(campaign.unitCombatStates).sort()).toEqual(
      [OPPONENT_KEY, PLAYER_KEY].sort(),
    );
    expect(campaign.recentlyAppliedOutcomes).toHaveLength(1);
  });

  it('rebuilds the player entry under the roster id by re-applying its deltas, quarantines the original and prunes the opponent', () => {
    const { campaign, roster } = loadFixture();
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: roster.units as IRosterUnitProjection[],
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');

    const states = result.campaign.unitCombatStates;
    expect(Object.keys(states)).toEqual([ROSTER_ID]);
    expect(states[ROSTER_ID]).toEqual(reapply(campaign, PLAYER_KEY, ROSTER_ID));
    // Non-vacuous: the battle left real damage on the unit.
    expect(states[ROSTER_ID].currentArmorPerLocation.right_torso).toBe(22);

    expect(result.quarantine).toEqual([
      {
        source: 'combat-state',
        campaignId: campaign.id,
        sessionUnitId: PLAYER_KEY,
        original: campaign.unitCombatStates[PLAYER_KEY],
        resolution: {
          kind: 'migrated',
          targets: [
            {
              matchId: campaign.recentlyAppliedOutcomes![0].matchId,
              rosterUnitId: ROSTER_ID,
              // The fixture delta carries the pilot who fought: under the
              // closed rule a real pilotRef is the only evidence (A).
              evidence: 'pilot',
            },
          ],
        },
        migratedAt: MIGRATED_AT,
      },
    ]);
    // Opponents are pruned, never quarantined or flagged.
    expect(result.prunedOpponentKeys).toEqual([OPPONENT_KEY]);
    expect(result.flags).toEqual([]);
    expect(result.campaign.legacyCombatStateFlags).toBeUndefined();
    // The resolved mapping is recorded on the retained outcome.
    expect(
      (result.campaign.recentlyAppliedOutcomes![0] as IAppliedCombatOutcome)
        .unitManifest,
    ).toEqual({ [PLAYER_KEY]: { rosterUnitId: ROSTER_ID } });
  });

  it('running it a second time changes nothing', () => {
    const { campaign, roster } = loadFixture();
    const first = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: roster.units as IRosterUnitProjection[],
      migratedAt: MIGRATED_AT,
    });
    if (!first) throw new Error('expected a migration');
    expect(
      migrateSessionKeyedCombatStates({
        campaign: first.campaign,
        rosterUnits: roster.units as IRosterUnitProjection[],
        migratedAt: MIGRATED_AT,
      }),
    ).toBeNull();
  });

  it('the keepalive payload is not larger after migration and carries no quarantine data', () => {
    const { campaign, roster } = loadFixture();
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: roster.units as IRosterUnitProjection[],
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');

    const before = keepaliveBytes(campaign, roster);
    const after = keepaliveBytes(result.campaign, roster);
    expect(after.bytes).toBeLessThanOrEqual(before.bytes);

    const body = (JSON.parse(after.json) as { envelope: SerializedCampaign })
      .envelope.body;
    expect(
      Object.keys(body.unitCombatStates ?? {}).filter(isSessionKeyedUnitId),
    ).toEqual([]);
    for (const record of result.quarantine) {
      expect(after.json).not.toContain(JSON.stringify(record.original));
    }
    expect(after.json).not.toContain(MIGRATED_AT);
  });
});

// ----------------------------------------------------------------------------
// Synthetic: entries that must be left and flagged
// ----------------------------------------------------------------------------

function syntheticDelta(unitId: string, armor: number, pilotRef?: string) {
  return {
    unitId,
    unitRef: 'atlas-as7-d',
    ...(pilotRef ? { pilotRef } : {}),
    side: GameSide.Player,
    destroyed: false,
    finalStatus: 'damaged',
    armorRemaining: { CT: armor },
    internalsRemaining: { CT: 20 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: 'active',
    },
  } as unknown as IAppliedCombatOutcome['unitDeltas'][number];
}

function syntheticOutcome(
  matchId: string,
  deltas: IAppliedCombatOutcome['unitDeltas'],
): IAppliedCombatOutcome {
  return {
    version: 1,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: 'destruction',
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 3,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: deltas,
    capturedAt: '3025-06-01T00:00:00.000Z',
    appliedOn: '3025-06-01T00:00:00.000Z',
  } as unknown as IAppliedCombatOutcome;
}

function rosterUnit(unitId: string, pilotId?: string): IRosterUnitProjection {
  return {
    unitId,
    unitName: unitId,
    unitRef: 'atlas-as7-d',
    ...(pilotId ? { pilotId } : {}),
  } as unknown as IRosterUnitProjection;
}

function syntheticCampaign(
  outcomes: readonly IAppliedCombatOutcome[],
  states: Record<string, IUnitCombatState>,
): ICampaign {
  const { campaign } = loadFixture();
  return {
    ...campaign,
    forces: new Map(),
    unitCombatStates: states,
    recentlyAppliedOutcomes: outcomes,
  };
}

function stateFrom(outcome: IAppliedCombatOutcome): IUnitCombatState {
  const delta = outcome.unitDeltas[0];
  return applyUnitDelta(
    undefined,
    delta,
    outcome.matchId,
    outcome.appliedOn as string,
  );
}

describe('migrateSessionKeyedCombatStates leaves and flags what it cannot prove', () => {
  it('not fully explained: the retained deltas do not rebuild the stored entry', () => {
    const outcome = syntheticOutcome('m-1', [syntheticDelta(PLAYER_KEY, 30)]);
    const stored = {
      ...stateFrom(outcome),
      // Damage from a battle whose outcome was pruned (> 31 days).
      currentArmorPerLocation: { CT: 12 },
    };
    const campaign = syntheticCampaign([outcome], { [PLAYER_KEY]: stored });
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: [rosterUnit('roster-a')],
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');
    expect(result.campaign.unitCombatStates).toEqual({});
    expect(result.flags).toEqual([
      {
        kind: 'combat-state',
        sessionUnitId: PLAYER_KEY,
        reason: 'not-fully-explained',
        candidateRosterUnitIds: ['roster-a'],
        matchIds: ['m-1'],
      },
    ]);
    expect(result.campaign.legacyCombatStateFlags).toEqual(result.flags);
    expect(result.quarantine).toEqual([
      expect.objectContaining({
        sessionUnitId: PLAYER_KEY,
        original: stored,
        resolution: { kind: 'flagged', flag: result.flags[0] },
      }),
    ]);
  });

  it('two candidates: the same design twice on the roster with no deciding pilot', () => {
    const outcome = syntheticOutcome('m-2', [
      syntheticDelta(PLAYER_KEY, 30, 'pilot-unknown'),
    ]);
    const campaign = syntheticCampaign([outcome], {
      [PLAYER_KEY]: stateFrom(outcome),
    });
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: [
        rosterUnit('roster-a', 'pilot-a'),
        rosterUnit('roster-b', 'pilot-b'),
      ],
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');
    expect(result.campaign.unitCombatStates).toEqual({});
    expect(result.flags).toEqual([
      expect.objectContaining({
        sessionUnitId: PLAYER_KEY,
        reason: 'ambiguous-roster-unit',
        candidateRosterUnitIds: ['roster-a', 'roster-b'],
      }),
    ]);
  });

  it('the pilot decides between two same-design roster units', () => {
    const outcome = syntheticOutcome('m-3', [
      syntheticDelta(PLAYER_KEY, 30, 'pilot-b'),
    ]);
    const campaign = syntheticCampaign([outcome], {
      [PLAYER_KEY]: stateFrom(outcome),
    });
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: [
        rosterUnit('roster-a', 'pilot-a'),
        rosterUnit('roster-b', 'pilot-b'),
      ],
      migratedAt: MIGRATED_AT,
    });
    expect(Object.keys(result?.campaign.unitCombatStates ?? {})).toEqual([
      'roster-b',
    ]);
    expect(result?.flags).toEqual([]);
  });

  it('a roster unit that already has state is left and flagged', () => {
    // The delta's pilot is the evidence that names roster-a (closed rule
    // (A)); a pilotless delta with no force record is never attributed.
    const outcome = syntheticOutcome('m-4', [
      syntheticDelta(PLAYER_KEY, 30, 'pilot-a'),
    ]);
    const own = stateFrom(
      syntheticOutcome('m-new', [syntheticDelta('roster-a', 5)]),
    );
    const campaign = syntheticCampaign([outcome], {
      [PLAYER_KEY]: stateFrom(outcome),
      'roster-a': own,
    });
    const result = migrateSessionKeyedCombatStates({
      campaign,
      rosterUnits: [rosterUnit('roster-a', 'pilot-a')],
      migratedAt: MIGRATED_AT,
    });
    expect(result?.campaign.unitCombatStates).toEqual({ 'roster-a': own });
    expect(result?.flags.map((flag) => flag.reason)).toEqual([
      'roster-unit-has-state',
    ]);
  });
});

// ----------------------------------------------------------------------------
// Review findings R1/R2: never invent an attribution.
// ----------------------------------------------------------------------------

describe('migrateSessionKeyedCombatStates never invents damage (review R1/R2)', () => {
  const TEAM = 'team-force-1';
  const SECOND_KEY = 'player-2-atlas-as7-d';

  function teamOutcome(
    deltas: IAppliedCombatOutcome['unitDeltas'],
  ): IAppliedCombatOutcome {
    return {
      ...syntheticOutcome('m-team', deltas),
      scenarioId: `scn-contract-1-3025-06-01-${TEAM}`,
    };
  }

  function stateFor(
    outcome: IAppliedCombatOutcome,
    index: number,
  ): IUnitCombatState {
    return applyUnitDelta(
      undefined,
      outcome.unitDeltas[index],
      outcome.matchId,
      outcome.appliedOn as string,
    );
  }

  function teamCampaign(
    outcome: IAppliedCombatOutcome,
    states: Record<string, IUnitCombatState>,
    teamUnitIds: readonly string[],
  ): ICampaign {
    return {
      ...syntheticCampaign([outcome], states),
      forces: new Map([
        [
          TEAM,
          {
            id: TEAM,
            name: 'Team',
            subForceIds: [],
            unitIds: [...teamUnitIds],
          },
        ],
      ]) as never,
    };
  }

  it('flags both entries of a design that fought twice when one Atlas is left, and writes nothing to it', () => {
    const outcome = teamOutcome([
      syntheticDelta(PLAYER_KEY, 30),
      syntheticDelta(SECOND_KEY, 5),
    ]);
    const states = {
      [PLAYER_KEY]: stateFor(outcome, 0),
      [SECOND_KEY]: stateFor(outcome, 1),
    };
    const result = migrateSessionKeyedCombatStates({
      campaign: teamCampaign(outcome, states, ['roster-a']),
      rosterUnits: [rosterUnit('roster-a')],
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');

    expect(result.campaign.unitCombatStates).toEqual({});
    expect(result.flags.map((flag) => flag.sessionUnitId).sort()).toEqual(
      [PLAYER_KEY, SECOND_KEY].sort(),
    );
    expect(
      result.quarantine.map((record) => [
        record.sessionUnitId,
        record.resolution.kind,
        record.original,
      ]),
    ).toEqual([
      [PLAYER_KEY, 'flagged', states[PLAYER_KEY]],
      [SECOND_KEY, 'flagged', states[SECOND_KEY]],
    ]);
  });

  it('migrates a design that fought twice when each delta agrees with one pilot', () => {
    const outcome = teamOutcome([
      syntheticDelta(PLAYER_KEY, 30, 'pilot-b'),
      syntheticDelta(SECOND_KEY, 5, 'pilot-a'),
    ]);
    const result = migrateSessionKeyedCombatStates({
      campaign: teamCampaign(
        outcome,
        {
          [PLAYER_KEY]: stateFor(outcome, 0),
          [SECOND_KEY]: stateFor(outcome, 1),
        },
        ['roster-a', 'roster-b'],
      ),
      rosterUnits: [
        rosterUnit('roster-a', 'pilot-a'),
        rosterUnit('roster-b', 'pilot-b'),
      ],
      migratedAt: MIGRATED_AT,
    });
    const states = result?.campaign.unitCombatStates ?? {};
    expect(states['roster-b']?.currentArmorPerLocation.CT).toBe(30);
    expect(states['roster-a']?.currentArmorPerLocation.CT).toBe(5);
    expect(result?.flags).toEqual([]);
  });

  it('does not map onto the Atlas now in the force when the pilot who fought was someone else', () => {
    const outcome = teamOutcome([syntheticDelta(PLAYER_KEY, 30, 'pilot-b')]);
    const result = migrateSessionKeyedCombatStates({
      campaign: teamCampaign(outcome, { [PLAYER_KEY]: stateFor(outcome, 0) }, [
        'roster-a',
      ]),
      rosterUnits: [
        rosterUnit('roster-a', 'pilot-a'),
        rosterUnit('roster-b', 'pilot-c'),
      ],
      migratedAt: MIGRATED_AT,
    });
    expect(result?.campaign.unitCombatStates).toEqual({});
    expect(result?.flags).toEqual([
      expect.objectContaining({
        sessionUnitId: PLAYER_KEY,
        reason: 'conflicting-pilot',
      }),
    ]);
  });
});
