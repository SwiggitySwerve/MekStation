import type { IDayEvent } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';

import type { CampaignStore } from './useCampaignStore.types';

interface IContractPaymentActivityOptions {
  readonly campaignDay?: number;
  readonly dayId?: string;
  readonly timestamp?: string;
}

export function appendContractPaymentActivityEntries(
  append: CampaignStore['appendActivityLogEntry'],
  campaign: ICampaign,
  events: readonly IDayEvent[],
  options: IContractPaymentActivityOptions = {},
): void {
  const campaignDay = options.campaignDay ?? campaignDayFor(campaign);
  const dayId =
    options.dayId ?? campaign.currentDate.toISOString().slice(0, 10);
  const timestamp = options.timestamp ?? new Date().toISOString();
  const emittedContractIds = new Set<string>();

  for (const event of events) {
    if (event.type !== 'contract_payment' && event.type !== 'contract_closed') {
      continue;
    }
    const data = event.data ?? {};
    const contractId = data.contractId;
    const payoutAmount = data.payoutAmount;
    if (
      typeof contractId !== 'string' ||
      typeof payoutAmount !== 'number' ||
      !Number.isFinite(payoutAmount) ||
      emittedContractIds.has(contractId)
    ) {
      continue;
    }
    emittedContractIds.add(contractId);
    const contractName =
      typeof data.contractName === 'string' ? data.contractName : contractId;

    append({
      id: `act-finances-contract-payout-${campaign.id}-${contractId}-${dayId}`,
      category: 'finances',
      timestamp,
      campaignDay,
      message: `Contract "${contractName}" final payment: ${payoutAmount.toLocaleString()} C-bills`,
      payload: {
        event: 'contract-payout',
        amount: payoutAmount,
        currency: 'C-bills',
        memo: contractName,
      },
    });
  }
}

function campaignDayFor(campaign: ICampaign): number {
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.floor(
      (campaign.currentDate.getTime() - startDate.getTime()) / msPerDay,
    ),
  );
}
