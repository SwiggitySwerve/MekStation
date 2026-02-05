import type { IPerson } from '@/types/campaign/Person';

import { createSeededRandom } from '@/lib/campaign/events/eventProbability';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import {
  RandomEventCategory,
  RandomEventSeverity,
  PrisonerEventType,
  MINOR_PRISONER_EVENTS,
  MAJOR_PRISONER_EVENTS,
} from '@/types/campaign/events/randomEventTypes';

import {
  MINOR_EVENT_DEFINITIONS,
  MAJOR_EVENT_DEFINITIONS,
  countPrisoners,
  calculatePrisonerCapacity,
  createRansomEvent,
  processPrisonerEvents,
  generateEventId,
  _resetEventCounter,
} from '../prisonerEvents';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockPerson(
  overrides: Partial<IPerson> & { id: string; name: string },
): IPerson {
  return {
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  _resetEventCounter();
});

// =============================================================================
// countPrisoners
// =============================================================================

describe('countPrisoners', () => {
  it('returns 0 for an empty personnel map', () => {
    const personnel = new Map<string, IPerson>();
    expect(countPrisoners(personnel)).toBe(0);
  });

  it('returns 0 when no personnel are POW', () => {
    const personnel = new Map<string, IPerson>([
      [
        'p1',
        createMockPerson({
          id: 'p1',
          name: 'Alpha',
          status: PersonnelStatus.ACTIVE,
        }),
      ],
      [
        'p2',
        createMockPerson({
          id: 'p2',
          name: 'Beta',
          status: PersonnelStatus.WOUNDED,
        }),
      ],
    ]);
    expect(countPrisoners(personnel)).toBe(0);
  });

  it('counts only POW personnel', () => {
    const personnel = new Map<string, IPerson>([
      [
        'p1',
        createMockPerson({
          id: 'p1',
          name: 'Alpha',
          status: PersonnelStatus.POW,
        }),
      ],
      [
        'p2',
        createMockPerson({
          id: 'p2',
          name: 'Beta',
          status: PersonnelStatus.ACTIVE,
        }),
      ],
      [
        'p3',
        createMockPerson({
          id: 'p3',
          name: 'Gamma',
          status: PersonnelStatus.POW,
        }),
      ],
      [
        'p4',
        createMockPerson({
          id: 'p4',
          name: 'Delta',
          status: PersonnelStatus.KIA,
        }),
      ],
    ]);
    expect(countPrisoners(personnel)).toBe(2);
  });

  it('counts all POW when everyone is POW', () => {
    const personnel = new Map<string, IPerson>([
      [
        'p1',
        createMockPerson({
          id: 'p1',
          name: 'Alpha',
          status: PersonnelStatus.POW,
        }),
      ],
      [
        'p2',
        createMockPerson({
          id: 'p2',
          name: 'Beta',
          status: PersonnelStatus.POW,
        }),
      ],
      [
        'p3',
        createMockPerson({
          id: 'p3',
          name: 'Gamma',
          status: PersonnelStatus.POW,
        }),
      ],
    ]);
    expect(countPrisoners(personnel)).toBe(3);
  });
});

// =============================================================================
// calculatePrisonerCapacity
// =============================================================================

describe('calculatePrisonerCapacity', () => {
  it('returns 0 overflow for 0 prisoners', () => {
    const cap = calculatePrisonerCapacity(0);
    expect(cap.maxCapacity).toBe(100);
    expect(cap.currentPrisoners).toBe(0);
    expect(cap.overflowPercentage).toBe(0);
  });

  it('returns 0 overflow when under capacity', () => {
    const cap = calculatePrisonerCapacity(50);
    expect(cap.maxCapacity).toBe(100);
    expect(cap.currentPrisoners).toBe(50);
    expect(cap.overflowPercentage).toBe(0);
  });

  it('returns 0 overflow at exact capacity', () => {
    const cap = calculatePrisonerCapacity(100);
    expect(cap.overflowPercentage).toBe(0);
  });

  it('returns positive overflow when over capacity', () => {
    const cap = calculatePrisonerCapacity(150);
    expect(cap.overflowPercentage).toBe(0.5);
  });

  it('returns 1.0 overflow at double capacity', () => {
    const cap = calculatePrisonerCapacity(200);
    expect(cap.overflowPercentage).toBe(1.0);
  });

  it('uses custom base capacity', () => {
    const cap = calculatePrisonerCapacity(30, 50);
    expect(cap.maxCapacity).toBe(50);
    expect(cap.currentPrisoners).toBe(30);
    expect(cap.overflowPercentage).toBe(0);
  });

  it('handles 0 base capacity with prisoners', () => {
    const cap = calculatePrisonerCapacity(10, 0);
    expect(cap.overflowPercentage).toBe(1.0);
  });

  it('handles 0 base capacity with 0 prisoners', () => {
    const cap = calculatePrisonerCapacity(0, 0);
    expect(cap.overflowPercentage).toBe(0);
  });
});

// =============================================================================
// MINOR_EVENT_DEFINITIONS
// =============================================================================

describe('MINOR_EVENT_DEFINITIONS', () => {
  it('has exactly 20 entries', () => {
    expect(MINOR_EVENT_DEFINITIONS.size).toBe(20);
  });

  it('has an entry for every MINOR_PRISONER_EVENTS type', () => {
    for (const eventType of MINOR_PRISONER_EVENTS) {
      expect(MINOR_EVENT_DEFINITIONS.has(eventType)).toBe(true);
    }
  });

  it('each entry has a title, description, and effects', () => {
    MINOR_EVENT_DEFINITIONS.forEach((def) => {
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.effects.length).toBeGreaterThan(0);
    });
  });

  it('each entry type matches its map key', () => {
    MINOR_EVENT_DEFINITIONS.forEach((def, key) => {
      expect(def.type).toBe(key);
    });
  });
});

// =============================================================================
// MAJOR_EVENT_DEFINITIONS
// =============================================================================

describe('MAJOR_EVENT_DEFINITIONS', () => {
  it('has exactly 10 entries', () => {
    expect(MAJOR_EVENT_DEFINITIONS.size).toBe(10);
  });

  it('has an entry for every MAJOR_PRISONER_EVENTS type', () => {
    for (const eventType of MAJOR_PRISONER_EVENTS) {
      expect(MAJOR_EVENT_DEFINITIONS.has(eventType)).toBe(true);
    }
  });

  it('each entry has a title, description, and effects', () => {
    MAJOR_EVENT_DEFINITIONS.forEach((def) => {
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.effects.length).toBeGreaterThan(0);
    });
  });

  it('each entry type matches its map key', () => {
    MAJOR_EVENT_DEFINITIONS.forEach((def, key) => {
      expect(def.type).toBe(key);
    });
  });

  it('BREAKOUT has prisoner_escape effect', () => {
    const breakout = MAJOR_EVENT_DEFINITIONS.get(PrisonerEventType.BREAKOUT);
    expect(breakout).toBeDefined();
    expect(breakout!.effects.some((e) => e.type === 'prisoner_escape')).toBe(
      true,
    );
  });

  it('RIOT has prisoner_casualty effect', () => {
    const riot = MAJOR_EVENT_DEFINITIONS.get(PrisonerEventType.RIOT);
    expect(riot).toBeDefined();
    expect(riot!.effects.some((e) => e.type === 'prisoner_casualty')).toBe(
      true,
    );
  });
});

// =============================================================================
// generateEventId
// =============================================================================

describe('generateEventId', () => {
  it('generates unique IDs', () => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    expect(id1).not.toBe(id2);
  });

  it('starts with evt- prefix', () => {
    const id = generateEventId();
    expect(id.startsWith('evt-')).toBe(true);
  });

  it('increments counter after reset', () => {
    _resetEventCounter();
    const id1 = generateEventId();
    expect(id1).toMatch(/evt-\d+-1$/);
    const id2 = generateEventId();
    expect(id2).toMatch(/evt-\d+-2$/);
  });
});

// =============================================================================
// createRansomEvent
// =============================================================================

describe('createRansomEvent', () => {
  it('produces a valid IRandomEvent', () => {
    const random = createSeededRandom(42);
    const event = createRansomEvent('3025-01-01', random);
    expect(event.id).toBeTruthy();
    expect(event.category).toBe(RandomEventCategory.PRISONER);
    expect(event.severity).toBe(RandomEventSeverity.MINOR);
    expect(event.title).toBe('Prisoner Ransom');
    expect(event.timestamp).toBe('3025-01-01');
  });

  it('has a financial effect with amount between 5000 and 20000', () => {
    const random = createSeededRandom(42);
    const event = createRansomEvent('3025-01-01', random);
    expect(event.effects.length).toBe(1);
    const effect = event.effects[0];
    expect(effect.type).toBe('financial');
    if (effect.type === 'financial') {
      expect(effect.amount).toBeGreaterThanOrEqual(5000);
      expect(effect.amount).toBeLessThanOrEqual(20000);
    }
  });

  it('produces deterministic amount with same seed', () => {
    const r1 = createSeededRandom(42);
    const r2 = createSeededRandom(42);
    const e1 = createRansomEvent('3025-01-01', r1);
    _resetEventCounter();
    const e2 = createRansomEvent('3025-01-01', r2);
    const a1 = e1.effects[0].type === 'financial' ? e1.effects[0].amount : 0;
    const a2 = e2.effects[0].type === 'financial' ? e2.effects[0].amount : 0;
    expect(a1).toBe(a2);
  });

  it('includes description in financial effect', () => {
    const random = createSeededRandom(99);
    const event = createRansomEvent('3025-06-01', random);
    const effect = event.effects[0];
    if (effect.type === 'financial') {
      expect(effect.description).toBe('Prisoner ransom payment received');
    }
  });
});

// =============================================================================
// processPrisonerEvents
// =============================================================================

describe('processPrisonerEvents', () => {
  it('returns empty array when prisoner count is 0', () => {
    const random = createSeededRandom(42);
    const events = processPrisonerEvents(0, '3025-01-06', random);
    expect(events).toEqual([]);
  });

  it('returns empty array on a non-Monday, non-first-of-month day', () => {
    // 3025-01-04 is a Tuesday (day 2)
    const random = createSeededRandom(42);
    const events = processPrisonerEvents(50, '3025-01-04', random);
    expect(events).toEqual([]);
  });

  it('can fire ransom event on 1st of month', () => {
    // Run many seeds to find one that triggers ransom (10% chance)
    let ransomFound = false;
    for (let seed = 0; seed < 200; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(50, '3025-02-01', random);
      if (events.some((e) => e.title === 'Prisoner Ransom')) {
        ransomFound = true;
        break;
      }
    }
    expect(ransomFound).toBe(true);
  });

  it('can fire events on Monday', () => {
    // 3025-01-03 is a Monday (day 1)
    let eventFound = false;
    for (let seed = 0; seed < 200; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(50, '3025-01-03', random);
      if (events.length > 0) {
        eventFound = true;
        break;
      }
    }
    expect(eventFound).toBe(true);
  });

  it('produces deterministic results with same seed', () => {
    const date = '3025-01-03'; // Monday
    const r1 = createSeededRandom(42);
    const r2 = createSeededRandom(42);
    _resetEventCounter();
    const events1 = processPrisonerEvents(50, date, r1);
    _resetEventCounter();
    const events2 = processPrisonerEvents(50, date, r2);
    expect(events1.length).toBe(events2.length);
    for (let i = 0; i < events1.length; i++) {
      expect(events1[i].title).toBe(events2[i].title);
      expect(events1[i].severity).toBe(events2[i].severity);
    }
  });

  it('all generated events have PRISONER category', () => {
    for (let seed = 0; seed < 50; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      // 3025-08-01 is Monday + 1st of month
      const events = processPrisonerEvents(150, '3025-08-01', random, 100);
      for (const event of events) {
        expect(event.category).toBe(RandomEventCategory.PRISONER);
      }
    }
  });

  it('all generated events have valid timestamps', () => {
    const date = '3025-01-03';
    for (let seed = 0; seed < 50; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(50, date, random);
      for (const event of events) {
        expect(event.timestamp).toBe(date);
      }
    }
  });

  it('higher overflow increases event probability', () => {
    // Compare event rates: under capacity vs way over capacity
    let underCapacityEvents = 0;
    let overCapacityEvents = 0;
    const trials = 500;

    for (let seed = 0; seed < trials; seed++) {
      _resetEventCounter();
      const r1 = createSeededRandom(seed);
      const eventsUnder = processPrisonerEvents(50, '3025-01-03', r1, 100);
      underCapacityEvents += eventsUnder.length;

      _resetEventCounter();
      const r2 = createSeededRandom(seed);
      const eventsOver = processPrisonerEvents(300, '3025-01-03', r2, 100);
      overCapacityEvents += eventsOver.length;
    }

    expect(overCapacityEvents).toBeGreaterThan(underCapacityEvents);
  });

  it('events on Monday have correct severity (MINOR or MAJOR)', () => {
    for (let seed = 0; seed < 100; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(50, '3025-01-03', random);
      for (const event of events) {
        if (event.title !== 'Prisoner Ransom') {
          expect([
            RandomEventSeverity.MINOR,
            RandomEventSeverity.MAJOR,
          ]).toContain(event.severity);
        }
      }
    }
  });

  it('ransom events on 1st of month have MINOR severity', () => {
    for (let seed = 0; seed < 200; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(50, '3025-02-01', random);
      const ransomEvents = events.filter((e) => e.title === 'Prisoner Ransom');
      for (const re of ransomEvents) {
        expect(re.severity).toBe(RandomEventSeverity.MINOR);
      }
    }
  });

  it('can produce both ransom and weekly events on a Monday 1st', () => {
    // 3025-08-01 is Monday AND 1st of month
    let bothFound = false;
    for (let seed = 0; seed < 500; seed++) {
      _resetEventCounter();
      const random = createSeededRandom(seed);
      const events = processPrisonerEvents(150, '3025-08-01', random, 100);
      const hasRansom = events.some((e) => e.title === 'Prisoner Ransom');
      const hasWeekly = events.some((e) => e.title !== 'Prisoner Ransom');
      if (hasRansom && hasWeekly) {
        bothFound = true;
        break;
      }
    }
    expect(bothFound).toBe(true);
  });
});
