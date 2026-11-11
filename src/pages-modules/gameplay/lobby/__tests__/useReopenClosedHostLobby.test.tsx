import type { NextRouter } from 'next/router';

import { act, renderHook, waitFor } from '@testing-library/react';
import * as Y from 'yjs';

import type { ILoadout } from '@/types/gameplay/GameLobbyInterfaces';

import { modeAvailability } from '@/lib/multiplayer/modeAvailability';
import { matchLogStorage } from '@/lib/p2p';
import {
  LOBBY_MAP_NAME,
  LOBBY_STATE_KEY,
  createLobbyChannel,
  readLobbyState,
} from '@/lib/p2p/lobbyChannel';
import { useLobbySelector, useLobbyStore } from '@/stores/useLobbyStore';
import { createInitialLobbyState } from '@/types/gameplay/GameLobbyInterfaces';

import {
  useReopenClosedHostLobby,
  useLaunchedMatchNavigation,
  launchLobbyMatch,
  useEnsureActiveRoom,
} from '../gameplayLobbyPage.helpers';

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

const metadataRecord: Awaited<
  ReturnType<typeof matchLogStorage.upsertMatchMetadata>
> = {
  matchId: 'p2p-abcdef',
  hostPeerId: 'host',
  guestPeerId: null,
  status: 'active',
  lastActivity: '2026-11-11T00:00:00.000Z',
};

describe('P2P release launch policy', () => {
  afterEach(() => jest.restoreAllMocks());

  const router: NextRouter = {
    basePath: '',
    pathname: '/gameplay/lobby/[roomCode]',
    route: '/gameplay/lobby/[roomCode]',
    asPath: '/gameplay/lobby/ABCDEF',
    query: { roomCode: 'ABCDEF' },
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    isFallback: false,
    isReady: true,
    isLocaleDomain: false,
    isPreview: false,
  };

  it('refuses launch at the helper before any channel or session mutation', async () => {
    const launch = jest.fn();
    const setSession = jest.fn();
    await launchLobbyMatch({
      launch,
      setSession,
      lobbyState: createInitialLobbyState('host'),
      routeRoomCode: 'ABCDEF',
    });
    expect(launch).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('restores the helper channel call when the status becomes available', async () => {
    jest.replaceProperty(modeAvailability.p2p, 'status', 'available');
    const launch = jest.fn().mockReturnValue(null);
    await launchLobbyMatch({
      launch,
      setSession: jest.fn(),
      lobbyState: createInitialLobbyState('host'),
      routeRoomCode: 'ABCDEF',
    });
    expect(launch).toHaveBeenCalledWith('p2p-abcdef');
  });

  it('refuses a launched room broadcast before navigation or session creation', () => {
    const metadata = jest
      .spyOn(matchLogStorage, 'upsertMatchMetadata')
      .mockResolvedValue(metadataRecord);
    const setSession = jest.fn();
    jest.mocked(router.push).mockClear();
    renderHook(() =>
      useLaunchedMatchNavigation({
        lobbyState: {
          ...createInitialLobbyState('host'),
          matchId: 'p2p-abcdef',
        },
        router,
        setSession,
      }),
    );
    expect(metadata).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });
});

it('restores launched navigation when the mode becomes available', async () => {
  const status = modeAvailability.p2p.status;
  const metadata = jest
    .spyOn(matchLogStorage, 'upsertMatchMetadata')
    .mockResolvedValue(metadataRecord);
  try {
    jest.replaceProperty(modeAvailability.p2p, 'status', 'available');
    const push = jest.fn().mockResolvedValue(true);
    const router: NextRouter = {
      basePath: '',
      pathname: '',
      route: '',
      asPath: '',
      query: {},
      push,
      replace: jest.fn().mockResolvedValue(true),
      reload: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
      isFallback: false,
      isReady: true,
      isLocaleDomain: false,
      isPreview: false,
    };
    renderHook(() =>
      useLaunchedMatchNavigation({
        lobbyState: {
          ...createInitialLobbyState('host'),
          matchId: 'p2p-abcdef',
        },
        router,
        setSession: jest.fn(),
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/gameplay/games/p2p-abcdef'),
    );
    expect(metadata).toHaveBeenCalled();
  } finally {
    jest.replaceProperty(modeAvailability.p2p, 'status', status);
    metadata.mockRestore();
  }
});

describe('P2P entry release policy', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([true, false])(
    'refuses direct route networking for host=%s',
    (isHostRoute) => {
      const createRoom = jest.fn();
      const joinRoom = jest.fn();
      renderHook(() =>
        useEnsureActiveRoom({
          activeRoom: null,
          createRoom,
          joinRoom,
          isHostRoute,
          routeRoomCode: 'ROOT01',
        }),
      );
      expect(createRoom).not.toHaveBeenCalled();
      expect(joinRoom).not.toHaveBeenCalled();
    },
  );
  it.each([true, false])(
    'restores direct route entry for host=%s when available',
    async (isHostRoute) => {
      jest.replaceProperty(modeAvailability.p2p, 'status', 'available');
      const createRoom = jest.fn().mockResolvedValue('ROOT01');
      const joinRoom = jest.fn().mockResolvedValue(undefined);
      renderHook(() =>
        useEnsureActiveRoom({
          activeRoom: null,
          createRoom,
          joinRoom,
          isHostRoute,
          routeRoomCode: 'ROOT01',
        }),
      );
      await waitFor(() =>
        expect(isHostRoute ? createRoom : joinRoom).toHaveBeenCalled(),
      );
    },
  );
});
