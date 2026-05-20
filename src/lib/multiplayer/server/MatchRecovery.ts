/**
 * MatchRecovery — server-startup active-match recovery.
 *
 * Per `harden-multiplayer-transport` design D3: on server startup the
 * recovery routine queries the durable store for every match with
 * `status: 'active'` and, for each one, constructs a fresh
 * `ServerMatchHost` whose `InteractiveSession` is rebuilt by replaying
 * the stored event log. This satisfies the existing `multiplayer-server`
 * "Server Restart Survives Matches" requirement against a real durable
 * backend rather than only the in-memory store.
 *
 * A reconnecting client's `SessionJoin` with its `lastSeq` then streams
 * the missing events through the already-built replay path — recovery
 * does not need to do anything special for that; the replay module
 * reads straight from the store.
 *
 * Robustness (design D2/D3 risk mitigation): the durable store's
 * `appendEvent` is transactional, so the log never contains a torn
 * write — recovery replays only fully-committed events. A match whose
 * log cannot be rebuilt (missing `GameCreated`, corrupt blob) is
 * skipped with a warning rather than crashing the whole boot.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchMeta, IMatchStore } from './IMatchStore';

import { ServerMatchHost } from './ServerMatchHost';

/**
 * Capability a store must expose to be recoverable: the standard
 * `IMatchStore` surface plus `listActiveMatches()`. `DurableMatchStore`
 * implements this; the in-memory store can opt in too (it just won't
 * have anything to recover after a process restart).
 */
export interface IRecoverableMatchStore extends IMatchStore {
  listActiveMatches(): Promise<readonly IMatchMeta[]>;
}

/** Result of a recovery sweep — surfaced for logging + tests. */
export interface IMatchRecoveryResult {
  /** Hosts successfully re-instantiated, keyed by matchId. */
  readonly hosts: ReadonlyMap<string, ServerMatchHost>;
  /** Match ids that were active but could not be rebuilt. */
  readonly failed: readonly string[];
}

/**
 * True iff the store exposes the `listActiveMatches` recovery hook.
 */
export function isRecoverableMatchStore(
  store: IMatchStore,
): store is IRecoverableMatchStore {
  return (
    typeof (store as Partial<IRecoverableMatchStore>).listActiveMatches ===
    'function'
  );
}

/**
 * Rebuild an `InteractiveSession` from a persisted event log.
 *
 * `hydrateGameSessionFromEvents` reconstructs the `IGameSession` data
 * shape (config, units, derived state) from the ordered log; we then
 * adopt that session into a fresh `InteractiveSession` so the recovered
 * host can accept new intents and drive the engine. Throws if the log
 * is empty or does not begin with `GameCreated`.
 *
 * Per `fix-recovered-session-adapted-units` (closes playtest gap #2):
 * uses `fromSessionAsync` so the recovered host has its per-unit
 * adapted state (weaponsByUnit / movementByUnit / etc.) populated.
 * Without this, move/attack on a recovered session throws because
 * the per-unit maps are empty.
 */
export async function rebuildSessionFromEvents(
  matchId: string,
  events: readonly IGameEvent[],
): Promise<InteractiveSession> {
  const session = hydrateGameSessionFromEvents(matchId, events);
  return InteractiveSession.fromSessionAsync(session);
}

/**
 * Recover every `active` match in the durable store. For each match,
 * the event log is replayed into an `InteractiveSession` and a
 * `ServerMatchHost` is re-instantiated via `ServerMatchHost.recover`.
 * Returns the rebuilt hosts so the caller (the `MatchHostRegistry`
 * bootstrap) can register them for the WebSocket upgrade handler.
 */
export async function recoverActiveMatches(
  store: IMatchStore,
): Promise<IMatchRecoveryResult> {
  const hosts = new Map<string, ServerMatchHost>();
  const failed: string[] = [];

  if (!isRecoverableMatchStore(store)) {
    // The in-memory dev store has nothing to recover after a restart;
    // an empty result is the correct, non-erroring outcome.
    return { hosts, failed };
  }

  let active: readonly IMatchMeta[];
  try {
    active = await store.listActiveMatches();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[MatchRecovery] failed to enumerate active matches', e);
    return { hosts, failed };
  }

  for (const meta of active) {
    try {
      const events = await store.getEvents(meta.matchId, 0);
      if (events.length === 0) {
        // An `active` match with no events is malformed — skip it.
        failed.push(meta.matchId);
        continue;
      }
      const session = await rebuildSessionFromEvents(meta.matchId, events);
      const host = ServerMatchHost.recover(meta.matchId, store, session);
      hosts.set(meta.matchId, host);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MatchRecovery] failed to rebuild match ${meta.matchId}`,
        e,
      );
      failed.push(meta.matchId);
    }
  }

  return { hosts, failed };
}
