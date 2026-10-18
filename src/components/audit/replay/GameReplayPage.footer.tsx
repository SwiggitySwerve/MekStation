import type { ReplayControlsProps } from '@/components/audit/replay';
import type { IGameEvent } from '@/types/gameplay';

import { ReplayControls, ReplayTimeline } from '@/components/audit/replay';
import { formatSpeed } from '@/hooks/audit';

import type { ReplayProjection } from './GameReplayPage.types';

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
