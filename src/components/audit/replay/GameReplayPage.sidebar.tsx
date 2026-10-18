import type { IBaseEvent } from '@/types/events';
import type { IGameEvent } from '@/types/gameplay';

import { JsonlFileLoader, ReplayEventOverlay } from '@/components/audit/replay';
import { EventTimeline } from '@/components/audit/timeline';

import type { ReplayViewTab, ReplayProjection } from './GameReplayPage.types';

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
