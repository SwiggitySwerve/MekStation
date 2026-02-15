import type {
  IRandomEvent,
  RandomFn,
} from '@/types/campaign/events/randomEventTypes';
import type { IPerson } from '@/types/campaign/Person';

import {
  rollForEvent,
  selectRandomEvent,
  isMonday,
  isFirstOfMonth,
} from '@/lib/campaign/events/eventProbability';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import {
  RandomEventCategory,
  RandomEventSeverity,
  MINOR_PRISONER_EVENTS,
  MAJOR_PRISONER_EVENTS,
} from '@/types/campaign/events/randomEventTypes';

import type { IPrisonerEventDefinition } from './minorEventDefinitions';

import { MAJOR_EVENT_DEFINITIONS } from './majorEventDefinitions';
import { MINOR_EVENT_DEFINITIONS } from './minorEventDefinitions';

export interface IPrisonerCapacity {
  readonly maxCapacity: number;
  readonly currentPrisoners: number;
  readonly overflowPercentage: number;
}

export function countPrisoners(
  personnel: ReadonlyMap<string, IPerson>,
): number {
  let count = 0;
  personnel.forEach((person) => {
    if (person.status === PersonnelStatus.POW) count++;
  });
  return count;
}

export function calculatePrisonerCapacity(
  prisonerCount: number,
  baseCapacity: number = 100,
): IPrisonerCapacity {
  return {
    maxCapacity: baseCapacity,
    currentPrisoners: prisonerCount,
    overflowPercentage:
      baseCapacity > 0
        ? Math.max(0, (prisonerCount - baseCapacity) / baseCapacity)
        : prisonerCount > 0
          ? 1.0
          : 0,
  };
}

let eventCounter = 0;

export function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

export function _resetEventCounter(): void {
  eventCounter = 0;
}

function createPrisonerEvent(
  def: IPrisonerEventDefinition,
  severity: RandomEventSeverity,
  timestamp: string,
): IRandomEvent {
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

export function createRansomEvent(
  timestamp: string,
  random: RandomFn,
): IRandomEvent {
  const amount = 5000 + Math.floor(random() * 15000);
  return {
    id: generateEventId(),
    category: RandomEventCategory.PRISONER,
    severity: RandomEventSeverity.MINOR,
    title: 'Prisoner Ransom',
    description: `A faction has offered ransom for the return of a prisoner. Payment: ${amount} C-Bills.`,
    effects: [
      {
        type: 'financial',
        amount,
        description: 'Prisoner ransom payment received',
      },
    ],
    timestamp,
  };
}

export function processPrisonerEvents(
  prisonerCount: number,
  currentDate: string,
  random: RandomFn,
  baseCapacity: number = 100,
): IRandomEvent[] {
  if (prisonerCount === 0) return [];

  const events: IRandomEvent[] = [];
  const capacity = calculatePrisonerCapacity(prisonerCount, baseCapacity);

  if (isFirstOfMonth(currentDate)) {
    if (rollForEvent(0.1, random)) {
      events.push(createRansomEvent(currentDate, random));
    }
  }

  if (isMonday(currentDate)) {
    const eventChance = Math.min(0.5, 0.2 + capacity.overflowPercentage * 0.3);
    if (rollForEvent(eventChance, random)) {
      const isMajor = rollForEvent(0.2, random);
      if (isMajor) {
        const eventType = selectRandomEvent(MAJOR_PRISONER_EVENTS, random);
        const def = MAJOR_EVENT_DEFINITIONS.get(eventType);
        if (def)
          events.push(
            createPrisonerEvent(def, RandomEventSeverity.MAJOR, currentDate),
          );
      } else {
        const eventType = selectRandomEvent(MINOR_PRISONER_EVENTS, random);
        const def = MINOR_EVENT_DEFINITIONS.get(eventType);
        if (def)
          events.push(
            createPrisonerEvent(def, RandomEventSeverity.MINOR, currentDate),
          );
      }
    }
  }

  return events;
}
