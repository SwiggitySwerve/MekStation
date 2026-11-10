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
import {
  buildCampaignEditorUnitState,
  extractMechBuildConfigFromUnitState,
} from '@/lib/campaign/customizer/campaignCustomizerSession';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import {
  commitRefitOrder,
  cancelCampaignRefitOrder,
} from '@/stores/campaign/campaignRefitActions';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { RefitClass, type IRefitOrder } from '@/types/campaign/Refit';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { RulesLevel } from '@/types/enums';

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
  function seedRefitCampaign(orders: readonly IRefitOrder[] = []) {
    const base = seedHostCampaign('Refit lifecycle');
    const root = base.forces.get(base.rootForceId)!;
    const campaign = {
      ...base,
      forces: new Map([[root.id, { ...root, unitIds: ['unit-refit'] }]]),
      refitOrders: orders,
    };
    useCampaignStore().setState({ campaign });
    return campaign;
  }

  function refitOrder(
    status: IRefitOrder['status'],
    id = 'existing',
  ): IRefitOrder {
    return {
      id,
      unitId: 'unit-refit',
      status,
      targetConfiguration: DEFAULT_UNIT_CONFIGURATION,
      refitClass: RefitClass.EquipmentSwap,
      estimatedCost: 1000,
      estimatedHours: 16,
      hoursCompleted: 7,
      createdAt: '3025-07-08T00:00:00.000Z',
    };
  }

  const refitParams = {
    unitId: 'unit-refit',
    currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
    targetConfiguration: { ...DEFAULT_UNIT_CONFIGURATION, totalHeatSinks: 12 },
  };

  it.each(['save', 'cancel'] as const)(
    'reopens a pre-context in-progress refit save fixture and can %s the exact order',
    async (action) => {
      // This fixture predates the optional context fields: preserve its saved target.
      const legacyOrder = refitOrder('in-progress', 'legacy-pre-context-refit');
      expect(legacyOrder.targetConfiguration).not.toHaveProperty(
        'configuration',
      );
      expect(legacyOrder.targetConfiguration).not.toHaveProperty(
        'frankenStructure',
      );
      const campaign = seedRefitCampaign([legacyOrder]);
      const wireSave = JSON.parse(
        JSON.stringify(buildSerializedCampaign(campaign, 'legacy-device', 1)),
      ) as SerializedCampaign;
      const reopened = deserializeCampaignBody(wireSave.body);
      const pending = reopened.refitOrders?.[0];
      expect(pending).toEqual(legacyOrder);
      if (!pending) throw new Error('Legacy order was lost on reopen');
      const editor = buildCampaignEditorUnitState({
        editorUnitId: 'legacy-editor',
        unit: {
          unitId: pending.unitId,
          unitName: 'Legacy',
          chassisVariant: 'Test',
          readiness: 'Ready',
        },
        currentConfiguration: pending.targetConfiguration,
        rulesLevel: RulesLevel.STANDARD,
      });
      expect(extractMechBuildConfigFromUnitState(editor)).toEqual({
        ...legacyOrder.targetConfiguration,
        configuration: MechConfiguration.BIPED,
        frankenStructure: undefined,
      });
      useCampaignStore().setState({ campaign: reopened });
      const server = await seedPersistedServer(reopened);
      if (action === 'save') {
        useCampaignPersistenceStore.getState().markDirty();
        expect(
          (await useCampaignPersistenceStore.getState().saveCampaign()).status,
        ).toBe('saved');
      } else {
        expect(
          (await cancelCampaignRefitOrder(reopened.id, pending.id)).applied,
        ).toBe(true);
      }
      const expected = {
        ...legacyOrder,
        status: action === 'save' ? 'in-progress' : 'cancelled',
      };
      expect(server.getRecord().body.refitOrders).toEqual([expected]);
      expect(useCampaignStore().getState().campaign?.refitOrders).toEqual([
        expected,
      ]);
      expect(
        deserializeCampaignBody(server.getRecord().body).refitOrders,
      ).toEqual([expected]);
      expect(
        server.getRecord().body.refitOrders?.[0].targetConfiguration,
      ).not.toHaveProperty('configuration');
      expect(
        server.getRecord().body.refitOrders?.[0].targetConfiguration,
      ).not.toHaveProperty('frankenStructure');
    },
  );

  it.each([MechConfiguration.TRIPOD, MechConfiguration.BIPED])(
    'persists projected %s structure and the real construction admission result',
    async (configuration) => {
      const campaign = seedRefitCampaign();
      const server = await seedPersistedServer(campaign);
      const targetConfiguration = extractMechBuildConfigFromUnitState({
        ...buildCampaignEditorUnitState({
          editorUnitId: 'refit-editor',
          unit: {
            unitId: 'unit-refit',
            unitName: 'Refit',
            chassisVariant: 'Test',
            readiness: 'Ready',
          },
          currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
          rulesLevel: RulesLevel.EXPERIMENTAL,
        }),
        configuration,
        engineRating: 300,
        heatSinkCount: 20,
        frankenStructure:
          configuration === MechConfiguration.BIPED
            ? {
                type: 'STANDARD',
                typeByLocation: { CENTER_TORSO: 'ENDO_STEEL' },
              }
            : undefined,
      });
      const result = await commitRefitOrder({
        ...refitParams,
        targetConfiguration,
      });
      expect(result.applied).toBe(true);
      expect(result.order?.status).toBe(
        configuration === MechConfiguration.TRIPOD ? 'proposed' : 'in-progress',
      );
      const saved = server.getRecord().body.refitOrders?.[0];
      expect(saved?.targetConfiguration).toEqual(targetConfiguration);
      expect(saved?.status).toBe(result.order?.status);
      expect(useCampaignStore().getState().campaign?.refitOrders?.[0]).toEqual(
        saved,
      );
      const reloaded = deserializeCampaignBody(server.getRecord().body);
      expect(reloaded.refitOrders?.[0]).toEqual(saved);
    },
  );

  it.each(['proposed', 'in-progress'] as const)(
    'rejects a second refit beside a %s order before any save',
    async (status) => {
      const campaign = seedRefitCampaign([refitOrder(status)]);
      const server = await seedPersistedServer(campaign);
      const before = useCampaignStore().getState().campaign;
      const dirty = useCampaignPersistenceStore.getState().dirty;
      const result = await commitRefitOrder(refitParams);
      expect(result.applied).toBe(false);
      expect(useCampaignStore().getState().campaign).toBe(before);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(dirty);
      expect(server.putBodies).toHaveLength(1);
    },
  );

  it.each(['completed', 'cancelled'] as const)(
    'admits a new refit beside %s history',
    async (status) => {
      const campaign = seedRefitCampaign([refitOrder(status)]);
      await seedPersistedServer(campaign);
      expect((await commitRefitOrder(refitParams)).applied).toBe(true);
      expect(useCampaignStore().getState().campaign?.refitOrders).toHaveLength(
        2,
      );
    },
  );

  it('cancels an exact legacy order and persists all history without money or parts changes', async () => {
    const first = refitOrder('in-progress', 'first');
    const second = refitOrder('proposed', 'second');
    const campaign = seedRefitCampaign([first, second]);
    const server = await seedPersistedServer(campaign);
    const result = await cancelCampaignRefitOrder(campaign.id, 'second');
    expect(result.applied).toBe(true);
    expect(server.getRecord().body.refitOrders).toEqual([
      first,
      { ...second, status: 'cancelled' },
    ]);
    expect(server.getRecord().body.finances).toEqual(
      server.putBodies[0].envelope.body.finances,
    );
    expect(server.getRecord().body.partsInventory).toEqual(
      server.putBodies[0].envelope.body.partsInventory,
    );
    const after = useCampaignStore().getState().campaign;
    expect(
      (await cancelCampaignRefitOrder(campaign.id, 'second')).applied,
    ).toBe(false);
    expect(
      (await cancelCampaignRefitOrder(campaign.id, 'missing')).applied,
    ).toBe(false);
    expect(
      (await cancelCampaignRefitOrder('other-campaign', 'first')).applied,
    ).toBe(false);
    expect(useCampaignStore().getState().campaign).toBe(after);
    const fetched = await fetchServerRecord(campaign.id);
    const guest = {
      ...deserializeCampaignBody(fetched.body),
      coopSession: { ...campaign.coopSession, mode: 'guest' as const },
    };
    useCampaignStore().setState({ campaign: guest });
    expect(guest.refitOrders).toEqual([
      first,
      { ...second, status: 'cancelled' },
    ]);
    expect((await cancelCampaignRefitOrder(guest.id, 'first')).applied).toBe(
      false,
    );
    expect(useCampaignStore().getState().campaign?.refitOrders).toEqual(
      fetched.body.refitOrders,
    );
  });

  it('refuses guest creation and cancellation before mutating its mirror', async () => {
    const base = seedRefitCampaign([refitOrder('in-progress')]);
    const campaign = {
      ...base,
      coopSession: { ...base.coopSession!, mode: 'guest' as const },
    };
    useCampaignStore().setState({ campaign });
    const dirty = useCampaignPersistenceStore.getState().dirty;
    expect((await commitRefitOrder(refitParams)).applied).toBe(false);
    expect(
      (await cancelCampaignRefitOrder(campaign.id, 'existing')).applied,
    ).toBe(false);
    expect(useCampaignStore().getState().campaign).toBe(campaign);
    expect(useCampaignPersistenceStore.getState().dirty).toBe(dirty);
  });

  it('refuses an unknown unit or stale editor campaign', async () => {
    const campaign = seedRefitCampaign();
    await seedPersistedServer(campaign);
    expect(
      (await commitRefitOrder({ ...refitParams, unitId: 'missing' })).applied,
    ).toBe(false);
    expect(
      (await commitRefitOrder({ ...refitParams, campaignId: 'other-campaign' }))
        .applied,
    ).toBe(false);
    expect(useCampaignStore().getState().campaign?.refitOrders).toEqual([]);
  });

  it('does not acknowledge a refit creation rolled back after a host save failure', async () => {
    const campaign = seedRefitCampaign();
    const server = await seedPersistedServer(campaign);
    server.fetchMock.mockImplementation(async () =>
      jsonResponse(500, { error: 'Offline.' }),
    );
    const result = await commitRefitOrder(refitParams);
    expect(result.applied).toBe(false);
    expect(useCampaignStore().getState().campaign?.refitOrders).toEqual([]);
    expect(server.getRecord().body.refitOrders).toEqual([]);
  });

  it('restores an active order when the host cancellation save fails and allows retry', async () => {
    const campaign = seedRefitCampaign([refitOrder('in-progress')]);
    const server = await seedPersistedServer(campaign);
    const normalFetch = server.fetchMock.getMockImplementation()!;
    server.fetchMock.mockImplementation(async () =>
      jsonResponse(500, { error: 'Offline.' }),
    );
    expect(
      (await cancelCampaignRefitOrder(campaign.id, 'existing')).applied,
    ).toBe(false);
    expect(useCampaignStore().getState().campaign?.refitOrders).toEqual(
      campaign.refitOrders,
    );
    server.fetchMock.mockImplementation(normalFetch);
    expect(
      (await cancelCampaignRefitOrder(campaign.id, 'existing')).applied,
    ).toBe(true);
    expect(server.getRecord().body.refitOrders?.[0].status).toBe('cancelled');
  });

  it('admits one simultaneous commit per unit while allowing another unit', async () => {
    const campaign = seedRefitCampaign();
    const root = campaign.forces.get(campaign.rootForceId)!;
    const local = {
      ...campaign,
      coopSession: undefined,
      forces: new Map([
        [root.id, { ...root, unitIds: ['unit-refit', 'other-unit'] }],
      ]),
    };
    useCampaignStore().setState({ campaign: local });
    const results = await Promise.all([
      commitRefitOrder(refitParams),
      commitRefitOrder(refitParams),
    ]);
    expect(results.filter((result) => result.applied)).toHaveLength(1);
    expect(
      (await commitRefitOrder({ ...refitParams, unitId: 'other-unit' }))
        .applied,
    ).toBe(true);
    expect(useCampaignStore().getState().campaign?.refitOrders).toHaveLength(2);
  });
  it('persists failed acquisition retries and their cooldown through co-op saves and guest hydration', async () => {
    const base = seedHostCampaign('Co-op Acquisition Retry');
    const campaign = {
      ...base,
      options: { ...base.options, useAcquisitionSystem: true },
      shoppingList: {
        items: [
          {
            id: 'coop-retry',
            partId: 'rare',
            partName: 'Rare part',
            availability: AvailabilityRating.X,
            isConsumable: false,
            quantity: 2,
            attempts: 0,
            status: 'pending' as const,
          },
        ],
      },
    };
    useCampaignStore().setState({ campaign });
    await seedPersistedServer(campaign);
    for (let day = 0; day < 8; day += 1) {
      expect(await useCampaignStore().getState().advanceDay()).not.toBeNull();
      const fetched = await fetchServerRecord(campaign.id);
      expect(fetched.body.shoppingList?.items[0]).toMatchObject({
        status: 'pending',
        attempts: day === 7 ? 2 : 1,
      });
      expect(fetched.body.shoppingList).toEqual(
        useCampaignStore().getState().campaign?.shoppingList,
      );
    }
  });

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
    const base = seedHostCampaign('Co-op Day Push');
    const initialCampaign = {
      ...base,
      options: { ...base.options, useAcquisitionSystem: true },
      shoppingList: {
        items: [
          {
            id: 'host-cooldown',
            partId: 'rare',
            partName: 'Rare part',
            availability: AvailabilityRating.X,
            isConsumable: false,
            quantity: 2,
            attempts: 2,
            status: 'pending' as const,
            lastAttemptDate: '3025-07-05T00:00:00.000Z',
          },
        ],
      },
    };
    useCampaignStore().setState({ campaign: initialCampaign });
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
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: GUEST_PLAYER_ID,
      replicaStore: null,
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
    // The host socket's frames reach the transport's frame handlers, as the
    // real transport delivers them: the host day advance waits for the
    // CampaignDayAdvanced frame before it saves (U96).
    const frameHandlers = new Set<(message: IServerMessage) => void>();
    const hostSend = hostSocket.send.bind(hostSocket);
    hostSocket.send = (data: string) => {
      hostSend(data);
      frameHandlers.forEach((handler) => handler(JSON.parse(data)));
    };

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
      onFrame: (handler: (message: IServerMessage) => void) => {
        frameHandlers.add(handler);
        return () => frameHandlers.delete(handler);
      },
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
    expect(afterCampaign?.shoppingList).toEqual(initialCampaign.shoppingList);
    expect(
      (await fetchServerRecord(initialCampaign.id)).body.shoppingList,
    ).toEqual(initialCampaign.shoppingList);
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
