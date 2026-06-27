import Link from 'next/link';

import type { ReplayControlsProps } from '@/components/audit/replay';
import type { ReplayHexMapState } from '@/hooks/replay';
import type { IBaseEvent } from '@/types/events';
import type { IGameEvent } from '@/types/gameplay';

import {
  JsonlFileLoader,
  ReplayControls,
  ReplayEventOverlay,
  ReplaySpeedSelector,
  ReplayTimeline,
} from '@/components/audit/replay';
import { EventTimeline } from '@/components/audit/timeline';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { Card } from '@/components/ui';
import {
  formatSpeed,
  type IEventMarker,
  type PlaybackSpeed,
  type PlaybackState,
} from '@/hooks/audit';

import { BackIcon, HelpIcon, PlayCircleIcon } from './GameReplayPage.icons';

export type ReplayViewTab = 'timeline' | 'events';

export interface ReplayProjection {
  readonly playbackState: PlaybackState;
  readonly speed: PlaybackSpeed;
  readonly currentSequence: number;
  readonly currentEvent: IBaseEvent | null;
  readonly currentIndex: number;
  readonly totalEvents: number;
  readonly progress: number;
  readonly markers: readonly IEventMarker[];
  readonly play: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  readonly stepForward: () => void;
  readonly stepBackward: () => void;
  readonly jumpToIndex: (index: number) => void;
  readonly jumpToEvent: (eventId: string) => void;
  readonly setSpeed: (speed: PlaybackSpeed) => void;
  readonly seek: (progress: number) => void;
}

interface ReplayHeaderProps {
  readonly gameId: string;
  readonly replaySourceLabel: string | null;
  readonly replay: ReplayProjection;
  readonly showKeyboardHelp: boolean;
  readonly onToggleKeyboardHelp: () => void;
}

export function ReplayHeader({
  gameId,
  replaySourceLabel,
  replay,
  showKeyboardHelp,
  onToggleKeyboardHelp,
}: ReplayHeaderProps): React.ReactElement {
  return (
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
          <BackIcon />
        </Link>
        <h1
          className="text-text-theme-primary text-lg font-semibold"
          data-testid="replay-title"
        >
          Game Replay
        </h1>
        {replaySourceLabel !== null && (
          <span
            className="bg-accent/20 text-accent rounded-full px-2 py-0.5 text-xs font-medium"
            data-testid="replay-loaded-source"
          >
            {replaySourceLabel}
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
        <ReplaySpeedSelector
          speed={replay.speed}
          onSpeedChange={replay.setSpeed}
        />
        <button
          onClick={onToggleKeyboardHelp}
          className={`rounded-lg p-2 transition-colors ${
            showKeyboardHelp
              ? 'bg-accent/20 text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised'
          }`}
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
          aria-expanded={showKeyboardHelp}
        >
          <HelpIcon />
        </button>
      </div>
    </div>
  );
}

interface ReplaySidebarProps {
  readonly activeTab: ReplayViewTab;
  readonly activeEvents: readonly IBaseEvent[];
  readonly eventsLoading: boolean;
  readonly hasMore: boolean;
  readonly isDirectReplayActive: boolean;
  readonly isUploadedReplayActive: boolean;
  readonly replay: ReplayProjection;
  readonly selectedEventId: string | null;
  readonly uploadSummary: {
    readonly count: number;
    readonly minTurn: number | undefined;
    readonly maxTurn: number | undefined;
  };
  readonly uploadedFilename: string | null;
  readonly onClearUpload: () => void;
  readonly onEventsLoaded: (
    events: readonly IGameEvent[],
    filename: string,
  ) => void;
  readonly onEventClick: (event: IBaseEvent) => void;
  readonly onLoadMore: () => void;
  readonly onTabChange: (tab: ReplayViewTab) => void;
}

export function ReplaySidebar({
  activeTab,
  activeEvents,
  eventsLoading,
  hasMore,
  isDirectReplayActive,
  isUploadedReplayActive,
  replay,
  selectedEventId,
  uploadSummary,
  uploadedFilename,
  onClearUpload,
  onEventsLoaded,
  onEventClick,
  onLoadMore,
  onTabChange,
}: ReplaySidebarProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle bg-surface-deep w-80 flex-shrink-0 overflow-y-auto border-r">
      <div className="border-border-theme-subtle border-b p-3">
        <JsonlFileLoader
          onEventsLoaded={onEventsLoaded}
          onClearUpload={onClearUpload}
          uploadedFilename={uploadedFilename}
          loadedLabel={
            isUploadedReplayActive ? 'loaded' : 'loaded from match log'
          }
          clearLabel={isUploadedReplayActive ? 'clear upload' : 'clear replay'}
          clearAriaLabel={
            isUploadedReplayActive
              ? 'Clear uploaded file'
              : 'Clear match-log replay'
          }
          eventCount={uploadSummary.count}
          minTurn={uploadSummary.minTurn}
          maxTurn={uploadSummary.maxTurn}
        />
      </div>
      <ReplayTabs activeTab={activeTab} onTabChange={onTabChange} />
      <div className="p-4">
        {activeTab === 'timeline' ? (
          <CurrentReplayEvent replay={replay} />
        ) : (
          <EventTimeline
            events={activeEvents}
            onEventClick={onEventClick}
            onLoadMore={isDirectReplayActive ? () => {} : onLoadMore}
            hasMore={isDirectReplayActive ? false : hasMore}
            isLoading={eventsLoading}
            selectedEventId={selectedEventId || replay.currentEvent?.id}
            maxHeight="calc(100vh - 200px)"
          />
        )}
      </div>
    </div>
  );
}

interface ReplayVisualizationProps {
  readonly hexMapState: ReplayHexMapState;
  readonly isUploadActive: boolean;
  readonly replay: ReplayProjection;
  readonly uploadedEvents: readonly IGameEvent[] | null;
}

export function ReplayVisualization({
  hexMapState,
  isUploadActive,
  replay,
  uploadedEvents,
}: ReplayVisualizationProps): React.ReactElement {
  if (replay.totalEvents === 0) {
    return (
      <Card className="max-w-lg p-8 text-center">
        <div className="bg-surface-raised mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <PlayCircleIcon />
        </div>
        <h2 className="text-text-theme-primary mb-3 text-xl font-bold">
          No replay loaded
        </h2>
        <p className="text-text-theme-secondary text-sm">
          Drop a <code>.jsonl</code> event log on the left to inspect replay
          playback, scrub the timeline, and validate keyboard controls.
        </p>
      </Card>
    );
  }

  if (isUploadActive && hexMapState.tokens.length > 0) {
    return (
      <HexMapDisplay
        mapId="replay"
        radius={hexMapState.mapRadius > 0 ? hexMapState.mapRadius : 9}
        tokens={hexMapState.tokens}
        hexTerrain={hexMapState.hexTerrain}
        selectedHex={null}
        events={uploadedEvents ?? []}
      />
    );
  }

  return (
    <Card className="max-w-lg p-8 text-center">
      <div className="bg-surface-raised mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <PlayCircleIcon />
      </div>
      <h2 className="text-text-theme-primary mb-3 text-xl font-bold">
        Event {replay.currentIndex + 1} of {replay.totalEvents}
      </h2>
      {replay.currentEvent && (
        <ReplayEventSummary event={replay.currentEvent} />
      )}
      <div className="border-border-theme-subtle mt-6 border-t pt-4">
        <p className="text-text-theme-muted text-xs">
          Drop a <code>.jsonl</code> swarm event log on the left to see the
          battle play out on a hex map.
        </p>
      </div>
    </Card>
  );
}

interface ReplayFooterProps {
  readonly isUploadActive: boolean;
  readonly replay: ReplayProjection;
  readonly uploadedEvents: readonly IGameEvent[] | null;
}

export function ReplayFooter({
  isUploadActive,
  replay,
  uploadedEvents,
}: ReplayFooterProps): React.ReactElement {
  return (
    <div className="bg-surface-base border-border-theme-subtle flex-shrink-0 border-t p-4">
      <div className="mb-4">
        <ReplayTimeline
          progress={replay.progress}
          markers={replay.markers}
          onSeek={replay.seek}
          currentSequence={replay.currentSequence}
          keyMoments={
            isUploadActive ? (uploadedEvents ?? undefined) : undefined
          }
          phaseChanges={
            isUploadActive ? (uploadedEvents ?? undefined) : undefined
          }
        />
      </div>
      <div className="flex items-center justify-center">
        <ReplayControls {...replayControlProps(replay)} />
      </div>
      <ReplayProgress replay={replay} />
    </div>
  );
}

function ReplayTabs({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: ReplayViewTab;
  readonly onTabChange: (tab: ReplayViewTab) => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle flex border-b">
      <ReplayTabButton
        isActive={activeTab === 'timeline'}
        onClick={() => onTabChange('timeline')}
      >
        Current Event
      </ReplayTabButton>
      <ReplayTabButton
        isActive={activeTab === 'events'}
        onClick={() => onTabChange('events')}
      >
        All Events
      </ReplayTabButton>
    </div>
  );
}

function ReplayTabButton({
  children,
  isActive,
  onClick,
}: {
  readonly children: React.ReactNode;
  readonly isActive: boolean;
  readonly onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'text-accent border-accent bg-surface-base/50 border-b-2'
          : 'text-text-theme-secondary hover:text-text-theme-primary'
      }`}
    >
      {children}
    </button>
  );
}

function CurrentReplayEvent({
  replay,
}: {
  readonly replay: ReplayProjection;
}): React.ReactElement {
  if (replay.currentEvent) {
    return (
      <ReplayEventOverlay
        event={replay.currentEvent}
        sequenceNumber={replay.currentSequence}
        totalEvents={replay.totalEvents}
        position="top-left"
      />
    );
  }

  return (
    <div className="text-text-theme-muted py-8 text-center">
      <p>No event at current position</p>
      <p className="mt-1 text-sm">Use controls to navigate</p>
    </div>
  );
}

function ReplayEventSummary({
  event,
}: {
  readonly event: IBaseEvent;
}): React.ReactElement {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-text-theme-secondary">
        <span className="text-text-theme-muted">Type:</span>{' '}
        <span className="text-accent font-medium">{event.type}</span>
      </p>
      <p className="text-text-theme-secondary">
        <span className="text-text-theme-muted">Category:</span>{' '}
        {event.category}
      </p>
      <p className="text-text-theme-secondary">
        <span className="text-text-theme-muted">Sequence:</span> #
        {event.sequence}
      </p>
    </div>
  );
}

function ReplayProgress({
  replay,
}: {
  readonly replay: ReplayProjection;
}): React.ReactElement {
  return (
    <div className="text-text-theme-muted mt-3 text-center text-sm">
      {replay.playbackState === 'playing' && (
        <span className="text-emerald-400">
          Playing at {formatSpeed(replay.speed)}
        </span>
      )}
      {replay.playbackState === 'paused' && (
        <span className="text-amber-400">Paused</span>
      )}
      {replay.playbackState === 'stopped' && <span>Press Play to start</span>}
    </div>
  );
}

function replayControlProps(replay: ReplayProjection): ReplayControlsProps {
  return {
    playbackState: replay.playbackState,
    canStepBackward: replay.currentIndex > 0,
    canStepForward: replay.currentIndex < replay.totalEvents - 1,
    onPlay: replay.play,
    onPause: replay.pause,
    onStop: replay.stop,
    onGoToEnd: () => replay.jumpToIndex(replay.totalEvents - 1),
    onStepForward: replay.stepForward,
    onStepBackward: replay.stepBackward,
  };
}
