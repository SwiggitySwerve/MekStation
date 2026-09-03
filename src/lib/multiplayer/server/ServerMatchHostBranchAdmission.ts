/**
 * Live combat intent admission for immutable-branch / supersession
 * command semantics (umbrella 14.2).
 *
 * The combat wire names no expected head (finding #38). Live intents
 * therefore append to the branch the host actually serves. Null
 * servedBranchId is the original identity (`main` from the baseline,
 * `root` from journal genesis). A host still serving that identity
 * while the store activated a replacement, or a head whose own status
 * is superseded, is stale: answering would append onto history the
 * authority has already left. After a rewind rebuild the host serves
 * the activated candidate, so that head is the live path and the
 * match can be extended (14.4).
 *
 * Active only when the store exposes IEventHistoryBranchPort and that
 * port is ready. Method presence alone is not enough: DurableMatchStore
 * always binds the six members, but the campaign database they read
 * may never have been opened. Crashing a live match for that is worse
 * than skipping admission — a store that cannot read a head cannot
 * have activated a replacement.
 *
 * Rewind cuts (any payload carrying targetRevision) stay on the GM
 * commit HTTP route. If one reaches this path, only the match host
 * passes; a player is GM_ONLY. A player RewindRequest is the one
 * non-mutating door: it derives no event and answers
 * accepted-for-gm-review.
 */

import type { IEventHistoryEffectiveHead } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import {
  hasHistoryBranchStore,
  isHistoryBranchStoreReady,
} from '@/lib/events/storeCapabilityPorts';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';

import { hasMatchStreamRebuildReader } from './IMatchStore';
import { MATCH_BASELINE_BRANCH_ID } from './matchAuthorityBaseline';
import { errorMessage } from './ServerMatchHostPublication';

/**
 * Live intents name no branch; their identity is the branch the host
 * serves. These two ids are that identity when servedBranchId is null
 * (root / baseline). A rebuilt host adds the activated candidate via
 * servedBranchId — do not treat every non-root head as stale.
 */
const LIVE_PATH_BRANCH_IDS: ReadonlySet<string> = new Set([
  MATCH_BASELINE_BRANCH_ID,
  ROOT_EVENT_BRANCH_ID,
]);

/**
 * LAW-40: total Record over the live-path refusal codes. A new code
 * without a reason sentence fails compilation, and the count row
 * fails if a member is added or dropped silently.
 */
export const LIVE_BRANCH_ADMISSION_PHRASING = {
  STALE_BRANCH: EXPECTED_HEAD_RESYNC_ACTION,
  GM_ONLY: 'gm-role-required',
} as const satisfies Record<LiveBranchAdmissionCode, string>;

export type LiveBranchAdmissionCode = 'STALE_BRANCH' | 'GM_ONLY';

export const ACCEPTED_FOR_GM_REVIEW = 'accepted-for-gm-review' as const;

export interface IBranchAdmissionHost {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly broadcast: (message: IServerMessage) => void;
  /** Null = host still serves the root/baseline live-path identity. */
  readonly servedBranchId: string | null;
}

/**
 * Intent-path entry so handleIntent stays a two-line call.
 *
 * Projects the host down to the admission view (the intent context
 * carries many other fields this consult must not see), and treats a
 * non-string principal as the in-process caller — that path has no
 * wire identity, so the envelope's playerId is the actor name.
 * Returning frames means refuse; null means keep validating.
 */
export async function refuseLiveBranchFromIntent(
  host: IBranchAdmissionHost,
  envelope: IIntent,
  verifiedPrincipalId: string | symbol,
): Promise<readonly IServerMessage[] | null> {
  const view: IBranchAdmissionHost = {
    matchId: host.matchId,
    store: host.store,
    broadcast: host.broadcast,
    servedBranchId: host.servedBranchId,
  };
  const actorId =
    typeof verifiedPrincipalId === 'string'
      ? verifiedPrincipalId
      : envelope.playerId;
  return refuseLiveBranchAdmission(view, envelope, actorId);
}

/**
 * Refuse illegal live-path shapes, or accept a RewindRequest, before
 * validate/reduce. Null means the existing intent path continues.
 */
export async function refuseLiveBranchAdmission(
  ctx: IBranchAdmissionHost,
  envelope: IIntent,
  actorId: string,
): Promise<readonly IServerMessage[] | null> {
  if (!hasHistoryBranchStore(ctx.store)) return null;
  if (!isHistoryBranchStoreReady(ctx.store)) return null;

  if (envelope.intent.kind === 'RewindRequest') {
    return answerAcceptedForGmReview(ctx, envelope);
  }

  let hostPlayerId: string;
  try {
    hostPlayerId = (await ctx.store.getMatchMeta(ctx.matchId)).hostPlayerId;
  } catch {
    return null;
  }

  if (namesRewindCut(envelope.intent) && actorId !== hostPlayerId) {
    return refuse(ctx, envelope, 'GM_ONLY');
  }
  if (namesRewindCut(envelope.intent)) return null;

  // Shipped IEventHistoryBranchPort keys every read by stream, then id.
  const stream = { streamType: 'match' as const, streamId: ctx.matchId };
  const head = ctx.store.readEffectiveHead(stream);
  if (head === null) return null;

  const events = await ctx.store.getEvents(ctx.matchId);
  const last = events.length === 0 ? undefined : events[events.length - 1];
  const revision = last === undefined ? 0 : last.sequence + 1;

  const effective = ctx.store.readBranch(stream, head.branchId);
  if (effective?.status === 'superseded') {
    return refuseStale(ctx, envelope, head, revision);
  }
  // Admit the default live-path ids or the branch this host serves.
  // A host still serving root while the store activated a candidate
  // stays STALE_BRANCH (14.2 unrebuilt row).
  const onLivePath =
    LIVE_PATH_BRANCH_IDS.has(head.branchId) ||
    head.branchId === ctx.servedBranchId;
  if (!onLivePath) {
    return refuseStale(ctx, envelope, head, revision);
  }
  return null;
}

/**
 * Refuses an engine-mutating command while a correction lease is
 * rebuilding this match's authoritative history (task 2.2; umbrella
 * 14.3).
 *
 * A STREAM-level refusal, deliberately shaped like the rollback-blocked
 * one above rather than like `rejectCommand`: the whole content of the
 * refusal is that this stream's history is being replaced, which is true
 * regardless of who asked and of whether they were entitled to ask. It
 * therefore runs before the authorization gate, and writes no
 * `action_audit` row — that row requires a server-derived viewer this
 * function has deliberately not resolved.
 *
 * Placed AFTER lobby routing, and that placement is the guarantee, not a
 * convention: seat occupancy, readiness and launch return above, so a
 * rewind cannot lock players out of their own lobby for its duration.
 *
 * Nothing is queued. The verdict is a synchronous read and the function
 * returns the frames — there is no timer and no promise a caller holds,
 * so "refused during rebuild" cannot quietly become "applied after
 * activation".
 *
 * Only the retry ACTION rides out on the wire. The lease id, owner and
 * fencing epoch are authority facts (design D5) and naming a rebuild's
 * owner to a player is a disclosure this refusal does not need to make.
 *
 * A store without the rebuild capability answers null: no durable lease
 * table means no correction can be in progress. Consuming ONLY the
 * rebuild arm of the shared admission is likewise deliberate — the
 * combat wire carries no client-claimed expected head, so the staleness
 * arm has nothing here to compare and cannot be honestly answered.
 */
export function refuseDuringHistoryRebuild(
  ctx: IBranchAdmissionHost,
  envelope: IIntent,
): readonly IServerMessage[] | null {
  if (!hasMatchStreamRebuildReader(ctx.store)) return null;
  const rebuilding = ctx.store.readMatchStreamRebuild(ctx.matchId);
  if (rebuilding === null) return null;
  const err = errorMessage(
    ctx.matchId,
    rebuilding.code,
    rebuilding.action,
    envelope.intentId,
  );
  ctx.broadcast(err);
  return [err];
}

/**
 * A rewind cut is any intent that names targetRevision. RewindRequest
 * is the player-safe request and is handled above, not here.
 */
export function namesRewindCut(intent: IIntent['intent']): boolean {
  if (intent.kind === 'RewindRequest') return false;
  if (!Object.prototype.hasOwnProperty.call(intent, 'targetRevision')) {
    return false;
  }
  return typeof Reflect.get(intent, 'targetRevision') === 'number';
}

function refuseStale(
  ctx: IBranchAdmissionHost,
  envelope: IIntent,
  head: IEventHistoryEffectiveHead,
  revision: number,
): readonly IServerMessage[] {
  return refuse(ctx, envelope, 'STALE_BRANCH', {
    branchId: head.branchId,
    revision,
  });
}

function refuse(
  ctx: IBranchAdmissionHost,
  envelope: IIntent,
  code: LiveBranchAdmissionCode,
  activeHead?: { readonly branchId: string; readonly revision: number },
): readonly IServerMessage[] {
  const err: Extract<IServerMessage, { kind: 'Error' }> = {
    kind: 'Error',
    matchId: ctx.matchId,
    ts: nowIso(),
    code,
    reason: LIVE_BRANCH_ADMISSION_PHRASING[code],
    ...(envelope.intentId != null ? { intentId: envelope.intentId } : {}),
    ...(activeHead != null
      ? {
          conflictHead: activeHead,
          recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
        }
      : {}),
  };
  ctx.broadcast(err);
  return [err];
}

function answerAcceptedForGmReview(
  ctx: IBranchAdmissionHost,
  envelope: IIntent,
): readonly IServerMessage[] {
  // The match wire has no Ack envelope. The accept rides as Error.reason
  // so the player sees a typed answer and no Event is derived.
  // Private-record write is not wired from this host (non-claim).
  const err: Extract<IServerMessage, { kind: 'Error' }> = {
    kind: 'Error',
    matchId: ctx.matchId,
    ts: nowIso(),
    code: 'INVALID_INTENT',
    reason: ACCEPTED_FOR_GM_REVIEW,
    ...(envelope.intentId != null ? { intentId: envelope.intentId } : {}),
  };
  ctx.broadcast(err);
  return [err];
}
