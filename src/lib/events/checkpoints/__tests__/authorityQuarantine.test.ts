/**
 * Per-session corruption quarantine (umbrella task 15.4).
 *
 * Recovery has to validate authority-sequence continuity, branch
 * lineage, receipt uniqueness and required digests BEFORE it admits
 * commands or publication. Each failure quarantines exactly ONE session
 * with a typed reason, and every other session keeps operating - the
 * isolation is per scope key, with no global flag to trip.
 *
 * Pins: each of the four corruption classes is detected and named; a
 * corrupt authority yields a blocked verdict carrying no state; the
 * quarantine registry isolates the scope that failed and leaves a
 * healthy scope operational; and the first diagnosis wins so a later
 * symptom cannot overwrite the original evidence.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type { IAuthorityEventIntegrity } from '../AuthorityQuarantine';
import type { IAuthorityRecoverySource } from '../AuthorityRecoveryPort';

import {
  ReplayQuarantineRegistry,
  ReplayScopeQuarantinedError,
} from '../../replay/ReplayQuarantineRegistry';
import {
  detectAuthorityCorruption,
  quarantineAuthorityCorruption,
} from '../AuthorityQuarantine';
import { referenceRecoveryPort } from '../AuthorityRecoveryPort';

const DIGEST = (seed: string): string => seed.repeat(64).slice(0, 64);

interface IProbeEvent {
  readonly revision: number;
  readonly receiptId: string;
  readonly previous: string | null;
  readonly digest: string;
}

/** A well-formed chain: contiguous revisions, unique receipts, linked. */
function healthyEvents(): IProbeEvent[] {
  const events: IProbeEvent[] = [];
  let previous: string | null = null;
  for (const revision of [0, 1, 2, 3]) {
    const digest = DIGEST(String(revision));
    events.push({ revision, receiptId: `cmd-${revision}`, previous, digest });
    previous = digest;
  }
  return events;
}

const integrityOf = (event: IProbeEvent): IAuthorityEventIntegrity => ({
  revision: event.revision,
  receiptId: event.receiptId,
  previousDigest: event.previous,
  digest: event.digest,
});

function source(
  events: readonly IProbeEvent[],
): IAuthorityRecoverySource<IProbeEvent, number> {
  return {
    authorityId: 'session-corrupt',
    emptyHistory: 'corrupt',
    read: (fromExclusive) =>
      Promise.resolve(events.filter((event) => event.revision > fromExclusive)),
    revisionOf: (event) => event.revision,
    integrityOf,
    fold: (folded) => folded.length,
  };
}

describe('authority corruption detection', () => {
  it('accepts a well-formed history', () => {
    expect(detectAuthorityCorruption(healthyEvents().map(integrityOf))).toBe(
      null,
    );
  });

  it('names a broken authority sequence', () => {
    const events = healthyEvents().filter((event) => event.revision !== 2);
    expect(detectAuthorityCorruption(events.map(integrityOf))).toEqual({
      reason: 'sequence-gap',
      evidence: ['revision 2 expected, found 3'],
    });
  });

  it('names broken lineage', () => {
    const events = healthyEvents();
    events[2] = { ...events[2], previous: DIGEST('z') };
    expect(detectAuthorityCorruption(events.map(integrityOf))?.reason).toBe(
      'broken-lineage',
    );
  });

  it('names a duplicate receipt', () => {
    const events = healthyEvents();
    events[3] = { ...events[3], receiptId: events[1].receiptId };
    expect(detectAuthorityCorruption(events.map(integrityOf))).toEqual({
      reason: 'duplicate-receipt',
      evidence: ['cmd-1 appears at revisions 1 and 3'],
    });
  });

  it('names a missing required digest', () => {
    const events = healthyEvents().map(integrityOf);
    events[2] = { ...events[2], digest: null };
    expect(detectAuthorityCorruption(events)?.reason).toBe('missing-digest');
  });

  it('reports the FIRST corruption, not the last', () => {
    const events = healthyEvents();
    events[1] = { ...events[1], previous: DIGEST('z') };
    events[3] = { ...events[3], receiptId: events[0].receiptId };
    expect(detectAuthorityCorruption(events.map(integrityOf))?.reason).toBe(
      'broken-lineage',
    );
  });
});

describe('corrupt authority recovery and isolation', () => {
  it('a corrupt history blocks with the corruption reason and no state', async () => {
    const events = healthyEvents().filter((event) => event.revision !== 2);
    const verdict = await referenceRecoveryPort<IProbeEvent, number>()(
      source(events),
    );
    expect(verdict).toEqual({
      kind: 'blocked',
      reason: 'sequence-gap',
      evidence: ['revision 2 expected, found 3'],
    });
    expect('state' in verdict).toBe(false);
  });

  it('a well-formed history still recovers through the same port', async () => {
    const verdict = await referenceRecoveryPort<IProbeEvent, number>()(
      source(healthyEvents()),
    );
    expect(verdict).toEqual({
      kind: 'recovered',
      path: 'full-replay',
      state: 4,
      appliedRevisions: 4,
    });
  });

  it('quarantines exactly the failing scope, leaving a healthy one live', async () => {
    const registry = new ReplayQuarantineRegistry();
    const corrupt = { authorityType: 'match', authorityId: 'match-corrupt' };
    const healthy = { authorityType: 'match', authorityId: 'match-healthy' };

    const record = quarantineAuthorityCorruption(
      registry,
      corrupt,
      await referenceRecoveryPort<IProbeEvent, number>()(
        source(healthyEvents().filter((event) => event.revision !== 2)),
      ),
    );

    expect(record?.reason).toBe('sequence-gap');
    expect(registry.isQuarantined(corrupt)).toBe(true);
    expect(() => registry.assertScopeOperational(corrupt)).toThrow(
      ReplayScopeQuarantinedError,
    );
    // The control: a different session on the SAME registry is untouched.
    expect(registry.isQuarantined(healthy)).toBe(false);
    expect(() => registry.assertScopeOperational(healthy)).not.toThrow();
  });

  it('keeps the FIRST diagnosis when a later symptom follows', async () => {
    const registry = new ReplayQuarantineRegistry();
    const scope = { authorityType: 'match', authorityId: 'match-corrupt' };
    const port = referenceRecoveryPort<IProbeEvent, number>();

    // The hole in the sequence is the diagnosis.
    quarantineAuthorityCorruption(
      registry,
      scope,
      await port(source(healthyEvents().filter((e) => e.revision !== 2))),
    );
    // A duplicate receipt found on a later sweep is a symptom of the same
    // broken session; it must not overwrite what was found first.
    const later = healthyEvents();
    later[3] = { ...later[3], receiptId: later[1].receiptId };
    quarantineAuthorityCorruption(registry, scope, await port(source(later)));

    const record = registry.recordFor(scope);
    expect(record?.reason).toBe('sequence-gap');
    expect(record?.evidence).toEqual(['revision 2 expected, found 3']);
  });

  it.each([
    ['empty-history', () => source([])],
    [
      'replay-failed',
      () => ({
        ...source(healthyEvents()),
        fold: (): number => {
          throw new Error('reducer exploded');
        },
      }),
    ],
  ])(
    'a %s block is a refusal, not a corruption verdict',
    async (reason, build) => {
      const registry = new ReplayQuarantineRegistry();
      const scope = { authorityType: 'match', authorityId: 'match-refused' };
      const verdict = await referenceRecoveryPort<IProbeEvent, number>()(
        build(),
      );

      expect(verdict.kind).toBe('blocked');
      if (verdict.kind !== 'blocked') throw new Error('unreachable');
      expect(verdict.reason).toBe(reason);

      // The authority DATA is not being called wrong here - the history is
      // absent, or the reducer threw. Quarantining for either would make
      // release-and-retry a lie about what was diagnosed.
      expect(quarantineAuthorityCorruption(registry, scope, verdict)).toBe(
        null,
      );
      expect(registry.isQuarantined(scope)).toBe(false);
      expect(registry.recordFor(scope)).toBeUndefined();
      expect(() => registry.assertScopeOperational(scope)).not.toThrow();
    },
  );

  it('a recovered verdict quarantines nothing', async () => {
    const registry = new ReplayQuarantineRegistry();
    const scope = { authorityType: 'match', authorityId: 'match-ok' };
    const record = quarantineAuthorityCorruption(
      registry,
      scope,
      await referenceRecoveryPort<IProbeEvent, number>()(
        source(healthyEvents()),
      ),
    );
    expect(record).toBe(null);
    expect(registry.isQuarantined(scope)).toBe(false);
  });
});
