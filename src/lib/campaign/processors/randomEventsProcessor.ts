import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRandomEvent } from '@/types/campaign/events/randomEventTypes';

import { processGrayMonday } from '@/lib/campaign/events/grayMonday';
import { processLifeEvents } from '@/lib/campaign/events/lifeEvents';
import {
  processPrisonerEvents,
  countPrisoners,
} from '@/lib/campaign/events/prisonerEvents';

import type {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
} from '../dayPipeline';

import { DayPhase } from '../dayPipeline';

function randomEventToDay(evt: IRandomEvent): IDayEvent {
  return {
    type: `random_event_${evt.category}`,
    description: `${evt.title}: ${evt.description}`,
    severity:
      evt.severity === 'critical'
        ? 'critical'
        : evt.severity === 'major'
          ? 'warning'
          : 'info',
    data: { randomEvent: evt },
  };
}

export const randomEventsProcessor: IDayProcessor = {
  id: 'random-events',
  phase: DayPhase.EVENTS,
  displayName: 'Random Events',
  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (campaign.options.useRandomEvents === false) {
      return { events: [], campaign };
    }

    const dateStr = date.toISOString();
    const random: () => number = Math.random;
    const allRandomEvents: IRandomEvent[] = [];

    // Life events (daily)
    if (campaign.options.useLifeEvents !== false) {
      allRandomEvents.push(
        ...processLifeEvents(campaign.personnel, dateStr, random),
      );
    }

    // Gray Monday (daily - checks specific dates)
    const grayEvent = processGrayMonday(
      dateStr,
      campaign.options.simulateGrayMonday === true,
      campaign.finances.balance.amount,
    );
    if (grayEvent) allRandomEvents.push(grayEvent);

    // Prisoner events (weekly on Mondays, monthly on 1st - handled internally)
    if (campaign.options.usePrisonerEvents !== false) {
      const prisonerCount = countPrisoners(campaign.personnel);
      allRandomEvents.push(
        ...processPrisonerEvents(prisonerCount, dateStr, random),
      );
    }

    const dayEvents: IDayEvent[] = allRandomEvents.map(randomEventToDay);

    return { events: dayEvents, campaign };
  },
};
