import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPartsInventory } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import {
  consumeRequiredParts,
  hasRequiredParts,
} from '@/lib/campaign/partsInventory';

export function applyCompletedRepair(
  state: IUnitCombatState,
  ticket: IRepairTicket,
  maxState: IUnitMaxState | undefined,
  updatedAt: string,
): IUnitCombatState {
  switch (ticket.kind) {
    case 'armor':
      return repairNumericLocation(
        state,
        'currentArmorPerLocation',
        ticket,
        maxState?.maxArmorPerLocation,
        updatedAt,
      );
    case 'structure':
      return repairStructure(state, ticket, maxState, updatedAt);
    case 'ammo':
      return restockAmmo(state, ticket, maxState, updatedAt);
    case 'component':
      return replaceComponent(state, ticket, updatedAt);
    case 'heat-recovery':
      return { ...state, heatEnd: 0, lastUpdated: updatedAt };
  }
}

function repairNumericLocation(
  state: IUnitCombatState,
  field: 'currentArmorPerLocation' | 'currentStructurePerLocation',
  ticket: IRepairTicket,
  maxValues: Readonly<Record<string, number>> | undefined,
  updatedAt: string,
): IUnitCombatState {
  const location = ticket.location;
  if (!location) return { ...state, lastUpdated: updatedAt };
  const current = state[field];
  const currentValue = current[location] ?? 0;
  const maxValue =
    maxValues?.[location] ?? currentValue + (ticket.pointsToRestore ?? 0);
  return {
    ...state,
    [field]: {
      ...current,
      [location]: Math.min(
        maxValue,
        currentValue + (ticket.pointsToRestore ?? 0),
      ),
    },
    lastUpdated: updatedAt,
  };
}

function repairStructure(
  state: IUnitCombatState,
  ticket: IRepairTicket,
  maxState: IUnitMaxState | undefined,
  updatedAt: string,
): IUnitCombatState {
  const repaired = repairNumericLocation(
    state,
    'currentStructurePerLocation',
    ticket,
    maxState?.maxStructurePerLocation,
    updatedAt,
  );
  const location = ticket.location;
  const destroyedLocations = location
    ? repaired.destroyedLocations.filter((loc) => loc !== location)
    : repaired.destroyedLocations;
  const ct = repaired.currentStructurePerLocation.CT;
  return {
    ...repaired,
    destroyedLocations,
    combatReady: ct === undefined || ct > 0,
  };
}

function restockAmmo(
  state: IUnitCombatState,
  ticket: IRepairTicket,
  maxState: IUnitMaxState | undefined,
  updatedAt: string,
): IUnitCombatState {
  const binId = ticket.ammoBinId;
  if (!binId) return { ...state, lastUpdated: updatedAt };
  const current = state.ammoRemaining[binId] ?? 0;
  const maxRounds =
    maxState?.maxAmmoPerBin[binId] ?? current + (ticket.pointsToRestore ?? 0);
  return {
    ...state,
    ammoRemaining: {
      ...state.ammoRemaining,
      [binId]: Math.min(
        maxRounds,
        current + (ticket.pointsToRestore ?? maxRounds),
      ),
    },
    lastUpdated: updatedAt,
  };
}

function replaceComponent(
  state: IUnitCombatState,
  ticket: IRepairTicket,
  updatedAt: string,
): IUnitCombatState {
  if (!ticket.componentName) return { ...state, lastUpdated: updatedAt };
  return {
    ...state,
    destroyedComponents: state.destroyedComponents.filter((component) => {
      if (component.name !== ticket.componentName) return true;
      if (ticket.location && component.location !== ticket.location)
        return true;
      return false;
    }),
    lastUpdated: updatedAt,
  };
}

/** Shared by canonical tickets and old projected bay rows. */
export function isActiveRepairTicket<
  T extends { readonly status: IRepairTicket['status'] | 'done' },
>(
  ticket: T,
): ticket is T & {
  readonly status: Exclude<T['status'], 'completed' | 'cancelled' | 'done'>;
} {
  switch (ticket.status) {
    case 'queued':
    case 'in-progress':
    case 'parts-needed':
      return true;
    case 'completed':
    case 'cancelled':
    case 'done':
      return false;
  }
}

export function completeRepairTicket(
  ticket: IRepairTicket,
  inventory: IPartsInventory | undefined,
  state: IUnitCombatState | undefined,
  maxState: IUnitMaxState | undefined,
  updatedAt: string,
):
  | {
      readonly kind: 'blocked';
      readonly reason: 'ticket-terminal' | 'missing-parts';
    }
  | {
      readonly kind: 'completed';
      readonly ticket: IRepairTicket;
      readonly inventory: IPartsInventory;
      readonly state: IUnitCombatState | undefined;
    } {
  if (!isActiveRepairTicket(ticket))
    return { kind: 'blocked', reason: 'ticket-terminal' };
  if (!hasRequiredParts(inventory, ticket.partsRequired))
    return { kind: 'blocked', reason: 'missing-parts' };
  return {
    kind: 'completed',
    ticket: { ...ticket, status: 'completed', remainingHours: 0 },
    inventory: consumeRequiredParts(inventory, ticket.partsRequired),
    state: state
      ? applyCompletedRepair(state, ticket, maxState, updatedAt)
      : undefined,
  };
}

/** Keep referenced terminal tickets as the queue builder's deduplication records. */
export function pruneTerminalRepairTickets(
  campaign: Pick<
    ICampaign,
    'repairQueue' | 'pendingBattleOutcomes' | 'recentlyAppliedOutcomes'
  >,
): readonly IRepairTicket[] {
  const queue = campaign.repairQueue ?? [];
  const referencedMatches = new Set(
    [
      ...(campaign.pendingBattleOutcomes ?? []),
      ...(campaign.recentlyAppliedOutcomes ?? []),
    ].map((outcome) => outcome.matchId),
  );
  const retained = queue.filter(
    (ticket) =>
      isActiveRepairTicket(ticket) ||
      (ticket.matchId !== null && referencedMatches.has(ticket.matchId)),
  );
  return retained.length === queue.length ? queue : retained;
}
