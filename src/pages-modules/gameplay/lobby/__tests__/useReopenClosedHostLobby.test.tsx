import { act, renderHook } from '@testing-library/react';
import * as Y from 'yjs';

import type { ILoadout } from '@/types/gameplay/GameLobbyInterfaces';

import {
  LOBBY_MAP_NAME,
  LOBBY_STATE_KEY,
  createLobbyChannel,
  readLobbyState,
} from '@/lib/p2p/lobbyChannel';
import { useLobbySelector, useLobbyStore } from '@/stores/useLobbyStore';

import { useReopenClosedHostLobby } from '../gameplayLobbyPage.helpers';

const mockPromoteLocalPeerToHost = jest.fn();

jest.mock('@/lib/p2p', () => ({
  ...jest.requireActual('@/lib/p2p'),
  promoteLocalPeerToHost: (...args: unknown[]) =>
    mockPromoteLocalPeerToHost(...args),
}));

function makeLoadout(unitId: string): ILoadout {
  return {
    units: [{ unitId, designation: `Unit ${unitId}`, tonnage: 50, bv: 1000 }],
    pilots: [
      {
        pilotId: `pilot-${unitId}`,
        unitId,
        callsign: `Pilot ${unitId}`,
        gunnery: 4,
        piloting: 5,
      },
    ],
  };
}

describe('useReopenClosedHostLobby', () => {
  let doc: Y.Doc;
  let lobbyMap: Y.Map<unknown>;

  beforeEach(() => {
    doc = new Y.Doc();
    lobbyMap = doc.getMap<unknown>(LOBBY_MAP_NAME);
    mockPromoteLocalPeerToHost.mockClear();
    useLobbyStore.getState().resetLobby();
  });

  afterEach(() => {
    useLobbyStore.getState().resetLobby();
    doc.destroy();
  });

  function mount(localPeerId: string, isHostRoute: boolean) {
    const channel = createLobbyChannel({ localPeerId, lobbyMap });
    useLobbyStore
      .getState()
      .bindChannel(channel, { localPeerId, roomCode: 'ABC123' });
    return renderHook(() => {
      const lobbyState = useLobbySelector((state) => state.lobbyState);
      const initializeHost = useLobbySelector((state) => state.initializeHost);
      useReopenClosedHostLobby({
        isHostRoute,
        lobbyState,
        localPeerId,
        initializeHost,
      });
    });
  }

  function seedPersistedClosedLobby(): void {
    // What y-indexeddb hands back to a returning host: the previous
    // session's host id, a guest, loadouts, and `closed`.
    const previous = createLobbyChannel({
      localPeerId: 'host-old-session',
      lobbyMap,
    });
    previous.initializeHost();
    previous.updateLoadout('host', makeLoadout('host-1'));
    lobbyMap.set(LOBBY_STATE_KEY, {
      ...readLobbyState({ lobbyMap })!,
      guestPeerId: 'guest-old',
      closed: true,
    });
  }

  it('starts a fresh lobby when a returning host finds a persisted closed one', () => {
    seedPersistedClosedLobby();

    act(() => {
      mount('host-new-session', true);
    });

    const state = readLobbyState({ lobbyMap });
    expect(state?.closed).toBeUndefined();
    expect(state?.hostPeerId).toBe('host-new-session');
    expect(state?.guestPeerId).toBeNull();
    expect(state?.hostLoadout.units).toHaveLength(0);
    expect(mockPromoteLocalPeerToHost).toHaveBeenCalledWith({
      localPeerId: 'host-new-session',
    });
  });

  it('reopens when a guest closes the lobby while the host is present', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    act(() => {
      mount('host-peer', true);
    });

    act(() => {
      guest.handlePeerDisconnect('host-peer');
    });

    const state = readLobbyState({ lobbyMap });
    expect(state?.closed).toBeUndefined();
    expect(state?.hostPeerId).toBe('host-peer');
    expect(state?.guestPeerId).toBeNull();
  });

  it('leaves a closed lobby alone on a guest route', () => {
    seedPersistedClosedLobby();

    act(() => {
      mount('guest-new', false);
    });

    expect(readLobbyState({ lobbyMap })?.closed).toBe(true);
    expect(mockPromoteLocalPeerToHost).not.toHaveBeenCalled();
  });

  it('leaves a launched lobby alone even if it is marked closed', () => {
    seedPersistedClosedLobby();
    lobbyMap.set(LOBBY_STATE_KEY, {
      ...readLobbyState({ lobbyMap })!,
      matchId: 'match-1',
    });

    act(() => {
      mount('host-new-session', true);
    });

    expect(readLobbyState({ lobbyMap })?.matchId).toBe('match-1');
    expect(readLobbyState({ lobbyMap })?.closed).toBe(true);
  });

  it('does not reset an open lobby', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    host.initializeHost();
    host.updateLoadout('host', makeLoadout('host-1'));

    act(() => {
      mount('host-peer', true);
    });

    expect(readLobbyState({ lobbyMap })?.hostLoadout.units).toHaveLength(1);
    expect(mockPromoteLocalPeerToHost).not.toHaveBeenCalled();
  });
});
