/**
 * Live-session rebuild after a GM rewind COMMIT activates a branch.
 *
 * The commit module activates and freezes `committed`. It must not own
 * the engine. This sibling folds the ACTIVATED path (never the
 * untruncated match-store log), rebuilds InteractiveSession from the
 * host's journal seeds, replaces the live pointer, resets intent and
 * broadcast cursors, discards pre-rewind viewer deliveries, and only
 * then releases the 14.3 correction lease.
 *
 * Boot recovery reuses `tryFoldActivatedRewindBranch` — not
 * recoverActiveMatches / recover() — so an offline match plays from
 * the same truncated path on next start.
 */

import type { IMatchStore } from '@/lib/multiplayer/server/IMatchStore';
import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  materializeBranchPath,
  resolveBranchPath,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { matchStreamRef } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import {
  matchStoreBranchSegmentReader,
  type IMatchEventSource,
} from '@/lib/multiplayer/server/history/matchStoreBranchSegmentReader';
import { foldMatchSession } from '@/lib/multiplayer/server/MatchSessionProjector';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

export interface IRewindRebuildRequest {
  readonly branchId: string;
  readonly effectiveRevision: number;
  readonly effectiveGeneration: number;
}

/**
 * Narrow port so the host stays the engine owner. The sibling never
 * reaches into ServerMatchHost fields.
 */
export interface IRewindRebuildHost {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly journalRandomSeed: number;
  readonly journalDiceSeed: number;
  reseedDice(diceSeed: number): void;
  replaceSession(session: InteractiveSession): void;
  resetIntentWindow(events: readonly IGameEvent[]): void;
  resetBroadcastCursor(sequence: number): void;
  discardViewerDeliveries(): void;
  markViewersForResync(playerIds: readonly string[]): void;
  setRewindReplayCeiling(sequence: number): void;
}

const REBUILD_LEASE_OWNER = (): string => `rewind-rebuild:${process.pid}`;

/**
 * Game events on the activated branch path, in revision order.
 *
 * The match-store reader still materialises root bytes, then the
 * resolver window keeps only the prefix the candidate inherited.
 * Asking getEvents(0) here would fold the superseded tail.
 */
export async function readActivatedBranchGameEvents(
  store: IMatchEventSource,
  matchId: string,
  branchId: string,
  throughRevision: number,
): Promise<readonly IGameEvent[]> {
  const branches = new SQLiteEventHistoryBranchStore(
    getSQLiteService().getDatabase(),
  );
  const path = resolveBranchPath(
    branches,
    matchStreamRef(matchId),
    branchId,
    throughRevision,
  );
  const materialized = await materializeBranchPath(
    matchStoreBranchSegmentReader(store),
    path,
  );
  const events: IGameEvent[] = [];
  for (const event of materialized) {
    if (!isGameEvent(event.payload)) {
      throw new Error(
        `Activated branch event '${event.eventId}' is not an IGameEvent`,
      );
    }
    events.push(event.payload);
  }
  return events;
}

/**
 * Fold the live effective candidate when a rewind has left root.
 * Null means "no rewind" — boot keeps the checkpoint door.
 */
export async function tryFoldActivatedRewindBranch(
  store: IMatchStore,
  matchId: string,
): Promise<IGameSession | null> {
  const sqlite = getSQLiteService();
  if (!sqlite.isInitialized()) return null;
  const db = sqlite.getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const stream = matchStreamRef(matchId);
  const head = branches.readEffectiveHead(stream);
  if (head === null || head.branchId === ROOT_EVENT_BRANCH_ID) {
    return null;
  }
  const streamHead = readEffectiveStreamHead(db, branches, stream);
  const events = await readActivatedBranchGameEvents(
    store,
    matchId,
    head.branchId,
    streamHead.revision,
  );
  // Mark the store tail here, not in commit. 15.2 checkpoint law is
  // unchanged: an old-head checkpoint is already unattested by digest
  // against this activated prefix.
  await supersedeActivatedTail(store, matchId, streamHead.revision);
  return foldMatchSession(matchId, events);
}

export async function rebuildHostFromActivatedBranch(
  host: IRewindRebuildHost,
  input: IRewindRebuildRequest,
): Promise<void> {
  const held = holdRebuildLease(host.matchId, input);
  try {
    const events = await readActivatedBranchGameEvents(
      host.store,
      host.matchId,
      input.branchId,
      input.effectiveRevision,
    );
    await supersedeActivatedTail(
      host.store,
      host.matchId,
      input.effectiveRevision,
    );
    const folded = foldMatchSession(host.matchId, events);
    // fromSessionAsync reseeds from config.seed. Stamp the host's
    // journal random seed so the rebuilt stream is the same provenance
    // a fresh host with those seeds would have — never Math.random.
    const seeded: IGameSession = {
      ...folded,
      config: { ...folded.config, seed: host.journalRandomSeed },
    };
    const session = await InteractiveSession.fromSessionAsync(seeded);
    host.replaceSession(session);
    host.reseedDice(host.journalDiceSeed);
    const last = events[events.length - 1];
    host.resetIntentWindow(events);
    // Broadcast cursor and replay ceiling are the rebuilt session's
    // last sequence so drain/assign start after the cut. The engine
    // numbers new events from that in-memory log. supersedeFrom has
    // already marked the store tail, so the next persist reuses the
    // cut sequence. Rows stay on disk; this is not a journal cutover.
    const headSequence = last === undefined ? -1 : last.sequence;
    host.resetBroadcastCursor(headSequence);
    host.setRewindReplayCeiling(headSequence);
    host.discardViewerDeliveries();
    host.markViewersForResync(await seatedPlayerIds(host.store, host.matchId));
  } finally {
    if (held !== null) {
      releaseHeldLease(host.matchId, held);
    }
  }
}

function holdRebuildLease(
  matchId: string,
  input: IRewindRebuildRequest,
): { readonly leaseId: string; readonly owner: string } | null {
  const sqlite = getSQLiteService();
  if (!sqlite.isInitialized()) return null;
  const db = sqlite.getDatabase();
  const stream = matchStreamRef(matchId);
  const branches = new SQLiteEventHistoryBranchStore(db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches);
  const live = leases.readLiveLease(stream);
  if (live !== null) {
    return { leaseId: live.leaseId, owner: live.owner };
  }
  const streamHead = readEffectiveStreamHead(db, branches, stream);
  try {
    const acquired = leases.acquireCorrectionLease({
      ...stream,
      owner: REBUILD_LEASE_OWNER(),
      actor: 'rewind-rebuild',
      reason: 'live session rebuild after combat rewind',
      ttlMs: 30_000,
      expectedBranchId: input.branchId,
      expectedRevision: input.effectiveRevision,
      expectedDigest: streamHead.digest,
      expectedGeneration: input.effectiveGeneration,
    });
    return { leaseId: acquired.leaseId, owner: acquired.owner };
  } catch {
    // Head moved or another owner holds the stream. Rebuild anyway;
    // the session must not stay on the superseded pointer.
    return null;
  }
}

function releaseHeldLease(
  matchId: string,
  held: { readonly leaseId: string; readonly owner: string },
): void {
  const sqlite = getSQLiteService();
  if (!sqlite.isInitialized()) return;
  const db = sqlite.getDatabase();
  const stream = matchStreamRef(matchId);
  const branches = new SQLiteEventHistoryBranchStore(db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches);
  try {
    leases.releaseCorrectionLease(stream, held);
  } catch {
    // Already released or taken over — the stream is open or fenced
    // by its new owner. The rebuilt session is what matters.
  }
}

/**
 * revision = sequence + 1, so the first discarded store sequence
 * equals the kept through-revision. No-op on a store without the
 * method (dev adapters that have not grown it yet).
 */
async function supersedeActivatedTail(
  store: IMatchStore,
  matchId: string,
  throughRevision: number,
): Promise<void> {
  if (store.supersedeFrom == null) return;
  await store.supersedeFrom(matchId, throughRevision, new Date().toISOString());
}

async function seatedPlayerIds(
  store: IMatchStore,
  matchId: string,
): Promise<readonly string[]> {
  try {
    const meta = await store.getMatchMeta(matchId);
    // Array.from, not spread: this tsconfig target cannot iterate a Set.
    return Array.from(new Set([meta.hostPlayerId, ...meta.playerIds]));
  } catch {
    return [];
  }
}
