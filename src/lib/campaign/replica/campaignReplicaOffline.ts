/**
 * Replica connection posture and mutation-intent rule (design D6).
 *
 * Reads are always served from the local store. Mutation intents are
 * refused typed while disconnected and are never queued. A refusal is
 * a different `kind` from `failed` so the UI can say offline rather
 * than error. Connected `forward` does not send; task 3.5 owns the wire.
 *
 * Time is not read here; status is caller-supplied.
 */

import type { CampaignReplicaConnectionStatus } from './campaignReplicaTypes';
import type { ICampaignReplicaMutationIntent } from './campaignReplicaTypes';
import type { CampaignReplicaMutationResult } from './campaignReplicaTypes';

import {
  REPLICA_INVALID_INTENT_REASON,
  REPLICA_OFFLINE_REFUSAL_REASON,
} from './campaignReplicaTypes';

/**
 * True when every identity field on the intent is a non-empty string.
 */
function intentFieldsPresent(intent: ICampaignReplicaMutationIntent): boolean {
  return (
    intent.campaignId.trim().length > 0 &&
    intent.grantId.trim().length > 0 &&
    intent.commandId.trim().length > 0 &&
    intent.type.trim().length > 0
  );
}

/**
 * Decides whether a mutation intent may be forwarded. Offline wins
 * even for a malformed intent so the UI does not report a generic
 * failure while disconnected.
 */
export function evaluateReplicaMutationIntent(
  status: CampaignReplicaConnectionStatus,
  intent: ICampaignReplicaMutationIntent,
): CampaignReplicaMutationResult {
  if (status === 'disconnected') {
    return {
      kind: 'refused',
      reason: REPLICA_OFFLINE_REFUSAL_REASON,
    };
  }
  if (!intentFieldsPresent(intent)) {
    return {
      kind: 'failed',
      reason: REPLICA_INVALID_INTENT_REASON,
    };
  }
  return { kind: 'forward', intent };
}
