/**
 * Tests for useReplayPlayer Hook
 *
 * @module hooks/audit/__tests__/useReplayPlayer.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useReplayPlayer,
  PLAYBACK_SPEEDS,
  getNextSpeed,
  getPrevSpeed,
  formatSpeed,
  formatTime,
} from '../useReplayPlayer';
import { EventStoreService } from '@/services/events';
import { EventCategory, IBaseEvent } from '@/types/events';
import { ReducerMap } from '@/utils/events/stateDerivation';

// =============================================================================
// Test Types
// =============================================================================

interface TestState {
  turn: number;
  score: number;
}

// =============================================================================
// Test Helpers
// =============================================================================

const initialState: TestState = { turn: 0, score: 0 };

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
    'turn-advance': (state, _event) => ({
      ...state,
      turn: state.turn + 1,
    }),
    'score-change': (state, event) => ({
      ...state,
      score: state.score + (event.payload as { delta: number }).delta,
    }),
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

describe('useReplayPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with stopped state', () => {
      const eventStore = createMockEventStore([]);
      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      expect(result.current.playbackState).toBe('stopped');
      expect(result.current.speed).toBe(1);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.progress).toBe(0);
    });

    it('should load events for game', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'score-change', { delta: 10 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      expect(result.current.totalEvents).toBe(3);
      expect(result.current.minSequence).toBe(1);
      expect(result.current.maxSequence).toBe(3);
    });

    it('should auto-play if option is set', () => {
      const events = [createMockEvent(1, 'turn-advance')];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
          autoPlay: true,
        })
      );

      expect(result.current.playbackState).toBe('playing');
    });
  });

  describe('playback controls', () => {
    it('should play and pause', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.play();
      });
      expect(result.current.playbackState).toBe('playing');

      act(() => {
        result.current.pause();
      });
      expect(result.current.playbackState).toBe('paused');
    });

    it('should stop and reset', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.jumpToIndex(1);
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.stop();
      });
      expect(result.current.playbackState).toBe('stopped');
      expect(result.current.currentIndex).toBe(0);
    });

    it('should step forward and backward', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.stepForward();
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.playbackState).toBe('paused');

      act(() => {
        result.current.stepForward();
      });
      expect(result.current.currentIndex).toBe(2);

      act(() => {
        result.current.stepBackward();
      });
      expect(result.current.currentIndex).toBe(1);
    });

    it('should not step beyond bounds', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      // Step backward at start
      act(() => {
        result.current.stepBackward();
      });
      expect(result.current.currentIndex).toBe(0);

      // Step forward to end
      act(() => {
        result.current.jumpToIndex(1);
        result.current.stepForward();
      });
      expect(result.current.currentIndex).toBe(1);
    });
  });

  describe('jumping', () => {
    it('should jump to specific index', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.jumpToIndex(2);
      });
      expect(result.current.currentIndex).toBe(2);
      expect(result.current.currentEvent?.sequence).toBe(3);
    });

    it('should jump to event by ID', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.jumpToEvent('event-2');
      });
      expect(result.current.currentIndex).toBe(1);
    });

    it('should seek to progress position', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'turn-advance'),
        createMockEvent(4, 'turn-advance'),
        createMockEvent(5, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.seek(0.5);
      });
      expect(result.current.currentIndex).toBe(2);
    });
  });

  describe('state derivation', () => {
    it('should derive correct state at current position', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'score-change', { delta: 10 }),
        createMockEvent(3, 'turn-advance'),
        createMockEvent(4, 'score-change', { delta: 20 }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      // At index 0 (first event applied)
      expect(result.current.currentState.turn).toBe(1);
      expect(result.current.currentState.score).toBe(0);

      // Move to index 3 (all events applied)
      act(() => {
        result.current.jumpToIndex(3);
      });
      expect(result.current.currentState.turn).toBe(2);
      expect(result.current.currentState.score).toBe(30);
    });
  });

  describe('speed control', () => {
    it('should change playback speed', () => {
      const events = [createMockEvent(1, 'turn-advance')];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      act(() => {
        result.current.setSpeed(2);
      });
      expect(result.current.speed).toBe(2);

      act(() => {
        result.current.setSpeed(0.5);
      });
      expect(result.current.speed).toBe(0.5);
    });
  });

  describe('markers', () => {
    it('should generate event markers', () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'score-change', { delta: 10 }),
        createMockEvent(3, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
        })
      );

      expect(result.current.markers.length).toBe(3);
      expect(result.current.markers[0].position).toBe(0);
      expect(result.current.markers[2].position).toBe(1);
    });
  });

  describe('playback timing', () => {
    it('should advance on interval when playing', async () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
        createMockEvent(3, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
          baseInterval: 100,
        })
      );

      act(() => {
        result.current.play();
      });

      expect(result.current.currentIndex).toBe(0);

      // Advance time
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(1);
      });
    });

    it('should stop at end of events', async () => {
      const events = [
        createMockEvent(1, 'turn-advance'),
        createMockEvent(2, 'turn-advance'),
      ];
      const eventStore = createMockEventStore(events);

      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useReplayPlayer({
          gameId: 'game-1',
          initialState,
          reducers: testReducers,
          eventStore,
          baseInterval: 100,
          onComplete,
        })
      );

      // Start at last event
      act(() => {
        result.current.jumpToIndex(1);
        result.current.play();
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.playbackState).toBe('stopped');
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });
});

describe('utility functions', () => {
  describe('PLAYBACK_SPEEDS', () => {
    it('should contain expected speeds', () => {
      expect(PLAYBACK_SPEEDS).toContain(0.5);
      expect(PLAYBACK_SPEEDS).toContain(1);
      expect(PLAYBACK_SPEEDS).toContain(2);
      expect(PLAYBACK_SPEEDS).toContain(4);
    });
  });

  describe('getNextSpeed', () => {
    it('should cycle through speeds', () => {
      expect(getNextSpeed(1)).toBe(2);
      expect(getNextSpeed(8)).toBe(0.25); // wraps around
    });
  });

  describe('getPrevSpeed', () => {
    it('should cycle through speeds backwards', () => {
      expect(getPrevSpeed(1)).toBe(0.5);
      expect(getPrevSpeed(0.25)).toBe(8); // wraps around
    });
  });

  describe('formatSpeed', () => {
    it('should format speed with x suffix', () => {
      expect(formatSpeed(1)).toBe('1x');
      expect(formatSpeed(0.5)).toBe('0.5x');
      expect(formatSpeed(4)).toBe('4x');
    });
  });

  describe('formatTime', () => {
    it('should format time as mm:ss', () => {
      // 10 events remaining, 1000ms base, 1x speed = 10 seconds
      expect(formatTime(0, 10, 1000, 1)).toBe('0:10');

      // 60 events remaining, 1000ms base, 1x speed = 60 seconds
      expect(formatTime(0, 60, 1000, 1)).toBe('1:00');

      // 10 events remaining at 2x speed = 5 seconds
      expect(formatTime(0, 10, 1000, 2)).toBe('0:05');
    });
  });
});
