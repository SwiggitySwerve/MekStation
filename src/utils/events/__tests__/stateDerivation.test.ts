/**
 * Tests for State Derivation Utilities
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { EventCategory, IBaseEvent, ICheckpoint } from '@/types/events';

import { createEvent, resetSequence } from '../eventFactory';
// Jest globals are available
import {
  deriveState,
  deriveFromCheckpoint,
  deriveStateAtSequence,
  deriveStateWithCheckpoint,
  createReducerBuilder,
  ReducerMap,
} from '../stateDerivation';

// Test state type
interface TestState {
  count: number;
  items: string[];
}

// Test reducers
const testReducers: ReducerMap<TestState> = {
  test: {
    increment: (state: TestState, event: IBaseEvent) => ({
      ...state,
      count: state.count + ((event.payload as { amount?: number }).amount ?? 1),
    }),
    add_item: (state: TestState, event: IBaseEvent) => ({
      ...state,
      items: [...state.items, (event.payload as { item: string }).item],
    }),
    reset: () => ({ count: 0, items: [] }),
  },
};

const initialState: TestState = { count: 0, items: [] };

describe('deriveState', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should derive state from events', () => {
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 5 },
        context: {},
      }),
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 3 },
        context: {},
      }),
    ];

    // Use 'meta' category in reducers
    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveState(initialState, events, reducers);
    expect(state.count).toBe(8);
  });

  it('should apply events in sequence order', () => {
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'add_item',
        payload: { item: 'first' },
        context: {},
      }),
      createEvent({
        category: EventCategory.Meta,
        type: 'add_item',
        payload: { item: 'second' },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveState(initialState, events, reducers);
    expect(state.items).toEqual(['first', 'second']);
  });

  it('should ignore events without matching reducer', () => {
    const events = [
      createEvent({
        category: EventCategory.Game, // No reducer for this
        type: 'unknown',
        payload: {},
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveState(initialState, events, reducers);
    expect(state).toEqual(initialState);
  });

  it('should handle empty events array', () => {
    const state = deriveState(initialState, [], testReducers);
    expect(state).toEqual(initialState);
  });
});

describe('deriveFromCheckpoint', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should derive state from checkpoint plus events', () => {
    const checkpointState: TestState = { count: 10, items: ['a'] };
    const checkpoint: ICheckpoint<TestState> = {
      checkpointId: 'cp1',
      sequence: 5,
      timestamp: new Date().toISOString(),
      state: checkpointState,
      hash: 'hash',
    };

    // These events come after the checkpoint
    resetSequence(5);
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 5 },
        context: {},
      }),
      createEvent({
        category: EventCategory.Meta,
        type: 'add_item',
        payload: { item: 'b' },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveFromCheckpoint(checkpoint, events, reducers);
    expect(state.count).toBe(15);
    expect(state.items).toEqual(['a', 'b']);
  });

  it('should ignore events before checkpoint', () => {
    const checkpointState: TestState = { count: 10, items: [] };
    const checkpoint: ICheckpoint<TestState> = {
      checkpointId: 'cp1',
      sequence: 10,
      timestamp: new Date().toISOString(),
      state: checkpointState,
      hash: 'hash',
    };

    // These events are before the checkpoint
    resetSequence();
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 100 },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveFromCheckpoint(checkpoint, events, reducers);
    // Should use checkpoint state, ignoring the early event
    expect(state.count).toBe(10);
  });
});

describe('deriveStateAtSequence', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should derive state up to specific sequence', () => {
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 1 },
        context: {},
      }),
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 2 },
        context: {},
      }),
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 3 },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    // Only apply first two events
    const state = deriveStateAtSequence(initialState, events, 2, reducers);
    expect(state.count).toBe(3); // 1 + 2
  });
});

describe('deriveStateWithCheckpoint', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should use checkpoint when available', () => {
    const checkpointState: TestState = { count: 100, items: [] };
    const checkpoint: ICheckpoint<TestState> = {
      checkpointId: 'cp1',
      sequence: 50,
      timestamp: new Date().toISOString(),
      state: checkpointState,
      hash: 'hash',
    };

    resetSequence(50);
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 10 },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveStateWithCheckpoint(
      checkpoint,
      events,
      51,
      reducers,
      initialState,
    );
    expect(state.count).toBe(110);
  });

  it('should fall back to initial state when no checkpoint', () => {
    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 5 },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    const state = deriveStateWithCheckpoint(
      undefined,
      events,
      1,
      reducers,
      initialState,
    );
    expect(state.count).toBe(5);
  });

  it('should not use checkpoint after target sequence', () => {
    const checkpointState: TestState = { count: 999, items: [] };
    const checkpoint: ICheckpoint<TestState> = {
      checkpointId: 'cp1',
      sequence: 100,
      timestamp: new Date().toISOString(),
      state: checkpointState,
      hash: 'hash',
    };

    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'increment',
        payload: { amount: 5 },
        context: {},
      }),
    ];

    const reducers: ReducerMap<TestState> = {
      meta: testReducers.test,
    };

    // Target is before checkpoint, so checkpoint should not be used
    const state = deriveStateWithCheckpoint(
      checkpoint,
      events,
      1,
      reducers,
      initialState,
    );
    expect(state.count).toBe(5); // Not 999
  });
});

describe('ReducerBuilder', () => {
  it('should build reducer map', () => {
    const reducers = createReducerBuilder<TestState>()
      .on('game', 'move', (state) => ({ ...state, count: state.count + 1 }))
      .on('game', 'attack', (state) => ({ ...state, count: state.count + 2 }))
      .forCategory('pilot', {
        level_up: (state) => ({ ...state, items: [...state.items, 'level'] }),
      })
      .build();

    expect(reducers.game.move).toBeDefined();
    expect(reducers.game.attack).toBeDefined();
    expect(reducers.pilot.level_up).toBeDefined();
  });

  it('should work with deriveState', () => {
    resetSequence();

    const reducers = createReducerBuilder<TestState>()
      .on('meta', 'double', (state) => ({ ...state, count: state.count * 2 }))
      .build();

    const events = [
      createEvent({
        category: EventCategory.Meta,
        type: 'double',
        payload: {},
        context: {},
      }),
    ];

    const state = deriveState({ count: 5, items: [] }, events, reducers);
    expect(state.count).toBe(10);
  });
});
