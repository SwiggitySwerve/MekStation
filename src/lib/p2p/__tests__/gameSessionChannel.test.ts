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

import {
  GAME_SESSION_EVENTS_ARRAY,
  createGameSessionChannel,
  deserializeGameSessionEnvelope,
  isGameIntent,
  serializeGameSessionEnvelope,
  type IGameEventEnvelope,
} from '../gameSessionChannel';
import {
  GAME_SESSION_AWARENESS_FIELD,
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

  it('defines the guest-to-host IGameIntent contract', () => {
    const intent: IGameIntent = {
      type: 'declareMovement',
      payload: { unitId: 'unit-1' },
      authorPeerId: 'guest-peer',
    };

    expect(GAME_INTENT_TYPES).toEqual([
      'declareMovement',
      'declareAttack',
      'declarePhysical',
      'confirmHeat',
      'endPhase',
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
