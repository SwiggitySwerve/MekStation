/**
 * Morale Day Processor — day-pipeline integration
 *
 * Gathers the day's enumerated morale signals, evaluates at most one
 * morale state transition (`evaluateMoraleTransition`), applies it to the
 * campaign, and emits a day event when morale changes
 * (`add-campaign-refit-and-prestige` design D9).
 *
 * Phase: EVENTS — the "random events, faction standing" block. It runs
 * after the battle-effects block and daily costs so the day's victory /
 * defeat / pay / desertion signals are all settled before morale is
 * evaluated.
 *
 * A day with no morale-affecting signals yields no transition — the
 * campaign is returned unchanged (reference equality preserved).
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/processors/moraleProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';

import { MORALE_DEFAULT } from '@/types/campaign/Prestige';

import { stampMissingAppliedOn } from '../appliedOutcomes';
import {
  DayPhase,
  getDayEventsSoFar,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';
import {
  filterRecentMoraleOutcomes,
  gatherMoraleSignals,
} from '../prestige/gatherMoraleSignals';
import { evaluateMoraleTransition } from '../prestige/moraleStateMachine';

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Day-pipeline processor: evaluates company morale once per day and
 * applies at most one step transition.
 *
 * Runs in `DayPhase.EVENTS`.
 */
export const moraleProcessor: IDayProcessor = {
  id: 'morale',
  phase: DayPhase.EVENTS,
  displayName: 'Company Morale',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const currentState = campaign.moraleState ?? MORALE_DEFAULT;
    const dayEvents = getDayEventsSoFar(campaign);
    // An entry with no application day (an old save, or state written outside
    // `applyPostBattle`) is stamped with today, then the list is pruned to the
    // retention window by in-game days.
    const stampedOutcomes = stampMissingAppliedOn(
      campaign.recentlyAppliedOutcomes,
      date,
    );
    const stampedCampaign =
      stampedOutcomes === campaign.recentlyAppliedOutcomes
        ? campaign
        : ({
            ...campaign,
            recentlyAppliedOutcomes: stampedOutcomes,
          } as ICampaign);
    const prunedOutcomes = filterRecentMoraleOutcomes(stampedCampaign, date);
    const originalOutcomeCount = campaign.recentlyAppliedOutcomes?.length ?? 0;
    const stampedChanged = stampedOutcomes !== campaign.recentlyAppliedOutcomes;

    // An outcome moves morale once, on the first evaluation after it is
    // applied. It stays in `recentlyAppliedOutcomes` for 31 days (other
    // processors read it), so the ids already counted are carried on the
    // campaign. After this pass every outcome still in the window is counted.
    const alreadyCounted = new Set(campaign.moraleCountedMatchIds ?? []);
    const uncountedOutcomes = prunedOutcomes.filter(
      (outcome) => !alreadyCounted.has(outcome.matchId),
    );
    const countedIds = Array.from(
      new Set(prunedOutcomes.map((outcome) => outcome.matchId)),
    );
    const countedUnchanged = sameIds(
      campaign.moraleCountedMatchIds ?? [],
      countedIds,
    );

    const campaignForSignals = {
      ...campaign,
      recentlyAppliedOutcomes: uncountedOutcomes,
    } as ICampaign;
    const signals = gatherMoraleSignals(campaignForSignals, dayEvents);

    const evaluation = evaluateMoraleTransition(
      currentState,
      signals,
      date.toISOString(),
    );

    // No transition — morale held. The campaign is returned as is unless the
    // outcome window or the counted ids moved.
    if (!evaluation.transition) {
      if (
        prunedOutcomes.length === originalOutcomeCount &&
        countedUnchanged &&
        !stampedChanged
      ) {
        return { events: [], campaign };
      }
      return {
        events: [],
        campaign: {
          ...campaign,
          recentlyAppliedOutcomes: prunedOutcomes,
          moraleCountedMatchIds: countedIds,
        } as ICampaign,
      };
    }

    const transitions = [
      ...(campaign.moraleTransitions ?? []),
      evaluation.transition,
    ];
    const updatedCampaign: ICampaign = {
      ...campaign,
      recentlyAppliedOutcomes: prunedOutcomes,
      moraleCountedMatchIds: countedIds,
      moraleState: evaluation.to,
      moraleTransitions: transitions,
    };

    const event: IDayEvent = {
      type: 'morale-changed',
      description: evaluation.transition.reason,
      severity: evaluation.direction === 'down' ? 'warning' : 'info',
      data: {
        from: evaluation.from,
        to: evaluation.to,
        direction: evaluation.direction,
        recentVictories: signals.recentVictories,
        recentDefeats: signals.recentDefeats,
        payMet: signals.payMet,
        desertions: signals.desertions,
      },
    };

    return { events: [event], campaign: updatedCampaign };
  },
};
