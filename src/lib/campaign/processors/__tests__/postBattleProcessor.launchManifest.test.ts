/**
 * T1 + T3: battle damage is keyed by the roster unit through the launch
 * manifest, and a player delta the manifest cannot map fails the whole
 * outcome before the commit point.
 */
import type { BattleUnitManifest } from '@/types/campaign/BattleUnitManifest';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IUnitReport } from '@/utils/gameplay/postBattleReport';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';
import { logger } from '@/utils/logger';

import {
  applyPostBattle,
  postBattleProcessor,
  type ICampaignWithBattleState,
} from '../postBattleProcessor';

const mockQuarantinePut = jest.fn(async () => {});
jest.mock('@/services/persistence/legacyCombatStateQuarantineStore', () => ({
  createIndexedDbLegacyCombatStateQuarantineStore: () => ({
    put: mockQuarantinePut,
    get: async () => [],
  }),
}));

const MATCH = 'match-manifest';
const PLAYER_SESSION_ID = 'player-1-atlas-as7-d';
const ALLY_SESSION_ID = 'player-2-locust-lct-1v';
const OPPONENT_SESSION_ID = 'opponent-1-commando-com-2d';
const ROSTER_ID = 'roster-unit-7';
const PILOT_ID = 'pilot-7';

function campaignWith(
  overrides: Partial<ICampaignWithBattleState> = {},
): ICampaignWithBattleState {
  return {
    id: 'camp-1',
    name: 'Manifest Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    unitCombatStates: {},
    ...overrides,
  };
}

function delta(
  unitId: string,
  side: GameSide,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 11 },
    internalsRemaining: { CT: 7 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function report(unitId: string, kills: number): IUnitReport {
  return {
    unitId,
    side: GameSide.Player,
    designation: unitId,
    damageDealt: 10,
    damageReceived: 5,
    kills,
    heatProblems: 0,
    physicalAttacks: 0,
    xpPending: true,
  };
}

function outcome(deltas: readonly IUnitCombatDelta[]): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: MATCH,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId: MATCH,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 5,
      units: [report(PLAYER_SESSION_ID, 2)],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: deltas,
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

function rosterEntry(): ICampaignRosterEntry {
  return {
    pilotId: PILOT_ID,
    pilotName: 'Pilot Seven',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [],
  };
}

function seedPilot(): void {
  useCampaignRosterStore.setState({
    campaignId: 'camp-1',
    units: [],
    pilots: [rosterEntry()],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({
    pilots: [
      {
        id: PILOT_ID,
        name: 'Pilot Seven',
        type: PilotType.Persistent,
        status: PilotStatus.Active,
        skills: { gunnery: 4, piloting: 5 },
        wounds: 0,
        abilities: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      },
    ],
  });
}

function livePilot(): ICampaignRosterEntry {
  const entry = useCampaignRosterStore
    .getState()
    .pilots.find((p) => p.pilotId === PILOT_ID);
  if (!entry) throw new Error('pilot missing');
  return entry;
}

const fullDeltas = [
  delta(PLAYER_SESSION_ID, GameSide.Player, { pilotRef: PILOT_ID }),
  delta(ALLY_SESSION_ID, GameSide.Player),
  delta(OPPONENT_SESSION_ID, GameSide.Opponent),
];

/** A manifest as the campaign holds it until the battle is applied. */
function pending(units: BattleUnitManifest, complete = true) {
  return { units, complete, recordedOn: '3025-06-15T00:00:00.000Z' };
}

const fullManifest = {
  [PLAYER_SESSION_ID]: { rosterUnitId: ROSTER_ID },
  [ALLY_SESSION_ID]: { notOnRoster: true as const },
};

describe('postBattleProcessor launch manifest (T1)', () => {
  beforeEach(seedPilot);
  afterEach(() => {
    useCampaignRosterStore.setState({ pilots: [], units: [] });
    usePilotStore.setState({ pilots: [] });
  });

  it('writes the player delta under the roster id and nothing for allies or opponents', () => {
    const battle = outcome(fullDeltas);
    const result = postBattleProcessor.process(
      campaignWith({
        pendingBattleOutcomes: [battle],
        battleUnitManifests: { [MATCH]: pending(fullManifest) },
      }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;

    expect(Object.keys(applied.unitCombatStates)).toEqual([ROSTER_ID]);
    expect(applied.unitCombatStates[ROSTER_ID]).toMatchObject({
      unitId: ROSTER_ID,
      currentArmorPerLocation: { CT: 11 },
      currentStructurePerLocation: { CT: 7 },
    });
    expect((applied.unitPrestige ?? []).map((p) => p.unitId)).toEqual([
      ROSTER_ID,
    ]);
    // Kill attribution stays keyed by the session id (report rows).
    expect(livePilot().campaignKills).toBe(2);
    expect(livePilot().campaignMissions).toBe(1);
    // The manifest moves onto the applied record.
    expect(applied.battleUnitManifests?.[MATCH]).toBeUndefined();
    const record = applied.recentlyAppliedOutcomes?.find(
      (o) => o.matchId === MATCH,
    ) as IAppliedCombatOutcome | undefined;
    expect(record?.unitManifest).toEqual(fullManifest);
  });

  it('T3: an unmappable player delta keeps the outcome queued with no side effects; a retry with a manifest applies once', () => {
    const battle = outcome(fullDeltas);
    const partialManifest = {
      [ALLY_SESSION_ID]: { notOnRoster: true as const },
    };
    const start = campaignWith({
      pendingBattleOutcomes: [battle],
      battleUnitManifests: { [MATCH]: pending(partialManifest) },
    });

    const day1 = postBattleProcessor.process(
      start,
      new Date('3025-06-15T00:00:00Z'),
    );
    const failed = day1.campaign as ICampaignWithBattleState;
    const failure = day1.events.find(
      (e) => e.type === 'post_battle_apply_failed',
    );
    expect(failure?.severity).toBe('critical');
    expect(String(failure?.data?.error)).toContain(PLAYER_SESSION_ID);
    expect(failed.pendingBattleOutcomes).toEqual([battle]);
    expect(failed.processedBattleIds ?? []).not.toContain(MATCH);
    expect(failed.unitCombatStates).toEqual({});
    expect(failed.finances).toBe(start.finances);
    expect(livePilot()).toEqual(rosterEntry());

    const retry = postBattleProcessor.process(
      { ...failed, battleUnitManifests: { [MATCH]: pending(fullManifest) } },
      new Date('3025-06-16T00:00:00Z'),
    );
    const applied = retry.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(Object.keys(applied.unitCombatStates)).toEqual([ROSTER_ID]);
    expect(livePilot().campaignMissions).toBe(1);

    const again = postBattleProcessor.process(
      applied,
      new Date('3025-06-17T00:00:00Z'),
    );
    expect(again.events).toEqual([]);
    expect(livePilot().campaignMissions).toBe(1);
  });

  it('R3: an outcome with no manifest and no roster match applies, writes no unit, and flags and quarantines each player delta', () => {
    const battle = outcome(fullDeltas);
    const result = postBattleProcessor.process(
      campaignWith({ pendingBattleOutcomes: [battle] }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(applied.unitCombatStates).toEqual({});
    expect(
      (applied.legacyCombatStateFlags ?? []).map((flag) => [
        flag.kind,
        flag.sessionUnitId,
        flag.matchIds,
      ]),
    ).toEqual([
      ['unapplied-delta', PLAYER_SESSION_ID, [MATCH]],
      ['unapplied-delta', ALLY_SESSION_ID, [MATCH]],
    ]);
    expect(mockQuarantinePut).toHaveBeenCalledWith('camp-1', [
      expect.objectContaining({
        source: 'unapplied-delta',
        sessionUnitId: PLAYER_SESSION_ID,
        matchId: MATCH,
        delta: fullDeltas[0],
      }),
      expect.objectContaining({
        source: 'unapplied-delta',
        sessionUnitId: ALLY_SESSION_ID,
        matchId: MATCH,
        delta: fullDeltas[1],
      }),
    ]);
  });

  it('never writes NaN for a delta location with no numeric value', () => {
    const battle = outcome([
      delta(PLAYER_SESSION_ID, GameSide.Player, {
        armorRemaining: {
          CT: 11,
          LA: undefined as unknown as number,
        },
        internalsRemaining: {
          CT: 7,
          RL: undefined as unknown as number,
        },
      }),
    ]);
    const result = postBattleProcessor.process(
      campaignWith({
        pendingBattleOutcomes: [battle],
        battleUnitManifests: { [MATCH]: pending(fullManifest) },
      }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const state = (result.campaign as ICampaignWithBattleState)
      .unitCombatStates[ROSTER_ID];
    expect(state?.currentArmorPerLocation.CT).toBe(11);
    expect(state?.currentStructurePerLocation.CT).toBe(7);
    expect(
      [
        ...Object.values(state?.currentArmorPerLocation ?? {}),
        ...Object.values(state?.currentStructurePerLocation ?? {}),
      ].some((value) => Number.isNaN(value)),
    ).toBe(false);
  });

  it('warns about and counts each skipped non-finite location, and still writes 0 as 0', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const battle = outcome([
      delta(PLAYER_SESSION_ID, GameSide.Player, {
        armorRemaining: { CT: 11, RT: 0, LA: Number.NaN },
        internalsRemaining: {
          CT: 0,
          RL: undefined as unknown as number,
        },
      }),
    ]);
    const { campaign, summary, events } = applyPostBattle(
      battle,
      campaignWith({ battleUnitManifests: { [MATCH]: pending(fullManifest) } }),
    );
    const state = campaign.unitCombatStates[ROSTER_ID];
    expect(state.currentArmorPerLocation.RT).toBe(0);
    expect(state.currentStructurePerLocation.CT).toBe(0);
    expect(Number.isNaN(state.currentArmorPerLocation.LA)).toBe(false);

    const skipped = [
      {
        unitId: ROSTER_ID,
        matchId: MATCH,
        kind: 'armor',
        location: 'LA',
        value: 'NaN',
      },
      {
        unitId: ROSTER_ID,
        matchId: MATCH,
        kind: 'structure',
        location: 'RL',
        value: 'undefined',
      },
    ];
    expect(summary.skippedNonFiniteLocations).toEqual(skipped);
    expect(
      events.find((event) => event.type === 'post_battle_applied')?.data
        ?.skippedNonFiniteLocations,
    ).toEqual(skipped);
    const nonFiniteWarnings = warn.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' && message.includes('non-finite'),
    );
    expect(nonFiniteWarnings.map(([, detail]) => detail)).toEqual(skipped);
    warn.mockRestore();
  });

  it('an outcome with only opponent deltas needs no manifest', () => {
    const battle = outcome([delta(OPPONENT_SESSION_ID, GameSide.Opponent)]);
    const result = postBattleProcessor.process(
      campaignWith({ pendingBattleOutcomes: [battle] }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(applied.unitCombatStates).toEqual({});
  });
});

// ----------------------------------------------------------------------------
// Legacy battles: queued before the manifest existed, or started before the
// upgrade and finished after. The apply resolves them with the migration's
// trust order, and only an ambiguous one stays queued.
// ----------------------------------------------------------------------------

describe('postBattleProcessor legacy battles without a launch manifest (T1)', () => {
  const TEAM_FORCE = 'team-force-1';
  const LEGACY_SCENARIO = `scn-contract-1-3025-06-14-${TEAM_FORCE}`;

  function legacyOutcome(pilotRef?: string): ICombatOutcome {
    return {
      ...outcome([
        delta(PLAYER_SESSION_ID, GameSide.Player, {
          unitRef: 'atlas-as7-d',
          ...(pilotRef ? { pilotRef } : {}),
        }),
        delta(OPPONENT_SESSION_ID, GameSide.Opponent),
      ]),
      scenarioId: LEGACY_SCENARIO,
    };
  }

  function teamCampaign(unitIds: readonly string[]): ICampaignWithBattleState {
    return campaignWith({
      forces: new Map([
        [
          TEAM_FORCE,
          {
            id: TEAM_FORCE,
            name: 'Team One',
            subForceIds: [],
            unitIds: [...unitIds],
          } as never,
        ],
      ]),
    });
  }

  function seedRosterUnits(
    units: readonly { unitId: string; unitRef: string; pilotId?: string }[],
  ): void {
    useCampaignRosterStore.setState({
      units: units.map((unit) => ({ ...unit, unitName: unit.unitId })) as never,
    });
  }

  afterEach(() => {
    useCampaignRosterStore.setState({ pilots: [], units: [] });
  });

  it('applies a pending legacy outcome under the roster unit the force record resolves', () => {
    seedRosterUnits([
      { unitId: ROSTER_ID, unitRef: 'atlas-as7-d' },
      { unitId: 'roster-unit-8', unitRef: 'locust-lct-1v' },
    ]);
    const battle = legacyOutcome();
    const result = postBattleProcessor.process(
      {
        ...teamCampaign([ROSTER_ID, 'roster-unit-8']),
        pendingBattleOutcomes: [battle],
      },
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(Object.keys(applied.unitCombatStates)).toEqual([ROSTER_ID]);
    const record = applied.recentlyAppliedOutcomes?.find(
      (o) => o.matchId === MATCH,
    ) as IAppliedCombatOutcome | undefined;
    expect(record?.unitManifest).toEqual({
      [PLAYER_SESSION_ID]: { rosterUnitId: ROSTER_ID },
    });
  });

  it('R3: applies an ambiguous legacy outcome, writing no unit and flagging the delta with its candidates', () => {
    seedRosterUnits([
      { unitId: 'roster-a', unitRef: 'atlas-as7-d', pilotId: 'pilot-a' },
      { unitId: 'roster-b', unitRef: 'atlas-as7-d', pilotId: 'pilot-b' },
    ]);
    const battle = legacyOutcome('pilot-unknown');
    const result = postBattleProcessor.process(
      {
        ...teamCampaign(['roster-a', 'roster-b']),
        pendingBattleOutcomes: [battle],
      },
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(applied.unitCombatStates).toEqual({});
    expect(applied.legacyCombatStateFlags).toEqual([
      {
        kind: 'unapplied-delta',
        sessionUnitId: PLAYER_SESSION_ID,
        reason: 'ambiguous-roster-unit',
        candidateRosterUnitIds: ['roster-a', 'roster-b'],
        matchIds: [MATCH],
      },
    ]);
  });

  it('R3: applies the resolvable unit, pilot XP and contract while the ambiguous delta is flagged, not written', () => {
    seedPilot();
    seedRosterUnits([
      { unitId: ROSTER_ID, unitRef: 'atlas-as7-d', pilotId: PILOT_ID },
      { unitId: 'locust-a', unitRef: 'locust-lct-1v' },
      { unitId: 'locust-b', unitRef: 'locust-lct-1v' },
    ]);
    const contract = createContract({
      id: 'contract-r3',
      name: 'R3 Contract',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
    });
    const battle: ICombatOutcome = {
      ...outcome([
        delta(PLAYER_SESSION_ID, GameSide.Player, {
          unitRef: 'atlas-as7-d',
          pilotRef: PILOT_ID,
        }),
        delta(ALLY_SESSION_ID, GameSide.Player, { unitRef: 'locust-lct-1v' }),
        delta(OPPONENT_SESSION_ID, GameSide.Opponent),
      ]),
      scenarioId: LEGACY_SCENARIO,
      contractId: contract.id,
    };
    const { campaign, summary } = applyPostBattle(battle, {
      ...teamCampaign([ROSTER_ID]),
      missions: new Map([[contract.id, contract]]),
    });

    expect(Object.keys(campaign.unitCombatStates)).toEqual([ROSTER_ID]);
    expect(campaign.processedBattleIds).toContain(MATCH);
    expect(summary.contractUpdated).toBe(contract.id);
    expect(livePilot().campaignMissions).toBe(1);
    expect(campaign.legacyCombatStateFlags).toEqual([
      {
        kind: 'unapplied-delta',
        sessionUnitId: ALLY_SESSION_ID,
        reason: 'ambiguous-roster-unit',
        candidateRosterUnitIds: ['locust-a', 'locust-b'],
        matchIds: [MATCH],
      },
    ]);
  });

  it('R4: an incomplete manifest sends its unresolved unit through the legacy path instead of blocking', () => {
    const battle = outcome(fullDeltas);
    const result = postBattleProcessor.process(
      campaignWith({
        pendingBattleOutcomes: [battle],
        battleUnitManifests: {
          [MATCH]: pending(
            {
              [PLAYER_SESSION_ID]: { rosterUnitId: ROSTER_ID },
              [ALLY_SESSION_ID]: { unresolved: true, candidates: [] },
            },
            false,
          ),
        },
      }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(Object.keys(applied.unitCombatStates)).toEqual([ROSTER_ID]);
    expect(
      (applied.legacyCombatStateFlags ?? []).map((flag) => flag.sessionUnitId),
    ).toEqual([ALLY_SESSION_ID]);
  });

  it('N1 (probe B1): a launch-time unresolved unit is never re-resolved against the force as it is at apply', () => {
    seedRosterUnits([
      { unitId: 'roster-a', unitRef: 'atlas-as7-d' },
      { unitId: 'roster-b', unitRef: 'atlas-as7-d' },
    ]);
    const battle = legacyOutcome();
    // At launch both Atlases were in the force and nothing said which one
    // fought; afterwards roster-b left the force.
    const result = postBattleProcessor.process(
      {
        ...teamCampaign(['roster-a']),
        pendingBattleOutcomes: [battle],
        battleUnitManifests: {
          [MATCH]: pending(
            {
              [PLAYER_SESSION_ID]: {
                unresolved: true,
                candidates: ['roster-a', 'roster-b'],
              },
            },
            false,
          ),
        },
      },
      new Date('3025-06-15T00:00:00Z'),
    );
    const applied = result.campaign as ICampaignWithBattleState;
    expect(applied.processedBattleIds).toContain(MATCH);
    expect(applied.unitCombatStates).toEqual({});
    expect(applied.legacyCombatStateFlags).toEqual([
      expect.objectContaining({
        kind: 'unapplied-delta',
        sessionUnitId: PLAYER_SESSION_ID,
        candidateRosterUnitIds: ['roster-a', 'roster-b'],
      }),
    ]);
  });

  it('T3 still holds for a complete manifest missing a player unit', () => {
    const battle = outcome(fullDeltas);
    const result = postBattleProcessor.process(
      campaignWith({
        pendingBattleOutcomes: [battle],
        battleUnitManifests: {
          [MATCH]: pending({ [ALLY_SESSION_ID]: { notOnRoster: true } }, true),
        },
      }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const failed = result.campaign as ICampaignWithBattleState;
    expect(failed.pendingBattleOutcomes).toEqual([battle]);
    expect(failed.processedBattleIds ?? []).not.toContain(MATCH);
    expect(failed.legacyCombatStateFlags).toBeUndefined();
  });
});

describe('postBattleProcessor prunes abandoned launch manifests (T1)', () => {
  it('drops a non-pending manifest older than 31 campaign days, even with an empty queue', () => {
    const stale = {
      units: fullManifest,
      complete: true,
      recordedOn: '3025-05-01T00:00:00.000Z',
    };
    const fresh = { ...stale, recordedOn: '3025-06-10T00:00:00.000Z' };
    const result = postBattleProcessor.process(
      campaignWith({ battleUnitManifests: { stale, fresh } }),
      new Date('3025-06-15T00:00:00Z'),
    );
    expect(
      (result.campaign as ICampaignWithBattleState).battleUnitManifests,
    ).toEqual({ fresh });
  });

  it('leaves the campaign untouched when nothing is stale', () => {
    const start = campaignWith({
      battleUnitManifests: {
        fresh: {
          units: fullManifest,
          complete: true,
          recordedOn: '3025-06-10T00:00:00.000Z',
        },
      },
    });
    expect(
      postBattleProcessor.process(start, new Date('3025-06-15T00:00:00Z'))
        .campaign,
    ).toBe(start);
  });
});
