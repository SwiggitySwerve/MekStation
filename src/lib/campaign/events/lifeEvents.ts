import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  IRandomEvent,
  RandomFn,
} from '@/types/campaign/events/randomEventTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { isSpecificDate } from '@/lib/campaign/events/eventProbability';
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
 * Birthday / Coming of Age events are deferred: `ICampaignRosterEntry` and `IPilot`
 * do not carry a `dateOfBirth` field yet. The loop is intentionally stubbed out
 * with a TODO until `ICampaignRosterEntry.dateOfBirth` lands (tracked under
 * FIXME(person-dob-field) in the roster entry spec).
 *
 * NPC behavior: PROCESS — calendar events fire regardless of personnel contents.
 * Per-person events will apply to NPCs and PCs alike once dateOfBirth is available.
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

  // TODO(person-dob-field): Coming of Age / birthday events require `dateOfBirth`
  // on ICampaignRosterEntry or IPilot. Neither type carries the field yet.
  // Re-enable this loop once the field lands:
  //
  //   for (const { entry } of entries) {
  //     if (!entry.dateOfBirth) continue;
  //     const dobStr = entry.dateOfBirth instanceof Date
  //       ? entry.dateOfBirth.toISOString()
  //       : entry.dateOfBirth;
  //     if (isBirthday(dobStr, currentDate) && calculateAge(dobStr, currentDate) === 16) {
  //       events.push({ ... Coming of Age event using entry.pilotName / entry.pilotId ... });
  //     }
  //   }
  void entries; // suppress unused-variable lint until the loop above is re-enabled

  return events;
}
