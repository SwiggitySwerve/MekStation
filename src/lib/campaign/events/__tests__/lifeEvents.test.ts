import type { ILifeEventPersonPair } from '@/lib/campaign/events/lifeEvents';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { createSeededRandom } from '@/lib/campaign/events/eventProbability';
import {
  processLifeEvents,
  CALENDAR_CELEBRATIONS,
  _resetLifeEventCounter,
} from '@/lib/campaign/events/lifeEvents';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  RandomEventCategory,
  RandomEventSeverity,
  LifeEventType,
} from '@/types/campaign/events/randomEventTypes';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Test factories
// =============================================================================

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'Test Person',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'Test Person',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePair(
  entryOverrides: Partial<ICampaignRosterEntry> = {},
  pilot: IPilot | null = makePilot(),
): ILifeEventPersonPair {
  return { entry: makeEntry(entryOverrides), pilot };
}

describe('lifeEvents', () => {
  beforeEach(() => {
    _resetLifeEventCounter();
  });

  describe('CALENDAR_CELEBRATIONS', () => {
    it('should have exactly 4 calendar celebrations', () => {
      expect(CALENDAR_CELEBRATIONS.length).toBe(4);
    });

    it('should have New Years Day on Jan 1', () => {
      const newYears = CALENDAR_CELEBRATIONS.find(
        (c) => c.eventType === LifeEventType.NEW_YEARS,
      );
      expect(newYears).toBeDefined();
      expect(newYears?.month).toBe(1);
      expect(newYears?.day).toBe(1);
    });

    it('should have Commanders Day on Mar 15', () => {
      const commandersDay = CALENDAR_CELEBRATIONS.find(
        (c) => c.eventType === LifeEventType.COMMANDERS_DAY,
      );
      expect(commandersDay).toBeDefined();
      expect(commandersDay?.month).toBe(3);
      expect(commandersDay?.day).toBe(15);
    });

    it('should have Freedom Day on Jul 4', () => {
      const freedomDay = CALENDAR_CELEBRATIONS.find(
        (c) => c.eventType === LifeEventType.FREEDOM_DAY,
      );
      expect(freedomDay).toBeDefined();
      expect(freedomDay?.month).toBe(7);
      expect(freedomDay?.day).toBe(4);
    });

    it('should have Winter Holiday on Dec 25', () => {
      const winterHoliday = CALENDAR_CELEBRATIONS.find(
        (c) => c.eventType === LifeEventType.WINTER_HOLIDAY,
      );
      expect(winterHoliday).toBeDefined();
      expect(winterHoliday?.month).toBe(12);
      expect(winterHoliday?.day).toBe(25);
    });
  });

  describe('processLifeEvents - calendar celebrations', () => {
    it('should fire New Years Day event on Jan 1', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-01-01', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("New Year's Day");
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Commanders Day event on Mar 15', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-03-15', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("Commander's Day");
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Freedom Day event on Jul 4', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-07-04', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Freedom Day');
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Winter Holiday event on Dec 25', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-12-25', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Winter Holiday');
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should return no events on a non-celebration date', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-06-15', random);

      expect(events.length).toBe(0);
    });

    it('should return exactly 1 event on celebration date regardless of roster size', () => {
      // Calendar events are per-date, not per-person — roster size is irrelevant
      const entries: ILifeEventPersonPair[] = [
        makePair(),
        makePair({ pilotId: 'pilot-002', pilotName: 'Second Pilot' }),
      ];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-01-01', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("New Year's Day");
    });
  });

  describe('processLifeEvents - coming of age', () => {
    /** Find the Coming-of-Age event in a result set, if any. */
    const findCoA = (events: ReturnType<typeof processLifeEvents>) =>
      events.find((e) => e.title === 'Coming of Age');

    it('fires a Coming-of-Age event on the pilot’s 16th birthday', () => {
      // Born 3009-06-15 → turns 16 on 3025-06-15.
      const entries: ILifeEventPersonPair[] = [
        makePair(
          { pilotName: 'Cadet Vega' },
          makePilot({ birthDate: '3009-06-15' }),
        ),
      ];
      const events = processLifeEvents(
        entries,
        '3025-06-15',
        createSeededRandom(42),
      );

      const coa = findCoA(events);
      expect(coa).toBeDefined();
      expect(coa?.category).toBe(RandomEventCategory.LIFE);
      expect(coa?.severity).toBe(RandomEventSeverity.MINOR);
      expect(coa?.description).toContain('Cadet Vega');
    });

    it('does not fire on a date that is not the pilot’s birthday', () => {
      const entries: ILifeEventPersonPair[] = [
        makePair({}, makePilot({ birthDate: '3009-06-15' })),
      ];
      const events = processLifeEvents(
        entries,
        '3025-06-16',
        createSeededRandom(42),
      );
      expect(findCoA(events)).toBeUndefined();
    });

    it('does not fire when the pilot turns an age other than 16', () => {
      // Born 3008-06-15 → turns 17 on 3025-06-15, not a coming-of-age year.
      const entries: ILifeEventPersonPair[] = [
        makePair({}, makePilot({ birthDate: '3008-06-15' })),
      ];
      const events = processLifeEvents(
        entries,
        '3025-06-15',
        createSeededRandom(42),
      );
      expect(findCoA(events)).toBeUndefined();
    });

    it('does not fire for an entry with no joined pilot (NPC)', () => {
      const entries: ILifeEventPersonPair[] = [makePair({}, null)];
      const events = processLifeEvents(
        entries,
        '3025-06-15',
        createSeededRandom(42),
      );
      expect(findCoA(events)).toBeUndefined();
    });

    it('does not fire when the joined pilot has no recorded birth date', () => {
      const entries: ILifeEventPersonPair[] = [makePair()]; // default pilot, no birthDate
      const events = processLifeEvents(
        entries,
        '3025-06-15',
        createSeededRandom(42),
      );
      expect(findCoA(events)).toBeUndefined();
    });

    it('fires alongside a calendar celebration that lands the same day', () => {
      // Born 3009-01-01 → 16th birthday coincides with New Year’s Day.
      const entries: ILifeEventPersonPair[] = [
        makePair({}, makePilot({ birthDate: '3009-01-01' })),
      ];
      const events = processLifeEvents(
        entries,
        '3025-01-01',
        createSeededRandom(42),
      );
      expect(events.map((e) => e.title)).toEqual(
        expect.arrayContaining(["New Year's Day", 'Coming of Age']),
      );
    });
  });

  describe('processLifeEvents - NPC support', () => {
    it('calendar events fire with NPC entries (pilot=null)', () => {
      // Calendar celebrations do not depend on pilot vault data — NPCs are no different
      const entries: ILifeEventPersonPair[] = [makePair({}, null)];
      const random = createSeededRandom(42);
      const events = processLifeEvents(entries, '3025-01-01', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("New Year's Day");
    });
  });

  describe('event IDs', () => {
    it('should generate unique event IDs', () => {
      const entries: ILifeEventPersonPair[] = [];
      const random = createSeededRandom(42);
      const events1 = processLifeEvents(entries, '3025-01-01', random);
      const events2 = processLifeEvents(entries, '3025-03-15', random);

      const allIds = [...events1, ...events2].map((e) => e.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
