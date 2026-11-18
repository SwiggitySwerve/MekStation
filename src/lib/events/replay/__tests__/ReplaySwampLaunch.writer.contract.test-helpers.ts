import { IDBFactory } from 'fake-indexeddb';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import 'fake-indexeddb/auto';
import path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IMatchJournalEnvelope } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
import type { IIntent } from '@/types/multiplayer/Protocol';

import { buildEncounterPersistBody } from '@/components/encounter/persistEncounterFromSession';
import { persistEncounterGame } from '@/components/encounter/persistEncounterGame';
import { GameEngine } from '@/engine/GameEngine';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { persistInteractiveLaunchRecoveryLog } from '@/engine/InteractiveSession.persistence';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createPersistedHost } from '@/lib/multiplayer/server/__tests__/matchHostPersistence.test-helpers';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import { matchJournalBranchSegmentReader } from '@/lib/multiplayer/server/history/matchJournalBranchSegmentReader';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '@/lib/multiplayer/server/matchJournalAuthority';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
} from '@/lib/multiplayer/server/matchUnitBootstrap';
import { ServerMatchHost } from '@/lib/multiplayer/server/ServerMatchHost';
import { dispatchToEngine } from '@/lib/multiplayer/server/ServerMatchHostEngineDispatch';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import {
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  ReplaySource,
  type IGameSession,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { getActivePhaseUnitId } from '@/utils/gameplay/gameSessionActivation';
import { deployPlacementsFor } from '@/utils/gameplay/gameState/initialization';

import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';
import { gateReplaySurfaceHistory } from '../ReplaySurfaceGate';
import { expectHostedStateWithIntentStamps } from './hostedIntentStampAllowance';
import { replayFidelityState as boundaryState } from './replayFidelityTestState';
import { expectLibraryRecordingSourceAtEveryBoundary } from './replayLibraryStateAllowance';

const AT = '2026-11-11T00:00:00.000Z';
const SEED = 42;
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

beforeEach(() => {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: new IDBFactory(),
  });
  // Replace catalog I/O only; production disk lookup and adapters still build
  // every unit and GameCreated, as in the other launch contracts.
  const disk = getNodeCanonicalUnitService();
  jest
    .spyOn(getCanonicalUnitService(), 'getById')
    .mockImplementation((id, options) => disk.getById(id, options));
});
afterEach(async () => {
  await matchLogStorage.flushPendingWrites();
  matchLogStorage.close();
  jest.restoreAllMocks();
});

export async function runSwampLaunchContract(
  mode: 'single-player' | 'hosted-off' | 'hosted-enabled',
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'replay-swamp-launch-'));
  const meta: IMatchMeta = {
    matchId: `swamp-${mode}`,
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
  const bootstrap = await buildMatchHostBootstrapFromMeta(meta, {
    diceSeed: SEED,
  });
  // Board input, before either real GameCreated builder runs. Each unit can
  // enter an unoccupied adjacent deep-swamp tile with its normal run allowance.
  for (const placement of deployPlacementsFor(bootstrap.gameUnits)) {
    const to = {
      q: placement.position.q,
      r: placement.position.r + (placement.position.r > 0 ? -1 : 1),
    };
    const key = `${to.q},${to.r}`;
    const hex = bootstrap.grid.hexes.get(key);
    if (!hex) throw new Error('Swamp tile is outside the production board');
    bootstrap.grid.hexes.set(key, {
      ...hex,
      terrain: JSON.stringify([{ type: TerrainType.Swamp, level: 2 }]),
    });
  }
  let host: ServerMatchHost | undefined;
  let store: DurableMatchStore | undefined;
  try {
    const authority = mode === 'hosted-enabled';
    if (authority) {
      resetSQLiteService();
      getSQLiteService({
        path: path.join(directory, 'journal.db'),
      }).initialize();
      _resetProcessShadowStatsForTests();
    }
    _setCombatJournalAuthorityModeForTests(authority ? 'enabled' : 'off');
    const single =
      mode === 'single-player'
        ? new GameEngine({
            mapRadius: bootstrap.mapRadius,
            turnLimit: 5,
            seed: SEED,
            grid: bootstrap.grid,
          }).createInteractiveSession(
            bootstrap.playerUnits,
            bootstrap.opponentUnits,
            bootstrap.gameUnits,
          )
        : undefined;
    if (single) await persistInteractiveLaunchRecoveryLog(single.getSession());
    if (!single) {
      store = new DurableMatchStore({
        path: path.join(directory, 'matches.db'),
        ...(authority
          ? { capabilityDb: () => getSQLiteService().getDatabase() }
          : {}),
      });
      await store.createMatch(meta);
      host = await createPersistedHost(() =>
        ServerMatchHost.create(meta.matchId, store!, bootstrap),
      );
      expect(host.isJournalAuthorityEnabled()).toBe(authority);
    }
    const session = (): IGameSession => {
      if (single) return single.getSession();
      if (host) return host.getSessionForTests();
      throw new Error('Launch produced no session');
    };
    let commands = 0;
    let boundaries = 0;
    const intentIdByFirstSequence = new Map<number, string>();
    const hostedStampCounts: number[] = [];
    async function send(
      intent: IIntent['intent'],
      side: GameSide = GameSide.Player,
    ): Promise<void> {
      commands += 1;
      const intentId = `swamp-${commands}`;
      const before = session().events.length;
      if (single) dispatchToEngine(single, intent);
      else if (host) {
        const frames = await host.handleIntent({
          kind: 'Intent',
          matchId: meta.matchId,
          playerId: side === GameSide.Player ? 'p1' : 'p2',
          intentId,
          ts: AT,
          intent,
        });
        expect(frames.filter((frame) => frame.kind === 'Error')).toEqual([]);
      }
      const live = session();
      await matchLogStorage.flushPendingWrites();
      const events = store
        ? await store.getEvents(meta.matchId)
        : await matchLogStorage.getEventsForMatch(live.id);
      expect(events).toHaveLength(live.events.length);
      if (store) {
        // The host stamps each command's intentId on exactly one stored
        // event: the first event of that command's batch.
        const added = events.slice(before);
        expect(added.length).toBeGreaterThan(0);
        expect(
          added.flatMap((event, index) =>
            Object.hasOwn(event.payload as object, 'intentId')
              ? [[index, (event.payload as { intentId?: unknown }).intentId]]
              : [],
          ),
        ).toEqual([[0, intentId]]);
        intentIdByFirstSequence.set(added[0].sequence, intentId);
      }
      const gate = gateReplaySurfaceHistory(events, {
        surfaceId: 'swamp-launch',
        streamId: live.id,
        formatId: store ? 'match-broadcast' : 'match-log-idb',
        formatVersion: store ? 1 : 2,
      });
      expect(gate.kind === 'blocked' ? gate.blockedEvents : []).toEqual([]);
      if (gate.kind !== 'accepted')
        throw new Error('Swamp launch reader refused a production event');
      expect(gate.events).toHaveLength(events.length);
      const replay = hydrateGameSessionFromEvents(live.id, gate.events);
      // With journal authority the live session applies the committed,
      // stamped batch, so live and replay must be strictly equal.
      if (store && !authority) {
        hostedStampCounts.push(
          expectHostedStateWithIntentStamps(
            live.currentState,
            replay.currentState,
            intentIdByFirstSequence,
          ),
        );
      } else
        expect(boundaryState(replay.currentState)).toStrictEqual(
          boundaryState(live.currentState),
        );
      if (authority) {
        // The journal is the authority record: fold its rows too.
        const rows = await matchJournalBranchSegmentReader(
          new SQLiteEventJournal<IMatchJournalEnvelope>(
            getSQLiteService().getDatabase(),
          ),
        ).read(
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
        const journalGate = gateReplaySurfaceHistory(
          rows.map((row) => row.payload),
          {
            surfaceId: 'swamp-launch-journal',
            streamId: live.id,
            formatId: 'match-broadcast',
            formatVersion: 1,
          },
        );
        if (journalGate.kind !== 'accepted')
          throw new Error('Swamp journal reader refused a production event');
        expect(
          boundaryState(
            hydrateGameSessionFromEvents(live.id, journalGate.events)
              .currentState,
          ),
        ).toStrictEqual(boundaryState(live.currentState));
      }
      boundaries += 1;
    }
    await send({ kind: 'AdvancePhase' });
    expect(session().currentState.phase).toBe(GamePhase.Movement);
    for (let index = 0; index < 2; index += 1) {
      const active = getActivePhaseUnitId(session());
      if (!active) throw new Error('No active unit for the swamp move');
      const unit = session().currentState.units[active];
      await send(
        {
          kind: 'Move',
          unitId: active,
          movementType: MovementType.Run,
          facing: unit.facing,
          to: {
            q: unit.position.q,
            r: unit.position.r + (unit.side === GameSide.Player ? -1 : 1),
          },
        },
        unit.side,
      );
    }
    await send({ kind: 'AdvancePhase' });
    expect(session().currentState.phase).toBe(GamePhase.WeaponAttack);
    for (let index = 0; index < 2; index += 1) {
      const active = getActivePhaseUnitId(session());
      if (!active) throw new Error('No active unit for the real attack');
      const unit = session().currentState.units[active];
      const target = Object.values(session().currentState.units).find(
        (candidate) => candidate.side !== unit.side,
      );
      const adapted = [
        ...bootstrap.playerUnits,
        ...bootstrap.opponentUnits,
      ].find((candidate) => candidate.id === active);
      const weapon = adapted?.weapons.find(
        (candidate) => candidate.damage > 0 && !candidate.destroyed,
      );
      if (!target || !weapon)
        throw new Error('Production bootstrap lacks a target or weapon');
      await send(
        {
          kind: 'Attack',
          attackerId: active,
          targetId: target.id,
          weaponIds: [weapon.id],
        },
        unit.side,
      );
    }
    await send({ kind: 'AdvancePhase' }); // Resolve the real sealed attack declarations.
    // The interactive engine drains pending terrain PSRs in End, then starts
    // the next turn. Stop only after that production resolution boundary.
    for (
      let index = 0;
      index < 4 && session().currentState.turn < 2;
      index += 1
    )
      await send({ kind: 'AdvancePhase' });
    const live = session();
    expect(
      live.events.filter(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toEqual([]);
    const trigger = live.events.filter(
      (event) =>
        event.type === GameEventType.PSRTriggered &&
        (event.payload as { automaticFailure?: boolean }).automaticFailure ===
          true,
    );
    const resolved = live.events.filter(
      (event) =>
        event.type === GameEventType.PSRResolved &&
        (event.payload as { automaticFailure?: boolean }).automaticFailure ===
          true,
    );
    expect(trigger.length).toBeGreaterThan(0);
    expect(resolved.length).toBeGreaterThan(0);
    expect(
      live.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(true);
    expect(
      live.events.some((event) => event.type === GameEventType.AttackResolved),
    ).toBe(true);
    expect(
      live.events.filter((event) => event.replayIntegrity !== undefined),
    ).toEqual([]);
    if (single) {
      const cold = await InteractiveSession.fromMatchLog(live.id);
      expect(boundaryState(cold.currentState)).toStrictEqual(
        boundaryState(live.currentState),
      );
      const body = buildEncounterPersistBody(live);
      if (body.templateType !== null)
        throw new Error('Unexpected template type');
      const persisted = await persistEncounterGame({
        ...body,
        templateType: body.templateType,
        cwd: directory,
      });
      if (!persisted.persisted || !persisted.path)
        throw new Error('Single-player production writer did not write');
      const loaded = loadReplayLibraryNdjson(
        await readFile(persisted.path, 'utf8'),
        live.id,
      );
      expect(loaded.kind === 'blocked' ? loaded.blockedLines : []).toEqual([]);
      if (loaded.kind !== 'loaded') throw new Error('Swamp NDJSON blocked');
      expect(loaded.events).toHaveLength(live.events.length);
      const sourceCounts = expectLibraryRecordingSourceAtEveryBoundary(
        live.id,
        live.events,
        loaded.events,
        live.currentState,
        ReplaySource.Encounter,
      );
      console.info('SWAMP_LIBRARY_SOURCE_COUNTS', JSON.stringify(sourceCounts));
    }
    console.info(
      'SWAMP_LAUNCH_CONTRACT',
      JSON.stringify({
        mode,
        seed: SEED,
        commands,
        boundaries,
        events: live.events.length,
        automaticTriggers: trigger.length,
        automaticResolutions: resolved.length,
        marked: 0,
        hostedStampCounts,
      }),
    );
  } finally {
    await host?.closeMatch();
    store?.close();
    _setCombatJournalAuthorityModeForTests(null);
    if (mode === 'hosted-enabled') {
      _resetProcessShadowStatsForTests();
      resetSQLiteService();
    }
    await rm(directory, { recursive: true, force: true });
  }
}
