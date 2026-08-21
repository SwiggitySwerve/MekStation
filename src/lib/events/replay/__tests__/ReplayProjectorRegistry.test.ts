/**
 * Replay projector registry contract (replay-safety PR 13).
 *
 * Pins: projector identity is its own immutable pair (id + version)
 * separate from schema versions; every supported event needs an
 * explicit apply handler or a NAMED no-state-change decision - a
 * missing decision fails typed with no partial projection (the input
 * state is untouched and no value is returned); duplicate decisions
 * and invalid registrations fail typed; no-state-change returns the
 * SAME state reference; apply handlers never mutate their input
 * (frozen-state proof); and the completeness gate names EVERY missing
 * discriminant against the canonical 88-member supported set.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { ICurrentReplayPayload } from '../ReplaySchemaRegistry';

import { REPLAY_BASELINE_CANONICAL_EVENT_TYPES } from '../ReplayBaselineDomainRegistry';
import {
  ReplayProjectionError,
  ReplayProjector,
  assertReplayProjectorCompleteness,
} from '../ReplayProjectorRegistry';

interface ICountState {
  readonly applied: number;
  readonly lastEventType: string | null;
}

const event = (eventType: string): ICurrentReplayPayload =>
  Object.freeze({ eventType, schemaVersion: 1, payload: Object.freeze({}) });

const countingProjector = (): ReplayProjector<ICountState> =>
  new ReplayProjector<ICountState>({
    projectorId: 'test.counting-projector',
    projectorVersion: 1,
    initialState: () => ({ applied: 0, lastEventType: null }),
    decisions: [
      {
        eventType: 'counted_event',
        decision: {
          kind: 'apply',
          apply: (state, applied) => ({
            applied: state.applied + 1,
            lastEventType: applied.eventType,
          }),
        },
      },
      {
        eventType: 'display_only_event',
        decision: {
          kind: 'no-state-change',
          reason: 'display-only telemetry; projection state is unaffected',
        },
      },
    ],
  });

const expectProjectionError = (run: () => unknown): ReplayProjectionError => {
  try {
    run();
  } catch (error) {
    if (error instanceof ReplayProjectionError) return error;
    throw error;
  }
  throw new Error('expected ReplayProjectionError');
};

describe('replay projector registry', () => {
  it('carries its own immutable identity separate from schema versions', () => {
    const projector = countingProjector();
    expect(projector.projectorId).toBe('test.counting-projector');
    expect(projector.projectorVersion).toBe(1);
    const applied = projector.project(
      projector.initialState(),
      event('counted_event'),
    );
    expect(applied.applied).toBe(1);
    const bumped = new ReplayProjector<ICountState>({
      projectorId: 'test.counting-projector',
      projectorVersion: 2,
      initialState: () => ({ applied: 0, lastEventType: null }),
      decisions: [],
    });
    expect(bumped.projectorVersion).toBe(2);
  });

  it('applies through the registered handler without mutating input state', () => {
    const projector = countingProjector();
    const initial = Object.freeze(projector.initialState());
    const next = projector.project(initial, event('counted_event'));
    expect(next).toEqual({ applied: 1, lastEventType: 'counted_event' });
    expect(initial).toEqual({ applied: 0, lastEventType: null });
    expect(next).not.toBe(initial);
  });

  it('stores frozen decision copies so retained definitions cannot mutate them', () => {
    const decisions = [
      {
        eventType: 'counted_event',
        decision: {
          kind: 'no-state-change' as const,
          reason: 'frozen-copy probe',
        },
      },
    ];
    const projector = new ReplayProjector<ICountState>({
      projectorId: 'test.frozen-copy',
      projectorVersion: 1,
      initialState: () => ({ applied: 0, lastEventType: null }),
      decisions,
    });
    decisions[0]!.decision.reason = '';
    const stored = projector.decisionFor('counted_event');
    expect(stored?.kind).toBe('no-state-change');
    if (stored?.kind === 'no-state-change')
      expect(stored.reason).toBe('frozen-copy probe');
    expect(Object.isFrozen(stored)).toBe(true);
  });

  it('no-state-change returns the SAME state reference', () => {
    const projector = countingProjector();
    const state = Object.freeze(projector.initialState());
    const result = projector.project(state, event('display_only_event'));
    expect(result).toBe(state);
  });

  it('a missing decision fails typed with no partial projection', () => {
    const projector = countingProjector();
    const state = Object.freeze({ applied: 3, lastEventType: 'counted_event' });
    const error = expectProjectionError(() =>
      projector.project(state, event('unregistered_event')),
    );
    expect(error.code).toBe('missing-projector-decision');
    expect(error.eventTypes).toEqual(['unregistered_event']);
    expect(state).toEqual({ applied: 3, lastEventType: 'counted_event' });
  });

  it('duplicate decisions fail typed at construction', () => {
    const error = expectProjectionError(
      () =>
        new ReplayProjector<ICountState>({
          projectorId: 'test.duplicate',
          projectorVersion: 1,
          initialState: () => ({ applied: 0, lastEventType: null }),
          decisions: [
            {
              eventType: 'counted_event',
              decision: { kind: 'no-state-change', reason: 'first' },
            },
            {
              eventType: 'counted_event',
              decision: { kind: 'no-state-change', reason: 'second' },
            },
          ],
        }),
    );
    expect(error.code).toBe('duplicate-projector-decision');
    expect(error.eventTypes).toEqual(['counted_event']);
  });

  it.each([
    ['empty id', { projectorId: '  ', projectorVersion: 1 }],
    ['zero version', { projectorId: 'test.invalid', projectorVersion: 0 }],
    [
      'fractional version',
      { projectorId: 'test.invalid', projectorVersion: 1.5 },
    ],
  ])('invalid registration fails typed (%s)', (_label, identity) => {
    const error = expectProjectionError(
      () =>
        new ReplayProjector<ICountState>({
          ...identity,
          initialState: () => ({ applied: 0, lastEventType: null }),
          decisions: [],
        }),
    );
    expect(error.code).toBe('invalid-projector-registration');
  });

  it('an unnamed no-state-change decision fails typed', () => {
    const error = expectProjectionError(
      () =>
        new ReplayProjector<ICountState>({
          projectorId: 'test.unnamed',
          projectorVersion: 1,
          initialState: () => ({ applied: 0, lastEventType: null }),
          decisions: [
            {
              eventType: 'counted_event',
              decision: { kind: 'no-state-change', reason: '   ' },
            },
          ],
        }),
    );
    expect(error.code).toBe('invalid-projector-registration');
    expect(error.eventTypes).toEqual(['counted_event']);
  });

  it('completeness gate names EVERY missing canonical discriminant', () => {
    const projector = countingProjector();
    const error = expectProjectionError(() =>
      assertReplayProjectorCompleteness(
        projector,
        REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
      ),
    );
    expect(error.code).toBe('incomplete-projector');
    expect(error.eventTypes).toEqual([
      ...REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
    ]);
  });

  it('a projector deciding every supported discriminant passes the gate', () => {
    const complete = new ReplayProjector<ICountState>({
      projectorId: 'test.gate-probe',
      projectorVersion: 1,
      initialState: () => ({ applied: 0, lastEventType: null }),
      decisions: REPLAY_BASELINE_CANONICAL_EVENT_TYPES.map((eventType) => ({
        eventType,
        decision: {
          kind: 'no-state-change' as const,
          reason:
            'gate probe: synthetic decision proving the completeness gate',
        },
      })),
    });
    expect(() =>
      assertReplayProjectorCompleteness(
        complete,
        REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
      ),
    ).not.toThrow();
    const partial = new ReplayProjector<ICountState>({
      projectorId: 'test.gate-probe-partial',
      projectorVersion: 1,
      initialState: () => ({ applied: 0, lastEventType: null }),
      decisions: REPLAY_BASELINE_CANONICAL_EVENT_TYPES.slice(1).map(
        (eventType) => ({
          eventType,
          decision: {
            kind: 'no-state-change' as const,
            reason: 'gate probe: synthetic decision',
          },
        }),
      ),
    });
    const error = expectProjectionError(() =>
      assertReplayProjectorCompleteness(
        partial,
        REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
      ),
    );
    expect(error.code).toBe('incomplete-projector');
    expect(error.eventTypes).toEqual([
      REPLAY_BASELINE_CANONICAL_EVENT_TYPES[0],
    ]);
  });
});
