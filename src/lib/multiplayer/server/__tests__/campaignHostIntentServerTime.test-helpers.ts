/**
 * Harness for the U89 timing row (campaignHostIntentServerTime.test.ts;
 * U98 added the grant wake's adapter and sequence-assignment steps):
 * the production-bound sockets, the log seeding, the test-side step
 * wrappers and the per-command drive. Nothing here is product code; the
 * wrappers are installed with jest spies and instance reassignment only.
 */

import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

import type { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignHostRegistryEntry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import type { UnsequencedCampaignEvent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { callId } from '@/__tests__/api/campaigns/campaignJournalEffectsFixture';
import { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import { CampaignEventLog } from '@/lib/campaign/sync/campaignEventLog';
import { createHostCampaignEventJournal } from '@/lib/campaign/sync/hostCampaignEventJournal';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createCampaignSessionMembershipPort } from '@/lib/multiplayer/server/campaignSessionMembershipPort';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { nowIso } from '@/types/multiplayer/Protocol';

export const MATCH_ID = 'match-u89';
export const HOST = 'pid_host';
export const GUEST = 'pid_guest';
export const ROOM = 'ABC234';
/** Discarded first, so JIT warm-up does not land on the short log. */
export const WARM_UP: readonly ('SpendFunds' | 'AdvanceDay')[] = [
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
];
export const MEASURED: readonly ('SpendFunds' | 'AdvanceDay')[] = [
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
  'SpendFunds',
  'AdvanceDay',
];
export const PUTS = 3;

export type Steps = Record<string, number>;

/** The command being measured; wrappers add into its steps. */
let current: { steps: Steps; intentStarted: boolean; lastEnd: number } | null =
  null;
/** `grant` is set only while the grant host-log adapter's readStream runs synchronously. */
const markers = { intent: false, gate: false, adopt: false, grant: false };
let ingests = 0;

/** Adds `ms` to `step` of the command being measured, if any. */
function add(step: string, start: number): void {
  const end = performance.now();
  if (current === null) return;
  current.steps[step] = (current.steps[step] ?? 0) + (end - start);
  current.lastEnd = Math.max(current.lastEnd, end);
}

/** Times `work` under `step` (resolved when it settles). */
async function timed<T>(
  step: () => string,
  work: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  const label = step();
  try {
    return await work();
  } finally {
    add(label, start);
  }
}

/** Runs `work` with `marker` set, timing it under `step`. */
async function marked<T>(
  marker: keyof typeof markers,
  step: string,
  work: () => Promise<T>,
): Promise<T> {
  markers[marker] = true;
  try {
    return await timed(() => step, work);
  } finally {
    markers[marker] = false;
  }
}

/** A socket the binder writes JSON frames to; `sent` holds them with arrival times. */
class RowSocket extends EventEmitter {
  readonly sent: { frame: IServerMessage; at: number }[] = [];
  readyState = 1;
  send(data: string): void {
    this.sent.push({
      frame: JSON.parse(data) as IServerMessage,
      at: performance.now(),
    });
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

/** Resolves once `ready()` holds, or after about 20 s of 2 ms timer turns. */
async function until(ready: () => boolean): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (!ready() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

/** The CampaignEvent sequences `socket` received from index `from` on. */
function eventSequences(
  socket: RowSocket,
  from = 0,
): { sequence: number; at: number }[] {
  return socket.sent.slice(from).flatMap(({ frame, at }) => {
    if (frame.kind !== 'CampaignEvent') return [];
    return [
      {
        sequence: (frame as unknown as { event: ICampaignEvent }).event
          .sequence,
        at,
      },
    ];
  });
}

/** Binds a socket for `playerId` as production does and sends its CampaignJoin. */
export async function joined(
  playerId: string,
  role: 'host' | 'guest',
): Promise<RowSocket> {
  const socket = new RowSocket();
  await bindCampaignSyncConnection({
    socket,
    matchId: MATCH_ID,
    verifiedPlayerId: playerId,
    logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
    membership: createCampaignSessionMembershipPort(),
  });
  socket.inbound({
    kind: 'CampaignJoin',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId,
    role,
    ...(role === 'guest' ? { roomCode: ROOM } : {}),
  });
  await until(() =>
    socket.sent.some(({ frame }) => frame.kind === 'CampaignSnapshot'),
  );
  return socket;
}

/** Grows the campaign log to `size` events through the host's commit path. */
export async function seed(
  entry: ICampaignHostRegistryEntry,
  size: number,
): Promise<void> {
  let next = (await entry.host.getEventLog().getCampaignEvents(0)).length;
  let balance = entry.host.getState().balance;
  while (next < size) {
    const batch: UnsequencedCampaignEvent[] = [];
    for (; next < size && batch.length < 100; next += 1) {
      const delta = next % 2 === 0 ? 1 : -1;
      balance += delta;
      batch.push({
        type: 'FundsChanged',
        campaignId: entry.campaignId,
        authorPlayerId: HOST,
        ts: nowIso(),
        scope: 'campaign',
        payload: { delta, reason: 'u89 seed', balance },
      });
    }
    await entry.host._commitEventsForTests(batch);
  }
}

/** Installs the step wrappers on the prototypes and on this entry's instances. */
export function instrument(entry: ICampaignHostRegistryEntry): void {
  const log = CampaignEventLog.prototype;
  const origRead = log.getCampaignEvents;
  const origNext = log.nextSequence;
  jest.spyOn(log, 'getCampaignEvents').mockImplementation(function (
    this: CampaignEventLog,
    fromSeq = 0,
  ) {
    // A read the grant wake's host-log adapter makes (from any sequence)
    // is grantHostLogRead. Otherwise, before the command's intent: the heal
    // read; inside an adoption: the adoption's own read.
    const label = (): string =>
      markers.grant
        ? 'grantHostLogRead'
        : !current?.intentStarted && !markers.adopt
          ? 'healRead'
          : markers.adopt
            ? 'adoptTail'
            : 'otherRead';
    return timed(label, () => origRead.call(this, fromSeq));
  });
  jest
    .spyOn(log, 'nextSequence')
    .mockImplementation(function (this: CampaignEventLog) {
      const label = (): string =>
        markers.gate
          ? 'gateHighestSequence'
          : markers.intent
            ? 'commitHighestSequence'
            : markers.adopt
              ? 'adoptHighestSequence'
              : 'otherHighestSequence';
      return timed(label, () => origNext.call(this));
    });
  const hostProto = CampaignMatchHost.prototype as unknown as {
    publish: (event: ICampaignEvent) => void;
  };
  const origPublish = hostProto.publish;
  jest.spyOn(hostProto, 'publish').mockImplementation(function (
    this: unknown,
    event: ICampaignEvent,
  ) {
    const start = performance.now();
    origPublish.call(this, event);
    add('publish', start);
  });
  const replica = SQLiteCampaignReplicaStore.prototype;
  const origIngest = replica.ingest;
  jest.spyOn(replica, 'ingest').mockImplementation(function (
    this: SQLiteCampaignReplicaStore,
    ...args
  ) {
    return timed(
      () => 'replicaIngest',
      () => origIngest.apply(this, args),
    ).finally(() => {
      ingests += 1;
    });
  });
  // The grant wake's host-log adapter (its class is module-private, so its
  // prototype is reached through an instance) and the delivery epoch's
  // sequence assignment it runs per wake.
  const adapter = Object.getPrototypeOf(
    createHostCampaignEventJournal('', async () => []),
  ) as ReturnType<typeof createHostCampaignEventJournal>;
  const origReadStream = adapter.readStream;
  jest
    .spyOn(adapter, 'readStream')
    .mockImplementation(function (this: unknown, query) {
      return timed(
        () => 'grantReadStream',
        () => {
          markers.grant = true;
          try {
            return origReadStream.call(this, query);
          } finally {
            markers.grant = false;
          }
        },
      );
    });
  const epochs = SQLiteDeliveryEpochStore.prototype;
  const origAssign = epochs.assignSequences;
  jest.spyOn(epochs, 'assignSequences').mockImplementation(function (
    this: SQLiteDeliveryEpochStore,
    ...args
  ) {
    const start = performance.now();
    try {
      return origAssign.apply(this, args);
    } finally {
      add('grantAssignSequences', start);
    }
  });

  const store = Reflect.get(
    entry.host,
    'eventStore',
  ) as JournalCampaignEventStore;
  const origAppend = store.appendCommandBatch;
  store.appendCommandBatch = (campaignId, input) =>
    timed(
      () => 'appendCommandBatch',
      () => origAppend(campaignId, input),
    );
  const origRewrite = store.rewriteRecordAfterCommand;
  if (origRewrite !== undefined) {
    store.rewriteRecordAfterCommand = (db, campaignId) => {
      const start = performance.now();
      origRewrite(db, campaignId);
      add('recordRewrite', start);
    };
  }
  const session = entry.syncSession;
  const origGate = session.evaluateScenarioLaunch;
  session.evaluateScenarioLaunch = () => marked('gate', 'gate', origGate);
  const host = entry.host;
  const origApply = host.applyHostIntent;
  host.applyHostIntent = (intent) => {
    if (current !== null) current.intentStarted = true;
    return marked('intent', 'applyHostIntent', () => origApply(intent));
  };
  const origAdopt = host.adoptSavedCheckpoint;
  host.adoptSavedCheckpoint = <T>(save: () => Promise<T>): Promise<T> =>
    marked('adopt', 'adoptSavedCheckpoint', () => origAdopt(save));
}

/** Sends one GM command, waits for the guest's frame and the grant wake, then acks. */
export async function command(
  entry: ICampaignHostRegistryEntry,
  gm: RowSocket,
  guest: RowSocket,
  kind: 'SpendFunds' | 'AdvanceDay',
  index: number,
): Promise<Steps> {
  const g0 = guest.sent.length;
  const ingested = ingests;
  current = { steps: {}, intentStarted: false, lastEnd: 0 };
  const t0 = performance.now();
  gm.inbound({
    kind: 'CampaignHostIntent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: HOST,
    intent: {
      kind,
      campaignId: entry.campaignId,
      intentId: `u89-${kind}-${index}`,
      payload:
        kind === 'SpendFunds' ? { amount: 1, reason: 'u89 measured' } : {},
    },
  });
  await until(() => eventSequences(guest, g0).length > 0 && ingests > ingested);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const delivered = eventSequences(guest, g0);
  const refused = gm.sent.some(
    ({ frame, at }) => at >= t0 && frame.kind === 'Error',
  );
  const steps: Steps = {
    ...current.steps,
    appendWithoutRecordRewrite:
      (current.steps.appendCommandBatch ?? Number.NaN) -
      (current.steps.recordRewrite ?? 0),
    deliverToGuest: (delivered[0]?.at ?? Number.NaN) - t0,
    serverTotal: current.lastEnd - t0,
    serverTotalWithoutRecordRewrite:
      current.lastEnd - t0 - (current.steps.recordRewrite ?? 0),
    refused: refused ? 1 : 0,
  };
  current = null;
  const head = delivered.at(-1)?.sequence;
  if (head !== undefined) {
    guest.inbound({
      kind: 'CampaignAck',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: GUEST,
      campaignId: entry.campaignId,
      revision: head,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  return steps;
}

/** A host PUT of the stored record at its own version, adopted by the live host. */
export async function hostPut(campaignId: string): Promise<Steps> {
  const read = readCampaign(campaignId);
  if (read.kind !== 'ok') throw new Error(read.kind);
  const record = read.record;
  current = { steps: {}, intentStarted: false, lastEnd: 0 };
  const t0 = performance.now();
  const put = await callId('PUT', campaignId, {
    envelope: {
      ...record,
      version: record.version + 1,
      body: {
        ...record.body,
        coopSession: { mode: 'host', roomCode: ROOM, matchId: MATCH_ID },
      },
    },
    baseVersion: record.version,
  });
  const steps: Steps = {
    ...current.steps,
    putRoute: performance.now() - t0,
    putStatus: put.status,
  };
  current = null;
  await new Promise((resolve) => setTimeout(resolve, 50));
  return steps;
}

/** Median of the finite values of `step` across `samples`. */
function median(samples: readonly Steps[], step: string): number | null {
  const values = samples
    .map((sample) => sample[step])
    .filter((value): value is number => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2;
}

/** Per-step medians over `samples`. */
export function medians(
  samples: readonly Steps[],
): Record<string, number | null> {
  const steps = new Set(samples.flatMap((sample) => Object.keys(sample)));
  return Object.fromEntries(
    Array.from(steps)
      .sort()
      .map((step) => [step, median(samples, step)]),
  );
}

/** Forgets the command being measured (between rows). */
export function clearMeasurement(): void {
  current = null;
}
