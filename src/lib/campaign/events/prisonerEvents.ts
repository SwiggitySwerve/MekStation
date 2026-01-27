/**
 * Prisoner Events - Event definitions and processing for campaign prisoner system
 *
 * Defines 20 minor and 10 major prisoner events with titles, descriptions, and effects.
 * Provides prisoner capacity calculation and event processing based on date/probability.
 *
 * @module campaign/events/prisonerEvents
 */

import {
  RandomEventCategory,
  RandomEventSeverity,
  PrisonerEventType,
  MINOR_PRISONER_EVENTS,
  MAJOR_PRISONER_EVENTS,
} from '@/types/campaign/events/randomEventTypes';
import type { IRandomEvent, IRandomEventEffect, RandomFn } from '@/types/campaign/events/randomEventTypes';
import { rollForEvent, selectRandomEvent, isMonday, isFirstOfMonth } from '@/lib/campaign/events/eventProbability';
import type { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

// =============================================================================
// Prisoner Event Definition Interface
// =============================================================================

export interface IPrisonerEventDefinition {
  readonly type: PrisonerEventType;
  readonly title: string;
  readonly description: string;
  readonly effects: readonly IRandomEventEffect[];
}

// =============================================================================
// Minor Event Definitions (20)
// =============================================================================

/** All 20 minor prisoner event definitions - flavor/atmosphere events */
export const MINOR_EVENT_DEFINITIONS: ReadonlyMap<PrisonerEventType, IPrisonerEventDefinition> = new Map([
  [PrisonerEventType.ARGUMENT, { type: PrisonerEventType.ARGUMENT, title: 'Prisoner Argument', description: 'Two prisoners got into a heated argument about who was right.', effects: [{ type: 'notification', message: 'Prisoners arguing in holding area', severity: 'info' }] }],
  [PrisonerEventType.WILD_STORIES, { type: PrisonerEventType.WILD_STORIES, title: 'Wild Stories', description: 'A prisoner entertains the guards with wild war stories.', effects: [{ type: 'notification', message: 'Prisoner telling wild stories', severity: 'info' }] }],
  [PrisonerEventType.CONVERSATIONS, { type: PrisonerEventType.CONVERSATIONS, title: 'Prisoner Conversations', description: 'Some prisoners have been having quiet conversations about home.', effects: [{ type: 'notification', message: 'Prisoners reminiscing about home', severity: 'info' }] }],
  [PrisonerEventType.RATIONS, { type: PrisonerEventType.RATIONS, title: 'Rations Complaint', description: 'Prisoners are complaining about the quality of rations.', effects: [{ type: 'morale_change', value: -1 }] }],
  [PrisonerEventType.TRADE, { type: PrisonerEventType.TRADE, title: 'Prisoner Trade', description: 'Prisoners have been trading personal items among themselves.', effects: [{ type: 'notification', message: 'Prisoners bartering with each other', severity: 'info' }] }],
  [PrisonerEventType.VETERAN, { type: PrisonerEventType.VETERAN, title: 'Veteran Prisoner', description: 'A veteran prisoner shares tactical insights that impress the guards.', effects: [{ type: 'notification', message: 'Veteran prisoner shares war knowledge', severity: 'info' }] }],
  [PrisonerEventType.GRAFFITI, { type: PrisonerEventType.GRAFFITI, title: 'Graffiti Found', description: 'Guards discover graffiti scratched into the holding cell walls.', effects: [{ type: 'notification', message: 'Graffiti found in prisoner holding', severity: 'info' }] }],
  [PrisonerEventType.PRAYER, { type: PrisonerEventType.PRAYER, title: 'Prisoner Prayer', description: 'Prisoners hold a quiet prayer service together.', effects: [{ type: 'notification', message: 'Prisoners holding prayer service', severity: 'info' }] }],
  [PrisonerEventType.BARTERING, { type: PrisonerEventType.BARTERING, title: 'Bartering', description: 'Prisoners attempt to barter with the guards for small comforts.', effects: [{ type: 'notification', message: 'Prisoners trying to barter with guards', severity: 'info' }] }],
  [PrisonerEventType.SONGS, { type: PrisonerEventType.SONGS, title: 'Prisoner Songs', description: 'The prisoners are singing their faction anthem.', effects: [{ type: 'notification', message: 'Prisoners singing faction songs', severity: 'info' }] }],
  [PrisonerEventType.PROPAGANDA, { type: PrisonerEventType.PROPAGANDA, title: 'Propaganda', description: 'A prisoner is spreading propaganda among the others.', effects: [{ type: 'morale_change', value: -1 }] }],
  [PrisonerEventType.PLOTTING, { type: PrisonerEventType.PLOTTING, title: 'Plotting Overheard', description: 'Guards overhear prisoners plotting something. Extra watch assigned.', effects: [{ type: 'notification', message: 'Prisoner plotting detected', severity: 'warning' }] }],
  [PrisonerEventType.LETTER, { type: PrisonerEventType.LETTER, title: 'Letter Request', description: 'A prisoner requests to write a letter to family. Permission granted.', effects: [{ type: 'notification', message: 'Prisoner writes letter home', severity: 'info' }] }],
  [PrisonerEventType.ILLNESS, { type: PrisonerEventType.ILLNESS, title: 'Prisoner Illness', description: 'A prisoner has fallen ill. Medical attention provided.', effects: [{ type: 'financial', amount: -500, description: 'Prisoner medical treatment' }] }],
  [PrisonerEventType.PARANOIA, { type: PrisonerEventType.PARANOIA, title: 'Prisoner Paranoia', description: 'A prisoner is showing signs of paranoia and distrust.', effects: [{ type: 'notification', message: 'Prisoner showing paranoid behavior', severity: 'info' }] }],
  [PrisonerEventType.SINGING, { type: PrisonerEventType.SINGING, title: 'Singing', description: 'A prisoner sings quietly to themselves through the night.', effects: [{ type: 'notification', message: 'Prisoner singing through the night', severity: 'info' }] }],
  [PrisonerEventType.HOLIDAY, { type: PrisonerEventType.HOLIDAY, title: 'Holiday Observance', description: 'Prisoners observe a holiday from their faction calendar.', effects: [{ type: 'notification', message: 'Prisoners observe faction holiday', severity: 'info' }] }],
  [PrisonerEventType.WHISPERS, { type: PrisonerEventType.WHISPERS, title: 'Whispers', description: 'Hushed whispers among the prisoners. Guards increase patrols.', effects: [{ type: 'notification', message: 'Increased whispering among prisoners', severity: 'info' }] }],
  [PrisonerEventType.SENTIMENTAL_ITEM, { type: PrisonerEventType.SENTIMENTAL_ITEM, title: 'Sentimental Item', description: 'A prisoner clutches a photo of loved ones. Guards allow it.', effects: [{ type: 'notification', message: 'Prisoner cherishes personal memento', severity: 'info' }] }],
  [PrisonerEventType.PHOTO, { type: PrisonerEventType.PHOTO, title: 'Photo Discovered', description: 'A prisoner\'s personal photo reveals information about their unit.', effects: [{ type: 'notification', message: 'Intelligence found in prisoner photo', severity: 'info' }] }],
]);

// =============================================================================
// Major Event Definitions (10)
// =============================================================================

/** All 10 major prisoner event definitions - these have gameplay effects */
export const MAJOR_EVENT_DEFINITIONS: ReadonlyMap<PrisonerEventType, IPrisonerEventDefinition> = new Map([
  [PrisonerEventType.BREAKOUT, { type: PrisonerEventType.BREAKOUT, title: 'Prisoner Breakout!', description: 'A group of prisoners has broken out of the holding facility!', effects: [{ type: 'prisoner_escape', percentage: 0.2 }] }],
  [PrisonerEventType.RIOT, { type: PrisonerEventType.RIOT, title: 'Prisoner Riot!', description: 'Prisoners have started a violent riot in the holding area!', effects: [{ type: 'prisoner_casualty', count: 2 }, { type: 'notification', message: 'Guards injured suppressing riot', severity: 'warning' }] }],
  [PrisonerEventType.MURDER, { type: PrisonerEventType.MURDER, title: 'Prisoner Murder', description: 'A prisoner has been found dead. Suspected murder by fellow inmates.', effects: [{ type: 'prisoner_casualty', count: 1 }, { type: 'notification', message: 'Prisoner found dead in holding', severity: 'warning' }] }],
  [PrisonerEventType.FIRE, { type: PrisonerEventType.FIRE, title: 'Holding Facility Fire!', description: 'A fire has broken out in the prisoner holding area!', effects: [{ type: 'prisoner_casualty', count: 3 }, { type: 'financial', amount: -5000, description: 'Fire damage repairs' }] }],
  [PrisonerEventType.POISON, { type: PrisonerEventType.POISON, title: 'Poisoning Attempt', description: 'Someone tried to poison the prisoner water supply.', effects: [{ type: 'prisoner_casualty', count: 1 }, { type: 'financial', amount: -2000, description: 'Water decontamination' }] }],
  [PrisonerEventType.HOSTAGE, { type: PrisonerEventType.HOSTAGE, title: 'Hostage Situation', description: 'Prisoners have taken a guard hostage!', effects: [{ type: 'notification', message: 'Guard taken hostage by prisoners!', severity: 'critical' }, { type: 'morale_change', value: -3 }] }],
  [PrisonerEventType.ESCAPE_ROPE, { type: PrisonerEventType.ESCAPE_ROPE, title: 'Escape Rope Found', description: 'Guards discover a makeshift rope hidden in the holding cells.', effects: [{ type: 'notification', message: 'Escape attempt foiled - rope found', severity: 'warning' }] }],
  [PrisonerEventType.TUNNEL, { type: PrisonerEventType.TUNNEL, title: 'Escape Tunnel!', description: 'An escape tunnel has been discovered under the holding facility!', effects: [{ type: 'prisoner_escape', percentage: 0.1 }, { type: 'financial', amount: -3000, description: 'Tunnel repair and security upgrade' }] }],
  [PrisonerEventType.UNDERCOVER, { type: PrisonerEventType.UNDERCOVER, title: 'Undercover Agent', description: 'One of the prisoners reveals themselves as an intelligence operative.', effects: [{ type: 'notification', message: 'Enemy intelligence agent discovered among prisoners', severity: 'warning' }] }],
  [PrisonerEventType.UNITED, { type: PrisonerEventType.UNITED, title: 'Prisoners United', description: 'The prisoners have organized and present demands in unison.', effects: [{ type: 'morale_change', value: -2 }, { type: 'financial', amount: -1000, description: 'Prisoner demand concessions' }] }],
]);

// =============================================================================
// Prisoner Capacity
// =============================================================================

/** Prisoner capacity tracking */
export interface IPrisonerCapacity {
  readonly maxCapacity: number;
  readonly currentPrisoners: number;
  readonly overflowPercentage: number; // 0.0 to 1.0+
}

/**
 * Count POW personnel from campaign personnel map.
 *
 * @param personnel - Map of person ID to IPerson
 * @returns Number of personnel with POW status
 */
export function countPrisoners(personnel: ReadonlyMap<string, IPerson>): number {
  let count = 0;
  personnel.forEach((person) => {
    if (person.status === PersonnelStatus.POW) count++;
  });
  return count;
}

/**
 * Calculate prisoner capacity metrics.
 *
 * @param prisonerCount - Current number of prisoners
 * @param baseCapacity - Maximum holding capacity (default 100)
 * @returns Capacity metrics including overflow percentage
 */
export function calculatePrisonerCapacity(prisonerCount: number, baseCapacity: number = 100): IPrisonerCapacity {
  return {
    maxCapacity: baseCapacity,
    currentPrisoners: prisonerCount,
    overflowPercentage: baseCapacity > 0 ? Math.max(0, (prisonerCount - baseCapacity) / baseCapacity) : prisonerCount > 0 ? 1.0 : 0,
  };
}

// =============================================================================
// Event ID Generation
// =============================================================================

let eventCounter = 0;

/** Generate a unique event ID */
export function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

/** Reset event counter (for testing) */
export function _resetEventCounter(): void {
  eventCounter = 0;
}

// =============================================================================
// Event Creation
// =============================================================================

/**
 * Create a random event from a prisoner event definition.
 */
function createPrisonerEvent(def: IPrisonerEventDefinition, severity: RandomEventSeverity, timestamp: string): IRandomEvent {
  return {
    id: generateEventId(),
    category: RandomEventCategory.PRISONER,
    severity,
    title: def.title,
    description: def.description,
    effects: def.effects,
    timestamp,
  };
}

/**
 * Create a ransom event (10% monthly chance, pays 5000-20000 C-bills).
 *
 * @param timestamp - Current date string
 * @param random - Random number generator
 * @returns A ransom IRandomEvent
 */
export function createRansomEvent(timestamp: string, random: RandomFn): IRandomEvent {
  const amount = 5000 + Math.floor(random() * 15000);
  return {
    id: generateEventId(),
    category: RandomEventCategory.PRISONER,
    severity: RandomEventSeverity.MINOR,
    title: 'Prisoner Ransom',
    description: `A faction has offered ransom for the return of a prisoner. Payment: ${amount} C-Bills.`,
    effects: [{ type: 'financial', amount, description: 'Prisoner ransom payment received' }],
    timestamp,
  };
}

// =============================================================================
// Main Event Processor
// =============================================================================

/**
 * Process prisoner events for a given day.
 *
 * - Monthly (1st): 10% ransom chance
 * - Weekly (Monday): Random event with 20-50% chance (scaled by overflow)
 *   - 20% chance of major event, 80% minor
 *
 * @param prisonerCount - Current number of prisoners
 * @param currentDate - ISO date string (e.g., '3025-01-06')
 * @param random - Seeded random number generator
 * @param baseCapacity - Maximum holding capacity (default 100)
 * @returns Array of events that occurred
 */
export function processPrisonerEvents(
  prisonerCount: number,
  currentDate: string,
  random: RandomFn,
  baseCapacity: number = 100
): IRandomEvent[] {
  if (prisonerCount === 0) return [];

  const events: IRandomEvent[] = [];
  const capacity = calculatePrisonerCapacity(prisonerCount, baseCapacity);

  // Monthly: 10% ransom chance on 1st of month
  if (isFirstOfMonth(currentDate)) {
    if (rollForEvent(0.10, random)) {
      events.push(createRansomEvent(currentDate, random));
    }
  }

  // Weekly: random event on Mondays
  if (isMonday(currentDate)) {
    // Base 20% chance, increased by overflow
    const eventChance = Math.min(0.5, 0.2 + capacity.overflowPercentage * 0.3);
    if (rollForEvent(eventChance, random)) {
      const isMajor = rollForEvent(0.2, random); // 20% chance of major
      if (isMajor) {
        const eventType = selectRandomEvent(MAJOR_PRISONER_EVENTS, random);
        const def = MAJOR_EVENT_DEFINITIONS.get(eventType);
        if (def) events.push(createPrisonerEvent(def, RandomEventSeverity.MAJOR, currentDate));
      } else {
        const eventType = selectRandomEvent(MINOR_PRISONER_EVENTS, random);
        const def = MINOR_EVENT_DEFINITIONS.get(eventType);
        if (def) events.push(createPrisonerEvent(def, RandomEventSeverity.MINOR, currentDate));
      }
    }
  }

  return events;
}
