/**
 * Checkpoint compatibility core contract (replay-safety PR 14).
 *
 * Pins: checkpoint metadata is validated and frozen with the full
 * binding set (stream, root branch, revision, schema-pipeline
 * fingerprint, projector id/version, source-tail digest, state
 * digest); compatibility evaluation is pure and names EVERY mismatched
 * binding with no state attached to an incompatible verdict; tail
 * continuity requires revision+1 ascending with typed gap evidence;
 * recovery-base selection discards incompatible checkpoints entirely
 * and falls back to full replay; and - via the REAL schema registry
 * fingerprint - a target-schema or upcaster change invalidates a prior
 * checkpoint even when the projector version is unchanged.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import {
  ReplayCheckpointError,
  createReplayCheckpointMetadata,
  digestReplayCheckpointState,
  evaluateReplayCheckpointCompatibility,
  evaluateReplayTailContinuity,
  selectReplayRecoveryBase,
} from '../ReplayCheckpointCompatibility';
import { ReplaySchemaRegistry } from '../ReplaySchemaRegistry';

const baseMetadata = () =>
  createReplayCheckpointMetadata({
    streamId: 'campaign-alpha',
    branchId: 'root',
    revision: 41,
    schemaPipelineFingerprint: 'fp-current',
    projectorId: 'campaign.projector',
    projectorVersion: 3,
    sourceTailDigest: 'tail-digest-41',
    stateDigest: 'state-digest-41',
  });

const baseExpectation = () => ({
  streamId: 'campaign-alpha',
  branchId: 'root',
  schemaPipelineFingerprint: 'fp-current',
  projectorId: 'campaign.projector',
  projectorVersion: 3,
});

/** A tiny single-event registry whose identities we can vary. */
const registryWith = (options: {
  schemaId: string;
  withV2Transition?: boolean;
}): ReplaySchemaRegistry =>
  new ReplaySchemaRegistry({
    events: [
      {
        eventType: 'probe_event',
        targetSchemaVersion: options.withV2Transition ? 2 : 1,
        schemas: [
          {
            schemaVersion: 1,
            schemaId: options.schemaId,
            parse: (payload: unknown) => payload,
          },
          ...(options.withV2Transition
            ? [
                {
                  schemaVersion: 2,
                  schemaId: `${options.schemaId}.v2`,
                  parse: (payload: unknown) => payload,
                },
              ]
            : []),
        ],
        transitions: options.withV2Transition
          ? [
              {
                fromVersion: 1,
                toVersion: 2,
                transitionId: 'probe.v1-to-v2',
                upcast: (payload: unknown) => payload,
              },
            ]
          : [],
      },
    ],
  });

describe('checkpoint compatibility core', () => {
  it('validates and freezes checkpoint metadata', () => {
    const metadata = baseMetadata();
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(metadata.revision).toBe(41);
  });

  it.each([
    ['empty streamId', { streamId: ' ' }],
    ['empty branchId', { branchId: '' }],
    ['empty fingerprint', { schemaPipelineFingerprint: '' }],
    ['empty projectorId', { projectorId: '  ' }],
    ['empty sourceTailDigest', { sourceTailDigest: '' }],
    ['empty stateDigest', { stateDigest: '' }],
    ['negative revision', { revision: -1 }],
    ['fractional revision', { revision: 1.5 }],
    ['zero projectorVersion', { projectorVersion: 0 }],
  ])('rejects invalid metadata (%s)', (_label, overrides) => {
    expect(() =>
      createReplayCheckpointMetadata({
        streamId: 'campaign-alpha',
        branchId: 'root',
        revision: 41,
        schemaPipelineFingerprint: 'fp-current',
        projectorId: 'campaign.projector',
        projectorVersion: 3,
        sourceTailDigest: 'tail-digest-41',
        stateDigest: 'state-digest-41',
        ...overrides,
      }),
    ).toThrow(ReplayCheckpointError);
  });

  it('a fully matching checkpoint is compatible', () => {
    const verdict = evaluateReplayCheckpointCompatibility(baseMetadata(), {
      ...baseExpectation(),
      sourceTailDigest: 'tail-digest-41',
      stateDigest: 'state-digest-41',
    });
    expect(verdict).toEqual({ compatible: true, digestsVerified: true });
  });

  it.each([
    ['streamId', { streamId: 'campaign-beta' }],
    ['branchId', { branchId: 'other-branch' }],
    ['schemaPipelineFingerprint', { schemaPipelineFingerprint: 'fp-stale' }],
    ['projectorId', { projectorId: 'other.projector' }],
    ['projectorVersion', { projectorVersion: 4 }],
    ['sourceTailDigest', { sourceTailDigest: 'tail-digest-corrupt' }],
    ['stateDigest', { stateDigest: 'state-digest-corrupt' }],
  ])('a %s mismatch is named in the verdict', (field, override) => {
    const verdict = evaluateReplayCheckpointCompatibility(baseMetadata(), {
      ...baseExpectation(),
      sourceTailDigest: 'tail-digest-41',
      stateDigest: 'state-digest-41',
      ...override,
    });
    expect(verdict.compatible).toBe(false);
    if (!verdict.compatible) expect(verdict.mismatches).toEqual([field]);
  });

  it('multiple mismatches are all named and carry no state', () => {
    const verdict = evaluateReplayCheckpointCompatibility(baseMetadata(), {
      ...baseExpectation(),
      schemaPipelineFingerprint: 'fp-stale',
      projectorVersion: 9,
    });
    expect(verdict.compatible).toBe(false);
    if (!verdict.compatible) {
      expect(verdict.mismatches).toEqual([
        'schemaPipelineFingerprint',
        'projectorVersion',
      ]);
      expect(Object.keys(verdict).sort()).toEqual(['compatible', 'mismatches']);
    }
  });

  it('identity-only compatibility is flagged as digest-unverified', () => {
    const verdict = evaluateReplayCheckpointCompatibility(
      baseMetadata(),
      baseExpectation(),
    );
    expect(verdict).toEqual({ compatible: true, digestsVerified: false });
    const partial = evaluateReplayCheckpointCompatibility(baseMetadata(), {
      ...baseExpectation(),
      sourceTailDigest: 'tail-digest-41',
    });
    expect(partial).toEqual({ compatible: true, digestsVerified: false });
  });

  it('tail continuity requires revision+1 ascending', () => {
    expect(evaluateReplayTailContinuity(41, [42, 43, 44])).toEqual({
      contiguous: true,
    });
    expect(evaluateReplayTailContinuity(41, [])).toEqual({
      contiguous: true,
    });
    expect(evaluateReplayTailContinuity(41, [43, 44])).toEqual({
      contiguous: false,
      expectedRevision: 42,
      foundRevision: 43,
    });
    expect(evaluateReplayTailContinuity(41, [42, 44])).toEqual({
      contiguous: false,
      expectedRevision: 43,
      foundRevision: 44,
    });
    expect(evaluateReplayTailContinuity(41, [41])).toEqual({
      contiguous: false,
      expectedRevision: 42,
      foundRevision: 41,
    });
  });

  it('recovery-base selection picks the newest compatible checkpoint', () => {
    const older = createReplayCheckpointMetadata({
      ...baseMetadata(),
      revision: 20,
      sourceTailDigest: 'tail-digest-20',
      stateDigest: 'state-digest-20',
    });
    const stale = createReplayCheckpointMetadata({
      ...baseMetadata(),
      revision: 60,
      schemaPipelineFingerprint: 'fp-stale',
    });
    const decision = selectReplayRecoveryBase(
      [older, stale, baseMetadata()],
      baseExpectation(),
    );
    expect(decision.kind).toBe('checkpoint');
    if (decision.kind === 'checkpoint') {
      expect(decision.checkpoint.revision).toBe(41);
      expect(decision.digestsVerified).toBe(false);
    }
  });

  it('excludes checkpoints past the requested head via throughRevision', () => {
    const ahead = createReplayCheckpointMetadata({
      ...baseMetadata(),
      revision: 90,
    });
    const decision = selectReplayRecoveryBase(
      [ahead, baseMetadata()],
      baseExpectation(),
      50,
    );
    expect(decision.kind).toBe('checkpoint');
    if (decision.kind === 'checkpoint')
      expect(decision.checkpoint.revision).toBe(41);
    expect(selectReplayRecoveryBase([ahead], baseExpectation(), 50)).toEqual({
      kind: 'full-replay',
    });
  });

  it('falls back to full replay when no checkpoint is compatible', () => {
    const stale = createReplayCheckpointMetadata({
      ...baseMetadata(),
      schemaPipelineFingerprint: 'fp-stale',
    });
    expect(selectReplayRecoveryBase([stale], baseExpectation())).toEqual({
      kind: 'full-replay',
    });
    expect(selectReplayRecoveryBase([], baseExpectation())).toEqual({
      kind: 'full-replay',
    });
  });

  it('a target-schema change invalidates the checkpoint with the projector unchanged', () => {
    const history = [{ eventType: 'probe_event', schemaVersion: 1 }];
    const currentFingerprint = registryWith({
      schemaId: 'probe.v1',
    }).fingerprintPipeline(history);
    const changedFingerprint = registryWith({
      schemaId: 'probe.v1-rewritten',
    }).fingerprintPipeline(history);
    expect(changedFingerprint).not.toBe(currentFingerprint);

    const checkpoint = createReplayCheckpointMetadata({
      ...baseMetadata(),
      schemaPipelineFingerprint: currentFingerprint,
    });
    const verdict = evaluateReplayCheckpointCompatibility(checkpoint, {
      ...baseExpectation(),
      schemaPipelineFingerprint: changedFingerprint,
    });
    expect(verdict.compatible).toBe(false);
    if (!verdict.compatible)
      expect(verdict.mismatches).toEqual(['schemaPipelineFingerprint']);
  });

  it('an added upcaster invalidates the checkpoint with the projector unchanged', () => {
    const history = [{ eventType: 'probe_event', schemaVersion: 1 }];
    const withoutTransition = registryWith({
      schemaId: 'probe.v1',
    }).fingerprintPipeline(history);
    const withTransition = registryWith({
      schemaId: 'probe.v1',
      withV2Transition: true,
    }).fingerprintPipeline(history);
    expect(withTransition).not.toBe(withoutTransition);

    const checkpoint = createReplayCheckpointMetadata({
      ...baseMetadata(),
      schemaPipelineFingerprint: withoutTransition,
    });
    const verdict = evaluateReplayCheckpointCompatibility(checkpoint, {
      ...baseExpectation(),
      schemaPipelineFingerprint: withTransition,
    });
    expect(verdict.compatible).toBe(false);
    if (!verdict.compatible)
      expect(verdict.mismatches).toEqual(['schemaPipelineFingerprint']);
  });

  it('a transition-identity-only change invalidates the checkpoint', () => {
    const history = [{ eventType: 'probe_event', schemaVersion: 1 }];
    const transitionRegistry = (transitionId: string): ReplaySchemaRegistry =>
      new ReplaySchemaRegistry({
        events: [
          {
            eventType: 'probe_event',
            targetSchemaVersion: 2,
            schemas: [
              {
                schemaVersion: 1,
                schemaId: 'probe.v1',
                parse: (payload: unknown) => payload,
              },
              {
                schemaVersion: 2,
                schemaId: 'probe.v2',
                parse: (payload: unknown) => payload,
              },
            ],
            transitions: [
              {
                fromVersion: 1,
                toVersion: 2,
                transitionId,
                upcast: (payload: unknown) => payload,
              },
            ],
          },
        ],
      });
    const before =
      transitionRegistry('probe.v1-to-v2').fingerprintPipeline(history);
    const after = transitionRegistry(
      'probe.v1-to-v2-rewritten',
    ).fingerprintPipeline(history);
    expect(after).not.toBe(before);

    const checkpoint = createReplayCheckpointMetadata({
      ...baseMetadata(),
      schemaPipelineFingerprint: before,
    });
    const verdict = evaluateReplayCheckpointCompatibility(checkpoint, {
      ...baseExpectation(),
      schemaPipelineFingerprint: after,
    });
    expect(verdict.compatible).toBe(false);
    if (!verdict.compatible)
      expect(verdict.mismatches).toEqual(['schemaPipelineFingerprint']);
  });

  it('state digests are canonical - key order does not matter', () => {
    const a = digestReplayCheckpointState({ x: 1, y: { z: 'two', w: 3 } });
    const b = digestReplayCheckpointState({ y: { w: 3, z: 'two' }, x: 1 });
    const c = digestReplayCheckpointState({ x: 1, y: { z: 'two', w: 4 } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
