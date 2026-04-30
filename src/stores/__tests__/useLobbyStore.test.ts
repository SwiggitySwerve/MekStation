import { act } from '@testing-library/react';
import * as Y from 'yjs';

import type { ILoadout } from '@/types/gameplay/GameLobbyInterfaces';

import { LOBBY_MAP_NAME, createLobbyChannel } from '@/lib/p2p/lobbyChannel';

import { useLobbyStore } from '../useLobbyStore';

function makeLoadout(unitId: string): ILoadout {
  return {
    units: [
      {
        unitId,
        designation: `Unit ${unitId}`,
        tonnage: 55,
        bv: 1100,
      },
    ],
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

describe('useLobbyStore', () => {
  let doc: Y.Doc;
  let lobbyMap: Y.Map<unknown>;

  beforeEach(() => {
    doc = new Y.Doc();
    lobbyMap = doc.getMap<unknown>(LOBBY_MAP_NAME);
    useLobbyStore.getState().resetLobby();
  });

  afterEach(() => {
    useLobbyStore.getState().resetLobby();
    doc.destroy();
  });

  it('mirrors channel state changes into the store', () => {
    const channel = createLobbyChannel({
      localPeerId: 'host-peer',
      lobbyMap,
    });

    act(() => {
      useLobbyStore
        .getState()
        .bindChannel(channel, { localPeerId: 'host-peer', roomCode: 'ABC123' });
      useLobbyStore.getState().initializeHost();
    });

    expect(useLobbyStore.getState().lobbyState?.hostPeerId).toBe('host-peer');
    expect(useLobbyStore.getState().roomCode).toBe('ABC123');
  });

  it('updates only the local peer loadout through the channel', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();

    act(() => {
      useLobbyStore
        .getState()
        .bindChannel(guest, { localPeerId: 'guest-peer', roomCode: 'ABC123' });
      useLobbyStore.getState().updateLocalLoadout(makeLoadout('guest-1'));
    });

    const state = useLobbyStore.getState().lobbyState;
    expect(state?.guestLoadout.units[0]?.unitId).toBe('guest-1');
    expect(state?.hostLoadout.units).toHaveLength(0);
  });

  it('surfaces host-only launch rejection for guests', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();

    act(() => {
      useLobbyStore
        .getState()
        .bindChannel(guest, { localPeerId: 'guest-peer', roomCode: 'ABC123' });
      useLobbyStore.getState().launch('match-1');
    });

    expect(useLobbyStore.getState().lastRejection?.reason).toBe('host-only');
    expect(useLobbyStore.getState().error).toBe(
      'Only the host can change that lobby setting',
    );
  });
});
