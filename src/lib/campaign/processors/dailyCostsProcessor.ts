import { ICampaign } from '@/types/campaign/Campaign';

import { processDailyCosts } from '../dayAdvancement';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
} from '../dayPipeline';
import { asEventDataRecord } from '../utils/processorHelpers';

export const dailyCostsProcessor: IDayProcessor = {
  id: 'dailyCosts',
  phase: DayPhase.FINANCES,
  displayName: 'Daily Costs',

  process(campaign: ICampaign): IDayProcessorResult {
    if (campaign.options.useRoleBasedSalaries) {
      return { events: [], campaign };
    }

    const result = processDailyCosts(campaign);

    const events: IDayEvent[] = [];

    if (result.costs.total.amount > 0) {
      events.push({
        type: 'daily_costs',
        description: `Daily costs: ${result.costs.total.format()} (${result.costs.personnelCount} personnel, ${result.costs.unitCount} units)`,
        severity: result.finances.balance.isNegative() ? 'warning' : 'info',
        data: asEventDataRecord(result.costs),
      });
    }

    const updatedCampaign: ICampaign = {
      ...campaign,
      finances: result.finances,
    };

    return { events, campaign: updatedCampaign };
  },
};
