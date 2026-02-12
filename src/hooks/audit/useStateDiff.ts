/**
 * State Diff Hook
 * Computes differences between states at two sequence numbers.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

import { EventStoreService, getEventStore } from '@/services/events';
import { IBaseEvent, ICheckpoint } from '@/types/events';
import {
  deriveStateWithCheckpoint,
  ReducerMap,
} from '@/utils/events/stateDerivation';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of changes in a diff.
 */
export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * A single diff entry representing a change at a path.
 */
export interface IDiffEntry {
  /** JSON path to the changed value (e.g., "pilot.xp", "units[0].damage") */
  path: string;
  /** Type of change */
  changeType: DiffChangeType;
  /** Value before the change (undefined if added) */
  before?: unknown;
  /** Value after the change (undefined if removed) */
  after?: unknown;
}

/**
 * Summary statistics for a diff.
 */
export interface IDiffSummary {
  /** Number of added fields */
  added: number;
  /** Number of removed fields */
  removed: number;
  /** Number of modified fields */
  modified: number;
  /** Total number of changes */
  total: number;
}

/**
 * Complete diff result.
 */
export interface IStateDiff<TState = unknown> {
  /** State at sequence A */
  stateA: TState;
  /** State at sequence B */
  stateB: TState;
  /** Sequence number for state A */
  sequenceA: number;
  /** Sequence number for state B */
  sequenceB: number;
  /** List of all changes */
  entries: IDiffEntry[];
  /** Summary statistics */
  summary: IDiffSummary;
  /** Events between the two sequences */
  eventsBetween: readonly IBaseEvent[];
}

/**
 * State diff hook return type.
 */
export interface IUseStateDiffReturn<TState = unknown> {
  /** The computed diff (null if not yet computed) */
  diff: IStateDiff<TState> | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Compute diff between two sequences */
  computeDiff: (seqA: number, seqB: number) => void;
  /** Clear the current diff */
  clear: () => void;
}

/**
 * Options for useStateDiff hook.
 */
export interface IUseStateDiffOptions<TState> {
  /** Initial state for deriving */
  initialState: TState;
  /** Reducer map for applying events */
  reducers: ReducerMap<TState>;
  /** Custom event store (for testing) */
  eventStore?: EventStoreService;
  /** Maximum depth for nested diff (default: 10) */
  maxDepth?: number;
  /** Paths to ignore in diff (e.g., ["timestamp", "id"]) */
  ignorePaths?: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_DEPTH = 10;

// =============================================================================
// Diff Computation Utilities
// =============================================================================

/**
 * Check if a value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if two values are deeply equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Compute diff entries between two values recursively.
 */
function computeDiffEntries(
  before: unknown,
  after: unknown,
  path: string,
  depth: number,
  maxDepth: number,
  ignorePaths: string[],
): IDiffEntry[] {
  // Check if path should be ignored
  if (ignorePaths.includes(path)) {
    return [];
  }

  // Check max depth
  if (depth > maxDepth) {
    if (!deepEqual(before, after)) {
      return [{ path, changeType: 'modified', before, after }];
    }
    return [];
  }

  const entries: IDiffEntry[] = [];

  // Handle null/undefined
  if (before === undefined && after !== undefined) {
    return [{ path, changeType: 'added', after }];
  }
  if (before !== undefined && after === undefined) {
    return [{ path, changeType: 'removed', before }];
  }
  if (before === null && after !== null) {
    return [{ path, changeType: 'modified', before, after }];
  }
  if (before !== null && after === null) {
    return [{ path, changeType: 'modified', before, after }];
  }

  // Handle arrays
  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= before.length) {
        entries.push({ path: itemPath, changeType: 'added', after: after[i] });
      } else if (i >= after.length) {
        entries.push({
          path: itemPath,
          changeType: 'removed',
          before: before[i],
        });
      } else {
        entries.push(
          ...computeDiffEntries(
            before[i],
            after[i],
            itemPath,
            depth + 1,
            maxDepth,
            ignorePaths,
          ),
        );
      }
    }
    return entries;
  }

  // Handle objects
  if (isPlainObject(before) && isPlainObject(after)) {
    const beforeKeys = Object.keys(before);
    const afterKeys = Object.keys(after);
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));
    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      entries.push(
        ...computeDiffEntries(
          before[key],
          after[key],
          keyPath,
          depth + 1,
          maxDepth,
          ignorePaths,
        ),
      );
    }
    return entries;
  }

  // Handle primitives
  if (before !== after) {
    return [{ path, changeType: 'modified', before, after }];
  }

  return [];
}

/**
 * Compute summary statistics from diff entries.
 */
function computeSummary(entries: IDiffEntry[]): IDiffSummary {
  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const entry of entries) {
    switch (entry.changeType) {
      case 'added':
        added++;
        break;
      case 'removed':
        removed++;
        break;
      case 'modified':
        modified++;
        break;
    }
  }

  return { added, removed, modified, total: added + removed + modified };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for computing state differences between two sequence numbers.
 *
 * @example
 * ```tsx
 * const { diff, isLoading, computeDiff } = useStateDiff({
 *   initialState: { score: 0 },
 *   reducers: myReducers,
 * });
 *
 * // Compute diff between turns
 * computeDiff(100, 200);
 *
 * if (diff) {
 *   logger.debug('Changes:', diff.summary);
 *   diff.entries.forEach(e => logger.debug(e.path, e.changeType));
 * }
 * ```
 */
export function useStateDiff<TState>(
  options: IUseStateDiffOptions<TState>,
): IUseStateDiffReturn<TState> {
  const {
    initialState,
    reducers,
    eventStore = getEventStore(),
    maxDepth = DEFAULT_MAX_DEPTH,
    ignorePaths = [],
  } = options;

  // State
  const [diff, setDiff] = useState<IStateDiff<TState> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize ignored paths array
  const ignorePathsArray = useMemo(() => [...ignorePaths], [ignorePaths]);

  // Compute diff between two sequences
  const computeDiff = useCallback(
    (seqA: number, seqB: number) => {
      setIsLoading(true);
      setError(null);

      try {
        // Ensure seqA < seqB for consistent ordering
        const [minSeq, maxSeq] = seqA <= seqB ? [seqA, seqB] : [seqB, seqA];

        // Get all events up to maxSeq
        const allEvents = eventStore.getEventsInRange(0, maxSeq);

        // Note: Checkpoint optimization requires campaignId context.
        // For cross-campaign or general diff, we derive from initial state.
        // Future enhancement: accept campaignId param for checkpoint support.
        const nearestCheckpoint: ICheckpoint<TState> | undefined = undefined;

        // Derive states at both sequences
        const stateA = deriveStateWithCheckpoint(
          nearestCheckpoint,
          allEvents,
          minSeq,
          reducers,
          initialState,
        );

        const stateB = deriveStateWithCheckpoint(
          nearestCheckpoint,
          allEvents,
          maxSeq,
          reducers,
          initialState,
        );

        // Get events between the sequences
        const eventsBetween = eventStore.getEventsInRange(minSeq + 1, maxSeq);

        // Compute diff entries
        const entries = computeDiffEntries(
          stateA as unknown,
          stateB as unknown,
          '',
          0,
          maxDepth,
          ignorePathsArray,
        );

        // Compute summary
        const summary = computeSummary(entries);

        setDiff({
          stateA,
          stateB,
          sequenceA: minSeq,
          sequenceB: maxSeq,
          entries,
          summary,
          eventsBetween,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setDiff(null);
      } finally {
        setIsLoading(false);
      }
    },
    [eventStore, initialState, reducers, maxDepth, ignorePathsArray],
  );

  // Clear diff
  const clear = useCallback(() => {
    setDiff(null);
    setError(null);
  }, []);

  return {
    diff,
    isLoading,
    error,
    computeDiff,
    clear,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to compare state at a specific sequence with current state.
 */
export function useStateDiffFromSequence<TState>(
  targetSequence: number,
  options: IUseStateDiffOptions<TState>,
): IUseStateDiffReturn<TState> {
  const { eventStore = getEventStore() } = options;
  const hook = useStateDiff(options);

  // Compute diff on mount and when target changes
  useEffect(() => {
    const currentSequence = eventStore.getLatestSequence();
    if (targetSequence < currentSequence) {
      hook.computeDiff(targetSequence, currentSequence);
    }
  }, [targetSequence, eventStore, hook]);

  return hook;
}

/**
 * Get a specific value at a path from a state object.
 */
export function getValueAtPath(state: unknown, path: string): unknown {
  if (!path) return state;

  const segments = path.split(/[.[\]]+/).filter(Boolean);
  let current: unknown = state;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Filter diff entries by path prefix.
 */
export function filterDiffByPath(
  entries: IDiffEntry[],
  pathPrefix: string,
): IDiffEntry[] {
  return entries.filter(
    (entry) =>
      entry.path === pathPrefix ||
      entry.path.startsWith(`${pathPrefix}.`) ||
      entry.path.startsWith(`${pathPrefix}[`),
  );
}

/**
 * Group diff entries by top-level path segment.
 */
export function groupDiffByTopLevel(
  entries: IDiffEntry[],
): Record<string, IDiffEntry[]> {
  const groups: Record<string, IDiffEntry[]> = {};

  for (const entry of entries) {
    const topLevel = entry.path.split(/[.[\]]/)[0] || 'root';
    if (!groups[topLevel]) {
      groups[topLevel] = [];
    }
    groups[topLevel].push(entry);
  }

  return groups;
}
