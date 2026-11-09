/**
 * P2P sync of interactive terrain PSRs (wire-interactive-terrain-psrs PR3).
 * Host translation now emits [MovementDeclared, ...terrain, MovementLocked]
 * with dense sequence numbers. The guest mirror applies them live, and a
 * reconnect replay stream rebuilds the same state.
 *
 * @spec openspec/changes/wire-interactive-terrain-psrs/specs/piloting-skill-rolls/spec.md
 */

import * as Y from 'yjs';

import {
  GameEventType,
  GameSide,
  PSRTrigger,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IPSRTriggeredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  GAME_SESSION_EVENTS_ARRAY,
  applyReplayStreamEvents,
  createGameSessionChannel,
  createReplayStreamEnvelopes,
} from '../gameSessionChannel';
import { createHostIntentRouter } from '../hostIntentRouter';
import { buildDeclareMovementIntent } from '../intentTranslation';
import { applyMirrorEvent, createMirrorSession } from '../mirrorSession';
import { linkPeers } from './linkedDocs.test-helpers';

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

const UNITS: readonly IGameUnit[] = [
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
const CONFIG = {
  mapRadius: 8,
  turnLimit: 30,
  victoryConditions: ['destroy_all'],
  optionalRules: [],
};
const OPTIONS = {
  id: 'match-terrain-psr',
  createdAt: FIXED_TIMESTAMP,
  hostPeerId: HOST_PEER,
  guestPeerId: GUEST_PEER,
  sideOwners: { [GameSide.Player]: HOST_PEER, [GameSide.Opponent]: GUEST_PEER },
};

function expectConverged(host: IGameSession, guest: IGameSession): void {
  expect(JSON.stringify(guest.currentState)).toBe(
    JSON.stringify(host.currentState),
  );
  expect(guest.events.slice(1)).toEqual(host.events.slice(1));
}

describe('P2P sync of interactive terrain PSRs', () => {
  let hostDoc: Y.Doc;
  let guestDoc: Y.Doc;

  beforeEach(() => {
    hostDoc = new Y.Doc();
    guestDoc = new Y.Doc();
    linkPeers(hostDoc, guestDoc);
  });

  afterEach(() => {
    hostDoc.destroy();
    guestDoc.destroy();
  });

  it('a guest move into water reaches the guest mirror and a replay rebuild with dense sequences', () => {
    const hostChannel = createGameSessionChannel({
      localPeerId: HOST_PEER,
      eventArray: hostDoc.getArray<string>(GAME_SESSION_EVENTS_ARRAY),
    });
    const guestChannel = createGameSessionChannel({
      localPeerId: GUEST_PEER,
      eventArray: guestDoc.getArray<string>(GAME_SESSION_EVENTS_ARRAY),
    });
    let guestSession = createMirrorSession(CONFIG, UNITS, OPTIONS);
    const unsubscribeGuest = guestChannel.onPeerEvent((event) => {
      guestSession = applyMirrorEvent(guestSession, event);
    });

    // Host reaches the Movement phase through real events, broadcasting each.
    let hostSession = createGameSession(CONFIG, UNITS, OPTIONS);
    const setupStart = hostSession.events.length;
    hostSession = startGame(hostSession, GameSide.Player);
    hostSession = rollInitiative(hostSession, GameSide.Player, () => 6);
    hostSession = advancePhase(hostSession);
    for (const event of hostSession.events.slice(setupStart)) {
      hostChannel.broadcastEvent(event);
    }

    const guestUnit = hostSession.currentState.units['guest-0'];
    const to = { q: guestUnit.position.q, r: guestUnit.position.r + 1 };
    const grid = createHexGrid({ radius: 8 });
    const target = grid.hexes.get(`${to.q},${to.r}`)!;
    grid.hexes.set(`${to.q},${to.r}`, {
      ...target,
      terrain: JSON.stringify([{ type: TerrainType.Water, level: 1 }]),
    });

    const beforeMove = hostSession.events.length;
    const router = createHostIntentRouter({
      getSession: () => hostSession,
      getTranslationAuthority: () => ({
        movementGrid: grid,
        movementByUnit: new Map([
          ['guest-0', { walkMP: 4, runMP: 6, jumpMP: 0 }],
        ]),
      }),
      appendEvent: (event: IGameEvent) => {
        hostSession = appendEvent(hostSession, event);
        hostChannel.broadcastEvent(event);
      },
      concede: () => undefined,
      stand: () => undefined,
      goProne: () => undefined,
      activateMovementEnhancement: () => undefined,
      advancePhase: () => undefined,
      broadcastRejection: () => undefined,
    });
    const unsubscribeHost = hostChannel.onPeerIntent((intent) => {
      router.handleIntent(intent);
    });
    guestChannel.broadcastIntent(
      buildDeclareMovementIntent(GUEST_PEER, {
        unitId: 'guest-0',
        from: guestUnit.position,
        to,
        facing: guestUnit.facing,
        movementType: 'walk' as never,
        mpUsed: 1,
        heatGenerated: 0,
      }),
    );
    unsubscribeHost();
    unsubscribeGuest();

    const moveEvents = hostSession.events.slice(beforeMove);
    expect(moveEvents.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.PSRTriggered,
      GameEventType.MovementLocked,
    ]);
    expect(moveEvents.map((event) => event.sequence)).toEqual([
      beforeMove,
      beforeMove + 1,
      beforeMove + 2,
    ]);
    expect((moveEvents[1].payload as IPSRTriggeredPayload).reasonCode).toBe(
      PSRTrigger.EnteringWater,
    );

    // Live guest mirror converges with the host, PSR queued once.
    expectConverged(hostSession, guestSession);
    expect(guestSession.currentState.units['guest-0'].pendingPSRs).toHaveLength(
      1,
    );

    // Reconnect: a fresh mirror rebuilt from the replay stream converges too,
    // even with the events chunked and delivered out of order.
    let rebuilt = createMirrorSession(CONFIG, UNITS, OPTIONS);
    const envelopes = createReplayStreamEnvelopes(
      OPTIONS.id,
      hostSession.events.slice(1),
      2,
    );
    applyReplayStreamEvents([...envelopes].reverse(), (event) => {
      rebuilt = applyMirrorEvent(rebuilt, event);
    });
    expectConverged(hostSession, rebuilt);
  });
});
