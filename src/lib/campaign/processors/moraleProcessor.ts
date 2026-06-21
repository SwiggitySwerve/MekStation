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
    const prunedOutcomes = filterRecentMoraleOutcomes(campaign, date);
    const originalOutcomeCount = campaign.recentlyAppliedOutcomes?.length ?? 0;
    const campaignForSignals = {
      ...campaign,
      recentlyAppliedOutcomes: prunedOutcomes,
    } as ICampaign;
    const signals = gatherMoraleSignals(campaignForSignals, dayEvents);

    const evaluation = evaluateMoraleTransition(
      currentState,
      signals,
      date.toISOString(),
    );

    // No transition — morale held; return the campaign unchanged.
    if (!evaluation.transition) {
      return {
        events: [],
        campaign:
          prunedOutcomes.length === originalOutcomeCount
            ? campaign
            : campaignForSignals,
      };
    }

    const transitions = [
      ...(campaign.moraleTransitions ?? []),
      evaluation.transition,
    ];
    const updatedCampaign: ICampaign = {
      ...campaign,
      recentlyAppliedOutcomes: prunedOutcomes,
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
