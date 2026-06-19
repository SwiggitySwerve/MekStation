/**
 * Shared Replay Player Hook
 * A unified replay player that works with both:
 * - Campaign games (events from EventStoreService)
 * - Quick games (events from in-memory array/Zustand store)
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import type { IGameEvent, IGameState, GameEventType } from '@/types/gameplay';

import {
  advanceReplayIndex,
  clearReplayInterval,
  createMarkers,
  deriveReplayState,
  findIndexAtSequence,
  findTurnStartIndex,
  getEventAtIndex,
  getReplayProgress,
  getReplaySequenceBounds,
} from './useSharedReplayPlayer.helpers';

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
 * Event marker for timeline visualization.
 */
export interface IEventMarker {
  /** Event ID */
  readonly id: string;
  /** Sequence number */
  readonly sequence: number;
  /** Position in timeline (0-1) */
  readonly position: number;
  /** Event type */
  readonly type: GameEventType;
  /** Turn number */
  readonly turn: number;
  /** Brief description */
  readonly label: string;
}

/**
 * Current state of the replay player.
 */
export interface ISharedReplayState {
  /** Current playback state */
  readonly playbackState: PlaybackState;
  /** Current playback speed */
  readonly speed: PlaybackSpeed;
  /** Current sequence number being shown */
  readonly currentSequence: number;
  /** Current derived game state */
  readonly currentState: IGameState;
  /** Current event (at currentIndex) */
  readonly currentEvent: IGameEvent | null;
  /** Current index into events array */
  readonly currentIndex: number;
  /** Total number of events */
  readonly totalEvents: number;
  /** Min sequence in replay range */
  readonly minSequence: number;
  /** Max sequence in replay range */
  readonly maxSequence: number;
  /** Progress (0-1) */
  readonly progress: number;
  /** Event markers for timeline visualization */
  readonly markers: readonly IEventMarker[];
  /** Current turn number */
  readonly currentTurn: number;
  /** Is at the beginning */
  readonly isAtStart: boolean;
  /** Is at the end */
  readonly isAtEnd: boolean;
}

/**
 * Replay player actions.
 */
export interface ISharedReplayActions {
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
  /** Jump to turn start */
  jumpToTurn: (turn: number) => void;
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Seek to progress position (0-1) */
  seek: (progress: number) => void;
  /** Toggle play/pause */
  toggle: () => void;
}

/**
 * Return type for useSharedReplayPlayer hook.
 */
export type UseSharedReplayPlayerReturn = ISharedReplayState &
  ISharedReplayActions;

/**
 * Options for useSharedReplayPlayer hook.
 */
export interface IUseSharedReplayPlayerOptions {
  /** Game ID */
  readonly gameId: string;
  /** Events to replay (direct array) */
  readonly events: readonly IGameEvent[];
  /** Auto-play on mount */
  readonly autoPlay?: boolean;
  /** Callback when event is reached */
  readonly onEventReached?: (event: IGameEvent, state: IGameState) => void;
  /** Callback when playback completes */
  readonly onComplete?: () => void;
  /** Base interval in ms for 1x speed (default: 1000) */
  readonly baseInterval?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BASE_INTERVAL = 1000;

/**
 * Available playback speeds.
 */
export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [
  0.25, 0.5, 1, 2, 4, 8,
];

/**
 * Shared replay player hook that works with direct event arrays.
 * Use this for both quick games and campaign games.
 *
 * @example
 * ```tsx
 * // For quick games:
 * const { game } = useQuickGameStore();
 * const replay = useSharedReplayPlayer({
 *   gameId: game.id,
 *   events: game.events,
 * });
 *
 * // For campaign games (fetch events first):
 * const events = await eventStore.query({ filters: { gameId } });
 * const replay = useSharedReplayPlayer({
 *   gameId,
 *   events: events.events,
 * });
 * ```
 */
export function useSharedReplayPlayer(
  options: IUseSharedReplayPlayerOptions,
): UseSharedReplayPlayerReturn {
  const {
    gameId,
    events,
    autoPlay = false,
    onEventReached,
    onComplete,
    baseInterval = DEFAULT_BASE_INTERVAL,
  } = options;

  // Calculate min/max sequences
  const { minSequence, maxSequence } = useMemo(
    () => getReplaySequenceBounds(events),
    [events],
  );

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

  // Refs for interval and callbacks
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEventReachedRef = useRef(onEventReached);
  const onCompleteRef = useRef(onComplete);

  // Keep callbacks up to date
  useEffect(() => {
    onEventReachedRef.current = onEventReached;
    onCompleteRef.current = onComplete;
  }, [onEventReached, onComplete]);

  // Current event
  const currentEvent = useMemo(
    () => getEventAtIndex(events, currentIndex),
    [events, currentIndex],
  );

  // Current sequence
  const currentSequence = currentEvent?.sequence ?? minSequence;

  // Current turn
  const currentTurn = currentEvent?.turn ?? 0;

  // Current state (derived from events up to current index)
  const currentState = useMemo(
    (): IGameState => deriveReplayState(gameId, events, currentIndex),
    [events, currentIndex, gameId],
  );

  // Progress (0-1)
  const progress = useMemo(
    () => getReplayProgress(currentIndex, events.length),
    [currentIndex, events.length],
  );

  // Position flags
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= events.length - 1;

  // Playback interval
  useEffect(() => {
    if (playbackState === 'playing') {
      const interval = baseInterval / speed;

      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          return advanceReplayIndex(prev, {
            events,
            gameId,
            onCompleteRef,
            onEventReachedRef,
            setPlaybackState,
          });
        });
      }, interval);
    }

    return () => {
      clearReplayInterval(intervalRef);
    };
  }, [playbackState, speed, baseInterval, events, gameId]);

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

  const toggle = useCallback(() => {
    if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  }, [playbackState, play, pause]);

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

  const jumpToTurn = useCallback(
    (turn: number) => {
      const index = findTurnStartIndex(events, turn);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    },
    [events],
  );

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const seek = useCallback(
    (newProgress: number) => {
      const clampedProgress = Math.max(0, Math.min(1, newProgress));
      const newIndex = Math.round(clampedProgress * (events.length - 1));
      setCurrentIndex(Math.max(0, newIndex));
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
    currentTurn,
    isAtStart,
    isAtEnd,
    // Actions
    play,
    pause,
    stop,
    stepForward,
    stepBackward,
    jumpToSequence,
    jumpToEvent,
    jumpToIndex,
    jumpToTurn,
    setSpeed,
    seek,
    toggle,
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

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
  return `${speed}x`;
}

/**
 * Format remaining time for display (mm:ss).
 */
export function formatRemainingTime(
  currentIndex: number,
  totalEvents: number,
  baseInterval: number,
  speed: PlaybackSpeed,
): string {
  if (totalEvents === 0) return '0:00';
  const remainingEvents = totalEvents - currentIndex - 1;
  const totalMs = remainingEvents * (baseInterval / speed);
  const totalSec = Math.floor(totalMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed time for display (mm:ss).
 */
export function formatElapsedTime(
  currentIndex: number,
  baseInterval: number,
  speed: PlaybackSpeed,
): string {
  const totalMs = currentIndex * (baseInterval / speed);
  const totalSec = Math.floor(totalMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
