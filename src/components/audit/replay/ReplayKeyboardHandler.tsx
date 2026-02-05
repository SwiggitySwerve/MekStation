/**
 * ReplayKeyboardHandler Component
 * Hook-based component for keyboard shortcuts in replay player.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useEffect, useCallback } from 'react';

import { type PlaybackState } from '@/hooks/audit';

// =============================================================================
// Types
// =============================================================================

export interface ReplayKeyboardHandlerProps {
  /** Play handler */
  onPlay: () => void;
  /** Pause handler */
  onPause: () => void;
  /** Step forward handler */
  onStepForward: () => void;
  /** Step backward handler */
  onStepBackward: () => void;
  /** Speed up handler */
  onSpeedUp: () => void;
  /** Speed down handler */
  onSpeedDown: () => void;
  /** Go to start handler */
  onGoToStart: () => void;
  /** Go to end handler */
  onGoToEnd: () => void;
  /** Current playback state */
  playbackState: PlaybackState;
  /** Whether keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
}

// =============================================================================
// Keyboard Shortcut Map
// =============================================================================

/**
 * Keyboard shortcuts for the replay player.
 *
 * Space = play/pause
 * Left Arrow = step backward
 * Right Arrow = step forward
 * Home = go to start
 * End = go to end
 * +/= = speed up
 * -/_ = slow down
 */
const SHORTCUTS: Record<string, readonly string[]> = {
  PLAY_PAUSE: ['Space', ' '],
  STEP_BACKWARD: ['ArrowLeft'],
  STEP_FORWARD: ['ArrowRight'],
  GO_TO_START: ['Home'],
  GO_TO_END: ['End'],
  SPEED_UP: ['Equal', '+', '='],
  SPEED_DOWN: ['Minus', '-', '_'],
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Custom hook for handling replay keyboard shortcuts.
 * Returns the handlers and can be used standalone.
 */
export function useReplayKeyboardShortcuts({
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSpeedUp,
  onSpeedDown,
  onGoToStart,
  onGoToEnd,
  playbackState,
  enabled = true,
}: ReplayKeyboardHandlerProps): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key;
      const code = event.code;

      // Play/Pause - Space
      if (
        SHORTCUTS.PLAY_PAUSE.includes(key) ||
        SHORTCUTS.PLAY_PAUSE.includes(code)
      ) {
        event.preventDefault();
        if (playbackState === 'playing') {
          onPause();
        } else {
          onPlay();
        }
        return;
      }

      // Step Backward - Left Arrow
      if (
        SHORTCUTS.STEP_BACKWARD.includes(key) ||
        SHORTCUTS.STEP_BACKWARD.includes(code)
      ) {
        event.preventDefault();
        onStepBackward();
        return;
      }

      // Step Forward - Right Arrow
      if (
        SHORTCUTS.STEP_FORWARD.includes(key) ||
        SHORTCUTS.STEP_FORWARD.includes(code)
      ) {
        event.preventDefault();
        onStepForward();
        return;
      }

      // Go to Start - Home
      if (
        SHORTCUTS.GO_TO_START.includes(key) ||
        SHORTCUTS.GO_TO_START.includes(code)
      ) {
        event.preventDefault();
        onGoToStart();
        return;
      }

      // Go to End - End
      if (
        SHORTCUTS.GO_TO_END.includes(key) ||
        SHORTCUTS.GO_TO_END.includes(code)
      ) {
        event.preventDefault();
        onGoToEnd();
        return;
      }

      // Speed Up - +/=
      if (
        SHORTCUTS.SPEED_UP.includes(key) ||
        SHORTCUTS.SPEED_UP.includes(code)
      ) {
        event.preventDefault();
        onSpeedUp();
        return;
      }

      // Speed Down - -/_
      if (
        SHORTCUTS.SPEED_DOWN.includes(key) ||
        SHORTCUTS.SPEED_DOWN.includes(code)
      ) {
        event.preventDefault();
        onSpeedDown();
        return;
      }
    },
    [
      playbackState,
      onPlay,
      onPause,
      onStepForward,
      onStepBackward,
      onSpeedUp,
      onSpeedDown,
      onGoToStart,
      onGoToEnd,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// =============================================================================
// Component (Wrapper)
// =============================================================================

/**
 * Component wrapper for keyboard shortcuts.
 * Renders nothing - just attaches keyboard listeners.
 */
export function ReplayKeyboardHandler(props: ReplayKeyboardHandlerProps): null {
  useReplayKeyboardShortcuts(props);
  return null;
}

// =============================================================================
// Keyboard Shortcut Help
// =============================================================================

export interface KeyboardShortcut {
  key: string;
  description: string;
}

/**
 * List of available keyboard shortcuts for display in help UI.
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Space', description: 'Play / Pause' },
  { key: '←', description: 'Step backward' },
  { key: '→', description: 'Step forward' },
  { key: 'Home', description: 'Go to start' },
  { key: 'End', description: 'Go to end' },
  { key: '+', description: 'Speed up' },
  { key: '-', description: 'Slow down' },
];

/**
 * Component to display keyboard shortcuts help.
 */
export function KeyboardShortcutsHelp({
  className = '',
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div className={`text-text-theme-muted text-xs ${className}`}>
      <div className="text-text-theme-secondary mb-2 font-medium">
        Keyboard Shortcuts
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
          <div key={key} className="flex items-center gap-2">
            <kbd className="bg-surface-raised/50 border-border-theme-subtle min-w-[24px] rounded border px-1.5 py-0.5 text-center font-mono text-[10px]">
              {key}
            </kbd>
            <span>{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReplayKeyboardHandler;
