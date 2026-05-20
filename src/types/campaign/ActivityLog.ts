/**
 * Activity log entry shape (`add-campaign-command-center`, Wave 6.1.B).
 *
 * The activity log is a 200-entry rolling FIFO buffer surfaced by the
 * dashboard's `<ActivityLogCard>` (and by the full-log page at
 * `/gameplay/campaigns/[id]/log`). Day-advance writes append; nothing
 * else in the campaign-management pipeline changes.
 *
 * The discriminant `category` lines up with `<ActivityLogCard>`'s 6
 * tab buckets. Each category-specific payload carries enough data for
 * the dashboard card to render a one-line summary without re-deriving
 * from the campaign store.
 *
 * The 6 categories cover the events the existing `runDayAdvancement`
 * pipeline emits as of Wave 5: cost deductions / loan payments
 * (`finances`), healing tickets (`medical`), pilot turnover events
 * (`personnel`), contract expiry + signing-bonus credit (`finances`),
 * mission completion events (`battle`), procurement deliveries
 * (`acquisitions`), maintenance check outcomes (`technical`). MekHQ's
 * 9-category log has 3 more (politics, skill, diplomacy) — those
 * categories don't emit events yet in MekStation and are intentionally
 * absent from this enum (no empty tabs).
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

// =============================================================================
// Category enum
// =============================================================================

/**
 * Activity log category. Discriminant for the IActivityLogEntry union.
 * The 6 buckets mirror the dashboard's <ActivityLogCard> tabs (task 3.5).
 */
export type ActivityLogCategory =
  | 'battle'
  | 'personnel'
  | 'medical'
  | 'finances'
  | 'acquisitions'
  | 'technical'
  | 'travel';

/**
 * Ordered list of all categories — useful for rendering tabs in a
 * stable order. Kept here (not in the card) so other surfaces (the
 * full log page, tests) share the same ordering.
 */
export const ACTIVITY_LOG_CATEGORIES: readonly ActivityLogCategory[] = [
  'battle',
  'personnel',
  'medical',
  'finances',
  'acquisitions',
  'technical',
  // Per `wire-starmap-into-campaign` (Wave 6.4): travel between star
  // systems emits a `'travel'` entry so the dashboard's activity-log
  // surface shows the jump in the same timeline as combat / personnel
  // changes.
  'travel',
];

// =============================================================================
// Category payloads
// =============================================================================

/**
 * Battle outcome event payload. Emitted when a mission completes — win,
 * loss, draw — so the activity log carries a one-line summary the
 * dashboard can render without re-deriving from the mission history.
 */
export interface IBattleActivityPayload {
  readonly missionId: string;
  readonly missionName: string;
  readonly result: 'victory' | 'defeat' | 'draw';
  /** XP awarded to participating pilots, summed. */
  readonly xpAwarded?: number;
}

/** Personnel-side event — hire, fire, retire, desert, KIA, promote. */
export interface IPersonnelActivityPayload {
  readonly pilotId: string;
  readonly pilotName: string;
  readonly event:
    | 'hired'
    | 'fired'
    | 'retired'
    | 'deserted'
    | 'kia'
    | 'promoted';
}

/** Medical event — pilot enters or exits the medical bay. */
export interface IMedicalActivityPayload {
  readonly pilotId: string;
  readonly pilotName: string;
  readonly event: 'injured' | 'recovered';
  /** Days-to-recovery for an `injured` event; absent for `recovered`. */
  readonly daysToRecovery?: number;
}

/** Finances event — daily cost, loan payment, contract pay-in, etc. */
export interface IFinancesActivityPayload {
  readonly event:
    | 'daily-costs'
    | 'loan-payment'
    | 'contract-payout'
    | 'contract-signing-bonus'
    | 'contract-expiry'
    | 'spend'
    | 'income';
  /** Signed delta on the company balance. Negative = debit, positive = credit. */
  readonly amount: number;
  readonly currency: 'C-bills';
  /** Optional human-readable rationale shown alongside the amount. */
  readonly memo?: string;
}

/** Acquisitions event — part / supply order placed or delivered. */
export interface IAcquisitionsActivityPayload {
  readonly orderId: string;
  readonly event: 'placed' | 'delivered' | 'cancelled';
  readonly itemName: string;
  readonly quantity: number;
}

/** Technical event — maintenance check, repair completion, refit commit. */
export interface ITechnicalActivityPayload {
  readonly event:
    | 'maintenance-pass'
    | 'maintenance-fail'
    | 'repair-complete'
    | 'refit-commit';
  readonly unitId: string;
  readonly unitName: string;
}

/**
 * Travel event — campaign force jumped between star systems.
 * Per `wire-starmap-into-campaign` (Wave 6.4): emitted by
 * `useCampaignStore.travelToSystem` when the player commits a jump.
 * The `fromSystemId` is the previous `campaign.currentSystemId` (or
 * `'terra'` when the field was unset — the legacy-campaign default).
 */
export interface ITravelActivityPayload {
  readonly event: 'jump';
  /** Star system the force left. */
  readonly fromSystemId: string;
  /** Star system the force arrived at. */
  readonly toSystemId: string;
  /** Display name of the destination — denormalized so the dashboard doesn't have to re-resolve the id. */
  readonly toSystemName: string;
}

// =============================================================================
// Discriminated union
// =============================================================================

/**
 * Common fields on every IActivityLogEntry. Carried inline by each
 * union member so the discriminant `category` is at the top level
 * and `payload` is category-narrowed.
 */
interface IActivityLogEntryBase {
  /** Stable unique id for React keys + dedup (uuid-like). */
  readonly id: string;
  /** ISO8601 timestamp of when the entry was emitted (wall-clock). */
  readonly timestamp: string;
  /** Campaign day on which the event occurred (1-based). */
  readonly campaignDay: number;
  /** Human-readable one-line summary the dashboard renders. */
  readonly message: string;
}

/** Per-category discriminated union member. */
export type IActivityLogEntry =
  | (IActivityLogEntryBase & {
      readonly category: 'battle';
      readonly payload: IBattleActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'personnel';
      readonly payload: IPersonnelActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'medical';
      readonly payload: IMedicalActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'finances';
      readonly payload: IFinancesActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'acquisitions';
      readonly payload: IAcquisitionsActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'technical';
      readonly payload: ITechnicalActivityPayload;
    })
  | (IActivityLogEntryBase & {
      readonly category: 'travel';
      readonly payload: ITravelActivityPayload;
    });

// =============================================================================
// Retention cap
// =============================================================================

/**
 * Maximum entries retained in the activity log slice (task 1.2). When
 * an `appendActivityLogEntry` call would push the size above this cap,
 * the slice drops the oldest entries (FIFO) until size <= cap. Bounded
 * retention is the only thing keeping the persisted log from growing
 * without bound across long campaigns.
 */
export const ACTIVITY_LOG_MAX_ENTRIES = 200;

// =============================================================================
// Type guards
// =============================================================================

/** True iff `value` looks like an IActivityLogEntry. Defensive; used at the persistence boundary. */
export function isActivityLogEntry(value: unknown): value is IActivityLogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<IActivityLogEntry>;
  return (
    typeof v.id === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.campaignDay === 'number' &&
    typeof v.message === 'string' &&
    typeof v.category === 'string' &&
    ACTIVITY_LOG_CATEGORIES.includes(v.category as ActivityLogCategory) &&
    typeof v.payload === 'object' &&
    v.payload !== null
  );
}
