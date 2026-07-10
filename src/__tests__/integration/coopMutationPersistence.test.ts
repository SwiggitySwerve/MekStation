import { EventEmitter } from 'node:events';

import type { IMatchSocket } from '@/lib/multiplayer/server/ServerMatchSocketTypes';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { _resetCoopRuntimeSessions } from '@/lib/campaign/coop/coopRuntimeSession';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

const ROOM_CODE = 'COOP12';
const MATCH_ID = 'match-coop-persistence';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';
const HOST_PLAYER_ID = 'host-player';
const GUEST_PLAYER_ID = 'guest-player';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }

  inbound(message: Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

async function flushAsyncHandlers(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function waitForCampaignDayAdvanced(
  socket: MockWireSocket,
  timeoutMs = 1_000,
): Promise<IServerMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = socket.sent.find(
      (message) =>
        message.kind === 'CampaignEvent' &&
        typeof message.event === 'object' &&
        message.event !== null &&
        (message.event as { type?: unknown }).type === 'CampaignDayAdvanced',
    );
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('guest did not receive CampaignDayAdvanced within 1000ms');
}

interface ServerHarness {
  readonly putBodies: Array<{
    readonly envelope: SerializedCampaign;
    readonly baseVersion: number;
  }>;
  readonly fetchMock: jest.SpyInstance;
  getRecord: () => SerializedCampaign;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installCampaignServer(
  campaign: ICampaign,
  version = 0,
): ServerHarness {
  let serverRecord = buildSerializedCampaign(campaign, 'server', version);
  const putBodies: ServerHarness['putBodies'] = [];
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockImplementation(async (_input, init) => {
      const requestInit = init as RequestInit | undefined;
      if ((requestInit?.method ?? 'GET') !== 'PUT') {
        return jsonResponse(200, serverRecord);
      }
      if (!requestInit?.body) {
        throw new Error('PUT request did not include a body');
      }
      const body = JSON.parse(String(requestInit.body)) as {
        readonly envelope: SerializedCampaign;
        readonly baseVersion: number;
      };
      putBodies.push(body);
      if (body.baseVersion !== serverRecord.version) {
        return jsonResponse(409, serverRecord);
      }
      serverRecord = {
        ...body.envelope,
        version: serverRecord.version + 1,
      };
      return jsonResponse(200, serverRecord);
    });
  return {
    putBodies,
    fetchMock,
    getRecord: () => serverRecord,
  };
}

function seedHostCampaign(name: string): ICampaign {
  const store = useCampaignStore();
  store.getState().createCampaign(name, 'mercenary', undefined, {
    coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
  });
  const campaign = store.getState().campaign;
  if (!campaign) {
    throw new Error('campaign was not created');
  }
  const seeded = {
    ...campaign,
    currentDate: new Date('3025-07-08T00:00:00.000Z'),
    campaignStartDate: new Date('3025-07-01T00:00:00.000Z'),
  };
  store.setState({ campaign: seeded });
  return seeded;
}

async function seedPersistedServer(
  campaign: ICampaign,
): Promise<ServerHarness> {
  const server = installCampaignServer(campaign);
  await useCampaignPersistenceStore.getState().saveCampaign();
  expect(useCampaignPersistenceStore.getState().baseVersion).toBe(1);
  expect(server.putBodies).toHaveLength(1);
  return server;
}

async function fetchServerRecord(
  campaignId: string,
): Promise<SerializedCampaign> {
  const response = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  return (await response.json()) as SerializedCampaign;
}

beforeEach(() => {
  resetCampaignStore();
  _resetCoopRuntimeSessions();
  useCampaignMirrorStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
});

afterEach(() => {
  jest.restoreAllMocks();
  resetCampaignStore();
  _resetCoopRuntimeSessions();
  useCampaignMirrorStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
});

describe('co-op host mutation persistence', () => {
  it('persists host day advance before the action resolves and a guest fetch sees the new date', async () => {
    const initialCampaign = seedHostCampaign('Co-op Day Persistence');
    const server = await seedPersistedServer(initialCampaign);

    const report = await Promise.resolve(
      useCampaignStore().getState().advanceDay(),
    );

    const current = useCampaignStore().getState().campaign;
    expect(report).not.toBeNull();
    expect(current).not.toBeNull();
    expect(server.putBodies).toHaveLength(2);
    expect(server.putBodies[1].baseVersion).toBe(1);
    expect(server.getRecord().body.currentDate).toBe(
      current?.currentDate.toISOString(),
    );

    const fetched = await fetchServerRecord(initialCampaign.id);
    expect(fetched.body.currentDate).toBe(current?.currentDate.toISOString());
  });

  it('persists the GM ledger correction control mutation through the same co-op write path', async () => {
    const initialCampaign = seedHostCampaign('Co-op Ledger Persistence');
    const server = await seedPersistedServer(initialCampaign);
    const before = useCampaignStore().getState().campaign;
    if (!before) {
      throw new Error('campaign missing before ledger correction');
    }
    const amount = new Money(2_500);

    await Promise.resolve(
      useCampaignStore()
        .getState()
        .updateCampaign({
          finances: {
            ...before.finances,
            balance: before.finances.balance.add(amount),
            transactions: [
              ...before.finances.transactions,
              {
                id: 'txn-gm-ledger-correction',
                type: TransactionType.Miscellaneous,
                amount,
                date: new Date('3025-07-08T12:00:00.000Z'),
                description: 'GM ledger correction',
              },
            ],
          },
        }),
    );

    expect(server.putBodies).toHaveLength(2);
    expect(server.putBodies[1].baseVersion).toBe(1);
    expect(server.getRecord().body.finances.balance).toBe(
      before.finances.balance.add(amount).amount,
    );
    expect(
      server
        .getRecord()
        .body.finances.transactions.some(
          (transaction) => transaction.id === 'txn-gm-ledger-correction',
        ),
    ).toBe(true);

    const fetched = await fetchServerRecord(initialCampaign.id);
    expect(fetched.body.finances.balance).toBe(
      before.finances.balance.add(amount).amount,
    );
  });

  it('pushes host day advance through the real server registry to a connected guest', async () => {
    const initialCampaign = seedHostCampaign('Co-op Day Push');
    await seedPersistedServer(initialCampaign);
    const registry = new CampaignHostRegistry();
    const entry = await registry.register(MATCH_ID, {
      campaignId: initialCampaign.id,
      hostPlayerId: HOST_PLAYER_ID,
      roomCode: ROOM_CODE,
      state: {
        campaignId: initialCampaign.id,
        day: 7,
        balance: initialCampaign.finances.balance.amount,
        rosterUnits: {},
        pilots: {},
        contracts: {},
        factionStanding: {},
        salvagePool: 0,
      },
    });
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: HOST_PLAYER_ID,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: GUEST_PLAYER_ID,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: new Date().toISOString(),
      playerId: HOST_PLAYER_ID,
      role: 'host',
      roomCode: ROOM_CODE,
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: new Date().toISOString(),
      playerId: GUEST_PLAYER_ID,
      role: 'guest',
      roomCode: ROOM_CODE,
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    const transport = {
      matchId: MATCH_ID,
      playerId: HOST_PLAYER_ID,
      role: 'host',
      sendProposal: jest.fn(),
      sendDecision: jest.fn(),
      sendParticipation: jest.fn(),
      sendHostIntent: (intent: Record<string, unknown>) => {
        hostSocket.inbound({
          kind: 'CampaignHostIntent',
          matchId: MATCH_ID,
          ts: new Date().toISOString(),
          playerId: HOST_PLAYER_ID,
          intent,
        });
      },
      onFrame: jest.fn(() => () => undefined),
      onError: jest.fn(() => () => undefined),
      close: jest.fn(),
      lastSeq: jest.fn(() => -1),
    } as unknown as ICampaignSyncTransport;
    const unregisterTransport = registerCampaignSyncTransport(transport);
    const beforeLedgerDay = entry.host.getState().day;
    const beforeLocalDate = useCampaignStore().getState().campaign?.currentDate;

    const report = await Promise.resolve(
      useCampaignStore().getState().advanceDay(),
    );
    const pushed = await waitForCampaignDayAdvanced(guestSocket);

    const afterCampaign = useCampaignStore().getState().campaign;
    expect(report).not.toBeNull();
    expect(afterCampaign).not.toBeNull();
    expect(beforeLocalDate?.toISOString()).not.toBe(
      afterCampaign?.currentDate.toISOString(),
    );
    expect(entry.host.getState().day).toBe(beforeLedgerDay + 1);
    expect(pushed).toMatchObject({
      kind: 'CampaignEvent',
      event: {
        type: 'CampaignDayAdvanced',
        payload: { newDay: beforeLedgerDay + 1 },
      },
    });

    unregisterTransport();
    registry._reset();
  });
});
