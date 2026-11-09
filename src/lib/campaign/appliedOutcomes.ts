/**
 * Applied combat outcomes: the in-game application day and its retention.
 *
 * `ICombatOutcome.capturedAt` is a WALL-CLOCK instant ("when this outcome was
 * derived"); campaign code never compares it with a campaign date. A campaign's
 * date is an in-game date (a fresh campaign starts at the wall clock and then
 * advances one day per day processed; a campaign set in an era is centuries
 * away from it), so the two are different timelines. The campaign's own time for
 * an applied outcome is `appliedOn`, stamped from `campaign.currentDate` by
 * `applyPostBattle` at the moment of application.
 *
 * Everything that needs "how old is this applied outcome" reads it here.
 *
 * @spec openspec/changes/fix-captured-at-time-domain/specs/campaign-refit-and-prestige/spec.md
 */

import type { IAppliedCombatOutcome } from '@/types/combat/CombatOutcome';

import { campaignDaysBetween } from './campaignCalendar';

/** How many in-game days an applied outcome stays in `recentlyAppliedOutcomes`. */
export const APPLIED_OUTCOME_RETENTION_DAYS = 31;

function hasValidAppliedOn(outcome: IAppliedCombatOutcome): boolean {
  return (
    typeof outcome.appliedOn === 'string' &&
    !Number.isNaN(Date.parse(outcome.appliedOn))
  );
}

/**
 * The outcome as it is recorded once applied on `day` (the campaign date at
 * application). An existing valid `appliedOn` is kept.
 */
export function withAppliedOn<T extends IAppliedCombatOutcome>(
  outcome: T,
  day: Date,
): T {
  return hasValidAppliedOn(outcome)
    ? outcome
    : { ...outcome, appliedOn: day.toISOString() };
}

/**
 * Stamp `day` on every entry that has no valid `appliedOn`: the old-save shim.
 * Old saves hold entries with a wall-clock `capturedAt` and no `appliedOn`;
 * their application day is unknown, so they are treated as applied on `day`
 * (the loaded campaign's date) and keep a full retention from there. Nothing is
 * dropped, `capturedAt` is not read, and the call is idempotent. Returns the
 * input array itself when there is nothing to stamp.
 */
export function stampMissingAppliedOn(
  outcomes: readonly IAppliedCombatOutcome[] | undefined,
  day: Date,
): readonly IAppliedCombatOutcome[] | undefined {
  if (outcomes === undefined || outcomes.every(hasValidAppliedOn)) {
    return outcomes;
  }
  return outcomes.map((outcome) => withAppliedOn(outcome, day));
}

/**
 * Whether an applied outcome is still within retention on `asOf`: applied no
 * more than `APPLIED_OUTCOME_RETENTION_DAYS` calendar days ago. Counted in
 * calendar days, so a daylight-saving change cannot move the boundary. An entry
 * with no valid `appliedOn` has no age yet and is kept until it is stamped.
 */
export function isWithinOutcomeRetention(
  outcome: IAppliedCombatOutcome,
  asOf: Date,
): boolean {
  if (!hasValidAppliedOn(outcome)) return true;
  return (
    campaignDaysBetween(new Date(outcome.appliedOn as string), asOf) <=
    APPLIED_OUTCOME_RETENTION_DAYS
  );
}
