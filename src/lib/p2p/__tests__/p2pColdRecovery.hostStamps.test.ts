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
import { hydrateRecoverableSessionWithReport } from '@/engine/InteractiveSession.persistence';
import { SeededD6Roller } from '@/simulation/core';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { createGameSession, startGame } from '@/utils/gameplay/gameSessionCore';

import {
  createGameSessionChannel,
  GAME_SESSION_EVENTS_ARRAY,
} from '../gameSessionChannel';
import { createHostIntentRouter, type HostIntentRouterResult } from '../hostIntentRouter';
import { buildEndPhaseIntent } from '../intentTranslation';
import { MatchLogStorage, matchLogStorage } from '../matchLogStorage';
import { linkPeers } from './linkedDocs.test-helpers';

describe('P2P channel logs cold-recover after an accepted dice command', () => {
  it('preserves canonical events on both peers without adding hosted-server stamps', async () => {
    const originalClone = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');
    if (!originalClone) {
      Object.defineProperty(globalThis, 'structuredClone', {
        configurable: true,
        value: <T,>(value: T): T => deserialize(serialize(value)) as T,
      });
    }
    matchLogStorage.close();
    const indexedDB = new IDBFactory();
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: indexedDB });
    const hostLog = new MatchLogStorage({ dbName: 'p2p-host-recovery', indexedDB });
    const guestLog = new MatchLogStorage({ dbName: 'p2p-guest-recovery', indexedDB });
    const hostDoc = new Y.Doc();
    const guestDoc = new Y.Doc();
    linkPeers(hostDoc, guestDoc);
    const matchId = 'p2p-stamp-recovery';
    const hostPeer = 'host-peer';
    const guestPeer = 'guest-peer';
    const units: IGameUnit[] = [GameSide.Player, GameSide.Opponent].map((side) => ({
      id: `${side}-0`, name: side, side, unitRef: 'atlas-as7-d',
      pilotRef: 'Regular', gunnery: 4, piloting: 5,
    }));
    const initial = startGame(createGameSession({
      mapRadius: 7, turnLimit: 30, victoryConditions: ['elimination'], optionalRules: [], seed: 8,
    }, units, {
      id: matchId,
      hostPeerId: hostPeer,
      guestPeerId: guestPeer,
      sideOwners: { [GameSide.Player]: hostPeer, [GameSide.Opponent]: guestPeer },
    }), GameSide.Player);
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
      matchId, matchLog: hostLog,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: guestPeer,
      eventArray: guestDoc.getArray<string>(GAME_SESSION_EVENTS_ARRAY),
      matchId, matchLog: guestLog,
    });
    const guestObserved: IGameEvent[] = [];
    const unsubscribeGuest = guestChannel.onPeerEvent((event) => guestObserved.push(event));
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
        broadcastNew(() => source.activateMovementEnhancement(unitId, enhancement)),
      concede: (side) => broadcastNew(() => source.concede(side)),
      broadcastRejection: (rejection) => hostChannel.broadcastRejection(rejection),
    });
    const unsubscribeIntent = hostChannel.onPeerIntent((intent) => {
      outcomes.push(router.handleIntent(intent));
    });

    try {
      for (const event of source.getSession().events) hostChannel.broadcastEvent(event);
      expect(source.getState().phase).toBe(GamePhase.Initiative);
      guestChannel.broadcastIntent(buildEndPhaseIntent(guestPeer, { phase: GamePhase.Initiative }));
      expect(outcomes).toMatchObject([{ outcome: 'applied', command: { kind: 'advancePhase' } }]);
      expect(consumedDice).toHaveLength(4);
      expect(source.getState().phase).toBe(GamePhase.Movement);
      expect(guestObserved).toEqual(source.getSession().events);
      await Promise.all([hostLog.flushPendingWrites(), guestLog.flushPendingWrites()]);
      const observations = [];
      for (const [peer, storage] of [['host', hostLog], ['guest', guestLog]] as const) {
        const stored = await storage.getEventsForMatch(matchId);
        expect(stored).toEqual(source.getSession().events);
        const stampedEvents = stored.filter((event) =>
          ['intentId', 'rolls'].some((key) => Object.hasOwn(event.payload, key)),
        );
        storage.close();
        const recovery = await hydrateRecoverableSessionWithReport(matchId, storage);
        observations.push({
          peer, eventCount: stored.length, kind: 'recovered',
          stampedEvents,
          initiative: stored.find((event) => event.type === GameEventType.InitiativeRolled),
          report: recovery.report,
        });
        expect(stampedEvents).toEqual([]);
        expect(recovery.session.currentState).toEqual(source.getState());
      }
      if (process.env.P2P_RECOVERY_EVIDENCE) {
        writeFileSync(process.env.P2P_RECOVERY_EVIDENCE, JSON.stringify({
          outcomes, consumedDice, observations,
        }, null, 2));
      }
    } finally {
      unsubscribeIntent();
      unsubscribeGuest();
      hostDoc.destroy();
      guestDoc.destroy();
      await Promise.all([
        hostLog.flushPendingWrites(), guestLog.flushPendingWrites(), matchLogStorage.flushPendingWrites(),
      ]);
      hostLog.close();
      guestLog.close();
      matchLogStorage.close();
      if (!originalClone) Reflect.deleteProperty(globalThis, 'structuredClone');
    }
  });
});
