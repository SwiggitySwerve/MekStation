/**
 * Game Replay Page
 * Replay completed games with VCR-style controls.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/quick-session/spec.md
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/combat-analytics/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay';
import type { ReducerMap } from '@/utils/events/stateDerivation';

import { useReplayKeyboardShortcuts } from '@/components/audit/replay';
import {
  ReplayFooter,
  ReplayHeader,
  ReplaySidebar,
  ReplayVisualization,
  type ReplayProjection,
  type ReplayViewTab,
} from '@/components/audit/replay/GameReplayPage.sections';
import {
  ReplayKeyboardHelpModal,
  ReplayError,
  ReplayLoading,
} from '@/components/audit/replay/GameReplayPage.states';
import {
  useReplayPlayer,
  useGameTimeline,
  PLAYBACK_SPEEDS,
} from '@/hooks/audit';
import {
  useHexMapStateFromEvents,
  useReplayMovementAnimations,
  useSharedReplayPlayer,
} from '@/hooks/replay';
import { type IBaseEvent, EventCategory } from '@/types/events';

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
  const [uploadedEvents, setUploadedEvents] = useState<
    readonly IGameEvent[] | null
  >(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const isUploadActive = uploadedEvents !== null;

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const emptyReducers: ReducerMap<Record<string, unknown>> = {};
  const dbReplay = useReplayPlayer<Record<string, unknown>>({
    gameId,
    reducers: emptyReducers,
    initialState: {},
    autoPlay: false,
    baseInterval: 1000,
  });

  const uploadReplay = useSharedReplayPlayer({
    gameId,
    events: uploadedEvents ?? [],
    autoPlay: false,
    baseInterval: 1000,
  });

  const replay = useMemo<ReplayProjection>(() => {
    if (!isUploadActive) return dbReplay;
    return {
      playbackState: uploadReplay.playbackState,
      speed: uploadReplay.speed,
      currentSequence: uploadReplay.currentSequence,
      currentEvent: uploadReplay.currentEvent
        ? adaptGameEventToBase(uploadReplay.currentEvent)
        : null,
      currentIndex: uploadReplay.currentIndex,
      totalEvents: uploadReplay.totalEvents,
      progress: uploadReplay.progress,
      markers: uploadReplay.markers.map((m) => ({
        id: m.id,
        sequence: m.sequence,
        position: m.position,
        type: m.type,
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
  }, [isUploadActive, uploadReplay, dbReplay]);

  const hexMapState = useHexMapStateFromEvents(
    uploadedEvents ?? [],
    replay.currentSequence,
  );
  useReplayMovementAnimations(uploadedEvents ?? [], replay.currentSequence, {
    mapId: 'replay',
  });

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

  useReplayKeyboardShortcuts({
    onPlay: replay.play,
    onPause: replay.pause,
    onStepForward: replay.stepForward,
    onStepBackward: replay.stepBackward,
    onSpeedUp: () => changeSpeed(replay, 1),
    onSpeedDown: () => changeSpeed(replay, -1),
    onGoToStart: replay.stop,
    onGoToEnd: () => {
      if (replay.totalEvents > 0) {
        replay.jumpToIndex(replay.totalEvents - 1);
      }
    },
    playbackState: replay.playbackState,
    enabled: !showKeyboardHelp,
  });

  const handleEventClick = useCallback(
    (event: IBaseEvent) => {
      setSelectedEventId((prev) => (prev === event.id ? null : event.id));
      replay.jumpToEvent(event.id);
    },
    [replay],
  );

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

  if (!isClient || eventsLoading) return <ReplayLoading />;

  if (eventsError && !isUploadActive) {
    return (
      <ReplayError message={eventsError.message} gameId={gameId || undefined} />
    );
  }

  if (allEvents.length === 0 && !isUploadActive) {
    return (
      <ReplayError
        message="No events found for this game. You can drop a swarm-produced .jsonl event-log file to load one from disk."
        gameId={gameId || undefined}
      />
    );
  }

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
        <ReplayHeader
          gameId={gameId}
          isUploadActive={isUploadActive}
          replay={replay}
          showKeyboardHelp={showKeyboardHelp}
          onToggleKeyboardHelp={() => setShowKeyboardHelp(!showKeyboardHelp)}
        />
        <div className="flex flex-1 overflow-hidden">
          <ReplaySidebar
            activeTab={activeTab}
            activeEvents={activeEvents}
            eventsLoading={eventsLoading}
            hasMore={pagination.hasMore}
            isUploadActive={isUploadActive}
            replay={replay}
            selectedEventId={selectedEventId}
            uploadSummary={uploadSummary}
            uploadedFilename={uploadedFilename}
            onClearUpload={handleClearUpload}
            onEventsLoaded={handleEventsLoaded}
            onEventClick={handleEventClick}
            onLoadMore={loadMore}
            onTabChange={setActiveTab}
          />
          <div className="flex flex-1 flex-col">
            <div className="bg-surface-base/30 flex flex-1 items-center justify-center overflow-hidden">
              <ReplayVisualization
                hexMapState={hexMapState}
                isUploadActive={isUploadActive}
                replay={replay}
                uploadedEvents={uploadedEvents}
              />
            </div>
            <ReplayFooter
              isUploadActive={isUploadActive}
              replay={replay}
              uploadedEvents={uploadedEvents}
            />
          </div>
        </div>
        {showKeyboardHelp && (
          <ReplayKeyboardHelpModal onClose={() => setShowKeyboardHelp(false)} />
        )}
      </div>
    </>
  );
}

function changeSpeed(replay: ReplayProjection, delta: 1 | -1): void {
  const currentIdx = PLAYBACK_SPEEDS.indexOf(replay.speed);
  const nextIdx = currentIdx + delta;
  if (nextIdx >= 0 && nextIdx < PLAYBACK_SPEEDS.length) {
    replay.setSpeed(PLAYBACK_SPEEDS[nextIdx]);
  }
}
