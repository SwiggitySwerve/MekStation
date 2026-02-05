/**
 * Game Replay Page
 * Replay completed games with VCR-style controls.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';

import type { ReducerMap } from '@/utils/events/stateDerivation';

import {
  ReplayControls,
  ReplayTimeline,
  ReplaySpeedSelector,
  ReplayEventOverlay,
  useReplayKeyboardShortcuts,
  KeyboardShortcutsHelp,
} from '@/components/audit/replay';
import { EventTimeline } from '@/components/audit/timeline';
import { Button, Card } from '@/components/ui';
import {
  useReplayPlayer,
  useGameTimeline,
  PLAYBACK_SPEEDS,
  formatSpeed,
} from '@/hooks/audit';
import { IBaseEvent } from '@/types/events';

// =============================================================================
// Loading Component
// =============================================================================

function ReplayLoading(): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-text-theme-secondary">Loading game replay...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Error Component
// =============================================================================

interface ReplayErrorProps {
  message: string;
  gameId?: string;
}

function ReplayError({
  message,
  gameId,
}: ReplayErrorProps): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
          Replay Error
        </h2>
        <p className="text-text-theme-secondary mb-4">{message}</p>
        <Link href={gameId ? `/gameplay/games/${gameId}` : '/gameplay/games'}>
          <Button variant="primary">
            {gameId ? 'Back to Game' : 'Back to Games'}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// Replay View Tab Type
// =============================================================================

type ReplayViewTab = 'timeline' | 'events';

// =============================================================================
// Main Page Component
// =============================================================================

export default function GameReplayPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const gameId = typeof id === 'string' ? id : '';

  const [isClient, setIsClient] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<ReplayViewTab>('timeline');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load game events for display
  // TODO: Consider virtualized loading for games with >1000 events to reduce memory usage
  const {
    allEvents,
    isLoading: eventsLoading,
    error: eventsError,
    pagination,
    loadMore,
  } = useGameTimeline(gameId, {
    pageSize: 1000,
    infiniteScroll: false,
  });

  // Initialize replay player
  // Note: Empty reducers map - visualization only, no state derivation
  const emptyReducers: ReducerMap<Record<string, unknown>> = {};
  const replay = useReplayPlayer<Record<string, unknown>>({
    gameId,
    reducers: emptyReducers,
    initialState: {},
    autoPlay: false,
    baseInterval: 1000,
  });

  // Keyboard shortcuts
  useReplayKeyboardShortcuts({
    onPlay: replay.play,
    onPause: replay.pause,
    onStepForward: replay.stepForward,
    onStepBackward: replay.stepBackward,
    onSpeedUp: () => {
      const currentIdx = PLAYBACK_SPEEDS.indexOf(replay.speed);
      if (currentIdx < PLAYBACK_SPEEDS.length - 1) {
        replay.setSpeed(PLAYBACK_SPEEDS[currentIdx + 1]);
      }
    },
    onSpeedDown: () => {
      const currentIdx = PLAYBACK_SPEEDS.indexOf(replay.speed);
      if (currentIdx > 0) {
        replay.setSpeed(PLAYBACK_SPEEDS[currentIdx - 1]);
      }
    },
    onGoToStart: replay.stop,
    onGoToEnd: () => {
      if (replay.totalEvents > 0) {
        replay.jumpToIndex(replay.totalEvents - 1);
      }
    },
    playbackState: replay.playbackState,
    enabled: !showKeyboardHelp,
  });

  // Handle event click in timeline
  const handleEventClick = useCallback(
    (event: IBaseEvent) => {
      setSelectedEventId((prev) => (prev === event.id ? null : event.id));
      replay.jumpToEvent(event.id);
    },
    [replay],
  );

  // Loading states
  if (!isClient || eventsLoading) {
    return <ReplayLoading />;
  }

  // Error state
  if (eventsError) {
    return (
      <ReplayError message={eventsError.message} gameId={gameId || undefined} />
    );
  }

  // No events
  if (allEvents.length === 0) {
    return (
      <ReplayError
        message="No events found for this game."
        gameId={gameId || undefined}
      />
    );
  }

  return (
    <>
      <Head>
        <title>Game Replay - MekStation</title>
      </Head>

      <div
        className="flex h-screen flex-col bg-gray-900"
        data-testid="replay-page"
      >
        {/* Header */}
        <div
          className="bg-surface-base border-border-theme-subtle flex h-14 flex-shrink-0 items-center justify-between border-b px-4"
          data-testid="replay-header"
        >
          <div className="flex items-center gap-4">
            <Link
              href={gameId ? `/gameplay/games/${gameId}` : '/gameplay/games'}
              className="text-text-theme-secondary hover:text-text-theme-primary transition-colors"
              aria-label="Back to game details"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1
              className="text-text-theme-primary text-lg font-semibold"
              data-testid="replay-title"
            >
              Game Replay
            </h1>
            <span
              className="text-text-theme-muted text-sm"
              data-testid="replay-event-count"
            >
              {replay.totalEvents} events
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <ReplaySpeedSelector
              speed={replay.speed}
              onSpeedChange={replay.setSpeed}
            />

            {/* Keyboard Help Toggle */}
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className={`rounded-lg p-2 transition-colors ${
                showKeyboardHelp
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised'
              }`}
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
              aria-expanded={showKeyboardHelp}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Event Info */}
          <div className="border-border-theme-subtle bg-surface-deep w-80 flex-shrink-0 overflow-y-auto border-r">
            {/* Tabs */}
            <div className="border-border-theme-subtle flex border-b">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'timeline'
                    ? 'text-accent border-accent bg-surface-base/50 border-b-2'
                    : 'text-text-theme-secondary hover:text-text-theme-primary'
                }`}
              >
                Current Event
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'events'
                    ? 'text-accent border-accent bg-surface-base/50 border-b-2'
                    : 'text-text-theme-secondary hover:text-text-theme-primary'
                }`}
              >
                All Events
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'timeline' ? (
                /* Current Event Display */
                replay.currentEvent ? (
                  <ReplayEventOverlay
                    event={replay.currentEvent}
                    sequenceNumber={replay.currentSequence}
                    totalEvents={replay.totalEvents}
                    position="top-left"
                  />
                ) : (
                  <div className="text-text-theme-muted py-8 text-center">
                    <p>No event at current position</p>
                    <p className="mt-1 text-sm">Use controls to navigate</p>
                  </div>
                )
              ) : (
                /* All Events List */
                <EventTimeline
                  events={allEvents as IBaseEvent[]}
                  onEventClick={handleEventClick}
                  onLoadMore={loadMore}
                  hasMore={pagination.hasMore}
                  isLoading={eventsLoading}
                  selectedEventId={selectedEventId || replay.currentEvent?.id}
                  maxHeight="calc(100vh - 200px)"
                />
              )}
            </div>
          </div>

          {/* Center - Game Visualization Placeholder */}
          <div className="flex flex-1 flex-col">
            {/* Game State Visualization Area */}
            <div className="bg-surface-base/30 flex flex-1 items-center justify-center">
              <Card className="max-w-lg p-8 text-center">
                <div className="bg-surface-raised mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
                  <svg
                    className="text-accent h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-text-theme-primary mb-3 text-xl font-bold">
                  Event {replay.currentIndex + 1} of {replay.totalEvents}
                </h2>
                {replay.currentEvent && (
                  <div className="space-y-2 text-sm">
                    <p className="text-text-theme-secondary">
                      <span className="text-text-theme-muted">Type:</span>{' '}
                      <span className="text-accent font-medium">
                        {replay.currentEvent.type}
                      </span>
                    </p>
                    <p className="text-text-theme-secondary">
                      <span className="text-text-theme-muted">Category:</span>{' '}
                      {replay.currentEvent.category}
                    </p>
                    <p className="text-text-theme-secondary">
                      <span className="text-text-theme-muted">Sequence:</span> #
                      {replay.currentSequence}
                    </p>
                  </div>
                )}
                <div className="border-border-theme-subtle mt-6 border-t pt-4">
                  <p className="text-text-theme-muted text-xs">
                    Full game state visualization coming soon.
                    <br />
                    Use the controls below to step through events.
                  </p>
                </div>
              </Card>
            </div>

            {/* Bottom Controls */}
            <div className="bg-surface-base border-border-theme-subtle flex-shrink-0 border-t p-4">
              {/* Timeline Scrubber */}
              <div className="mb-4">
                <ReplayTimeline
                  progress={replay.progress}
                  markers={replay.markers}
                  onSeek={replay.seek}
                  currentSequence={replay.currentSequence}
                />
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center">
                <ReplayControls
                  playbackState={replay.playbackState}
                  canStepBackward={replay.currentIndex > 0}
                  canStepForward={replay.currentIndex < replay.totalEvents - 1}
                  onPlay={replay.play}
                  onPause={replay.pause}
                  onStop={replay.stop}
                  onStepForward={replay.stepForward}
                  onStepBackward={replay.stepBackward}
                />
              </div>

              {/* Progress Info */}
              <div className="text-text-theme-muted mt-3 text-center text-sm">
                {replay.playbackState === 'playing' && (
                  <span className="text-emerald-400">
                    Playing at {formatSpeed(replay.speed)}
                  </span>
                )}
                {replay.playbackState === 'paused' && (
                  <span className="text-amber-400">Paused</span>
                )}
                {replay.playbackState === 'stopped' && (
                  <span>Press Play to start</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Help Modal */}
        {showKeyboardHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
          >
            <div className="relative">
              <KeyboardShortcutsHelp />
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-text-theme-secondary hover:text-text-theme-primary absolute top-4 right-4 p-2 transition-colors"
                aria-label="Close keyboard shortcuts"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
