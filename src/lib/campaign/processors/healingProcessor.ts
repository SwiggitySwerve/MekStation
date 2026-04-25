import { ICampaign } from '@/types/campaign/Campaign';

import { processHealing } from '../dayAdvancement';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
} from '../dayPipeline';
import { asEventDataRecord } from '../utils/processorHelpers';

export const healingProcessor: IDayProcessor = {
  id: 'healing',
  phase: DayPhase.PERSONNEL,
  displayName: 'Personnel Healing',

  process(campaign: ICampaign): IDayProcessorResult {
    const result = processHealing(campaign.personnel);

    const events: IDayEvent[] = result.events.map((evt) => ({
      type: 'healing',
      description: evt.returnedToActive
        ? `${evt.personName} returned to active duty`
        : `${evt.personName} healed ${evt.healedInjuries.length} injury(s)`,
      severity: 'info' as const,
      data: asEventDataRecord(evt),
    }));

    const updatedCampaign: ICampaign = {
      ...campaign,
      personnel: result.personnel,
    };

    return { events, campaign: updatedCampaign };
  },
};
