/**
 * Audit Timeline Hooks
 * Hooks for event timeline, state diffs, causality chains, and replay.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

// Timeline Hook
export {
  useEventTimeline,
  useGameTimeline,
  usePilotTimeline,
  useCampaignTimeline,
  useUnitInstanceTimeline,
  usePilotInstanceTimeline,
  type ITimelineFilters,
  type ITimelinePagination,
  type ITimelineState,
  type ITimelineActions,
  type UseEventTimelineReturn,
  type IUseEventTimelineOptions,
} from './useEventTimeline';

// State Diff Hook
export {
  useStateDiff,
  useStateDiffFromSequence,
  getValueAtPath,
  filterDiffByPath,
  groupDiffByTopLevel,
  type DiffChangeType,
  type IDiffEntry,
  type IDiffSummary,
  type IStateDiff,
  type IUseStateDiffReturn,
  type IUseStateDiffOptions,
} from './useStateDiff';

// Causality Chain Hook
export {
  useCausalityChain,
  getAncestors,
  getDescendants,
  getSiblings,
  filterByRelationship,
  getNodesAtDepth,
  type ICausalityNode,
  type ICausalityStats,
  type TraversalDirection,
  type ICausalityChain,
  type IUseCausalityChainReturn,
  type IUseCausalityChainOptions,
} from './useCausalityChain';

// Replay Player Hook
export {
  useReplayPlayer,
  PLAYBACK_SPEEDS,
  getNextSpeed,
  getPrevSpeed,
  formatSpeed,
  formatTime,
  type PlaybackState,
  type PlaybackSpeed,
  type IEventMarker,
  type IReplayState,
  type IReplayActions,
  type UseReplayPlayerReturn,
  type IUseReplayPlayerOptions,
} from './useReplayPlayer';
