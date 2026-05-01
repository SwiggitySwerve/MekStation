/**
 * Lobby channel integration tests (§ 10 of
 * `add-game-session-invite-and-lobby-1v1`).
 *
 * Pattern: two `lobbyChannel` instances bound to the SAME Yjs Y.Map
 * (the simplest faithful model of two peers in the same sync room).
 * The doc-level Y.Map delivers updates synchronously inside a single
 * transaction, so we don't need to fake BroadcastChannel + the WebRTC
 * layer — same convention used by `p2pSessionSync.integration.test.ts`.
 *
 * Covers:
 *   §10.1 host creates lobby → guest joins → both pick loadouts → both
 *         ready → host launches → both peers' state contains a matchId
 *         and the resulting session contains units from both sides
 *         (combat-page navigation is React-router driven and lives in
 *         the lobby page test).
 *   §10.2 host disconnect closes the lobby (`closed: true` flag).
 *   §10.3 guest cannot modify the host's loadout (rejection envelope
 *         with `unauthorized-slot`).
 *   §10.4 third peer joining the room cannot claim a 1v1 lobby slot
 *         (`lobby-full` rejection).
 *
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/multiplayer-sync/spec.md
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/game-session-management/spec.md
 */

import * as Y from 'yjs';

import type {
  ILoadout,
  ISelectedPilot,
  ISelectedUnit,
} from '@/types/gameplay/GameLobbyInterfaces';

import { GameSide } from '@/types/gameplay';
import { buildGameSessionFromLobbyState } from '@/utils/gameplay/lobbySessionBuilder';

import { LOBBY_MAP_NAME, createLobbyChannel } from '../lobbyChannel';

// =============================================================================
// Fixtures
// =============================================================================

const HOST_PEER = 'host-peer-1';
const GUEST_PEER = 'guest-peer-1';
const THIRD_PEER = 'third-peer-1';

function unit(
  unitId: string,
  designation: string,
  tonnage = 50,
): ISelectedUnit {
  return {
    unitId,
    designation,
    tonnage,
    bv: 1000,
    source: 'canonical',
  };
}

function pilot(unitId: string, callsign: string): ISelectedPilot {
  return {
    pilotId: `pilot-${unitId}`,
    unitId,
    callsign,
    gunnery: 4,
    piloting: 5,
  };
}

function loadout(
  unitId: string,
  designation: string,
  callsign: string,
): ILoadout {
  return {
    units: [unit(unitId, designation)],
    pilots: [pilot(unitId, callsign)],
  };
}

function setupSharedDoc() {
  const doc = new Y.Doc();
  const lobbyMap = doc.getMap<unknown>(LOBBY_MAP_NAME);
  return { doc, lobbyMap };
}

// =============================================================================
// §10.1 Happy path: host + guest → ready → launch → session built
// =============================================================================

describe('§10.1 networked 1v1 happy path: lobby → ready → launch → session', () => {
  it('host creates, guest joins, both ready, host launches, session uses both loadouts', () => {
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });

      // Host initialises the lobby (mirrors what the lobby page does
      // when the `?host=1` query param is set on first paint).
      host.initializeHost();

      // Guest joins after observing the lobby state.
      const joinResult = guest.joinGuest();
      expect(joinResult.ok).toBe(true);
      expect(joinResult.state?.guestPeerId).toBe(GUEST_PEER);

      // Both peers pick a single mech + pilot. The 1v1 happy path
      // requires symmetric counts; the lobby channel rejects ready if
      // they diverge (covered by other tests).
      host.updateLoadout('host', loadout('atlas-as7-d', 'Atlas AS7-D', 'Hawk'));
      guest.updateLoadout(
        'guest',
        loadout('hbk-4g', 'Hunchback HBK-4G', 'Bishop'),
      );

      // Both flip ready. Each peer can only set its own flag — the
      // store-side wiring enforces this via local-peer-id, the channel
      // re-checks the assertion.
      const hostReadyResult = host.setReady(HOST_PEER, true);
      const guestReadyResult = guest.setReady(GUEST_PEER, true);
      expect(hostReadyResult.ok).toBe(true);
      expect(guestReadyResult.ok).toBe(true);

      // Host launches with a deterministic match id so the assertion
      // doesn't drift on retries. Both peers should observe the same
      // matchId after the host writes it.
      const launchResult = host.launch('match-happy-path-1');
      expect(launchResult.ok).toBe(true);
      expect(launchResult.state?.matchId).toBe('match-happy-path-1');
      expect(guest.getState()?.matchId).toBe('match-happy-path-1');

      // Building the session from either peer's view yields the same
      // shape: 2 units (one per side), correct sideOwners mapping. This
      // is what the lobby page's `useEffect` does when it sees a
      // `matchId` set — both peers reach the same session id and the
      // navigation effect sends them to `/gameplay/games/[matchId]`.
      const fromHost = buildGameSessionFromLobbyState(
        launchResult.state!,
        'match-happy-path-1',
      );
      const fromGuest = buildGameSessionFromLobbyState(
        guest.getState()!,
        'match-happy-path-1',
      );

      expect(fromHost.id).toBe('match-happy-path-1');
      expect(fromGuest.id).toBe('match-happy-path-1');
      expect(fromHost.units).toHaveLength(2);
      expect(fromGuest.units).toHaveLength(2);

      // Default hostSide is 'player', so host owns Player and guest
      // owns Opponent. Both peers must see the same sideOwners
      // because both parsed the same lobby state from the shared doc.
      // (`sideOwners` is optional on IGameSession to support hot-seat
      // play; for networked sessions the builder always populates it.)
      expect(fromHost.sideOwners).toBeDefined();
      expect(fromHost.sideOwners?.[GameSide.Player]).toBe(HOST_PEER);
      expect(fromHost.sideOwners?.[GameSide.Opponent]).toBe(GUEST_PEER);
      expect(fromGuest.sideOwners).toEqual(fromHost.sideOwners);

      // Units ordering is deterministic: host units first (Player
      // side), then guest units (Opponent side).
      expect(fromHost.units[0]?.side).toBe(GameSide.Player);
      expect(fromHost.units[0]?.unitRef).toBe('atlas-as7-d');
      expect(fromHost.units[1]?.side).toBe(GameSide.Opponent);
      expect(fromHost.units[1]?.unitRef).toBe('hbk-4g');
    } finally {
      doc.destroy();
    }
  });
});

// =============================================================================
// §10.2 Host disconnect closes the lobby
// =============================================================================

describe('§10.2 host disconnect closes the lobby', () => {
  it('handlePeerDisconnect(host) marks the lobby `closed` for the guest', () => {
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();

      // Sanity: lobby is open before the disconnect.
      expect(host.getState()?.closed).toBeUndefined();
      expect(guest.getState()?.closed).toBeUndefined();

      // Simulate the awareness poller in the lobby page detecting that
      // the host's awareness state vanished. The guest's channel calls
      // `handlePeerDisconnect(HOST_PEER)` because that's the peer the
      // poller saw drop. (The host itself has navigated away by then
      // and is not running this code path.)
      const result = guest.handlePeerDisconnect(HOST_PEER);
      expect(result.ok).toBe(true);
      expect(result.state?.closed).toBe(true);

      // Both views agree that the lobby is closed — the page's
      // closed-navigation effect fires for the guest, sending them
      // back to `/gameplay/games`.
      expect(guest.getState()?.closed).toBe(true);
      expect(host.getState()?.closed).toBe(true);

      // Ready flags are reset along with `closed` so a brief render
      // before the route change doesn't show a half-launched lobby.
      expect(guest.getState()?.hostReady).toBe(false);
      expect(guest.getState()?.guestReady).toBe(false);
    } finally {
      doc.destroy();
    }
  });

  it('handlePeerDisconnect is a no-op once `matchId` is set', () => {
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();
      host.updateLoadout('host', loadout('a', 'Alpha', 'A'));
      guest.updateLoadout('guest', loadout('b', 'Bravo', 'B'));
      host.setReady(HOST_PEER, true);
      guest.setReady(GUEST_PEER, true);
      host.launch('m-launched-1');

      // Host now disappears post-launch — at that point the in-game
      // reconnect grace window owns the session lifecycle, so the
      // lobby channel must NOT mark `closed`.
      const result = guest.handlePeerDisconnect(HOST_PEER);
      expect(result.ok).toBe(true);
      expect(result.state?.closed).toBeUndefined();
      expect(result.state?.matchId).toBe('m-launched-1');
    } finally {
      doc.destroy();
    }
  });
});

// =============================================================================
// §10.3 Guest cannot modify host's loadout
// =============================================================================

describe('§10.3 guest cannot modify the host loadout', () => {
  it('guest.updateLoadout("host", ...) is rejected with `unauthorized-slot`', () => {
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();

      // Host populates its own loadout legitimately.
      host.updateLoadout('host', loadout('atlas-as7-d', 'Atlas AS7-D', 'Hawk'));

      // Capture peer-rejection envelopes locally on the guest — that's
      // the surface the guest's UI listens on for toast notifications.
      const guestRejections: string[] = [];
      const unsubscribe = guest.onPeerRejection((envelope) => {
        guestRejections.push(envelope.reason);
      });

      // Guest tries to overwrite the host's loadout — must be rejected
      // before any write hits the shared Y.Map.
      const tampered: ILoadout = loadout(
        'griffin-1n',
        'Griffin GRF-1N',
        'Spider',
      );
      const result = guest.updateLoadout('host', tampered);
      unsubscribe();

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('unauthorized-slot');
      expect(guestRejections).toContain('unauthorized-slot');

      // The host's loadout in the shared state still references the
      // legitimate Atlas — the rejected write left the doc untouched.
      expect(host.getState()?.hostLoadout.units[0]?.unitId).toBe('atlas-as7-d');
      expect(guest.getState()?.hostLoadout.units[0]?.unitId).toBe(
        'atlas-as7-d',
      );
    } finally {
      doc.destroy();
    }
  });

  it('host attempting to write the guest slot is also rejected', () => {
    // Symmetry guard: the rule is "you can only write your own side",
    // not "guests can't write hosts." Verify the inverse holds too.
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();

      const result = host.updateLoadout(
        'guest',
        loadout('h', 'Hostile', 'Hostile'),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('unauthorized-slot');
      expect(guest.getState()?.guestLoadout.units).toHaveLength(0);
    } finally {
      doc.destroy();
    }
  });
});

// =============================================================================
// §10.4 Third peer cannot join a 1v1 lobby
// =============================================================================

describe('§10.4 third peer joining the room cannot claim the 1v1 lobby', () => {
  it('joinGuest from a third peer is rejected with `lobby-full`', () => {
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });
      const third = createLobbyChannel({ localPeerId: THIRD_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();

      // Third peer connects to the room and immediately tries to claim
      // the guest slot. The lobby channel must refuse: 1v1 caps the
      // human seats at exactly two, and the guest slot is already
      // owned by GUEST_PEER.
      const thirdRejections: string[] = [];
      const unsubscribe = third.onPeerRejection((envelope) => {
        thirdRejections.push(envelope.reason);
      });

      const result = third.joinGuest();
      unsubscribe();

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('lobby-full');
      expect(thirdRejections).toContain('lobby-full');

      // The shared doc still records the original guest — the third
      // peer's attempt did not displace anybody.
      expect(host.getState()?.guestPeerId).toBe(GUEST_PEER);
      expect(third.getState()?.guestPeerId).toBe(GUEST_PEER);
    } finally {
      doc.destroy();
    }
  });

  it('third peer cannot bypass via updateLoadout either', () => {
    // Defence in depth: even if a malicious client skips `joinGuest`
    // and tries to update either loadout slot directly, the per-side
    // ownership check rejects the write. This guards the case where a
    // future patch loosens the joinGuest path.
    const { doc, lobbyMap } = setupSharedDoc();

    try {
      const host = createLobbyChannel({ localPeerId: HOST_PEER, lobbyMap });
      const guest = createLobbyChannel({ localPeerId: GUEST_PEER, lobbyMap });
      const third = createLobbyChannel({ localPeerId: THIRD_PEER, lobbyMap });

      host.initializeHost();
      guest.joinGuest();

      const hostSide = third.updateLoadout('host', loadout('x', 'X', 'X'));
      const guestSide = third.updateLoadout('guest', loadout('y', 'Y', 'Y'));
      const readyHost = third.setReady(HOST_PEER, true);
      const readyGuest = third.setReady(GUEST_PEER, true);

      expect(hostSide.reason).toBe('unauthorized-slot');
      expect(guestSide.reason).toBe('unauthorized-slot');
      // setReady checks `peerId !== currentPeerId()` first — the third
      // peer can only call it with its OWN peer id, so passing host's
      // or guest's ids fails authorisation immediately.
      expect(readyHost.reason).toBe('unauthorized-slot');
      expect(readyGuest.reason).toBe('unauthorized-slot');
    } finally {
      doc.destroy();
    }
  });
});
