/**
 * Shared Replay Hooks
 * Unified replay functionality for both quick games and campaign games.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

export {
  useSharedReplayPlayer,
  getNextSpeed,
  getPrevSpeed,
  formatSpeed,
  formatRemainingTime,
  formatElapsedTime,
  PLAYBACK_SPEEDS,
  type PlaybackState,
  type PlaybackSpeed,
  type IEventMarker,
  type ISharedReplayState,
  type ISharedReplayActions,
  type UseSharedReplayPlayerReturn,
  type IUseSharedReplayPlayerOptions,
} from './useSharedReplayPlayer';
