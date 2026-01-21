/**
 * ReplayControls Component
 * VCR-style playback control buttons for replaying game events.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';
import { Button } from '@/components/ui/Button';
import { type PlaybackState } from '@/hooks/audit';

// =============================================================================
// Types
// =============================================================================

export interface ReplayControlsProps {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Play handler */
  onPlay: () => void;
  /** Pause handler */
  onPause: () => void;
  /** Stop/reset handler */
  onStop: () => void;
  /** Step forward handler */
  onStepForward: () => void;
  /** Step backward handler */
  onStepBackward: () => void;
  /** Whether stepping forward is possible */
  canStepForward: boolean;
  /** Whether stepping backward is possible */
  canStepBackward: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const SkipBackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z" />
  </svg>
);

const StepBackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629V7.19c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061ZM21.75 12a.75.75 0 0 1-.75.75H15a.75.75 0 0 1 0-1.5h6a.75.75 0 0 1 .75.75Z" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
  </svg>
);

const StepForwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M14.805 18.44c-1.25.714-2.805-.189-2.805-1.629V7.19c0-1.44 1.555-2.343 2.805-1.628l7.108 4.061c1.26.72 1.26 2.536 0 3.256l-7.108 4.061ZM2.25 12a.75.75 0 0 0 .75.75H9a.75.75 0 0 0 0-1.5H3a.75.75 0 0 0-.75.75Z" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M14.805 18.44c-1.25.714-2.805-.189-2.805-1.629v-2.34l-6.945 3.968c-1.25.715-2.805-.188-2.805-1.628V8.69c0-1.44 1.555-2.343 2.805-1.628L12 11.03v-2.34c0-1.44 1.555-2.343 2.805-1.628l7.108 4.061c1.26.72 1.26 2.536 0 3.256l-7.108 4.061Z" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function ReplayControls({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onStepForward,
  onStepBackward,
  canStepForward,
  canStepBackward,
  className = '',
}: ReplayControlsProps): React.ReactElement {
  const isPlaying = playbackState === 'playing';
  const isStopped = playbackState === 'stopped';

  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid="replay-controls">
      {/* Go to Start */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        disabled={isStopped && !canStepBackward}
        title="Go to start (Home)"
        className="min-w-touch min-h-touch"
        data-testid="replay-btn-skip-back"
      >
        <SkipBackIcon />
      </Button>

      {/* Step Backward */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStepBackward}
        disabled={!canStepBackward}
        title="Step backward (Left Arrow)"
        className="min-w-touch min-h-touch"
        data-testid="replay-btn-step-back"
      >
        <StepBackIcon />
      </Button>

      {/* Play/Pause - Primary Action */}
      <Button
        variant="primary"
        size="md"
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        className="min-w-[56px] min-h-touch"
        data-testid="replay-btn-play-pause"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>

      {/* Stop */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        disabled={isStopped}
        title="Stop"
        className="min-w-touch min-h-touch"
        data-testid="replay-btn-stop"
      >
        <StopIcon />
      </Button>

      {/* Step Forward */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStepForward}
        disabled={!canStepForward}
        title="Step forward (Right Arrow)"
        className="min-w-touch min-h-touch"
        data-testid="replay-btn-step-forward"
      >
        <StepForwardIcon />
      </Button>

      {/* Go to End */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // Seek to end by stepping forward while possible
          // This will be handled by the parent component
          while (canStepForward) {
            onStepForward();
          }
        }}
        disabled={!canStepForward}
        title="Go to end (End)"
        className="min-w-touch min-h-touch"
        data-testid="replay-btn-skip-forward"
      >
        <SkipForwardIcon />
      </Button>
    </div>
  );
}

export default ReplayControls;
