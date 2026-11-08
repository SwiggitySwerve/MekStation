import * as Y from 'yjs';

import type { ILoadout } from '@/types/gameplay/GameLobbyInterfaces';

import {
  canLaunchLobby,
  type ILobbyState,
} from '@/types/gameplay/GameLobbyInterfaces';

import {
  LOBBY_MAP_NAME,
  LOBBY_STATE_KEY,
  createLobbyChannel,
  readLobbyState,
} from '../lobbyChannel';

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

describe('lobbyChannel closed lobby', () => {
  let doc: Y.Doc;
  let lobbyMap: Y.Map<unknown>;

  beforeEach(() => {
    doc = new Y.Doc();
    lobbyMap = doc.getMap<unknown>(LOBBY_MAP_NAME);
  });

  afterEach(() => {
    doc.destroy();
  });

  /** A launchable lobby that was then marked closed (e.g. a persisted one). */
  function seedReadyClosedLobby(): ILobbyState {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    host.updateLoadout('host', makeLoadout('host-1'));
    guest.updateLoadout('guest', makeLoadout('guest-1'));
    host.setReady('host-peer', true);
    guest.setReady('guest-peer', true);
    const closed: ILobbyState = { ...readLobbyState({ lobbyMap })!, closed: true };
    lobbyMap.set(LOBBY_STATE_KEY, closed);
    return closed;
  }

  it('is not launchable even when both sides are ready', () => {
    const closed = seedReadyClosedLobby();

    expect(canLaunchLobby({ ...closed, closed: false })).toBe(true);
    expect(canLaunchLobby(closed)).toBe(false);
  });

  it('rejects launch and leaves the lobby unlaunched', () => {
    seedReadyClosedLobby();
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });

    const result = host.launch('match-1');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('lobby-closed');
    expect(readLobbyState({ lobbyMap })?.matchId).toBeUndefined();
  });

  it.each([
    ['setReady', (c: ReturnType<typeof createLobbyChannel>) => c.setReady('guest-peer', false)],
    [
      'updateLoadout',
      (c: ReturnType<typeof createLobbyChannel>) =>
        c.updateLoadout('guest', makeLoadout('guest-2')),
    ],
  ])('rejects %s on a closed lobby without changing it', (_name, act) => {
    const before = seedReadyClosedLobby();
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });

    const result = act(guest);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('lobby-closed');
    expect(readLobbyState({ lobbyMap })).toEqual(before);
  });

  it.each([
    [
      'updateMapConfig',
      (c: ReturnType<typeof createLobbyChannel>) =>
        c.updateMapConfig({ radius: 12, terrainPreset: 'urban', turnLimit: 5 }),
    ],
    [
      'setHostSide',
      (c: ReturnType<typeof createLobbyChannel>) => c.setHostSide('opponent'),
    ],
  ])('rejects host-only %s on a closed lobby without changing it', (_name, act) => {
    const before = seedReadyClosedLobby();
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });

    const result = act(host);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('lobby-closed');
    expect(readLobbyState({ lobbyMap })).toEqual(before);
  });

  it('does not let a new guest join a closed lobby', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    host.initializeHost();
    lobbyMap.set(LOBBY_STATE_KEY, { ...host.getState()!, closed: true });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });

    const result = guest.joinGuest();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('lobby-closed');
    expect(readLobbyState({ lobbyMap })?.guestPeerId).toBeNull();
  });

  it('still lets a guest close the lobby when the host disappears', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();

    guest.handlePeerDisconnect('host-peer');

    expect(readLobbyState({ lobbyMap })?.closed).toBe(true);
  });

  it('never closes the lobby because the local peer itself went missing', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    host.initializeHost();

    const result = host.handlePeerDisconnect('host-peer');

    expect(result.ok).toBe(true);
    expect(readLobbyState({ lobbyMap })?.closed).toBeUndefined();
  });

  it('leaves an already closed lobby untouched on a later disconnect', () => {
    const before = seedReadyClosedLobby();
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });

    host.handlePeerDisconnect('guest-peer');

    expect(readLobbyState({ lobbyMap })).toEqual(before);
  });
});
