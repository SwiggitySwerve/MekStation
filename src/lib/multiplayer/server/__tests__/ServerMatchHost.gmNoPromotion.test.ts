/**
 * ServerMatchHost: a campaign GM socket drop pauses without promoting
 * a tactical player to host.
 */

import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  parsed: IServerMessage;
}

/** Recording socket. WHY: the GM-drop row asserts pause vs HostMigrated. */
function makeSocket(): IMatchSocket & { sent: IRecordedSend[] } {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
  } as IMatchSocket & { sent: IRecordedSend[] };
}

/** Drain the fire-and-forget drop handler (migration then pause). */
async function flushDrop(): Promise<void> {
  for (let i = 0; i < 32; i++) {
    await Promise.resolve();
  }
}

/**
 * Active co-op host whose creating player holds the durable GM seat.
 * WHY: production creation writes that row; this is the drop the defect
 * promoted.
 */
async function makeGmCoopHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-gm-no-promotion';
  const campaignId = 'camp-gm-no-promotion';
  const now = new Date().toISOString();
  const seats = defaultSeats('1v1').map((seat) => {
    if (seat.slotId === 'alpha-1') {
      return {
        ...seat,
        occupant: { playerId: 'pid_host', displayName: 'Host' },
        ready: true,
      };
    }
    if (seat.slotId === 'bravo-1') {
      return {
        ...seat,
        occupant: { playerId: 'pid_opp', displayName: 'Opp' },
        ready: true,
      };
    }
    return seat;
  });
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats,
    coopCampaign: {
      campaignId,
      state: createEmptyCampaignState(campaignId),
    },
  });
  store.bindCampaignSessionParticipant({
    campaignId,
    sessionId: matchId,
    participantId: 'pid_host',
    seat: 'gm',
    boundAt: now,
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

describe('ServerMatchHost campaign GM drop', () => {
  it('pauses the match and does not broadcast HostMigrated when the GM socket drops', async () => {
    const { host, store, matchId } = await makeGmCoopHost();
    const hostSock = makeSocket();
    const oppSock = makeSocket();
    host.attachSocket(hostSock, 'pid_host');
    host.attachSocket(oppSock, 'pid_opp');

    host.detachSocket(hostSock);
    await flushDrop();

    const meta = await store.getMatchMeta(matchId);
    expect(meta.hostPlayerId).toBe('pid_host');
    expect(host.isPausedForReconnect()).toBe(true);
    expect(oppSock.sent.some((row) => row.parsed.kind === 'HostMigrated')).toBe(
      false,
    );
    expect(oppSock.sent.some((row) => row.parsed.kind === 'MatchPaused')).toBe(
      true,
    );
  });
});
