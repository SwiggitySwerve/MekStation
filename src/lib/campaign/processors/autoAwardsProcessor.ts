import { IAwardGrantEvent } from '@/types/campaign/awards/autoAwardTypes';
import { ICampaign } from '@/types/campaign/Campaign';

import { processAutoAwards } from '../awards/autoAwardEngine';
import {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
  DayPhase,
  isFirstOfMonth,
} from '../dayPipeline';

function applyAwardGrants(
  campaign: ICampaign,
  grantEvents: IAwardGrantEvent[],
): ICampaign {
  if (grantEvents.length === 0) return campaign;

  const updatedPersonnel = new Map(campaign.personnel);

  for (const event of grantEvents) {
    const person = updatedPersonnel.get(event.personId);
    if (!person) continue;

    const existingAwards = person.awards ?? [];
    const updatedPerson = {
      ...person,
      awards: [...existingAwards, event.awardId],
    };
    updatedPersonnel.set(event.personId, updatedPerson);
  }

  return {
    ...campaign,
    personnel: updatedPersonnel,
  };
}

export const autoAwardsProcessor: IDayProcessor = {
  id: 'auto-awards',
  phase: DayPhase.PERSONNEL,
  displayName: 'Auto Awards',
  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (!isFirstOfMonth(date)) {
      return { events: [], campaign };
    }

    const grantEvents = processAutoAwards(campaign, 'monthly');
    const updatedCampaign = applyAwardGrants(campaign, grantEvents);

    const dayEvents: IDayEvent[] = grantEvents.map((event) => ({
      type: 'award_granted',
      description: `${event.awardName} awarded to personnel ${event.personId}`,
      severity: 'info' as const,
      data: {
        personId: event.personId,
        awardId: event.awardId,
        awardName: event.awardName,
        category: event.category,
      },
    }));

    return { events: dayEvents, campaign: updatedCampaign };
  },
};

export function processPostMissionAwards(
  campaign: ICampaign,
  _missionId: string,
): { updatedCampaign: ICampaign; events: IAwardGrantEvent[] } {
  const events = processAutoAwards(campaign, 'post_mission');
  const updatedCampaign = applyAwardGrants(campaign, events);
  return { updatedCampaign, events };
}

export function processPostScenarioAwards(
  campaign: ICampaign,
  _scenarioId: string,
): { updatedCampaign: ICampaign; events: IAwardGrantEvent[] } {
  const events = processAutoAwards(campaign, 'post_scenario');
  const updatedCampaign = applyAwardGrants(campaign, events);
  return { updatedCampaign, events };
}
