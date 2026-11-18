/**
 * T6 against the real co-op host: the day is computed before AdvanceDay is
 * sent, the real CampaignHostRegistry / bindCampaignSyncConnection commits it
 * once, and the computed day is saved at the version the host's commit
 * left the record at. No processor runs twice. A resend of the committed
 * intent is replayed by the host from its receipt with no answer frame
 * (B-1), which is why T6 makes no retry promise.
 *
 * The campaign record server is a fetch stub, as in
 * coopMutationPersistence.test.ts. The host here has no SQLite record, so
 * its commit does not rewrite the stub's record (a snapshot-authority row);
 * the journal-native case emulates rewriteCampaignRecordAfterCommand by
 * moving the stub's record when the host's CampaignDayAdvanced goes out.
 */

import { EventEmitter } from 'node:events';

import type { IMatchSocket } from '@/lib/multiplayer/server/ServerMatchSocketTypes';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { _resetCoopRuntimeSessions } from '@/lib/campaign/coop/coopRuntimeSession';
import {
  DayPhase,
  getDayPipeline,
  _resetDayPipeline,
} from '@/lib/campaign/dayPipeline';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from '@/lib/campaign/processors';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

const ROOM_CODE = 'T6REAL';
const MATCH_ID = 'match-t6-real-host';
const HOST_PLAYER_ID = 'host-player';
const GUEST_PLAYER_ID = 'guest-player';
const DAY_MS = 24 * 60 * 60 * 1000;

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

const isDayAdvanced = (message: IServerMessage): boolean =>
  message.kind === 'CampaignEvent' &&
  (message.event as { type?: unknown } | undefined)?.type ===
    'CampaignDayAdvanced';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

interface IRecordServer {
  record: SerializedCampaign;
  readonly putBaseVersions: number[];
}

function installRecordServer(campaign: ICampaign): IRecordServer {
  const server: IRecordServer = {
    record: buildSerializedCampaign(campaign, 'server', 0),
    putBaseVersions: [],
  };
  jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
    const request = init as RequestInit | undefined;
    if ((request?.method ?? 'GET') !== 'PUT') {
      return jsonResponse(200, server.record);
    }
    const body = JSON.parse(String(request?.body)) as {
      readonly envelope: SerializedCampaign;
      readonly baseVersion: number;
    };
    server.putBaseVersions.push(body.baseVersion);
    if (body.baseVersion !== server.record.version) {
      return jsonResponse(409, server.record);
    }
    server.record = { ...body.envelope, version: server.record.version + 1 };
    return jsonResponse(200, server.record);
  });
  return server;
}

function resetWorld(): void {
  jest.restoreAllMocks();
  resetCampaignStore();
  _resetCoopRuntimeSessions();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignMirrorStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
}

describe('T6 compute-first against the real co-op host', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it.each([
    ['snapshot-authority (the record does not move on the commit)', false],
    ['journal-native (the commit rewrites the record at +1, emulated)', true],
  ])(
    '%s: computed before the send, one AdvanceDay committed, saved at the host version, no processor twice',
    async (_name, journalNative) => {
      const store = useCampaignStore();
      store.getState().createCampaign('T6 Real Host', 'mercenary', undefined, {
        coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
      });
      const created = store.getState().campaign!;
      const campaign = {
        ...created,
        currentDate: new Date('3025-07-08T00:00:00.000Z'),
        campaignStartDate: new Date('3025-07-01T00:00:00.000Z'),
      };
      store.setState({ campaign });
      const server = installRecordServer(campaign);
      await useCampaignPersistenceStore.getState().saveCampaign();
      const savedVersion = useCampaignPersistenceStore.getState().baseVersion;
      expect(savedVersion).toBe(1);

      // The day: one processor that counts its runs.
      const trail: string[] = [];
      registerBuiltinProcessors();
      const pipeline = getDayPipeline();
      pipeline.getProcessors().forEach((p) => pipeline.unregister(p.id));
      pipeline.register({
        id: 't6-real-host-day',
        phase: DayPhase.PERSONNEL,
        displayName: 'T6 real host day',
        process(dayCampaign, date) {
          trail.push(`compute ${date.toISOString()}`);
          return { campaign: dayCampaign, events: [] };
        },
      });

      // The real host.
      const registry = new CampaignHostRegistry();
      const entry = await registry.register(MATCH_ID, {
        campaignId: campaign.id,
        hostPlayerId: HOST_PLAYER_ID,
        roomCode: ROOM_CODE,
        state: {
          campaignId: campaign.id,
          day: 7,
          balance: campaign.finances.balance.amount,
          rosterUnits: {},
          pilots: {},
          contracts: {},
          factionStanding: {},
          salvagePool: 0,
        },
      });
      const hostSocket = new MockWireSocket();
      const guestSocket = new MockWireSocket();
      for (const [socket, playerId] of [
        [hostSocket, HOST_PLAYER_ID],
        [guestSocket, GUEST_PLAYER_ID],
      ] as const) {
        await bindCampaignSyncConnection({
          socket,
          registry,
          matchId: MATCH_ID,
          verifiedPlayerId: playerId,
          replicaStore: null,
        });
        socket.inbound({
          kind: 'CampaignJoin',
          matchId: MATCH_ID,
          ts: new Date().toISOString(),
          playerId,
          role: playerId === HOST_PLAYER_ID ? 'host' : 'guest',
          roomCode: ROOM_CODE,
        });
      }
      await flushAsyncHandlers();

      // The host socket's frames reach the transport, as the real transport
      // delivers them. In the journal-native case the record moves when the
      // host's commit goes out, as its SQLite rewrite would.
      const frameHandlers = new Set<(message: IServerMessage) => void>();
      const hostSend = hostSocket.send.bind(hostSocket);
      hostSocket.send = (data: string) => {
        const message = JSON.parse(data) as IServerMessage;
        if (journalNative && isDayAdvanced(message)) {
          server.record = {
            ...server.record,
            version: server.record.version + 1,
            body: {
              ...server.record.body,
              currentDate: new Date(
                Date.parse(server.record.body.currentDate) + DAY_MS,
              ).toISOString(),
            },
          };
        }
        hostSend(data);
        frameHandlers.forEach((handler) => handler(message));
      };
      let lastIntent: Record<string, unknown> | null = null;
      const transport = {
        matchId: MATCH_ID,
        playerId: HOST_PLAYER_ID,
        role: 'host',
        sendProposal: jest.fn(),
        sendDecision: jest.fn(),
        sendParticipation: jest.fn(),
        sendHostIntent: (intent: Record<string, unknown>) => {
          trail.push(`send ${String(intent.kind)}`);
          lastIntent = intent;
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
      const unregister = registerCampaignSyncTransport(transport);
      const hostDayBefore = entry.host.getState().day;

      const report = await Promise.resolve(store.getState().advanceDay());

      expect(report).not.toBeNull();
      // Computed before the send; one AdvanceDay; the processor ran once.
      expect(trail).toEqual([
        `compute ${campaign.currentDate.toISOString()}`,
        'send AdvanceDay',
      ]);
      expect(entry.host.getState().day).toBe(hostDayBefore + 1);
      expect(hostSocket.sent.filter(isDayAdvanced)).toHaveLength(1);
      // Saved at the version the host's commit left the record at.
      const hostVersion = journalNative ? savedVersion + 1 : savedVersion;
      expect(server.putBaseVersions.at(-1)).toBe(hostVersion);
      expect(server.record.version).toBe(hostVersion + 1);
      expect(Date.parse(server.record.body.currentDate)).toBe(
        campaign.currentDate.getTime() + DAY_MS,
      );
      expect(store.getState().campaign!.currentDate.getTime()).toBe(
        campaign.currentDate.getTime() + DAY_MS,
      );

      // B-1: the real host replays a resent committed intent from its
      // receipt and answers nothing; the day is not committed again.
      transport.sendHostIntent(lastIntent as never);
      await flushAsyncHandlers();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(hostSocket.sent.filter(isDayAdvanced)).toHaveLength(1);
      expect(entry.host.getState().day).toBe(hostDayBefore + 1);
      expect(trail.filter((step) => step.startsWith('compute'))).toHaveLength(
        1,
      );

      unregister();
      registry._reset();
    },
  );
});
