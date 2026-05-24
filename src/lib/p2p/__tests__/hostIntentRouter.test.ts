/**
 * Unit tests for the host intent router (§5.3 + §7.2).
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 7
 */

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

import {
  createHostIntentRouter,
  type IHostIntentRouterAdapter,
} from '../hostIntentRouter';
import {
  buildActivateMovementEnhancementIntent,
  buildConcedeIntent,
  buildDeclareMovementIntent,
  buildGoProneIntent,
  buildStandIntent,
} from '../intentTranslation';

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

function fixtureSession(): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 30,
      victoryConditions: ['destroy_all'],
      optionalRules: [],
    },
    fixtureUnits(),
    {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: {
        [GameSide.Player]: HOST_PEER,
        [GameSide.Opponent]: GUEST_PEER,
      },
    },
  );
  const started = startGame(session, GameSide.Player);
  return {
    ...started,
    currentState: {
      ...started.currentState,
      phase: GamePhase.Movement,
      status: GameStatus.Active,
    },
  };
}

function makeAdapter(initial: IGameSession): {
  adapter: IHostIntentRouterAdapter;
  appended: IGameEvent[];
  concededSides: GameSide[];
  standAttempts: string[];
  proneAttempts: string[];
  enhancementActivations: Array<{
    unitId: string;
    enhancement: 'MASC' | 'Supercharger';
  }>;
  rejections: { reason: string; detail?: string }[];
  setSession: (session: IGameSession) => void;
  setGuestPending: (pending: boolean) => void;
} {
  let session = initial;
  let guestPending = false;
  const appended: IGameEvent[] = [];
  const concededSides: GameSide[] = [];
  const standAttempts: string[] = [];
  const proneAttempts: string[] = [];
  const enhancementActivations: Array<{
    unitId: string;
    enhancement: 'MASC' | 'Supercharger';
  }> = [];
  const rejections: { reason: string; detail?: string }[] = [];

  const adapter: IHostIntentRouterAdapter = {
    getSession: () => session,
    appendEvent: (event) => {
      appended.push(event);
      session = appendEvent(session, event);
    },
    concede: (side) => {
      concededSides.push(side);
    },
    stand: (unitId) => {
      standAttempts.push(unitId);
    },
    goProne: (unitId) => {
      proneAttempts.push(unitId);
    },
    activateMovementEnhancement: (unitId, enhancement) => {
      enhancementActivations.push({ unitId, enhancement });
    },
    broadcastRejection: (rejection) => {
      rejections.push({
        reason: String(rejection.reason),
        detail: rejection.detail,
      });
    },
    isGuestPending: () => guestPending,
  };

  return {
    adapter,
    appended,
    concededSides,
    standAttempts,
    proneAttempts,
    enhancementActivations,
    rejections,
    setSession: (next) => {
      session = next;
    },
    setGuestPending: (pending) => {
      guestPending = pending;
    },
  };
}

describe('hostIntentRouter', () => {
  it('§5.3: applies translated events on a valid intent', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });
    const result = router.handleIntent(intent);

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.events.map((e) => e.type)).toEqual([
      'movement_declared',
      'movement_locked',
    ]);
    expect(harness.appended.map((e) => e.type)).toEqual([
      'movement_declared',
      'movement_locked',
    ]);
    expect(harness.rejections).toEqual([]);
  });

  it('routes a guest-owned go-prone intent through the authoritative host command path', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const result = router.handleIntent(
      buildGoProneIntent(GUEST_PEER, { unitId: 'guest-0' }),
    );

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.events).toEqual([]);
    expect(result.command).toEqual({
      kind: 'goProne',
      unitId: 'guest-0',
    });
    expect(harness.proneAttempts).toEqual(['guest-0']);
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([]);
  });

  it('routes a guest-owned movement enhancement activation through the host command path', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const result = router.handleIntent(
      buildActivateMovementEnhancementIntent(GUEST_PEER, {
        unitId: 'guest-0',
        enhancement: 'MASC',
      }),
    );

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.events).toEqual([]);
    expect(result.command).toEqual({
      kind: 'activateMovementEnhancement',
      unitId: 'guest-0',
      enhancement: 'MASC',
    });
    expect(harness.enhancementActivations).toEqual([
      { unitId: 'guest-0', enhancement: 'MASC' },
    ]);
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([]);
  });

  it('routes a guest-owned concede intent through the authoritative host command path', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const result = router.handleIntent(
      buildConcedeIntent(GUEST_PEER, { side: GameSide.Opponent }),
    );

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.events).toEqual([]);
    expect(result.command).toEqual({
      kind: 'concede',
      side: GameSide.Opponent,
    });
    expect(harness.concededSides).toEqual([GameSide.Opponent]);
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([]);
  });

  it('routes a guest-owned stand intent through the authoritative host command path', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const result = router.handleIntent(
      buildStandIntent(GUEST_PEER, { unitId: 'guest-0' }),
    );

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.events).toEqual([]);
    expect(result.command).toEqual({
      kind: 'stand',
      unitId: 'guest-0',
    });
    expect(harness.standAttempts).toEqual(['guest-0']);
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([]);
  });

  it('§5.4: rejects intents that target a unit the guest does not own', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    const result = router.handleIntent(
      buildDeclareMovementIntent(GUEST_PEER, {
        unitId: 'host-0',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      }),
    );

    expect(result.outcome).toBe('rejected');
    if (result.outcome !== 'rejected') return;
    expect(result.reason).toBe('unowned-unit');
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([{ reason: 'unowned-unit' }]);
  });

  it('§7.2: buffers intents while the guest is PeerPending and drains them on flush', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);

    harness.setGuestPending(true);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });
    const buffered = router.handleIntent(intent);

    expect(buffered.outcome).toBe('buffered');
    expect(harness.appended).toEqual([]);
    expect(router.getBufferState().pending).toHaveLength(1);

    // Now the guest reconnects → flushBuffered drains and applies.
    harness.setGuestPending(false);
    const drained = router.flushBuffered();
    expect(drained).toHaveLength(1);
    expect(drained[0].outcome).toBe('applied');
    expect(harness.appended.map((e) => e.type)).toEqual([
      'movement_declared',
      'movement_locked',
    ]);
    // Buffer is empty after drain.
    expect(router.getBufferState().pending).toEqual([]);
  });

  it('flushBuffered is a no-op when no intents are pending', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);
    expect(router.flushBuffered()).toEqual([]);
    expect(harness.appended).toEqual([]);
  });
});
