/**
 * Live combat intent admission for immutable-branch / supersession
 * command semantics (umbrella 14.2).
 *
 * The combat wire names no expected head (finding #38). Live intents
 * therefore append to the match's original identity (`main` from the
 * baseline, `root` from journal genesis). When the stream's effective
 * head is a replacement branch, or that head's own status is
 * superseded, the command is stale: answering anything else would
 * append onto history the authority has already left.
 *
 * Active only when the store exposes IEventHistoryBranchPort. A store
 * without those methods cannot have activated a replacement, so every
 * existing in-memory host test stays byte-identical.
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
import { hasHistoryBranchStore } from '@/lib/events/storeCapabilityPorts';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';

import { MATCH_BASELINE_BRANCH_ID } from './matchAuthorityBaseline';

/** Live intents never name a branch; these two ids are that identity. */
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
  if (!LIVE_PATH_BRANCH_IDS.has(head.branchId)) {
    return refuseStale(ctx, envelope, head, revision);
  }
  return null;
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
