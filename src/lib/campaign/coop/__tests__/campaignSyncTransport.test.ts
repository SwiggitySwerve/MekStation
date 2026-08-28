import { credentialProtocols } from '@/lib/multiplayer/socketCredentialProtocol';

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
  readonly offered: (string[] | undefined)[];
  factory: (url: string, protocols?: string[]) => ICampaignSyncWebSocket;
  lastSocket: () => IMockSocket;
} {
  const sockets: IMockSocket[] = [];
  const urls: string[] = [];
  const offered: (string[] | undefined)[] = [];
  return {
    urls,
    offered,
    factory: (url: string, protocols?: string[]) => {
      urls.push(url);
      offered.push(protocols);
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
    // The credential is NOT in the URL - it travels in the subprotocol
    // header, so it never reaches an access or proxy log.
    expect(sockets.urls[0]).not.toContain('token=');
    expect(sockets.urls[0]).not.toContain('wire-token');
    expect(sockets.offered[0]).toEqual(credentialProtocols('wire-token'));
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
        scope: 'campaign',
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

  it('sends host campaign intents over the authenticated campaign channel', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'host',
      playerId: 'pid_host',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    transport.sendHostIntent({
      kind: 'AdvanceDay',
      campaignId: 'campaign-1',
      intentId: 'intent-advance-day',
      payload: { days: 1 },
    });

    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignHostIntent',
      matchId: 'match-1',
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-1',
        intentId: 'intent-advance-day',
        payload: { days: 1 },
      },
    });
  });

  it('acks a resync snapshot with the revision it carries', () => {
    // A large-gap resync delivers a CampaignSnapshotPublished baseline
    // stamped sequence -1 and nothing else. Acking only sequence >= 0
    // frames left the rejoiner permanently behind the gate: the server
    // raised their delivered watermark to the snapshot's revision, but
    // no ack could ever arrive until an UNRELATED live event landed -
    // so AdvanceDay stayed refused with nothing anyone could do. After
    // applying a snapshot the client genuinely holds the state at
    // payload.revision, so acking that revision is honest.
    const sockets = makeSocketFactory();
    connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    sockets.lastSocket().inject({
      kind: 'CampaignEvent',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { matchId: 'match-1', revision: 7 },
      },
    });

    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignAck',
      revision: 7,
    });
  });

  it('acks each applied CampaignEvent with that event sequence', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });
    const applied: number[] = [];
    transport.onFrame((message) => {
      if (message.kind === 'CampaignEvent') {
        applied.push(message.event.sequence);
      }
    });

    sockets.lastSocket().inject({
      kind: 'CampaignEvent',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'FundsChanged',
        sequence: 4,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: {},
      },
    });

    expect(applied).toEqual([4]);
    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignAck',
      matchId: 'match-1',
      playerId: 'pid_guest',
      campaignId: 'campaign-1',
      revision: 4,
    });
  });
});
