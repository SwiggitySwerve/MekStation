/**
 * Tests for Event Store Service
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { EventCategory, IBaseEvent } from '@/types/events';
import { createEvent, resetSequence } from '@/utils/events/eventFactory';

// Jest globals are available
import {
  EventStoreService,
  getEventStore,
  resetEventStore,
} from '../EventStoreService';

describe('EventStoreService', () => {
  let store: EventStoreService;

  beforeEach(() => {
    store = new EventStoreService();
    resetSequence();
  });

  describe('append', () => {
    it('should append a single event', () => {
      const event = createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      });

      store.append(event);

      expect(store.getEventCount()).toBe(1);
      expect(store.getLatestSequence()).toBe(1);
    });

    it('should reject events with invalid sequence', () => {
      const event1 = createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      });
      store.append(event1);

      // Try to append an event with same or lower sequence
      const badEvent: IBaseEvent = {
        ...event1,
        id: 'new-id',
        sequence: 1, // Same as existing
      };

      expect(() => store.append(badEvent)).toThrow();
    });

    it('should allow non-contiguous sequences', () => {
      const event1 = createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      });
      store.append(event1);

      // Skip some sequence numbers
      resetSequence(10);
      const event2 = createEvent({
        category: EventCategory.Game,
        type: 'test2',
        payload: {},
        context: {},
      });
      store.append(event2);

      expect(store.getEventCount()).toBe(2);
      expect(store.getLatestSequence()).toBe(11);
    });
  });

  describe('appendBatch', () => {
    it('should append multiple events atomically', () => {
      const events = [
        createEvent({
          category: EventCategory.Game,
          type: 'e1',
          payload: {},
          context: {},
        }),
        createEvent({
          category: EventCategory.Game,
          type: 'e2',
          payload: {},
          context: {},
        }),
        createEvent({
          category: EventCategory.Game,
          type: 'e3',
          payload: {},
          context: {},
        }),
      ];

      store.appendBatch(events);

      expect(store.getEventCount()).toBe(3);
      expect(store.getLatestSequence()).toBe(3);
    });

    it('should handle empty batch', () => {
      store.appendBatch([]);
      expect(store.getEventCount()).toBe(0);
    });

    it('should sort events by sequence before appending', () => {
      const e1 = createEvent({
        category: EventCategory.Game,
        type: 'e1',
        payload: {},
        context: {},
      });
      const e2 = createEvent({
        category: EventCategory.Game,
        type: 'e2',
        payload: {},
        context: {},
      });
      const e3 = createEvent({
        category: EventCategory.Game,
        type: 'e3',
        payload: {},
        context: {},
      });

      // Append out of order
      store.appendBatch([e3, e1, e2]);

      const all = store.getAllEvents();
      expect(all[0].sequence).toBe(1);
      expect(all[1].sequence).toBe(2);
      expect(all[2].sequence).toBe(3);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Set up test data
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'movement',
          payload: {},
          context: { gameId: 'g1', unitId: 'u1' },
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'attack',
          payload: {},
          context: { gameId: 'g1', unitId: 'u2' },
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Pilot,
          type: 'xp_gained',
          payload: {},
          context: { pilotId: 'p1' },
        }),
      );
    });

    it('should return all events with no filters', () => {
      const result = store.query();
      expect(result.events.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by category', () => {
      const result = store.query({
        filters: { category: EventCategory.Game },
      });
      expect(result.events.length).toBe(2);
      expect(
        result.events.every((e) => e.category === EventCategory.Game),
      ).toBe(true);
    });

    it('should filter by types', () => {
      const result = store.query({
        filters: { types: ['movement', 'xp_gained'] },
      });
      expect(result.events.length).toBe(2);
    });

    it('should filter by context', () => {
      const result = store.query({
        filters: { context: { unitId: 'u1' } },
      });
      expect(result.events.length).toBe(1);
      expect(result.events[0].context.unitId).toBe('u1');
    });

    it('should filter by sequence range', () => {
      const result = store.query({
        filters: { sequenceRange: { from: 1, to: 2 } },
      });
      expect(result.events.length).toBe(2);
    });

    it('should paginate results', () => {
      const result = store.query({
        pagination: { offset: 1, limit: 1 },
      });
      expect(result.events.length).toBe(1);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should sort by sequence ascending', () => {
      const result = store.query({
        sort: { field: 'sequence', direction: 'asc' },
      });
      expect(result.events[0].sequence).toBeLessThan(result.events[1].sequence);
    });

    it('should sort by sequence descending', () => {
      const result = store.query({
        sort: { field: 'sequence', direction: 'desc' },
      });
      expect(result.events[0].sequence).toBeGreaterThan(
        result.events[1].sequence,
      );
    });
  });

  describe('getEventsInRange', () => {
    it('should return events in sequence range', () => {
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e1',
          payload: {},
          context: {},
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e2',
          payload: {},
          context: {},
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e3',
          payload: {},
          context: {},
        }),
      );

      const events = store.getEventsInRange(1, 2);
      expect(events.length).toBe(2);
      expect(events[0].sequence).toBe(1);
      expect(events[1].sequence).toBe(2);
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', () => {
      const event = createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      });
      store.append(event);

      const found = store.getEventById(event.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(event.id);
    });

    it('should return undefined for non-existent ID', () => {
      const found = store.getEventById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getEventsCausedBy', () => {
    it('should return events caused by a specific event', () => {
      const causeEvent = createEvent({
        category: EventCategory.Game,
        type: 'cause',
        payload: {},
        context: {},
      });
      store.append(causeEvent);

      const effectEvent = createEvent({
        category: EventCategory.Pilot,
        type: 'effect',
        payload: {},
        context: {},
        causedBy: { eventId: causeEvent.id, relationship: 'triggered' },
      });
      store.append(effectEvent);

      const unrelatedEvent = createEvent({
        category: EventCategory.Meta,
        type: 'unrelated',
        payload: {},
        context: {},
      });
      store.append(unrelatedEvent);

      const caused = store.getEventsCausedBy(causeEvent.id);
      expect(caused.length).toBe(1);
      expect(caused[0].id).toBe(effectEvent.id);
    });
  });

  describe('getEventsByCategory', () => {
    it('should return events filtered by category', () => {
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e1',
          payload: {},
          context: {},
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Pilot,
          type: 'e2',
          payload: {},
          context: {},
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e3',
          payload: {},
          context: {},
        }),
      );

      const gameEvents = store.getEventsByCategory(EventCategory.Game);
      expect(gameEvents.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all events', () => {
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e1',
          payload: {},
          context: {},
        }),
      );
      store.append(
        createEvent({
          category: EventCategory.Game,
          type: 'e2',
          payload: {},
          context: {},
        }),
      );

      store.clear();

      expect(store.getEventCount()).toBe(0);
      expect(store.getLatestSequence()).toBe(0);
    });
  });
});

describe('Singleton helpers', () => {
  beforeEach(() => {
    resetEventStore();
  });

  it('should return same instance', () => {
    const store1 = getEventStore();
    const store2 = getEventStore();
    expect(store1).toBe(store2);
  });

  it('should reset instance', () => {
    const store1 = getEventStore();
    resetEventStore();
    const store2 = getEventStore();
    expect(store1).not.toBe(store2);
  });
});
