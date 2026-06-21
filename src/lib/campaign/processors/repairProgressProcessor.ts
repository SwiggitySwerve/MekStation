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

import {
  DayPhase,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';

const DEFAULT_DAILY_REPAIR_HOURS = 8;

type ICampaignWithRepairProgress = ICampaign & {
  readonly partsInventory?: IPartsInventory;
  readonly repairQueue?: readonly IRepairTicket[];
  readonly unitMaxStates?: Readonly<Record<string, IUnitMaxState>>;
};

export const repairProgressProcessor: IDayProcessor = {
  id: 'repair-progress',
  phase: DayPhase.UNITS,
  displayName: 'Repair Progress',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const extended = campaign as ICampaignWithRepairProgress;
    const queue = extended.repairQueue ?? [];
    if (queue.length === 0) {
      return { events: [], campaign };
    }

    let remainingHours = DEFAULT_DAILY_REPAIR_HOURS;
    let inventory = extended.partsInventory ?? [];
    const unitCombatStates: Record<string, IUnitCombatState> = {
      ...campaign.unitCombatStates,
    };
    const events: IDayEvent[] = [];
    let changed = false;

    const nextQueue = sortQueue(queue).map((ticket) => {
      if (ticket.status === 'completed' || ticket.status === 'cancelled') {
        return ticket;
      }

      if (!hasRequiredParts(inventory, ticket.partsRequired)) {
        changed = changed || ticket.status !== 'parts-needed';
        events.push({
          type: 'repair_blocked',
          description: `Repair blocked for ${ticket.unitId}: missing parts`,
          severity: 'warning',
          data: { ticketId: ticket.ticketId, unitId: ticket.unitId },
        });
        return { ...ticket, status: 'parts-needed' as const };
      }

      if (remainingHours <= 0) {
        return ticket;
      }

      const ticketRemaining = ticket.remainingHours ?? ticket.expectedHours;
      const work = Math.min(ticketRemaining, remainingHours);
      remainingHours -= work;
      const nextRemaining = Math.max(0, ticketRemaining - work);
      changed = true;

      if (nextRemaining > 0) {
        events.push({
          type: 'repair_progress',
          description: `Repair progressed for ${ticket.unitId}`,
          severity: 'info',
          data: {
            ticketId: ticket.ticketId,
            unitId: ticket.unitId,
            hoursApplied: work,
            remainingHours: nextRemaining,
          },
        });
        return {
          ...ticket,
          status: 'in-progress' as const,
          remainingHours: nextRemaining,
        };
      }

      inventory = consumeRequiredParts(inventory, ticket.partsRequired);
      const state = unitCombatStates[ticket.unitId];
      if (state) {
        unitCombatStates[ticket.unitId] = applyCompletedRepair(
          state,
          ticket,
          extended.unitMaxStates?.[ticket.unitId],
          date.toISOString(),
        );
      }
      events.push({
        type: 'repair_completed',
        description: `Repair completed for ${ticket.unitId}`,
        severity: 'info',
        data: { ticketId: ticket.ticketId, unitId: ticket.unitId },
      });
      return { ...ticket, status: 'completed' as const, remainingHours: 0 };
    });

    if (!changed) {
      return { events, campaign };
    }

    return {
      events,
      campaign: {
        ...campaign,
        repairQueue: restoreOriginalOrder(queue, nextQueue),
        unitCombatStates,
        partsInventory: inventory,
      },
    };
  },
};

function sortQueue(queue: readonly IRepairTicket[]): readonly IRepairTicket[] {
  return [...queue].sort((a, b) => {
    const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER;
    const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function restoreOriginalOrder(
  original: readonly IRepairTicket[],
  processed: readonly IRepairTicket[],
): readonly IRepairTicket[] {
  const byId = new Map(processed.map((ticket) => [ticket.ticketId, ticket]));
  return original.map((ticket) => byId.get(ticket.ticketId) ?? ticket);
}

function applyCompletedRepair(
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
