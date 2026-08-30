/**
 * The commit / publish passes of a match command.
 *
 * Split out of `ServerMatchHostIntent` so the intent gates and the
 * delivery mechanism stop sharing one file: the gates decide WHETHER a
 * command runs, this module decides WHEN its results are allowed to
 * reach a recipient. The two answer different questions and change for
 * different reasons.
 *
 * The module owns four passes: resume a previous run's undelivered
 * records, commit, publish, record the delivery.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore, IPublicationOutboxStore } from './IMatchStore';
import type {
  IMatchCommandBatch,
  MatchBatchAppendResult,
} from './matchCommandBatch';

import { hasPublicationOutbox } from './IMatchStore';

/**
 * Builds a protocol Error envelope. `code` is the machine-readable
 * protocol union; `reason` must stay free of foreign session ids.
 *
 * Lives here rather than beside the intent gates because the commit
 * pass is its most load-bearing caller - `STORE_FAILURE` is the one
 * frame a client gets when a command did not become durable - and the
 * gates import it from here rather than the other way round, so the
 * dependency runs one way.
 */
export function errorMessage(
  matchId: string,
  code: Extract<IServerMessage, { kind: 'Error' }>['code'],
  reason: string,
  intentId?: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
    ...(intentId != null ? { intentId } : {}),
  };
}

/** What `commitThenPublish` did. */
export interface ICommitThenPublishResult {
  /** False when an append failed; the caller must not continue. */
  readonly committed: boolean;
  /** Frames recorded - either every Event frame, or the failure. */
  readonly messages: readonly IServerMessage[];
}

/** Dependencies of `commitThenPublish`. */
export interface ICommitThenPublishDeps {
  readonly matchId: string;
  readonly events: readonly IGameEvent[];
  readonly intentId?: string;
  readonly appendEvent: (event: IGameEvent) => Promise<unknown>;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  readonly closeMatch: () => Promise<void>;
  /**
   * Durable publication outbox, when the store keeps one (umbrella task
   * 7.1). Absent means the previous behaviour verbatim: no resume pass,
   * no marking, publication straight from the in-memory events.
   */
  readonly publications?: IPublicationOutboxStore;
  /**
   * Atomic batch commit (umbrella task 7.1). When present alongside
   * `publications`, pass 1 commits the whole command as ONE transaction
   * that writes the events and their outbox rows together, and pass 2
   * publishes from those durable rows rather than the in-memory
   * events. Absent keeps the event-at-a-time path for stores without
   * the capability.
   */
  readonly commitBatch?: {
    readonly commandId: string;
    readonly actorId: string;
    readonly append: (
      batch: IMatchCommandBatch,
    ) => Promise<MatchBatchAppendResult>;
  };
  /**
   * Undelivered-only broadcast for the resume pass. A resumed frame
   * must never assign a fresh delivery number to a viewer whose cursor
   * already records it; this variant skips those viewers. When absent
   * the resume pass falls back to `broadcastEvent` (pre-7.1 behaviour).
   */
  readonly broadcastUndeliveredEvent?: (
    message: IEventMessage,
  ) => Promise<void>;
}

/**
 * Persist a command's events, and publish them ONLY once every one of
 * them is down.
 *
 * The two passes are the point. Appending and broadcasting in the same
 * pass meant a failure partway through had ALREADY told every client
 * about the events that landed before it - so a command that did not
 * succeed was still, in part, published. Recipients applied half a
 * command, the match then closed underneath them, and no reader
 * afterwards could tell that half-state from a command that
 * legitimately produced fewer events.
 *
 * NOT CLAIMED HERE: atomicity. The events still go down one at a time,
 * so a mid-command failure still leaves the earlier ones committed.
 * That boundary is the store adapters' `appendCommandBatch` (umbrella
 * task 3.1). What this fixes is narrower and worth stating exactly: a
 * partial commit is no longer PUBLISHED.
 *
 * With `commitBatch` supplied (umbrella 7.1), both limits above fall
 * away: the whole command commits in one transaction that writes the
 * events and their outbox rows together, and publication comes off
 * those durable rows via `commitBatchThenPublishFromRows`. The
 * event-at-a-time passes below remain for stores without the batch
 * capability, where the outbox passes are inert by construction.
 */
export async function commitThenPublish(
  deps: ICommitThenPublishDeps,
): Promise<ICommitThenPublishResult> {
  // Pass 0 - resume. Records a previous run committed but never
  // published go out before this command's own work; they are older
  // events, and a client that got this command first would apply the
  // match's history out of order.
  //
  // It runs BEFORE the commit deliberately. After it, this command's
  // own records would be pending too, so the drain would publish them
  // and pass 2 would then publish them a second time.
  if (deps.publications) {
    await resumePendingPublications({
      matchId: deps.matchId,
      publications: deps.publications,
      // Undelivered-only when the caller offers it: a resumed frame must
      // not assign fresh delivery numbers to viewers who already hold it.
      broadcastEvent: deps.broadcastUndeliveredEvent ?? deps.broadcastEvent,
    });
  }

  // The batch path (umbrella 7.1): one transaction writes the events
  // and their outbox rows together, then publication comes off those
  // durable rows. An empty command skips it - the store refuses an
  // empty batch by design, and there is nothing to publish anyway.
  if (deps.commitBatch && deps.publications && deps.events.length > 0) {
    return commitBatchThenPublishFromRows(
      deps,
      deps.commitBatch,
      deps.publications,
    );
  }

  // Pass 1 - commit. Nothing reaches a recipient from in here.
  for (const event of deps.events) {
    try {
      await deps.appendEvent(event);
    } catch (e) {
      const err = errorMessage(
        deps.matchId,
        'STORE_FAILURE',
        e instanceof Error ? e.message : 'Store append failed',
        deps.intentId,
      );
      deps.broadcast(err);
      await deps.closeMatch();
      // Returning at the first failure rather than pushing on: further
      // appends would only deepen a commit the caller is abandoning.
      return { committed: false, messages: [err] };
    }
  }

  // Pass 2 - publish. Reached only when the whole command is durable.
  const messages: IServerMessage[] = [];
  for (const event of deps.events) {
    const envelopeOut: IEventMessage = {
      kind: 'Event',
      matchId: deps.matchId,
      ts: nowIso(),
      event,
    };
    await deps.broadcastEvent(envelopeOut);
    messages.push(envelopeOut);
  }

  // Pass 3 - record the delivery. Without it the NEXT command's resume
  // pass would find this command's records still pending and publish
  // them a second time. A no-op when the commit path wrote no records.
  if (deps.publications && deps.events.length > 0) {
    await deps.publications.markPublicationsPublished(
      deps.matchId,
      deps.events.map((event) => event.sequence),
    );
  }
  return { committed: true, messages };
}

/**
 * Build the outbox/batch slice of `commitThenPublish`'s deps from a
 * store's capabilities (umbrella 7.1).
 *
 * With both capabilities and a non-empty command, the command commits
 * as ONE transaction that writes the events and their outbox rows
 * together, and its frames publish from those rows. The command id is
 * the intent id when the client sent one - that is the identity a
 * retry reproduces - and falls back to the first event id, which never
 * dedupes because a re-dispatch mints fresh event ids; the fallback
 * merely keeps the batch path available, it does not invent retry
 * identity the client never offered.
 */
export function outboxCommitDeps(
  store: IMatchStore,
  matchId: string,
  envelope: { readonly intentId?: string; readonly playerId: string },
  events: readonly IGameEvent[],
): Partial<Pick<ICommitThenPublishDeps, 'publications' | 'commitBatch'>> {
  if (!hasPublicationOutbox(store)) return {};
  if (store.appendCommandBatch == null || events.length === 0) {
    return { publications: store };
  }
  return {
    publications: store,
    commitBatch: {
      commandId: envelope.intentId ?? `evt:${events[0].id}`,
      actorId: envelope.playerId,
      append: (batch: IMatchCommandBatch) =>
        store.appendCommandBatch!(matchId, batch),
    },
  };
}

/**
 * Pass 1-3 of the batch path: commit the command atomically, then
 * publish it FROM the rows that transaction wrote.
 *
 * Publication reads the batch's own rows back through
 * `listPendingPublications` rather than trusting the in-memory events -
 * that is the literal reading of "publish committed results only from
 * durable publication records created in the same transaction as the
 * authoritative command batch", and it means a frame can only ever
 * carry what the store actually holds. Each row is marked ONE AT A TIME
 * after its own send, the same discipline as the resume drain: a
 * process that dies halfway leaves its unsent rows pending for the next
 * run's pass 0.
 *
 * A `duplicate-command` answer is a retry of a command that already
 * committed: its frames were published by the original run or drained
 * by pass 0 moments ago, so there is nothing new to say and no failure
 * to report. The conflict kinds mean the engine session and the store
 * disagree about the head - on this path that is a broken invariant,
 * answered exactly like an append failure: truthful typed frame, close.
 */
async function commitBatchThenPublishFromRows(
  deps: ICommitThenPublishDeps,
  commitBatch: NonNullable<ICommitThenPublishDeps['commitBatch']>,
  publications: IPublicationOutboxStore,
): Promise<ICommitThenPublishResult> {
  let result: MatchBatchAppendResult;
  try {
    result = await commitBatch.append({
      commandId: commitBatch.commandId,
      actorId: commitBatch.actorId,
      expectedRevision: deps.events[0].sequence,
      events: deps.events,
    });
  } catch (e) {
    const err = errorMessage(
      deps.matchId,
      'STORE_FAILURE',
      e instanceof Error ? e.message : 'Store append failed',
      deps.intentId,
    );
    deps.broadcast(err);
    await deps.closeMatch();
    return { committed: false, messages: [err] };
  }
  if (result.kind === 'duplicate-command') {
    return { committed: true, messages: [] };
  }
  if (result.kind !== 'committed') {
    const err = errorMessage(
      deps.matchId,
      'STORE_FAILURE',
      result.kind,
      deps.intentId,
    );
    deps.broadcast(err);
    await deps.closeMatch();
    return { committed: false, messages: [err] };
  }

  const batchSequences = new Set(deps.events.map((event) => event.sequence));
  const rows = (
    await publications.listPendingPublications(deps.matchId)
  ).filter((row) => batchSequences.has(row.sequence));
  const messages: IServerMessage[] = [];
  for (const row of rows) {
    const envelopeOut: IEventMessage = {
      kind: 'Event',
      matchId: deps.matchId,
      ts: nowIso(),
      event: row.event,
    };
    await deps.broadcastEvent(envelopeOut);
    await publications.markPublicationsPublished(deps.matchId, [row.sequence]);
    messages.push(envelopeOut);
  }
  return { committed: true, messages };
}

/** Dependencies of `resumePendingPublications`. */
export interface IResumePendingPublicationsDeps {
  readonly matchId: string;
  readonly publications: IPublicationOutboxStore;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
}

/**
 * Finish a publication a previous run committed but never delivered.
 *
 * `Commit Precedes Recipient Publication` asks restart recovery to
 * "resume at-least-once publication from durable records and cursors
 * WITHOUT RE-EXECUTING THE COMMAND". That last clause is what shapes
 * this function: it takes no session, no engine, and no intent - only
 * the store and a way to send. Re-running the command would re-roll its
 * dice and write a second, different history; re-reading its committed
 * events cannot.
 *
 * Each record is marked ONE AT A TIME, and only after its own send
 * returned. Marking the whole set up front would be cheaper and would
 * silently drop the tail of a drain that died halfway - the frames were
 * never sent and nothing durable would remember they were owed.
 *
 * WHAT "at-least-once" MEANS HERE, precisely: at-least-once BROADCAST
 * ATTEMPT, not at-least-once delivery. A record is marked as soon as
 * `broadcastEvent` RETURNS, and that call resolves normally when it
 * reached nobody - it loops over the currently attached sockets and
 * skips any it cannot resolve, filter, or admit, so zero attached
 * sockets means the loop body never runs. A drain during a window when
 * every player is disconnected therefore marks every record delivered,
 * permanently. What actually covers that case is the SessionJoin
 * `lastSeq` replay a reconnecting client performs, not this drain;
 * closing it properly needs the per-viewer delivery cursors the outbox
 * record deliberately does not carry yet (see `IMatchPublication`).
 *
 * The fresh-delivery-number question this used to flag is answered by
 * the caller's choice of broadcast: production routes the drain through
 * the undelivered-only variant, whose per-viewer cursor check skips
 * anyone already holding the frame, so no cursor ever advances past a
 * frame its viewer did not receive. The dep stays a plain broadcast
 * function so the unit suites can observe the sends directly.
 */
export async function resumePendingPublications(
  deps: IResumePendingPublicationsDeps,
): Promise<readonly IEventMessage[]> {
  const pending = await deps.publications.listPendingPublications(deps.matchId);
  const published: IEventMessage[] = [];
  for (const record of pending) {
    const envelopeOut: IEventMessage = {
      kind: 'Event',
      matchId: deps.matchId,
      ts: nowIso(),
      event: record.event,
    };
    await deps.broadcastEvent(envelopeOut);
    await deps.publications.markPublicationsPublished(deps.matchId, [
      record.sequence,
    ]);
    published.push(envelopeOut);
  }
  return published;
}
