import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { IGameEvent, IGameState } from '@/types/gameplay';

import {
  deriveState,
  createInitialGameState,
} from '@/utils/gameplay/gameState';

import type { IEventMarker, PlaybackState } from './useSharedReplayPlayer';

export interface ReplaySequenceBounds {
  readonly minSequence: number;
  readonly maxSequence: number;
}

interface AdvanceReplayIndexOptions {
  readonly events: readonly IGameEvent[];
  readonly gameId: string;
  readonly onCompleteRef: MutableRefObject<(() => void) | undefined>;
  readonly onEventReachedRef: MutableRefObject<
    ((event: IGameEvent, state: IGameState) => void) | undefined
  >;
  readonly setPlaybackState: Dispatch<SetStateAction<PlaybackState>>;
}

export function getReplaySequenceBounds(
  events: readonly IGameEvent[],
): ReplaySequenceBounds {
  if (events.length === 0) {
    return { minSequence: 0, maxSequence: 0 };
  }

  return {
    minSequence: events[0].sequence,
    maxSequence: events[events.length - 1].sequence,
  };
}

export function getEventAtIndex(
  events: readonly IGameEvent[],
  index: number,
): IGameEvent | null {
  if (events.length === 0) return null;
  if (index < 0 || index >= events.length) return null;
  return events[index];
}

export function deriveReplayState(
  gameId: string,
  events: readonly IGameEvent[],
  currentIndex: number,
): IGameState {
  if (events.length === 0) {
    return createInitialGameState(gameId);
  }

  return deriveState(gameId, events.slice(0, currentIndex + 1));
}

export function getReplayProgress(
  currentIndex: number,
  totalEvents: number,
): number {
  if (totalEvents <= 1) return 0;
  return currentIndex / (totalEvents - 1);
}

export function clearReplayInterval(
  intervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>,
): void {
  if (!intervalRef.current) return;
  clearInterval(intervalRef.current);
  intervalRef.current = null;
}

export function advanceReplayIndex(
  previousIndex: number,
  options: AdvanceReplayIndexOptions,
): number {
  const nextIndex = previousIndex + 1;
  if (nextIndex >= options.events.length) {
    options.setPlaybackState('stopped');
    options.onCompleteRef.current?.();
    return previousIndex;
  }

  const event = options.events[nextIndex];
  if (options.onEventReachedRef.current && event) {
    const nextState = deriveState(
      options.gameId,
      options.events.slice(0, nextIndex + 1),
    );
    options.onEventReachedRef.current(event, nextState);
  }

  return nextIndex;
}

/**
 * Create event markers from game events.
 */
export function createMarkers(
  events: readonly IGameEvent[],
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
    turn: event.turn,
    label: formatEventLabel(event),
  }));
}

/**
 * Format event for display.
 */
function formatEventLabel(event: IGameEvent): string {
  const typeLabel = event.type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `Turn ${event.turn}: ${typeLabel}`;
}

/**
 * Find index of event at or before a sequence.
 */
export function findIndexAtSequence(
  events: readonly IGameEvent[],
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

/**
 * Find the index of the first event in a given turn.
 */
export function findTurnStartIndex(
  events: readonly IGameEvent[],
  turn: number,
): number {
  return events.findIndex((e) => e.turn === turn);
}
