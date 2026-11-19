/*
 * BACKLOG "OPEN + GATE: host-stamped event streams are refused by the replay-library NDJSON and match-log-idb formats"
 * If P2P starts stamping events, satisfy that gate before changing this contract.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import * as Y from 'yjs';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  hydrateRecoverableSessionWithReport,
  InteractiveSessionRecoveryCorruptError,
} from '@/engine/InteractiveSession.persistence';
import { SeededD6Roller } from '@/simulation/core';
import {
  GameEventType,
  GamePhase,
  GameSide,
  PSRTrigger,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import {
  createCriticalHitResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents';
import { createGameSession, startGame } from '@/utils/gameplay/gameSessionCore';

import {
  createGameSessionChannel,
  GAME_SESSION_EVENTS_ARRAY,
} from '../gameSessionChannel';
import {
  createHostIntentRouter,
  type HostIntentRouterResult,
} from '../hostIntentRouter';
import { buildEndPhaseIntent } from '../intentTranslation';
import { MatchLogStorage, matchLogStorage } from '../matchLogStorage';
import { linkPeers } from './linkedDocs.test-helpers';

describe('P2P channel logs cold-recover after a destroyed-gyro command', () => {
  it('cold-recovers both peers after the real PSR writer resolves the destroyed gyro', async () => {
    const originalClone = Object.getOwnPropertyDescriptor(
      globalThis,
      'structuredClone',
    );
    if (!originalClone) {
      Object.defineProperty(globalThis, 'structuredClone', {
        configurable: true,
        value: <T>(value: T): T => deserialize(serialize(value)) as T,
      });
    }
    matchLogStorage.close();
    const indexedDB = new IDBFactory();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: indexedDB,
    });
    const hostLog = new MatchLogStorage({
      dbName: 'p2p-gyro-host-recovery',
      indexedDB,
    });
    const guestLog = new MatchLogStorage({
      dbName: 'p2p-gyro-guest-recovery',
      indexedDB,
    });
    const hostDoc = new Y.Doc();
    const guestDoc = new Y.Doc();
    linkPeers(hostDoc, guestDoc);
    const matchId = 'p2p-gyro-recovery';
    const hostPeer = 'host-peer';
    const guestPeer = 'guest-peer';
    const units: IGameUnit[] = [GameSide.Player, GameSide.Opponent].map(
      (side) => ({
        id: `${side}-0`,
        name: side,
        side,
        unitRef: 'atlas-as7-d',
        pilotRef: 'Regular',
        gunnery: 4,
        piloting: 5,
      }),
    );
    const initial = startGame(
      createGameSession(
        {
          mapRadius: 7,
          turnLimit: 30,
          victoryConditions: ['elimination'],
          optionalRules: [],
          seed: 8,
        },
        units,
        {
          id: matchId,
          hostPeerId: hostPeer,
          guestPeerId: guestPeer,
          sideOwners: {
            [GameSide.Player]: hostPeer,
            [GameSide.Opponent]: guestPeer,
          },
        },
      ),
      GameSide.Player,
    );
    const consumedDice: number[] = [];
    const seeded = new SeededD6Roller(8).asD6Roller();
    const source = InteractiveSession.fromSession(initial, () => {
      const die = seeded();
      consumedDice.push(die);
      return die;
    });
    const hostChannel = createGameSessionChannel({
      localPeerId: hostPeer,
      eventArray: hostDoc.getArray<string>(GAME_SESSION_EVENTS_ARRAY),
      matchId,
      matchLog: hostLog,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: guestPeer,
      eventArray: guestDoc.getArray<string>(GAME_SESSION_EVENTS_ARRAY),
      matchId,
      matchLog: guestLog,
    });
    const guestObserved: IGameEvent[] = [];
    const unsubscribeGuest = guestChannel.onPeerEvent((event) =>
      guestObserved.push(event),
    );
    const outcomes: HostIntentRouterResult[] = [];
    const broadcastNew = (command: () => void): void => {
      const head = source.getSession().events.length;
      command();
      for (const event of source.getSession().events.slice(head)) {
        hostChannel.broadcastEvent(event);
      }
    };
    const router = createHostIntentRouter({
      getSession: () => source.getSession(),
      appendEvent: (event) => broadcastNew(() => source.appendEvent(event)),
      advancePhase: () => broadcastNew(() => source.advancePhase()),
      stand: (unitId) => broadcastNew(() => source.attemptStandUp(unitId)),
      goProne: (unitId) => broadcastNew(() => source.goProne(unitId)),
      activateMovementEnhancement: (unitId, enhancement) =>
        broadcastNew(() =>
          source.activateMovementEnhancement(unitId, enhancement),
        ),
      concede: (side) => broadcastNew(() => source.concede(side)),
      broadcastRejection: (rejection) =>
        hostChannel.broadcastRejection(rejection),
    });
    const unsubscribeIntent = hostChannel.onPeerIntent((intent) => {
      outcomes.push(router.handleIntent(intent));
    });

    try {
      for (const event of source.getSession().events)
        hostChannel.broadcastEvent(event);
      // Phase transitions use the same accepted guest-intent/router/channel path.
      for (
        let steps = 0;
        source.getState().phase !== GamePhase.End && steps < 8;
        steps++
      ) {
        guestChannel.broadcastIntent(
          buildEndPhaseIntent(guestPeer, { phase: source.getState().phase }),
        );
        expect(outcomes[outcomes.length - 1]).toMatchObject({
          outcome: 'applied',
          command: { kind: 'advancePhase' },
        });
      }
      expect(source.getState().phase).toBe(GamePhase.End);
      // Recreate the gyro trigger with real critical-hit and PSR factories.
      // No fabricated PSRResolved payload or cached-state mutation is used.
      for (const slotIndex of [3, 4]) {
        const before = source.getSession();
        broadcastNew(() =>
          source.appendEvent(
            createCriticalHitResolvedEvent({
              gameId: before.id,
              sequence: before.events.length,
              turn: before.currentState.turn,
              phase: GamePhase.End,
              unitId: 'opponent-0',
              location: 'center_torso',
              slotIndex,
              componentType: 'gyro',
              componentName: 'Gyro',
              effect: 'Gyro hit',
              destroyed: true,
            }),
          ),
        );
        const next = source.getSession();
        broadcastNew(() =>
          source.appendEvent(
            createPSRTriggeredEvent({
              gameId: next.id,
              sequence: next.events.length,
              turn: next.currentState.turn,
              phase: GamePhase.End,
              unitId: 'opponent-0',
              reason: 'Gyro hit',
              reasonCode: PSRTrigger.GyroHit,
              triggerSource: PSRTrigger.GyroHit,
              additionalModifier: 3,
              basePilotingSkill: 5,
            }),
          ),
        );
      }
      expect(
        source.getState().units['opponent-0'].componentDamage?.gyroHits,
      ).toBe(2);
      expect(source.getState().units['opponent-0'].pendingPSRs).toHaveLength(2);
      const diceBeforeResolution = consumedDice.length;
      guestChannel.broadcastIntent(
        buildEndPhaseIntent(guestPeer, { phase: GamePhase.End }),
      );
      expect(outcomes[outcomes.length - 1]).toMatchObject({
        outcome: 'applied',
        command: { kind: 'advancePhase' },
      });
      expect(consumedDice.length).toBeGreaterThan(diceBeforeResolution);
      const resolved = source
        .getSession()
        .events.filter((event) => event.type === GameEventType.PSRResolved);
      expect(resolved).toHaveLength(2);
      for (const event of resolved) {
        expect(event.payload).toMatchObject({
          unitId: 'opponent-0',
          roll: 0,
          passed: false,
          reasonCode: PSRTrigger.GyroHit,
        });
      }
      expect(guestObserved).toHaveLength(source.getSession().events.length);
      await Promise.all([
        hostLog.flushPendingWrites(),
        guestLog.flushPendingWrites(),
      ]);
      const observations = [];
      for (const [peer, storage] of [
        ['host', hostLog],
        ['guest', guestLog],
      ] as const) {
        const stored = await storage.getEventsForMatch(matchId);
        expect(stored).toHaveLength(source.getSession().events.length);
        const stampedEvents = stored.filter((event) =>
          ['intentId', 'rolls'].some((key) =>
            Object.hasOwn(event.payload, key),
          ),
        );
        expect(stampedEvents).toEqual([]);
        storage.close();
        const recovery = await hydrateRecoverableSessionWithReport(
          matchId,
          storage,
        ).then(
          (result) => ({ kind: 'recovered' as const, result }),
          (error: unknown) => {
            if (!(error instanceof InteractiveSessionRecoveryCorruptError))
              throw error;
            return {
              kind: 'blocked' as const,
              blockedEvents: error.blockedEvents,
              message: error.message,
            };
          },
        );
        observations.push({
          peer,
          eventCount: stored.length,
          kind: recovery.kind,
          stampedEvents,
          ...(recovery.kind === 'blocked'
            ? { blockedEvents: recovery.blockedEvents }
            : { report: recovery.result.report }),
        });
        if (recovery.kind === 'recovered') {
          expect(recovery.result.session.currentState).toEqual(
            source.getState(),
          );
        }
      }
      if (process.env.P2P_GYRO_RECOVERY_EVIDENCE) {
        writeFileSync(
          process.env.P2P_GYRO_RECOVERY_EVIDENCE,
          JSON.stringify(
            {
              outcomes,
              consumedDice,
              observations,
              resolved: resolved.map((event) => ({
                ...event,
                originalTargetEncoding:
                  (event.payload as { targetNumber?: number }).targetNumber ===
                  Infinity
                    ? 'positive-infinity'
                    : 'automatic-failure',
              })),
            },
            null,
            2,
          ),
        );
      }
      expect(observations.map(({ peer, kind }) => ({ peer, kind }))).toEqual([
        { peer: 'host', kind: 'recovered' },
        { peer: 'guest', kind: 'recovered' },
      ]);
      for (const event of resolved) {
        expect(event.payload).toMatchObject({ automaticFailure: true });
        expect(event.payload).not.toHaveProperty('targetNumber');
      }
    } finally {
      unsubscribeIntent();
      unsubscribeGuest();
      hostDoc.destroy();
      guestDoc.destroy();
      await Promise.all([
        hostLog.flushPendingWrites(),
        guestLog.flushPendingWrites(),
        matchLogStorage.flushPendingWrites(),
      ]);
      hostLog.close();
      guestLog.close();
      matchLogStorage.close();
      if (!originalClone) Reflect.deleteProperty(globalThis, 'structuredClone');
    }
  });
});
