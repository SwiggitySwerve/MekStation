/**
 * T1: recording a launch manifest stamps the campaign date, resolves player
 * units that have no roster link at launch (the force and roster are the
 * launch-time truth), records the rest as explicitly unresolved, and marks
 * the manifest complete or incomplete. A relaunch of the same mission prunes
 * nothing.
 */
import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { postBattleProcessor } from '@/lib/campaign/processors/postBattleProcessor';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { ForcePosition, ForceStatus, ForceType } from '@/types/force';
import { GameSide } from '@/types/gameplay';

import { recordCampaignBattleUnitManifest } from '../campaignBattleUnitManifests';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));
const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

const TEAM = 'team-force-1';
const SCENARIO = `scn-contract-1-3025-06-14-${TEAM}`;
const units = { 'player-1-atlas-as7-d': { rosterUnitId: 'roster-1' } };

function seed(extra: Record<string, unknown>) {
  resetCampaignStore();
  useCampaignStore().setState({
    campaign: {
      id: 'camp-m',
      name: 'Manifests',
      currentDate: new Date('3025-06-15T00:00:00.000Z'),
      factionId: 'mercenary',
      forces: new Map([
        [
          TEAM,
          { id: TEAM, name: 'Team', subForceIds: [], unitIds: ['roster-a'] },
        ],
      ]),
      rootForceId: 'root',
      missions: new Map(),
      finances: { transactions: [], balance: new Money(0) },
      factionStandings: {},
      shoppingList: { items: [] },
      options: createDefaultCampaignOptions(),
      campaignType: CampaignType.MERCENARY,
      createdAt: '3025-01-01T00:00:00Z',
      updatedAt: '3025-01-01T00:00:00Z',
      unitCombatStates: {},
      ...extra,
    } as never,
  });
  useCampaignRosterStore.setState({
    campaignId: 'camp-m',
    units: [
      { unitId: 'roster-a', unitName: 'Atlas A', unitRef: 'atlas-as7-d' },
      { unitId: 'locust-a', unitName: 'Locust A', unitRef: 'locust-lct-1v' },
      { unitId: 'locust-b', unitName: 'Locust B', unitRef: 'locust-lct-1v' },
    ] as never,
  });
}

function liveManifests() {
  return useCampaignStore().getState().campaign?.battleUnitManifests;
}

describe('recordCampaignBattleUnitManifest', () => {
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.setState({ campaignId: null, units: [] });
  });

  it('stamps the campaign date and keeps an earlier launch of the same scenario that may still be in progress', () => {
    const earlier = {
      units,
      complete: true,
      recordedOn: '3025-06-14T00:00:00.000Z',
    };
    seed({ battleUnitManifests: { earlier } });

    expect(
      recordCampaignBattleUnitManifest({
        campaignId: 'camp-m',
        matchId: 'relaunch',
        units,
        playerUnits: [
          { unitId: 'player-1-atlas-as7-d', unitRef: 'atlas-as7-d' },
        ],
        scenarioId: SCENARIO,
      }),
    ).toBe(true);

    expect(liveManifests()).toEqual({
      earlier,
      relaunch: {
        units,
        complete: true,
        recordedOn: '3025-06-15T00:00:00.000Z',
      },
    });
  });

  it('R4: resolves an unlinked player unit at launch through the force record', () => {
    seed({});
    recordCampaignBattleUnitManifest({
      campaignId: 'camp-m',
      matchId: 'm-unlinked',
      units: {},
      playerUnits: [{ unitId: 'player-1-atlas-as7-d', unitRef: 'atlas-as7-d' }],
      scenarioId: SCENARIO,
    });
    expect(liveManifests()?.['m-unlinked']).toMatchObject({
      units: { 'player-1-atlas-as7-d': { rosterUnitId: 'roster-a' } },
      complete: true,
    });
  });

  it('R4: records a unit it still cannot resolve as unresolved and the manifest as incomplete', () => {
    seed({});
    recordCampaignBattleUnitManifest({
      campaignId: 'camp-m',
      matchId: 'm-ambiguous',
      units: {},
      playerUnits: [
        { unitId: 'player-1-atlas-as7-d', unitRef: 'atlas-as7-d' },
        { unitId: 'player-2-locust-lct-1v', unitRef: 'locust-lct-1v' },
      ],
      scenarioId: SCENARIO,
    });
    expect(liveManifests()?.['m-ambiguous']).toMatchObject({
      units: {
        'player-1-atlas-as7-d': { rosterUnitId: 'roster-a' },
        'player-2-locust-lct-1v': {
          unresolved: true,
          candidates: ['locust-a', 'locust-b'],
        },
      },
      complete: false,
    });
  });

  it('refuses (and records nothing) for another campaign', () => {
    seed({});
    expect(
      recordCampaignBattleUnitManifest({
        campaignId: 'camp-other',
        matchId: 'm-1',
        units,
        playerUnits: [],
        scenarioId: null,
      }),
    ).toBe(false);
    expect(liveManifests()).toBeUndefined();
  });
});

describe('a reused pre-upgrade encounter (force rows with NULL roster_unit_id)', () => {
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.setState({ campaignId: null, units: [] });
  });

  it('R4: launch records the resolved roster id and the outcome applies under it', async () => {
    seed({});
    adaptUnitMock.mockImplementation(
      async (unitId, options) =>
        ({
          id: unitId,
          side: options?.side ?? GameSide.Player,
          armor: { center_torso: 30 },
          structure: { center_torso: 20 },
        }) as unknown as IAdaptedUnit,
    );
    // As the forces API reads back a row written before the column existed.
    const legacyForce = (unitRef: string, id: string): IForce =>
      ({
        id,
        name: id,
        forceType: ForceType.Lance,
        status: ForceStatus.Active,
        childIds: [],
        assignments: [
          {
            id: `${id}-slot-1`,
            pilotId: null,
            unitId: unitRef,
            position: ForcePosition.Lead,
            slot: 1,
          },
        ],
        stats: {} as never,
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      }) as IForce;
    const prepared = await buildPreparedBattleData({
      playerForce: legacyForce('atlas-as7-d', 'rest-player'),
      opponentForce: legacyForce('commando-com-2d', 'rest-opfor'),
      pilots: [],
    });
    expect(prepared.unitManifest).toEqual({});

    const sessionId = prepared.gameUnits.find(
      (unit) => unit.side === GameSide.Player,
    )!.id;
    recordCampaignBattleUnitManifest({
      campaignId: 'camp-m',
      matchId: 'm-reused',
      units: prepared.unitManifest,
      playerUnits: prepared.gameUnits
        .filter((unit) => unit.side === GameSide.Player)
        .map((unit) => ({
          unitId: unit.id,
          unitRef: unit.unitRef,
          pilotRef: unit.pilotRef,
        })),
      scenarioId: SCENARIO,
    });

    expect(liveManifests()?.['m-reused']).toMatchObject({
      units: { [sessionId]: { rosterUnitId: 'roster-a' } },
      complete: true,
    });

    // The force changes after launch; only the recorded manifest can still
    // name the unit, so applying under roster-a proves it was recorded.
    const campaign = useCampaignStore().getState().campaign!;
    const result = postBattleProcessor.process(
      {
        ...campaign,
        forces: new Map(),
        pendingBattleOutcomes: [
          {
            version: COMBAT_OUTCOME_VERSION,
            matchId: 'm-reused',
            contractId: null,
            scenarioId: SCENARIO,
            endReason: CombatEndReason.Destruction,
            report: {
              version: 1,
              matchId: 'm-reused',
              winner: GameSide.Player,
              reason: 'destruction',
              turnCount: 3,
              units: [],
              mvpUnitId: null,
              log: [],
            },
            unitDeltas: [
              {
                unitId: sessionId,
                side: GameSide.Player,
                destroyed: false,
                finalStatus: UnitFinalStatus.Damaged,
                armorRemaining: { center_torso: 12 },
                internalsRemaining: { center_torso: 20 },
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
              },
            ],
            capturedAt: '3025-06-15T00:00:00.000Z',
          },
        ],
      } as never,
      new Date('3025-06-15T00:00:00.000Z'),
    );
    const states = (result.campaign as { unitCombatStates: object })
      .unitCombatStates as Record<string, { currentArmorPerLocation: object }>;
    expect(Object.keys(states)).toEqual(['roster-a']);
    expect(states['roster-a'].currentArmorPerLocation).toEqual({
      center_torso: 12,
    });
  });
});
