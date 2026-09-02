/**
 * Locked door bodies for `CampaignMatchHost` (finding #78).
 *
 * WHY THEY LIVE HERE. The host file is the public door surface and the
 * single-writer lock. Adding the reconcile batch door pushed it past
 * the line budget. These bodies are one concern: the work each door
 * does AFTER the lock is already held. Lifting them keeps the host as
 * the acquisition facade and leaves the bodies callable from both the
 * public doors and `runBatchExclusive` without a re-entrant lock.
 */

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  CampaignIntentResult,
  ICampaignAuthoritativeState,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';
import { parseCampaignIntent } from '@/types/campaign/campaignSyncSchemas';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { CampaignCommitOutcome } from './campaignHostBatchCommit';
import type {
  CampaignRosterChangeKind,
  ICampaignRosterUnitChange,
} from './campaignHostDoors';
import type { ICampaignIntentCommandIdentity } from './campaignIntentIdentity';
import type { UnsequencedCampaignEvent } from './CampaignMatchHostIntent';

import { resultOfCommit } from './campaignHostBatchCommit';
import {
  CampaignIntentIdentityConflictError,
  campaignIntentIdentityDeps,
  intentCommandIdentity,
  replayCommittedIntent,
} from './campaignIntentIdentity';
import { validateCampaignIntent } from './CampaignMatchHostIntent';

/**
 * The host facts a locked door reads and moves. Named so a later edit
 * cannot quietly reach for a sixth field the lock does not cover.
 */
export interface ICampaignMatchHostLockedContext {
  readonly campaignId: string;
  readonly hostPlayerId: string;
  readonly eventStore: ICampaignEventStore;
  readonly isOpened: () => boolean;
  readonly isClosed: () => boolean;
  readonly markOpened: () => void;
  readonly readState: () => ICampaignAuthoritativeState;
  readonly nextSequence: () => Promise<number>;
  readonly commitEvents: (
    events: readonly UnsequencedCampaignEvent[],
    identity?: ICampaignIntentCommandIdentity,
  ) => Promise<CampaignCommitOutcome>;
}

function sessionClosed(): CampaignIntentResult {
  return {
    ok: false,
    code: INVALID_CAMPAIGN_INTENT,
    reason: 'session-closed',
  };
}

async function commitValidated(
  host: ICampaignMatchHostLockedContext,
  events: readonly UnsequencedCampaignEvent[],
  identity?: ICampaignIntentCommandIdentity,
): Promise<CampaignIntentResult> {
  try {
    return resultOfCommit(await host.commitEvents(events, identity));
  } catch (error) {
    if (error instanceof CampaignIntentIdentityConflictError) {
      return campaignIntentIdentityDeps(
        host.campaignId,
        host.eventStore,
      ).conflict();
    }
    throw error;
  }
}

/** Baseline snapshot as sequence 0; idempotent once opened or closed. */
export async function openLocked(
  host: ICampaignMatchHostLockedContext,
): Promise<void> {
  if (host.isOpened() || host.isClosed()) return;
  host.markOpened();
  // A recovered durable campaign already has its baseline and tail. Do
  // not append a second genesis snapshot merely because a new host
  // instance opened around it.
  if ((await host.nextSequence()) > 0) return;
  await host.commitEvents([
    {
      type: 'CampaignSnapshotPublished',
      campaignId: host.campaignId,
      authorPlayerId: host.hostPlayerId,
      ts: nowIso(),
      // Shared ledger baseline for every co-op participant, not GM-only.
      scope: 'campaign',
      payload: { state: host.readState() },
    },
  ]);
}

/** Guest path: closed-check, zod parse, validate, commit, broadcast. */
export async function handleIntentLocked(
  host: ICampaignMatchHostLockedContext,
  rawIntent: unknown,
): Promise<CampaignIntentResult> {
  if (host.isClosed()) return sessionClosed();

  const intent = parseCampaignIntent(rawIntent);
  if (intent === null) {
    return {
      ok: false,
      code: INVALID_CAMPAIGN_INTENT,
      reason: 'malformed-intent',
    };
  }

  const retry = await replayCommittedIntent(
    campaignIntentIdentityDeps(host.campaignId, host.eventStore),
    intent,
  );
  if (retry) return retry;

  // Guest-facing path: derived events are attributed to the guest
  // author. CO1 has one host/guest pair and no player id on the intent,
  // so a stable guest:<campaignId> author stands in until CO2 threads
  // the real guest player id through the GM surface.
  const validation = validateCampaignIntent(
    intent,
    host.readState(),
    `guest:${intent.campaignId}`,
    nowIso(),
    host.hostPlayerId,
  );
  if (!validation.ok) return validation;

  return commitValidated(
    host,
    validation.events,
    intentCommandIdentity(host.campaignId, intent),
  );
}

/** Host path: trusted envelope, still validated against the ledger. */
export async function applyHostIntentLocked(
  host: ICampaignMatchHostLockedContext,
  intent: ICampaignIntent,
): Promise<CampaignIntentResult> {
  if (host.isClosed()) return sessionClosed();
  const retry = await replayCommittedIntent(
    campaignIntentIdentityDeps(host.campaignId, host.eventStore),
    intent,
  );
  if (retry) return retry;
  const validation = validateCampaignIntent(
    intent,
    host.readState(),
    host.hostPlayerId,
    nowIso(),
    host.hostPlayerId,
  );
  if (!validation.ok) return validation;
  return commitValidated(
    host,
    validation.events,
    intentCommandIdentity(host.campaignId, intent),
  );
}

/** Grow the salvage pool; a non-positive credit is a no-op rejection. */
export async function creditSalvagePoolLocked(
  host: ICampaignMatchHostLockedContext,
  value: number,
  reason: string,
): Promise<CampaignIntentResult> {
  if (host.isClosed()) return sessionClosed();
  if (!(value > 0) || !Number.isFinite(value)) {
    return {
      ok: false,
      code: INVALID_CAMPAIGN_INTENT,
      reason: 'malformed-intent',
    };
  }
  void reason;
  const outcome = await host.commitEvents([
    {
      type: 'SalvageAllocated',
      campaignId: host.campaignId,
      authorPlayerId: host.hostPlayerId,
      ts: nowIso(),
      // Post-battle salvage is a shared ledger fact.
      scope: 'campaign',
      payload: {
        value,
        poolRemaining: host.readState().salvagePool + value,
      },
    },
  ]);
  return resultOfCommit(outcome);
}

/** Host-authoritative roster mutation from a resolved battle. */
export async function applyRosterUnitChangeLocked(
  host: ICampaignMatchHostLockedContext,
  campaignId: string,
  change: CampaignRosterChangeKind,
  unit: ICampaignRosterUnitChange,
  intentTag: string,
): Promise<CampaignIntentResult> {
  if (host.isClosed()) return sessionClosed();
  if (campaignId !== host.campaignId) {
    return {
      ok: false,
      code: INVALID_CAMPAIGN_INTENT,
      reason: 'campaign-mismatch',
    };
  }
  void intentTag;
  const outcome = await host.commitEvents([
    {
      type: 'RosterUnitChanged',
      campaignId: host.campaignId,
      authorPlayerId: host.hostPlayerId,
      ts: nowIso(),
      // Roster mutations are shared ledger facts.
      scope: 'campaign',
      payload: { change, unit },
    },
  ]);
  return resultOfCommit(outcome);
}
