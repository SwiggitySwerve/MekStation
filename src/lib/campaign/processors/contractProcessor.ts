import { ICampaign } from '@/types/campaign/Campaign';

import { processContracts } from '../dayAdvancement';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
} from '../dayPipeline';
import { asEventDataRecord } from '../utils/processorHelpers';

export const contractProcessor: IDayProcessor = {
  id: 'contracts',
  phase: DayPhase.MISSIONS,
  displayName: 'Contract Processing',

  process(campaign: ICampaign): IDayProcessorResult {
    const result = processContracts(campaign);

    const events: IDayEvent[] = result.events.map((evt) => ({
      type: 'contract_expired',
      description: `Contract "${evt.contractName}" completed`,
      severity: 'info' as const,
      data: asEventDataRecord(evt),
    }));

    const updatedCampaign: ICampaign = {
      ...campaign,
      missions: result.missions,
    };

    return { events, campaign: updatedCampaign };
  },
};
