import type { ActionLedger } from '@/lib/interventions/ActionLedger';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignProjectedEffect,
  IGmCampaignPublicEffect,
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionCommandPayload,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadeProjectedEffect,
  IGmTimeCascadePublicEffect,
  IGmVisibleActionLedgerRecord,
  IInterventionLedgerCommand,
  IPlayerVisibleActionLedgerRecord,
} from '@/types/interventions';

import { Money } from '@/types/campaign/Money';
import { TransactionType } from '@/types/campaign/Transaction';

export const MERCHANT_REVERSAL_ID = 'gm-ledger-merchant-reversal';
export const TIME_CASCADE_ID = 'gm-ledger-time-cascade';
export const TIME_CASCADE_MANUAL_ID = 'gm-ledger-time-cascade-manual';
const MERCHANT_REVERSAL_AMOUNT_CENTS = -250_000;
export const GM_ACTOR_ID = 'gm-browser-control-plane';

export type GmLedgerPublicEffect =
  | IGmCampaignPublicEffect
  | IGmTimeCascadePublicEffect;

export type GmLedgerDomainPayload =
  | IGmCampaignInterventionDomainPayload
  | IGmTimeCascadeInterventionDomainPayload;

export type GmCampaignPreview = IGmCascadePreview<
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
>;

export type GmTimeCascadePreview = IGmCascadePreview<
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
>;

export type GmLedgerPreview = IGmCascadePreview<
  IGmPrivateMetadata,
  GmLedgerPublicEffect,
  GmLedgerDomainPayload
>;

export type PlayerLedgerRow =
  IPlayerVisibleActionLedgerRecord<GmLedgerPublicEffect>;

export type GmLedgerRow = IGmVisibleActionLedgerRecord<
  GmLedgerPublicEffect,
  IGmPrivateMetadata,
  GmLedgerDomainPayload
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

export function buildTimeCascadeCommand({
  actorId,
  campaign,
  conflicted,
  now,
}: {
  readonly actorId: string;
  readonly campaign: ICampaign;
  readonly conflicted: boolean;
  readonly now: () => string;
}): IInterventionLedgerCommand<IGmTimeCascadeInterventionCommandPayload> {
  const currentDate = campaign.currentDate.toISOString();
  const generatedAt = now();

  return {
    domain: 'time',
    kind: 'fix',
    actorId,
    targetRefs: [
      `campaign:${campaign.id}:currentDate`,
      `campaign:${campaign.id}:repairQueue`,
    ],
    payload: {
      correction: {
        family: 'time-advance',
        days: 2,
        baseUpdatedAt: campaign.updatedAt,
        baseCurrentDate: currentDate,
        generatedAt,
        externalEffectRefs: conflicted
          ? [`campaign:${campaign.id}:roster:pilot-fatigue`]
          : undefined,
      },
      privateMetadata: {
        reason:
          'Hidden time cascade correction: GM needs to reconcile accumulated downtime before the next contract.',
        defaultOutcome:
          'Without this GM action the campaign date, repairs, markets, and upkeep stay on their previous timeline.',
        hiddenNotes:
          'Secret employer deadline pressure remains GM-only until the contract clock matters in play.',
      },
      publicSummary: conflicted
        ? 'GM opened a time-cascade review. No campaign state changed.'
        : 'Campaign time corrected by 2 days.',
    },
  };
}

export function refreshLedgerRows(
  actionLedger: ActionLedger,
  setPlayerRows: (rows: readonly PlayerLedgerRow[]) => void,
  setGmRows: (rows: readonly GmLedgerRow[]) => void,
): void {
  setPlayerRows(actionLedger.projectForPlayer<GmLedgerPublicEffect>());
  setGmRows(
    actionLedger.projectForGm<
      GmLedgerPublicEffect,
      IGmPrivateMetadata,
      GmLedgerDomainPayload
    >(),
  );
}

export function buildPersistedCampaignEventRows(
  events: readonly IGmCampaignProjectedEffect[] | undefined,
  createdAt: string,
  actorId: string = GM_ACTOR_ID,
): {
  readonly playerRows: readonly PlayerLedgerRow[];
  readonly gmRows: readonly GmLedgerRow[];
} {
  const playerRows: PlayerLedgerRow[] = (events ?? []).map((event, index) => ({
    id: `persisted:${event.interventionId ?? event.type}:${index}`,
    sequence: index + 1,
    recordKind: 'gm-intervention',
    actorId,
    actorRole: 'gm',
    domain: event.domain,
    action: 'fix',
    status: 'approved',
    targetRefs: event.changedStateRefs,
    publicEffect: {
      summary: event.publicSummary,
      family: event.family,
      changedStateRefs: event.changedStateRefs,
    },
    interventionRecordId: event.interventionId,
    createdAt,
    approvedAt: createdAt,
  }));

  return {
    playerRows,
    gmRows: playerRows.map((row) => ({ ...row })),
  };
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

export function findTimeEffect(
  events: readonly unknown[],
): IGmTimeCascadeProjectedEffect | null {
  for (const event of events) {
    if (
      event &&
      typeof event === 'object' &&
      (event as { family?: unknown }).family === 'time-advance'
    ) {
      return event as IGmTimeCascadeProjectedEffect;
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

export function formatDate(value: string): string {
  return value.slice(0, 10);
}

export type GmCampaignUpdate = Partial<
  IGmCampaignInterventionState & IGmTimeCascadeInterventionState
>;
