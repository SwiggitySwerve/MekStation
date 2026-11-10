import type { IIntent } from '@/types/multiplayer/Protocol';
/** Hosted intent refusal wording and server-only diagnostics.
 * @spec openspec/changes/fix-mp-refusals-sender-only/specs/multiplayer-server/spec.md
 */
import type { IErrorCode, IServerMessage } from '@/types/multiplayer/Protocol';

import { REBUILD_RETRY_ACTION } from '@/lib/events/journal/EventHistoryCommandAdmission';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { nowIso } from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import type { ICommandRejectionAuditPort } from './audit/CommandRejectionAudit';
import type { IAuthorizedViewer } from './authorization/AuthorizedViewer';

export const INTENT_REFUSAL_REASONS = {
  BAD_ENVELOPE: 'Invalid message.',
  PROTOCOL_VIOLATION: 'Invalid protocol message.',
  INVALID_INTENT: 'Intent could not be applied.',
  UNKNOWN_INTENT: 'Unsupported intent.',
  UNKNOWN_MATCH: 'Match is closed.',
  AUTH_REJECTED: 'Intent is not authorized.',
  STORE_FAILURE: 'Unable to save the command.',
  INTERNAL_ERROR: 'Unable to process the command.',
  MATCH_PAUSED: 'Match is paused.',
  RATE_LIMITED: 'Intent rate limit exceeded',
  DUPLICATE_INTENT: 'Intent id already accepted for this match',
  CAMPAIGN_NOT_CONVERGED: 'Campaign synchronization is pending.',
  PROJECTION_REBUILDING: REBUILD_RETRY_ACTION,
  CAMPAIGN_STALE_HEAD: EXPECTED_HEAD_RESYNC_ACTION,
  STALE_BRANCH: EXPECTED_HEAD_RESYNC_ACTION,
  GM_ONLY: 'gm-role-required',
  MATCH_QUARANTINED: 'history-integrity-blocked',
} as const satisfies Record<IErrorCode, string>;

export type IntentRefusal = Extract<IServerMessage, { kind: 'Error' }>;

export function intentRefusalMessage(
  matchId: string,
  code: IErrorCode,
  diagnostic: string,
  intentId?: string,
): IntentRefusal {
  logger.warn('[multiplayer] intent refused', {
    matchId,
    intentId,
    code,
    diagnostic,
  });
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason: INTENT_REFUSAL_REASONS[code],
    ...(intentId != null ? { intentId } : {}),
  };
}

/**
 * Terminal command refusal WITH its audit row, in that order.
 *
 * The row is appended before the Error frame is built or sent, so
 * a reader who can observe the refusal on the wire can already observe
 * the record of it - "append then reject" cannot quietly become
 * "reject then append". Recording is deliberately best-effort (see
 * `CommandRejectionAudit`'s NEVER FATAL law): the command is refused
 * either way, and a failed audit must not upgrade a clean refusal into
 * an internal error.
 */
export function rejectAuditedIntent(
  ctx: {
    readonly matchId: string;
    readonly commandRejectionAudit?: ICommandRejectionAuditPort;
    readonly sendRefusal: (message: IServerMessage) => void;
  },
  envelope: IIntent,
  viewer: IAuthorizedViewer,
  code: Extract<IServerMessage, { kind: 'Error' }>['code'],
  reason: string,
): readonly IServerMessage[] {
  ctx.commandRejectionAudit?.recordCommandRejection({
    viewer,
    matchId: ctx.matchId,
    commandId: envelope.intentId ?? null,
    intent: envelope.intent,
    occurredAt: nowIso(),
  });
  const err = intentRefusalMessage(
    ctx.matchId,
    code,
    reason,
    envelope.intentId,
  );
  ctx.sendRefusal(err);
  return [err];
}
