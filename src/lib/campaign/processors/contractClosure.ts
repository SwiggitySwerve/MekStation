import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';
import type { Transaction } from '@/types/campaign/Transaction';

import { missionPayoutOutcome } from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { calculateTotalPayout } from '@/types/campaign/PaymentTerms';

import type { IDayEvent } from '../dayPipeline';

/**
 * Apply final payment for a fulfilled contract. Returns the updated
 * finance bundle and a day event describing the payout.
 */
export function applyContractClosure(
  campaign: ICampaign,
  contract: IContract,
  nowIso: string,
): {
  balance: Money;
  transactions: Transaction[];
  event: IDayEvent;
} {
  const outcome = missionPayoutOutcome(contract.status);
  const payout = calculateTotalPayout(contract.paymentTerms, outcome);
  const newBalance = campaign.finances.balance.add(payout);
  const txnId = `tx-contract-close-${contract.id}-${nowIso}`;

  const transactions = [
    ...campaign.finances.transactions,
    {
      id: txnId,
      type: TransactionType.Income,
      amount: payout,
      date: campaign.currentDate,
      description: `Final payment for contract ${contract.name} (${contract.status})`,
    },
  ];

  const event: IDayEvent = {
    type: 'contract_closed',
    description: `Contract "${contract.name}" closed (${contract.status}); paid ${payout.format()}`,
    severity: 'info',
    data: {
      contractId: contract.id,
      contractName: contract.name,
      status: contract.status,
      payoutAmount: payout.amount,
      employerId: contract.employerId,
      targetId: contract.targetId,
    },
  };

  return { balance: newBalance, transactions, event };
}
