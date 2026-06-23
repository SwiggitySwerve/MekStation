import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type {
  GmCampaignInterventionDomain,
  IGmCampaignBaseUnitStateCorrection,
  IGmCampaignFundsTransactionCorrection,
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionState,
  IGmCampaignInventoryLotCorrection,
  IGmCampaignProjectedEffect,
  IGmCampaignRepairTicketCorrection,
  IGmCampaignSalvageAllocationCorrection,
} from '@/types/interventions';

import { TransactionType } from '@/types/campaign/Transaction';

export interface IGmCampaignProjectedEffectResult {
  readonly effect: IGmCampaignProjectedEffect;
  readonly changedStateRefs: readonly string[];
  readonly summary: string;
}

export interface IGmCampaignProjectedEffectFailure {
  readonly effect?: undefined;
  readonly code: string;
  readonly reason: string;
  readonly affectedRefs?: readonly string[];
}

export function buildGmCampaignProjectedEffect(
  domain: GmCampaignInterventionDomain,
  payload: IGmCampaignInterventionCommandPayload,
  state: IGmCampaignInterventionState,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  const { correction } = payload;

  switch (correction.family) {
    case 'salvage-allocation':
      return buildSalvageAllocationEffect(
        domain,
        correction,
        state,
        payload.publicSummary,
      );
    case 'repair-ticket':
      return buildRepairTicketEffect(
        domain,
        correction,
        state,
        payload.publicSummary,
      );
    case 'funds-transaction':
      return buildFundsTransactionEffect(
        domain,
        correction,
        state,
        payload.publicSummary,
      );
    case 'inventory-lot':
      return buildInventoryLotEffect(
        domain,
        correction,
        state,
        payload.publicSummary,
      );
    case 'base-unit-state':
      return buildBaseUnitStateEffect(
        domain,
        correction,
        state,
        payload.publicSummary,
      );
  }
}

function buildSalvageAllocationEffect(
  domain: GmCampaignInterventionDomain,
  correction: IGmCampaignSalvageAllocationCorrection,
  state: IGmCampaignInterventionState,
  summaryOverride?: string,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  if (!isNonEmptyString(correction.matchId)) {
    return failure(
      'campaign-salvage-match-invalid',
      'Salvage correction requires a matchId.',
      [campaignFieldRef(state.id, 'salvageAllocations')],
    );
  }

  const before = state.salvageAllocations?.[correction.matchId];
  const after = resolveObjectCorrection({
    before,
    replacement: correction.allocation,
    patch: correction.patch,
    remove: correction.remove,
  });

  if (!after.found) {
    return failure(
      'campaign-salvage-allocation-not-found',
      `Salvage allocation "${correction.matchId}" was not found and no replacement was provided.`,
      [salvageAllocationRef(state.id, correction.matchId)],
    );
  }

  const changedStateRefs = [
    campaignFieldRef(state.id, 'salvageAllocations'),
    salvageAllocationRef(state.id, correction.matchId),
  ];
  const summary =
    summaryOverride ??
    `Salvage allocation ${correction.matchId} corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.campaign.salvage_allocation_corrected',
      domain,
      family: 'salvage-allocation',
      matchId: correction.matchId,
      before,
      after: after.value,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildRepairTicketEffect(
  domain: GmCampaignInterventionDomain,
  correction: IGmCampaignRepairTicketCorrection,
  state: IGmCampaignInterventionState,
  summaryOverride?: string,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  if (!isNonEmptyString(correction.ticketId)) {
    return failure(
      'campaign-repair-ticket-id-invalid',
      'Repair-ticket correction requires a ticketId.',
      [campaignFieldRef(state.id, 'repairQueue')],
    );
  }

  const before = (state.repairQueue ?? []).find(
    (ticket) => ticket.ticketId === correction.ticketId,
  );
  const after = resolveObjectCorrection({
    before,
    replacement: correction.ticket,
    patch: correction.patch,
    remove: correction.remove,
  });

  if (!after.found) {
    return failure(
      'campaign-repair-ticket-not-found',
      `Repair ticket "${correction.ticketId}" was not found and no replacement was provided.`,
      [repairTicketRef(state.id, correction.ticketId)],
    );
  }

  const changedStateRefs = [
    campaignFieldRef(state.id, 'repairQueue'),
    repairTicketRef(state.id, correction.ticketId),
  ];
  const summary =
    summaryOverride ??
    `Repair ticket ${correction.ticketId} corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.campaign.repair_ticket_corrected',
      domain,
      family: 'repair-ticket',
      ticketId: correction.ticketId,
      before,
      after: after.value,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildFundsTransactionEffect(
  domain: GmCampaignInterventionDomain,
  correction: IGmCampaignFundsTransactionCorrection,
  state: IGmCampaignInterventionState,
  summaryOverride?: string,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  if (
    !isNonEmptyString(correction.transactionId) ||
    !isNonEmptyString(correction.description) ||
    !Number.isFinite(correction.amountCents)
  ) {
    return failure(
      'campaign-funds-transaction-invalid',
      'Funds correction requires transactionId, description, and finite amountCents.',
      [campaignFieldRef(state.id, 'finances')],
    );
  }

  const beforeBalanceCents = state.finances.balance.centsValue;
  const afterBalanceCents = beforeBalanceCents + correction.amountCents;
  const transaction = {
    id: correction.transactionId,
    type: correction.transactionType ?? TransactionType.Miscellaneous,
    amountCents: correction.amountCents,
    date: correction.date ?? new Date().toISOString(),
    description: correction.description,
  };
  const changedStateRefs = [
    campaignFieldRef(state.id, 'finances'),
    campaignFieldRef(state.id, 'finances:transactions'),
    transactionRef(state.id, correction.transactionId),
  ];
  const summary =
    summaryOverride ??
    `Campaign funds adjusted by ${formatCents(correction.amountCents)}.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.campaign.funds_transaction_corrected',
      domain,
      family: 'funds-transaction',
      transactionId: correction.transactionId,
      before: {
        balanceCents: beforeBalanceCents,
        transactionIds: state.finances.transactions.map(
          (existing) => existing.id,
        ),
      },
      after: {
        balanceCents: afterBalanceCents,
        transaction,
      },
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildInventoryLotEffect(
  domain: GmCampaignInterventionDomain,
  correction: IGmCampaignInventoryLotCorrection,
  state: IGmCampaignInterventionState,
  summaryOverride?: string,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  if (!isNonEmptyString(correction.inventoryId)) {
    return failure(
      'campaign-inventory-lot-id-invalid',
      'Inventory correction requires an inventoryId.',
      [campaignFieldRef(state.id, 'partsInventory')],
    );
  }

  const before = (state.partsInventory ?? []).find(
    (item) => item.inventoryId === correction.inventoryId,
  );
  const after = resolveInventoryLotAfter(correction, before);

  if (!after.found) {
    return failure(
      'campaign-inventory-lot-not-found',
      `Inventory lot "${correction.inventoryId}" was not found and no replacement was provided.`,
      [inventoryLotRef(state.id, correction.inventoryId)],
    );
  }

  const changedStateRefs = [
    campaignFieldRef(state.id, 'partsInventory'),
    inventoryLotRef(state.id, correction.inventoryId),
  ];
  const summary =
    summaryOverride ??
    `Inventory lot ${correction.inventoryId} corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.campaign.inventory_lot_corrected',
      domain,
      family: 'inventory-lot',
      inventoryId: correction.inventoryId,
      before,
      after: after.value,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildBaseUnitStateEffect(
  domain: GmCampaignInterventionDomain,
  correction: IGmCampaignBaseUnitStateCorrection,
  state: IGmCampaignInterventionState,
  summaryOverride?: string,
): IGmCampaignProjectedEffectResult | IGmCampaignProjectedEffectFailure {
  if (!isNonEmptyString(correction.unitId)) {
    return failure(
      'campaign-unit-id-invalid',
      'Base unit state correction requires a unitId.',
      [campaignRef(state.id)],
    );
  }

  const beforeCombatState = state.unitCombatStates[correction.unitId];
  const beforeConfiguration = state.unitConfigurations?.[correction.unitId];
  const combatState = resolveObjectCorrection({
    before: beforeCombatState,
    replacement: correction.combatState,
    patch: correction.combatStatePatch,
    remove: correction.removeCombatState,
  });
  const configuration = resolveObjectCorrection({
    before: beforeConfiguration,
    replacement: correction.configuration,
    patch: correction.configurationPatch,
    remove: correction.removeConfiguration,
  });

  const touchesCombatState = correctionTouchesObject({
    replacement: correction.combatState,
    patch: correction.combatStatePatch,
    remove: correction.removeCombatState,
  });
  const touchesConfiguration = correctionTouchesObject({
    replacement: correction.configuration,
    patch: correction.configurationPatch,
    remove: correction.removeConfiguration,
  });

  if (!touchesCombatState && !touchesConfiguration) {
    return failure(
      'campaign-base-unit-state-empty',
      'Base unit state correction requires a combat state or configuration change.',
      [unitRef(state.id, correction.unitId)],
    );
  }

  if (touchesCombatState && !combatState.found) {
    return failure(
      'campaign-unit-combat-state-not-found',
      `Combat state for unit "${correction.unitId}" was not found and no replacement was provided.`,
      [unitCombatStateRef(state.id, correction.unitId)],
    );
  }

  if (touchesConfiguration && !configuration.found) {
    return failure(
      'campaign-unit-configuration-not-found',
      `Configuration for unit "${correction.unitId}" was not found and no replacement was provided.`,
      [unitConfigurationRef(state.id, correction.unitId)],
    );
  }

  const changedStateRefs = [
    unitRef(state.id, correction.unitId),
    ...(touchesCombatState
      ? [
          campaignFieldRef(state.id, 'unitCombatStates'),
          unitCombatStateRef(state.id, correction.unitId),
        ]
      : []),
    ...(touchesConfiguration
      ? [
          campaignFieldRef(state.id, 'unitConfigurations'),
          unitConfigurationRef(state.id, correction.unitId),
        ]
      : []),
  ];
  const summary =
    summaryOverride ??
    `Base unit state for ${correction.unitId} corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.campaign.base_unit_state_corrected',
      domain,
      family: 'base-unit-state',
      unitId: correction.unitId,
      before: {
        combatState: beforeCombatState,
        configuration: beforeConfiguration,
      },
      after: {
        ...(touchesCombatState ? { combatState: combatState.value } : {}),
        ...(touchesConfiguration ? { configuration: configuration.value } : {}),
      },
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function resolveInventoryLotAfter(
  correction: IGmCampaignInventoryLotCorrection,
  before: IPartsInventoryItem | undefined,
): { readonly found: boolean; readonly value?: IPartsInventoryItem } {
  if (correction.remove)
    return { found: before !== undefined, value: undefined };
  const replacement = correction.item;
  if (replacement) return { found: true, value: replacement };
  if (!before) return { found: false };

  const patched = {
    ...before,
    ...definedObjectPatch(correction.patch ?? {}),
  };

  if (correction.quantityDelta !== undefined) {
    const quantity = patched.quantity + correction.quantityDelta;
    if (quantity <= 0) return { found: true, value: undefined };
    return { found: true, value: { ...patched, quantity } };
  }

  return { found: true, value: patched };
}

function resolveObjectCorrection<T>(input: {
  readonly before: T | undefined;
  readonly replacement?: T;
  readonly patch?: Partial<T>;
  readonly remove?: boolean;
}): { readonly found: boolean; readonly value?: T } {
  if (input.remove)
    return { found: input.before !== undefined, value: undefined };
  if (input.replacement) return { found: true, value: input.replacement };
  if (!input.patch)
    return { found: input.before !== undefined, value: input.before };
  if (!input.before) return { found: false };
  return {
    found: true,
    value: {
      ...input.before,
      ...definedObjectPatch(input.patch),
    },
  };
}

function correctionTouchesObject<T>(input: {
  readonly replacement?: T;
  readonly patch?: Partial<T>;
  readonly remove?: boolean;
}): boolean {
  return Boolean(input.remove || input.replacement || input.patch);
}

function failure(
  code: string,
  reason: string,
  affectedRefs: readonly string[],
): IGmCampaignProjectedEffectFailure {
  return { code, reason, affectedRefs };
}

function definedObjectPatch<T extends object>(value: Partial<T>): Partial<T> {
  const entries = Object.entries(value).filter(
    ([, entryValue]) => entryValue !== undefined,
  );
  return Object.fromEntries(entries) as Partial<T>;
}

function campaignRef(campaignId: string): string {
  return `campaign:${campaignId}`;
}

function campaignFieldRef(campaignId: string, field: string): string {
  return `campaign:${campaignId}:${field}`;
}

function salvageAllocationRef(campaignId: string, matchId: string): string {
  return `campaign:${campaignId}:salvageAllocations:${matchId}`;
}

function repairTicketRef(campaignId: string, ticketId: string): string {
  return `campaign:${campaignId}:repairQueue:${ticketId}`;
}

function transactionRef(campaignId: string, transactionId: string): string {
  return `campaign:${campaignId}:finances:transactions:${transactionId}`;
}

function inventoryLotRef(campaignId: string, inventoryId: string): string {
  return `campaign:${campaignId}:partsInventory:${inventoryId}`;
}

function unitRef(campaignId: string, unitId: string): string {
  return `campaign:${campaignId}:unit:${unitId}`;
}

function unitCombatStateRef(campaignId: string, unitId: string): string {
  return `campaign:${campaignId}:unitCombatStates:${unitId}`;
}

function unitConfigurationRef(campaignId: string, unitId: string): string {
  return `campaign:${campaignId}:unitConfigurations:${unitId}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatCents(amountCents: number): string {
  const amount = amountCents / 100;
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} C-bills`;
}
