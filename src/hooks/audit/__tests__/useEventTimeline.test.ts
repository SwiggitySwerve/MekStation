/**
 * Tests for useEventTimeline Hook
 *
 * @module hooks/audit/__tests__/useEventTimeline.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useEventTimeline,
  useGameTimeline,
  usePilotTimeline,
  useCampaignTimeline,
  useUnitInstanceTimeline,
  usePilotInstanceTimeline,
} from '../useEventTimeline';
import { EventStoreService } from '@/services/events';
import { EventCategory, IBaseEvent } from '@/types/events';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockEvent(
  overrides: Partial<IBaseEvent> = {}
): IBaseEvent {
  return {
    id: `event-${Math.random().toString(36).slice(2)}`,
    sequence: 1,
    timestamp: new Date().toISOString(),
    category: EventCategory.Game,
    type: 'test-event',
    payload: {},
    context: {},
    ...overrides,
  };
}

function createMockEventStore(events: IBaseEvent[] = []): EventStoreService {
  const store = new EventStoreService();
  for (const event of events) {
    store.append(event);
  }
  return store;
}

// =============================================================================
// Tests
// =============================================================================

describe('useEventTimeline', () => {
  describe('initial state', () => {
    it('should return empty events with no data', () => {
      const eventStore = createMockEventStore([]);
      const { result } = renderHook(() =>
        useEventTimeline({ eventStore })
      );

      expect(result.current.events).toEqual([]);
      expect(result.current.pagination.total).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load events on mount', async () => {
      const events = [
        createMockEvent({ sequence: 1 }),
        createMockEvent({ sequence: 2 }),
        createMockEvent({ sequence: 3 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({ eventStore })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(3);
      });

      expect(result.current.pagination.total).toBe(3);
    });
  });

  describe('filtering', () => {
    it('should filter by category', async () => {
      const events = [
        createMockEvent({ sequence: 1, category: EventCategory.Game }),
        createMockEvent({ sequence: 2, category: EventCategory.Campaign }),
        createMockEvent({ sequence: 3, category: EventCategory.Game }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          initialFilters: { category: EventCategory.Game },
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });

      expect(result.current.events.every((e) => e.category === EventCategory.Game)).toBe(true);
    });

    it('should filter by types', async () => {
      const events = [
        createMockEvent({ sequence: 1, type: 'attack' }),
        createMockEvent({ sequence: 2, type: 'movement' }),
        createMockEvent({ sequence: 3, type: 'attack' }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          initialFilters: { types: ['attack'] },
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });

      expect(result.current.events.every((e) => e.type === 'attack')).toBe(true);
    });

    it('should filter by context', async () => {
      const events = [
        createMockEvent({ sequence: 1, context: { gameId: 'game-1' } }),
        createMockEvent({ sequence: 2, context: { gameId: 'game-2' } }),
        createMockEvent({ sequence: 3, context: { gameId: 'game-1' } }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          initialFilters: { context: { gameId: 'game-1' } },
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });
    });

    it('should update filters via setFilters', async () => {
      const events = [
        createMockEvent({ sequence: 1, category: EventCategory.Game }),
        createMockEvent({ sequence: 2, category: EventCategory.Campaign }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({ eventStore })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });

      act(() => {
        result.current.setFilters({ category: EventCategory.Campaign });
      });

      await waitFor(() => {
        expect(result.current.events.length).toBe(1);
        expect(result.current.events[0].category).toBe(EventCategory.Campaign);
      });
    });

    it('should filter by searchQuery', async () => {
      const events = [
        createMockEvent({ sequence: 1, type: 'attack', payload: { target: 'mech-alpha' } }),
        createMockEvent({ sequence: 2, type: 'movement', payload: { target: 'hex-5' } }),
        createMockEvent({ sequence: 3, type: 'attack', payload: { target: 'mech-beta' } }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          initialFilters: { searchQuery: 'mech' },
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });
    });
  });

  describe('pagination', () => {
    it('should paginate results', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({ sequence: i + 1 })
      );
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          pageSize: 3,
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(3);
      });

      expect(result.current.pagination.page).toBe(0);
      expect(result.current.pagination.pageSize).toBe(3);
      expect(result.current.pagination.total).toBe(10);
      expect(result.current.pagination.totalPages).toBe(4);
      expect(result.current.pagination.hasMore).toBe(true);
    });

    it('should go to specific page', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({ sequence: i + 1 })
      );
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          pageSize: 3,
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(3);
      });

      act(() => {
        result.current.goToPage(2);
      });

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(2);
      });
    });

    it('should load more in infinite scroll mode', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({ sequence: i + 1 })
      );
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          pageSize: 3,
          infiniteScroll: true,
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(3);
      });

      // Verify hasMore is true before loading more
      expect(result.current.pagination.hasMore).toBe(true);
      expect(result.current.pagination.total).toBe(10);
      expect(result.current.allEvents.length).toBe(3);

      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.allEvents.length).toBe(6);
      });
    });

    it('should change page size', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({ sequence: i + 1 })
      );
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          pageSize: 3,
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(3);
      });

      act(() => {
        result.current.setPageSize(5);
      });

      await waitFor(() => {
        expect(result.current.pagination.pageSize).toBe(5);
        expect(result.current.events.length).toBe(5);
      });
    });
  });

  describe('actions', () => {
    it('should refresh data', async () => {
      const events = [createMockEvent({ sequence: 1 })];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({ eventStore })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(1);
      });

      // Add more events directly to store
      eventStore.append(createMockEvent({ sequence: 2 }));

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
      });
    });

    it('should reset filters and pagination', async () => {
      const events = [
        createMockEvent({ sequence: 1, category: EventCategory.Game }),
        createMockEvent({ sequence: 2, category: EventCategory.Campaign }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useEventTimeline({
          eventStore,
          initialFilters: { category: EventCategory.Game },
        })
      );

      await waitFor(() => {
        expect(result.current.events.length).toBe(1);
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.events.length).toBe(2);
        expect(result.current.filters).toEqual({});
      });
    });
  });
});

describe('useGameTimeline', () => {
  it('should filter to game category and gameId', async () => {
    const events = [
      createMockEvent({
        sequence: 1,
        category: EventCategory.Game,
        context: { gameId: 'game-1' },
      }),
      createMockEvent({
        sequence: 2,
        category: EventCategory.Campaign,
        context: { gameId: 'game-1' },
      }),
      createMockEvent({
        sequence: 3,
        category: EventCategory.Game,
        context: { gameId: 'game-2' },
      }),
    ];
    const eventStore = createMockEventStore(events);

    const { result } = renderHook(() =>
      useGameTimeline('game-1', { eventStore })
    );

    await waitFor(() => {
      expect(result.current.events.length).toBe(1);
    });

    expect(result.current.events[0].context.gameId).toBe('game-1');
    expect(result.current.events[0].category).toBe(EventCategory.Game);
  });
});

describe('usePilotTimeline', () => {
  it('should filter to pilotId context', async () => {
    const events = [
      createMockEvent({ sequence: 1, context: { pilotId: 'pilot-1' } }),
      createMockEvent({ sequence: 2, context: { pilotId: 'pilot-2' } }),
      createMockEvent({ sequence: 3, context: { pilotId: 'pilot-1' } }),
    ];
    const eventStore = createMockEventStore(events);

    const { result } = renderHook(() =>
      usePilotTimeline('pilot-1', { eventStore })
    );

    await waitFor(() => {
      expect(result.current.events.length).toBe(2);
    });

    expect(result.current.events.every((e) => e.context.pilotId === 'pilot-1')).toBe(true);
  });
});

describe('useCampaignTimeline', () => {
  it('should filter to campaignId context', async () => {
    const events = [
      createMockEvent({ sequence: 1, context: { campaignId: 'campaign-1' } }),
      createMockEvent({ sequence: 2, context: { campaignId: 'campaign-2' } }),
      createMockEvent({ sequence: 3, context: { campaignId: 'campaign-1' } }),
    ];
    const eventStore = createMockEventStore(events);

    const { result } = renderHook(() =>
      useCampaignTimeline('campaign-1', { eventStore })
    );

    await waitFor(() => {
      expect(result.current.events.length).toBe(2);
    });

    expect(result.current.events.every((e) => e.context.campaignId === 'campaign-1')).toBe(true);
  });
});

describe('useUnitInstanceTimeline', () => {
  it('should filter to unitId context', async () => {
    const events = [
      createMockEvent({ sequence: 1, context: { unitId: 'unit-inst-1' } }),
      createMockEvent({ sequence: 2, context: { unitId: 'unit-inst-2' } }),
      createMockEvent({ sequence: 3, context: { unitId: 'unit-inst-1' } }),
    ];
    const eventStore = createMockEventStore(events);

    const { result } = renderHook(() =>
      useUnitInstanceTimeline('unit-inst-1', { eventStore })
    );

    await waitFor(() => {
      expect(result.current.events.length).toBe(2);
    });

    expect(result.current.events.every((e) => e.context.unitId === 'unit-inst-1')).toBe(true);
  });
});

describe('usePilotInstanceTimeline', () => {
  it('should filter to pilotId context', async () => {
    const events = [
      createMockEvent({ sequence: 1, context: { pilotId: 'pilot-inst-1' } }),
      createMockEvent({ sequence: 2, context: { pilotId: 'pilot-inst-2' } }),
      createMockEvent({ sequence: 3, context: { pilotId: 'pilot-inst-1' } }),
    ];
    const eventStore = createMockEventStore(events);

    const { result } = renderHook(() =>
      usePilotInstanceTimeline('pilot-inst-1', { eventStore })
    );

    await waitFor(() => {
      expect(result.current.events.length).toBe(2);
    });

    expect(result.current.events.every((e) => e.context.pilotId === 'pilot-inst-1')).toBe(true);
  });
});
