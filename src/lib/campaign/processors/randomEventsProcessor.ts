import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRandomEvent } from '@/types/campaign/events/randomEventTypes';
import type { IPerson } from '@/types/campaign/Person';

import { processGrayMonday } from '@/lib/campaign/events/grayMonday';
import { processLifeEvents } from '@/lib/campaign/events/lifeEvents';
import {
  processPrisonerEvents,
  countPrisoners,
} from '@/lib/campaign/events/prisonerEvents';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

import type {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
} from '../dayPipeline';

import { DayPhase } from '../dayPipeline';

// Transitional bridge for PR2: synthesize a minimal ICampaignRosterEntry from
// an IPerson so the migrated event helpers can be called against the legacy
// `campaign.personnel: Map<string, IPerson>` data source. PR3 repoints
// dayAdvancement to read entries directly from useCampaignRosterStore; PR4
// deletes the IPerson map entirely.
function personToMinimalEntry(person: IPerson): ICampaignRosterEntry {
  return {
    pilotId: person.id,
    pilotName: person.name,
    status:
      person.status === PersonnelStatus.KIA
        ? CampaignPilotStatus.KIA
        : person.status === PersonnelStatus.WOUNDED
          ? CampaignPilotStatus.Wounded
          : person.status === PersonnelStatus.MIA
            ? CampaignPilotStatus.MIA
            : CampaignPilotStatus.Active,
    wounds: person.hits ?? 0,
    recoveryTime: person.daysToWaitForHealing ?? 0,
    xp: person.xp ?? 0,
    campaignXpEarned: person.totalXpEarned ?? 0,
    campaignKills: person.totalKills ?? 0,
    campaignMissions: person.missionsCompleted ?? 0,
    hireDate: person.recruitmentDate ?? new Date(0),
    primaryRole:
      (person.primaryRole as CampaignPersonnelRole) ??
      CampaignPersonnelRole.PILOT,
    rankIndex: person.rankIndex ?? 0,
    isFounder: person.isFounder,
    isCommander: person.isCommander,
  };
}

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

    // Synthesize entry+pilot pairs from legacy IPerson map (PR2 transitional shim).
    // pilot is null for all entries — vault joins are deferred to PR3.
    const entries = Array.from(campaign.personnel.values()).map((person) => ({
      entry: personToMinimalEntry(person),
      pilot: null as null,
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
