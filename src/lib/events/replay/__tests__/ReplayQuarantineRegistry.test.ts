/**
 * Per-authority-scope quarantine contract (replay-safety PR 17).
 *
 * Pins: every quarantine reason class carries a typed frozen record
 * with evidence; the command/publication gate fails typed for exactly
 * the quarantined scope while a healthy CONTROL scope keeps accepting
 * and publishing (present in every corruption case here); the guarded
 * projection blocks a quarantined scope BEFORE any work, classifies
 * replay failures into quarantine reasons, and never yields partial
 * state; first quarantine wins; release is explicit and records the
 * recovery action; and the failure classifier is total over the
 * replay error-code union.
 *
 * Branch parent/base/supersession lineage checks stay deferred to
 * `add-authoritative-history-branches` (verified: its proposal owns
 * immutable branch records, activation CAS, and correction leases) -
 * `broken-root-continuity` remains a first-class reason today.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { ReplayProjector } from '../ReplayProjectorRegistry';
import {
  classifyReplayFailure,
  guardedProject,
  ReplayQuarantineRegistry,
  ReplayScopeQuarantinedError,
  type ReplayQuarantineReason,
} from '../ReplayQuarantineRegistry';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
  type UnsupportedReplayHistoryCode,
} from '../ReplaySchemaRegistry';

const SCOPE_A = { authorityType: 'campaign', authorityId: 'alpha' };
const SCOPE_B = { authorityType: 'campaign', authorityId: 'bravo' };

const registry = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_event',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.v1',
          parse: (payload: unknown) => {
            const record = payload as { value?: unknown };
            if (typeof record?.value !== 'number')
              throw new Error('invalid probe payload');
            return payload;
          },
        },
      ],
      transitions: [],
    },
  ],
});

interface ICountState {
  readonly applied: number;
}

const projector = () =>
  new ReplayProjector<ICountState>({
    projectorId: 'quarantine.probe',
    projectorVersion: 1,
    initialState: () => ({ applied: 0 }),
    decisions: [
      {
        eventType: 'probe_event',
        decision: {
          kind: 'apply',
          apply: (state) => ({ applied: state.applied + 1 }),
        },
      },
    ],
  });

const ALL_REASONS: readonly ReplayQuarantineReason[] = [
  'broken-root-continuity',
  'canonicalizer-mismatch',
  'digest-mismatch',
  'invalid-payload',
  'missing-provenance',
  'unsupported-event-type',
  'unsupported-schema-version',
  'upcast-failed',
];

describe('per-authority-scope quarantine', () => {
  it.each(ALL_REASONS.map((reason) => [reason] as const))(
    'records a typed frozen %s quarantine with evidence',
    (reason) => {
      const quarantine = new ReplayQuarantineRegistry();
      const record = quarantine.quarantine({
        scope: SCOPE_A,
        reason,
        evidence: ['probe_event', 'v1'],
        message: `probe ${reason}`,
      });
      expect(record.reason).toBe(reason);
      expect(Object.isFrozen(record)).toBe(true);
      expect(Object.isFrozen(record.evidence)).toBe(true);
      expect(quarantine.isQuarantined(SCOPE_A)).toBe(true);
      // The healthy control scope stays available in EVERY corruption case.
      expect(quarantine.isQuarantined(SCOPE_B)).toBe(false);
      expect(() => quarantine.assertScopeOperational(SCOPE_B)).not.toThrow();
    },
  );

  it('crafted authority ids cannot collide scope keys', () => {
    const quarantine = new ReplayQuarantineRegistry();
    const crafted = { authorityType: 'campaign a', authorityId: 'b' };
    const victim = { authorityType: 'campaign', authorityId: 'a b' };
    quarantine.quarantine({
      scope: crafted,
      reason: 'digest-mismatch',
      evidence: [],
      message: 'crafted scope',
    });
    expect(quarantine.isQuarantined(crafted)).toBe(true);
    expect(quarantine.isQuarantined(victim)).toBe(false);
    expect(() => quarantine.assertScopeOperational(victim)).not.toThrow();
  });

  it('blocks exactly the quarantined scope while the control scope stays available', () => {
    const quarantine = new ReplayQuarantineRegistry();
    quarantine.quarantine({
      scope: SCOPE_A,
      reason: 'digest-mismatch',
      evidence: ['evt-9'],
      message: 'stored digest does not match recomputation',
    });

    let blocked: ReplayScopeQuarantinedError | null = null;
    try {
      quarantine.assertScopeOperational(SCOPE_A);
    } catch (error) {
      if (error instanceof ReplayScopeQuarantinedError) blocked = error;
      else throw error;
    }
    expect(blocked?.record.reason).toBe('digest-mismatch');

    // The healthy control scope keeps accepting and publishing.
    expect(() => quarantine.assertScopeOperational(SCOPE_B)).not.toThrow();
    const control = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_B,
      { applied: 0 },
      { eventType: 'probe_event', schemaVersion: 1, payload: { value: 1 } },
    );
    expect(control).toEqual({ kind: 'applied', state: { applied: 1 } });
  });

  it('guarded projection quarantines the failing scope only and yields no partial state', () => {
    const quarantine = new ReplayQuarantineRegistry();
    const stateA = Object.freeze({ applied: 3 });

    const failure = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_A,
      stateA,
      { eventType: 'unknown_event', schemaVersion: 1, payload: {} },
    );
    expect(failure.kind).toBe('blocked');
    if (failure.kind === 'blocked')
      expect(failure.record.reason).toBe('unsupported-event-type');
    expect(stateA).toEqual({ applied: 3 });
    expect(quarantine.isQuarantined(SCOPE_A)).toBe(true);
    expect(quarantine.isQuarantined(SCOPE_B)).toBe(false);

    // Once quarantined, the scope is blocked BEFORE any work - even for
    // an event that would otherwise be valid.
    const afterwards = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_A,
      stateA,
      { eventType: 'probe_event', schemaVersion: 1, payload: { value: 1 } },
    );
    expect(afterwards.kind).toBe('blocked');

    // The control scope processes the same stream shape untouched.
    const control = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_B,
      { applied: 0 },
      { eventType: 'probe_event', schemaVersion: 1, payload: { value: 2 } },
    );
    expect(control.kind).toBe('applied');
  });

  it('classifies every replay failure code into a quarantine reason', () => {
    const cases: readonly [
      UnsupportedReplayHistoryCode,
      ReplayQuarantineReason,
    ][] = [
      ['unknown-event-type', 'unsupported-event-type'],
      ['unsupported-schema-version', 'unsupported-schema-version'],
      ['missing-transition', 'unsupported-schema-version'],
      ['invalid-payload', 'invalid-payload'],
      ['missing-required-input', 'missing-provenance'],
      ['upcast-failed', 'upcast-failed'],
    ];
    for (const [code, reason] of cases) {
      expect(
        classifyReplayFailure(
          new UnsupportedReplayHistoryError(code, 'probe_event', 1, code),
        ),
      ).toBe(reason);
    }
  });

  it('a bad payload quarantines as invalid-payload with named evidence', () => {
    const quarantine = new ReplayQuarantineRegistry();
    const result = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_A,
      { applied: 0 },
      { eventType: 'probe_event', schemaVersion: 1, payload: { value: 'x' } },
    );
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') {
      expect(result.record.reason).toBe('invalid-payload');
      expect(result.record.evidence).toEqual(['probe_event', 'v1']);
    }
    // Control scope untouched by the corruption.
    const control = guardedProject(
      quarantine,
      registry,
      projector(),
      SCOPE_B,
      { applied: 0 },
      { eventType: 'probe_event', schemaVersion: 1, payload: { value: 4 } },
    );
    expect(control.kind).toBe('applied');
  });

  it('a programmer-bug throw propagates instead of quarantining', () => {
    const quarantine = new ReplayQuarantineRegistry();
    // No decision registered for probe_event: ReplayProjectionError is a
    // code defect, not unsupported history - it must propagate.
    const undecided = new ReplayProjector<ICountState>({
      projectorId: 'quarantine.undecided',
      projectorVersion: 1,
      initialState: () => ({ applied: 0 }),
      decisions: [],
    });
    expect(() =>
      guardedProject(
        quarantine,
        registry,
        undecided,
        SCOPE_A,
        { applied: 0 },
        { eventType: 'probe_event', schemaVersion: 1, payload: { value: 1 } },
      ),
    ).toThrow(/no decision/);
    expect(quarantine.isQuarantined(SCOPE_A)).toBe(false);
  });

  it('first quarantine wins; release is explicit and records the recovery action', () => {
    const quarantine = new ReplayQuarantineRegistry();
    const first = quarantine.quarantine({
      scope: SCOPE_A,
      reason: 'broken-root-continuity',
      evidence: ['revision 7 missing'],
      message: 'root branch continuity broken at revision 7',
    });
    const second = quarantine.quarantine({
      scope: SCOPE_A,
      reason: 'digest-mismatch',
      evidence: ['evt-9'],
      message: 'later observation',
    });
    expect(second).toBe(first);
    expect(quarantine.recordFor(SCOPE_A)?.reason).toBe(
      'broken-root-continuity',
    );

    quarantine.release(SCOPE_A, 'full replay from revision 0 verified clean');
    expect(quarantine.isQuarantined(SCOPE_A)).toBe(false);
    expect(quarantine.releaseHistory()).toEqual([
      {
        scope: SCOPE_A,
        recoveryAction: 'full replay from revision 0 verified clean',
      },
    ]);
    // Releasing a never-quarantined scope is a no-op with no history.
    quarantine.release(SCOPE_B, 'noop');
    expect(quarantine.releaseHistory()).toHaveLength(1);
  });
});
