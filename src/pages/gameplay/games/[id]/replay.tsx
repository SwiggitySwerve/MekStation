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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ReplayProjection,
  ReplayViewTab,
} from '@/components/audit/replay/GameReplayPage.sections';
import type { IBaseEvent } from '@/types/events';
import type { IGameEvent } from '@/types/gameplay';
import type { ReducerMap } from '@/utils/events/stateDerivation';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import { useReplayKeyboardShortcuts } from '@/components/audit/replay';
import {
  ReplayFooter,
  ReplayHeader,
  ReplaySidebar,
  ReplayVisualization,
} from '@/components/audit/replay/GameReplayPage.sections';
import {
  ReplayError,
  ReplayKeyboardHelpModal,
  ReplayLoading,
} from '@/components/audit/replay/GameReplayPage.states';
import {
  PLAYBACK_SPEEDS,
  useGameTimeline,
  useReplayPlayer,
} from '@/hooks/audit';
import {
  useHexMapStateFromEvents,
  useReplayMovementAnimations,
  useSharedReplayPlayer,
} from '@/hooks/replay';
import { EventCategory } from '@/types/events';

const EMPTY_REDUCERS: ReducerMap<Record<string, unknown>> = {};

interface UploadSummary {
  readonly count: number;
  readonly minTurn: number | undefined;
  readonly maxTurn: number | undefined;
}

type UploadReplayPlayer = ReturnType<typeof useSharedReplayPlayer>;
type MatchLogLoadState = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';

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

function useReplayProjection({
  gameId,
  directEvents,
}: {
  readonly gameId: string;
  readonly directEvents: readonly IGameEvent[] | null;
}): ReplayProjection {
  const isDirectReplayActive = directEvents !== null;
  const dbReplay = useReplayPlayer<Record<string, unknown>>({
    gameId,
    reducers: EMPTY_REDUCERS,
    initialState: {},
    autoPlay: false,
    baseInterval: 1000,
  });
  const uploadReplay = useSharedReplayPlayer({
    gameId,
    events: directEvents ?? [],
    autoPlay: false,
    baseInterval: 1000,
  });

  return useMemo<ReplayProjection>(() => {
    if (!isDirectReplayActive) return dbReplay;
    return uploadReplayProjection(uploadReplay);
  }, [isDirectReplayActive, uploadReplay, dbReplay]);
}

function uploadReplayProjection(
  uploadReplay: UploadReplayPlayer,
): ReplayProjection {
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
}

function useUploadSummary(
  uploadedEvents: readonly IGameEvent[] | null,
): UploadSummary {
  return useMemo(
    () => summarizeUploadedEvents(uploadedEvents),
    [uploadedEvents],
  );
}

function summarizeUploadedEvents(
  uploadedEvents: readonly IGameEvent[] | null,
): UploadSummary {
  if (uploadedEvents === null || uploadedEvents.length === 0) {
    return { count: 0, minTurn: undefined, maxTurn: undefined };
  }

  let minTurn = uploadedEvents[0].turn;
  let maxTurn = uploadedEvents[0].turn;
  for (const event of uploadedEvents) {
    if (event.turn < minTurn) minTurn = event.turn;
    if (event.turn > maxTurn) maxTurn = event.turn;
  }
  return { count: uploadedEvents.length, minTurn, maxTurn };
}

function useReplayKeyboardBindings({
  replay,
  showKeyboardHelp,
}: {
  readonly replay: ReplayProjection;
  readonly showKeyboardHelp: boolean;
}): void {
  useReplayKeyboardShortcuts({
    onPlay: replay.play,
    onPause: replay.pause,
    onStepForward: replay.stepForward,
    onStepBackward: replay.stepBackward,
    onSpeedUp: () => changeSpeed(replay, 1),
    onSpeedDown: () => changeSpeed(replay, -1),
    onGoToStart: replay.stop,
    onGoToEnd: () => jumpToReplayEnd(replay),
    playbackState: replay.playbackState,
    enabled: !showKeyboardHelp,
  });
}

function activeReplayEvents({
  allEvents,
  isUploadActive,
  uploadedEvents,
}: {
  readonly allEvents: readonly unknown[];
  readonly isUploadActive: boolean;
  readonly uploadedEvents: readonly IGameEvent[] | null;
}): readonly IBaseEvent[] {
  return isUploadActive
    ? (uploadedEvents ?? []).map(adaptGameEventToBase)
    : (allEvents as IBaseEvent[]);
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
  const [persistedEvents, setPersistedEvents] = useState<
    readonly IGameEvent[] | null
  >(null);
  const [matchLogLoadState, setMatchLogLoadState] =
    useState<MatchLogLoadState>('idle');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const matchLogRequestPending = useRef(false);
  const isUploadActive = uploadedEvents !== null;
  const directEvents = uploadedEvents ?? persistedEvents;
  const isDirectReplayActive = directEvents !== null;
  const activeReplayName =
    uploadedFilename ??
    (persistedEvents !== null ? `match-log:${gameId}` : null);
  const replaySourceLabel =
    uploadedEvents !== null
      ? 'loaded from file'
      : persistedEvents !== null
        ? 'loaded from match log'
        : null;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !gameId) return;
    let cancelled = false;
    matchLogRequestPending.current = true;
    setMatchLogLoadState('loading');
    setPersistedEvents(null);
    void fetch(`/api/matches/${encodeURIComponent(gameId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const report = (await res.json()) as IPostBattleReport;
          if (cancelled) return;
          setPersistedEvents(report.log);
          setMatchLogLoadState('loaded');
          return;
        }
        setMatchLogLoadState(res.status === 404 ? 'missing' : 'error');
      })
      .catch(() => {
        if (!cancelled) {
          setMatchLogLoadState('error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          matchLogRequestPending.current = false;
          setIsRetrying(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, isClient, loadAttempt]);

  const {
    allEvents,
    isLoading: eventsLoading,
    error: eventsError,
    pagination,
    loadMore,
    refresh,
  } = useGameTimeline(gameId, {
    pageSize: 1000,
    infiniteScroll: false,
  });

  const replay = useReplayProjection({ gameId, directEvents });
  const hexMapState = useHexMapStateFromEvents(
    directEvents ?? [],
    replay.currentSequence,
  );
  useReplayMovementAnimations(directEvents ?? [], replay.currentSequence, {
    mapId: 'replay',
  });
  const uploadSummary = useUploadSummary(directEvents);
  useReplayKeyboardBindings({ replay, showKeyboardHelp });

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
  const handleClearActiveReplay = useCallback(() => {
    if (uploadedEvents !== null) {
      setUploadedEvents(null);
      setUploadedFilename(null);
    } else {
      setPersistedEvents(null);
      setMatchLogLoadState('idle');
    }
    setSelectedEventId(null);
  }, [uploadedEvents]);

  const handleRetry = useCallback(() => {
    if (!gameId || matchLogRequestPending.current) return;
    matchLogRequestPending.current = true;
    setIsRetrying(true);
    setLoadAttempt((attempt) => attempt + 1);
    refresh();
  }, [gameId, refresh]);

  const matchLogFailed =
    matchLogLoadState === 'missing' || matchLogLoadState === 'error';
  const loadErrorMessage =
    eventsError?.message ??
    (matchLogLoadState === 'missing'
      ? 'Replay not found for this game. Retry or load a .jsonl file.'
      : matchLogLoadState === 'error'
        ? 'Could not load the replay. Retry or load a .jsonl file.'
        : null);

  if (
    !isClient ||
    (!isDirectReplayActive &&
      !isRetrying &&
      !matchLogFailed &&
      (eventsLoading || matchLogLoadState === 'loading'))
  ) {
    return <ReplayLoading />;
  }

  const activeEvents = activeReplayEvents({
    allEvents,
    isUploadActive: isDirectReplayActive,
    uploadedEvents: directEvents,
  });

  return (
    <>
      <Head>
        <title>Game Replay - MekStation</title>
      </Head>
      <div
        className="bg-surface-deep flex h-screen flex-col"
        data-testid="replay-page"
      >
        <ReplayHeader
          gameId={gameId}
          replaySourceLabel={replaySourceLabel}
          replay={replay}
          showKeyboardHelp={showKeyboardHelp}
          onToggleKeyboardHelp={() => setShowKeyboardHelp(!showKeyboardHelp)}
        />
        {!isDirectReplayActive && (isRetrying || loadErrorMessage !== null) && (
          <ReplayError
            message={
              isRetrying ? 'Retrying replay...' : (loadErrorMessage ?? '')
            }
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        )}
        <div className="flex flex-1 overflow-hidden">
          <ReplaySidebar
            activeTab={activeTab}
            activeEvents={activeEvents}
            eventsLoading={eventsLoading}
            hasMore={pagination.hasMore}
            isDirectReplayActive={isDirectReplayActive}
            isUploadedReplayActive={isUploadActive}
            replay={replay}
            selectedEventId={selectedEventId}
            uploadSummary={uploadSummary}
            uploadedFilename={activeReplayName}
            onClearUpload={handleClearActiveReplay}
            onEventsLoaded={handleEventsLoaded}
            onEventClick={handleEventClick}
            onLoadMore={loadMore}
            onTabChange={setActiveTab}
          />
          <div className="flex flex-1 flex-col">
            <div className="bg-surface-base/30 flex flex-1 items-center justify-center overflow-hidden">
              <ReplayVisualization
                hexMapState={hexMapState}
                isUploadActive={isDirectReplayActive}
                replay={replay}
                uploadedEvents={directEvents}
              />
            </div>
            <ReplayFooter
              isUploadActive={isDirectReplayActive}
              replay={replay}
              uploadedEvents={directEvents}
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

function jumpToReplayEnd(replay: ReplayProjection): void {
  if (replay.totalEvents > 0) {
    replay.jumpToIndex(replay.totalEvents - 1);
  }
}

function changeSpeed(replay: ReplayProjection, delta: 1 | -1): void {
  const currentIdx = PLAYBACK_SPEEDS.indexOf(replay.speed);
  const nextIdx = currentIdx + delta;
  if (nextIdx >= 0 && nextIdx < PLAYBACK_SPEEDS.length) {
    replay.setSpeed(PLAYBACK_SPEEDS[nextIdx]);
  }
}
