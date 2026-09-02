/**
 * Role-scoped authoritative campaign activity (umbrella task 8.3).
 *
 * `Campaign Activity Is a Role-Scoped Projection` asks that activity
 * feeds "derive from authoritative journal and audit facts and SHALL be
 * projected by viewer role rather than stored only in browser-global
 * state". What exists today is `useCampaignStore.activityLog`: a
 * 200-entry FIFO array in ONE browser, appended by that browser's own
 * day-advance pipeline, persisted to that browser's storage, and
 * readable in full by whoever holds it. Three participants therefore
 * hold three logs that need not agree, none of them outlives the
 * browser, and role has never entered into what any of them shows.
 *
 * This module is the JOURNAL half of the replacement: a pure derivation
 * from the committed campaign stream, projected per viewer.
 *
 * TWO LEVELS OF SCOPING, and the second is the one admission alone
 * cannot express.
 *
 * 1. ADMISSION - which facts a viewer may see at all. Delegated
 *    wholesale to `campaignViewerVisibleEvents`, the shared per-viewer
 *    projection contract, with the caller's own predicate injected.
 *    There is deliberately NO second role filter here: a feed that
 *    re-decided visibility would be a second audience policy, free to
 *    drift from the one the wire, replay, snapshot, and export surfaces
 *    already agree on.
 *
 * 2. PRIVATE DETAIL ON AN ADMITTED FACT. `ParticipantRemoved` carries an
 *    optional `reason` documented as "audited GM rationale", and its
 *    default scope is `campaign` - so every player is admitted to the
 *    fact AND, through it, to the GM's reason for it. Admission cannot
 *    separate the two, because the removal genuinely IS public and the
 *    rationale genuinely is not. The projection therefore renders the
 *    removal for everyone and the rationale only for a viewer holding
 *    GM private detail.
 *
 * NOT REPROJECTED HERE, and named rather than quietly skipped: the
 * AUDIT half of "journal and audit facts". Role-scoped audit rows
 * already exist - `ViewerHistoryService.readViewerTimeline` splits GM
 * and player variants over the action-audit repository - and deriving
 * them a second time is exactly the second audience policy rule 1
 * refuses. A surface that wants both composes the two feeds; it does
 * not ask this module to grow an audit opinion.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { CampaignScopeAdmits } from '@/lib/campaign/sync/campaignViewerProjection';
import type { ActivityLogCategory } from '@/types/campaign/ActivityLog';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { campaignViewerVisibleEvents } from '@/lib/campaign/sync/campaignViewerProjection';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

/**
 * One viewer's activity audience, as the two questions this projection
 * asks it.
 *
 * `seesGmPrivateDetail` is named for the capability it grants rather
 * than for the seat that holds it, so it reads as a second question
 * about the same viewer instead of a second copy of the role check.
 */
export interface ICampaignActivityViewer {
  /** Injected admission predicate - the shared audience policy. */
  readonly admits: CampaignScopeAdmits;
  /** Whether GM-private rationale carried on an admitted fact is shown. */
  readonly seesGmPrivateDetail: boolean;
}

/** One row of a viewer's authoritative activity feed. */
export interface ICampaignActivityEntry {
  /**
   * Position within THIS viewer's visible feed, gapless by construction.
   *
   * Deliberately NOT the journal sequence. A concealed fact leaves a
   * hole in the authority numbering, and handing a player numbers drawn
   * from it would let arithmetic on their own feed reveal how many facts
   * were withheld and where they fell - the side channel
   * `campaignViewerProjection` strips `sequence` from its digest
   * material to avoid, and the one `viewerSequenceConcealmentLeak`
   * measures on the match side.
   */
  readonly ordinal: number;
  /** Host wall-clock time the fact committed. */
  readonly occurredAt: string;
  /** Campaign day established by the facts THIS viewer can see. */
  readonly campaignDay: number;
  /** Feed bucket, sharing the surface vocabulary the log already uses. */
  readonly category: ActivityLogCategory;
  /** One-line summary, already redacted for this viewer. */
  readonly message: string;
  /** Participant that committed the fact. */
  readonly actorPlayerId: string;
}

/** A rendered fact: its bucket and its viewer-safe one-line summary. */
interface ICampaignActivityDescription {
  readonly category: ActivityLogCategory;
  readonly message: string;
}

/**
 * C-bill amounts in one form, so two rows about the same money read the
 * same way. An explicit locale keeps the string independent of whatever
 * locale the host process happens to run under.
 */
function formatCBills(amount: number): string {
  return `${amount.toLocaleString('en-US')} C-bills`;
}

/**
 * Render one committed fact for one viewer, or `null` when the fact is
 * context rather than activity.
 *
 * Two types return null on purpose:
 *   - `CampaignSnapshotPublished` is a baseline, not something that
 *     happened - folding it into a row would announce a re-sync as
 *     campaign news;
 *   - `CampaignDayAdvanced` is the clock the other rows are stamped
 *     with. The existing browser log takes the same position: a day
 *     advance surfaces as the finance, medical, and repair entries it
 *     produced, never as a row of its own.
 *
 * The `switch` is exhaustive over `CampaignEventType` through the
 * `never` default, so a ninth event type is a compile error here rather
 * than a fact that silently never reaches anyone's feed.
 */
function describeCampaignFact(
  event: ICampaignEvent,
  seesGmPrivateDetail: boolean,
): ICampaignActivityDescription | null {
  switch (event.type) {
    case 'CampaignDayAdvanced':
    case 'CampaignSnapshotPublished':
      return null;
    case 'FundsChanged': {
      const { delta, reason, balance } = event.payload;
      const direction = delta < 0 ? 'Spent' : 'Received';
      return {
        category: 'finances',
        message: `${direction} ${formatCBills(Math.abs(delta))} — ${reason} (balance ${formatCBills(balance)})`,
      };
    }
    case 'PilotHired': {
      const { pilot, cost } = event.payload;
      return {
        category: 'personnel',
        message: `Hired ${pilot.name} for ${formatCBills(cost)}`,
      };
    }
    case 'ContractAccepted': {
      // Filed under finances rather than battle: accepting a contract
      // commits the campaign to terms, and the fighting it leads to
      // arrives later as its own mission facts.
      const { contract } = event.payload;
      return {
        category: 'finances',
        message: `Accepted contract ${contract.name} for ${contract.employerFactionId}`,
      };
    }
    case 'RosterUnitChanged': {
      const { change, unit } = event.payload;
      // A repair is technical work; gaining or losing a unit is a change
      // in what the force owns.
      return {
        category: change === 'repaired' ? 'technical' : 'acquisitions',
        message: `${unit.designation} ${change}`,
      };
    }
    case 'SalvageAllocated': {
      const { value, poolRemaining, recoveredUnit } = event.payload;
      const recovered = recoveredUnit
        ? ` — recovered ${recoveredUnit.designation}`
        : '';
      return {
        category: 'acquisitions',
        message: `Allocated ${formatCBills(value)} of salvage${recovered} (${formatCBills(poolRemaining)} left in the pool)`,
      };
    }
    case 'ParticipantRemoved': {
      const { participantId, reason } = event.payload;
      // The removal is a campaign-scoped fact and stays visible to
      // everyone. The rationale is the GM's audited note and does not.
      const rationale =
        seesGmPrivateDetail && reason !== undefined ? ` — ${reason}` : '';
      return {
        category: 'personnel',
        message: `Removed participant ${participantId}${rationale}`,
      };
    }
    default: {
      const exhaustive: never = event;
      void exhaustive;
      return null;
    }
  }
}

/**
 * Project one campaign stream into one viewer's activity feed.
 *
 * The fold runs over the VISIBLE set only, which is what makes the day
 * stamped on each row honest: a viewer whose day advance was withheld is
 * shown the day their own facts establish, not one borrowed from facts
 * they may not see. State is advanced BEFORE the row is built so a fact
 * is described alongside the campaign it produced.
 */
export function projectCampaignActivityForViewer(
  campaignId: string,
  events: readonly ICampaignEvent[],
  viewer: ICampaignActivityViewer,
): readonly ICampaignActivityEntry[] {
  const visible = campaignViewerVisibleEvents(events, viewer.admits);
  let state: ICampaignAuthoritativeState = createEmptyCampaignState(campaignId);
  const entries: ICampaignActivityEntry[] = [];
  for (const event of visible) {
    state = applyCampaignEvent(state, event);
    const described = describeCampaignFact(event, viewer.seesGmPrivateDetail);
    if (described === null) continue;
    entries.push({
      ordinal: entries.length,
      occurredAt: event.ts,
      campaignDay: state.day,
      category: described.category,
      message: described.message,
      actorPlayerId: event.authorPlayerId,
    });
  }
  return Object.freeze(entries);
}
