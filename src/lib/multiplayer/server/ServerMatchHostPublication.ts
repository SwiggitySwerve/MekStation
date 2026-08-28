/**
 * The commit / publish passes of a match command.
 *
 * Split out of `ServerMatchHostIntent` so the intent gates and the
 * delivery mechanism stop sharing one file: the gates decide WHETHER a
 * command runs, this module decides WHEN its results are allowed to
 * reach a recipient. The two answer different questions and change for
 * different reasons.
 *
 * This move is behaviour-neutral - `commitThenPublish` and
 * `errorMessage` arrive here unchanged, and `commitThenPublish.test.ts`
 * follows them with only its import rewritten.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { nowIso } from '@/types/multiplayer/Protocol';

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
 */
export async function commitThenPublish(
  deps: ICommitThenPublishDeps,
): Promise<ICommitThenPublishResult> {
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
  return { committed: true, messages };
}
