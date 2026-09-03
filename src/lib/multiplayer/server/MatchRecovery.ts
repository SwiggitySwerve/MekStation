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

import type { AuthorityRecoveryBlockedReason } from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import type { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';
import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { quarantineAuthorityCorruption } from '@/lib/events/checkpoints/AuthorityQuarantine';
import {
  BranchCheckpointCache,
  checkpointRecoveryPort,
  referenceRecoveryPort,
} from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchMeta, IMatchStore } from './IMatchStore';

import { revisionForMatchSequence } from './history/matchStoreBranchSegmentReader';
import { matchStoreHistoryReader } from './MatchCheckpointHistory';
import {
  createMatchSessionProjector,
  foldMatchSession,
  matchAuthoritativePipeline,
} from './MatchSessionProjector';
import { ServerMatchHost } from './ServerMatchHost';
import { tryFoldActivatedRewindBranch } from './ServerMatchHostRewindRebuild';

/**
 * Capability a store must expose to be recoverable: the standard
 * `IMatchStore` surface plus `listActiveMatches()`. `DurableMatchStore`
 * implements this; the in-memory store can opt in too (it just won't
 * have anything to recover after a process restart).
 */
export interface IRecoverableMatchStore extends IMatchStore {
  listActiveMatches(): Promise<readonly IMatchMeta[]>;
}

/** One refused authority, and why (umbrella 15.3). */
export interface IMatchRecoveryBlock {
  readonly matchId: string;
  readonly reason: AuthorityRecoveryBlockedReason;
  readonly evidence: readonly string[];
}

/** Result of a recovery sweep — surfaced for logging + tests. */
export interface IMatchRecoveryResult {
  /** Hosts successfully re-instantiated, keyed by matchId. */
  readonly hosts: ReadonlyMap<string, ServerMatchHost>;
  /** Match ids that were active but could not be rebuilt. */
  readonly failed: readonly string[];
  /**
   * The subset of `failed` whose AUTHORITY DATA was refused, with the
   * typed reason. `failed` stays exactly what it was so existing callers
   * are untouched; this says why, which a bare id never could.
   */
  readonly blocked: readonly IMatchRecoveryBlock[];
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
  quarantine?: ReplayQuarantineRegistry,
): Promise<IMatchRecoveryResult> {
  const hosts = new Map<string, ServerMatchHost>();
  const failed: string[] = [];
  const blocked: IMatchRecoveryBlock[] = [];
  // InMemory / uninitialized SQLite keeps the reference port, so the
  // existing blocked-verdict suite stays byte-identical. A live SQLite
  // handle is the only thing that can offer a checkpoint.
  const sqlite = getSQLiteService();
  const cache = sqlite.isInitialized()
    ? new BranchCheckpointCache(sqlite.getDatabase())
    : null;

  if (!isRecoverableMatchStore(store)) {
    // The in-memory dev store has nothing to recover after a restart;
    // an empty result is the correct, non-erroring outcome.
    return { hosts, failed, blocked };
  }

  let active: readonly IMatchMeta[];
  try {
    active = await store.listActiveMatches();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[MatchRecovery] failed to enumerate active matches', e);
    return { hosts, failed, blocked };
  }

  for (const meta of active) {
    try {
      // A committed rewind leaves a non-root effective branch. Fold
      // that path here — the store log is still the untruncated line.
      const rewound = await tryFoldActivatedRewindBranch(store, meta.matchId);
      if (rewound !== null) {
        const session = await InteractiveSession.fromSessionAsync(
          rewound.session,
        );
        const host = await ServerMatchHost.recover(
          meta.matchId,
          store,
          session,
        );
        // Fold already left root; the recovered host serves that path.
        host.adoptServedBranch(rewound.branchId);
        const last = rewound.session.events[rewound.session.events.length - 1];
        // Same ceiling the live rebuild sets: store getEvents still
        // walks the untruncated log, so join replay must stop here.
        host.boundReplayToEffectiveHead(
          last === undefined ? -1 : last.sequence,
        );
        // Skip restorePersistedViewerDeliveries: those rows name the
        // superseded stream. Next join replays the new head.
        await host.resumePendingEventPublications();
        hosts.set(meta.matchId, host);
        continue;
      }
      const projector =
        cache === null ? null : createMatchSessionProjector(meta.matchId);
      const pipeline =
        projector === null
          ? null
          : matchAuthoritativePipeline(meta.matchId, projector);
      const history =
        cache === null ? null : matchStoreHistoryReader(store, meta.matchId);
      let headRevision = 0;
      if (cache !== null) {
        const log = await store.getEvents(meta.matchId, 0);
        const last = log[log.length - 1];
        headRevision =
          last === undefined ? 0 : revisionForMatchSequence(last.sequence);
      }
      const recovery =
        cache !== null && pipeline !== null && history !== null
          ? checkpointRecoveryPort<IGameEvent, IGameSession>({
              cache,
              pipeline,
              headRevision,
              history,
              parse: (stateJson) =>
                foldMatchSession(
                  meta.matchId,
                  (JSON.parse(stateJson) as IGameSession).events,
                ),
            })
          : referenceRecoveryPort<IGameEvent, IGameSession>();
      const verdict = await recovery({
        authorityId: meta.matchId,
        // An `active` match with no events is malformed, not a fresh one.
        emptyHistory: 'corrupt',
        // Exclusive: a checkpoint names the last revision it covers.
        // revision = sequence + 1, and getEvents returns sequence >=
        // fromSeq, so reading at R yields the event at revision R+1.
        // The old `fromExclusive + 1` assumed revision === sequence and
        // skipped that first tail event (the 15.3 A5-match kill).
        // AUTHORITY_HISTORY_START is -1; both stores clamp fromSeq <= 0
        // to 0, so a full-log read is unchanged.
        read: (fromExclusive) => store.getEvents(meta.matchId, fromExclusive),
        revisionOf: (event) => revisionForMatchSequence(event.sequence),
        // A match log carries no digests, so lineage and digest checks
        // do not apply to it (the detector skips them for an authority
        // that carries none). Sequence continuity and event-identity
        // uniqueness are what this authority CAN be validated on.
        integrityOf: (event) => ({
          revision: event.sequence,
          receiptId: event.id,
          previousDigest: null,
          digest: null,
        }),
        fold: (events, base) => foldMatchSession(meta.matchId, events, base),
      });
      // A refused authority is named and skipped. Nothing partial is
      // built from it: no session, no host, no registration.
      if (verdict.kind === 'blocked') {
        // eslint-disable-next-line no-console
        console.warn(
          `[MatchRecovery] match ${meta.matchId} is not recoverable (${verdict.reason})`,
          verdict.evidence,
        );
        failed.push(meta.matchId);
        blocked.push({
          matchId: meta.matchId,
          reason: verdict.reason,
          evidence: verdict.evidence,
        });
        // Corruption quarantines THIS session and no other: the scope
        // key is the match id, and the sweep carries on to the next
        // match, which is what keeps a healthy session serving.
        if (quarantine !== undefined) {
          quarantineAuthorityCorruption(
            quarantine,
            { authorityType: 'match', authorityId: meta.matchId },
            verdict,
          );
        }
        continue;
      }
      if (
        cache !== null &&
        pipeline !== null &&
        history !== null &&
        headRevision >= 1
      ) {
        const digest = await history.chainDigestAt(headRevision);
        if (digest !== null) {
          cache.record(
            pipeline,
            headRevision,
            digest,
            verdict.state,
            verdict.state.updatedAt,
          );
        }
      }
      const session = await InteractiveSession.fromSessionAsync(verdict.state);
      const host = await ServerMatchHost.recover(meta.matchId, store, session);
      await host.restorePersistedViewerDeliveries();
      // Drain publications the dead process committed but never sent
      // (umbrella 7.1). AFTER the cursor restore on purpose: the
      // undelivered-only broadcast consults those cursors to skip
      // viewers who already hold a frame.
      await host.resumePendingEventPublications();
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

  return { hosts, failed, blocked };
}
