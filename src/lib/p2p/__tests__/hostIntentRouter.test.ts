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
import {
  Facing,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  appendEvent,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';

import {
  createHostIntentRouter,
  type IHostIntentRouterAdapter,
} from '../hostIntentRouter';
import { buildDeclareMovementIntent } from '../intentTranslation';

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
  rejections: { reason: string; detail?: string }[];
  setSession: (session: IGameSession) => void;
  setGuestPending: (pending: boolean) => void;
} {
  let session = initial;
  let guestPending = false;
  const appended: IGameEvent[] = [];
  const rejections: { reason: string; detail?: string }[] = [];

  const adapter: IHostIntentRouterAdapter = {
    getSession: () => session,
    appendEvent: (event) => {
      appended.push(event);
      session = appendEvent(session, event);
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
    rejections,
    setSession: (next) => {
      session = next;
    },
    setGuestPending: (pending) => {
      guestPending = pending;
    },
  };
}

function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: TerrainType,
  elevation = 0,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`Missing test hex ${key}`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, terrain, elevation });
  return { ...grid, hexes };
}

function movementOptions(
  grid: IHexGrid,
  capability: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 },
) {
  return {
    movementRules: {
      grid,
      movementByUnit: new Map<string, IMovementCapability>([
        ['guest-0', capability],
      ]),
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

  it('passes host movement rules into the translator and rejects illegal movement', () => {
    const session = fixtureSession();
    const harness = makeAdapter(session);
    const from = session.currentState.units['guest-0'].position;
    const to = { q: from.q + 1, r: from.r };
    const grid = setHex(createHexGrid({ radius: 8 }), to, TerrainType.Water);
    const router = createHostIntentRouter({
      ...harness.adapter,
      getIntentTranslationOptions: () =>
        movementOptions(grid, {
          walkMP: 4,
          runMP: 6,
          jumpMP: 0,
          movementMode: 'tracked',
        }),
    });

    const result = router.handleIntent(
      buildDeclareMovementIntent(GUEST_PEER, {
        unitId: 'guest-0',
        from,
        to,
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      }),
    );

    expect(result.outcome).toBe('rejected');
    if (result.outcome !== 'rejected') return;
    expect(result.reason).toBe('illegal-movement');
    expect(harness.appended).toEqual([]);
    expect(harness.rejections).toEqual([
      {
        reason: 'illegal-movement',
        detail: 'Water blocks ground movement',
      },
    ]);
  });

  it('flushBuffered is a no-op when no intents are pending', () => {
    const harness = makeAdapter(fixtureSession());
    const router = createHostIntentRouter(harness.adapter);
    expect(router.flushBuffered()).toEqual([]);
    expect(harness.appended).toEqual([]);
  });
});
