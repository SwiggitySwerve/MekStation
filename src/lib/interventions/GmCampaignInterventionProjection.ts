import type { Transaction } from '@/types/campaign/Transaction';
import type {
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignProjectedEffect,
  IGmCampaignProjectedTransaction,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import { Money } from '@/types/campaign/Money';

type CampaignRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
>;

export function projectCampaignEffectsForRecord(
  record: CampaignRecord,
): readonly IGmCampaignProjectedEffect[] {
  if (!record.domainPayload) return [];

  return record.domainPayload.projectedEffects.map(
    (effect) =>
      ({
        ...effect,
        interventionId: record.id,
      }) as IGmCampaignProjectedEffect,
  );
}

export function applyGmCampaignProjectedEffects(
  state: IGmCampaignInterventionState,
  effects: readonly IGmCampaignProjectedEffect[],
): IGmCampaignInterventionState {
  return effects.reduce(applyGmCampaignProjectedEffect, state);
}

function applyGmCampaignProjectedEffect(
  state: IGmCampaignInterventionState,
  effect: IGmCampaignProjectedEffect,
): IGmCampaignInterventionState {
  switch (effect.family) {
    case 'salvage-allocation':
      return appendGmCampaignEvent(
        applySalvageAllocationEffect(state, effect),
        effect,
      );
    case 'repair-ticket':
      return appendGmCampaignEvent(
        applyRepairTicketEffect(state, effect),
        effect,
      );
    case 'funds-transaction':
      return appendGmCampaignEvent(
        applyFundsTransactionEffect(state, effect),
        effect,
      );
    case 'inventory-lot':
      return appendGmCampaignEvent(
        applyInventoryLotEffect(state, effect),
        effect,
      );
    case 'base-unit-state':
      return appendGmCampaignEvent(
        applyBaseUnitStateEffect(state, effect),
        effect,
      );
  }
}

function applySalvageAllocationEffect(
  state: IGmCampaignInterventionState,
  effect: Extract<
    IGmCampaignProjectedEffect,
    { readonly family: 'salvage-allocation' }
  >,
): IGmCampaignInterventionState {
  const next = { ...(state.salvageAllocations ?? {}) };
  if (effect.after) {
    next[effect.matchId] = effect.after;
  } else {
    delete next[effect.matchId];
  }

  return {
    ...state,
    salvageAllocations: next,
  };
}

function applyRepairTicketEffect(
  state: IGmCampaignInterventionState,
  effect: Extract<
    IGmCampaignProjectedEffect,
    { readonly family: 'repair-ticket' }
  >,
): IGmCampaignInterventionState {
  const queue = state.repairQueue ?? [];
  const existingIndex = queue.findIndex(
    (ticket) => ticket.ticketId === effect.ticketId,
  );

  if (!effect.after) {
    return {
      ...state,
      repairQueue: queue.filter(
        (ticket) => ticket.ticketId !== effect.ticketId,
      ),
    };
  }

  if (existingIndex < 0) {
    return {
      ...state,
      repairQueue: [...queue, effect.after],
    };
  }

  const next = [...queue];
  next[existingIndex] = effect.after;
  return {
    ...state,
    repairQueue: next,
  };
}

function applyFundsTransactionEffect(
  state: IGmCampaignInterventionState,
  effect: Extract<
    IGmCampaignProjectedEffect,
    { readonly family: 'funds-transaction' }
  >,
): IGmCampaignInterventionState {
  const existing = state.finances.transactions.filter(
    (transaction) => transaction.id !== effect.transactionId,
  );

  return {
    ...state,
    finances: {
      ...state.finances,
      balance: Money.fromCents(effect.after.balanceCents),
      transactions: [
        ...existing,
        projectedTransactionToTransaction(effect.after.transaction),
      ],
    },
  };
}

function applyInventoryLotEffect(
  state: IGmCampaignInterventionState,
  effect: Extract<
    IGmCampaignProjectedEffect,
    { readonly family: 'inventory-lot' }
  >,
): IGmCampaignInterventionState {
  const inventory = state.partsInventory ?? [];
  const existingIndex = inventory.findIndex(
    (item) => item.inventoryId === effect.inventoryId,
  );

  if (!effect.after) {
    return {
      ...state,
      partsInventory: inventory.filter(
        (item) => item.inventoryId !== effect.inventoryId,
      ),
    };
  }

  if (existingIndex < 0) {
    return {
      ...state,
      partsInventory: [...inventory, effect.after],
    };
  }

  const next = [...inventory];
  next[existingIndex] = effect.after;
  return {
    ...state,
    partsInventory: next,
  };
}

function applyBaseUnitStateEffect(
  state: IGmCampaignInterventionState,
  effect: Extract<
    IGmCampaignProjectedEffect,
    { readonly family: 'base-unit-state' }
  >,
): IGmCampaignInterventionState {
  const touchesCombatState = Object.prototype.hasOwnProperty.call(
    effect.after,
    'combatState',
  );
  const touchesConfiguration = Object.prototype.hasOwnProperty.call(
    effect.after,
    'configuration',
  );
  const nextCombatStates = { ...state.unitCombatStates };
  const nextConfigurations = { ...(state.unitConfigurations ?? {}) };

  if (touchesCombatState) {
    if (effect.after.combatState) {
      nextCombatStates[effect.unitId] = effect.after.combatState;
    } else {
      delete nextCombatStates[effect.unitId];
    }
  }

  if (touchesConfiguration) {
    if (effect.after.configuration) {
      nextConfigurations[effect.unitId] = effect.after.configuration;
    } else {
      delete nextConfigurations[effect.unitId];
    }
  }

  return {
    ...state,
    ...(touchesCombatState ? { unitCombatStates: nextCombatStates } : {}),
    ...(touchesConfiguration ? { unitConfigurations: nextConfigurations } : {}),
  };
}

function appendGmCampaignEvent(
  state: IGmCampaignInterventionState,
  effect: IGmCampaignProjectedEffect,
): IGmCampaignInterventionState {
  return {
    ...state,
    gmInterventionEvents: [...(state.gmInterventionEvents ?? []), effect],
  };
}

function projectedTransactionToTransaction(
  projected: IGmCampaignProjectedTransaction,
): Transaction {
  return {
    id: projected.id,
    type: projected.type,
    amount: Money.fromCents(projected.amountCents),
    date: new Date(projected.date),
    description: projected.description,
  };
}
