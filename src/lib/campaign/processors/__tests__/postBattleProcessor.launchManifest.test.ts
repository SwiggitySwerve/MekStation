/**
 * T1 + T3: battle damage is keyed by the roster unit through the launch
 * manifest, and a player delta the manifest cannot map fails the whole
 * outcome before the commit point.
 */
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
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';

import {
  postBattleProcessor,
  type ICampaignWithBattleState,
} from '../postBattleProcessor';

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
        battleUnitManifests: { [MATCH]: fullManifest },
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
      battleUnitManifests: { [MATCH]: partialManifest },
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
      { ...failed, battleUnitManifests: { [MATCH]: fullManifest } },
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

  it('an outcome with no manifest at all is an error and stays queued', () => {
    const battle = outcome(fullDeltas);
    const result = postBattleProcessor.process(
      campaignWith({ pendingBattleOutcomes: [battle] }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const failed = result.campaign as ICampaignWithBattleState;
    expect(failed.pendingBattleOutcomes).toEqual([battle]);
    expect(failed.processedBattleIds ?? []).not.toContain(MATCH);
    expect(failed.unitCombatStates).toEqual({});
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
        battleUnitManifests: { [MATCH]: fullManifest },
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
