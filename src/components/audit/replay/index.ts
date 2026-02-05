/**
 * Audit Replay Components
 * Components for replaying game events with VCR-style controls.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

// Playback controls (VCR-style buttons)
export { ReplayControls, type ReplayControlsProps } from './ReplayControls';

// Timeline scrubber with event markers
export { ReplayTimeline, type ReplayTimelineProps } from './ReplayTimeline';

// Speed selector dropdown
export {
  ReplaySpeedSelector,
  type ReplaySpeedSelectorProps,
} from './ReplaySpeedSelector';

// Current event overlay card
export {
  ReplayEventOverlay,
  type ReplayEventOverlayProps,
  type OverlayPosition,
} from './ReplayEventOverlay';

// Keyboard shortcuts handler
export {
  ReplayKeyboardHandler,
  useReplayKeyboardShortcuts,
  KeyboardShortcutsHelp,
  KEYBOARD_SHORTCUTS,
  type ReplayKeyboardHandlerProps,
  type KeyboardShortcut,
} from './ReplayKeyboardHandler';
