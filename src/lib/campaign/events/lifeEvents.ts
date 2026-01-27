import { RandomEventCategory, RandomEventSeverity, LifeEventType } from '@/types/campaign/events/randomEventTypes';
import type { IRandomEvent, RandomFn } from '@/types/campaign/events/randomEventTypes';
import { isSpecificDate, isBirthday, calculateAge } from '@/lib/campaign/events/eventProbability';
import type { IPerson } from '@/types/campaign/Person';

export interface ICalendarCelebration {
  readonly eventType: LifeEventType;
  readonly name: string;
  readonly month: number;
  readonly day: number;
  readonly description: string;
}

export const CALENDAR_CELEBRATIONS: readonly ICalendarCelebration[] = [
  { eventType: LifeEventType.NEW_YEARS, name: "New Year's Day", month: 1, day: 1, description: 'The unit celebrates the new year with festivities and renewed hope.' },
  { eventType: LifeEventType.COMMANDERS_DAY, name: "Commander's Day", month: 3, day: 15, description: 'A day honoring the unit commander and their leadership.' },
  { eventType: LifeEventType.FREEDOM_DAY, name: 'Freedom Day', month: 7, day: 4, description: 'A celebration of independence and the freedom to choose our own path.' },
  { eventType: LifeEventType.WINTER_HOLIDAY, name: 'Winter Holiday', month: 12, day: 25, description: 'Winter holiday celebrations bring warmth and camaraderie to the unit.' },
];

let lifeEventCounter = 0;
function generateLifeEventId(): string {
  return `life-evt-${Date.now()}-${++lifeEventCounter}`;
}

export function _resetLifeEventCounter(): void {
  lifeEventCounter = 0;
}

export function processLifeEvents(
  personnel: ReadonlyMap<string, IPerson>,
  currentDate: string,
  _random: RandomFn
): IRandomEvent[] {
  const events: IRandomEvent[] = [];

  for (const celebration of CALENDAR_CELEBRATIONS) {
    if (isSpecificDate(celebration.month, celebration.day, currentDate)) {
      events.push({
        id: generateLifeEventId(),
        category: RandomEventCategory.LIFE,
        severity: RandomEventSeverity.MINOR,
        title: celebration.name,
        description: celebration.description,
        effects: [{ type: 'notification', message: celebration.name, severity: 'positive' }],
        timestamp: currentDate,
      });
    }
  }

  const personArray = Array.from(personnel.values());
  for (const person of personArray) {
    if (!person.birthDate) continue;
    const birthDateStr = person.birthDate instanceof Date ? person.birthDate.toISOString() : person.birthDate;
    if (isBirthday(birthDateStr, currentDate) && calculateAge(birthDateStr, currentDate) === 16) {
      events.push({
        id: generateLifeEventId(),
        category: RandomEventCategory.LIFE,
        severity: RandomEventSeverity.MINOR,
        title: 'Coming of Age',
        description: `${person.name} has come of age at 16.`,
        effects: [
          { type: 'notification', message: `${person.name} has come of age`, severity: 'positive' },
          { type: 'xp_award', personId: person.id, amount: 5 },
        ],
        timestamp: currentDate,
      });
    }
  }

  return events;
}
