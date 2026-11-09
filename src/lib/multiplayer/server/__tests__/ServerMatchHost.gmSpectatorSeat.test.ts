/**
 * Fix to #3040's spectator detach: the co-op campaign GM sits in a
 * `kind: 'spectator'` seat (`hostSeatKind: 'spectator'`), and membership is
 * derived from owned seats. Releasing that seat when the GM's last socket
 * drops left the GM unable to rejoin an active match. Only seats a viewer
 * registered through REST spectate are released.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeatsWithSpectatorHost } from '@/types/multiplayer/Lobby';

import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const MATCH_ID = 'match-gm-spectator-seat';
const AT = '2026-11-09T00:00:00.000Z';
const CAMPAIGN_ID = 'camp-gm-seat';

function makeSocket(): IMatchSocket {
  let closed = false;
  return {
    send() {},
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
  } as unknown as IMatchSocket;
}

/** A co-op campaign match: GM in `spectator-1`, two playing seats, optional viewer. */
async function makeCoopMatch(
  status: IMatchMeta['status'],
  options: { readonly viewer?: boolean } = {},
) {
  const store = new InMemoryMatchStore({ quiet: true });
  let seats = defaultSeatsWithSpectatorHost('1v1').map((seat) => {
    if (seat.slotId === 'alpha-1') {
      return { ...seat, occupant: { playerId: 'pid_p1', displayName: 'P1' } };
    }
    if (seat.slotId === 'bravo-1') {
      return { ...seat, occupant: { playerId: 'pid_p2', displayName: 'P2' } };
    }
    if (seat.kind === 'spectator') {
      return { ...seat, occupant: { playerId: 'pid_gm', displayName: 'GM' } };
    }
    return seat;
  });
  if (options.viewer === true) {
    seats = addSpectatorSeat(seats, {
      playerId: 'pid_viewer',
      displayName: 'Viewer',
    });
  }
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'pid_gm',
    playerIds: ['pid_gm', 'pid_p1', 'pid_p2'],
    sideAssignments: [
      { playerId: 'pid_p1', side: 'player' },
      { playerId: 'pid_p2', side: 'opponent' },
    ],
    status,
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats,
    coopCampaign: {
      campaignId: CAMPAIGN_ID,
      state: createEmptyCampaignState(CAMPAIGN_ID),
    },
    ...(status === 'lobby' ? { roomCode: 'GMSEAT' } : {}),
  });
  store.bindCampaignSessionParticipant({
    campaignId: CAMPAIGN_ID,
    sessionId: MATCH_ID,
    participantId: 'pid_gm',
    seat: 'gm',
    boundAt: AT,
  });
  const host = ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, members: new MatchSeatMembershipSource(store) };
}

/** Run the queued drop handlers by sending an intent through the same queue. */
async function drainDrops(host: ServerMatchHost): Promise<void> {
  await host.handleIntent({
    kind: 'Intent',
    matchId: MATCH_ID,
    playerId: 'pid_p1',
    ts: AT,
    intent: { kind: 'SetReady', slotId: 'missing', ready: true },
  });
}

const occupants = async (store: InMemoryMatchStore) =>
  ((await store.getMatchMeta(MATCH_ID)).seats ?? [])
    .filter((seat) => seat.kind === 'spectator')
    .map((seat) => seat.occupant?.playerId)
    .sort();

describe('a co-op GM in the spectator seat survives its last socket detaching', () => {
  it('keeps the seat and membership in an active match', async () => {
    const { host, store, members } = await makeCoopMatch('active');
    const socket = makeSocket();
    expect(await host.admitSocket(socket, 'pid_gm')).not.toBeNull();

    host.detachSocket(socket);
    await drainDrops(host);

    expect(await occupants(store)).toEqual(['pid_gm']);
    expect(await members.lookupMembership('pid_gm', MATCH_ID)).not.toBeNull();
    // ...so the GM can bind again.
    expect(await host.admitSocket(makeSocket(), 'pid_gm')).not.toBeNull();
    await host.closeMatch();
  });

  it('keeps the host a campaign GM: a drop does not migrate host privilege', async () => {
    const { host, store } = await makeCoopMatch('active');
    const socket = makeSocket();
    await host.admitSocket(socket, 'pid_gm');

    host.detachSocket(socket);
    await drainDrops(host);

    expect((await store.getMatchMeta(MATCH_ID)).hostPlayerId).toBe('pid_gm');
    await host.closeMatch();
  });

  it('keeps the seat and membership in a lobby match', async () => {
    const { host, store, members } = await makeCoopMatch('lobby');
    const socket = makeSocket();
    await host.admitSocket(socket, 'pid_gm');

    host.detachSocket(socket);
    await drainDrops(host);

    expect(await occupants(store)).toEqual(['pid_gm']);
    expect(await members.lookupMembership('pid_gm', MATCH_ID)).not.toBeNull();
    await host.closeMatch();
  });

  it('still releases a registered viewer beside the GM', async () => {
    const { host, store } = await makeCoopMatch('active', { viewer: true });
    const gmSocket = makeSocket();
    const viewerSocket = makeSocket();
    await host.admitSocket(gmSocket, 'pid_gm');
    await host.admitSocket(viewerSocket, 'pid_viewer');

    host.detachSocket(viewerSocket);
    await drainDrops(host);
    expect(await occupants(store)).toEqual(['pid_gm']);

    host.detachSocket(gmSocket);
    await drainDrops(host);
    expect(await occupants(store)).toEqual(['pid_gm']);
    await host.closeMatch();
  });
});
