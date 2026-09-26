/**
 * The co-op host's day advance on the real campaign and persistence stores
 * (roadmap unit U96, finding FN-u96-coop-host-client-routes-ledger-through-put).
 *
 * fetch is stubbed as a campaign server with one record and the
 * compare-and-swap of the item route; the host transport records what the
 * client sends and answers an AdvanceDay host intent the way the live host
 * does: on commit the record is rewritten at the next version with the
 * advanced date (U35e) and a CampaignEvent CampaignDayAdvanced frame
 * arrives; on refusal an Error frame carrying the intent id arrives.
 *
 * - (R2 commit) AdvanceDay is sent first; the day's save comes after the
 *   commit, at the rewritten version, carrying the day the host committed
 *   (one day on, not two).
 * - (R2 refusal) a refused AdvanceDay saves nothing, leaves the campaign on
 *   its day, returns null and reports the refusal.
 */

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('@/components/shared/Toast') as {
  toast: jest.Mock;
};

const MATCH_ID = 'match-u96-day';
const DAY_MS = 24 * 60 * 60 * 1000;

/** One thing the client did, in the order the server and host saw it. */
interface IStep {
  readonly step: string;
  readonly baseVersion?: number;
  readonly currentDate?: string;
}

/** The stubbed server's record and the ordered client traffic. */
interface IFakeServer {
  record: SerializedCampaign | null;
  readonly timeline: IStep[];
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Stubs fetch as the item route: GET the record, PUT with the version CAS. */
function stubServer(server: IFakeServer): void {
  global.fetch = jest.fn(
    async (_url: unknown, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body ?? '{}') as {
          envelope: SerializedCampaign;
          baseVersion: number;
        };
        server.timeline.push({
          step: 'PUT',
          baseVersion: body.baseVersion,
          currentDate: body.envelope.body.currentDate,
        });
        const current = server.record?.version ?? 0;
        if (body.baseVersion !== current) {
          return jsonResponse(409, {
            kind: 'conflict',
            reason: 'base-state-unavailable',
            recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
            conflictingFields: [],
            currentVersion: current,
            current: server.record,
          });
        }
        server.record = { ...body.envelope, version: current + 1 };
        return jsonResponse(200, server.record);
      }
      server.timeline.push({ step: 'GET' });
      return server.record
        ? jsonResponse(200, server.record)
        : jsonResponse(404, {});
    },
  ) as unknown as typeof fetch;
}

/**
 * A host transport that answers every AdvanceDay host intent after a tick:
 * `commit` rewrites the record one day on at the next version and sends the
 * CampaignDayAdvanced frame; `refuse` sends an Error frame with the intent id.
 */
function hostTransport(
  server: IFakeServer,
  answer: 'commit' | 'refuse',
): ICampaignSyncTransport {
  const handlers = new Set<(message: IServerMessage) => void>();
  const emit = (message: IServerMessage): void =>
    handlers.forEach((handler) => handler(message));
  return {
    matchId: MATCH_ID,
    playerId: 'host-player',
    role: 'host',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendParticipation: jest.fn(),
    sendHostIntent: (intent) => {
      const sent = intent as ICampaignIntent;
      server.timeline.push({ step: `intent:${sent.kind}` });
      setTimeout(() => {
        const ts = new Date().toISOString();
        if (answer === 'refuse') {
          emit({
            kind: 'Error',
            matchId: MATCH_ID,
            ts,
            code: 'CAMPAIGN_NOT_CONVERGED',
            reason: 'progression-blocked-behind',
            intentId: sent.intentId,
          } as IServerMessage);
          return;
        }
        const record = server.record as SerializedCampaign;
        server.record = {
          ...record,
          version: record.version + 1,
          body: {
            ...record.body,
            currentDate: new Date(
              Date.parse(record.body.currentDate) + DAY_MS,
            ).toISOString(),
          },
        };
        emit({
          kind: 'CampaignEvent',
          matchId: MATCH_ID,
          ts,
          event: {
            sequence: 3,
            campaignId: sent.campaignId,
            ts,
            authorPlayerId: 'host-player',
            type: 'CampaignDayAdvanced',
            scope: 'campaign',
            payload: { newDay: 1 },
          },
        } as IServerMessage);
      }, 0);
    },
    onFrame: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    onError: () => () => undefined,
    close: jest.fn(),
    lastSeq: () => -1,
  };
}

function resetWorld(): void {
  resetCampaignStore();
  useCampaignPersistenceStore.getState().reset();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  clientSafeStorage.removeItem('campaign-store');
  jest.clearAllMocks();
}

/**
 * A saved co-op host campaign, a server and a host transport answering
 * `answer`; advances one day and reports what happened after the save.
 */
async function advanceOnce(answer: 'commit' | 'refuse') {
  const store = useCampaignStore();
  store.getState().createCampaign('U96 Day Co.', 'mercenary', undefined, {
    coopSession: createHostCoopSession('ROOM42', MATCH_ID),
  });
  const server: IFakeServer = { record: null, timeline: [] };
  stubServer(server);
  await useCampaignPersistenceStore.getState().saveCampaign();
  registerCampaignSyncTransport(hostTransport(server, answer));
  server.timeline.length = 0;

  const dateBefore = store.getState().campaign?.currentDate.toISOString();
  const report = await store.getState().advanceDay();
  await new Promise((resolve) => setTimeout(resolve, 20));
  return {
    dateBefore,
    dayAfter: dateBefore
      ? new Date(Date.parse(dateBefore) + DAY_MS).toISOString()
      : null,
    reportReturned: report !== null && report !== undefined,
    timeline: server.timeline,
    dateAfter: store.getState().campaign?.currentDate.toISOString(),
    record: {
      version: server.record?.version ?? null,
      currentDate: server.record?.body.currentDate ?? null,
    },
    toasts: toast.mock.calls.map(
      (call) => (call[0] as { message: string }).message,
    ),
  };
}

describe('U96 co-op host day advance: the command first, then the save', () => {
  const measured: Record<string, unknown> = {};
  beforeEach(resetWorld);
  afterEach(resetWorld);
  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log(`U96_R2 ${JSON.stringify(measured)}`);
  });

  it('(R2 commit) sends AdvanceDay first and saves the day after the host committed it, at the rewritten version', async () => {
    const run = await advanceOnce('commit');
    measured.commit = run;

    expect(run.timeline).toEqual([
      { step: 'intent:AdvanceDay' },
      { step: 'GET' },
      { step: 'PUT', baseVersion: 2, currentDate: run.dayAfter },
    ]);
    expect(run.reportReturned).toBe(true);
    expect(run.dateAfter).toBe(run.dayAfter);
    expect(run.record).toEqual({ version: 3, currentDate: run.dayAfter });
  });

  it('(R2 refusal) a refused AdvanceDay saves nothing, keeps the day and reports the refusal', async () => {
    const run = await advanceOnce('refuse');
    measured.refusal = run;

    expect(run.timeline).toEqual([{ step: 'intent:AdvanceDay' }]);
    expect(run.reportReturned).toBe(false);
    expect(run.dateAfter).toBe(run.dateBefore);
    expect(run.record).toEqual({ version: 1, currentDate: run.dateBefore });
    expect(run.toasts).toEqual([
      expect.stringContaining('progression-blocked-behind'),
    ]);
  });
});
