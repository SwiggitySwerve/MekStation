/**
 * Full-replay vs checkpoint-plus-tail equivalence contract
 * (replay-safety PR 16).
 *
 * Pins: for BOTH the authoritative projector and an audience-safe
 * viewer projector, full replay and a compatible
 * checkpoint-plus-contiguous-tail produce identical state AND
 * identical canonical digests; EVERY mismatch class (schema-pipeline
 * fingerprint, projector version, source-tail digest, state digest,
 * gapped tail) rejects the checkpoint and rebuilds via full replay
 * with the same final result and named rejection evidence - no state
 * ever derives from an incompatible cache; and every fixture runs
 * twice with byte-identical digests. Checkpoint use stays disabled by
 * default (this harness has no production importer).
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import {
  createReplayCheckpointMetadata,
  digestReplayCheckpointState,
} from '../ReplayCheckpointCompatibility';
import {
  recoverState,
  runFullReplay,
  type IReplayEquivalenceEvent,
} from '../ReplayEquivalenceHarness';
import { ReplayProjector } from '../ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '../ReplaySchemaRegistry';

interface IBattleState {
  readonly damage: number;
  readonly hiddenRolls: readonly number[];
  readonly lastEventType: string | null;
}

interface IViewerState {
  readonly damage: number;
  readonly eventsSeen: number;
}

const registry = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_damage',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.damage.v1',
          parse: (payload: unknown) => {
            const record = payload as { amount?: unknown; roll?: unknown };
            if (
              typeof record?.amount !== 'number' ||
              typeof record?.roll !== 'number'
            )
              throw new Error('invalid probe_damage payload');
            return payload;
          },
        },
      ],
      transitions: [],
    },
    {
      eventType: 'probe_note',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.note.v1',
          parse: (payload: unknown) => payload,
        },
      ],
      transitions: [],
    },
  ],
});

/** Authoritative projection: retains the hidden roll history. */
const authoritativeProjector = () =>
  new ReplayProjector<IBattleState>({
    projectorId: 'equivalence.authoritative',
    projectorVersion: 1,
    initialState: () => ({ damage: 0, hiddenRolls: [], lastEventType: null }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => {
            const payload = event.payload as { amount: number; roll: number };
            return {
              damage: state.damage + payload.amount,
              hiddenRolls: [...state.hiddenRolls, payload.roll],
              lastEventType: event.eventType,
            };
          },
        },
      },
      {
        eventType: 'probe_note',
        decision: {
          kind: 'no-state-change',
          reason: 'notes are display-only in the authoritative projection',
        },
      },
    ],
  });

/** Audience-safe viewer projection: no hidden roll data at all. */
const viewerProjector = () =>
  new ReplayProjector<IViewerState>({
    projectorId: 'equivalence.viewer',
    projectorVersion: 1,
    initialState: () => ({ damage: 0, eventsSeen: 0 }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => {
            const payload = event.payload as { amount: number };
            return {
              damage: state.damage + payload.amount,
              eventsSeen: state.eventsSeen + 1,
            };
          },
        },
      },
      {
        eventType: 'probe_note',
        decision: {
          kind: 'apply',
          apply: (state) => ({
            damage: state.damage,
            eventsSeen: state.eventsSeen + 1,
          }),
        },
      },
    ],
  });

const EVENTS: readonly IReplayEquivalenceEvent[] = Object.freeze(
  Array.from({ length: 12 }, (_, index) => {
    const revision = index + 1;
    return revision % 4 === 0
      ? Object.freeze({
          revision,
          eventType: 'probe_note',
          schemaVersion: 1,
          payload: Object.freeze({ note: `turn ${revision}` }),
        })
      : Object.freeze({
          revision,
          eventType: 'probe_damage',
          schemaVersion: 1,
          payload: Object.freeze({ amount: revision, roll: 7 + (index % 6) }),
        });
  }),
);

const CHECKPOINT_REVISION = 8;
const FINGERPRINT = 'f'.repeat(64);
const TAIL_DIGEST = '1'.repeat(64);

/** Builds the true checkpoint at revision 8 from a prefix full replay. */
const checkpointFixture = <TState>(
  projector: ReplayProjector<TState>,
): {
  metadata: ReturnType<typeof createReplayCheckpointMetadata>;
  stateJson: string;
} => {
  const prefix = EVENTS.filter(
    (event) => event.revision <= CHECKPOINT_REVISION,
  );
  const replayed = runFullReplay(registry, projector, prefix);
  return {
    metadata: createReplayCheckpointMetadata({
      streamId: 'equivalence-stream',
      branchId: 'root',
      revision: CHECKPOINT_REVISION,
      schemaPipelineFingerprint: FINGERPRINT,
      projectorId: projector.projectorId,
      projectorVersion: projector.projectorVersion,
      sourceTailDigest: TAIL_DIGEST,
      stateDigest: replayed.stateDigest,
    }),
    stateJson: JSON.stringify(replayed.state),
  };
};

const expectationFor = (
  metadata: ReturnType<typeof createReplayCheckpointMetadata>,
) => ({
  streamId: metadata.streamId,
  branchId: metadata.branchId,
  schemaPipelineFingerprint: FINGERPRINT,
  projectorId: metadata.projectorId,
  projectorVersion: metadata.projectorVersion,
  sourceTailDigest: TAIL_DIGEST,
  stateDigest: metadata.stateDigest,
});

describe('full-replay and checkpoint equivalence', () => {
  function assertEquivalence<TState>(projector: ReplayProjector<TState>): void {
    const full = runFullReplay(registry, projector, EVENTS);
    const fixture = checkpointFixture(projector);
    const outcome = recoverState(
      registry,
      projector,
      EVENTS,
      fixture,
      expectationFor(fixture.metadata),
    );
    expect(outcome.path).toBe('checkpoint-plus-tail');
    expect(outcome.result.state).toEqual(full.state);
    expect(outcome.result.stateDigest).toBe(full.stateDigest);
  }

  it('authoritative: checkpoint-plus-contiguous-tail equals full replay exactly', () => {
    assertEquivalence(authoritativeProjector());
  });

  it('viewer (audience-safe): checkpoint-plus-contiguous-tail equals full replay exactly', () => {
    assertEquivalence(viewerProjector());
  });

  it('the viewer digest is audience-safe - it never equals the authoritative digest', () => {
    const authoritative = runFullReplay(
      registry,
      authoritativeProjector(),
      EVENTS,
    );
    const viewer = runFullReplay(registry, viewerProjector(), EVENTS);
    expect(viewer.stateDigest).not.toBe(authoritative.stateDigest);
    expect(
      (viewer.state as unknown as Record<string, unknown>)['hiddenRolls'],
    ).toBeUndefined();
  });

  it.each([
    [
      'schema-pipeline fingerprint',
      { schemaPipelineFingerprint: 'e'.repeat(64) },
      ['schemaPipelineFingerprint'],
    ],
    ['projector version', { projectorVersion: 2 }, ['projectorVersion']],
    [
      'source-tail digest',
      { sourceTailDigest: '2'.repeat(64) },
      ['sourceTailDigest'],
    ],
    ['state digest', { stateDigest: 'd'.repeat(64) }, ['stateDigest']],
  ])(
    'a mismatched %s rebuilds via full replay without publication',
    (_label, override, expectedEvidence) => {
      const projector = authoritativeProjector();
      const full = runFullReplay(registry, projector, EVENTS);
      const fixture = checkpointFixture(projector);
      const outcome = recoverState(registry, projector, EVENTS, fixture, {
        ...expectationFor(fixture.metadata),
        ...override,
      });
      expect(outcome.path).toBe('full-replay');
      if (outcome.path === 'full-replay') {
        expect(outcome.rejectedCheckpoint).toEqual(expectedEvidence);
        expect(outcome.result.state).toEqual(full.state);
        expect(outcome.result.stateDigest).toBe(full.stateDigest);
      }
    },
  );

  it('a gapped tail rebuilds via full replay', () => {
    const projector = authoritativeProjector();
    const full = runFullReplay(registry, projector, EVENTS);
    const fixture = checkpointFixture(projector);
    const gappedEvents = EVENTS.filter((event) => event.revision !== 9);
    const outcome = recoverState(
      registry,
      projector,
      gappedEvents,
      fixture,
      expectationFor(fixture.metadata),
    );
    expect(outcome.path).toBe('full-replay');
    if (outcome.path === 'full-replay') {
      expect(outcome.rejectedCheckpoint).toEqual(['tail-discontinuity']);
      // The rebuild replays exactly the (gapped) history it was given -
      // never a state derived from the rejected checkpoint.
      expect(outcome.result.state).toEqual(
        runFullReplay(registry, projector, gappedEvents).state,
      );
      expect(outcome.result.state).not.toEqual(full.state);
    }
  });

  it('every fixture runs twice with identical state and digests', () => {
    const assertTwice = <TState>(
      makeProjector: () => ReplayProjector<TState>,
    ): void => {
      const first = runFullReplay(registry, makeProjector(), EVENTS);
      const second = runFullReplay(registry, makeProjector(), EVENTS);
      expect(second.state).toEqual(first.state);
      expect(second.stateDigest).toBe(first.stateDigest);
    };
    assertTwice(authoritativeProjector);
    assertTwice(viewerProjector);
    const assertRecoveryTwice = <TState>(
      makeProjector: () => ReplayProjector<TState>,
      override: Record<string, unknown> = {},
    ): void => {
      const projector = makeProjector();
      const fixture = checkpointFixture(projector);
      const runOnce = () =>
        recoverState(registry, projector, EVENTS, fixture, {
          ...expectationFor(fixture.metadata),
          ...override,
        });
      const first = runOnce();
      const second = runOnce();
      expect(second.path).toBe(first.path);
      expect(second.result.state).toEqual(first.result.state);
      expect(second.result.stateDigest).toBe(first.result.stateDigest);
      expect(digestReplayCheckpointState(first.result.state)).toBe(
        first.result.stateDigest,
      );
    };
    // Every fixture twice: both projectors' happy paths AND all four
    // metadata-mismatch fixtures.
    assertRecoveryTwice(authoritativeProjector);
    assertRecoveryTwice(viewerProjector);
    for (const override of [
      { schemaPipelineFingerprint: 'e'.repeat(64) },
      { projectorVersion: 2 },
      { sourceTailDigest: '2'.repeat(64) },
      { stateDigest: 'd'.repeat(64) },
    ])
      assertRecoveryTwice(authoritativeProjector, override);
  });
});
