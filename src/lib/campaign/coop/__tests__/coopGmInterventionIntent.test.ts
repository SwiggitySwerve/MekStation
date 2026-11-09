/**
 * The ApplyGmIntervention intent for a GM ledger approval (K11): it carries
 * the approval's own intervention id, so the host's history entry and the
 * GM's session ledger row name the same intervention and merge into one row.
 * The control plane mints that id once per approval, so a resend of one
 * approval is one command and a second approval is another.
 */

import type { IGmCampaignFundsTransactionEffect } from '@/types/interventions';

import { createCampaign } from '@/types/campaign/Campaign';
import { TransactionType } from '@/types/campaign/Transaction';

import { gmFundsInterventionIntent } from '../coopGmIntervention';

function fundsEffect(
  interventionId: string,
): IGmCampaignFundsTransactionEffect {
  return {
    type: 'gm.campaign.funds_transaction_corrected',
    domain: 'economy',
    family: 'funds-transaction',
    interventionId,
    transactionId: interventionId,
    changedStateRefs: ['campaign:c:finances'],
    publicSummary: 'Merchant charge corrected by +2,500.00 C-bills.',
    before: { balanceCents: 38_000_000, transactionIds: [] },
    after: {
      balanceCents: 38_250_000,
      transaction: {
        id: interventionId,
        type: TransactionType.PartPurchase,
        amountCents: 250_000,
        date: '3025-01-01T00:00:00.000Z',
        description: 'GM merchant charge reversal',
      },
    },
  };
}

describe('gmFundsInterventionIntent', () => {
  const campaign = createCampaign('K11 Intent Co.', 'mercenary', {
    startingFunds: 380_000,
  });

  it('carries the approval intervention id and derives the intent id from it', () => {
    const approvalId = 'gm-ledger-merchant-reversal-m1abc-x9y8z7';

    const intent = gmFundsInterventionIntent(campaign, [
      fundsEffect(approvalId),
    ]);

    expect(intent).toEqual({
      kind: 'ApplyGmIntervention',
      campaignId: campaign.id,
      intentId: `gm-intervention-${approvalId}`,
      payload: {
        interventionId: approvalId,
        summary: 'Merchant charge corrected by +2,500.00 C-bills.',
        deltaCBills: 2500,
      },
    });
  });

  it('is one command for one approval and two for two approvals', () => {
    const first = gmFundsInterventionIntent(campaign, [fundsEffect('a-1')]);
    const resend = gmFundsInterventionIntent(campaign, [fundsEffect('a-1')]);
    const second = gmFundsInterventionIntent(campaign, [fundsEffect('a-2')]);

    expect(resend).toEqual(first);
    expect(second?.intentId).not.toBe(first?.intentId);
  });
});
