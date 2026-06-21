/**
 * Morale Signal Gatherer — distil a day into `IMoraleSignals`
 *
 * Pure function, no IO. The morale processor needs a fixed, enumerated set
 * of morale-affecting signals for the day (design D8). This module derives
 * those signals deterministically from:
 *
 *   - `campaign.recentlyAppliedOutcomes` — battle outcomes applied this day
 *     (the post-battle processor stages them); each one's
 *     `report.winner` decides victory vs defeat
 *   - the day's accumulated events — `daily_costs` severity tells whether
 *     pay was met, `turnover_departure` events with a `deserted` type are
 *     desertions
 *
 * Every signal is a named, deterministic function of campaign state and
 * the day's events — there is no hidden randomness.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/prestige/gatherMoraleSignals
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMoraleSignals } from '@/types/campaign/Prestige';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { type IDayEvent } from '../dayPipeline';

/**
 * Campaign extension carrying the outcomes applied earlier in the day. The
 * post-battle processor stages applied outcomes on `recentlyAppliedOutcomes`.
 */
interface ICampaignWithRecentOutcomes extends ICampaign {
  readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
}

const MORALE_OUTCOME_WINDOW_DAYS = 31;

export function filterRecentMoraleOutcomes(
  campaign: ICampaign,
  asOf: Date = campaign.currentDate,
): readonly ICombatOutcome[] {
  const extended = campaign as ICampaignWithRecentOutcomes;
  const cutoff =
    asOf.getTime() - MORALE_OUTCOME_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (extended.recentlyAppliedOutcomes ?? []).filter((outcome) => {
    const capturedAt = Date.parse(outcome.capturedAt);
    if (Number.isNaN(capturedAt)) return true;
    return capturedAt >= cutoff && capturedAt <= asOf.getTime();
  });
}

/**
 * Gather the day's enumerated morale signals.
 *
 * @param campaign - the campaign (read for `recentlyAppliedOutcomes`)
 * @param dayEvents - the events accumulated earlier in the day's pipeline
 * @returns the deterministic morale signal set for the day
 */
export function gatherMoraleSignals(
  campaign: ICampaign,
  dayEvents: readonly IDayEvent[],
): IMoraleSignals {
  const outcomes = filterRecentMoraleOutcomes(campaign);

  // Victories / defeats — one per applied outcome by its winner.
  let recentVictories = 0;
  let recentDefeats = 0;
  for (const outcome of outcomes) {
    if (outcome.report.winner === 'player') {
      recentVictories += 1;
    } else if (outcome.report.winner !== 'draw') {
      recentDefeats += 1;
    }
  }

  // Pay — a `daily_costs` event with `warning`/`critical` severity means
  // the campaign ran a negative balance, i.e. pay was not comfortably met.
  // Absent a daily-costs event, pay is treated as met.
  let payMet = true;
  for (const event of dayEvents) {
    if (event.type === 'daily_costs' && event.severity !== 'info') {
      payMet = false;
    }
  }

  // Desertions — `turnover_departure` events whose `departureType` is a
  // desertion (as opposed to retirement / contract end).
  let desertions = 0;
  for (const event of dayEvents) {
    if (event.type !== 'turnover_departure') continue;
    const departureType = event.data?.departureType;
    if (
      typeof departureType === 'string' &&
      departureType.toLowerCase().includes('desert')
    ) {
      desertions += 1;
    }
  }

  return { recentVictories, recentDefeats, payMet, desertions };
}
