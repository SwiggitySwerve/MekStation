import type { ICampaignSyncWebSocket } from '../campaignSyncTransport';

import {
  campaignSnapshotFromMessage,
  connectCampaignSyncTransport,
  _resetCampaignSyncTransportsForTest,
} from '../campaignSyncTransport';

interface IMockSocket extends ICampaignSyncWebSocket {
  readonly sentRaw: string[];
  fireOpen(): void;
  inject(message: unknown): void;
}

function makeSocketFactory(): {
  readonly urls: string[];
  factory: (url: string) => ICampaignSyncWebSocket;
  lastSocket: () => IMockSocket;
} {
  const sockets: IMockSocket[] = [];
  const urls: string[] = [];
  return {
    urls,
    factory: (url: string) => {
      urls.push(url);
      const socket: IMockSocket = {
        readyState: 1,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        sentRaw: [],
        send(data: string) {
          socket.sentRaw.push(data);
        },
        close() {
          socket.readyState = 3;
          socket.onclose?.({});
        },
        fireOpen() {
          socket.onopen?.({});
        },
        inject(message: unknown) {
          socket.onmessage?.({ data: JSON.stringify(message) });
        },
      };
      sockets.push(socket);
      return socket;
    },
    lastSocket: () => sockets[sockets.length - 1],
  };
}

describe('campaignSyncTransport', () => {
  beforeEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  it('opens the campaign channel and sends CampaignJoin', () => {
    const sockets = makeSocketFactory();
    connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      roomCode: 'ABC234',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    expect(sockets.urls[0]).toContain('channel=campaign');
    expect(sockets.urls[0]).toContain('matchId=match-1');
    sockets.lastSocket().fireOpen();

    const join = JSON.parse(sockets.lastSocket().sentRaw[0]) as {
      kind: string;
      matchId: string;
      playerId: string;
      role: string;
      roomCode: string;
      token: string;
    };
    expect(join).toMatchObject({
      kind: 'CampaignJoin',
      matchId: 'match-1',
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
      token: 'wire-token',
    });
  });

  it('accepts the sequence -1 baseline snapshot frame', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });
    const frames: unknown[] = [];
    transport.onFrame((message) => frames.push(message));

    sockets.lastSocket().inject({
      kind: 'CampaignSnapshot',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        payload: {
          state: {
            campaignId: 'campaign-1',
            day: 0,
            balance: 900_000,
            rosterUnits: {},
            pilots: {},
            contracts: {},
            factionStanding: {},
            salvagePool: 0,
          },
        },
      },
    });

    expect(frames).toHaveLength(1);
    const snapshot = campaignSnapshotFromMessage(frames[0] as never);
    expect(snapshot?.sequence).toBe(-1);
    expect(snapshot?.payload.state.balance).toBe(900_000);
  });

  it('sends guest proposals over the campaign frame contract', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    transport.sendProposal({
      proposalId: 'proposal-1',
      campaignId: 'campaign-1',
      proposingPlayerId: 'pid_guest',
      ts: '2026-06-21T00:00:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: 'campaign-1',
        intentId: 'intent-1',
        payload: { amount: 1000, reason: 'Ammo' },
      },
    });

    const proposal = JSON.parse(sockets.lastSocket().sentRaw[0]) as {
      kind: string;
      proposal: { proposalId: string };
    };
    expect(proposal).toMatchObject({
      kind: 'CampaignProposal',
      proposal: { proposalId: 'proposal-1' },
    });
  });
});
