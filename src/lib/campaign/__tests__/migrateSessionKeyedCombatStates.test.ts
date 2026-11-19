/**
 * T1 legacy migration against a real campaign saved by main 3dcb06123
 * (see fixtures/README.md), plus synthetic cases. Owner ruling PARITY-PLAN
 * §186.4 (option ii): legacy damage is never attributed. Every player
 * session-keyed entry is removed from the payload, quarantined with its
 * original and flagged; nothing is written to any roster unit, even where
 * the evidence would have named one.
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ILegacyCombatStateFlag } from '@/types/campaign/LegacyCombatStateMigration';
import type {
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { IAppliedCombatOutcome } from '@/types/combat/CombatOutcome';

import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import { LEGACY_NOT_ATTRIBUTED_NOTE } from '@/types/campaign/LegacyCombatStateMigration';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  isSessionKeyedUnitId,
  migrateSessionKeyedCombatStates,
} from '../migrateSessionKeyedCombatStates';
import { applyUnitDelta } from '../processors/postBattleProcessor.helpers';
import legacyFixture from './fixtures/legacySessionKeyedCampaign.json';

const PLAYER_KEY = 'player-1-atlas-as7-d';
const OPPONENT_KEY = 'opponent-1-marauder-mad-3r';
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

function notAttributed(
  sessionUnitId: string,
  matchIds: readonly string[],
  deviceId?: string,
): ILegacyCombatStateFlag {
  return {
    kind: 'combat-state',
    ...(deviceId === undefined ? {} : { quarantinedOnDeviceId: deviceId }),
    sessionUnitId,
    reason: 'legacy-not-attributed',
    candidateRosterUnitIds: [],
    matchIds,
  };
}

describe('migrateSessionKeyedCombatStates on a save from main 3dcb06123', () => {
  it('the fixture really holds the legacy phantom entries', () => {
    const { campaign } = loadFixture();
    expect(Object.keys(campaign.unitCombatStates).sort()).toEqual(
      [OPPONENT_KEY, PLAYER_KEY].sort(),
    );
    expect(campaign.recentlyAppliedOutcomes).toHaveLength(1);
    // Non-vacuous: the entry holds real damage, and its delta names the
    // pilot who fought, which the old resolver used to attribute it.
    expect(
      campaign.unitCombatStates[PLAYER_KEY].currentArmorPerLocation.right_torso,
    ).toBe(22);
    expect(
      campaign.recentlyAppliedOutcomes![0].unitDeltas.find(
        (delta) => delta.unitId === PLAYER_KEY,
      )?.pilotRef,
    ).toBeTruthy();
  });

  it('§186.4: flags and quarantines the player entry, writes nothing to the roster unit, and prunes the opponent', () => {
    const { campaign } = loadFixture();
    const result = migrateSessionKeyedCombatStates({
      campaign,
      migratedAt: MIGRATED_AT,
      deviceId: 'device-a',
    });
    if (!result) throw new Error('expected a migration');

    // Nothing written: no roster-keyed state appears.
    expect(result.campaign.unitCombatStates).toEqual({});
    const matchId = campaign.recentlyAppliedOutcomes![0].matchId;
    const flag = notAttributed(PLAYER_KEY, [matchId], 'device-a');
    expect(result.flags).toEqual([flag]);
    expect(result.campaign.legacyCombatStateFlags).toEqual([flag]);
    expect(result.quarantine).toEqual([
      {
        source: 'combat-state',
        campaignId: campaign.id,
        sessionUnitId: PLAYER_KEY,
        original: campaign.unitCombatStates[PLAYER_KEY],
        resolution: {
          kind: 'not-attributed',
          note: LEGACY_NOT_ATTRIBUTED_NOTE,
          flag,
        },
        migratedAt: MIGRATED_AT,
      },
    ]);
    expect(LEGACY_NOT_ATTRIBUTED_NOTE).toBe(
      'not attributed: legacy, owner ruling PARITY-PLAN §186.4',
    );
    // Opponents are pruned, never quarantined or flagged.
    expect(result.prunedOpponentKeys).toEqual([OPPONENT_KEY]);
    // No mapping is recorded on the retained outcome.
    expect(result.campaign.recentlyAppliedOutcomes).toBe(
      campaign.recentlyAppliedOutcomes,
    );
    expect(
      (result.campaign.recentlyAppliedOutcomes![0] as IAppliedCombatOutcome)
        .unitManifest,
    ).toBeUndefined();
  });

  it('running it a second time changes nothing', () => {
    const { campaign } = loadFixture();
    const first = migrateSessionKeyedCombatStates({
      campaign,
      migratedAt: MIGRATED_AT,
    });
    if (!first) throw new Error('expected a migration');
    expect(
      migrateSessionKeyedCombatStates({
        campaign: first.campaign,
        migratedAt: MIGRATED_AT,
      }),
    ).toBeNull();
  });

  it('the keepalive payload is not larger after migration and carries no quarantine data', () => {
    const { campaign, roster } = loadFixture();
    const result = migrateSessionKeyedCombatStates({
      campaign,
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
// Synthetic: nothing is attributed, whatever the evidence
// ----------------------------------------------------------------------------

const TEAM = 'team-force-1';
const TEAM_SCENARIO = `scn-contract-1-3025-06-01-${TEAM}`;
const SECOND_KEY = 'player-2-atlas-as7-d';

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
  scenarioId: string | null = null,
): IAppliedCombatOutcome {
  return {
    version: 1,
    matchId,
    contractId: null,
    scenarioId,
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

function syntheticCampaign(
  outcomes: readonly IAppliedCombatOutcome[],
  states: Record<string, IUnitCombatState>,
  teamUnitIds?: readonly string[],
): ICampaign {
  const { campaign } = loadFixture();
  return {
    ...campaign,
    forces: teamUnitIds
      ? (new Map([
          [
            TEAM,
            {
              id: TEAM,
              name: 'Team',
              subForceIds: [],
              unitIds: [...teamUnitIds],
            },
          ],
        ]) as never)
      : new Map(),
    unitCombatStates: states,
    recentlyAppliedOutcomes: outcomes,
  };
}

function stateFor(outcome: IAppliedCombatOutcome, index = 0): IUnitCombatState {
  return applyUnitDelta(
    undefined,
    outcome.unitDeltas[index],
    outcome.matchId,
    outcome.appliedOn as string,
  );
}

describe('migrateSessionKeyedCombatStates never attributes legacy damage (§186.4)', () => {
  it('a delta whose pilot and force both name one roster unit: flagged, quarantined, nothing written', () => {
    // The old resolver attributed this confidently (pilot plus force).
    const outcome = syntheticOutcome(
      'm-1',
      [syntheticDelta(PLAYER_KEY, 30, 'pilot-a')],
      TEAM_SCENARIO,
    );
    const stored = stateFor(outcome);
    const result = migrateSessionKeyedCombatStates({
      campaign: syntheticCampaign([outcome], { [PLAYER_KEY]: stored }, [
        'roster-a',
      ]),
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');
    expect(result.campaign.unitCombatStates).toEqual({});
    expect(result.flags).toEqual([notAttributed(PLAYER_KEY, ['m-1'])]);
    expect(result.quarantine).toEqual([
      expect.objectContaining({
        sessionUnitId: PLAYER_KEY,
        original: stored,
        resolution: {
          kind: 'not-attributed',
          note: LEGACY_NOT_ATTRIBUTED_NOTE,
          flag: result.flags[0],
        },
      }),
    ]);
  });

  it('an entry its retained deltas do not explain is flagged the same way, with its original kept', () => {
    const outcome = syntheticOutcome('m-2', [syntheticDelta(PLAYER_KEY, 30)]);
    const stored = {
      ...stateFor(outcome),
      // Damage from a battle whose outcome was pruned (> 31 days).
      currentArmorPerLocation: { CT: 12 },
    };
    const result = migrateSessionKeyedCombatStates({
      campaign: syntheticCampaign([outcome], { [PLAYER_KEY]: stored }),
      migratedAt: MIGRATED_AT,
    });
    expect(result?.campaign.unitCombatStates).toEqual({});
    expect(result?.flags).toEqual([notAttributed(PLAYER_KEY, ['m-2'])]);
    expect(result?.quarantine.map((record) => record.original)).toEqual([
      stored,
    ]);
  });

  it('an entry with no retained battle is flagged with no battles named', () => {
    const outcome = syntheticOutcome('m-3', [syntheticDelta(PLAYER_KEY, 30)]);
    const result = migrateSessionKeyedCombatStates({
      campaign: syntheticCampaign([], { [PLAYER_KEY]: stateFor(outcome) }),
      migratedAt: MIGRATED_AT,
    });
    expect(result?.campaign.unitCombatStates).toEqual({});
    expect(result?.flags).toEqual([notAttributed(PLAYER_KEY, [])]);
  });

  it('never touches a roster unit that has state of its own', () => {
    const outcome = syntheticOutcome('m-4', [
      syntheticDelta(PLAYER_KEY, 30, 'pilot-a'),
    ]);
    const own = stateFor(
      syntheticOutcome('m-new', [syntheticDelta('roster-a', 5)]),
    );
    const result = migrateSessionKeyedCombatStates({
      campaign: syntheticCampaign([outcome], {
        [PLAYER_KEY]: stateFor(outcome),
        'roster-a': own,
      }),
      migratedAt: MIGRATED_AT,
    });
    expect(result?.campaign.unitCombatStates).toEqual({ 'roster-a': own });
    expect(result?.flags.map((flag) => flag.sessionUnitId)).toEqual([
      PLAYER_KEY,
    ]);
  });

  it('a design that fought twice, each delta agreeing with one pilot: both flagged, nothing written', () => {
    const outcome = syntheticOutcome(
      'm-team',
      [
        syntheticDelta(PLAYER_KEY, 30, 'pilot-b'),
        syntheticDelta(SECOND_KEY, 5, 'pilot-a'),
      ],
      TEAM_SCENARIO,
    );
    const states = {
      [PLAYER_KEY]: stateFor(outcome, 0),
      [SECOND_KEY]: stateFor(outcome, 1),
    };
    const result = migrateSessionKeyedCombatStates({
      campaign: syntheticCampaign([outcome], states, ['roster-a', 'roster-b']),
      migratedAt: MIGRATED_AT,
    });
    if (!result) throw new Error('expected a migration');
    expect(result.campaign.unitCombatStates).toEqual({});
    expect(
      result.quarantine.map((record) => [
        record.sessionUnitId,
        record.resolution.kind,
        record.original,
      ]),
    ).toEqual([
      [PLAYER_KEY, 'not-attributed', states[PLAYER_KEY]],
      [SECOND_KEY, 'not-attributed', states[SECOND_KEY]],
    ]);
  });

  it('keeps flags already on the campaign and does not duplicate its own', () => {
    const outcome = syntheticOutcome('m-5', [syntheticDelta(PLAYER_KEY, 30)]);
    const earlier: ILegacyCombatStateFlag = {
      kind: 'unapplied-delta',
      sessionUnitId: 'player-3-locust-lct-1v',
      reason: 'legacy-not-attributed',
      candidateRosterUnitIds: [],
      matchIds: ['m-0'],
    };
    const result = migrateSessionKeyedCombatStates({
      campaign: {
        ...syntheticCampaign([outcome], { [PLAYER_KEY]: stateFor(outcome) }),
        legacyCombatStateFlags: [earlier, notAttributed(PLAYER_KEY, ['m-5'])],
      },
      migratedAt: MIGRATED_AT,
      deviceId: 'device-a',
    });
    expect(result?.campaign.legacyCombatStateFlags).toEqual([
      earlier,
      notAttributed(PLAYER_KEY, ['m-5'], 'device-a'),
    ]);
  });
});
