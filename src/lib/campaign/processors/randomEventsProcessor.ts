import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRandomEvent } from '@/types/campaign/events/randomEventTypes';

import { processGrayMonday } from '@/lib/campaign/events/grayMonday';
import { processLifeEvents } from '@/lib/campaign/events/lifeEvents';
import {
  processPrisonerEvents,
  countPrisoners,
} from '@/lib/campaign/events/prisonerEvents';
import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';

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
    // D-10 (2026-06-09 audit, W3.4): life/prisoner event rolls draw from
    // the campaign's seeded daily stream so days are replayable.
    const random: () => number = createDailyRandom(
      campaign,
      date,
      'random-events',
    );
    const allRandomEvents: IRandomEvent[] = [];

    // Read entries directly from roster store (canonical source per PR4
    // of `wire-iperson-hard-cutover`). NPC entries whose pilotId has no
    // vault counterpart resolve to null.
    const rosterEntries = useCampaignRosterStore.getState().pilots;
    const vault = usePilotStore.getState().pilots;
    const pilotsByPilotId = buildPilotLookup(vault);
    const entries = rosterEntries.map((entry) => ({
      entry,
      pilot: pilotsByPilotId.get(entry.pilotId) ?? null,
    }));

    // Life events (daily)
    if (campaign.options.useLifeEvents !== false) {
      allRandomEvents.push(...processLifeEvents(entries, dateStr, random));
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
      const prisonerCount = countPrisoners(entries.map((p) => p.entry));
      allRandomEvents.push(
        ...processPrisonerEvents(prisonerCount, dateStr, random),
      );
    }

    const dayEvents: IDayEvent[] = allRandomEvents.map(randomEventToDay);

    return { events: dayEvents, campaign };
  },
};
