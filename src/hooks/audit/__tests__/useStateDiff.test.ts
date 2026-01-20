/**
 * Tests for useStateDiff Hook
 *
 * @module hooks/audit/__tests__/useStateDiff.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useStateDiff,
  getValueAtPath,
  filterDiffByPath,
  groupDiffByTopLevel,
  IDiffEntry,
} from '../useStateDiff';
import { EventStoreService } from '@/services/events';
import { EventCategory, IBaseEvent } from '@/types/events';
import { ReducerMap } from '@/utils/events/stateDerivation';

// =============================================================================
// Test Types
// =============================================================================

interface TestState {
  score: number;
  player: {
    name: string;
    health: number;
  };
  units: { id: string; damage: number }[];
}

// =============================================================================
// Test Helpers
// =============================================================================

const initialState: TestState = {
  score: 0,
  player: { name: 'Player 1', health: 100 },
  units: [],
};

function createMockEvent(
  sequence: number,
  type: string,
  payload: unknown = {}
): IBaseEvent {
  return {
    id: `event-${sequence}`,
    sequence,
    timestamp: new Date().toISOString(),
    category: EventCategory.Game,
    type,
    payload,
    context: { gameId: 'game-1' },
  };
}

const testReducers: ReducerMap<TestState> = {
  [EventCategory.Game]: {
    'score-change': (state, event) => ({
      ...state,
      score: state.score + (event.payload as { delta: number }).delta,
    }),
    'player-damage': (state, event) => ({
      ...state,
      player: {
        ...state.player,
        health: state.player.health - (event.payload as { damage: number }).damage,
      },
    }),
    'unit-added': (state, event) => ({
      ...state,
      units: [...state.units, (event.payload as { unit: { id: string; damage: number } }).unit],
    }),
    'unit-damaged': (state, event) => {
      const { unitId, damage } = event.payload as { unitId: string; damage: number };
      return {
        ...state,
        units: state.units.map((u) =>
          u.id === unitId ? { ...u, damage: u.damage + damage } : u
        ),
      };
    },
  },
};

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

describe('useStateDiff', () => {
  describe('basic functionality', () => {
    it('should start with null diff', () => {
      const eventStore = createMockEventStore([]);
      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      expect(result.current.diff).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should compute diff between two sequences', async () => {
      const events = [
        createMockEvent(1, 'score-change', { delta: 10 }),
        createMockEvent(2, 'score-change', { delta: 20 }),
        createMockEvent(3, 'score-change', { delta: 30 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(1, 3);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      expect(result.current.diff?.stateA.score).toBe(10);
      expect(result.current.diff?.stateB.score).toBe(60);
      expect(result.current.diff?.sequenceA).toBe(1);
      expect(result.current.diff?.sequenceB).toBe(3);
    });

    it('should handle reversed sequence order', async () => {
      const events = [
        createMockEvent(1, 'score-change', { delta: 10 }),
        createMockEvent(2, 'score-change', { delta: 20 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      // Pass sequences in reverse order
      act(() => {
        result.current.computeDiff(2, 1);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      // Should normalize: minSeq=1, maxSeq=2
      expect(result.current.diff?.sequenceA).toBe(1);
      expect(result.current.diff?.sequenceB).toBe(2);
    });
  });

  describe('diff entries', () => {
    it('should detect added fields', async () => {
      const events = [
        createMockEvent(1, 'unit-added', { unit: { id: 'unit-1', damage: 0 } }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(0, 1);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      const addedEntries = result.current.diff?.entries.filter(
        (e) => e.changeType === 'added'
      );
      expect(addedEntries?.length).toBeGreaterThan(0);
    });

    it('should detect modified fields', async () => {
      const events = [
        createMockEvent(1, 'score-change', { delta: 10 }),
        createMockEvent(2, 'score-change', { delta: 20 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(1, 2);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      const scoreEntry = result.current.diff?.entries.find(
        (e) => e.path === 'score'
      );
      expect(scoreEntry?.changeType).toBe('modified');
      expect(scoreEntry?.before).toBe(10);
      expect(scoreEntry?.after).toBe(30);
    });

    it('should detect nested field changes', async () => {
      const events = [
        createMockEvent(1, 'player-damage', { damage: 25 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(0, 1);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      const healthEntry = result.current.diff?.entries.find(
        (e) => e.path === 'player.health'
      );
      expect(healthEntry?.changeType).toBe('modified');
      expect(healthEntry?.before).toBe(100);
      expect(healthEntry?.after).toBe(75);
    });
  });

  describe('diff summary', () => {
    it('should compute correct summary', async () => {
      const events = [
        createMockEvent(1, 'score-change', { delta: 10 }),
        createMockEvent(2, 'player-damage', { damage: 25 }),
        createMockEvent(3, 'unit-added', { unit: { id: 'unit-1', damage: 0 } }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(0, 3);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      const summary = result.current.diff?.summary;
      expect(summary?.total).toBeGreaterThan(0);
      expect(summary?.modified).toBeGreaterThanOrEqual(2); // score and health
      expect(summary?.added).toBeGreaterThanOrEqual(1); // unit
    });
  });

  describe('events between', () => {
    it('should include events between sequences', async () => {
      const events = [
        createMockEvent(1, 'score-change', { delta: 10 }),
        createMockEvent(2, 'score-change', { delta: 20 }),
        createMockEvent(3, 'score-change', { delta: 30 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(1, 3);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      // Events between 1 and 3 (exclusive of 1, inclusive of 3)
      expect(result.current.diff?.eventsBetween.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear diff state', async () => {
      const events = [createMockEvent(1, 'score-change', { delta: 10 })];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(0, 1);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.diff).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle empty event store', async () => {
      const eventStore = createMockEventStore([]);

      const { result } = renderHook(() =>
        useStateDiff({
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.computeDiff(0, 10);
      });

      await waitFor(() => {
        expect(result.current.diff).not.toBeNull();
      });

      // Should still produce a diff (comparing initial state with itself)
      expect(result.current.error).toBeNull();
    });
  });
});

describe('getValueAtPath', () => {
  it('should get root value with empty path', () => {
    const state = { a: 1 };
    expect(getValueAtPath(state, '')).toBe(state);
  });

  it('should get nested value', () => {
    const state = { a: { b: { c: 42 } } };
    expect(getValueAtPath(state, 'a.b.c')).toBe(42);
  });

  it('should handle array indices', () => {
    const state = { items: [{ id: 1 }, { id: 2 }] };
    expect(getValueAtPath(state, 'items[1].id')).toBe(2);
  });

  it('should return undefined for missing path', () => {
    const state = { a: 1 };
    expect(getValueAtPath(state, 'b.c')).toBeUndefined();
  });
});

describe('filterDiffByPath', () => {
  const entries: IDiffEntry[] = [
    { path: 'player.health', changeType: 'modified', before: 100, after: 75 },
    { path: 'player.name', changeType: 'unchanged', before: 'test', after: 'test' },
    { path: 'score', changeType: 'modified', before: 0, after: 10 },
    { path: 'units[0].damage', changeType: 'modified', before: 0, after: 5 },
  ];

  it('should filter by exact path', () => {
    const filtered = filterDiffByPath(entries, 'score');
    expect(filtered.length).toBe(1);
    expect(filtered[0].path).toBe('score');
  });

  it('should filter by path prefix', () => {
    const filtered = filterDiffByPath(entries, 'player');
    expect(filtered.length).toBe(2);
    expect(filtered.every((e) => e.path.startsWith('player'))).toBe(true);
  });

  it('should filter array paths', () => {
    const filtered = filterDiffByPath(entries, 'units');
    expect(filtered.length).toBe(1);
    expect(filtered[0].path).toBe('units[0].damage');
  });
});

describe('groupDiffByTopLevel', () => {
  const entries: IDiffEntry[] = [
    { path: 'player.health', changeType: 'modified', before: 100, after: 75 },
    { path: 'player.name', changeType: 'unchanged', before: 'test', after: 'test' },
    { path: 'score', changeType: 'modified', before: 0, after: 10 },
  ];

  it('should group by top-level path', () => {
    const grouped = groupDiffByTopLevel(entries);
    expect(Object.keys(grouped)).toEqual(['player', 'score']);
    expect(grouped['player'].length).toBe(2);
    expect(grouped['score'].length).toBe(1);
  });
});
