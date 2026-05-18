import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  IRandomEvent,
  RandomFn,
} from '@/types/campaign/events/randomEventTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import {
  calculateAge,
  isBirthday,
  isSpecificDate,
} from '@/lib/campaign/events/eventProbability';
import {
  RandomEventCategory,
  RandomEventSeverity,
  LifeEventType,
} from '@/types/campaign/events/randomEventTypes';

export interface ICalendarCelebration {
  readonly eventType: LifeEventType;
  readonly name: string;
  readonly month: number;
  readonly day: number;
  readonly description: string;
}

export const CALENDAR_CELEBRATIONS: readonly ICalendarCelebration[] = [
  {
    eventType: LifeEventType.NEW_YEARS,
    name: "New Year's Day",
    month: 1,
    day: 1,
    description:
      'The unit celebrates the new year with festivities and renewed hope.',
  },
  {
    eventType: LifeEventType.COMMANDERS_DAY,
    name: "Commander's Day",
    month: 3,
    day: 15,
    description: 'A day honoring the unit commander and their leadership.',
  },
  {
    eventType: LifeEventType.FREEDOM_DAY,
    name: 'Freedom Day',
    month: 7,
    day: 4,
    description:
      'A celebration of independence and the freedom to choose our own path.',
  },
  {
    eventType: LifeEventType.WINTER_HOLIDAY,
    name: 'Winter Holiday',
    month: 12,
    day: 25,
    description:
      'Winter holiday celebrations bring warmth and camaraderie to the unit.',
  },
];

/**
 * Age (in years) at which a pilot "comes of age" — reaches adulthood. Matches
 * the MekHQ convention used elsewhere in the progression rules.
 */
const COMING_OF_AGE_YEARS = 16;

/**
 * XP awarded to a pilot on their Coming-of-Age event. Per the `random-events`
 * spec ("Life Events" → "Coming-of-age at 16"), the event carries a 5 XP award.
 */
const COMING_OF_AGE_XP_AWARD = 5;

let lifeEventCounter = 0;
function generateLifeEventId(): string {
  return `life-evt-${Date.now()}-${++lifeEventCounter}`;
}

export function _resetLifeEventCounter(): void {
  lifeEventCounter = 0;
}

/** Joined entry+pilot pair fed into processLifeEvents. */
export interface ILifeEventPersonPair {
  readonly entry: ICampaignRosterEntry;
  readonly pilot: IPilot | null;
}

/**
 * Processes life events for a campaign turn.
 *
 * Calendar celebrations (New Year's, Commander's Day, Freedom Day, Winter Holiday)
 * are checked against the current date. They do not require per-person data.
 *
 * Coming-of-Age events fire for a PC roster entry on the calendar day the
 * joined vault `IPilot` turns 16. They are driven by `IPilot.birthDate`
 * (resolved via the entry→pilot join); NPC entries carry a frozen statblock
 * with no birth date, so they do not generate Coming-of-Age events.
 *
 * NPC behavior: PROCESS — calendar events fire regardless of personnel
 * contents; Coming-of-Age is PC-only because only vault pilots carry a
 * birth date.
 *
 * @param entries - Array of joined entry+pilot pairs for the active roster
 * @param currentDate - ISO date string for the current campaign turn
 * @param _random - RNG (reserved for future random life events)
 */
export function processLifeEvents(
  entries: ReadonlyArray<ILifeEventPersonPair>,
  currentDate: string,
  _random: RandomFn,
): IRandomEvent[] {
  const events: IRandomEvent[] = [];

  // Calendar celebrations — no per-person data required
  for (const celebration of CALENDAR_CELEBRATIONS) {
    if (isSpecificDate(celebration.month, celebration.day, currentDate)) {
      events.push({
        id: generateLifeEventId(),
        category: RandomEventCategory.LIFE,
        severity: RandomEventSeverity.MINOR,
        title: celebration.name,
        description: celebration.description,
        effects: [
          {
            type: 'notification',
            message: celebration.name,
            severity: 'positive',
          },
        ],
        timestamp: currentDate,
      });
    }
  }

  // Coming-of-Age events — fire on the day a PC pilot turns 16. Driven by the
  // joined vault `IPilot.birthDate`; entries with no joined pilot (NPCs) or no
  // recorded birth date are skipped.
  for (const { entry, pilot } of entries) {
    const birthDate = pilot?.birthDate;
    if (!birthDate) continue;
    if (
      isBirthday(birthDate, currentDate) &&
      calculateAge(birthDate, currentDate) === COMING_OF_AGE_YEARS
    ) {
      events.push({
        id: generateLifeEventId(),
        category: RandomEventCategory.LIFE,
        severity: RandomEventSeverity.MINOR,
        title: 'Coming of Age',
        description: `${entry.pilotName} has come of age, reaching adulthood at ${COMING_OF_AGE_YEARS}.`,
        effects: [
          {
            type: 'xp_award',
            personId: entry.pilotId,
            amount: COMING_OF_AGE_XP_AWARD,
          },
          {
            type: 'notification',
            message: `${entry.pilotName} has come of age`,
            severity: 'positive',
          },
        ],
        timestamp: currentDate,
      });
    }
  }

  return events;
}
