import 'fake-indexeddb/auto';
import type { NextRouter } from 'next/router';

import { act, renderHook } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import { buildEncounterPersistBody } from '@/components/encounter/persistEncounterFromSession';
import { persistEncounterGame } from '@/components/encounter/persistEncounterGame';
import { buildPreBattleLaunchLinkage } from '@/components/gameplay/pages/preBattle/preBattleLaunchLinkage';
import { usePreBattleLaunch } from '@/components/gameplay/pages/preBattle/usePreBattleLaunch';
import { persistQuickGame } from '@/components/quickgame/persistQuickGame';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { readyCanonicalCatalog } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createPersistedHost } from '@/lib/multiplayer/server/__tests__/matchHostPersistence.test-helpers';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import { matchJournalBranchSegmentReader } from '@/lib/multiplayer/server/history/matchJournalBranchSegmentReader';
import { type IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import {
  _setCombatJournalAuthorityModeForTests,
  _resetProcessShadowStatsForTests,
} from '@/lib/multiplayer/server/matchJournalAuthority';
import { type IMatchJournalEnvelope } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
} from '@/lib/multiplayer/server/matchUnitBootstrap';
import { ServerMatchHost } from '@/lib/multiplayer/server/ServerMatchHost';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import {
  EncounterStatus,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
} from '@/types/encounter';
import {
  ForcePosition,
  ForceStatus,
  ForceType,
  type IForce,
} from '@/types/force';
import {
  GameEventType,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';
import {
  createQuickGameInstance,
  createQuickGameUnit,
} from '@/types/quickgame';

import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';
import { gateReplaySurfaceHistory } from '../ReplaySurfaceGate';

const SEED = 42;
const AT = '2026-11-11T00:00:00.000Z';
let cwd: string;
const originalClone = Object.getOwnPropertyDescriptor(
  globalThis,
  'structuredClone',
);

beforeAll(() => {
  if (!originalClone)
    Object.defineProperty(globalThis, 'structuredClone', {
      configurable: true,
      writable: true,
      value: <T>(value: T): T => deserialize(serialize(value)) as T,
    });
});
afterAll(() => {
  if (!originalClone) Reflect.deleteProperty(globalThis, 'structuredClone');
});

function force(id: string, unitRef: string): IForce {
  return {
    id,
    name: id,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: [
      {
        id: `${id}-slot`,
        pilotId: null,
        unitId: unitRef,
        position: ForcePosition.Member,
        slot: 1,
      },
    ],
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: 0,
      assignedUnits: 1,
      emptySlots: 3,
      averageSkill: { gunnery: 4, piloting: 5 },
    },
    createdAt: AT,
    updatedAt: AT,
  };
}

function encounter(id: string, player: IForce, opponent: IForce): IEncounter {
  const ref = (value: IForce) => ({
    forceId: value.id,
    forceName: value.name,
    totalBV: 0,
    unitCount: 1,
  });
  return {
    id,
    name: id,
    status: EncounterStatus.Ready,
    playerForce: ref(player),
    opponentForce: ref(opponent),
    mapConfig: {
      radius: 7,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: AT,
    updatedAt: AT,
  };
}

function router(): NextRouter {
  return {
    basePath: '',
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    isFallback: false,
    isReady: true,
    isPreview: false,
    isLocaleDomain: false,
    push: jest.fn(async () => true),
    replace: jest.fn(async () => true),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(async () => undefined),
    beforePopState: jest.fn(),
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  };
}

async function launchPreBattle(
  source: IEncounter,
  playerForce: IForce,
  opponentForce: IForce,
  campaign = false,
): Promise<IGameSession> {
  let session: IGameSession | undefined;
  const showToast = jest.fn();
  const linkage = buildPreBattleLaunchLinkage({
    encounter: source,
    ...(campaign
      ? { campaignId: 'launch-campaign', missionId: 'launch-mission' }
      : {}),
  });
  const hook = renderHook(() =>
    usePreBattleLaunch({
      playerForce,
      opponentForce,
      pilots: [],
      mapConfig: source.mapConfig,
      gameConfig: {
        mapRadius: source.mapConfig.radius,
        turnLimit: 3,
        victoryConditions: ['destroy_all'],
        optionalRules: [],
      },
      linkage,
      router: router(),
      seedOverride: SEED,
      setSession: (value) => {
        session = value;
      },
      setInteractiveSession: jest.fn(),
      setSpectatorMode: jest.fn(),
      setIsResolving: jest.fn(),
      showToast,
    }),
  );
  try {
    await act(async () => {
      await hook.result.current('auto');
    });
    expect(
      showToast.mock.calls.filter(([toast]) => toast.variant === 'error'),
    ).toEqual([]);
    if (!session)
      throw new Error(
        'The production pre-battle launch did not return a session',
      );
    expect(session.currentState.turn).toBeGreaterThanOrEqual(3);
    if (campaign) {
      expect(session.config).toMatchObject({
        campaignId: 'launch-campaign',
        contractId: 'launch-mission',
        scenarioId: source.id,
      });
    }
    return session;
  } finally {
    hook.unmount();
  }
}

function assertAccepted(
  label: string,
  events: readonly IGameEvent[],
  raw: string,
): void {
  expect(events[0].type).toBe(GameEventType.GameCreated);
  const loaded = loadReplayLibraryNdjson(raw, label);
  expect(loaded.kind === 'blocked' ? loaded.blockedLines : []).toEqual([]);
  if (loaded.kind !== 'loaded') throw new Error(`${label}: replay was blocked`);
  expect(loaded.events).toHaveLength(events.length);
  expect(loaded.census.eventsApplied).toBe(events.length);
  expect(events.filter((event) => event.replayIntegrity !== undefined)).toEqual(
    [],
  );
  expect(
    loaded.events.filter((event) => event.replayIntegrity !== undefined),
  ).toEqual([]);
  const gate = gateReplaySurfaceHistory(loaded.events, {
    surfaceId: 'launch-path-contract',
    streamId: label,
    formatId: 'match-log-idb',
    formatVersion: 2,
  });
  expect(gate.kind === 'blocked' ? gate.blockedEvents : []).toEqual([]);
  expect(gate.kind).toBe('accepted');
  if (gate.kind === 'accepted') expect(gate.events).toHaveLength(events.length);
  console.info(
    'LAUNCH_PATH_CONTRACT',
    JSON.stringify({
      path: label,
      events: events.length,
      accepted: loaded.events.length,
      marked: 0,
      result: loaded.kind,
    }),
  );
}

async function persistEncounter(
  label: string,
  session: IGameSession,
): Promise<void> {
  const body = buildEncounterPersistBody(session);
  if (body.templateType !== null)
    throw new Error('This launch fixture has no encounter template');
  const result = await persistEncounterGame({
    ...body,
    templateType: body.templateType,
    cwd,
  });
  expect(result.persisted).toBe(true);
  if (!result.path) throw new Error('No encounter file was written');
  assertAccepted(label, session.events, await readFile(result.path, 'utf8'));
}

beforeEach(async () => {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: new IDBFactory(),
  });
  cwd = await mkdtemp(path.join(tmpdir(), 'mek-launch-contract-'));
  // Only the catalog I/O boundary is substituted. The real lookup service,
  // adapter, launch builders, engine, writer, schema and readers all execute.
  const disk = getNodeCanonicalUnitService();
  jest
    .spyOn(getCanonicalUnitService(), 'getById')
    .mockImplementation((id, options) => disk.getById(id, options));
  // Encounter lifecycle HTTP is external to this writer/read contract.
  jest.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }) as Response,
  );
});

afterEach(async () => {
  await matchLogStorage.flushPendingWrites();
  matchLogStorage.close();
  jest.restoreAllMocks();
  await rm(cwd, { recursive: true, force: true });
});

describe('real launch-path production writer/read contract', () => {
  it('quick game: store startBattle writes every real launch and combat event', async () => {
    const makeUnit = (unitRef: string) =>
      createQuickGameUnit({
        sourceUnitId: unitRef,
        name: unitRef,
        chassis: unitRef,
        variant: 'standard',
        bv: 1000,
        tonnage: 100,
        gunnery: 4,
        piloting: 5,
        maxArmor: {},
        maxStructure: {},
      });
    const player = makeUnit('atlas-as7-d');
    const opponent = makeUnit('marauder-mad-3r');
    const game = createQuickGameInstance();
    useQuickGameStore.setState({
      game: {
        ...game,
        playerForce: {
          ...game.playerForce,
          units: [player],
          totalBV: player.bv,
          totalTonnage: player.tonnage,
        },
        opponentForce: {
          name: 'Opposition',
          units: [opponent],
          totalBV: opponent.bv,
          totalTonnage: opponent.tonnage,
        },
      },
      error: null,
      isLoading: false,
      seedOverride: SEED,
    });
    await useQuickGameStore.getState().startBattle();
    expect(useQuickGameStore.getState().error).toBeNull();
    const session = useGameplayStore.getState().session;
    if (!session)
      throw new Error('Quick-game store did not publish its session');
    expect(session.currentState.turn).toBeGreaterThanOrEqual(3);
    expect(useQuickGameStore.getState().game?.events).toEqual(session.events);
    const result = await persistQuickGame({
      gameId: session.id,
      events: session.events,
      winner: 'draw',
      aiVariant: 'standard',
      bvTotal: 2000,
      cwd,
    });
    expect(result.persisted).toBe(true);
    if (!result.path) throw new Error('No quick-game file was written');
    assertAccepted(
      'quick-store',
      session.events,
      await readFile(result.path, 'utf8'),
    );
  }, 120_000);

  it('encounter: real pre-battle hook and builder write every event', async () => {
    const player = force('enc-player', 'atlas-as7-d');
    const opponent = force('enc-opponent', 'marauder-mad-3r');
    const session = await launchPreBattle(
      encounter('launch-encounter', player, opponent),
      player,
      opponent,
    );
    await persistEncounter('encounter-pre-battle', session);
  }, 120_000);

  it('campaign mission: materialization and pre-battle linkage write every event', async () => {
    const forces: IForce[] = [];
    let source: IEncounter | undefined;
    const transport: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<
        string,
        unknown
      >;
      if (url === '/api/forces') {
        const value = force(`mission-force-${forces.length}`, '');
        forces.push(value);
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true, force: value }),
        } as Response;
      }
      if (url.startsWith('/api/forces/assignments/')) {
        const index = forces.findIndex((value) =>
          url.endsWith(value.assignments[0].id),
        );
        const value = forces[index];
        if (!value || typeof body.unitId !== 'string')
          throw new Error(`Invalid assignment transport ${url}`);
        forces[index] = {
          ...value,
          assignments: [
            {
              ...value.assignments[0],
              unitId: body.unitId,
              pilotId: typeof body.pilotId === 'string' ? body.pilotId : null,
            },
          ],
        };
      } else if (url === '/api/encounters') {
        source = encounter('mission-encounter', forces[0], forces[1]);
      } else if (
        url === '/api/encounters/mission-encounter' &&
        init?.method === 'PATCH'
      ) {
        if (!source) throw new Error('Missing materialized encounter');
        source = { ...source, ...(body as Partial<IEncounter>) };
      } else if (!url.startsWith('/api/encounters/mission-encounter/')) {
        throw new Error(`Unexpected materialization transport ${url}`);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, id: source?.id }),
      } as Response;
    };
    const mission = createContract({
      id: 'launch-mission',
      name: 'Launch contract',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      scenarioIds: [],
    });
    const result = await materializeCampaignMissionEncounter({
      campaign: {
        id: 'launch-campaign',
        name: 'Launch campaign',
        missions: new Map([[mission.id, mission]]),
      },
      missionId: mission.id,
      rosterUnits: [
        {
          unitId: 'roster-atlas',
          unitName: 'Atlas',
          chassisVariant: 'AS7-D',
          unitRef: 'atlas-as7-d',
          readiness: 'Ready',
        },
      ],
      catalog: readyCanonicalCatalog(['atlas-as7-d']),
      fetchImpl: transport,
    });
    if (!source)
      throw new Error('Mission launch did not materialize an encounter');
    expect(result.encounterId).toBe(source.id);
    const session = await launchPreBattle(source, forces[0], forces[1], true);
    await persistEncounter('campaign-mission', session);
  }, 120_000);

  it('hosted bootstrap: real matchUnitBootstrap writes durable events and journal history', async () => {
    resetSQLiteService();
    getSQLiteService({ path: path.join(cwd, 'journal.db') }).initialize();
    _setCombatJournalAuthorityModeForTests('enabled');
    _resetProcessShadowStatsForTests();
    const store = new DurableMatchStore({
      path: path.join(cwd, 'matches.db'),
      capabilityDb: () => getSQLiteService().getDatabase(),
    });
    let host: ServerMatchHost | undefined;
    try {
      const meta: IMatchMeta = {
        matchId: 'launch-host',
        hostPlayerId: 'p1',
        playerIds: ['p1', 'p2'],
        sideAssignments: [
          { playerId: 'p1', side: 'player' },
          { playerId: 'p2', side: 'opponent' },
        ],
        status: 'active',
        createdAt: AT,
        updatedAt: AT,
        config: { mapRadius: 7, turnLimit: 5 },
        unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 7),
      };
      await store.createMatch(meta);
      const bootstrap = await buildMatchHostBootstrapFromMeta(meta, {
        diceSeed: SEED,
      });
      host = await createPersistedHost(() =>
        ServerMatchHost.create(meta.matchId, store, bootstrap),
      );
      for (
        let index = 0;
        index < 30 && host.getSessionForTests().currentState.turn < 3;
        index += 1
      ) {
        const messages = await host.handleIntent({
          kind: 'Intent',
          matchId: meta.matchId,
          playerId: 'p1',
          ts: AT,
          intentId: `launch-phase-${index}`,
          intent: { kind: 'AdvancePhase' },
        });
        expect(messages.filter((message) => message.kind === 'Error')).toEqual(
          [],
        );
      }
      expect(
        host.getSessionForTests().currentState.turn,
      ).toBeGreaterThanOrEqual(3);
      const events = await store.getEvents(meta.matchId);
      expect(events).toHaveLength(host.getSessionForTests().events.length);
      const journal = new SQLiteEventJournal<IMatchJournalEnvelope>(
        getSQLiteService().getDatabase(),
      );
      const rows = await matchJournalBranchSegmentReader(journal).read(
        { streamType: 'match', streamId: meta.matchId },
        {
          kind: 'prefix',
          branchId: 'main',
          fromRevision: 0,
          throughRevision: events.length,
          baseEventId: null,
          baseDigest: '0'.repeat(64),
        },
      );
      expect(rows).toHaveLength(events.length);
      const accepted = gateReplaySurfaceHistory(
        rows.map((row) => row.payload),
        {
          surfaceId: 'hosted-history',
          streamId: meta.matchId,
          formatId: 'match-broadcast',
          formatVersion: 1,
        },
      );
      expect(accepted.kind === 'blocked' ? accepted.blockedEvents : []).toEqual(
        [],
      );
      expect(accepted.kind).toBe('accepted');
      if (accepted.kind === 'accepted')
        expect(accepted.events).toHaveLength(events.length);
      expect(
        events.filter((event) => event.replayIntegrity !== undefined),
      ).toEqual([]);
      console.info(
        'LAUNCH_PATH_CONTRACT',
        JSON.stringify({
          path: 'hosted-bootstrap',
          events: events.length,
          accepted: rows.length,
          marked: 0,
          result: accepted.kind,
        }),
      );
    } finally {
      await host?.closeMatch();
      store.close();
      _setCombatJournalAuthorityModeForTests(null);
      _resetProcessShadowStatsForTests();
      resetSQLiteService();
    }
  }, 120_000);
});
