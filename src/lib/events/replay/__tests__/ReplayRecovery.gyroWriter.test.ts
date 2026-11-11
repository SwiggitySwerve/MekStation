import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  hydrateRecoverableSessionWithReport,
  InteractiveSessionRecoveryCorruptError,
  persistInteractiveLaunchRecoveryLog,
} from '@/engine/InteractiveSession.persistence';
import { buildMirrorSessionGated } from '@/lib/multiplayer/mirrorMatchSession';
import { InMemoryMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import { SeededDiceRoller } from '@/lib/multiplayer/server/RollCapture';
import { ServerMatchHost } from '@/lib/multiplayer/server/ServerMatchHost';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededD6Roller, SeededRandom } from '@/simulation/core';
import {
  GameEventType,
  GamePhase,
  GameSide,
  PSRTrigger,
  type IGameEvent,
  type IGameUnit,
  type IPSRResolvedPayload,
} from '@/types/gameplay';
import {
  createCriticalHitResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents';

function battleUnits() {
  const designs = [
    ['player-0', GameSide.Player, '2-star-league/standard/Atlas AS7-D.json'],
    [
      'opponent-1',
      GameSide.Opponent,
      '3-succession-wars/standard/Marauder MAD-3R.json',
    ],
  ] as const;
  const adapted = designs.map(([id, side, design]) => ({
    ...adaptUnitFromData(
      JSON.parse(
        readFileSync(
          path.resolve('public/data/units/battlemechs', design),
          'utf8',
        ),
      ) as IFullUnit,
      { side },
    ),
    id,
  }));
  const gameUnits: IGameUnit[] = adapted.map((unit, index) => ({
    id: unit.id,
    name: unit.id,
    side: unit.side,
    unitRef: index === 0 ? 'atlas-as7-d' : 'marauder-mad-3r',
    pilotRef: 'Regular',
    gunnery: 4,
    piloting: 5,
  }));
  return { player: [adapted[0]], opponent: [adapted[1]], gameUnits };
}

function queueDestroyedGyroAtEnd(source: InteractiveSession): void {
  for (
    let steps = 0;
    source.getState().phase !== GamePhase.End && steps < 8;
    steps++
  ) {
    source.advancePhase();
  }
  expect(source.getState().phase).toBe(GamePhase.End);
  // Recreate seed 8's trigger through real event factories/reducers. No
  // fabricated PSRResolved and no mutation of the session's cached state.
  for (const slotIndex of [3, 4]) {
    const before = source.getSession();
    source.appendEvent(
      createCriticalHitResolvedEvent({
        gameId: before.id,
        sequence: before.events.length,
        turn: before.currentState.turn,
        phase: GamePhase.End,
        unitId: 'opponent-1',
        location: 'center_torso',
        slotIndex,
        componentType: 'gyro',
        componentName: 'Gyro',
        effect: 'Gyro hit',
        destroyed: true,
      }),
    );
    const next = source.getSession();
    source.appendEvent(
      createPSRTriggeredEvent({
        gameId: next.id,
        sequence: next.events.length,
        turn: next.currentState.turn,
        phase: GamePhase.End,
        unitId: 'opponent-1',
        reason: 'Gyro hit',
        reasonCode: PSRTrigger.GyroHit,
        triggerSource: PSRTrigger.GyroHit,
        additionalModifier: 3,
        basePilotingSkill: 5,
      }),
    );
  }
  expect(source.getState().units['opponent-1'].componentDamage?.gyroHits).toBe(
    2,
  );
  expect(source.getState().units['opponent-1'].pendingPSRs).toHaveLength(2);
}

function assertAutomaticFailures(events: readonly IGameEvent[]): void {
  const resolved = events.filter(
    (event) => event.type === GameEventType.PSRResolved,
  );
  expect(resolved).toHaveLength(2);
  for (const event of resolved) {
    expect(event.payload).toMatchObject({
      unitId: 'opponent-1',
      reasonCode: PSRTrigger.GyroHit,
      passed: false,
      roll: 0,
    } satisfies Partial<IPSRResolvedPayload>);
  }
}

function evidence(surface: string, value: unknown): void {
  if (process.env.REPLAY_RECOVERY_EVIDENCE) {
    writeFileSync(
      `${process.env.REPLAY_RECOVERY_EVIDENCE}.${surface}.json`,
      JSON.stringify(value, null, 2),
    );
  }
}

describe('destroyed-gyro production events remain recoverable', () => {
  const originalClone = Object.getOwnPropertyDescriptor(
    globalThis,
    'structuredClone',
  );

  beforeAll(() => {
    // jsdom lacks structuredClone. Unlike a JSON polyfill, this preserves
    // Infinity across IndexedDB so the real recovery gate owns serialization.
    if (!originalClone) {
      Object.defineProperty(globalThis, 'structuredClone', {
        configurable: true,
        writable: true,
        value: <T>(value: T): T => deserialize(serialize(value)) as T,
      });
    }
  });

  beforeEach(() => {
    matchLogStorage.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: new IDBFactory(),
    });
  });

  afterEach(async () => {
    await matchLogStorage.flushPendingWrites();
    matchLogStorage.close();
  });

  afterAll(() => {
    if (!originalClone) Reflect.deleteProperty(globalThis, 'structuredClone');
  });

  it('A: cold-recovers the quick interactive session from its actual IndexedDB log', async () => {
    const units = battleUnits();
    const source = new GameEngine({ seed: 8 }).createInteractiveSession(
      units.player,
      units.opponent,
      units.gameUnits,
    );
    await persistInteractiveLaunchRecoveryLog(source.getSession());
    queueDestroyedGyroAtEnd(source);
    await matchLogStorage.flushPendingWrites();
    const matchId = source.getSession().id;
    // The prefix is recoverable; the resolved events are the new boundary.
    await expect(
      hydrateRecoverableSessionWithReport(matchId),
    ).resolves.toBeDefined();
    source.advancePhase();
    assertAutomaticFailures(source.getSession().events);
    await matchLogStorage.flushPendingWrites();
    expect(await matchLogStorage.getEventsForMatch(matchId)).toEqual(
      source.getSession().events,
    );
    matchLogStorage.close(); // Fresh boot opens persisted IDB, not source caches.

    const recovered = await hydrateRecoverableSessionWithReport(matchId).then(
      (result) => ({ kind: 'recovered' as const, result }),
      (error: unknown) => {
        if (!(error instanceof InteractiveSessionRecoveryCorruptError)) {
          throw error;
        }
        return {
          kind: 'blocked' as const,
          message: error.message,
          blockedEvents: error.blockedEvents,
        };
      },
    );
    evidence('single-player', recovered);
    expect(recovered).toMatchObject({ kind: 'recovered' });
    if (recovered.kind === 'recovered') {
      expect(recovered.result.session.currentState).toEqual(source.getState());
    }
  });

  it('B: rebuilds both browser mirrors from the host committed and decorated event stream', async () => {
    const units = battleUnits();
    let host: ServerMatchHost | undefined;
    const preparationDice = new SeededD6Roller(8).asD6Roller();
    const source = new InteractiveSession(
      7,
      30,
      new SeededRandom(8),
      createMinimalGrid(7),
      units.player,
      units.opponent,
      units.gameUnits,
      {},
      () => (host ? host.d6ForTests() : preparationDice()),
    );
    queueDestroyedGyroAtEnd(source);
    expect(buildMirrorSessionGated(source.getSession().events).kind).toBe(
      'session',
    );
    const store = new InMemoryMatchStore({ quiet: true });
    const matchId = source.getSession().id;
    await store.createMatch({
      matchId,
      hostPlayerId: 'p1',
      playerIds: ['p1', 'p2'],
      sideAssignments: [
        { playerId: 'p1', side: 'player' },
        { playerId: 'p2', side: 'opponent' },
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: { mapRadius: 7, turnLimit: 30 },
    });
    host = new ServerMatchHost(
      matchId,
      store,
      source,
      new SeededDiceRoller(new SeededRandom(8)),
      { journalAuthority: false },
    );
    try {
      // Initial persistence is async; wait for this complete baseline before
      // issuing the real accepted intent that resolves the queued PSRs.
      for (let attempt = 0; attempt < 100; attempt++) {
        if (
          (await store.getEvents(matchId)).length ===
          source.getSession().events.length
        )
          break;
        await Promise.resolve();
      }
      expect(await store.getEvents(matchId)).toHaveLength(
        source.getSession().events.length,
      );
      const messages = await host.handleIntent({
        kind: 'Intent',
        matchId,
        playerId: 'p1',
        ts: new Date().toISOString(),
        intentId: 'resolve-destroyed-gyro',
        intent: { kind: 'AdvancePhase' },
      });
      expect(messages.filter((message) => message.kind === 'Error')).toEqual(
        [],
      );
      const committed = await store.getEvents(matchId);
      assertAutomaticFailures(committed);
      const firstResolved = committed.find(
        (event) => event.type === GameEventType.PSRResolved,
      );
      expect(firstResolved?.payload).toMatchObject({
        intentId: 'resolve-destroyed-gyro',
        rolls: expect.any(Array),
      });
      // Both clients receive wire JSON, including actual host rolls/intentId.
      const wireEvents: IGameEvent[] = JSON.parse(JSON.stringify(committed));
      const mirrors = ['p1', 'p2'].map((playerId) => ({
        playerId,
        result: buildMirrorSessionGated(wireEvents),
      }));
      evidence('hosted', {
        messages,
        mirrors,
        resolved: committed.filter(
          (event) => event.type === GameEventType.PSRResolved,
        ),
      });
      expect(
        mirrors.map(({ playerId, result }) => ({
          playerId,
          kind: result.kind,
          ...(result.kind === 'blocked'
            ? { blockedEvents: result.blockedEvents }
            : {}),
        })),
      ).toEqual([
        { playerId: 'p1', kind: 'session' },
        { playerId: 'p2', kind: 'session' },
      ]);
      for (const { result } of mirrors) {
        if (result.kind === 'session') {
          expect(result.session.currentState.units).toEqual(
            source.getState().units,
          );
          expect(result.session.currentState.phase).toBe(
            source.getState().phase,
          );
          expect(result.session.currentState.turn).toBe(source.getState().turn);
        }
      }
    } finally {
      await host.closeMatch();
    }
  });
});
