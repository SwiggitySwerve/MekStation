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

import type { IPublicationOutboxStore } from './IMatchStore';

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
 * ALSO NOT CLAIMED: that this command's own frames come off durable
 * records. Pass 2 still publishes the in-memory events, because the
 * commit dep is `appendEvent` and only `appendCommandBatch` writes the
 * outbox. What the outbox buys today is the RESUME - passes 0 and 3 -
 * and those are inert on this path until task 3.1 routes the commit
 * through the batch. They are wired now so that switch does not have to
 * remember to wire them, and so a caller that already commits by batch
 * (see `resumePendingPublications`'s tests) gets the resume for free.
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
      broadcastEvent: deps.broadcastEvent,
    });
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
 * ALSO UNRESOLVED, and flagged for task 3.1 rather than fixed here: a
 * resumed frame re-enters `broadcastEvent` and is assigned a FRESH
 * `deliverySequence`, while a client that already applied that
 * authority sequence discards the frame as a duplicate. Whether that
 * advances a viewer's delivery cursor past a frame it never applied
 * needs tracing before the commit path routes through
 * `appendCommandBatch` and starts producing real resumable records.
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
