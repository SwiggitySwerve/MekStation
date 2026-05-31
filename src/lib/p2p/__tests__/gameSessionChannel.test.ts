import * as Y from 'yjs';

import {
  GAME_INTENT_TYPES,
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameIntent,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { REPLAY_CHUNK_SIZE } from '@/types/multiplayer/Protocol';

import {
  GAME_SESSION_EVENTS_ARRAY,
  answerReconnectRequest,
  createReconnectRequestEnvelope,
  createGameSessionChannel,
  createReplayStreamEnvelopes,
  deserializeGameSessionEnvelope,
  getReplayEventsAfterSeq,
  isGameIntent,
  serializeGameSessionEnvelope,
  type IGameEventEnvelope,
  type IReconnectRejectEnvelope,
  type MatchLogPersistence,
} from '../gameSessionChannel';
import {
  GAME_SESSION_AWARENESS_FIELD,
  deriveLocalMatchStatusFromAwareness,
  getGameSessionAwarenessStates,
  joinLocalPeerAsGuest,
  onGameSessionLifecycleEvent,
  promoteLocalPeerToHost,
  type IGameSessionAwarenessAdapter,
  type IGameSessionAwarenessState,
} from '../gameSessionRoles';

class TestAwareness implements IGameSessionAwarenessAdapter {
  readonly states = new Map<number, Record<string, unknown>>();

  constructor(readonly clientID: number) {
    this.states.set(clientID, {});
  }

  getStates(): Map<number, Record<string, unknown>> {
    return this.states;
  }

  setLocalStateField(field: string, value: unknown): void {
    const currentState = this.states.get(this.clientID) ?? {};
    this.states.set(this.clientID, {
      ...currentState,
      [field]: value,
    });
  }

  setPeerState(clientID: number, metadata: IGameSessionAwarenessState): void {
    this.states.set(clientID, {
      [GAME_SESSION_AWARENESS_FIELD]: metadata,
    });
  }
}

function makeEvent(id: string, sequence: number): IGameEvent {
  return {
    id,
    gameId: 'game-1',
    sequence,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.GameStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {
      firstSide: GameSide.Player,
    },
  };
}

describe('gameSessionChannel', () => {
  let doc: Y.Doc;
  let eventArray: Y.Array<string>;

  beforeEach(() => {
    doc = new Y.Doc();
    eventArray = doc.getArray<string>(GAME_SESSION_EVENTS_ARRAY);
  });

  afterEach(() => {
    doc.destroy();
  });

  it('serializes game events through the event-store JSON helpers', () => {
    const event = makeEvent('event-1', 1);
    const envelope: IGameEventEnvelope = {
      kind: 'game-event',
      event,
      authorPeerId: 'host-peer',
    };

    expect(
      deserializeGameSessionEnvelope(serializeGameSessionEnvelope(envelope)),
    ).toEqual(envelope);
  });

  it('broadcasts events into the dedicated gameEvents Y.Array', () => {
    const customizerTabs = doc.getArray<string>('customizerTabs');
    customizerTabs.push(['tab-a']);
    const channel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });

    channel.broadcastEvent(makeEvent('event-1', 1));

    expect(eventArray).toHaveLength(1);
    expect(customizerTabs.toArray()).toEqual(['tab-a']);
  });

  it('persists locally broadcast events after the Yjs append succeeds', async () => {
    const persisted: Array<{ matchId: string; event: IGameEvent }> = [];
    const matchLog: MatchLogPersistence = {
      appendEvent: jest.fn((matchId, event) => {
        persisted.push({ matchId, event });
        return Promise.resolve({
          matchId,
          sequence: event.sequence,
          event,
          savedAt: '2026-04-30T00:00:00.000Z',
        });
      }),
    };
    const channel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
      matchId: 'match-1',
      matchLog,
    });
    const event = makeEvent('event-1', 1);

    channel.broadcastEvent(event);
    await Promise.resolve();

    expect(eventArray).toHaveLength(1);
    expect(persisted).toEqual([{ matchId: 'match-1', event }]);
  });

  it('marks match metadata completed when a GameEnded event is persisted', async () => {
    const matchLog: MatchLogPersistence & {
      markMatchCompleted: jest.Mock;
    } = {
      appendEvent: jest.fn((matchId, event) =>
        Promise.resolve({
          matchId,
          sequence: event.sequence,
          event,
          savedAt: '2026-04-30T00:00:00.000Z',
        }),
      ),
      markMatchCompleted: jest.fn(() => Promise.resolve()),
    };
    const channel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
      matchId: 'match-1',
      matchLog,
    });
    const event = makeEvent('event-ended', 9);
    const ended: IGameEvent = {
      ...event,
      type: GameEventType.GameEnded,
      payload: { winner: GameSide.Player, reason: 'destruction' },
    };

    channel.broadcastEvent(ended);
    await Promise.resolve();
    await Promise.resolve();

    expect(matchLog.markMatchCompleted).toHaveBeenCalledWith(
      'match-1',
      ended.timestamp,
    );
  });

  it('delivers peer-authored events in arrival order', () => {
    const channel = createGameSessionChannel({
      localPeerId: 'guest-peer',
      eventArray,
    });
    const received: string[] = [];
    const unsubscribe = channel.onPeerEvent((event) => {
      received.push(event.id);
    });

    eventArray.push([
      serializeGameSessionEnvelope({
        kind: 'game-event',
        event: makeEvent('event-1', 1),
        authorPeerId: 'host-peer',
      }),
      serializeGameSessionEnvelope({
        kind: 'game-event',
        event: makeEvent('event-2', 2),
        authorPeerId: 'host-peer',
      }),
    ]);

    unsubscribe();
    expect(received).toEqual(['event-1', 'event-2']);
  });

  it('persists peer-received events without blocking peer delivery', async () => {
    const matchLog: MatchLogPersistence = {
      appendEvent: jest.fn((matchId, event) =>
        Promise.resolve({
          matchId,
          sequence: event.sequence,
          event,
          savedAt: '2026-04-30T00:00:00.000Z',
        }),
      ),
    };
    const channel = createGameSessionChannel({
      localPeerId: 'guest-peer',
      eventArray,
      matchId: 'match-1',
      matchLog,
    });
    const received: string[] = [];
    const unsubscribe = channel.onPeerEvent((event) => {
      received.push(event.id);
    });
    const event = makeEvent('event-1', 1);

    eventArray.push([
      serializeGameSessionEnvelope({
        kind: 'game-event',
        event,
        authorPeerId: 'host-peer',
      }),
    ]);
    await Promise.resolve();

    unsubscribe();
    expect(received).toEqual(['event-1']);
    expect(matchLog.appendEvent).toHaveBeenCalledWith('match-1', event);
  });

  it('logs persistence failures without breaking local broadcast sync', async () => {
    const error = new Error('indexeddb write failed');
    const logger = { error: jest.fn() };
    const matchLog: MatchLogPersistence = {
      appendEvent: jest.fn(() => Promise.reject(error)),
    };
    const channel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
      matchId: 'match-1',
      matchLog,
      logger,
    });

    channel.broadcastEvent(makeEvent('event-1', 1));
    await Promise.resolve();
    await Promise.resolve();

    expect(eventArray).toHaveLength(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to persist P2P match event',
      {
        matchId: 'match-1',
        sequence: 1,
        error,
      },
    );
  });

  it('rejects local-authored event arrivals', () => {
    const channel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });
    const received: IGameEvent[] = [];
    const unsubscribe = channel.onPeerEvent((event) => {
      received.push(event);
    });

    channel.broadcastEvent(makeEvent('event-1', 1));

    unsubscribe();
    expect(eventArray).toHaveLength(1);
    expect(received).toEqual([]);
  });

  it('serializes and filters game intents with author metadata', () => {
    const guestChannel = createGameSessionChannel({
      localPeerId: 'guest-peer',
      eventArray,
    });
    const hostChannel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });
    const received: IGameIntent[] = [];
    const unsubscribe = hostChannel.onPeerIntent((intent) => {
      received.push(intent);
    });

    guestChannel.broadcastIntent({
      type: 'concede',
      payload: { side: GameSide.Opponent },
      authorPeerId: 'guest-peer',
    });

    unsubscribe();
    expect(received).toEqual([
      {
        type: 'concede',
        payload: { side: GameSide.Opponent },
        authorPeerId: 'guest-peer',
      },
    ]);
  });

  it('builds reconnect requests with the expected wire shape', () => {
    const request = createReconnectRequestEnvelope({
      matchId: 'match-1',
      lastLocalSeq: 25,
      authorPeerId: 'guest-peer',
    });

    expect(request).toEqual({
      kind: 'reconnect-request',
      matchId: 'match-1',
      lastLocalSeq: 25,
      authorPeerId: 'guest-peer',
    });
    expect(
      deserializeGameSessionEnvelope(serializeGameSessionEnvelope(request)),
    ).toEqual(request);
  });

  it('round-trips reconnect rejection envelopes', () => {
    const rejection: IReconnectRejectEnvelope = {
      kind: 'reconnect-reject',
      matchId: 'match-1',
      reason: 'Match in progress',
    };

    expect(
      deserializeGameSessionEnvelope(serializeGameSessionEnvelope(rejection)),
    ).toEqual(rejection);
  });

  it('chunks replay streams at the protocol chunk size and marks only the final chunk done', () => {
    const events = Array.from({ length: REPLAY_CHUNK_SIZE + 1 }, (_, index) =>
      makeEvent(`event-${index}`, index),
    );

    const chunks = createReplayStreamEnvelopes('match-1', events);

    expect(REPLAY_CHUNK_SIZE).toBe(64);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      kind: 'replay-stream',
      matchId: 'match-1',
      done: false,
    });
    expect(chunks[0].events).toHaveLength(REPLAY_CHUNK_SIZE);
    expect(chunks[1]).toMatchObject({
      kind: 'replay-stream',
      matchId: 'match-1',
      done: true,
    });
    expect(chunks[1].events).toHaveLength(1);
    expect(
      deserializeGameSessionEnvelope(serializeGameSessionEnvelope(chunks[0])),
    ).toEqual(chunks[0]);
  });

  it('selects replay events newer than the reconnecting peer sequence in order', () => {
    const events = [
      makeEvent('event-3', 3),
      makeEvent('event-1', 1),
      makeEvent('event-2', 2),
    ];

    expect(
      getReplayEventsAfterSeq(events, 1).map((event) => event.sequence),
    ).toEqual([2, 3]);
  });

  it('lets a host answer reconnect-request with replay-stream chunks', () => {
    const hostChannel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: 'guest-peer',
      eventArray,
    });
    const events = [
      makeEvent('event-0', 0),
      makeEvent('event-1', 1),
      makeEvent('event-2', 2),
    ];
    const received: number[] = [];
    const unsubscribeReplay = guestChannel.onReplayStream((stream) => {
      received.push(...stream.events.map((event) => event.sequence));
    });
    const requests: Array<{
      matchId: string;
      lastLocalSeq: number;
    }> = [];
    const unsubscribeRequest = hostChannel.onReconnectRequest((request) => {
      requests.push({
        matchId: request.matchId,
        lastLocalSeq: request.lastLocalSeq,
      });
    });

    guestChannel.broadcastReconnectRequest({
      matchId: 'match-1',
      lastLocalSeq: 0,
    });
    for (const request of requests) {
      for (const stream of createReplayStreamEnvelopes(
        request.matchId,
        getReplayEventsAfterSeq(events, request.lastLocalSeq),
      )) {
        hostChannel.broadcastReplayStream(stream);
      }
    }

    unsubscribeRequest();
    unsubscribeReplay();
    expect(requests).toEqual([{ matchId: 'match-1', lastLocalSeq: 0 }]);
    expect(received).toEqual([1, 2]);
  });

  it('rejects reconnect-request for the wrong match id', () => {
    const hostChannel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: 'guest-peer',
      eventArray,
    });
    const rejections: string[] = [];
    const unsubscribeRejection = guestChannel.onPeerRejection((rejection) => {
      rejections.push(rejection.reason);
    });
    const requests: string[] = [];
    const unsubscribeRequest = hostChannel.onReconnectRequest((request) => {
      requests.push(request.matchId);
    });

    guestChannel.broadcastReconnectRequest({
      matchId: 'other-match',
      lastLocalSeq: 0,
    });
    if (requests[0] !== 'match-1') {
      hostChannel.broadcastRejection({
        reason: 'wrong-match',
      });
    }

    unsubscribeRequest();
    unsubscribeRejection();
    expect(requests).toEqual(['other-match']);
    expect(rejections).toEqual(['wrong-match']);
  });

  it('rejects reconnect-request from a foreign peer without replaying events', async () => {
    const hostChannel = createGameSessionChannel({
      localPeerId: 'host-peer',
      eventArray,
    });
    const foreignChannel = createGameSessionChannel({
      localPeerId: 'foreign-peer',
      eventArray,
    });
    const rejections: string[] = [];
    const unsubscribeRejection = foreignChannel.onReconnectReject(
      (rejection) => {
        rejections.push(rejection.reason);
      },
    );
    const getEventsFromSeq = jest.fn(() =>
      Promise.resolve([] as readonly IGameEvent[]),
    );

    const result = await answerReconnectRequest(
      createReconnectRequestEnvelope({
        matchId: 'match-1',
        lastLocalSeq: 5,
        authorPeerId: 'foreign-peer',
      }),
      {
        matchId: 'match-1',
        metadata: {
          hostPeerId: 'host-peer',
          guestPeerId: 'guest-peer',
        },
        channel: hostChannel,
        getEventsFromSeq,
      },
    );

    unsubscribeRejection();
    expect(result).toBe('rejected');
    expect(rejections).toEqual(['Match in progress']);
    expect(getEventsFromSeq).not.toHaveBeenCalled();
  });
});

describe('game session role and intent contracts', () => {
  it('marks the local room creator as host in awareness and logs HostPromoted', () => {
    const awareness = new TestAwareness(1);
    const lifecycleEvents: string[] = [];
    const unsubscribe = onGameSessionLifecycleEvent((event) => {
      lifecycleEvents.push(`${event.type}:${event.peerId}`);
    });

    const metadata = promoteLocalPeerToHost({
      awareness,
      localPeerId: 'host-peer',
      now: () => '2026-04-30T00:00:00.000Z',
    });

    unsubscribe();
    expect(
      awareness.getStates().get(1)?.[GAME_SESSION_AWARENESS_FIELD],
    ).toEqual(metadata);
    expect(getGameSessionAwarenessStates(awareness)).toEqual([metadata]);
    expect(lifecycleEvents).toEqual(['HostPromoted:host-peer']);
  });

  it('marks the first joiner as guest and logs GuestJoined', () => {
    const awareness = new TestAwareness(2);
    awareness.setPeerState(1, {
      peerId: 'host-peer',
      role: 'host',
      assignedAt: '2026-04-30T00:00:00.000Z',
    });
    const lifecycleEvents: string[] = [];
    const unsubscribe = onGameSessionLifecycleEvent((event) => {
      lifecycleEvents.push(`${event.type}:${event.peerId}`);
    });

    const metadata = joinLocalPeerAsGuest({
      awareness,
      localPeerId: 'guest-peer',
      now: () => '2026-04-30T00:00:01.000Z',
    });

    unsubscribe();
    expect(
      awareness.getStates().get(2)?.[GAME_SESSION_AWARENESS_FIELD],
    ).toEqual(metadata);
    expect(lifecycleEvents).toEqual(['GuestJoined:guest-peer']);
  });

  it('rejects a second guest joiner for networked 1v1', () => {
    const awareness = new TestAwareness(3);
    awareness.setPeerState(1, {
      peerId: 'host-peer',
      role: 'host',
      assignedAt: '2026-04-30T00:00:00.000Z',
    });
    awareness.setPeerState(2, {
      peerId: 'guest-peer',
      role: 'guest',
      assignedAt: '2026-04-30T00:00:01.000Z',
    });

    expect(() =>
      joinLocalPeerAsGuest({
        awareness,
        localPeerId: 'third-peer',
      }),
    ).toThrow('Match is full');
  });

  it('derives pending local match status from awareness loss', () => {
    const previous: IGameSessionAwarenessState[] = [
      {
        peerId: 'host-peer',
        role: 'host',
        assignedAt: '2026-04-30T00:00:00.000Z',
      },
      {
        peerId: 'guest-peer',
        role: 'guest',
        assignedAt: '2026-04-30T00:00:01.000Z',
      },
    ];

    expect(
      deriveLocalMatchStatusFromAwareness(
        previous,
        previous.filter((peer) => peer.role !== 'guest'),
        'host-peer',
      ),
    ).toBe('guestPending');
    expect(
      deriveLocalMatchStatusFromAwareness(
        previous,
        previous.filter((peer) => peer.role !== 'host'),
        'guest-peer',
      ),
    ).toBe('hostPending');
    expect(
      deriveLocalMatchStatusFromAwareness(
        previous.filter((peer) => peer.role !== 'host'),
        previous,
        'guest-peer',
      ),
    ).toBe('live');
  });

  it('defines the guest-to-host IGameIntent contract', () => {
    const intent: IGameIntent = {
      type: 'declareMovement',
      payload: { unitId: 'unit-1' },
      authorPeerId: 'guest-peer',
    };

    expect(GAME_INTENT_TYPES).toEqual([
      'declareMovement',
      'stand',
      'goProne',
      'activateMovementEnhancement',
      'torsoTwist',
      'declareAttack',
      'declarePhysical',
      'requestSpot',
      'confirmHeat',
      'endPhase',
      'eject',
      'withdraw',
      'concede',
    ]);
    expect(isGameIntent(intent)).toBe(true);
  });

  it('keeps network ownership optional on local sessions', () => {
    const localSessionMetadata: Pick<
      IGameSession,
      'hostPeerId' | 'guestPeerId' | 'sideOwners'
    > = {};
    const sideOwners: NonNullable<IGameSession['sideOwners']> = {
      [GameSide.Player]: 'host-peer',
      [GameSide.Opponent]: 'guest-peer',
    };

    expect(localSessionMetadata.hostPeerId).toBeUndefined();
    expect(localSessionMetadata.guestPeerId).toBeUndefined();
    expect(localSessionMetadata.sideOwners).toBeUndefined();
    expect(sideOwners[GameSide.Player]).toBe('host-peer');
  });
});
