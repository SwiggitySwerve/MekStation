/**
 * Game Replay Page
 * Replay completed games with VCR-style controls.
 *
 * Per `add-replay-viewer-from-ndjson` (quick-session + combat-analytics
 * deltas): in addition to the DB-event flow that loads via
 * `useGameTimeline(gameId)`, the page now mounts a `JsonlFileLoader`
 * drag-drop affordance that lets users open a swarm-produced
 * `<gameId>.jsonl` event-log file from disk. When uploaded events are
 * active, the center pane swaps the placeholder card for an actual
 * `<HexMapDisplay>` populated by `useHexMapStateFromEvents`, and the
 * scrubber + controls drive the upload through `useSharedReplayPlayer`.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/quick-session/spec.md
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/combat-analytics/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay';
import type { ReducerMap } from '@/utils/events/stateDerivation';

import {
  JsonlFileLoader,
  ReplayControls,
  ReplayTimeline,
  ReplaySpeedSelector,
  ReplayEventOverlay,
  useReplayKeyboardShortcuts,
} from '@/components/audit/replay';
import {
  ReplayError,
  ReplayKeyboardHelpModal,
  ReplayLoading,
} from '@/components/audit/replay/GameReplayPage.states';
import { EventTimeline } from '@/components/audit/timeline';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { Card } from '@/components/ui';
import {
  useReplayPlayer,
  useGameTimeline,
  PLAYBACK_SPEEDS,
  formatSpeed,
} from '@/hooks/audit';
import {
  useHexMapStateFromEvents,
  useReplayMovementAnimations,
  useSharedReplayPlayer,
} from '@/hooks/replay';
import { IBaseEvent, EventCategory } from '@/types/events';

type ReplayViewTab = 'timeline' | 'events';

/**
 * Adapt an `IGameEvent` (gameplay) into the `IBaseEvent` (audit) shape
 * the existing `<ReplayEventOverlay>` and `<EventTimeline>` consume.
 *
 * Per the quick-session delta scope: uploaded events drive the existing
 * UI surfaces, but those surfaces only need the audit envelope's `id`,
 * `sequence`, `timestamp`, `type`, `payload`, and `category` fields.
 * Synthesizing `category: EventCategory.Game` plus a thin `context: {
 * gameId }` keeps the renderers happy without requiring schema work on
 * either side.
 */
function adaptGameEventToBase(event: IGameEvent): IBaseEvent {
  return {
    id: event.id,
    sequence: event.sequence,
    timestamp: event.timestamp,
    category: EventCategory.Game,
    type: event.type,
    payload: event.payload,
    context: { gameId: event.gameId },
  };
}

export default function GameReplayPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const gameId = typeof id === 'string' ? id : '';

  const [isClient, setIsClient] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<ReplayViewTab>('timeline');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Upload state — when set, the page is in "upload mode": hex map drives,
  // scrubber binds to the uploaded events via `useSharedReplayPlayer`.
  // Per `add-replay-viewer-from-ndjson` (quick-session delta).
  // -------------------------------------------------------------------------
  const [uploadedEvents, setUploadedEvents] = useState<
    readonly IGameEvent[] | null
  >(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const isUploadActive = uploadedEvents !== null;

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load game events for display
  // Performance: Consider virtualized loading for games with >1000 events to reduce memory usage
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
  const dbReplay = useReplayPlayer<Record<string, unknown>>({
    gameId,
    reducers: emptyReducers,
    initialState: {},
    autoPlay: false,
    baseInterval: 1000,
  });

  // Upload-mode replay player. Mounted unconditionally so the React
  // hooks order stays stable across upload toggles. When upload is not
  // active, it sees an empty event list and stays idle.
  const uploadReplay = useSharedReplayPlayer({
    gameId,
    events: uploadedEvents ?? [],
    autoPlay: false,
    baseInterval: 1000,
  });

  // Active replay surface. The upload path returns `IGameEvent`-shaped
  // currentEvent; the audit path returns `IBaseEvent`. Both expose
  // identical scrubber / control surfaces (progress, markers,
  // currentSequence, etc.), so a thin union projection drives the
  // page's visual surfaces.
  const replay = useMemo(() => {
    if (isUploadActive) {
      const currentBaseEvent = uploadReplay.currentEvent
        ? adaptGameEventToBase(uploadReplay.currentEvent)
        : null;
      return {
        playbackState: uploadReplay.playbackState,
        speed: uploadReplay.speed,
        currentSequence: uploadReplay.currentSequence,
        currentEvent: currentBaseEvent,
        currentIndex: uploadReplay.currentIndex,
        totalEvents: uploadReplay.totalEvents,
        progress: uploadReplay.progress,
        markers: uploadReplay.markers.map((m) => ({
          id: m.id,
          sequence: m.sequence,
          position: m.position,
          type: m.type,
          // Synthesize the audit-marker `category` field for marker-
          // based renderers; `EventCategory.Game` is the safe default
          // for every gameplay event.
          category: EventCategory.Game,
          label: m.label,
        })),
        play: uploadReplay.play,
        pause: uploadReplay.pause,
        stop: uploadReplay.stop,
        stepForward: uploadReplay.stepForward,
        stepBackward: uploadReplay.stepBackward,
        jumpToIndex: uploadReplay.jumpToIndex,
        jumpToEvent: uploadReplay.jumpToEvent,
        setSpeed: uploadReplay.setSpeed,
        seek: uploadReplay.seek,
      };
    }
    return dbReplay;
  }, [isUploadActive, uploadReplay, dbReplay]);

  // Hex-map projection from the uploaded event log. Only meaningful in
  // upload mode — when the upload is cleared, this returns the
  // empty-defaults shape and the placeholder card renders instead.
  const hexMapState = useHexMapStateFromEvents(
    uploadedEvents ?? [],
    replay.currentSequence,
  );

  // Per `add-replay-step-and-effect-animations` (tactical-map-interface
  // delta — "Replay Movement Step Animation Playback"): drive the
  // shared `useAnimationQueue` from the uploaded event log + cursor so
  // tokens visually walk through their step chains during scrub. The
  // `mapId` is scoped to this surface so it never collides with a co-
  // mounted live-play queue.
  useReplayMovementAnimations(uploadedEvents ?? [], replay.currentSequence, {
    mapId: 'replay',
  });

  // Status-pill summary for the JsonlFileLoader.
  const uploadSummary = useMemo(() => {
    if (uploadedEvents === null || uploadedEvents.length === 0) {
      return { count: 0, minTurn: undefined, maxTurn: undefined };
    }
    let minTurn = uploadedEvents[0].turn;
    let maxTurn = uploadedEvents[0].turn;
    for (const e of uploadedEvents) {
      if (e.turn < minTurn) minTurn = e.turn;
      if (e.turn > maxTurn) maxTurn = e.turn;
    }
    return { count: uploadedEvents.length, minTurn, maxTurn };
  }, [uploadedEvents]);

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

  // JsonlFileLoader callbacks. Promote on success; clear on revert.
  // Per `add-replay-viewer-from-ndjson` (quick-session delta).
  const handleEventsLoaded = useCallback(
    (events: readonly IGameEvent[], filename: string) => {
      setUploadedEvents(events);
      setUploadedFilename(filename);
      setSelectedEventId(null);
    },
    [],
  );
  const handleClearUpload = useCallback(() => {
    setUploadedEvents(null);
    setUploadedFilename(null);
    setSelectedEventId(null);
  }, []);

  // Loading states
  if (!isClient || eventsLoading) {
    return <ReplayLoading />;
  }

  // Error state — only when the audit-store side errors out AND no
  // upload is active. An upload always rescues the page.
  if (eventsError && !isUploadActive) {
    return (
      <ReplayError message={eventsError.message} gameId={gameId || undefined} />
    );
  }

  // No events available from the audit store AND no upload — show the
  // standard empty-state error. With an upload, fall through to the
  // normal layout.
  if (allEvents.length === 0 && !isUploadActive) {
    return (
      <ReplayError
        message="No events found for this game. You can drop a swarm-produced .jsonl event-log file to load one from disk."
        gameId={gameId || undefined}
      />
    );
  }

  // Active event list for the audit-side renderers (`EventTimeline`,
  // `ReplayEventOverlay`). Uses uploaded events when active, falls back
  // to DB events otherwise.
  const activeEvents: readonly IBaseEvent[] = isUploadActive
    ? (uploadedEvents ?? []).map(adaptGameEventToBase)
    : (allEvents as IBaseEvent[]);

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
            {isUploadActive && (
              <span
                className="bg-accent/20 text-accent rounded-full px-2 py-0.5 text-xs font-medium"
                data-testid="replay-loaded-from-file"
              >
                loaded from file
              </span>
            )}
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
          {/* Left Panel - Event Info + JSONL Loader */}
          <div className="border-border-theme-subtle bg-surface-deep w-80 flex-shrink-0 overflow-y-auto border-r">
            {/* JSONL file loader — drag-and-drop or file picker. */}
            <div className="border-border-theme-subtle border-b p-3">
              <JsonlFileLoader
                onEventsLoaded={handleEventsLoaded}
                onClearUpload={handleClearUpload}
                uploadedFilename={uploadedFilename}
                eventCount={uploadSummary.count}
                minTurn={uploadSummary.minTurn}
                maxTurn={uploadSummary.maxTurn}
              />
            </div>

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
                  events={activeEvents}
                  onEventClick={handleEventClick}
                  onLoadMore={isUploadActive ? () => {} : loadMore}
                  hasMore={isUploadActive ? false : pagination.hasMore}
                  isLoading={eventsLoading}
                  selectedEventId={selectedEventId || replay.currentEvent?.id}
                  maxHeight="calc(100vh - 200px)"
                />
              )}
            </div>
          </div>

          {/* Center - Game Visualization (HexMap when upload active, else placeholder) */}
          <div className="flex flex-1 flex-col">
            <div className="bg-surface-base/30 flex flex-1 items-center justify-center overflow-hidden">
              {isUploadActive && hexMapState.tokens.length > 0 ? (
                <HexMapDisplay
                  // Per `add-replay-step-and-effect-animations` D6: scope
                  // the animation queue's `mapId` to this surface so a
                  // co-mounted live-play queue can never block on (or
                  // be blocked by) replay animations. `<HexMapDisplay>`
                  // already mounts `<AttackEffectsLayer>` internally
                  // with this `mapId`, so weapon impact visuals fire in
                  // replay alongside movement.
                  mapId="replay"
                  radius={hexMapState.mapRadius > 0 ? hexMapState.mapRadius : 9}
                  tokens={hexMapState.tokens}
                  hexTerrain={hexMapState.hexTerrain}
                  selectedHex={null}
                  events={uploadedEvents ?? []}
                />
              ) : (
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
                        <span className="text-text-theme-muted">Sequence:</span>{' '}
                        #{replay.currentSequence}
                      </p>
                    </div>
                  )}
                  <div className="border-border-theme-subtle mt-6 border-t pt-4">
                    <p className="text-text-theme-muted text-xs">
                      Drop a <code>.jsonl</code> swarm event log on the left to
                      see the battle play out on a hex map.
                    </p>
                  </div>
                </Card>
              )}
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
                  // Per `add-replay-timeline-markers`: when an upload
                  // is active we have the raw gameplay event log,
                  // which lets the timeline derive key-moment +
                  // phase-change overlays. DB-loaded replays go
                  // through the audit envelope path and don't expose
                  // the gameplay log here, so the overlays stay off
                  // for those (existing audit markers continue to
                  // render unchanged).
                  keyMoments={
                    isUploadActive ? (uploadedEvents ?? undefined) : undefined
                  }
                  phaseChanges={
                    isUploadActive ? (uploadedEvents ?? undefined) : undefined
                  }
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

        {showKeyboardHelp && (
          <ReplayKeyboardHelpModal onClose={() => setShowKeyboardHelp(false)} />
        )}
      </div>
    </>
  );
}
