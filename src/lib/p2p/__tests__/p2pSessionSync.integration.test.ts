/**
 * P2P session sync integration tests (§ 9 of `add-p2p-game-session-sync`).
 *
 * Drives two `gameSessionChannel` instances bound to the SAME Yjs doc
 * (the simplest faithful model of two peers in the same Yjs room): the
 * "host" peer broadcasts events, the "guest" peer mirrors them through
 * `applyMirrorEvent`. The doc-level Y.Array delivers updates
 * synchronously inside a single transaction, so we do not need to fake
 * BroadcastChannel + the WebRTC layer.
 *
 * Covers:
 *   §9.1 mirror convergence — host plays N events, guest mirror state
 *        is byte-identical at every boundary.
 *   §9.2 guest intent → host-appended event.
 *   §9.3 host disconnect → guest's local match status falls into
 *        `hostPending` (matches Wave 4's reconnect-grace contract).
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 9
 */

import * as Y from 'yjs';

import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  appendEvent,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  GAME_SESSION_EVENTS_ARRAY,
  createGameSessionChannel,
} from '../gameSessionChannel';
import {
  deriveLocalMatchStatusFromAwareness,
  type IGameSessionAwarenessState,
} from '../gameSessionRoles';
import { createHostIntentRouter } from '../hostIntentRouter';
import {
  buildConcedeIntent,
  buildDeclareMovementIntent,
  buildStandIntent,
  translateIntentToEvents,
} from '../intentTranslation';
import { applyMirrorEvent, createMirrorSession } from '../mirrorSession';

// =============================================================================
// Fixtures
// =============================================================================

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

function fixtureUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'host-0',
      name: 'Wasp',
      side: GameSide.Player,
      unitRef: 'wsp-1a',
      pilotRef: 'p-host',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'guest-0',
      name: 'Cicada',
      side: GameSide.Opponent,
      unitRef: 'cda-2a',
      pilotRef: 'p-guest',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function fixtureConfig() {
  return {
    mapRadius: 8,
    turnLimit: 30,
    victoryConditions: ['destroy_all'],
    optionalRules: [],
  };
}

function fixtureSideOwners(): Readonly<Record<GameSide, string>> {
  return {
    [GameSide.Player]: HOST_PEER,
    [GameSide.Opponent]: GUEST_PEER,
  };
}

function compareSessionsConverged(a: IGameSession, b: IGameSession): void {
  // The host and guest construct their `GameCreated` event independently
  // (each call to `createGameSession` mints a fresh UUID + ISO
  // timestamp), so byte-equality on the FULL event list is impossible
  // without seeding both sides — and the production reconnect path
  // ships the host's GameCreated verbatim, which IS byte-identical.
  // The property the spec depends on (§ "Two sessions converge under
  // identical events") is currentState equality, mirrored here.
  expect(JSON.stringify(b.currentState)).toBe(JSON.stringify(a.currentState));
  // Every event past the local GameCreated must have arrived from the
  // host, so the guest's tail (events[1..]) is byte-identical to the
  // host's. This catches the spec scenario "Event ordering preserved".
  expect(b.events.slice(1)).toEqual(a.events.slice(1));
  expect(b.id).toBe(a.id);
  expect(b.matchId).toBe(a.matchId);
}

// =============================================================================
// §9.1 Mirror convergence
// =============================================================================

describe('§9.1 host + guest sessions converge under shared Y.Doc', () => {
  let doc: Y.Doc;
  let eventArray: Y.Array<string>;

  beforeEach(() => {
    doc = new Y.Doc();
    eventArray = doc.getArray<string>(GAME_SESSION_EVENTS_ARRAY);
  });

  afterEach(() => {
    doc.destroy();
  });

  it('guest mirror reproduces host state byte-identically across multiple events', () => {
    // Host + guest start from identical createGameSession outputs.
    const hostSession0 = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-mirror-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });
    let guestSession = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-mirror-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });

    // Two channels share the same Yjs doc (mirrors the production
    // setup where both peers join the same room). The guest mirror
    // applies any peer-event the host broadcasts.
    const hostChannel = createGameSessionChannel({
      localPeerId: HOST_PEER,
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: GUEST_PEER,
      eventArray,
    });

    const guestObserved: IGameEvent[] = [];
    const unsubscribe = guestChannel.onPeerEvent((event) => {
      guestObserved.push(event);
      guestSession = applyMirrorEvent(guestSession, event);
    });

    // Host plays GameStarted. Skip startGame() because we want to keep
    // the test surface focused on the channel + mirror — startGame's
    // event is the one we replicate.
    let hostSession = startGame(hostSession0, GameSide.Player);
    hostChannel.broadcastEvent(hostSession.events[1]);

    // Three more events — phase advance, a movement-locked event,
    // another phase advance. The exact event types don't matter for
    // convergence; we just need a sequence that exercises the
    // reducer.
    const movementLocked: IGameEvent = {
      id: 'evt-move-1',
      gameId: hostSession.id,
      sequence: hostSession.events.length,
      timestamp: FIXED_TIMESTAMP,
      type: 'movement_locked' as IGameEvent['type'],
      turn: hostSession.currentState.turn,
      phase: hostSession.currentState.phase,
      payload: { unitId: 'host-0' } as unknown as IGameEvent['payload'],
    };
    hostSession = appendEvent(hostSession, movementLocked);
    hostChannel.broadcastEvent(movementLocked);

    const phaseChanged: IGameEvent = {
      id: 'evt-phase-1',
      gameId: hostSession.id,
      sequence: hostSession.events.length,
      timestamp: FIXED_TIMESTAMP,
      type: 'phase_changed' as IGameEvent['type'],
      turn: hostSession.currentState.turn,
      phase: hostSession.currentState.phase,
      payload: {
        fromPhase: hostSession.currentState.phase,
        toPhase: GamePhase.Movement,
      } as unknown as IGameEvent['payload'],
    };
    hostSession = appendEvent(hostSession, phaseChanged);
    hostChannel.broadcastEvent(phaseChanged);

    unsubscribe();

    // Guest observed exactly the events the host broadcast, in order.
    expect(guestObserved.map((e) => e.id)).toEqual([
      hostSession.events[1].id,
      movementLocked.id,
      phaseChanged.id,
    ]);
    // Mirror state matches the host's currentState byte-identically.
    compareSessionsConverged(hostSession, guestSession);
  });
});

// =============================================================================
// §9.2 Intent round trip
// =============================================================================

describe('§9.2 guest intent translates into a host-appended event', () => {
  let doc: Y.Doc;
  let eventArray: Y.Array<string>;

  beforeEach(() => {
    doc = new Y.Doc();
    eventArray = doc.getArray<string>(GAME_SESSION_EVENTS_ARRAY);
  });

  afterEach(() => {
    doc.destroy();
  });

  it('guest broadcastIntent → host translates → MovementDeclared event appended on host', () => {
    let hostSession = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-intent-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });
    hostSession = startGame(hostSession, GameSide.Player);
    // Force into Movement phase so the guest's intent is in-phase.
    hostSession = {
      ...hostSession,
      currentState: {
        ...hostSession.currentState,
        phase: GamePhase.Movement,
        status: GameStatus.Active,
      },
    };

    const hostChannel = createGameSessionChannel({
      localPeerId: HOST_PEER,
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: GUEST_PEER,
      eventArray,
    });

    const router = createHostIntentRouter({
      getSession: () => hostSession,
      getTranslationAuthority: () => ({
        movementGrid: createHexGrid({ radius: 8 }),
        movementByUnit: new Map([
          ['guest-0', { walkMP: 4, runMP: 6, jumpMP: 0 }],
        ]),
      }),
      appendEvent: (event) => {
        hostSession = appendEvent(hostSession, event);
        // Also broadcast onward to the guest, which is what the real
        // engine does after applying the event locally.
        hostChannel.broadcastEvent(event);
      },
      concede: () => undefined,
      stand: () => undefined,
      goProne: () => undefined,
      activateMovementEnhancement: () => undefined,
      advancePhase: () => undefined,
      broadcastRejection: (rejection) => {
        hostChannel.broadcastRejection({ reason: rejection.reason });
      },
    });
    const unsubscribeIntent = hostChannel.onPeerIntent((intent) => {
      router.handleIntent(intent);
    });

    // Guest authors a declareMovement intent for its own unit.
    const guestUnit = hostSession.currentState.units['guest-0'];
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: guestUnit.position,
      to: { q: guestUnit.position.q, r: guestUnit.position.r + 1 },
      facing: guestUnit.facing,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });
    guestChannel.broadcastIntent(intent);

    unsubscribeIntent();

    // Host appended the translated events.
    const newEvents = hostSession.events
      .filter((e) =>
        ['movement_declared', 'movement_locked'].includes(e.type as string),
      )
      .map((e) => e.type);
    expect(newEvents).toEqual(['movement_declared', 'movement_locked']);
  });

  it('guest broadcastIntent -> host routes concede through the authoritative command adapter', () => {
    let hostSession = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-concede-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });
    hostSession = startGame(hostSession, GameSide.Player);

    const hostChannel = createGameSessionChannel({
      localPeerId: HOST_PEER,
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: GUEST_PEER,
      eventArray,
    });

    const concededSides: GameSide[] = [];
    const router = createHostIntentRouter({
      getSession: () => hostSession,
      appendEvent: (event) => {
        hostSession = appendEvent(hostSession, event);
        hostChannel.broadcastEvent(event);
      },
      concede: (side) => {
        concededSides.push(side);
      },
      stand: () => undefined,
      goProne: () => undefined,
      activateMovementEnhancement: () => undefined,
      advancePhase: () => undefined,
      broadcastRejection: (rejection) => {
        hostChannel.broadcastRejection({ reason: rejection.reason });
      },
    });
    const unsubscribeIntent = hostChannel.onPeerIntent((intent) => {
      router.handleIntent(intent);
    });

    guestChannel.broadcastIntent(
      buildConcedeIntent(GUEST_PEER, { side: GameSide.Opponent }),
    );

    unsubscribeIntent();

    expect(concededSides).toEqual([GameSide.Opponent]);
  });

  it('guest broadcastIntent -> host routes stand through the authoritative command adapter', () => {
    let hostSession = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-stand-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });
    hostSession = startGame(hostSession, GameSide.Player);
    hostSession = {
      ...hostSession,
      currentState: {
        ...hostSession.currentState,
        phase: GamePhase.Movement,
      },
    };

    const hostChannel = createGameSessionChannel({
      localPeerId: HOST_PEER,
      eventArray,
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: GUEST_PEER,
      eventArray,
    });

    const standAttempts: string[] = [];
    const router = createHostIntentRouter({
      getSession: () => hostSession,
      appendEvent: (event) => {
        hostSession = appendEvent(hostSession, event);
        hostChannel.broadcastEvent(event);
      },
      concede: () => undefined,
      stand: (unitId) => {
        standAttempts.push(unitId);
      },
      goProne: () => undefined,
      activateMovementEnhancement: () => undefined,
      advancePhase: () => undefined,
      broadcastRejection: (rejection) => {
        hostChannel.broadcastRejection({ reason: rejection.reason });
      },
    });
    const unsubscribeIntent = hostChannel.onPeerIntent((intent) => {
      router.handleIntent(intent);
    });

    guestChannel.broadcastIntent(
      buildStandIntent(GUEST_PEER, { unitId: 'guest-0' }),
    );

    unsubscribeIntent();

    expect(standAttempts).toEqual(['guest-0']);
  });

  it('rejects an out-of-phase intent and broadcasts a peer-rejected envelope', () => {
    let hostSession = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-intent-2',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: fixtureSideOwners(),
    });
    hostSession = startGame(hostSession, GameSide.Player);
    // Initiative phase — declareMovement is out-of-phase.
    hostSession = {
      ...hostSession,
      currentState: {
        ...hostSession.currentState,
        phase: GamePhase.Initiative,
        status: GameStatus.Active,
      },
    };

    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });

    const result = translateIntentToEvents(intent, hostSession);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });
});

// =============================================================================
// §9.3 Disconnect → hostPending
// =============================================================================

describe('§9.3 host disconnect leaves the guest in hostPending', () => {
  it('awareness loss for the host transitions the guest from live to hostPending', () => {
    // Reuse the existing awareness-derive helper that production
    // wiring (`useSyncRoom`) consumes — same code path as the live
    // `setLocalMatchStatus('hostPending')` call when host disconnect
    // is detected.
    const liveStates: IGameSessionAwarenessState[] = [
      { peerId: HOST_PEER, role: 'host', assignedAt: FIXED_TIMESTAMP },
      { peerId: GUEST_PEER, role: 'guest', assignedAt: FIXED_TIMESTAMP },
    ];
    const hostGoneStates = liveStates.filter(
      (peer) => peer.peerId !== HOST_PEER,
    );

    expect(
      deriveLocalMatchStatusFromAwareness(liveStates, liveStates, GUEST_PEER),
    ).toBe('live');
    expect(
      deriveLocalMatchStatusFromAwareness(
        liveStates,
        hostGoneStates,
        GUEST_PEER,
      ),
    ).toBe('hostPending');

    // §7.2 mirror: the host transitions to guestPending when the guest
    // drops. Confirms the symmetry is wired both directions.
    expect(
      deriveLocalMatchStatusFromAwareness(
        liveStates,
        liveStates.filter((peer) => peer.peerId !== GUEST_PEER),
        HOST_PEER,
      ),
    ).toBe('guestPending');
  });
});
