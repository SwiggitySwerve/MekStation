import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import type { IPerson } from '@/types/campaign/Person';
import { RandomEventCategory, RandomEventSeverity, LifeEventType } from '@/types/campaign/events/randomEventTypes';
import { createSeededRandom } from '@/lib/campaign/events/eventProbability';
import { processLifeEvents, CALENDAR_CELEBRATIONS, _resetLifeEventCounter } from '@/lib/campaign/events/lifeEvents';

const createMockPerson = (overrides: Partial<IPerson> = {}): IPerson => ({
  id: 'test-1',
  name: 'Test Person',
  status: PersonnelStatus.ACTIVE,
  primaryRole: CampaignPersonnelRole.PILOT,
  rank: 'Private',
  rankIndex: 0,
  recruitmentDate: new Date('3025-01-01'),
  xp: 0,
  totalXpEarned: 0,
  xpSpent: 0,
  hits: 0,
  injuries: [],
  daysToWaitForHealing: 0,
  skills: {},
  attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
  pilotSkills: { gunnery: 4, piloting: 5 },
  missionsCompleted: 0,
  totalKills: 0,
  createdAt: '3025-01-01T00:00:00Z',
  updatedAt: '3025-01-01T00:00:00Z',
  ...overrides,
});

describe('lifeEvents', () => {
  beforeEach(() => {
    _resetLifeEventCounter();
  });

  describe('CALENDAR_CELEBRATIONS', () => {
    it('should have exactly 4 calendar celebrations', () => {
      expect(CALENDAR_CELEBRATIONS.length).toBe(4);
    });

    it('should have New Years Day on Jan 1', () => {
      const newYears = CALENDAR_CELEBRATIONS.find((c) => c.eventType === LifeEventType.NEW_YEARS);
      expect(newYears).toBeDefined();
      expect(newYears?.month).toBe(1);
      expect(newYears?.day).toBe(1);
    });

    it('should have Commanders Day on Mar 15', () => {
      const commandersDay = CALENDAR_CELEBRATIONS.find((c) => c.eventType === LifeEventType.COMMANDERS_DAY);
      expect(commandersDay).toBeDefined();
      expect(commandersDay?.month).toBe(3);
      expect(commandersDay?.day).toBe(15);
    });

    it('should have Freedom Day on Jul 4', () => {
      const freedomDay = CALENDAR_CELEBRATIONS.find((c) => c.eventType === LifeEventType.FREEDOM_DAY);
      expect(freedomDay).toBeDefined();
      expect(freedomDay?.month).toBe(7);
      expect(freedomDay?.day).toBe(4);
    });

    it('should have Winter Holiday on Dec 25', () => {
      const winterHoliday = CALENDAR_CELEBRATIONS.find((c) => c.eventType === LifeEventType.WINTER_HOLIDAY);
      expect(winterHoliday).toBeDefined();
      expect(winterHoliday?.month).toBe(12);
      expect(winterHoliday?.day).toBe(25);
    });
  });

  describe('processLifeEvents - calendar celebrations', () => {
    it('should fire New Years Day event on Jan 1', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("New Year's Day");
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Commanders Day event on Mar 15', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-03-15', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe("Commander's Day");
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Freedom Day event on Jul 4', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-07-04', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Freedom Day');
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should fire Winter Holiday event on Dec 25', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-12-25', random);

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Winter Holiday');
      expect(events[0].category).toBe(RandomEventCategory.LIFE);
      expect(events[0].severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should return no events on a non-celebration date', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-06-15', random);

      expect(events.length).toBe(0);
    });
  });

  describe('processLifeEvents - coming of age', () => {
    it('should fire coming-of-age event for person turning 16 on their birthday', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Alice',
        birthDate: '3009-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent).toBeDefined();
      expect(comingOfAgeEvent?.description).toContain('Alice');
      expect(comingOfAgeEvent?.category).toBe(RandomEventCategory.LIFE);
      expect(comingOfAgeEvent?.severity).toBe(RandomEventSeverity.MINOR);
    });

    it('should not fire coming-of-age for person not turning 16', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Bob',
        birthDate: '3010-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent).toBeUndefined();
    });

    it('should not fire coming-of-age if not their birthday', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Charlie',
        birthDate: '3009-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-02', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent).toBeUndefined();
    });

    it('should not fire coming-of-age if birthDate is undefined', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Diana',
        birthDate: undefined,
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent).toBeUndefined();
    });

    it('should include xp_award effect in coming-of-age event', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Eve',
        birthDate: '3009-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent?.effects).toContainEqual(
        expect.objectContaining({
          type: 'xp_award',
          personId: 'person-1',
          amount: 5,
        })
      );
    });

    it('should include notification effect in coming-of-age event', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Frank',
        birthDate: '3009-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent?.effects).toContainEqual(
        expect.objectContaining({
          type: 'notification',
          message: 'Frank has come of age',
          severity: 'positive',
        })
      );
    });
  });

  describe('processLifeEvents - multiple events', () => {
    it('should fire both celebration and coming-of-age on same day', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Grace',
        birthDate: '3009-01-01',
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      expect(events.length).toBe(2);
      expect(events.some((e) => e.title === "New Year's Day")).toBe(true);
      expect(events.some((e) => e.title === 'Coming of Age')).toBe(true);
    });

    it('should handle multiple personnel with different birthdays', () => {
      const person1 = createMockPerson({
        id: 'person-1',
        name: 'Henry',
        birthDate: '3009-01-01',
      });
      const person2 = createMockPerson({
        id: 'person-2',
        name: 'Iris',
        birthDate: '3010-01-01',
      });
      const personnel = new Map<string, IPerson>([
        ['person-1', person1],
        ['person-2', person2],
      ]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvents = events.filter((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvents.length).toBe(1);
      expect(comingOfAgeEvents[0].description).toContain('Henry');
    });

    it('should handle Date object birthDate', () => {
      const person = createMockPerson({
        id: 'person-1',
        name: 'Jack',
        birthDate: new Date('3009-01-01'),
      });
      const personnel = new Map<string, IPerson>([['person-1', person]]);
      const random = createSeededRandom(42);
      const events = processLifeEvents(personnel, '3025-01-01', random);

      const comingOfAgeEvent = events.find((e) => e.title === 'Coming of Age');
      expect(comingOfAgeEvent).toBeDefined();
      expect(comingOfAgeEvent?.description).toContain('Jack');
    });
  });

  describe('event IDs', () => {
    it('should generate unique event IDs', () => {
      const personnel = new Map<string, IPerson>();
      const random = createSeededRandom(42);
      const events1 = processLifeEvents(personnel, '3025-01-01', random);
      const events2 = processLifeEvents(personnel, '3025-03-15', random);

      const allIds = [...events1, ...events2].map((e) => e.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
