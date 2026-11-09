/**
 * Combat physical/PSR/ground-object baseline schema pack contract
 * (replay-safety PR 8).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 8 (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix — several mutations
 * reach the nested cluster/displacement/domino shapes; resolved PSR and
 * physical inputs survive validation byte-for-byte; unknown
 * discriminants fail closed; the pack's runtime module graph imports no
 * catalog, clock, or RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS } from '../__fixtures__/CombatPhysicalBaselineSchemaPack.fixture';
import {
  COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK,
  COMBAT_PHYSICAL_EVENT_TYPES,
} from '../CombatPhysicalBaselineSchemaPack';
import {
  createReplayCheckpointMetadata,
  evaluateReplayCheckpointCompatibility,
} from '../ReplayCheckpointCompatibility';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/**
 * The task/PR-8 inventory row (as amended 2026-08-21 to add
 * `physical_attack_locked`) as runtime discriminant values.
 */
const INVENTORY_PHYSICAL_DISCRIMINANTS = [
  'psr_triggered',
  'psr_resolved',
  'unit_fell',
  'unit_stuck',
  'unit_stood',
  'physical_attack_declared',
  'physical_attack_locked',
  'physical_attack_resolved',
  'ground_object_picked_up',
  'ground_object_dropped',
] as const;

type MutablePayload = Record<string, unknown>;

const clone = (value: unknown): MutablePayload =>
  JSON.parse(JSON.stringify(value)) as MutablePayload;

/**
 * Per-variant mutation matrix: one missing required field, one extra
 * field, one ill-typed field.
 */
const MUTATIONS: Readonly<
  Record<string, readonly ((payload: MutablePayload) => void)[]>
> = {
  psr_triggered: [
    (p) => delete p['triggerSource'],
    (p) => (p['autoFail'] = true),
    (p) => (p['reasonCode'] = 'tripped_on_rock'),
  ],
  psr_resolved: [
    (p) => delete p['passed'],
    (p) => (p['margin'] = 1),
    (p) => (p['roll'] = 'five'),
  ],
  unit_fell: [
    (p) => delete p['newFacing'],
    (p) => (p['proneDirection'] = 'north'),
    (p) => (p['fallDamage'] = 'eight'),
  ],
  unit_stuck: [
    (p) => delete p['unitId'],
    (p) => (p['depth'] = 1),
    (p) => (p['reasonCode'] = 'quicksand'),
  ],
  unit_stood: [
    (p) => delete p['targetNumber'],
    (p) => (p['unexpected'] = true),
    (p) => (p['turn'] = 'three'),
  ],
  physical_attack_declared: [
    (p) => delete p['attackType'],
    (p) => {
      const decision = p['blockerStepOutDecision'] as MutablePayload;
      (decision['context'] as MutablePayload)['forcedDomino'] = true;
    },
    (p) => (p['limb'] = 'tail'),
  ],
  physical_attack_locked: [
    (p) => delete p['unitId'],
    (p) => (p['lockedBy'] = 'gm'),
    (p) => (p['unitId'] = 7),
  ],
  physical_attack_resolved: [
    (p) => {
      const clusters = p['clusters'] as MutablePayload[];
      delete clusters[0]['location'];
    },
    (p) => {
      const displacements = p['displacements'] as MutablePayload[];
      displacements[0]['distance'] = 1;
    },
    (p) => {
      const displacements = p['displacements'] as MutablePayload[];
      displacements[1]['reason'] = 'knockback';
    },
  ],
  ground_object_picked_up: [
    (p) => delete p['capacityTonnage'],
    (p) => (p['unexpected'] = true),
    (p) => (p['carryLocation'] = 'torso'),
  ],
  ground_object_dropped: [
    (p) => delete p['to'],
    (p) => (p['shattered'] = true),
    (p) => (p['reason'] = 'lost'),
  ],
};

describe('combat physical/PSR/ground-object baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-8 inventory row', () => {
    const packTypes = [...COMBAT_PHYSICAL_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_PHYSICAL_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_PHYSICAL_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_PHYSICAL_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS[eventType]);
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

  it('accepts the stored impossible-resolution form (null toHitNumber, roll 0, miss)', () => {
    const payload = {
      attackerId: 'atlas-as7-d',
      targetId: 'locust-lct-1v',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: null,
      hit: false,
    };
    const upcast = registry.upcast('physical_attack_resolved', 1, payload);
    expect(upcast.payload).toEqual(payload);
  });

  it('rejects a corrupt impossible resolution that claims a hit', () => {
    let code: string | null = null;
    try {
      registry.upcast('physical_attack_resolved', 1, {
        attackerId: 'atlas-as7-d',
        targetId: 'locust-lct-1v',
        attackType: 'dfa',
        roll: 7,
        toHitNumber: null,
        hit: true,
      });
    } catch (error) {
      if (error instanceof UnsupportedReplayHistoryError) code = error.code;
      else throw error;
    }
    expect(code).toBe('invalid-payload');
  });

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('unit_tackled', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'unit_stuck',
        2,
        VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['unit_stuck'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved PSR and physical inputs as stored payload data', () => {
    const psr = registry.upcast(
      'psr_resolved',
      1,
      VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['psr_resolved'],
    ).payload as Record<string, unknown>;
    expect(psr['rolls']).toEqual([2, 3]);
    expect(psr['reasonCode']).toBe('20+_damage');

    const dfa = registry.upcast(
      'physical_attack_resolved',
      1,
      VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['physical_attack_resolved'],
    ).payload as Record<string, unknown>;
    expect((dfa['clusters'] as unknown[]).length).toBe(5);
    expect((dfa['displacements'] as unknown[]).length).toBe(2);
    expect((dfa['rolls'] as unknown[]).length).toBe(12);
  });

  describe('swamp-unstuck widening at baseline v1 (C6b)', () => {
    // The four variants whose payload carries a PSR reason code. Adding
    // `swamp_unstuck` to that enum widens all four schemas in place.
    const REVISED_TYPES = [
      'psr_triggered',
      'psr_resolved',
      'unit_fell',
      'unit_stuck',
    ] as const;

    const upcastCode = (eventType: string, payload: unknown): string | null => {
      try {
        registry.upcast(eventType, 1, payload);
      } catch (error) {
        if (error instanceof UnsupportedReplayHistoryError) return error.code;
        throw error;
      }
      return null;
    };

    it('accepts a UnitStuck that grants jump eligibility', () => {
      const payload = {
        ...clone(VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['unit_stuck']),
        canUnstickByJumping: true,
      };
      expect(registry.upcast('unit_stuck', 1, payload).payload).toEqual(
        payload,
      );
    });

    it('keeps a legacy UnitStuck byte-identical with no eligibility key', () => {
      const legacy = VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['unit_stuck'];
      const upcast = registry.upcast('unit_stuck', 1, legacy).payload;
      expect(upcast).toEqual(legacy);
      expect(upcast).not.toHaveProperty('canUnstickByJumping');
    });

    it.each(['yes', 1, null])(
      'rejects a UnitStuck eligibility of %p',
      (value) => {
        expect(
          upcastCode('unit_stuck', {
            ...clone(VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS['unit_stuck']),
            canUnstickByJumping: value,
          }),
        ).toBe('invalid-payload');
      },
    );

    it.each(REVISED_TYPES)(
      '%s accepts the swamp_unstuck reason code',
      (type) => {
        const payload = {
          ...clone(VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS[type]),
          reasonCode: 'swamp_unstuck',
        };
        expect(registry.upcast(type, 1, payload).payload).toEqual(payload);
      },
    );

    it('revises the schema id of exactly the four PSR-coded variants', () => {
      const ids = Object.fromEntries(
        COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK.map((registration) => [
          registration.eventType,
          registration.schemas.map((schema) => schema.schemaId),
        ]),
      );
      for (const eventType of INVENTORY_PHYSICAL_DISCRIMINANTS) {
        expect(ids[eventType]).toEqual([
          (REVISED_TYPES as readonly string[]).includes(eventType)
            ? `combat.${eventType}.v1.swamp-unstuck-1`
            : `combat.${eventType}.v1`,
        ]);
      }
    });

    it('makes a checkpoint fingerprinted before the widening incompatible, and only for histories holding a revised variant', () => {
      // The registrations as they stood before C6b: every id was
      // combat.<type>.v1.
      const before = new ReplaySchemaRegistry({
        events: COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK.map((registration) => ({
          ...registration,
          schemas: registration.schemas.map((schema) => ({
            ...schema,
            schemaId: `combat.${registration.eventType}.v1`,
          })),
        })),
      });
      const history = (types: readonly string[]) =>
        types.map((eventType) => ({ eventType, schemaVersion: 1 }));
      const checkpointFor = (fingerprint: string) =>
        createReplayCheckpointMetadata({
          streamId: 'match-1',
          branchId: 'root',
          revision: 12,
          schemaPipelineFingerprint: fingerprint,
          projectorId: 'combat.reducer',
          projectorVersion: 1,
          sourceTailDigest: 'tail',
          stateDigest: 'state',
        });
      const expectationFor = (fingerprint: string) => ({
        streamId: 'match-1',
        branchId: 'root',
        schemaPipelineFingerprint: fingerprint,
        projectorId: 'combat.reducer',
        projectorVersion: 1,
      });

      for (const eventType of REVISED_TYPES) {
        const oldFingerprint = before.fingerprintPipeline(history([eventType]));
        const newFingerprint = registry.fingerprintPipeline(
          history([eventType]),
        );
        expect(newFingerprint).not.toBe(oldFingerprint);
        expect(
          evaluateReplayCheckpointCompatibility(
            checkpointFor(oldFingerprint),
            expectationFor(newFingerprint),
          ),
        ).toEqual({
          compatible: false,
          mismatches: ['schemaPipelineFingerprint'],
        });
      }

      const untouched = INVENTORY_PHYSICAL_DISCRIMINANTS.filter(
        (eventType) =>
          !(REVISED_TYPES as readonly string[]).includes(eventType),
      );
      const untouchedFingerprint = registry.fingerprintPipeline(
        history(untouched),
      );
      expect(untouchedFingerprint).toBe(
        before.fingerprintPipeline(history(untouched)),
      );
      expect(
        evaluateReplayCheckpointCompatibility(
          checkpointFor(untouchedFingerprint),
          expectationFor(untouchedFingerprint),
        ),
      ).toEqual({ compatible: true, digestsVerified: false });
    });
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatPhysicalBaselineSchemaPack.ts',
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
