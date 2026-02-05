/**
 * Replay Player Hook
 * Provides playback state machine for replaying game events.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { EventStoreService, getEventStore } from '@/services/events';
import { IBaseEvent, EventCategory, ICheckpoint } from '@/types/events';
import {
  deriveStateWithCheckpoint,
  ReducerMap,
} from '@/utils/events/stateDerivation';

// =============================================================================
// Types
// =============================================================================

/**
 * Playback state for the replay player.
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Playback speed multiplier.
 */
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;

/**
 * An event marker for the replay timeline.
 */
export interface IEventMarker {
  /** Event ID */
  id: string;
  /** Sequence number */
  sequence: number;
  /** Position in timeline (0-1) */
  position: number;
  /** Event type for styling */
  type: string;
  /** Event category */
  category: EventCategory;
  /** Brief description */
  label: string;
}

/**
 * Current state of the replay player.
 */
export interface IReplayState<TState = unknown> {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Current playback speed */
  speed: PlaybackSpeed;
  /** Current sequence number being shown */
  currentSequence: number;
  /** Current derived state */
  currentState: TState;
  /** Current event (at currentSequence, may be null if between events) */
  currentEvent: IBaseEvent | null;
  /** Index into events array */
  currentIndex: number;
  /** Total number of events */
  totalEvents: number;
  /** Min sequence in replay range */
  minSequence: number;
  /** Max sequence in replay range */
  maxSequence: number;
  /** Progress (0-1) */
  progress: number;
  /** Event markers for timeline visualization */
  markers: readonly IEventMarker[];
}

/**
 * Replay player actions.
 */
export interface IReplayActions {
  /** Start playing */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop and reset to beginning */
  stop: () => void;
  /** Step forward one event */
  stepForward: () => void;
  /** Step backward one event */
  stepBackward: () => void;
  /** Jump to specific sequence number */
  jumpToSequence: (sequence: number) => void;
  /** Jump to specific event by ID */
  jumpToEvent: (eventId: string) => void;
  /** Jump to specific index */
  jumpToIndex: (index: number) => void;
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Seek to progress position (0-1) */
  seek: (progress: number) => void;
}

/**
 * Return type for useReplayPlayer hook.
 */
export type UseReplayPlayerReturn<TState = unknown> = IReplayState<TState> &
  IReplayActions;

/**
 * Options for useReplayPlayer hook.
 */
export interface IUseReplayPlayerOptions<TState> {
  /** Game ID to replay */
  gameId: string;
  /** Initial state for deriving */
  initialState: TState;
  /** Reducer map for applying events */
  reducers: ReducerMap<TState>;
  /** Custom event store (for testing) */
  eventStore?: EventStoreService;
  /** Checkpoint to start from (optional) */
  checkpoint?: ICheckpoint<TState>;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Callback when event is reached */
  onEventReached?: (event: IBaseEvent, state: TState) => void;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Base interval in ms for 1x speed (default: 1000) */
  baseInterval?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BASE_INTERVAL = 1000;
const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4, 8];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create event markers from events.
 */
function createMarkers(
  events: readonly IBaseEvent[],
  minSeq: number,
  maxSeq: number,
): IEventMarker[] {
  if (events.length === 0) return [];

  const range = maxSeq - minSeq || 1;

  return events.map((event) => ({
    id: event.id,
    sequence: event.sequence,
    position: (event.sequence - minSeq) / range,
    type: event.type,
    category: event.category,
    label: `${event.type} (seq: ${event.sequence})`,
  }));
}

/**
 * Find index of event at or before a sequence.
 */
function findIndexAtSequence(
  events: readonly IBaseEvent[],
  sequence: number,
): number {
  if (events.length === 0) return -1;

  // Binary search for efficiency with large event sets
  let low = 0;
  let high = events.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (events[mid].sequence === sequence) {
      return mid;
    }
    if (events[mid].sequence < sequence) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Return the index of the event at or before the sequence
  return Math.max(0, high);
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for replaying game events with playback controls.
 *
 * @example
 * ```tsx
 * const {
 *   playbackState,
 *   currentEvent,
 *   currentState,
 *   progress,
 *   play,
 *   pause,
 *   stepForward,
 *   seek,
 * } = useReplayPlayer({
 *   gameId: 'game-123',
 *   initialState: initialGameState,
 *   reducers: gameReducers,
 * });
 *
 * return (
 *   <div>
 *     <button onClick={playbackState === 'playing' ? pause : play}>
 *       {playbackState === 'playing' ? 'Pause' : 'Play'}
 *     </button>
 *     <input
 *       type="range"
 *       value={progress}
 *       max={1}
 *       step={0.01}
 *       onChange={(e) => seek(Number(e.target.value))}
 *     />
 *   </div>
 * );
 * ```
 */
export function useReplayPlayer<TState>(
  options: IUseReplayPlayerOptions<TState>,
): UseReplayPlayerReturn<TState> {
  const {
    gameId,
    initialState,
    reducers,
    eventStore = getEventStore(),
    checkpoint,
    autoPlay = false,
    onEventReached,
    onComplete,
    baseInterval = DEFAULT_BASE_INTERVAL,
  } = options;

  // Load events for the game
  const events = useMemo(() => {
    const result = eventStore.query({
      filters: {
        category: EventCategory.Game,
        context: { gameId },
      },
      sort: { field: 'sequence', direction: 'asc' },
    });
    return result.events;
  }, [eventStore, gameId]);

  // Calculate min/max sequences
  const { minSequence, maxSequence } = useMemo(() => {
    if (events.length === 0) {
      return { minSequence: 0, maxSequence: 0 };
    }
    return {
      minSequence: events[0].sequence,
      maxSequence: events[events.length - 1].sequence,
    };
  }, [events]);

  // Create markers
  const markers = useMemo(
    () => createMarkers(events, minSequence, maxSequence),
    [events, minSequence, maxSequence],
  );

  // State
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    autoPlay ? 'playing' : 'stopped',
  );
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Refs for interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEventReachedRef = useRef(onEventReached);
  const onCompleteRef = useRef(onComplete);

  // Keep callbacks up to date
  useEffect(() => {
    onEventReachedRef.current = onEventReached;
    onCompleteRef.current = onComplete;
  }, [onEventReached, onComplete]);

  // Current event
  const currentEvent = useMemo(() => {
    if (
      events.length === 0 ||
      currentIndex < 0 ||
      currentIndex >= events.length
    ) {
      return null;
    }
    return events[currentIndex];
  }, [events, currentIndex]);

  // Current sequence
  const currentSequence = currentEvent?.sequence ?? minSequence;

  // Current state (derived)
  const currentState = useMemo(() => {
    if (events.length === 0) {
      return initialState;
    }

    // Get events up to current index
    const eventsUpTo = events.slice(0, currentIndex + 1);

    return deriveStateWithCheckpoint(
      checkpoint,
      eventsUpTo,
      currentSequence,
      reducers,
      initialState,
    );
  }, [
    events,
    currentIndex,
    currentSequence,
    checkpoint,
    reducers,
    initialState,
  ]);

  // Progress (0-1)
  const progress = useMemo(() => {
    if (events.length <= 1) return 0;
    return currentIndex / (events.length - 1);
  }, [currentIndex, events.length]);

  // Playback interval
  useEffect(() => {
    if (playbackState === 'playing') {
      const interval = baseInterval / speed;

      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= events.length) {
            // Reached end
            setPlaybackState('stopped');
            onCompleteRef.current?.();
            return prev;
          }
          // Notify event reached
          if (onEventReachedRef.current && events[next]) {
            // Note: currentState is stale here, but callback can re-derive if needed
            onEventReachedRef.current(events[next], currentState);
          }
          return next;
        });
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playbackState, speed, baseInterval, events, currentState]);

  // Actions
  const play = useCallback(() => {
    if (events.length === 0) return;
    // If at end, restart
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0);
    }
    setPlaybackState('playing');
  }, [events.length, currentIndex]);

  const pause = useCallback(() => {
    setPlaybackState('paused');
  }, []);

  const stop = useCallback(() => {
    setPlaybackState('stopped');
    setCurrentIndex(0);
  }, []);

  const stepForward = useCallback(() => {
    setPlaybackState('paused');
    setCurrentIndex((prev) => Math.min(prev + 1, events.length - 1));
  }, [events.length]);

  const stepBackward = useCallback(() => {
    setPlaybackState('paused');
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const jumpToSequence = useCallback(
    (sequence: number) => {
      const index = findIndexAtSequence(events, sequence);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    },
    [events],
  );

  const jumpToEvent = useCallback(
    (eventId: string) => {
      const index = events.findIndex((e) => e.id === eventId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    },
    [events],
  );

  const jumpToIndex = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, events.length - 1)));
    },
    [events.length],
  );

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const seek = useCallback(
    (newProgress: number) => {
      const clampedProgress = Math.max(0, Math.min(1, newProgress));
      const newIndex = Math.round(clampedProgress * (events.length - 1));
      setCurrentIndex(newIndex);
    },
    [events.length],
  );

  return {
    // State
    playbackState,
    speed,
    currentSequence,
    currentState,
    currentEvent,
    currentIndex,
    totalEvents: events.length,
    minSequence,
    maxSequence,
    progress,
    markers,
    // Actions
    play,
    pause,
    stop,
    stepForward,
    stepBackward,
    jumpToSequence,
    jumpToEvent,
    jumpToIndex,
    setSpeed,
    seek,
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Available playback speeds.
 */
export { PLAYBACK_SPEEDS };

/**
 * Get the next available speed (wraps around).
 */
export function getNextSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length];
}

/**
 * Get the previous available speed (wraps around).
 */
export function getPrevSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[
    (index - 1 + PLAYBACK_SPEEDS.length) % PLAYBACK_SPEEDS.length
  ];
}

/**
 * Format playback speed for display.
 */
export function formatSpeed(speed: PlaybackSpeed): string {
  if (speed < 1) {
    return `${speed}x`;
  }
  return `${speed}x`;
}

/**
 * Format time for display (mm:ss).
 */
export function formatTime(
  index: number,
  total: number,
  baseInterval: number,
  speed: PlaybackSpeed,
): string {
  const totalMs = (total - index) * (baseInterval / speed);
  const totalSec = Math.floor(totalMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
