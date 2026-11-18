/**
 * T6 r3: the co-op host computes the day BEFORE it asks the host to commit it.
 *
 * The host path used to send AdvanceDay first and run the day pipeline only
 * after the host committed D+1 and broadcast it. A pipeline that then threw
 * was rolled back locally to D while the host stayed at D+1 having run no
 * processor. Now the day is computed (pipeline run, nothing saved, nothing
 * installed) first; only a computed day is sent, and only a committed one is
 * installed and saved, at the version the host's commit produced.
 *
 * The day is stubbed with processors that write the stores the built-in ones
 * write (the roster, the pilot vault, the battle ledgers), so the
 * expectations pin how many times each write lands.
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';
import type { IPilot } from '@/types/pilot';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  DayPhase,
  getDayPipeline,
  _resetDayPipeline,
  type IDayEvent,
  type IDayProcessor,
} from '@/lib/campaign/dayPipeline';
import {
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from '@/lib/campaign/processors';
import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '@/stores/campaign/campaignPersistenceWiring';
import { installServerCampaign } from '@/stores/campaign/campaignStoreAccessor';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { COOP_ADVANCE_TIMEOUT_MS } from '@/stores/campaign/useCampaignStore.dayActions';
import { usePilotStore } from '@/stores/usePilotStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('@/components/shared/Toast') as {
  toast: jest.Mock;
};

const MATCH_ID = 'match-t6-coop';
const DAY_MS = 24 * 60 * 60 * 1000;
const PILOT_ID = 'p1';
const VAULT_ID = 'v1';

// =============================================================================
// Stub server: the campaign item route (version compare-and-swap) and the
// pilot routes the vault's award PUT and reload use.
// =============================================================================

interface IFakeServer {
  record: SerializedCampaign | null;
  /** 'fail' refuses every campaign PUT. */
  putMode: 'ok' | 'fail';
  /** 'fail' makes every campaign GET reject, as a dropped connection does. */
  getMode: 'ok' | 'fail';
  /** Every request, in order, as `METHOD url`. */
  readonly requests: string[];
  /** The server's pilot rows. */
  readonly pilots: Map<string, IPilot>;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

function stubServer(server: IFakeServer): void {
  global.fetch = jest.fn(
    async (url: unknown, init?: { method?: string; body?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const path = String(url);
      server.requests.push(`${method} ${path}`);
      if (path === '/api/pilots' && method === 'GET') {
        const pilots = [...server.pilots.values()];
        return jsonResponse(200, { pilots, count: pilots.length });
      }
      const pilotMatch = /^\/api\/pilots\/([^/]+)$/.exec(path);
      if (pilotMatch && method === 'PUT') {
        const current = server.pilots.get(pilotMatch[1]);
        if (!current) return jsonResponse(404, { success: false });
        const updates = JSON.parse(init?.body ?? '{}') as Partial<IPilot>;
        server.pilots.set(pilotMatch[1], { ...current, ...updates });
        return jsonResponse(200, { success: true });
      }
      if (method === 'PUT') {
        if (server.putMode === 'fail') {
          return jsonResponse(500, { error: 'refused' });
        }
        const body = JSON.parse(init?.body ?? '{}') as {
          envelope: SerializedCampaign;
          baseVersion: number;
        };
        const current = server.record?.version ?? 0;
        if (body.baseVersion !== current) {
          // The item route's typed conflict body (pages/api/campaigns/[id].ts).
          return jsonResponse(409, {
            kind: 'conflict',
            reason: 'base-state-unavailable',
            recoveryAction: 'resync-to-active-head',
            conflictingFields: [],
            currentVersion: current,
            current: server.record,
          });
        }
        server.record = { ...body.envelope, version: current + 1 };
        return jsonResponse(200, server.record);
      }
      if (server.getMode === 'fail') {
        throw new TypeError('network down');
      }
      return server.record
        ? jsonResponse(200, server.record)
        : jsonResponse(404, {});
    },
  ) as unknown as typeof fetch;
}

const campaignPuts = (server: IFakeServer): string[] =>
  server.requests.filter((r) => r.startsWith('PUT /api/campaigns/'));
const pilotPuts = (server: IFakeServer): string[] =>
  server.requests.filter((r) => r.startsWith('PUT /api/pilots/'));

// =============================================================================
// controlledHost: a host transport that answers only when the test says so
// =============================================================================

interface IControlledHost {
  readonly transport: ICampaignSyncTransport;
  readonly sent: ICampaignIntent[];
  /** Called inside each sendHostIntent, before the host answers. */
  onIntent: (sent: ICampaignIntent) => void;
  /**
   * The host commits the latest AdvanceDay: rewrite the record and send the
   * event. An intent id it already committed is replayed - the event is sent
   * again and the record is not rewritten - as the host journal does.
   */
  readonly commit: () => void;
  /**
   * The host commits the latest AdvanceDay on a snapshot-authority campaign:
   * the event is sent and the record is not rewritten.
   */
  readonly commitWithoutRecordRewrite: () => void;
  /** The transport reports an error (a dropped socket). */
  readonly transportError: (message: string) => void;
  /** The host commits a guest proposal: the record moves a version. */
  readonly commitGuestRename: (name: string) => void;
  readonly refuse: (reason: string) => void;
}

function controlledHost(server: IFakeServer): IControlledHost {
  const handlers = new Set<(message: IServerMessage) => void>();
  const sent: ICampaignIntent[] = [];
  const committedIntentIds = new Set<string>();
  const errorHandlers = new Set<(error: unknown) => void>();
  const emit = (message: IServerMessage): void =>
    [...handlers].forEach((handler) => handler(message));
  const emitDayAdvanced = (): void => {
    const ts = new Date().toISOString();
    emit({
      kind: 'CampaignEvent',
      matchId: MATCH_ID,
      ts,
      event: {
        sequence: 3,
        campaignId: sent[sent.length - 1].campaignId,
        ts,
        authorPlayerId: 'host-player',
        type: 'CampaignDayAdvanced',
        scope: 'campaign',
        payload: { newDay: sent.length },
      },
    } as IServerMessage);
  };
  const host: IControlledHost = {
    sent,
    onIntent: () => undefined,
    commit: () => {
      const ts = new Date().toISOString();
      const advance = [...sent].reverse().find((i) => i.kind === 'AdvanceDay');
      const intentId = advance?.intentId ?? '';
      if (!committedIntentIds.has(intentId)) {
        committedIntentIds.add(intentId);
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
      }
      emit({
        kind: 'CampaignEvent',
        matchId: MATCH_ID,
        ts,
        event: {
          sequence: 3,
          campaignId: sent[sent.length - 1].campaignId,
          ts,
          authorPlayerId: 'host-player',
          type: 'CampaignDayAdvanced',
          scope: 'campaign',
          payload: { newDay: sent.length },
        },
      } as IServerMessage);
    },
    commitWithoutRecordRewrite: () => emitDayAdvanced(),
    transportError: (message) =>
      [...errorHandlers].forEach((handler) => handler(new Error(message))),
    commitGuestRename: (name) => {
      const record = server.record as SerializedCampaign;
      server.record = {
        ...record,
        version: record.version + 1,
        body: { ...record.body, name },
      };
    },
    refuse: (reason) => {
      emit({
        kind: 'Error',
        intentId: sent[sent.length - 1].intentId,
        code: 'refused',
        reason,
      } as unknown as IServerMessage);
    },
    transport: {
      matchId: MATCH_ID,
      playerId: 'host-player',
      role: 'host',
      sendProposal: jest.fn(),
      sendDecision: jest.fn(),
      sendParticipation: jest.fn(),
      sendHostIntent: (intent) => {
        sent.push(intent as ICampaignIntent);
        host.onIntent(intent as ICampaignIntent);
      },
      onFrame: (handler) => {
        handlers.add(handler);
        return () => {
          handlers.delete(handler);
        };
      },
      onError: (handler) => {
        errorHandlers.add(handler);
        return () => {
          errorHandlers.delete(handler);
        };
      },
      close: jest.fn(),
      lastSeq: () => -1,
    },
  };
  return host;
}

// =============================================================================
// The day: processors that write the stores the real ones write
// =============================================================================

const currentPilot = (): ICampaignRosterEntry =>
  useCampaignRosterStore
    .getState()
    .pilots.find((p) => p.pilotId === PILOT_ID) as ICampaignRosterEntry;

const vaultAwards = (): number =>
  (usePilotStore.getState().pilots[0]?.awards ?? []).length;

/** 'never' runs clean; 'once' throws on the next run only; 'always' throws. */
let throwMode: 'never' | 'once' | 'always' = 'never';

const STUB_PROCESSORS: readonly IDayProcessor[] = [
  {
    id: 't6-roster',
    phase: DayPhase.PERSONNEL,
    displayName: 'T6 roster',
    process(campaign) {
      useCampaignRosterStore
        .getState()
        .applyPilotPatches(
          new Map([[PILOT_ID, { xp: currentPilot().xp + 10 }]]),
        );
      return { campaign, events: [] };
    },
  },
  {
    id: 't6-vault',
    phase: DayPhase.PERSONNEL,
    displayName: 'T6 vault',
    process(campaign) {
      usePilotStore.setState((state) => ({
        pilots: state.pilots.map((p) => ({
          ...p,
          awards: [...(p.awards ?? []), { awardId: 'award-1' }],
        })) as typeof state.pilots,
      }));
      return {
        campaign,
        events: [
          {
            type: 'award_granted',
            description: 'award',
            severity: 'info',
            data: { personId: VAULT_ID, awardId: 'award-1' },
          },
        ],
      };
    },
  },
  {
    // Applies every queued outcome, as postBattleProcessor does.
    id: 't6-outcomes',
    phase: DayPhase.MISSIONS - 50,
    displayName: 'T6 outcomes',
    process(campaign) {
      const c = campaign as typeof campaign & {
        pendingBattleOutcomes?: ICombatOutcome[];
        processedBattleIds?: string[];
      };
      const pending = c.pendingBattleOutcomes ?? [];
      if (pending.length === 0) return { campaign, events: [] };
      useCampaignRosterStore.getState().applyPilotPatches(
        new Map([
          [
            PILOT_ID,
            {
              campaignMissions:
                currentPilot().campaignMissions + pending.length,
            },
          ],
        ]),
      );
      const events: IDayEvent[] = pending.map((o) => ({
        type: 'post_battle_applied',
        description: 'applied',
        severity: 'info',
        data: { matchId: o.matchId },
      }));
      return {
        campaign: {
          ...c,
          pendingBattleOutcomes: [],
          processedBattleIds: [
            ...(c.processedBattleIds ?? []),
            ...pending.map((o) => o.matchId),
          ],
        } as typeof campaign,
        events,
      };
    },
  },
  {
    id: 't6-maybe-throws',
    phase: DayPhase.EVENTS,
    displayName: 'T6 maybe throws',
    process(campaign) {
      if (throwMode === 'always') throw new Error('pipeline exploded');
      if (throwMode === 'once') {
        throwMode = 'never';
        throw new Error('pipeline exploded once');
      }
      return { campaign, events: [] };
    },
  },
];

const outcome = (matchId: string): ICombatOutcome => ({
  version: COMBAT_OUTCOME_VERSION,
  matchId,
  contractId: 'contract-t6',
  scenarioId: null,
  endReason: CombatEndReason.Destruction,
  report: {
    version: 1,
    matchId,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 1,
    units: [],
    mvpUnitId: null,
    log: [],
  },
  unitDeltas: [],
  capturedAt: '3025-06-15T12:00:00Z',
});

// =============================================================================
// World
// =============================================================================

function resetWorld(): void {
  uninstallCampaignPersistenceWiring();
  jest.useRealTimers();
  jest.restoreAllMocks();
  resetCampaignStore();
  useCampaignPersistenceStore.getState().reset();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.setState({ campaignId: null, units: [], pilots: [] });
  usePilotStore.setState({ pilots: [], error: null });
  clientSafeStorage.removeItem('campaign-store');
  toast.mockClear();
  throwMode = 'never';
}

const toastMessages = (): string[] =>
  toast.mock.calls.map((call) => (call[0] as { message: string }).message);

/** Let fire-and-forget requests and their reloads settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** A saved, clean co-op host campaign with one pilot and a controlled host. */
async function buildWorld(pending: readonly ICombatOutcome[] = []) {
  const store = getCampaignStore();
  store.getState().createCampaign('T6 Coop Co.', 'mercenary', undefined, {
    coopSession: createHostCoopSession('ROOM-T6', MATCH_ID),
  });
  const id = store.getState().campaign!.id;
  useCampaignRosterStore.getState().initRoster(id);
  useCampaignRosterStore.getState().addPilot({
    pilotId: PILOT_ID,
    pilotName: 'Ace',
    status: 'Active',
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
  } as unknown as ICampaignRosterEntry);
  const vault = { id: VAULT_ID, name: 'Ace', awards: [] } as unknown as IPilot;
  usePilotStore.setState({ pilots: [vault] });
  if (pending.length > 0) {
    store.setState({ pendingBattleOutcomes: [...pending] });
  }
  const server: IFakeServer = {
    record: null,
    putMode: 'ok',
    getMode: 'ok',
    requests: [],
    pilots: new Map([[VAULT_ID, vault]]),
  };
  stubServer(server);
  installCampaignPersistenceWiring();
  useCampaignPersistenceStore.getState().markDirty();
  await useCampaignPersistenceStore.getState().saveCampaign();
  registerBuiltinProcessors();
  const pipeline = getDayPipeline();
  pipeline.getProcessors().forEach((p) => pipeline.unregister(p.id));
  STUB_PROCESSORS.forEach(pipeline.register);
  const host = controlledHost(server);
  registerCampaignSyncTransport(host.transport);
  server.requests.length = 0;
  toast.mockClear();
  const startVersion = server.record!.version;
  const startDate = store.getState().campaign!.currentDate.getTime();
  return { store, server, host, id, startVersion, startDate };
}

const dayMs = (): number =>
  getCampaignStore().getState().campaign?.currentDate.getTime() ?? NaN;
const recordDayMs = (server: IFakeServer): number =>
  Date.parse(server.record!.body.currentDate);

// =============================================================================
// Tests
// =============================================================================

describe('T6 co-op host computes the day before the host commits it', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(C1) a deterministic pipeline throw sends no AdvanceDay: the host stays at D', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld();
    throwMode = 'always';

    const report = await store.getState().advanceDay();

    expect(report).toBeNull();
    expect(host.sent).toEqual([]);
    expect(server.record!.version).toBe(startVersion);
    expect(recordDayMs(server)).toBe(startDate);
    expect(dayMs()).toBe(startDate);
    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);
    expect(campaignPuts(server)).toEqual([]);
    expect(toastMessages().join('\n')).toMatch(/not saved/i);
    expect(toastMessages().join('\n')).toMatch(/t6-maybe-throws/);
  });

  it('(C2) a transient throw, then a retry that the host commits, patches each pilot once', async () => {
    const { store, server, host, startDate } = await buildWorld();
    throwMode = 'once';

    expect(await store.getState().advanceDay()).toBeNull();
    expect(host.sent).toEqual([]);

    host.onIntent = () => host.commit();
    const report = await store.getState().advanceDay();

    expect(report).not.toBeNull();
    expect(host.sent).toHaveLength(1);
    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
  });

  it('(C3, cond 7, cond 8) refused after compute: nothing saved, no award PUT, and a committed retry patches once', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld();
    host.onIntent = () => host.refuse('not now');

    const report = await store.getState().advanceDay();
    await settle();

    expect(report).toBeNull();
    expect(host.sent).toHaveLength(1);
    expect(campaignPuts(server)).toEqual([]);
    expect(pilotPuts(server)).toEqual([]);
    expect(server.record!.version).toBe(startVersion);
    expect(dayMs()).toBe(startDate);
    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);
    expect(toastMessages().join('\n')).toMatch(/refused by the host: not now/);

    host.onIntent = () => host.commit();
    expect(await store.getState().advanceDay()).not.toBeNull();
    await settle();
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(pilotPuts(server)).toEqual([`PUT /api/pilots/${VAULT_ID}`]);
  });

  it('(C4, cond 7, Q2) a timeout after compute, then a retry: works, patches once, applies the queued outcome once', async () => {
    const { store, host, server, startDate } = await buildWorld([
      outcome('m-1'),
    ]);
    jest.useFakeTimers();

    const pending = store.getState().advanceDay();
    await jest.advanceTimersByTimeAsync(COOP_ADVANCE_TIMEOUT_MS);
    expect(await pending).toBeNull();
    jest.useRealTimers();

    expect(campaignPuts(server)).toEqual([]);
    expect(dayMs()).toBe(startDate);
    expect(currentPilot().xp).toBe(0);
    expect(currentPilot().campaignMissions).toBe(0);
    expect(vaultAwards()).toBe(0);
    expect(
      store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['m-1']);
    expect(store.getState().processedBattleIds).toEqual([]);
    expect(toastMessages().join('\n')).toMatch(/didn't answer/i);

    host.onIntent = () => host.commit();
    expect(await store.getState().advanceDay()).not.toBeNull();
    expect(host.sent).toHaveLength(2);
    expect(host.sent[1].intentId).toBe(host.sent[0].intentId);
    expect(currentPilot().xp).toBe(10);
    expect(currentPilot().campaignMissions).toBe(1);
    expect(vaultAwards()).toBe(1);
    expect(store.getState().processedBattleIds).toEqual(['m-1']);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
  });

  it('(C5) committed: the computed day is saved at the version the host commit produced, and the day is not advanced twice', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    host.onIntent = () => host.commit();

    const report = await store.getState().advanceDay();
    await settle();

    expect(report).not.toBeNull();
    expect(processDay).toHaveBeenCalledTimes(1);
    // The host commit took the record to startVersion + 1; the day's save
    // went on top of it, not over it.
    expect(server.record!.version).toBe(startVersion + 2);
    expect(campaignPuts(server)).toHaveLength(1);
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(currentPilot().xp).toBe(10);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      startVersion + 2,
    );
    // The award PUT went out after the day's save.
    expect(pilotPuts(server)).toEqual([`PUT /api/pilots/${VAULT_ID}`]);
    expect(
      server.requests.indexOf(`PUT /api/pilots/${VAULT_ID}`),
    ).toBeGreaterThan(
      server.requests.findIndex((r) => r.startsWith('PUT /api/campaigns/')),
    );
  });

  it('(C6, cond 7) a campaign switch while the host answers rolls the computed day back; a retry patches once', async () => {
    const { store, host, startDate } = await buildWorld();
    const original = store.getState().campaign!;
    // The page installs another campaign's server row (no edit, not dirty).
    host.onIntent = () => {
      installServerCampaign({
        ...original,
        id: 'campaign-elsewhere',
        coopSession: undefined,
      });
      host.commit();
    };

    expect(await store.getState().advanceDay()).toBeNull();

    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);

    installServerCampaign(original);
    // The retry sends the same intent id; the host replays its receipt.
    host.onIntent = () => host.commit();
    expect(await store.getState().advanceDay()).not.toBeNull();
    expect(host.sent).toHaveLength(2);
    expect(host.sent[1].intentId).toBe(host.sent[0].intentId);
    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
  });
});

describe('T6 co-op: save first, then compute (Q1)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(P1) a dirty campaign is saved, computed and committed with no recompute, and the day carries the unsaved roster edit', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    // A roster edit and a campaign edit (which makes the campaign dirty).
    useCampaignRosterStore
      .getState()
      .applyPilotPatches(new Map([[PILOT_ID, { xp: 5 }]]));
    store.setState({
      campaign: { ...store.getState().campaign!, name: 'Edited live' },
    });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    const preCompute = useCampaignRosterStore.getState().pilots;
    let recordRosterAtSend: unknown;
    host.onIntent = () => {
      recordRosterAtSend = server.record!.body.rosterProjection?.pilots.map(
        (p) => ({ pilotId: p.pilotId, xp: p.xp }),
      );
      host.commit();
    };

    const report = await store.getState().advanceDay();

    expect(report).not.toBeNull();
    expect(processDay).toHaveBeenCalledTimes(1);
    // The record the host commits on (and the refresh adopts) is the
    // pre-compute roster, so installing the computed roster over it adds
    // only the day.
    expect(recordRosterAtSend).toEqual(
      preCompute.map((p) => ({ pilotId: p.pilotId, xp: p.xp })),
    );
    // Pre-save, host commit, day save.
    expect(server.record!.version).toBe(startVersion + 3);
    expect(server.record!.body.name).toBe('Edited live');
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(currentPilot().xp).toBe(15);
    expect(
      server.record!.body.rosterProjection?.pilots.find(
        (p) => p.pilotId === PILOT_ID,
      )?.xp,
    ).toBe(15);
  });

  it('(P2) a failed pre-save refuses the day before compute: no AdvanceDay, nothing changed, its own toast', async () => {
    const { store, server, host, startDate } = await buildWorld();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    store.setState({
      campaign: { ...store.getState().campaign!, name: 'Edited live' },
    });
    server.putMode = 'fail';

    const report = await store.getState().advanceDay();

    expect(report).toBeNull();
    expect(processDay).not.toHaveBeenCalled();
    expect(host.sent).toEqual([]);
    expect(dayMs()).toBe(startDate);
    expect(currentPilot().xp).toBe(0);
    const shown = toastMessages().join('\n');
    expect(shown).toMatch(/could not be saved before asking the host/i);
    expect(shown).not.toMatch(/refused by the host/i);
  });
});

describe('T6 co-op: a stale compute is recomputed (cond 9)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(S1) a guest proposal committed between compute and commit forces a recompute, and the saved day includes it', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld();
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    host.onIntent = () => {
      host.commitGuestRename('Renamed by guest');
      host.commit();
    };

    const report = await store.getState().advanceDay();
    await settle();

    expect(report).not.toBeNull();
    expect(processDay).toHaveBeenCalledTimes(2);
    expect(server.record!.version).toBe(startVersion + 3);
    expect(server.record!.body.name).toBe('Renamed by guest');
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(store.getState().campaign!.name).toBe('Renamed by guest');
    expect(dayMs()).toBe(startDate + DAY_MS);
    // The discarded compute's writes were taken back: one patch, one award.
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(pilotPuts(server)).toHaveLength(1);
  });
});

describe('T6 co-op: outcomes that arrive during the host wait (Q2)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(Q2a) an outcome enqueued while the host answers stays pending after install and applies once on the next day', async () => {
    const { store, host, startDate } = await buildWorld([outcome('m-1')]);
    // A co-op host's enqueue also sends its own reconcile intent, which this
    // host leaves uncommitted: only the AdvanceDay commit moves the record.
    host.onIntent = (intent) => {
      if (intent.kind !== 'AdvanceDay') return;
      store.getState().enqueueOutcome(outcome('m-late'));
      host.commit();
    };

    expect(await store.getState().advanceDay()).not.toBeNull();

    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(store.getState().processedBattleIds).toEqual(['m-1']);
    expect(
      store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['m-late']);
    expect(currentPilot().campaignMissions).toBe(1);

    host.onIntent = (intent) => {
      if (intent.kind === 'AdvanceDay') host.commit();
    };
    expect(await store.getState().advanceDay()).not.toBeNull();

    expect(store.getState().processedBattleIds).toEqual(['m-1', 'm-late']);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(currentPilot().campaignMissions).toBe(2);
  });

  it('(Q2b) when the late outcome is itself committed before the day, the day is recomputed and applies it once, dropping nothing', async () => {
    const { store, server, host, startVersion, startDate } = await buildWorld([
      outcome('m-1'),
    ]);
    const processDay = jest.spyOn(getDayPipeline(), 'processDay');
    host.onIntent = (intent) => {
      if (intent.kind !== 'AdvanceDay') {
        // The host commits the outcome's reconcile intent: the record moves.
        const record = server.record as SerializedCampaign;
        server.record = { ...record, version: record.version + 1 };
        return;
      }
      store.getState().enqueueOutcome(outcome('m-late'));
      host.commit();
    };

    expect(await store.getState().advanceDay()).not.toBeNull();

    expect(processDay).toHaveBeenCalledTimes(2);
    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(store.getState().processedBattleIds).toEqual(['m-1', 'm-late']);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(currentPilot().campaignMissions).toBe(2);
    expect(currentPilot().xp).toBe(10);
    expect(server.record!.version).toBe(startVersion + 3);
  });
});

describe('T6 co-op: a retry after the host committed late (r4)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  /** Only AdvanceDay is committed; an outcome's reconcile intent is left pending. */
  const commitAdvanceOnly =
    (host: IControlledHost) =>
    (intent: ICampaignIntent): void => {
      if (intent.kind === 'AdvanceDay') host.commit();
    };

  async function expectDayCompletedOnce(
    world: Awaited<ReturnType<typeof buildWorld>>,
  ): Promise<void> {
    const { store, server, startDate } = world;
    await settle();
    // Saved at D+1 with the day's work, on top of the host's late commit.
    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(server.record!.version).toBe(world.startVersion + 2);
    expect(
      server.record!.body.rosterProjection?.pilots.find(
        (p) => p.pilotId === PILOT_ID,
      )?.xp,
    ).toBe(10);
    // Processors ran once for the day: one pilot patch, one award, one PUT.
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(pilotPuts(server)).toEqual([`PUT /api/pilots/${VAULT_ID}`]);
    // The outcome queued while dirty was applied exactly once, not dropped.
    expect(store.getState().processedBattleIds).toEqual(['m-late']);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(currentPilot().campaignMissions).toBe(1);
    // No "take server": no conflict was raised and nothing was rolled back.
    expect(useCampaignPersistenceStore.getState().saveState).not.toBe(
      'conflict',
    );
    expect(toastMessages().join('\n')).not.toMatch(
      /refused: the campaign changed elsewhere|local change was rolled back/i,
    );
  }

  it('(L1) timeout, the host commits late, an outcome makes the campaign dirty, retry: the day completes once', async () => {
    const world = await buildWorld();
    const { store, host } = world;
    jest.useFakeTimers();
    const first = store.getState().advanceDay();
    await jest.advanceTimersByTimeAsync(COOP_ADVANCE_TIMEOUT_MS);
    expect(await first).toBeNull();
    jest.useRealTimers();

    // The host commits the timed-out intent after all; nobody is listening.
    host.commit();
    host.onIntent = commitAdvanceOnly(host);
    store.getState().enqueueOutcome(outcome('m-late'));
    // An ordinary unsaved edit as well.
    store.setState({
      campaign: { ...store.getState().campaign!, name: 'Edited live' },
    });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    toast.mockClear();

    const report = await store.getState().advanceDay();

    expect(report).not.toBeNull();
    const advances = host.sent.filter((i) => i.kind === 'AdvanceDay');
    expect(advances).toHaveLength(2);
    expect(advances[1].intentId).toBe(advances[0].intentId);
    await expectDayCompletedOnce(world);
    // The dirty edits were saved with the day, not dropped.
    expect(world.server.record!.body.name).toBe('Edited live');
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
  });

  it('(L2) the host commits, the player switches away and back, an outcome makes the campaign dirty, retry: the day completes once', async () => {
    const world = await buildWorld();
    const { store, host } = world;
    const original = store.getState().campaign!;
    host.onIntent = (intent) => {
      if (intent.kind !== 'AdvanceDay') return;
      installServerCampaign({
        ...original,
        id: 'campaign-elsewhere',
        coopSession: undefined,
      });
      host.commit();
    };
    expect(await store.getState().advanceDay()).toBeNull();

    installServerCampaign(original);
    host.onIntent = commitAdvanceOnly(host);
    store.getState().enqueueOutcome(outcome('m-late'));
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    toast.mockClear();

    const report = await store.getState().advanceDay();

    expect(report).not.toBeNull();
    const advances = host.sent.filter((i) => i.kind === 'AdvanceDay');
    expect(advances).toHaveLength(2);
    expect(advances[1].intentId).toBe(advances[0].intentId);
    await expectDayCompletedOnce(world);
  });
});

describe('T6 co-op: residuals pinned (r4)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(R-RECOMPUTE-THROW) residual: a throw in the recompute after a stale-version commit leaves the host at D+1', async () => {
    const { store, server, host, startDate } = await buildWorld();
    host.onIntent = () => {
      host.commitGuestRename('Renamed by guest');
      host.commit();
      // The first compute ran clean; the recompute after the commit throws.
      throwMode = 'always';
    };

    const report = await store.getState().advanceDay();

    expect(report).toBeNull();
    // The host committed D+1 and no processor result was saved with it.
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(
      server.record!.body.rosterProjection?.pilots.find(
        (p) => p.pilotId === PILOT_ID,
      )?.xp,
    ).toBe(0);
    // Locally the failed recompute was rolled back: no patch, no award.
    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);
    expect(toastMessages().join('\n')).toMatch(/not saved/i);
  });
});

describe('T6 co-op: re-review findings (r5)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  const commitAdvanceOnly =
    (host: IControlledHost) =>
    (intent: ICampaignIntent): void => {
      if (intent.kind === 'AdvanceDay') host.commit();
    };

  it('(F1a) snapshot-authority: the host commits, the save fails, and a retry patches each pilot once', async () => {
    const { store, server, host, startDate } = await buildWorld();
    host.onIntent = (intent) => {
      if (intent.kind !== 'AdvanceDay') return;
      // The row does not move on a snapshot-authority commit.
      host.commitWithoutRecordRewrite();
      server.putMode = 'fail';
    };

    expect(await store.getState().advanceDay()).toBeNull();
    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);

    server.putMode = 'ok';
    host.onIntent = (intent) => {
      if (intent.kind === 'AdvanceDay') host.commitWithoutRecordRewrite();
    };
    expect(await store.getState().advanceDay()).not.toBeNull();
    await settle();

    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(pilotPuts(server)).toEqual([`PUT /api/pilots/${VAULT_ID}`]);
  });

  it('(F1b, F2) journal-native: the refresh after the commit fails, nothing is saved, the intent stays unsettled, and a dirty retry finishes day D once', async () => {
    const world = await buildWorld();
    const { store, server, host, startDate, startVersion } = world;
    host.onIntent = (intent) => {
      if (intent.kind !== 'AdvanceDay') return;
      host.commit();
      server.getMode = 'fail';
    };

    expect(await store.getState().advanceDay()).toBeNull();
    expect(campaignPuts(server)).toEqual([]);
    expect(dayMs()).toBe(startDate);
    expect(currentPilot().xp).toBe(0);
    expect(vaultAwards()).toBe(0);
    expect(toastMessages().join('\n')).toMatch(
      /could not be confirmed with the host/i,
    );

    // The retry is dirty: only a kept intent skips the pre-save, which the
    // row the host moved would refuse.
    server.getMode = 'ok';
    host.onIntent = commitAdvanceOnly(host);
    store.getState().enqueueOutcome(outcome('m-late'));
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    toast.mockClear();

    expect(await store.getState().advanceDay()).not.toBeNull();
    await settle();

    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(recordDayMs(server)).toBe(startDate + DAY_MS);
    expect(server.record!.version).toBe(startVersion + 2);
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(store.getState().processedBattleIds).toEqual(['m-late']);
    expect(useCampaignPersistenceStore.getState().saveState).not.toBe(
      'conflict',
    );
    expect(toastMessages().join('\n')).not.toMatch(/rolled back/i);
  });

  it('(F4) a transport error after a late commit keeps the intent unsettled: a dirty retry finishes the day once, with no conflict', async () => {
    const world = await buildWorld();
    const { store, server, host, startDate, startVersion } = world;
    jest.useFakeTimers();
    const first = store.getState().advanceDay();
    await jest.advanceTimersByTimeAsync(COOP_ADVANCE_TIMEOUT_MS);
    expect(await first).toBeNull();
    jest.useRealTimers();
    host.commit();

    // The next retry hits a dropped socket.
    host.onIntent = (intent) => {
      if (intent.kind === 'AdvanceDay') host.transportError('socket closed');
    };
    expect(await store.getState().advanceDay()).toBeNull();
    expect(currentPilot().xp).toBe(0);

    host.onIntent = commitAdvanceOnly(host);
    store.getState().enqueueOutcome(outcome('m-late'));
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    toast.mockClear();

    expect(await store.getState().advanceDay()).not.toBeNull();
    await settle();

    expect(dayMs()).toBe(startDate + DAY_MS);
    expect(server.record!.version).toBe(startVersion + 2);
    expect(currentPilot().xp).toBe(10);
    expect(vaultAwards()).toBe(1);
    expect(store.getState().processedBattleIds).toEqual(['m-late']);
    expect(useCampaignPersistenceStore.getState().saveState).not.toBe(
      'conflict',
    );
    expect(toastMessages().join('\n')).not.toMatch(/rolled back/i);
  });

  // F3 (C4 OPEN, pre-existing, not T6): in the app the host route surface
  // (CampaignCoopRouteSurfaceConnected, useCampaignApplicationConsumer)
  // folds a late CampaignDayAdvanced into the live campaign before the
  // retry, so the retry's intent id names D+1, the unsettled-intent record
  // never matches, and day D's processors never run.
  it.skip('(F3, C4 OPEN) a late commit folded by the host route surface before the retry still loses day D', () => {
    // Needs the route-surface consumer mounted on the host; owned by C4.
  });
});
