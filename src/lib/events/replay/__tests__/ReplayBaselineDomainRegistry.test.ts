/**
 * Complete domain registry composition contract (replay-safety PR 11).
 *
 * Pins: the composed campaign + combat registration set covers EXACTLY
 * the canonical discriminant sets (7 campaign + 81 combat = 88, per the
 * amended schema-pack-inventory); the composed fixture index covers the
 * same 88 keys; EVERY discriminant round-trips its valid fixture at
 * baseline v1 and reaches exactly one current target; EVERY
 * discriminant fails typed on an unsupported version and unknown types
 * fail typed - full iteration, no representative sampling; and the
 * runtime completeness guard rejects missing, extra, and duplicated
 * registrations with full evidence lists.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { VALID_REPLAY_BASELINE_EVENT_PAYLOADS } from '../__fixtures__/ReplayBaselineDomainRegistry.fixture';
import {
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
  REPLAY_BASELINE_DOMAIN_SCHEMA_PACK,
  ReplayBaselineCompletenessError,
  assertReplayBaselineDomainCompleteness,
  createReplayBaselineDomainRegistry,
} from '../ReplayBaselineDomainRegistry';
import { UnsupportedReplayHistoryError } from '../ReplaySchemaRegistry';

// Pinned to the CURRENT union heads - a new discriminant rewrites a
// number here, not a title (the migration-head retitle law).
const CAMPAIGN_COUNT = 8;
const COMBAT_COUNT = 81;

describe('complete replay baseline domain registry', () => {
  const registry = createReplayBaselineDomainRegistry();

  it('composes exactly the canonical campaign + combat discriminant heads', () => {
    expect(REPLAY_BASELINE_CANONICAL_EVENT_TYPES).toHaveLength(
      CAMPAIGN_COUNT + COMBAT_COUNT,
    );
    expect(new Set(REPLAY_BASELINE_CANONICAL_EVENT_TYPES).size).toBe(
      CAMPAIGN_COUNT + COMBAT_COUNT,
    );
    const registered = REPLAY_BASELINE_DOMAIN_SCHEMA_PACK.map(
      (registration) => registration.eventType,
    );
    expect([...registered].sort()).toEqual(
      [...REPLAY_BASELINE_CANONICAL_EVENT_TYPES].sort(),
    );
    expect(Object.isFrozen(REPLAY_BASELINE_DOMAIN_SCHEMA_PACK)).toBe(true);
  });

  it('has every registration at baseline target v1 with exactly one schema and no transitions', () => {
    const offenders = REPLAY_BASELINE_DOMAIN_SCHEMA_PACK.filter(
      (registration) =>
        registration.targetSchemaVersion !== 1 ||
        registration.schemas.length !== 1 ||
        registration.schemas[0]?.schemaVersion !== 1 ||
        registration.transitions.length !== 0,
    ).map((registration) => registration.eventType);
    expect(offenders).toEqual([]);
  });

  it('ships a valid fixture for exactly the canonical discriminant set', () => {
    expect(Object.keys(VALID_REPLAY_BASELINE_EVENT_PAYLOADS).sort()).toEqual(
      [...REPLAY_BASELINE_CANONICAL_EVENT_TYPES].sort(),
    );
  });

  it.each([...REPLAY_BASELINE_CANONICAL_EVENT_TYPES])(
    '%s reaches its single current target from baseline v1',
    (eventType) => {
      const fixture = VALID_REPLAY_BASELINE_EVENT_PAYLOADS[eventType];
      const upcast = registry.upcast(eventType, 1, fixture);
      expect(upcast.eventType).toBe(eventType);
      expect(upcast.schemaVersion).toBe(1);
      expect(upcast.payload).toEqual(fixture);
      expect(Object.isFrozen(upcast.payload)).toBe(true);
    },
  );

  it.each([...REPLAY_BASELINE_CANONICAL_EVENT_TYPES])(
    '%s fails typed on an unsupported version',
    (eventType) => {
      let code: string | null = null;
      try {
        registry.upcast(
          eventType,
          2,
          VALID_REPLAY_BASELINE_EVENT_PAYLOADS[eventType],
        );
      } catch (error) {
        if (error instanceof UnsupportedReplayHistoryError) code = error.code;
        else throw error;
      }
      expect(code).toBe('unsupported-schema-version');
    },
  );

  it('fails typed on unknown event types', () => {
    let code: string | null = null;
    try {
      registry.upcast('warp_drive_engaged', 1, {});
    } catch (error) {
      if (error instanceof UnsupportedReplayHistoryError) code = error.code;
      else throw error;
    }
    expect(code).toBe('unknown-event-type');
  });

  it('completeness guard rejects a composition missing a discriminant', () => {
    const partial = REPLAY_BASELINE_DOMAIN_SCHEMA_PACK.filter(
      (registration) => registration.eventType !== 'physical_attack_locked',
    );
    let evidence: ReplayBaselineCompletenessError | null = null;
    try {
      assertReplayBaselineDomainCompleteness(partial);
    } catch (error) {
      if (error instanceof ReplayBaselineCompletenessError) evidence = error;
      else throw error;
    }
    expect(evidence?.missing).toEqual(['physical_attack_locked']);
    expect(evidence?.extra).toEqual([]);
    expect(evidence?.duplicated).toEqual([]);
  });

  it('completeness guard rejects extra and duplicated registrations', () => {
    const first = REPLAY_BASELINE_DOMAIN_SCHEMA_PACK[0];
    if (!first) throw new Error('composed pack is empty');
    const withDuplicate = [...REPLAY_BASELINE_DOMAIN_SCHEMA_PACK, first];
    let duplicateEvidence: ReplayBaselineCompletenessError | null = null;
    try {
      assertReplayBaselineDomainCompleteness(withDuplicate);
    } catch (error) {
      if (error instanceof ReplayBaselineCompletenessError)
        duplicateEvidence = error;
      else throw error;
    }
    expect(duplicateEvidence?.duplicated).toEqual([first.eventType]);
    expect(duplicateEvidence?.missing).toEqual([]);
    expect(duplicateEvidence?.extra).toEqual([]);

    const withExtra = [
      ...REPLAY_BASELINE_DOMAIN_SCHEMA_PACK,
      { ...first, eventType: 'warp_drive_engaged' },
    ];
    let evidence: ReplayBaselineCompletenessError | null = null;
    try {
      assertReplayBaselineDomainCompleteness(withExtra);
    } catch (error) {
      if (error instanceof ReplayBaselineCompletenessError) evidence = error;
      else throw error;
    }
    expect(evidence?.extra).toEqual(['warp_drive_engaged']);
  });
});
