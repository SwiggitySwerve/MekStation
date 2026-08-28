/**
 * Deterministic replay input provenance contract (replay-safety PR 12).
 *
 * Pins: the manifest covers EXACTLY the canonical 88 discriminants;
 * every valid fixture passes the provenance check unchanged; EVERY
 * manifest-listed field is proven schema-required by a delete-mutant
 * (the strict schema rejects, so a listed-but-optional field cannot
 * exist) AND its absence fails the checker with the typed
 * `missing-required-input` code naming the field - never a repair from
 * current services; and the full 88-fixture sweep replays twice with
 * byte-identical results.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { VALID_REPLAY_BASELINE_EVENT_PAYLOADS } from '../__fixtures__/ReplayBaselineDomainRegistry.fixture';
import {
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
  createReplayBaselineDomainRegistry,
} from '../ReplayBaselineDomainRegistry';
import {
  REPLAY_INPUT_PROVENANCE_MANIFEST,
  assertReplayInputProvenance,
  requiredReplayInputFields,
} from '../ReplayInputProvenanceManifest';
import { UnsupportedReplayHistoryError } from '../ReplaySchemaRegistry';

const clone = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

describe('replay input provenance manifest', () => {
  const registry = createReplayBaselineDomainRegistry();

  it('declares provenance for exactly the canonical discriminant set', () => {
    expect(Object.keys(REPLAY_INPUT_PROVENANCE_MANIFEST).sort()).toEqual(
      [...REPLAY_BASELINE_CANONICAL_EVENT_TYPES].sort(),
    );
  });

  it.each([...REPLAY_BASELINE_CANONICAL_EVENT_TYPES])(
    '%s: valid fixture passes the provenance check without mutation',
    (eventType) => {
      const fixture = VALID_REPLAY_BASELINE_EVENT_PAYLOADS[eventType];
      const before = JSON.stringify(fixture);
      expect(() =>
        assertReplayInputProvenance(eventType, fixture),
      ).not.toThrow();
      expect(JSON.stringify(fixture)).toBe(before);
    },
  );

  it('every listed field is schema-required and its absence fails typed', () => {
    const failures: string[] = [];
    for (const eventType of REPLAY_BASELINE_CANONICAL_EVENT_TYPES) {
      for (const field of requiredReplayInputFields(eventType)) {
        const mutated = clone(VALID_REPLAY_BASELINE_EVENT_PAYLOADS[eventType]);
        delete mutated[field];

        let schemaCode: string | null = null;
        try {
          registry.upcast(eventType, 1, mutated);
        } catch (error) {
          if (error instanceof UnsupportedReplayHistoryError)
            schemaCode = error.code;
          else throw error;
        }
        if (schemaCode !== 'invalid-payload')
          failures.push(
            `${eventType}.${field}: schema did not reject (listed field must be required)`,
          );

        let provenanceCode: string | null = null;
        let message = '';
        try {
          assertReplayInputProvenance(eventType, mutated);
        } catch (error) {
          if (error instanceof UnsupportedReplayHistoryError) {
            provenanceCode = error.code;
            message = error.message;
          } else throw error;
        }
        if (provenanceCode !== 'missing-required-input')
          failures.push(`${eventType}.${field}: checker did not fail typed`);
        else if (!message.includes(field))
          failures.push(`${eventType}.${field}: evidence does not name field`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('fails typed on a non-object payload when inputs are required', () => {
    let code: string | null = null;
    try {
      assertReplayInputProvenance('psr_resolved', null);
    } catch (error) {
      if (error instanceof UnsupportedReplayHistoryError) code = error.code;
      else throw error;
    }
    expect(code).toBe('missing-required-input');
  });

  it('replays every fixture twice with byte-identical results', () => {
    for (const eventType of REPLAY_BASELINE_CANONICAL_EVENT_TYPES) {
      const fixture = VALID_REPLAY_BASELINE_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);
      expect(JSON.stringify(second.payload)).toBe(
        JSON.stringify(first.payload),
      );
      expect(first.payload).toEqual(fixture);
    }
  });
});
