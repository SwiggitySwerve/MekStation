/**
 * The co-op host adopts the saved record's new version after it folds a
 * committed co-op update (roadmap unit U35f; owner decision
 * OD-u35d-server-and-host-fix, host half).
 *
 * On a journal-native campaign every committed co-op command rewrites the
 * campaigns row at the next version inside its append's transaction
 * (U35e). The host browser folds the committed frame into its own campaign
 * object but kept the row version it held before the command, so its next
 * whole-envelope save carried a stale compare-and-swap token: the server
 * answered 409 and the persistence store rolled the co-op host back with a
 * "save was refused" toast. These rows drive the real campaign store, the
 * real persistence store and its dirty wiring through the connected
 * surface; only the socket and the network are faked. The network is a
 * campaigns row that answers a GET with its record and a PUT with the
 * compare-and-swap the item route performs; a co-op commit is modelled as
 * U35e's rewrite of that row plus the frame the server broadcasts.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import type {
  CampaignSyncFrameHandler,
  ICampaignSyncTransport,
  IConnectStoredCampaignSyncOptions,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { toast } from '@/components/shared/Toast';
import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { connectStoredCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '@/stores/campaign/campaignPersistenceWiring';
import {
  __resetCampaignPersistenceCoordinationForTests,
  useCampaignPersistenceStore,
} from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';

// Only the connect factory is faked, as in the host-projection suite: the
// frame decoders the surface folds through stay real.
jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => {
  const actual = jest.requireActual(
    '@/lib/campaign/coop/campaignSyncTransport',
  );
  return { ...actual, connectStoredCampaignSyncTransport: jest.fn() };
});

// The host effect opens a real runtime session; these rows are about the
// frame-to-record path, so the session is stubbed.
jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => {
  const actual = jest.requireActual('@/lib/campaign/coop/coopRuntimeSession');
  return {
    ...actual,
    openCoopRuntimeSession: jest.fn().mockResolvedValue(null),
    subscribeCoopPendingProposals: jest.fn(() => () => undefined),
  };
});

// The refused-save toast is the user-visible half of the rollback.
jest.mock('@/components/shared/Toast', () => ({
  ...jest.requireActual('@/components/shared/Toast'),
  toast: jest.fn(),
}));

const connectMock = connectStoredCampaignSyncTransport as unknown as jest.Mock<
  ICampaignSyncTransport | null,
  [IConnectStoredCampaignSyncOptions]
>;
const toastMock = toast as unknown as jest.Mock;

const MATCH_ID = 'match-host-record';
const ROOM_CODE = 'ABC234';
const CAMPAIGN_ID = 'campaign-host-record';
const OTHER_CAMPAIGN_ID = 'campaign-someone-else';
const INSTANCE_ID = 'instance-host-record';
const START_BALANCE = 1_000_000;
const SPENT_BALANCE = 950_000;
const LOADED_VERSION = 4;
const START_DATE = '3025-01-01T00:00:00.000Z';
const NEXT_DAY = '3025-01-02T00:00:00.000Z';

// --- Socket seam ---

/** Emits frames into every handler the surface registered on the fake transport. */
type EmitFrame = (message: IServerMessage) => void;

/**
 * Installs a transport whose frames the test drives by hand and returns the
 * function that delivers a frame to the surface's registered handlers.
 */
function installTransport(role: 'host' | 'guest'): EmitFrame {
  const handlers = new Set<CampaignSyncFrameHandler>();
  const transport: ICampaignSyncTransport = {
    matchId: MATCH_ID,
    playerId: role === 'host' ? 'host-player' : 'guest-player',
    role,
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: jest.fn(),
    sendParticipation: jest.fn(),
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
  connectMock.mockImplementation(() => transport);
  return (message) => {
    handlers.forEach((handler) => handler(message));
  };
}

/**
 * The hydration baseline a (re)connecting surface receives first: a
 * CampaignSnapshotPublished stamped sequence -1 on the CampaignSnapshot
 * kind, as the server's wire mapping sends every snapshot.
 */
function baselineFrame(): IServerMessage {
  return {
    kind: 'CampaignSnapshot',
    matchId: MATCH_ID,
    ts: START_DATE,
    event: {
      sequence: -1,
      campaignId: CAMPAIGN_ID,
      ts: START_DATE,
      authorPlayerId: 'host-player',
      type: 'CampaignSnapshotPublished',
      scope: 'campaign',
      payload: {
        matchId: MATCH_ID,
        revision: 0,
        state: {
          ...createEmptyCampaignState(CAMPAIGN_ID),
          balance: START_BALANCE,
        },
      },
    },
  } as IServerMessage;
}

/** A committed FundsChanged for `campaignId`, the frame an approved co-op spend broadcasts. */
function fundsChangedFrame(
  sequence: number,
  balance: number,
  campaignId: string = CAMPAIGN_ID,
): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: START_DATE,
    event: {
      sequence,
      campaignId,
      ts: START_DATE,
      authorPlayerId: 'host-player',
      type: 'FundsChanged',
      scope: 'campaign',
      payload: { delta: balance - START_BALANCE, reason: 'Ammo', balance },
    },
  } as IServerMessage;
}

/** A committed CampaignDayAdvanced, the frame the host's AdvanceDay intent broadcasts. */
function dayAdvancedFrame(sequence: number, newDay: number): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: START_DATE,
    event: {
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: START_DATE,
      authorPlayerId: 'host-player',
      type: 'CampaignDayAdvanced',
      scope: 'campaign',
      payload: { previousDay: newDay - 1, newDay },
    },
  } as IServerMessage;
}

// --- Network seam: one campaigns row ---

interface ICapturedRequest {
  readonly method: string;
  readonly url: string;
  readonly baseVersion?: number;
  readonly envelope?: SerializedCampaign;
  readonly status: number;
}

interface IFakeCampaignsRow {
  /** The stored record, advanced by accepted PUTs and by `commitCoopCommand`. */
  record: SerializedCampaign;
  readonly requests: ICapturedRequest[];
}

/** A JSON round trip, which is what the record goes through on the network. */
function overTheWire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The host's campaign as its page first held it: a co-op host at day 0. */
function hostCampaign(): ICampaign {
  return {
    ...createCampaign('GM Campaign', 'mercenary', {
      startingFunds: START_BALANCE,
    }),
    id: CAMPAIGN_ID,
    campaignStartDate: new Date(START_DATE),
    currentDate: new Date(START_DATE),
    coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
  };
}

/**
 * Installs fetch as a campaigns row holding `initial`. A GET of the item
 * route answers the stored record; a PUT answers the item route's
 * compare-and-swap: a stale baseVersion is refused 409 with the typed body
 * and the stored record as `current`, a current one is stored at the next
 * version and answered 200. Every request is recorded with its status.
 */
function installCampaignsRow(initial: SerializedCampaign): IFakeCampaignsRow {
  const row: IFakeCampaignsRow = { record: initial, requests: [] };
  const itemUrl = `/api/campaigns/${encodeURIComponent(CAMPAIGN_ID)}`;
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method ?? 'GET').toUpperCase();
      if (url !== itemUrl) {
        row.requests.push({ method, url, status: 404 });
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ error: 'not found' }),
        } as Response);
      }
      if (method === 'GET') {
        row.requests.push({ method, url, status: 200 });
        const body = overTheWire(row.record);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => body,
        } as Response);
      }
      const put = JSON.parse(String(init?.body)) as {
        readonly envelope: SerializedCampaign;
        readonly baseVersion: number;
      };
      if (put.baseVersion !== row.record.version) {
        row.requests.push({
          method,
          url,
          baseVersion: put.baseVersion,
          envelope: put.envelope,
          status: 409,
        });
        const current = overTheWire(row.record);
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            kind: 'conflict',
            reason: 'base-state-unavailable',
            recoveryAction: 'resync-to-active-head',
            conflictingFields: [],
            currentVersion: current.version,
            current,
          }),
        } as Response);
      }
      row.record = {
        ...put.envelope,
        version: row.record.version + 1,
        instanceId: INSTANCE_ID,
        authority: sourceCampaignAuthority(),
      };
      row.requests.push({
        method,
        url,
        baseVersion: put.baseVersion,
        envelope: put.envelope,
        status: 200,
      });
      const saved = overTheWire(row.record);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => saved,
      } as Response);
    });
  return row;
}

/** The record the row holds before any co-op command: the host campaign at LOADED_VERSION. */
function loadedRecord(campaign: ICampaign): SerializedCampaign {
  return overTheWire(
    buildSerializedCampaign(
      campaign,
      'device-host',
      LOADED_VERSION,
      undefined,
      {
        instanceId: INSTANCE_ID,
        authority: sourceCampaignAuthority(),
      },
    ),
  );
}

/**
 * U35e's rewrite of a journal-native campaign's row after a committed
 * command: the stored record at version + 1 with the journal's balance and,
 * when given, its date (campaignRecordJournalState.ts). Nothing else moves.
 */
function commitCoopCommand(
  row: IFakeCampaignsRow,
  journal: { readonly balance: number; readonly currentDate?: string },
): void {
  row.record = {
    ...row.record,
    version: row.record.version + 1,
    body: {
      ...row.record.body,
      currentDate: journal.currentDate ?? row.record.body.currentDate,
      finances: { ...row.record.body.finances, balance: journal.balance },
    },
  };
}

// --- Driving helpers ---

/** Runs pending microtasks and one macrotask inside act, so a queued read settles. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let tick = 0; tick < 20; tick += 1) {
      await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Delivers one frame to the mounted surface and lets whatever it started settle. */
async function deliver(
  emit: EmitFrame,
  message: IServerMessage,
): Promise<void> {
  await act(async () => {
    emit(message);
  });
  await settle();
}

/**
 * Seeds the browser the way the page shell does: the live campaign in the
 * campaign store, then the persistence store's load of the row, which
 * stamps campaignId, baseVersion and the cache key.
 */
async function loadAs(campaign: ICampaign): Promise<void> {
  useCampaignStore().getState().switchCampaign(campaign);
  await act(async () => {
    await useCampaignPersistenceStore.getState().loadCampaign(CAMPAIGN_ID);
  });
  await settle();
}

/** Mounts the connected surface over whatever campaign the campaign store now holds. */
function mountSurface(): void {
  const campaign = useCampaignStore().getState().campaign;
  render(
    <CampaignCoopRouteSurfaceConnected
      campaign={campaign}
      routeId="dashboard"
    />,
  );
}

/** The host's next save through the campaign store, the co-op save path. */
async function hostSaves(): Promise<{ readonly committed: boolean }> {
  let result: { readonly committed: boolean } = { committed: false };
  await act(async () => {
    result = await useCampaignStore().getState().saveCampaign();
  });
  await settle();
  return result;
}

/** A host edit through updateCampaign, which a co-op campaign saves at once. */
async function hostEdits(updates: Partial<ICampaign>): Promise<void> {
  await act(async () => {
    await useCampaignStore().getState().updateCampaign(updates);
  });
  await settle();
}

/** The requests with `method` recorded after the first `from` requests. */
function requestsSince(
  row: IFakeCampaignsRow,
  from: number,
  method: string,
): ICapturedRequest[] {
  return row.requests
    .slice(from)
    .filter((request) => request.method === method);
}

/** The live campaign's balance as a number. */
function liveBalance(): number | undefined {
  return useCampaignStore().getState().campaign?.finances.balance.amount;
}

/** The message of every toast the persistence store raised, in order. */
function toastMessages(): string[] {
  return toastMock.mock.calls.map(
    ([config]) => (config as { readonly message: string }).message,
  );
}

/**
 * Holds every PUT response until `release` is called. The row is still
 * written when the request is made, which models a write the server has
 * committed whose response has not reached the browser yet.
 */
function holdPutResponses(): { readonly release: () => void } {
  const spy = globalThis.fetch as unknown as jest.Mock;
  const inner = spy.getMockImplementation() as (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
  const held: Array<() => void> = [];
  spy.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const answer = inner(input, init);
    if (String(init?.method ?? 'GET').toUpperCase() !== 'PUT') return answer;
    return new Promise<Response>((resolve) => {
      held.push(() => resolve(answer));
    });
  });
  return {
    release: () => {
      spy.mockImplementation(inner);
      held.splice(0).forEach((resolve) => resolve());
    },
  };
}

/**
 * Starts a host rename through updateCampaign (which a co-op campaign saves
 * at once) and, once the PUT is on the wire, hands back the pending edit
 * inside an object (an async function returning the promise itself would
 * wait for it).
 */
async function hostStartsRename(
  name: string,
): Promise<{ readonly done: Promise<void> }> {
  let done: Promise<void> = Promise.resolve();
  await act(async () => {
    done = Promise.resolve(
      useCampaignStore().getState().updateCampaign({ name }),
    );
  });
  await settle();
  return { done };
}

describe('CampaignCoopRouteSurfaceConnected - the host adopts the saved record after a co-op commit', () => {
  beforeEach(() => {
    connectMock.mockReset();
    toastMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    window.sessionStorage.clear();
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'host-player',
      wireToken: 'wire-token',
      displayName: 'GM',
    });
    installCampaignPersistenceWiring();
  });

  afterEach(() => {
    cleanup();
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('(h1) a journal-native host folds an approved co-op spend and its next save carries it at the rewritten version', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());
    const beforeCommit = row.requests.length;

    // The GM approved a guest's spend: the server committed it and, the
    // campaign being journal-native, rewrote the row at the next version.
    commitCoopCommand(row, { balance: SPENT_BALANCE });
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));
    const readsAfterCommit = requestsSince(row, beforeCommit, 'GET').length;
    const baseVersionAfterFold =
      useCampaignPersistenceStore.getState().baseVersion;

    const result = await hostSaves();

    // One object, so a failure shows every consequence of the save at once.
    expect({
      readsAfterCommit,
      baseVersionAfterFold,
      puts: requestsSince(row, beforeCommit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
        balance: put.envelope?.body.finances.balance,
      })),
      committed: result.committed,
      saveState: useCampaignPersistenceStore.getState().saveState,
      rowVersion: row.record.version,
      rowBalance: row.record.body.finances.balance,
      liveBalance: liveBalance(),
      toasts: toastMessages(),
    }).toEqual({
      readsAfterCommit: 1,
      baseVersionAfterFold: LOADED_VERSION + 1,
      puts: [
        {
          status: 200,
          baseVersion: LOADED_VERSION + 1,
          balance: SPENT_BALANCE,
        },
      ],
      committed: true,
      saveState: 'saved',
      rowVersion: LOADED_VERSION + 2,
      rowBalance: SPENT_BALANCE,
      liveBalance: SPENT_BALANCE,
      toasts: [],
    });
  });

  it("(h2) after the host's own day advance commits, its next edit is saved at the rewritten version, not refused and reverted", async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());

    // The day advance saves first (useCampaignStore.dayActions.ts), then
    // sends its AdvanceDay intent; that commit rewrites the row again.
    await hostEdits({ currentDate: new Date(NEXT_DAY) });
    const rowVersionAfterDaySave = row.record.version;
    const beforeCommit = row.requests.length;
    commitCoopCommand(row, { balance: START_BALANCE, currentDate: NEXT_DAY });
    await deliver(emit, dayAdvancedFrame(1, 1));
    const readsAfterCommit = requestsSince(row, beforeCommit, 'GET').length;
    const baseVersionAfterFold =
      useCampaignPersistenceStore.getState().baseVersion;

    await hostEdits({ name: 'Renamed Command' });

    expect({
      rowVersionAfterDaySave,
      readsAfterCommit,
      baseVersionAfterFold,
      puts: requestsSince(row, beforeCommit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
        name: put.envelope?.body.name,
        currentDate: put.envelope?.body.currentDate,
      })),
      liveName: useCampaignStore().getState().campaign?.name,
      saveState: useCampaignPersistenceStore.getState().saveState,
      rowName: row.record.body.name,
      toasts: toastMessages(),
    }).toEqual({
      rowVersionAfterDaySave: LOADED_VERSION + 1,
      readsAfterCommit: 1,
      baseVersionAfterFold: LOADED_VERSION + 2,
      puts: [
        {
          status: 200,
          baseVersion: LOADED_VERSION + 2,
          name: 'Renamed Command',
          currentDate: NEXT_DAY,
        },
      ],
      liveName: 'Renamed Command',
      saveState: 'saved',
      rowName: 'Renamed Command',
      toasts: [],
    });
  });

  it("(g) a guest's fold of a committed frame does not read the record", async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs({
      ...hostCampaign(),
      coopSession: createGuestCoopSession(MATCH_ID, ROOM_CODE),
    });
    expect(useCampaignStore().getState().campaign?.coopSession?.mode).toBe(
      'guest',
    );
    const emit = installTransport('guest');
    mountSurface();
    await settle();
    const beforeFrames = row.requests.length;

    await deliver(emit, baselineFrame());
    commitCoopCommand(row, { balance: SPENT_BALANCE });
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));

    // The guest folded it (its mirror moved) but read nothing.
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(
      SPENT_BALANCE,
    );
    expect(row.requests.slice(beforeFrames)).toHaveLength(0);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      LOADED_VERSION,
    );
  });

  it('(o) a committed frame for another campaign does not read the record', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());
    const beforeFrame = row.requests.length;

    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE, OTHER_CAMPAIGN_ID));

    expect(row.requests.slice(beforeFrame)).toHaveLength(0);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      LOADED_VERSION,
    );
  });

  it('(b) the hydration baseline a (re)connect sends does not read the record', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    const beforeFrame = row.requests.length;

    await deliver(emit, baselineFrame());

    // Folded and projected (the host view holds the baseline balance)...
    expect(liveBalance()).toBe(START_BALANCE);
    // ...but a baseline is not a commit, so nothing was read.
    expect(row.requests.slice(beforeFrame)).toHaveLength(0);
  });

  it('(s) a snapshot-authority campaign, whose row a co-op command does not move, keeps the folded balance and saves it at the version it holds', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());
    const beforeCommit = row.requests.length;

    // Snapshot authority (every co-op campaign while the journal flag is
    // false): the command commits to the journal, the row stays put.
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));
    const readsAfterCommit = requestsSince(row, beforeCommit, 'GET').length;
    const baseVersionAfterFold =
      useCampaignPersistenceStore.getState().baseVersion;
    const liveBalanceAfterFold = liveBalance();

    const result = await hostSaves();

    expect({
      readsAfterCommit,
      baseVersionAfterFold,
      liveBalanceAfterFold,
      puts: requestsSince(row, beforeCommit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
        balance: put.envelope?.body.finances.balance,
      })),
      committed: result.committed,
      toasts: toastMessages(),
    }).toEqual({
      readsAfterCommit: 1,
      baseVersionAfterFold: LOADED_VERSION,
      liveBalanceAfterFold: SPENT_BALANCE,
      puts: [
        { status: 200, baseVersion: LOADED_VERSION, balance: SPENT_BALANCE },
      ],
      committed: true,
      toasts: [],
    });
  });

  it('(p1) snapshot authority: after a co-op 409 rollback, a folded co-op spend survives the refresh and the next save', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());

    // Another writer (a second tab) saved the campaign: the row moved, and
    // the host's next save meets 409 and rolls back to that record.
    row.record = {
      ...row.record,
      version: row.record.version + 1,
      body: { ...row.record.body, name: 'Other Tab' },
    };
    await hostSaves();
    const cachedKeyAfterRollback =
      useCampaignStore().getState().cachedCampaignKey;
    const baseVersionAfterRollback =
      useCampaignPersistenceStore.getState().baseVersion;
    toastMock.mockReset();
    const beforeCommit = row.requests.length;

    // Snapshot authority: the co-op spend commits to the journal only.
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));
    const liveBalanceAfterFrame = liveBalance();
    const result = await hostSaves();

    expect({
      baseVersionAfterRollback,
      cachedKeyAfterRollback,
      readsAfterCommit: requestsSince(row, beforeCommit, 'GET').length,
      liveBalanceAfterFrame,
      puts: requestsSince(row, beforeCommit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
        balance: put.envelope?.body.finances.balance,
      })),
      committed: result.committed,
      storedBalance: row.record.body.finances.balance,
      toasts: toastMessages(),
    }).toEqual({
      baseVersionAfterRollback: LOADED_VERSION + 1,
      cachedKeyAfterRollback: {
        instanceId: INSTANCE_ID,
        revision: LOADED_VERSION + 1,
      },
      readsAfterCommit: 1,
      liveBalanceAfterFrame: SPENT_BALANCE,
      puts: [
        {
          status: 200,
          baseVersion: LOADED_VERSION + 1,
          balance: SPENT_BALANCE,
        },
      ],
      committed: true,
      storedBalance: SPENT_BALANCE,
      toasts: [],
    });
  });

  it('(p2) snapshot authority: a co-op spend folded while the host rename is in flight survives the refresh and the next save', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());
    const beforeEdit = row.requests.length;

    // The rename's PUT is written at the next version; its answer is held.
    const hold = holdPutResponses();
    const rename = await hostStartsRename('Renamed');
    // Snapshot authority: the co-op spend commits to the journal only.
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));
    const liveBalanceWhileSaveInFlight = liveBalance();
    await act(async () => {
      hold.release();
      await rename.done;
    });
    await settle();
    const liveBalanceAfterRelease = liveBalance();
    const result = await hostSaves();

    expect({
      liveBalanceWhileSaveInFlight,
      liveBalanceAfterRelease,
      puts: requestsSince(row, beforeEdit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
        name: put.envelope?.body.name,
        balance: put.envelope?.body.finances.balance,
      })),
      committed: result.committed,
      storedName: row.record.body.name,
      storedBalance: row.record.body.finances.balance,
      toasts: toastMessages(),
    }).toEqual({
      liveBalanceWhileSaveInFlight: SPENT_BALANCE,
      liveBalanceAfterRelease: SPENT_BALANCE,
      puts: [
        {
          status: 200,
          baseVersion: LOADED_VERSION,
          name: 'Renamed',
          balance: START_BALANCE,
        },
        {
          status: 200,
          baseVersion: LOADED_VERSION + 1,
          name: 'Renamed',
          balance: SPENT_BALANCE,
        },
      ],
      committed: true,
      storedName: 'Renamed',
      storedBalance: SPENT_BALANCE,
      toasts: [],
    });
  });

  it('(p3) journal-native: a co-op spend committed while the host rename is in flight leaves the host saving at the rewritten version', async () => {
    const row = installCampaignsRow(loadedRecord(hostCampaign()));
    await loadAs(hostCampaign());
    const emit = installTransport('host');
    mountSurface();
    await settle();
    await deliver(emit, baselineFrame());
    const beforeEdit = row.requests.length;

    // The rename lands first (its answer held); the co-op spend then
    // commits and rewrites the row at the next version.
    const hold = holdPutResponses();
    const rename = await hostStartsRename('Renamed');
    commitCoopCommand(row, { balance: SPENT_BALANCE });
    await deliver(emit, fundsChangedFrame(1, SPENT_BALANCE));
    await act(async () => {
      hold.release();
      await rename.done;
    });
    await settle();
    const baseVersionAfterRelease =
      useCampaignPersistenceStore.getState().baseVersion;
    const result = await hostSaves();

    expect({
      baseVersionAfterRelease,
      puts: requestsSince(row, beforeEdit, 'PUT').map((put) => ({
        status: put.status,
        baseVersion: put.baseVersion,
      })),
      committed: result.committed,
      saveState: useCampaignPersistenceStore.getState().saveState,
      liveName: useCampaignStore().getState().campaign?.name,
      liveBalance: liveBalance(),
      storedName: row.record.body.name,
      storedBalance: row.record.body.finances.balance,
      toasts: toastMessages(),
    }).toEqual({
      baseVersionAfterRelease: LOADED_VERSION + 2,
      puts: [
        { status: 200, baseVersion: LOADED_VERSION },
        { status: 200, baseVersion: LOADED_VERSION + 2 },
      ],
      committed: true,
      saveState: 'saved',
      liveName: 'Renamed',
      liveBalance: SPENT_BALANCE,
      storedName: 'Renamed',
      storedBalance: SPENT_BALANCE,
      toasts: [],
    });
  });
});
