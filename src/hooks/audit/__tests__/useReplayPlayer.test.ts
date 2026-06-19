/**
 * Tests for useReplayPlayer Hook
 *
 * @module hooks/audit/__tests__/useReplayPlayer.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useReplayPlayer } from '../useReplayPlayer';
import {
  createMockEvent,
  createMockEventStore,
  initialState,
  testReducers,
} from './useReplayPlayer.test-helpers';

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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
