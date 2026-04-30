import * as Y from 'yjs';

import type { ILoadout } from '@/types/gameplay/GameLobbyInterfaces';

import {
  LOBBY_MAP_NAME,
  createLobbyChannel,
  readLobbyState,
} from '../lobbyChannel';

function makeLoadout(unitId: string): ILoadout {
  return {
    units: [
      {
        unitId,
        designation: `Unit ${unitId}`,
        tonnage: 50,
        bv: 1000,
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

describe('lobbyChannel', () => {
  let doc: Y.Doc;
  let lobbyMap: Y.Map<unknown>;

  beforeEach(() => {
    doc = new Y.Doc();
    lobbyMap = doc.getMap<unknown>(LOBBY_MAP_NAME);
  });

  afterEach(() => {
    doc.destroy();
  });

  it('initializes the required 1v1 lobby state shape', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });

    const state = host.initializeHost();

    expect(state).toMatchObject({
      mode: '1v1',
      hostPeerId: 'host-peer',
      guestPeerId: null,
      hostReady: false,
      guestReady: false,
      mapConfig: { radius: 8, terrainPreset: 'clear', turnLimit: 20 },
    });
    expect(readLobbyState({ lobbyMap })).toEqual(state);
  });

  it('mirrors host map config edits to peer observers', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    const observed: number[] = [];
    const unsubscribe = guest.onStateChange((state) => {
      if (state) observed.push(state.mapConfig.radius);
    });

    host.updateMapConfig({
      radius: 14,
      terrainPreset: 'woods',
      turnLimit: 30,
    });

    unsubscribe();
    expect(observed).toContain(14);
    expect(guest.getState()?.mapConfig.radius).toBe(14);
  });

  it('rejects a peer updating a loadout slot it does not own', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    const rejections: string[] = [];
    const unsubscribe = host.onPeerRejection((envelope) => {
      rejections.push(envelope.reason);
    });

    const result = host.updateLoadout('guest', makeLoadout('enemy-1'));
    const guestResult = guest.updateLoadout('host', makeLoadout('host-1'));

    unsubscribe();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unauthorized-slot');
    expect(guestResult.ok).toBe(false);
    expect(guestResult.reason).toBe('unauthorized-slot');
    expect(rejections).toEqual(['unauthorized-slot']);
    expect(host.getState()?.guestLoadout.units).toHaveLength(0);
    expect(host.getState()?.hostLoadout.units).toHaveLength(0);
  });

  it('only lets each peer toggle their own ready flag', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    host.updateLoadout('host', makeLoadout('host-1'));
    guest.updateLoadout('guest', makeLoadout('guest-1'));

    expect(host.setReady('guest-peer', true).reason).toBe('unauthorized-slot');
    expect(guest.setReady('guest-peer', true).ok).toBe(true);

    const state = host.getState();
    expect(state?.hostReady).toBe(false);
    expect(state?.guestReady).toBe(true);
  });

  it('rejects ready when the local loadout is invalid', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    host.initializeHost();

    const result = host.setReady('host-peer', true);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid-loadout');
    expect(host.getState()?.hostReady).toBe(false);
  });

  it('writes matchId only when the host launches a ready lobby', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    host.updateLoadout('host', makeLoadout('host-1'));
    guest.updateLoadout('guest', makeLoadout('guest-1'));
    host.setReady('host-peer', true);
    guest.setReady('guest-peer', true);

    const guestLaunch = guest.launch('match-1');
    const hostLaunch = host.launch('match-1');

    expect(guestLaunch.ok).toBe(false);
    expect(guestLaunch.reason).toBe('host-only');
    expect(hostLaunch.ok).toBe(true);
    expect(host.getState()?.matchId).toBe('match-1');
  });

  it('locks loadouts and settings after launch', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();
    host.updateLoadout('host', makeLoadout('host-1'));
    guest.updateLoadout('guest', makeLoadout('guest-1'));
    host.setReady('host-peer', true);
    guest.setReady('guest-peer', true);

    expect(host.launch('match-1').ok).toBe(true);

    expect(host.updateLoadout('host', makeLoadout('host-2')).reason).toBe(
      'match-started',
    );
    expect(
      host.updateMapConfig({
        radius: 12,
        terrainPreset: 'urban',
        turnLimit: 40,
      }).reason,
    ).toBe('match-started');
    expect(guest.setReady('guest-peer', false).reason).toBe('match-started');
    expect(host.getState()?.hostLoadout.units[0]?.unitId).toBe('host-1');
  });

  it('rejects a third peer from the 1v1 lobby', () => {
    const host = createLobbyChannel({ localPeerId: 'host-peer', lobbyMap });
    const guest = createLobbyChannel({ localPeerId: 'guest-peer', lobbyMap });
    const third = createLobbyChannel({ localPeerId: 'third-peer', lobbyMap });
    host.initializeHost();
    guest.joinGuest();

    const result = third.joinGuest();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('lobby-full');
    expect(third.getState()?.guestPeerId).toBe('guest-peer');
  });
});
