/**
 * Unit tests for the side-ownership UI gate helpers.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 6
 */

import {
  GameSide,
  canLocalPeerControlSide,
  canLocalPeerControlUnit,
  type IGameSession,
  type IGameUnit,
} from '../GameSessionInterfaces';

const HOST_PEER = 'peer-host';
const GUEST_PEER = 'peer-guest';

const HOST_UNIT: IGameUnit = {
  id: 'host-0',
  name: 'Wasp',
  side: GameSide.Player,
  unitRef: 'wsp-1a',
  pilotRef: 'p-host',
  gunnery: 4,
  piloting: 5,
};

const GUEST_UNIT: IGameUnit = {
  id: 'guest-0',
  name: 'Cicada',
  side: GameSide.Opponent,
  unitRef: 'cda-2a',
  pilotRef: 'p-guest',
  gunnery: 4,
  piloting: 5,
};

function makeSessionStub(
  sideOwners: IGameSession['sideOwners'],
): Pick<IGameSession, 'units' | 'sideOwners'> {
  return {
    units: [HOST_UNIT, GUEST_UNIT],
    sideOwners,
  };
}

describe('canLocalPeerControlSide', () => {
  it('local single-player session (no sideOwners) lets local peer control everything', () => {
    expect(canLocalPeerControlSide({}, null, GameSide.Player)).toBe(true);
    expect(canLocalPeerControlSide({}, null, GameSide.Opponent)).toBe(true);
  });

  it('networked session: side is owned only by the matching peer id', () => {
    const session = makeSessionStub({
      [GameSide.Player]: HOST_PEER,
      [GameSide.Opponent]: GUEST_PEER,
    });
    expect(canLocalPeerControlSide(session, HOST_PEER, GameSide.Player)).toBe(
      true,
    );
    expect(canLocalPeerControlSide(session, HOST_PEER, GameSide.Opponent)).toBe(
      false,
    );
    expect(
      canLocalPeerControlSide(session, GUEST_PEER, GameSide.Opponent),
    ).toBe(true);
    expect(canLocalPeerControlSide(session, GUEST_PEER, GameSide.Player)).toBe(
      false,
    );
  });

  it('networked session with no localPeerId fails closed', () => {
    const session = makeSessionStub({
      [GameSide.Player]: HOST_PEER,
      [GameSide.Opponent]: GUEST_PEER,
    });
    expect(canLocalPeerControlSide(session, null, GameSide.Player)).toBe(false);
    expect(canLocalPeerControlSide(session, undefined, GameSide.Player)).toBe(
      false,
    );
  });
});

describe('canLocalPeerControlUnit', () => {
  it("unit-level gate uses the unit's side", () => {
    const session = makeSessionStub({
      [GameSide.Player]: HOST_PEER,
      [GameSide.Opponent]: GUEST_PEER,
    });
    expect(canLocalPeerControlUnit(session, HOST_PEER, 'host-0')).toBe(true);
    expect(canLocalPeerControlUnit(session, HOST_PEER, 'guest-0')).toBe(false);
    expect(canLocalPeerControlUnit(session, GUEST_PEER, 'guest-0')).toBe(true);
    expect(canLocalPeerControlUnit(session, GUEST_PEER, 'host-0')).toBe(false);
  });

  it('unknown unit id fails closed', () => {
    const session = makeSessionStub({
      [GameSide.Player]: HOST_PEER,
      [GameSide.Opponent]: GUEST_PEER,
    });
    expect(canLocalPeerControlUnit(session, HOST_PEER, 'nonexistent')).toBe(
      false,
    );
  });
});
