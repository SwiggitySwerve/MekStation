import type { ReplayHexMapState } from '@/hooks/replay';
import type { IBaseEvent } from '@/types/events';
import type { IGameEvent } from '@/types/gameplay';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { Card } from '@/components/ui';

import type { ReplayProjection } from './GameReplayPage.types';

import { PlayCircleIcon } from './GameReplayPage.icons';

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
