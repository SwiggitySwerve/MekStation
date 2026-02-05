/**
 * State Derivation Utilities
 * Functions for deriving state from events.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { IBaseEvent, ICheckpoint } from '@/types/events';

// =============================================================================
// Reducer Types
// =============================================================================

/**
 * A reducer function that applies an event to state.
 */
export type EventReducer<TState> = (state: TState, event: IBaseEvent) => TState;

/**
 * A map of reducers by event category and type.
 */
export type ReducerMap<TState> = {
  [category: string]: {
    [type: string]: EventReducer<TState>;
  };
};

// =============================================================================
// State Derivation
// =============================================================================

/**
 * Derive state by replaying events through reducers.
 * @param initialState The starting state
 * @param events Events to replay
 * @param reducers Map of reducers by category/type
 * @returns The final derived state
 */
export function deriveState<TState>(
  initialState: TState,
  events: readonly IBaseEvent[],
  reducers: ReducerMap<TState>,
): TState {
  // Sort events by sequence
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);

  // Apply each event
  let state = initialState;
  for (const event of sorted) {
    state = applyEventToState(state, event, reducers);
  }

  return state;
}

/**
 * Derive state from a checkpoint plus subsequent events.
 * @param checkpoint The checkpoint to start from
 * @param events Events after the checkpoint
 * @param reducers Map of reducers by category/type
 * @returns The final derived state
 */
export function deriveFromCheckpoint<TState>(
  checkpoint: ICheckpoint<TState>,
  events: readonly IBaseEvent[],
  reducers: ReducerMap<TState>,
): TState {
  // Filter events after checkpoint
  const afterCheckpoint = events.filter(
    (e) => e.sequence > checkpoint.sequence,
  );

  // Start from checkpoint state and apply events
  return deriveState(checkpoint.state, afterCheckpoint, reducers);
}

/**
 * Derive state at a specific sequence number.
 * @param initialState The starting state
 * @param events All events
 * @param targetSequence The sequence number to derive state at
 * @param reducers Map of reducers by category/type
 * @returns The state at the target sequence
 */
export function deriveStateAtSequence<TState>(
  initialState: TState,
  events: readonly IBaseEvent[],
  targetSequence: number,
  reducers: ReducerMap<TState>,
): TState {
  // Filter events up to target sequence
  const filtered = events.filter((e) => e.sequence <= targetSequence);
  return deriveState(initialState, filtered, reducers);
}

/**
 * Derive state at a specific sequence using a checkpoint if available.
 * @param checkpoint Optional checkpoint to start from
 * @param events All events
 * @param targetSequence The sequence number to derive state at
 * @param reducers Map of reducers by category/type
 * @param initialState Fallback initial state if no checkpoint
 * @returns The state at the target sequence
 */
export function deriveStateWithCheckpoint<TState>(
  checkpoint: ICheckpoint<TState> | undefined,
  events: readonly IBaseEvent[],
  targetSequence: number,
  reducers: ReducerMap<TState>,
  initialState: TState,
): TState {
  // Filter events up to target
  const eventsUpToTarget = events.filter((e) => e.sequence <= targetSequence);

  if (checkpoint && checkpoint.sequence <= targetSequence) {
    // Use checkpoint - only replay events after it
    const eventsAfterCheckpoint = eventsUpToTarget.filter(
      (e) => e.sequence > checkpoint.sequence,
    );
    return deriveState(checkpoint.state, eventsAfterCheckpoint, reducers);
  }

  // No usable checkpoint - replay from start
  return deriveState(initialState, eventsUpToTarget, reducers);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Apply a single event to state using the appropriate reducer.
 */
function applyEventToState<TState>(
  state: TState,
  event: IBaseEvent,
  reducers: ReducerMap<TState>,
): TState {
  const categoryReducers = reducers[event.category];
  if (!categoryReducers) {
    // No reducers for this category - return state unchanged
    return state;
  }

  const reducer = categoryReducers[event.type];
  if (!reducer) {
    // No reducer for this event type - return state unchanged
    return state;
  }

  return reducer(state, event);
}

// =============================================================================
// Reducer Builder
// =============================================================================

/**
 * Builder for creating reducer maps with type safety.
 */
export class ReducerBuilder<TState> {
  private reducers: ReducerMap<TState> = {};

  /**
   * Add a reducer for a specific category and type.
   */
  on(category: string, type: string, reducer: EventReducer<TState>): this {
    if (!this.reducers[category]) {
      this.reducers[category] = {};
    }
    this.reducers[category][type] = reducer;
    return this;
  }

  /**
   * Add reducers for all types in a category.
   */
  forCategory(
    category: string,
    reducers: Record<string, EventReducer<TState>>,
  ): this {
    this.reducers[category] = { ...this.reducers[category], ...reducers };
    return this;
  }

  /**
   * Build the reducer map.
   */
  build(): ReducerMap<TState> {
    return this.reducers;
  }
}

/**
 * Create a new reducer builder.
 */
export function createReducerBuilder<TState>(): ReducerBuilder<TState> {
  return new ReducerBuilder<TState>();
}
