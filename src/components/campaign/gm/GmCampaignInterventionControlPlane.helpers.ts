import type { ActionLedger } from '@/lib/interventions/ActionLedger';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignProjectedEffect,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IGmVisibleActionLedgerRecord,
  IInterventionLedgerCommand,
  IPlayerVisibleActionLedgerRecord,
} from '@/types/interventions';

import { Money } from '@/types/campaign/Money';
import { TransactionType } from '@/types/campaign/Transaction';

export const MERCHANT_REVERSAL_ID = 'gm-ledger-merchant-reversal';
const MERCHANT_REVERSAL_AMOUNT_CENTS = -250_000;
export const GM_ACTOR_ID = 'gm-browser-control-plane';

export type GmCampaignPreview =
  import('@/types/interventions').IGmCascadePreview<
    IGmPrivateMetadata,
    IGmCampaignPublicEffect,
    IGmCampaignInterventionDomainPayload
  >;

export type PlayerLedgerRow =
  IPlayerVisibleActionLedgerRecord<IGmCampaignPublicEffect>;

export type GmLedgerRow = IGmVisibleActionLedgerRecord<
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IGmCampaignInterventionDomainPayload
>;

export function buildMerchantReversalCommand({
  actorId,
  campaign,
  conflicted,
}: {
  readonly actorId: string;
  readonly campaign: ICampaign;
  readonly conflicted: boolean;
}): IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> {
  const date =
    campaign.currentDate instanceof Date
      ? campaign.currentDate.toISOString()
      : new Date(campaign.currentDate).toISOString();

  return {
    domain: 'economy',
    kind: 'undo',
    actorId,
    targetRefs: [`campaign:${campaign.id}:finances`],
    payload: {
      correction: {
        family: 'funds-transaction',
        transactionId: MERCHANT_REVERSAL_ID,
        amountCents: MERCHANT_REVERSAL_AMOUNT_CENTS,
        description: 'GM merchant charge reversal',
        transactionType: TransactionType.PartPurchase,
        date,
      },
      privateMetadata: {
        reason:
          'Hidden campaign merchant reversal: duplicated charge from a black-market branch.',
        defaultOutcome:
          'Without this GM action the duplicated merchant charge remains on the campaign ledger.',
        hiddenNotes:
          'Merchant inventory clue remains GM-only until the players discover it in play.',
      },
      publicSummary: 'Merchant charge corrected by -2,500.00 C-bills.',
      conflicts: conflicted
        ? [
            {
              code: 'merchant-cascade-ambiguous',
              message:
                'Merchant reversal may also affect a hidden contract option.',
              affectedRefs: [`campaign:${campaign.id}:contractMarket`],
              requiresManualTakeover: true,
            },
          ]
        : undefined,
    },
  };
}

export function refreshLedgerRows(
  actionLedger: ActionLedger,
  setPlayerRows: (rows: readonly PlayerLedgerRow[]) => void,
  setGmRows: (rows: readonly GmLedgerRow[]) => void,
): void {
  setPlayerRows(actionLedger.projectForPlayer<IGmCampaignPublicEffect>());
  setGmRows(
    actionLedger.projectForGm<
      IGmCampaignPublicEffect,
      IGmPrivateMetadata,
      IGmCampaignInterventionDomainPayload
    >(),
  );
}

export function findFundsEffect(
  events: readonly unknown[],
): Extract<
  IGmCampaignProjectedEffect,
  { readonly family: 'funds-transaction' }
> | null {
  for (const event of events) {
    if (
      event &&
      typeof event === 'object' &&
      (event as { family?: unknown }).family === 'funds-transaction'
    ) {
      return event as Extract<
        IGmCampaignProjectedEffect,
        { readonly family: 'funds-transaction' }
      >;
    }
  }
  return null;
}

export function formatCents(cents: number): string {
  return Money.fromCents(cents).format();
}

export function formatSignedCents(cents: number): string {
  const formatted = formatCents(Math.abs(cents));
  return cents < 0 ? `-${formatted}` : `+${formatted}`;
}

export type GmCampaignUpdate = Partial<IGmCampaignInterventionState>;
