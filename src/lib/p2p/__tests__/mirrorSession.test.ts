/**
 * Unit tests for the guest mirror-session helpers.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 4
 */

import {
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSessionCore';

import {
  applyMirrorEvent,
  assertMirrorAppendForbidden,
  createMirrorSession,
  describeMirrorAppendRejection,
  isMirrorSession,
  MirrorAppendForbiddenError,
} from '../mirrorSession';

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

function fixtureUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'host-0',
      name: 'Wasp WSP-1A',
      side: GameSide.Player,
      unitRef: 'wsp-1a',
      pilotRef: 'p-host',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'guest-0',
      name: 'Cicada CDA-2A',
      side: GameSide.Opponent,
      unitRef: 'cda-2a',
      pilotRef: 'p-guest',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function fixtureConfig(): IGameConfig {
  return {
    mapRadius: 8,
    turnLimit: 30,
    victoryConditions: ['destroy_all'],
    optionalRules: [],
  };
}

describe('mirrorSession', () => {
  it('§4.1: createMirrorSession produces a session value-equal to the host config', () => {
    const host = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: {
        [GameSide.Player]: HOST_PEER,
        [GameSide.Opponent]: GUEST_PEER,
      },
    });

    const guest = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: {
        [GameSide.Player]: HOST_PEER,
        [GameSide.Opponent]: GUEST_PEER,
      },
    });

    // The session id, config, units, currentState, and side ownership
    // must match byte-for-byte. updatedAt + the GameCreated event id
    // and timestamp are set from local clock / uuidv4 in
    // createGameSession, so we compare derived state instead. The
    // production reconnect path (`replay-stream`) ships the host's
    // GameCreated event verbatim to the guest, which is why
    // currentState parity is the property the spec actually depends
    // on (see `rngReplay.test.ts` for the same pattern).
    expect(JSON.stringify(guest.currentState)).toBe(
      JSON.stringify(host.currentState),
    );
    expect(guest.id).toBe(host.id);
    expect(guest.matchId).toBe(host.matchId);
    expect(guest.config).toEqual(host.config);
    expect(guest.units).toEqual(host.units);
    expect(guest.sideOwners).toEqual(host.sideOwners);
    expect(guest.hostPeerId).toBe(HOST_PEER);
    expect(guest.guestPeerId).toBe(GUEST_PEER);
  });

  it('§4.3: mirror session exposes the same read API as the host', () => {
    const guest = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
    });

    expect(guest.units).toHaveLength(2);
    expect(guest.events).toHaveLength(1); // GameCreated
    expect(guest.currentState.units['host-0']).toBeDefined();
    expect(guest.currentState.units['guest-0']).toBeDefined();
  });

  it('applyMirrorEvent appends events without mutating the input', () => {
    const guest = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
    });
    const startedHost = startGame(guest, GameSide.Player);
    const guestStarted = applyMirrorEvent(guest, startedHost.events[1]);

    expect(guestStarted.events).toHaveLength(2);
    expect(guest.events).toHaveLength(1);
    expect(guestStarted.events[1]).toEqual(startedHost.events[1]);
  });

  it('isMirrorSession correctly identifies guest peers', () => {
    const networkedSession: Pick<IGameSession, 'hostPeerId' | 'guestPeerId'> = {
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
    };
    const localSession: Pick<IGameSession, 'hostPeerId' | 'guestPeerId'> = {};

    expect(isMirrorSession(networkedSession as IGameSession, GUEST_PEER)).toBe(
      true,
    );
    expect(isMirrorSession(networkedSession as IGameSession, HOST_PEER)).toBe(
      false,
    );
    expect(isMirrorSession(networkedSession as IGameSession, null)).toBe(false);
    expect(isMirrorSession(localSession as IGameSession, GUEST_PEER)).toBe(
      false,
    );
  });

  it('§4.2: describeMirrorAppendRejection reports mirror-readonly for guest commits', () => {
    const guest = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
    });

    expect(
      describeMirrorAppendRejection({
        session: guest,
        localPeerId: GUEST_PEER,
      }),
    ).toBe('mirror-readonly');
    // Host on the same session: no rejection (host can append).
    expect(
      describeMirrorAppendRejection({
        session: guest,
        localPeerId: HOST_PEER,
      }),
    ).toBeNull();
    // No session at all: explicit signal.
    expect(
      describeMirrorAppendRejection({
        session: null,
        localPeerId: GUEST_PEER,
      }),
    ).toBe('no-session');
  });

  it('assertMirrorAppendForbidden throws on guest commits, no-ops on host', () => {
    const guest = createMirrorSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
    });

    expect(() => assertMirrorAppendForbidden(guest, GUEST_PEER)).toThrow(
      MirrorAppendForbiddenError,
    );
    try {
      assertMirrorAppendForbidden(guest, GUEST_PEER);
    } catch (err) {
      expect(err).toBeInstanceOf(MirrorAppendForbiddenError);
      expect((err as MirrorAppendForbiddenError).reason).toBe(
        'mirror-readonly',
      );
    }
    // Host path: no throw.
    expect(() => assertMirrorAppendForbidden(guest, HOST_PEER)).not.toThrow();
  });
});
