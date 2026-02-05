/**
 * Shared Replay Viewer Component
 * A unified replay viewer that works with both quick games and campaign games.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import React, { useMemo } from 'react';

import {
  useSharedReplayPlayer,
  formatSpeed,
  formatRemainingTime,
  getNextSpeed,
  getPrevSpeed,
  type PlaybackSpeed,
  type IEventMarker,
} from '@/hooks/replay';
import { IGameEvent, GameEventType } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface ISharedReplayViewerProps {
  /** Game ID */
  gameId: string;
  /** Events to replay */
  events: readonly IGameEvent[];
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Base interval in ms */
  baseInterval?: number;
  /** Show event list */
  showEventList?: boolean;
  /** Max height for event list */
  eventListMaxHeight?: string;
  /** Callback when event is clicked */
  onEventClick?: (event: IGameEvent) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Replay control buttons.
 */
function ReplayControls({
  playbackState,
  speed,
  isAtStart,
  isAtEnd,
  onPlay,
  onPause,
  onStop,
  onStepForward,
  onStepBackward,
  onSpeedChange,
}: {
  playbackState: 'stopped' | 'playing' | 'paused';
  speed: PlaybackSpeed;
  isAtStart: boolean;
  isAtEnd: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}) {
  const isPlaying = playbackState === 'playing';

  return (
    <div className="flex items-center gap-2">
      {/* Step backward */}
      <button
        onClick={onStepBackward}
        disabled={isAtStart}
        className="rounded p-2 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Step backward"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="rounded p-2 hover:bg-gray-700"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        className="rounded p-2 hover:bg-gray-700"
        title="Stop"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        disabled={isAtEnd}
        className="rounded p-2 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Step forward"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
        </svg>
      </button>

      {/* Speed control */}
      <div className="ml-2 flex items-center gap-1 rounded bg-gray-800 px-2 py-1">
        <button
          onClick={() => onSpeedChange(getPrevSpeed(speed))}
          className="rounded p-1 hover:bg-gray-700"
          title="Decrease speed"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="w-10 text-center font-mono text-sm">
          {formatSpeed(speed)}
        </span>
        <button
          onClick={() => onSpeedChange(getNextSpeed(speed))}
          className="rounded p-1 hover:bg-gray-700"
          title="Increase speed"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Timeline scrubber with markers.
 */
function ReplayTimeline({
  progress,
  markers,
  currentIndex,
  totalEvents,
  currentTurn,
  remainingTime,
  onSeek,
  onMarkerClick,
}: {
  progress: number;
  markers: readonly IEventMarker[];
  currentIndex: number;
  totalEvents: number;
  currentTurn: number;
  remainingTime: string;
  onSeek: (progress: number) => void;
  onMarkerClick?: (marker: IEventMarker) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Progress info */}
      <div className="flex justify-between text-sm text-gray-400">
        <span>
          Event {currentIndex + 1} / {totalEvents}
        </span>
        <span>Turn {currentTurn}</span>
        <span>{remainingTime} remaining</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-8">
        {/* Background track */}
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-gray-700">
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Event markers */}
        {markers.map((marker) => (
          <button
            key={marker.id}
            className={`absolute top-2 -ml-1 h-4 w-2 rounded-sm transition-colors ${getMarkerColor(
              marker.type,
            )} hover:scale-125`}
            style={{ left: `${marker.position * 100}%` }}
            onClick={() => onMarkerClick?.(marker)}
            title={marker.label}
          />
        ))}

        {/* Scrubber */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-x-0 top-1 h-6 cursor-pointer opacity-0"
        />

        {/* Playhead */}
        <div
          className="absolute top-1 -ml-2 h-6 w-4 rounded bg-white shadow transition-all"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Event list display.
 */
function EventList({
  events,
  currentIndex,
  maxHeight,
  onEventClick,
}: {
  events: readonly IGameEvent[];
  currentIndex: number;
  maxHeight: string;
  onEventClick?: (event: IGameEvent, index: number) => void;
}) {
  return (
    <div
      className="mt-4 overflow-hidden rounded-lg border border-gray-700"
      style={{ maxHeight }}
    >
      <div className="border-b border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium">
        Event Log
      </div>
      <div
        className="overflow-y-auto"
        style={{ maxHeight: `calc(${maxHeight} - 40px)` }}
      >
        {events.map((event, index) => (
          <button
            key={event.id}
            onClick={() => onEventClick?.(event, index)}
            className={`w-full border-b border-gray-800 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-800 ${
              index === currentIndex ? 'bg-blue-900/50' : ''
            } ${index < currentIndex ? 'text-gray-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${getMarkerColor(event.type)}`}
              />
              <span className="font-mono text-xs text-gray-400">
                T{event.turn}
              </span>
              <span className="flex-1 truncate">
                {formatEventType(event.type)}
              </span>
              <span className="text-xs text-gray-500">#{event.sequence}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get marker color based on event type.
 */
function getMarkerColor(type: GameEventType | string): string {
  switch (type) {
    case GameEventType.GameCreated:
    case GameEventType.GameStarted:
    case GameEventType.GameEnded:
      return 'bg-green-500';

    case GameEventType.TurnStarted:
    case GameEventType.TurnEnded:
    case GameEventType.PhaseChanged:
      return 'bg-blue-500';

    case GameEventType.MovementDeclared:
    case GameEventType.MovementLocked:
      return 'bg-yellow-500';

    case GameEventType.AttackDeclared:
    case GameEventType.AttackResolved:
    case GameEventType.DamageApplied:
      return 'bg-red-500';

    case GameEventType.UnitDestroyed:
      return 'bg-red-700';

    case GameEventType.CriticalHit:
    case GameEventType.AmmoExplosion:
      return 'bg-orange-500';

    default:
      return 'bg-gray-500';
  }
}

/**
 * Format event type for display.
 */
function formatEventType(type: GameEventType | string): string {
  return String(type)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Shared replay viewer component.
 *
 * @example
 * ```tsx
 * // For quick games:
 * <SharedReplayViewer
 *   gameId={game.id}
 *   events={game.events}
 *   showEventList
 * />
 *
 * // For campaign games:
 * <SharedReplayViewer
 *   gameId={gameId}
 *   events={loadedEvents}
 *   autoPlay
 * />
 * ```
 */
export function SharedReplayViewer({
  gameId,
  events,
  autoPlay = false,
  baseInterval = 1000,
  showEventList = true,
  eventListMaxHeight = '300px',
  onEventClick,
  className = '',
}: ISharedReplayViewerProps): React.ReactElement | null {
  const replay = useSharedReplayPlayer({
    gameId,
    events,
    autoPlay,
    baseInterval,
  });

  const remainingTime = useMemo(
    () =>
      formatRemainingTime(
        replay.currentIndex,
        replay.totalEvents,
        baseInterval,
        replay.speed,
      ),
    [replay.currentIndex, replay.totalEvents, baseInterval, replay.speed],
  );

  const handleMarkerClick = (marker: IEventMarker) => {
    replay.jumpToSequence(marker.sequence);
    const event = events.find((e) => e.id === marker.id);
    if (event && onEventClick) {
      onEventClick(event);
    }
  };

  const handleEventClick = (event: IGameEvent, index: number) => {
    replay.jumpToIndex(index);
    onEventClick?.(event);
  };

  if (events.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        No events to replay
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-gray-900 p-4 ${className}`}>
      {/* Controls */}
      <ReplayControls
        playbackState={replay.playbackState}
        speed={replay.speed}
        isAtStart={replay.isAtStart}
        isAtEnd={replay.isAtEnd}
        onPlay={replay.play}
        onPause={replay.pause}
        onStop={replay.stop}
        onStepForward={replay.stepForward}
        onStepBackward={replay.stepBackward}
        onSpeedChange={replay.setSpeed}
      />

      {/* Timeline */}
      <div className="mt-4">
        <ReplayTimeline
          progress={replay.progress}
          markers={replay.markers}
          currentIndex={replay.currentIndex}
          totalEvents={replay.totalEvents}
          currentTurn={replay.currentTurn}
          remainingTime={remainingTime}
          onSeek={replay.seek}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Current event display */}
      {replay.currentEvent && (
        <div className="mt-4 rounded-lg bg-gray-800 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-3 w-3 rounded-full ${getMarkerColor(replay.currentEvent.type)}`}
            />
            <span className="font-medium">
              {formatEventType(replay.currentEvent.type)}
            </span>
            <span className="text-gray-400">
              Turn {replay.currentEvent.turn}, Sequence #
              {replay.currentEvent.sequence}
            </span>
          </div>
        </div>
      )}

      {/* Event list */}
      {showEventList && (
        <EventList
          events={events}
          currentIndex={replay.currentIndex}
          maxHeight={eventListMaxHeight}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
}

export default SharedReplayViewer;
