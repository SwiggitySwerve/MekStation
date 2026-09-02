/**
 * The door surface a multi-door campaign batch drives (finding #78).
 *
 * A post-battle reconcile is three host doors - funds, salvage, roster -
 * that describe ONE battle. Walked through the host's public doors they
 * are three critical sections with two gaps, and a racing writer lands
 * in a gap. `CampaignMatchHost.runBatchExclusive` closes the gaps by
 * taking the write lock ONCE and handing the body this surface.
 *
 * The doors handed over are the host's UNLOCKED bodies, deliberately.
 * Making the lock itself re-entrant on a depth counter would let any
 * concurrent writer through the moment a batch held it - the counter is
 * per host, not per async context, and cannot tell the batch's own
 * continuation from someone else's. Handing the body the unlocked
 * bodies is re-entrancy that is scoped by construction.
 *
 * These types live outside `CampaignMatchHost` because the host file is
 * at its line budget; the same reason `campaignHostBatchCommit` and
 * `CampaignMatchHostOutcomeInbox` were lifted out before it.
 */

import type { CampaignIntentResult } from '@/types/campaign/CampaignSync';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

/** The roster-unit facts a `RosterUnitChanged` event carries. */
export interface ICampaignRosterUnitChange {
  readonly unitId: string;
  readonly designation: string;
  readonly status: 'operational' | 'damaged' | 'destroyed';
}

/** How a roster unit moved: added to, removed from, or repaired on the roster. */
export type CampaignRosterChangeKind = 'added' | 'removed' | 'repaired';

/**
 * The doors a batch body may drive. Already inside the caller's critical
 * section - none of these acquires the write lock, so none of them may
 * be called from anywhere but a `runBatchExclusive` body.
 */
export interface ICampaignHostBatchDoors {
  readonly applyHostIntent: (
    intent: ICampaignIntent,
  ) => Promise<CampaignIntentResult>;
  readonly creditSalvagePool: (
    value: number,
    reason: string,
  ) => Promise<CampaignIntentResult>;
  readonly applyRosterUnitChange: (
    campaignId: string,
    change: CampaignRosterChangeKind,
    unit: ICampaignRosterUnitChange,
    intentTag: string,
  ) => Promise<CampaignIntentResult>;
}
