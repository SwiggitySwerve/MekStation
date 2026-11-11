/**
 * K13 PR1: one day advance at a time, an answer deadline on the co-op host
 * intent, and no local advance on a guest mirror.
 *
 * The co-op host's AdvanceDay resolves on the first CampaignDayAdvanced frame
 * of the campaign. Before the lock a second call made while the first was
 * waiting resumed on that same frame, so the day pipeline ran twice from one
 * stale capture over a roster the first run had already patched. The host
 * intent id derives from the campaign's current date, so the host journal
 * replays a duplicate rather than committing two days: the double effect is
 * the client's, and only the client can stop it.
 */

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { getDayPipeline, _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { COOP_ADVANCE_TIMEOUT_MS } from '@/stores/campaign/useCampaignStore.dayActions';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('@/components/shared/Toast') as {
  toast: jest.Mock;
};

const MATCH_ID = 'match-k13-day';
const DAY_MS = 24 * 60 * 60 * 1000;

interface IFakeServer {
  record: SerializedCampaign | null;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** The item route: GET the record, PUT with the version compare-and-swap. */
function stubServer(server: IFakeServer): void {
  global.fetch = jest.fn(
    async (_url: unknown, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body ?? '{}') as {
          envelope: SerializedCampaign;
          baseVersion: number;
        };
        const current = server.record?.version ?? 0;
        if (body.baseVersion !== current) {
          return jsonResponse(409, {
            kind: 'conflict',
            current: server.record,
          });
        }
        server.record = { ...body.envelope, version: current + 1 };
        return jsonResponse(200, server.record);
      }
      return server.record
        ? jsonResponse(200, server.record)
        : jsonResponse(404, {});
    },
  ) as unknown as typeof fetch;
}

interface IControlledHost {
  readonly transport: ICampaignSyncTransport;
  readonly sent: ICampaignIntent[];
  readonly listenerCount: () => number;
  /** Called inside each sendHostIntent, before the host answers. */
  onIntent: (sent: ICampaignIntent) => void;
  /** The host commits the latest intent: rewrite the record, send the event. */
  readonly commit: () => void;
  readonly throwOnSend: (error: Error) => void;
}

/** A host transport that answers only when the test says so. */
function controlledHost(server: IFakeServer): IControlledHost {
  const handlers = new Set<(message: IServerMessage) => void>();
  const sent: ICampaignIntent[] = [];
  let sendError: Error | null = null;
  const host: IControlledHost = {
    sent,
    listenerCount: () => handlers.size,
    onIntent: () => undefined,
    throwOnSend: (error) => {
      sendError = error;
    },
    commit: () => {
      const ts = new Date().toISOString();
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
      const last = sent[sent.length - 1];
      const message = {
        kind: 'CampaignEvent',
        matchId: MATCH_ID,
        ts,
        event: {
          sequence: 3,
          campaignId: last.campaignId,
          ts,
          authorPlayerId: 'host-player',
          type: 'CampaignDayAdvanced',
          scope: 'campaign',
          payload: { newDay: sent.length },
        },
      } as IServerMessage;
      [...handlers].forEach((handler) => handler(message));
    },
    transport: {
      matchId: MATCH_ID,
      playerId: 'host-player',
      role: 'host',
      sendProposal: jest.fn(),
      sendDecision: jest.fn(),
      sendParticipation: jest.fn(),
      sendHostIntent: (intent) => {
        if (sendError) throw sendError;
        sent.push(intent as ICampaignIntent);
        host.onIntent(intent as ICampaignIntent);
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
    },
  };
  return host;
}

function resetWorld(): void {
  uninstallCampaignPersistenceWiring();
  jest.useRealTimers();
  jest.restoreAllMocks();
  resetCampaignStore();
  useCampaignPersistenceStore.getState().reset();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  clientSafeStorage.removeItem('campaign-store');
  toast.mockClear();
}

const toastMessages = (): string[] =>
  toast.mock.calls.map((call) => (call[0] as { message: string }).message);

const dayMs = (): number =>
  getCampaignStore().getState().campaign?.currentDate.getTime() ?? NaN;

/** A saved co-op host campaign with a host that answers only on command. */
async function coopHostCampaign() {
  const store = getCampaignStore();
  store.getState().createCampaign('K13 Day Co.', 'mercenary', undefined, {
    coopSession: createHostCoopSession('ROOM13', MATCH_ID),
  });
  const server: IFakeServer = { record: null };
  stubServer(server);
  installCampaignPersistenceWiring();
  useCampaignPersistenceStore.getState().markDirty();
  await useCampaignPersistenceStore.getState().saveCampaign();
  const host = controlledHost(server);
  registerCampaignSyncTransport(host.transport);
  return { store, server, host };
}

describe('K13 single-flight day advance', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(T1) a second advanceDay while the host is answering returns null and the pipeline runs once', async () => {
    const { store, host } = await coopHostCampaign();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const start = dayMs();

    const first = store.getState().advanceDay();
    const second = store.getState().advanceDay();

    expect(second).toBeNull();
    expect(store.getState().dayAdvanceInFlight).toBe(true);
    expect(host.sent).toHaveLength(1);
    expect(
      toastMessages().filter((m) => /already advancing/i.test(m)),
    ).toHaveLength(1);

    host.commit();
    const report = await first;

    expect(report).not.toBeNull();
    expect(processDay).toHaveBeenCalledTimes(1);
    expect(dayMs()).toBe(start + DAY_MS);
    expect(store.getState().dayAdvanceInFlight).toBe(false);
  });

  it('(T2) the flag clears after success, a refusal, a failed send and a throwing pipeline', async () => {
    const { store, host } = await coopHostCampaign();

    const ok = store.getState().advanceDay();
    host.commit();
    await ok;
    expect(store.getState().dayAdvanceInFlight).toBe(false);

    host.throwOnSend(new Error('socket closed'));
    const failed = await store.getState().advanceDay();
    expect(failed).toBeNull();
    expect(store.getState().dayAdvanceInFlight).toBe(false);

    resetWorld();
    const local = getCampaignStore();
    local.getState().createCampaign('K13 Solo Co.', 'mercenary');
    jest.spyOn(getDayPipeline(), 'processDay').mockImplementation(() => {
      throw new Error('pipeline exploded');
    });
    // A throw in the day is rolled back and reported, not propagated.
    expect(local.getState().advanceDay()).toBeNull();
    expect(local.getState().dayAdvanceInFlight).toBe(false);
  });

  it('(T3) advanceDays holds the lock across every day of the run', async () => {
    const { store, host } = await coopHostCampaign();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const raced: unknown[] = [];
    const flagAtIntent: boolean[] = [];
    host.onIntent = () => {
      flagAtIntent.push(store.getState().dayAdvanceInFlight);
      raced.push(store.getState().advanceDay());
    };

    const run = store.getState().advanceDays(2);
    host.commit();
    // The second day's intent goes out only after the first day's local run.
    await new Promise((resolve) => setTimeout(resolve, 20));
    host.commit();
    const reports = await run;

    expect(reports).toHaveLength(2);
    expect(host.sent).toHaveLength(2);
    expect(flagAtIntent).toEqual([true, true]);
    expect(raced).toEqual([null, null]);
    expect(processDay).toHaveBeenCalledTimes(2);
    expect(store.getState().dayAdvanceInFlight).toBe(false);
  });

  it('(T4) travel shares the lock with day advance', () => {
    const store = getCampaignStore();
    store.getState().createCampaign('K13 Travel Co.', 'mercenary');
    store.setState({ dayAdvanceInFlight: true });
    const before = store.getState().campaign;

    expect(store.getState().travelToSystem('anywhere')).toBe(false);

    expect(store.getState().campaign).toBe(before);
    expect(
      toastMessages().filter((m) => /already advancing/i.test(m)),
    ).toHaveLength(1);
  });
});

describe('K13 host intent deadline', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(T5) an unanswered AdvanceDay times out, drops its listeners, saves nothing and a retry reuses the intent id', async () => {
    const { store, host, server } = await coopHostCampaign();
    const putsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      (call) => call[1]?.method === 'PUT',
    ).length;
    jest.useFakeTimers();

    const pending = store.getState().advanceDay();
    expect(host.listenerCount()).toBeGreaterThan(0);
    await jest.advanceTimersByTimeAsync(COOP_ADVANCE_TIMEOUT_MS);

    expect(await pending).toBeNull();
    expect(host.listenerCount()).toBe(0);
    expect(store.getState().dayAdvanceInFlight).toBe(false);
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(
        (call) => call[1]?.method === 'PUT',
      ),
    ).toHaveLength(putsBefore);
    const expiry = toastMessages().find((m) => /didn't answer/i.test(m));
    expect(expiry).toBeDefined();
    expect(expiry).toMatch(/retry/i);
    expect(expiry).toMatch(/safe/i);

    jest.useRealTimers();
    const retry = store.getState().advanceDay();
    host.commit();
    expect(await retry).not.toBeNull();
    expect(host.sent).toHaveLength(2);
    expect(host.sent[1].intentId).toBe(host.sent[0].intentId);
    expect(server.record?.version).toBeGreaterThan(1);
  });

  it('(T6) an answer that arrives after the deadline is ignored', async () => {
    const { store, host } = await coopHostCampaign();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const start = dayMs();
    jest.useFakeTimers();

    const pending = store.getState().advanceDay();
    await jest.advanceTimersByTimeAsync(COOP_ADVANCE_TIMEOUT_MS);
    expect(await pending).toBeNull();
    host.commit();
    await jest.advanceTimersByTimeAsync(50);

    expect(processDay).not.toHaveBeenCalled();
    expect(dayMs()).toBe(start);
  });

  it('(T7) switching campaigns while the host answers leaves the new campaign alone', async () => {
    const { store, host } = await coopHostCampaign();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const original = store.getState().campaign!;

    const pending = store.getState().advanceDay();
    const other = { ...original, id: 'other-campaign', coopSession: undefined };
    store.getState().switchCampaign(other);
    host.commit();

    expect(await pending).toBeNull();
    expect(store.getState().campaign?.id).toBe('other-campaign');
    expect(store.getState().campaign?.currentDate).toBe(original.currentDate);
    expect(processDay).not.toHaveBeenCalled();
  });

  it('(T7b) switching campaigns while the committed record is being read, and the read failing, leaves the new campaign alone', async () => {
    const { store, host } = await coopHostCampaign();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const original = store.getState().campaign!;
    let releaseRead: () => void = () => undefined;
    let reading = false;
    global.fetch = jest.fn(
      async (_url: unknown, init?: { method?: string }) => {
        if (init?.method !== 'PUT') {
          reading = true;
          await new Promise<void>((resolve) => {
            releaseRead = resolve;
          });
        }
        return jsonResponse(500, {});
      },
    ) as unknown as typeof fetch;

    const pending = store.getState().advanceDay();
    host.commit();
    while (!reading) await new Promise((resolve) => setTimeout(resolve, 0));
    const other = { ...original, id: 'other-campaign', coopSession: undefined };
    store.getState().switchCampaign(other);
    releaseRead();

    expect(await pending).toBeNull();
    expect(store.getState().campaign?.id).toBe('other-campaign');
    expect(processDay).not.toHaveBeenCalled();
  });
});

describe('K13 guest advance', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(T8) a guest mirror refuses to advance, says so and runs nothing', () => {
    const store = getCampaignStore();
    store.getState().createCampaign('K13 Guest Co.', 'mercenary');
    const campaign = store.getState().campaign!;
    store.setState({
      campaign: {
        ...campaign,
        coopSession: createGuestCoopSession(MATCH_ID, 'ROOM13'),
      },
    });
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    const before = store.getState().campaign;

    expect(store.getState().advanceDay()).toBeNull();
    expect(store.getState().advanceDays(3)).toBeNull();

    expect(processDay).not.toHaveBeenCalled();
    expect(store.getState().campaign).toBe(before);
    expect(store.getState().dayAdvanceInFlight).toBe(false);
    expect(toastMessages()).toContain('Only the host can advance the day.');
  });
});
