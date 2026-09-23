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
 *
 * Both read that path from the JOURNAL (U21): the candidate is anchored
 * to the journal's event at its base, and after the rewind the next
 * command lands on the candidate itself, where the match store has no
 * branch to answer from.
 */

import type { IMatchStore } from '@/lib/multiplayer/server/IMatchStore';
import type { IMatchJournalEnvelope } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
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
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { matchStreamRef } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import { matchJournalBranchSegmentReader } from '@/lib/multiplayer/server/history/matchJournalBranchSegmentReader';
import { isLivePathBranchId } from '@/lib/multiplayer/server/matchAuthorityBaseline';
import { foldMatchSession } from '@/lib/multiplayer/server/MatchSessionProjector';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { readServerCustomCombatDefinition } from '@/services/units/serverCustomCombatDefinition';
import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import { nowIso } from '@/types/multiplayer/Protocol';

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
  nowIso(): string;
  reseedDice(diceSeed: number): void;
  replaceSession(session: InteractiveSession): void;
  /** After replaceSession only — a failed rebuild must not claim this. */
  setServedBranchId(branchId: string): void;
  resetIntentWindow(events: readonly IGameEvent[]): void;
  resetBroadcastCursor(sequence: number): void;
  discardViewerDeliveries(): void;
  markViewersForResync(playerIds: readonly string[]): void;
  setRewindReplayCeiling(sequence: number): void;
}

const REBUILD_LEASE_OWNER = (): string => `rewind-rebuild:${process.pid}`;

/**
 * Game events on the activated branch path through `throughRevision`,
 * in revision order, read from the journal: the parent prefix the
 * candidate inherited, then the candidate's own events. Each segment is
 * verified by the resolver. Asking the match store's getEvents(0) here
 * would fold the superseded tail.
 */
export async function readActivatedBranchGameEvents(
  matchId: string,
  branchId: string,
  throughRevision: number,
): Promise<readonly IGameEvent[]> {
  const db = getSQLiteService().getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const path = resolveBranchPath(
    branches,
    matchStreamRef(matchId),
    branchId,
    throughRevision,
  );
  const materialized = await materializeBranchPath(
    matchJournalBranchSegmentReader(
      new SQLiteEventJournal<IMatchJournalEnvelope>(db),
    ),
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

/** Boot fold result: the truncated session and the branch it serves. */
export interface IFoldedActivatedRewind {
  readonly session: IGameSession;
  readonly branchId: string;
}

/**
 * Fold the live effective candidate when a rewind has left the live
 * path. Null means "no rewind" — boot keeps the checkpoint door.
 * branchId is the folded head so recovery can mark the host as
 * serving that path (live intents name no branch).
 *
 * THE LIVE-PATH TEST IS THE SET, NOT `root` ALONE. S1's mirror installs
 * a mirrored stream's genesis head on the BASELINE branch (`main`), so
 * a healthy, never-rewound match reaches this function with a non-root
 * head. There is no activated path on a live-path head and no tail to
 * supersede; S4's ordinary recovery path owns those streams. Any other
 * head is folded from the journal through the stream's current head
 * revision, the candidate's own events included.
 */
export async function tryFoldActivatedRewindBranch(
  store: IMatchStore,
  matchId: string,
): Promise<IFoldedActivatedRewind | null> {
  const sqlite = getSQLiteService();
  if (!sqlite.isInitialized()) return null;
  const db = sqlite.getDatabase();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const stream = matchStreamRef(matchId);
  const head = branches.readEffectiveHead(stream);
  if (head === null || isLivePathBranchId(head.branchId)) {
    return null;
  }
  const streamHead = readEffectiveStreamHead(db, branches, stream);
  const events = await readActivatedBranchGameEvents(
    matchId,
    head.branchId,
    streamHead.revision,
  );
  // Move the store tail here, not in commit. 15.2 checkpoint law is
  // unchanged: an old-head checkpoint is already unattested by digest
  // against this activated prefix.
  await supersedeActivatedTail(store, matchId, streamHead.revision);
  return {
    session: foldMatchSession(matchId, events),
    branchId: head.branchId,
  };
}

/**
 * Rebuild a live host on the activated branch: under the rebuild lease,
 * read the path through `effectiveRevision` from the journal, move the
 * store tail past it aside, fold and replace the session, claim the
 * branch, then reseed the dice and reset the intent window, broadcast
 * cursor, replay ceiling and viewer deliveries.
 */
export async function rebuildHostFromActivatedBranch(
  host: IRewindRebuildHost,
  input: IRewindRebuildRequest,
): Promise<void> {
  const held = holdRebuildLease(host.matchId, input);
  try {
    const events = await readActivatedBranchGameEvents(
      host.matchId,
      input.branchId,
      input.effectiveRevision,
    );
    await supersedeActivatedTail(
      host.store,
      host.matchId,
      input.effectiveRevision,
      host.nowIso(),
    );
    const folded = foldMatchSession(host.matchId, events);
    // fromSessionAsync reseeds from config.seed. Stamp the host's
    // journal random seed so the rebuilt stream is the same provenance
    // a fresh host with those seeds would have — never Math.random.
    const seeded: IGameSession = {
      ...folded,
      config: { ...folded.config, seed: host.journalRandomSeed },
    };
    const session = await InteractiveSession.fromSessionAsync(
      seeded,
      readServerCustomCombatDefinition,
    );
    host.replaceSession(session);
    // Claim only after replaceSession returns — a throw above must
    // leave servedBranchId on the previous identity.
    host.setServedBranchId(input.branchId);
    host.reseedDice(host.journalDiceSeed);
    const last = events[events.length - 1];
    host.resetIntentWindow(events);
    // Broadcast cursor and replay ceiling are the rebuilt session's
    // last sequence so drain/assign start after the cut. The engine
    // numbers new events from that in-memory log. supersedeFrom has
    // already moved the store tail, so the next persist reuses the
    // cut sequence. Superseded bytes stay in sibling tables.
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
  at: string = nowIso(),
): Promise<void> {
  if (store.supersedeFrom == null) return;
  await store.supersedeFrom(matchId, throughRevision, at);
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
