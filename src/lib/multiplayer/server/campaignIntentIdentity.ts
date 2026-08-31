/**
 * Stable campaign intent identity and retry replay (umbrella E2E-08 fix).
 *
 * A client intent carrying an `intentId` maps to the durable command id
 * `campaign-intent:<campaignId>:<intentId>` - the identity a retry
 * reproduces - and a resend answers with the PRIOR committed events
 * rather than a second command. Reused identity over different work is
 * a typed refusal. Intents without an id offer no retry identity and
 * deliberately never dedupe.
 *
 * Free functions with an explicit deps object rather than host methods
 * so the host file keeps its modularity budget for orchestration; the
 * host passes its own campaignId and event store.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 */

import { sha256 } from 'js-sha256';

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type { ICampaignEventStore as IStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  CampaignIntentResult,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';

/**
 * The deps bundle `replayCommittedIntent` consumes, with the typed
 * conflict answer owned here beside the identity that produces it.
 */
export function campaignIntentIdentityDeps(
  campaignId: string,
  eventStore: IStore,
): {
  readonly campaignId: string;
  readonly eventStore: ICampaignEventStore;
  readonly conflict: () => Extract<CampaignIntentResult, { ok: false }>;
} {
  return {
    campaignId,
    eventStore,
    conflict: () => ({
      ok: false,
      code: INVALID_CAMPAIGN_INTENT,
      reason: INTENT_IDENTITY_CONFLICT_REASON,
    }),
  };
}

/** Thrown by a commit path when a reused command id carries different work. */
export class CampaignIntentIdentityConflictError extends Error {
  constructor(public readonly commandId: string) {
    super(`Campaign intent identity conflict: ${commandId}`);
    this.name = 'CampaignIntentIdentityConflictError';
  }
}

/** The durable identity a retryable client intent maps to. */
export interface ICampaignIntentCommandIdentity {
  readonly commandId: string;
  readonly intentFingerprint: string;
}

export const INTENT_IDENTITY_CONFLICT_REASON = 'intent-identity-conflict';

/**
 * The identity for an intent, or undefined when the client offered no
 * `intentId` - in which case no dedupe is possible or wanted.
 */
export function intentCommandIdentity(
  campaignId: string,
  intent: ICampaignIntent,
): ICampaignIntentCommandIdentity | undefined {
  if (typeof intent.intentId !== 'string' || intent.intentId.length === 0) {
    return undefined;
  }
  return {
    commandId: `campaign-intent:${campaignId}:${intent.intentId}`,
    intentFingerprint: sha256(canonicalizeJsonV1(intent)),
  };
}

/**
 * Answer a retry from the committed receipt, if one exists.
 *
 * `null` means "no prior commitment - run the command". The synchronous
 * lookup is preferred when the store offers one so the wire's existing
 * microtask timing is preserved; the durable journal answers async.
 */
export async function replayCommittedIntent(
  deps: {
    readonly campaignId: string;
    readonly eventStore: ICampaignEventStore;
    readonly conflict: () => Extract<CampaignIntentResult, { ok: false }>;
  },
  intent: ICampaignIntent,
): Promise<CampaignIntentResult | null> {
  const identity = intentCommandIdentity(deps.campaignId, intent);
  if (!identity) return null;
  if (deps.eventStore.getCommandReceiptNow) {
    return replayReceipt(
      identity,
      deps.eventStore.getCommandReceiptNow(deps.campaignId, identity.commandId),
      deps.conflict,
    );
  }
  if (!deps.eventStore.getCommandReceipt) return null;
  const prior = await deps.eventStore.getCommandReceipt(
    deps.campaignId,
    identity.commandId,
  );
  return replayReceipt(identity, prior, deps.conflict);
}

function replayReceipt(
  identity: ICampaignIntentCommandIdentity,
  prior: Awaited<
    ReturnType<NonNullable<ICampaignEventStore['getCommandReceipt']>>
  >,
  conflict: () => Extract<CampaignIntentResult, { ok: false }>,
): CampaignIntentResult | null {
  if (!prior) return null;
  if (prior.intentFingerprint !== identity.intentFingerprint) {
    return conflict();
  }
  return { ok: true, events: prior.events };
}
