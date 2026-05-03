import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRandomEvent } from '@/types/campaign/events/randomEventTypes';

import { processGrayMonday } from '@/lib/campaign/events/grayMonday';
import { processLifeEvents } from '@/lib/campaign/events/lifeEvents';
import {
  processPrisonerEvents,
  countPrisoners,
} from '@/lib/campaign/events/prisonerEvents';
import { personToMinimalEntry } from '@/lib/campaign/utils/personToRosterEntry';
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
    const random: () => number = Math.random;
    const allRandomEvents: IRandomEvent[] = [];

    // Read entries directly from roster store (PR3 task 5.2).
    // NPC entries whose pilotId has no vault counterpart resolve to null.
    const __storeEntries = useCampaignRosterStore.getState().pilots;
    const rosterEntries: readonly ICampaignRosterEntry[] =
      __storeEntries.length > 0
        ? __storeEntries
        : Array.from(campaign.personnel.values()).map(personToMinimalEntry);
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
