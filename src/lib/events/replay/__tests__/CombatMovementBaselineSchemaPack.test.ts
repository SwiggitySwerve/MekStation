/**
 * Combat movement baseline schema pack contract (replay-safety PR 5).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 5 (runtime `GameEventType`
 * values; ranged `AttackLocked` stays with task 6); every variant has a
 * valid fixture that parses at baseline v1 plus a missing/extra/ill-typed
 * mutation matrix — several mutations target the `IMovementStep`
 * discriminated union; a dedicated LEGACY `movement_declared` fixture
 * (no enrichment fields) parses unchanged, proving legacy compatibility
 * is explicit in the baseline rather than reconstructed (task 5.3);
 * unknown discriminants fail closed; and validation is pure data — the
 * pack's runtime module graph imports no catalog, clock, or RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  LEGACY_MOVEMENT_DECLARED_PAYLOAD,
  VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS,
} from '../__fixtures__/CombatMovementBaselineSchemaPack.fixture';
import {
  COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK,
  COMBAT_MOVEMENT_EVENT_TYPES,
} from '../CombatMovementBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-5 inventory row as runtime discriminant values. */
const INVENTORY_MOVEMENT_DISCRIMINANTS = [
  'movement_declared',
  'movement_invalid',
  'movement_locked',
  'runtime_movement_state_changed',
  'movement_enhancement_activated',
  'facing_changed',
] as const;

type MutablePayload = Record<string, unknown>;

const clone = (value: unknown): MutablePayload =>
  JSON.parse(JSON.stringify(value)) as MutablePayload;

/**
 * Per-variant mutation matrix: one missing required field, one extra
 * field, one ill-typed field — the movement_declared mutations reach
 * into the step chain deliberately.
 */
const MUTATIONS: Readonly<
  Record<string, readonly ((payload: MutablePayload) => void)[]>
> = {
  movement_declared: [
    (p) => {
      const steps = p['steps'] as MutablePayload[];
      delete steps[1]['terrainEntered'];
    },
    (p) => {
      const steps = p['steps'] as MutablePayload[];
      steps[2]['skidding'] = true;
    },
    (p) => {
      const steps = p['steps'] as MutablePayload[];
      steps[5]['kind'] = 'ramDeclared';
    },
  ],
  movement_invalid: [
    (p) => delete p['reason'],
    (p) => (p['retryable'] = true),
    (p) => (p['reason'] = 'OutOfFuel'),
  ],
  movement_locked: [
    (p) => delete p['unitId'],
    (p) => (p['lockedBy'] = 'host'),
    (p) => (p['unitId'] = 42),
  ],
  runtime_movement_state_changed: [
    (p) => delete p['source'],
    (p) => (p['unexpected'] = true),
    (p) => (p['source'] = 'gm_override'),
  ],
  movement_enhancement_activated: [
    (p) => delete p['enhancement'],
    (p) => (p['turnsActive'] = 1),
    (p) => (p['enhancement'] = 'TSM'),
  ],
  facing_changed: [
    (p) => delete p['unitId'],
    (p) => (p['spin'] = true),
    (p) => (p['torsoTwist'] = 'around'),
  ],
};

describe('combat movement baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-5 inventory row', () => {
    const packTypes = [...COMBAT_MOVEMENT_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_MOVEMENT_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK)).toBe(true);
    // Ranged AttackLocked ownership stays with task 6 (inventory row).
    expect(packTypes).not.toContain('attack_locked');
  });

  it.each(INVENTORY_MOVEMENT_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it('accepts a pre-enrichment legacy movement_declared payload unchanged', () => {
    // Task 5.3: legacy compatibility is explicit — every enrichment field
    // is optional in the baseline schema itself, so a payload with none
    // of them parses without any reconstruction from current rules.
    const result = registry.upcast(
      'movement_declared',
      1,
      LEGACY_MOVEMENT_DECLARED_PAYLOAD,
    );
    expect(result.payload).toEqual(LEGACY_MOVEMENT_DECLARED_PAYLOAD);
  });

  it.each(INVENTORY_MOVEMENT_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS[eventType]);
        mutate(payload);
        let code: string | null = null;
        try {
          registry.upcast(eventType, 1, payload);
        } catch (error) {
          if (error instanceof UnsupportedReplayHistoryError) code = error.code;
          else throw error;
        }
        expect(code).toBe('invalid-payload');
      }
    },
  );

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('movement_undone', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'movement_locked',
        2,
        VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS['movement_locked'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatMovementBaselineSchemaPack.ts',
      ),
      'utf8',
    );
    const imports = Array.from(
      text.matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/gm),
    );
    expect(imports.length).toBeGreaterThan(0);
    for (const match of imports) {
      const isTypeOnly = Boolean(match[1]);
      const specifier = match[2];
      if (isTypeOnly) continue;
      expect(
        specifier === 'zod' ||
          specifier.startsWith('@/types/') ||
          specifier.startsWith('./'),
      ).toBe(true);
    }
  });
});
