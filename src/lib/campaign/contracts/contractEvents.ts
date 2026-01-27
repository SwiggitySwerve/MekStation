/**
 * Contract Events System
 * 
 * Implements monthly contract event checking for AtB campaigns.
 * Events are checked once per month during active contracts and
 * can affect morale, parts availability, scenario generation, and payments.
 *
 * Based on MekHQ's AtBContract event checking.
 * 
 * @module campaign/contracts/contractEvents
 */

/** Random number generator function type. Returns [0, 1). */
export type RandomFn = () => number;

// =============================================================================
// Contract Event Types
// =============================================================================

/**
 * 10 contract event types that can occur during active contracts.
 */
export enum ContractEventType {
  /** Bonus payment for exceeding expectations */
  BONUS_ROLL = 'bonus_roll',
  /** Special scenario triggered by contract conditions */
  SPECIAL_SCENARIO = 'special_scenario',
  /** Civil disturbance requiring additional security */
  CIVIL_DISTURBANCE = 'civil_disturbance',
  /** Full rebellion breaks out */
  REBELLION = 'rebellion',
  /** Employer betrayal — multiple sub-types */
  BETRAYAL = 'betrayal',
  /** Treacherous ambush or double-cross */
  TREACHERY = 'treachery',
  /** Supply chain failure */
  LOGISTICS_FAILURE = 'logistics_failure',
  /** Friendly reinforcements arrive */
  REINFORCEMENTS = 'reinforcements',
  /** Miscellaneous special events */
  SPECIAL_EVENTS = 'special_events',
  /** Large-scale battle event */
  BIG_BATTLE = 'big_battle',
}

// =============================================================================
// Betrayal Sub-Types
// =============================================================================

/**
 * 6 sub-types of betrayal events.
 */
export enum BetrayalSubType {
  /** Employer withholds supplies */
  SUPPLY_CUTOFF = 'supply_cutoff',
  /** Employer feeds false intelligence */
  FALSE_INTEL = 'false_intel',
  /** Employer redirects reinforcements */
  REDIRECT_REINFORCEMENTS = 'redirect_reinforcements',
  /** Employer leaks position to enemy */
  POSITION_LEAKED = 'position_leaked',
  /** Employer sets up ambush */
  AMBUSH_SETUP = 'ambush_setup',
  /** Full contract breach by employer */
  CONTRACT_BREACH = 'contract_breach',
}

// =============================================================================
// Event Effect Types
// =============================================================================

/**
 * Union type for contract event effects.
 */
export type ContractEventEffect =
  | { readonly type: 'morale_change'; readonly value: number }
  | { readonly type: 'parts_modifier'; readonly value: number }
  | { readonly type: 'scenario_trigger'; readonly scenarioType: string }
  | { readonly type: 'payment_modifier'; readonly multiplier: number };

// =============================================================================
// Contract Event Interface
// =============================================================================

/**
 * A contract event that has occurred.
 */
export interface IContractEvent {
  /** Event type */
  readonly type: ContractEventType;
  /** Betrayal sub-type (only if type is BETRAYAL) */
  readonly betrayalSubType?: BetrayalSubType;
  /** Human-readable description */
  readonly description: string;
  /** Gameplay effects of the event */
  readonly effects: readonly ContractEventEffect[];
}

// =============================================================================
// Event Definitions
// =============================================================================

/**
 * Create a contract event with standard effects for each type.
 */
function createEventByType(
  type: ContractEventType,
  random: RandomFn,
): IContractEvent {
  switch (type) {
    case ContractEventType.BONUS_ROLL:
      return {
        type,
        description: 'Employer provides a bonus payment for excellent performance',
        effects: [{ type: 'payment_modifier', multiplier: 1.1 }],
      };
    case ContractEventType.SPECIAL_SCENARIO:
      return {
        type,
        description: 'Intelligence reports an opportunity for a special operation',
        effects: [{ type: 'scenario_trigger', scenarioType: 'special_mission' }],
      };
    case ContractEventType.CIVIL_DISTURBANCE:
      return {
        type,
        description: 'Civil unrest erupts in the contract area',
        effects: [{ type: 'morale_change', value: 1 }], // +1 enemy morale (harder)
      };
    case ContractEventType.REBELLION:
      return {
        type,
        description: 'A full-scale rebellion breaks out, complicating operations',
        effects: [
          { type: 'morale_change', value: 2 },
          { type: 'scenario_trigger', scenarioType: 'rebellion_battle' },
        ],
      };
    case ContractEventType.BETRAYAL: {
      const subTypes = Object.values(BetrayalSubType);
      const subType = subTypes[Math.floor(random() * subTypes.length)];
      return createBetrayalEvent(subType);
    }
    case ContractEventType.TREACHERY:
      return {
        type,
        description: 'Treacherous forces ambush your unit',
        effects: [
          { type: 'morale_change', value: 1 },
          { type: 'scenario_trigger', scenarioType: 'ambush' },
        ],
      };
    case ContractEventType.LOGISTICS_FAILURE:
      return {
        type,
        description: 'Supply lines have been disrupted',
        effects: [{ type: 'parts_modifier', value: -1 }],
      };
    case ContractEventType.REINFORCEMENTS:
      return {
        type,
        description: 'Friendly reinforcements arrive to assist operations',
        effects: [{ type: 'morale_change', value: -1 }], // -1 enemy morale (easier)
      };
    case ContractEventType.SPECIAL_EVENTS:
      return {
        type,
        description: 'An unexpected event occurs during the contract',
        effects: [{ type: 'morale_change', value: 0 }], // Neutral — flavor event
      };
    case ContractEventType.BIG_BATTLE:
      return {
        type,
        description: 'A major battle erupts, drawing all available forces',
        effects: [{ type: 'scenario_trigger', scenarioType: 'big_battle' }],
      };
  }
}

/**
 * Create a betrayal event with sub-type specific effects.
 */
function createBetrayalEvent(subType: BetrayalSubType): IContractEvent {
  const baseEvent = {
    type: ContractEventType.BETRAYAL as const,
    betrayalSubType: subType,
  };

  switch (subType) {
    case BetrayalSubType.SUPPLY_CUTOFF:
      return { ...baseEvent, description: 'Employer has cut off supply shipments', effects: [{ type: 'parts_modifier', value: -2 }] };
    case BetrayalSubType.FALSE_INTEL:
      return { ...baseEvent, description: 'Employer provided false intelligence', effects: [{ type: 'scenario_trigger', scenarioType: 'ambush' }] };
    case BetrayalSubType.REDIRECT_REINFORCEMENTS:
      return { ...baseEvent, description: 'Employer redirected promised reinforcements', effects: [{ type: 'morale_change', value: 1 }] };
    case BetrayalSubType.POSITION_LEAKED:
      return { ...baseEvent, description: 'Your position has been leaked to the enemy', effects: [{ type: 'scenario_trigger', scenarioType: 'ambush' }, { type: 'morale_change', value: 1 }] };
    case BetrayalSubType.AMBUSH_SETUP:
      return { ...baseEvent, description: 'Employer set up an ambush against your forces', effects: [{ type: 'scenario_trigger', scenarioType: 'ambush' }, { type: 'morale_change', value: 2 }] };
    case BetrayalSubType.CONTRACT_BREACH:
      return { ...baseEvent, description: 'Employer has breached the contract terms', effects: [{ type: 'payment_modifier', multiplier: 0.5 }] };
  }
}

// =============================================================================
// Event Checking
// =============================================================================

/** Monthly event check chance (1-in-20, i.e., 5% per event type slot). */
export const EVENT_CHECK_CHANCE = 0.05;

/**
 * Check for monthly contract events.
 * Each event type has a 5% chance of occurring per month.
 * Multiple events can occur in the same month.
 * 
 * @param random - Injectable random function
 * @returns Array of events that occurred (may be empty)
 */
export function checkMonthlyEvents(random: RandomFn): IContractEvent[] {
  const events: IContractEvent[] = [];
  const allEventTypes = Object.values(ContractEventType);

  for (const eventType of allEventTypes) {
    if (random() < EVENT_CHECK_CHANCE) {
      events.push(createEventByType(eventType, random));
    }
  }

  return events;
}

/**
 * Get all possible event types.
 * @returns Array of all ContractEventType values
 */
export function getAllEventTypes(): ContractEventType[] {
  return Object.values(ContractEventType);
}

/**
 * Get all betrayal sub-types.
 * @returns Array of all BetrayalSubType values
 */
export function getAllBetrayalSubTypes(): BetrayalSubType[] {
  return Object.values(BetrayalSubType);
}
