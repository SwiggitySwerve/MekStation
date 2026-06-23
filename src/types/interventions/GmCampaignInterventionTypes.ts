import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';
import type { TransactionType } from '@/types/campaign/Transaction';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import type {
  IGmPrivateMetadata,
  IGmPublicEffect,
} from './GmInterventionAuthorityTypes';
import type { InterventionDomain } from './InterventionLedgerTypes';

export type GmCampaignInterventionDomain =
  | 'post-combat'
  | 'economy'
  | 'repair'
  | 'salvage';

export type GmCampaignCorrectionFamily =
  | 'salvage-allocation'
  | 'repair-ticket'
  | 'funds-transaction'
  | 'inventory-lot'
  | 'base-unit-state';

export interface IGmCampaignInterventionState extends ICampaign {
  readonly gmInterventionEvents?: readonly IGmCampaignProjectedEffect[];
}

export interface IGmCampaignInterventionConflictInput {
  readonly code: string;
  readonly message: string;
  readonly affectedRefs?: readonly string[];
  readonly requiresManualTakeover?: boolean;
}

export interface IGmCampaignSalvageAllocationCorrection {
  readonly family: 'salvage-allocation';
  readonly matchId: string;
  readonly allocation?: ISalvageAllocation;
  readonly patch?: Partial<ISalvageAllocation>;
  readonly remove?: boolean;
}

export interface IGmCampaignRepairTicketCorrection {
  readonly family: 'repair-ticket';
  readonly ticketId: string;
  readonly ticket?: IRepairTicket;
  readonly patch?: Partial<IRepairTicket>;
  readonly remove?: boolean;
}

export interface IGmCampaignFundsTransactionCorrection {
  readonly family: 'funds-transaction';
  readonly transactionId: string;
  readonly amountCents: number;
  readonly description: string;
  readonly transactionType?: TransactionType;
  readonly date?: string;
}

export interface IGmCampaignInventoryLotCorrection {
  readonly family: 'inventory-lot';
  readonly inventoryId: string;
  readonly item?: IPartsInventoryItem;
  readonly patch?: Partial<IPartsInventoryItem>;
  readonly quantityDelta?: number;
  readonly remove?: boolean;
}

export interface IGmCampaignBaseUnitStateCorrection {
  readonly family: 'base-unit-state';
  readonly unitId: string;
  readonly combatState?: IUnitCombatState;
  readonly combatStatePatch?: Partial<IUnitCombatState>;
  readonly configuration?: MechBuildConfig;
  readonly configurationPatch?: Partial<MechBuildConfig>;
  readonly removeCombatState?: boolean;
  readonly removeConfiguration?: boolean;
}

export type GmCampaignInterventionCorrection =
  | IGmCampaignSalvageAllocationCorrection
  | IGmCampaignRepairTicketCorrection
  | IGmCampaignFundsTransactionCorrection
  | IGmCampaignInventoryLotCorrection
  | IGmCampaignBaseUnitStateCorrection;

export interface IGmCampaignInterventionCommandPayload {
  readonly correction: GmCampaignInterventionCorrection;
  readonly privateMetadata: IGmPrivateMetadata;
  readonly publicSummary?: string;
  readonly visibleToPlayerIds?: readonly string[];
  readonly conflicts?: readonly IGmCampaignInterventionConflictInput[];
}

export interface IGmCampaignProjectedTransaction {
  readonly id: string;
  readonly type: TransactionType;
  readonly amountCents: number;
  readonly date: string;
  readonly description: string;
}

export type GmCampaignProjectedEffectType =
  | 'gm.campaign.salvage_allocation_corrected'
  | 'gm.campaign.repair_ticket_corrected'
  | 'gm.campaign.funds_transaction_corrected'
  | 'gm.campaign.inventory_lot_corrected'
  | 'gm.campaign.base_unit_state_corrected';

export interface IGmCampaignProjectedEffectBase<TType extends string> {
  readonly type: TType;
  readonly domain: InterventionDomain;
  readonly family: GmCampaignCorrectionFamily;
  readonly interventionId?: string;
  readonly changedStateRefs: readonly string[];
  readonly publicSummary: string;
}

export interface IGmCampaignSalvageAllocationEffect extends IGmCampaignProjectedEffectBase<'gm.campaign.salvage_allocation_corrected'> {
  readonly family: 'salvage-allocation';
  readonly matchId: string;
  readonly before?: ISalvageAllocation;
  readonly after?: ISalvageAllocation;
}

export interface IGmCampaignRepairTicketEffect extends IGmCampaignProjectedEffectBase<'gm.campaign.repair_ticket_corrected'> {
  readonly family: 'repair-ticket';
  readonly ticketId: string;
  readonly before?: IRepairTicket;
  readonly after?: IRepairTicket;
}

export interface IGmCampaignFundsTransactionEffect extends IGmCampaignProjectedEffectBase<'gm.campaign.funds_transaction_corrected'> {
  readonly family: 'funds-transaction';
  readonly transactionId: string;
  readonly before: {
    readonly balanceCents: number;
    readonly transactionIds: readonly string[];
  };
  readonly after: {
    readonly balanceCents: number;
    readonly transaction: IGmCampaignProjectedTransaction;
  };
}

export interface IGmCampaignInventoryLotEffect extends IGmCampaignProjectedEffectBase<'gm.campaign.inventory_lot_corrected'> {
  readonly family: 'inventory-lot';
  readonly inventoryId: string;
  readonly before?: IPartsInventoryItem;
  readonly after?: IPartsInventoryItem;
}

export interface IGmCampaignBaseUnitStateEffect extends IGmCampaignProjectedEffectBase<'gm.campaign.base_unit_state_corrected'> {
  readonly family: 'base-unit-state';
  readonly unitId: string;
  readonly before: {
    readonly combatState?: IUnitCombatState;
    readonly configuration?: MechBuildConfig;
  };
  readonly after: {
    readonly combatState?: IUnitCombatState;
    readonly configuration?: MechBuildConfig;
  };
}

export type IGmCampaignProjectedEffect =
  | IGmCampaignSalvageAllocationEffect
  | IGmCampaignRepairTicketEffect
  | IGmCampaignFundsTransactionEffect
  | IGmCampaignInventoryLotEffect
  | IGmCampaignBaseUnitStateEffect;

export interface IGmCampaignInterventionDomainPayload {
  readonly correction: GmCampaignInterventionCorrection;
  readonly projectedEffects: readonly IGmCampaignProjectedEffect[];
}

export interface IGmCampaignPublicEffect extends IGmPublicEffect {
  readonly family: GmCampaignCorrectionFamily;
}
