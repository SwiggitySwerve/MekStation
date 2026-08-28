/**
 * Combat ranged/indirect baseline schema pack contract (replay-safety
 * PR 6).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 6 (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix; `attack_resolved`
 * accepts BOTH its public and fog-of-war REDACTED stored forms and the
 * redacted form has its own mutation coverage; resolved to-hit rolls,
 * hit locations, cluster results, ammunition references, and
 * indirect-fire decisions survive validation byte-for-byte (task 6.3);
 * unknown discriminants fail closed; the pack's runtime module graph
 * imports no catalog, clock, or RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  REDACTED_ATTACK_RESOLVED_PAYLOAD,
  VALID_COMBAT_RANGED_EVENT_PAYLOADS,
} from '../__fixtures__/CombatRangedBaselineSchemaPack.fixture';
import {
  COMBAT_RANGED_BASELINE_SCHEMA_PACK,
  COMBAT_RANGED_EVENT_TYPES,
} from '../CombatRangedBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-6 inventory row as runtime discriminant values. */
const INVENTORY_RANGED_DISCRIMINANTS = [
  'attack_declared',
  'attack_invalid',
  'attack_locked',
  'attacks_revealed',
  'attack_resolved',
  'spotting_declared',
  'indirect_fire_spotter_selected',
  'indirect_fire_spotter_lost',
  'indirect_fire_forward_observer',
  'indirect_fire_narc_override',
  'ammo_consumed',
  'ams_interception',
  'designator_marker_applied',
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
  attack_declared: [
    (p) => delete p['toHitNumber'],
    (p) => (p['calledShot'] = 'head'),
    (p) => {
      const modifiers = p['modifiers'] as MutablePayload[];
      modifiers[0]['value'] = 'four';
    },
  ],
  attack_invalid: [
    (p) => delete p['reason'],
    (p) => (p['retryable'] = true),
    (p) => (p['reason'] = 'GunneryTooLow'),
  ],
  attack_locked: [
    (p) => delete p['unitId'],
    (p) => (p['lockedBy'] = 'host'),
    (p) => (p['unitId'] = 7),
  ],
  attacks_revealed: [
    (p) => delete p['attackCount'],
    (p) => (p['revealedBy'] = 'host'),
    (p) => (p['unitIds'] = 'all'),
  ],
  attack_resolved: [
    // Neither the public nor the redacted form allows a missing targetId.
    (p) => delete p['targetId'],
    // An extra field breaks BOTH strict union arms.
    (p) => (p['critical'] = true),
    (p) => (p['roll'] = 'nine'),
  ],
  spotting_declared: [
    (p) => delete p['targetId'],
    (p) => (p['losQuality'] = 'clear'),
    (p) => (p['turn'] = 'two'),
  ],
  indirect_fire_spotter_selected: [
    (p) => delete p['spotterId'],
    (p) => (p['spotterGunnery'] = 4),
    (p) => (p['basis'] = 'narc'),
  ],
  indirect_fire_spotter_lost: [
    (p) => delete p['reason'],
    (p) => (p['unexpected'] = true),
    (p) => (p['toHitPenalty'] = 'one'),
  ],
  indirect_fire_forward_observer: [
    (p) => delete p['penaltyCancelled'],
    (p) => (p['spotterSkillModifier'] = 0),
    (p) => (p['penaltyCancelled'] = 'one'),
  ],
  indirect_fire_narc_override: [
    (p) => delete p['basis'],
    (p) => (p['beaconTurn'] = 1),
    (p) => (p['spotterId'] = 'player-2-locust-lct-1v'),
  ],
  ammo_consumed: [
    (p) => delete p['roundsRemaining'],
    (p) => (p['jammed'] = false),
    (p) => (p['roundsConsumed'] = 'one'),
  ],
  ams_interception: [
    (p) => delete p['resolution'],
    (p) => (p['unexpected'] = true),
    (p) => (p['resolution'] = 'laser-grid'),
  ],
  designator_marker_applied: [
    (p) => delete p['marker'],
    (p) => (p['duration'] = 3),
    (p) => (p['podType'] = 'thunder'),
  ],
};

describe('combat ranged/indirect baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_RANGED_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-6 inventory row', () => {
    const packTypes = [...COMBAT_RANGED_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_RANGED_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_RANGED_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_RANGED_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_RANGED_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_RANGED_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it('accepts the fog-of-war REDACTED attack_resolved stored form', () => {
    const result = registry.upcast(
      'attack_resolved',
      1,
      REDACTED_ATTACK_RESOLVED_PAYLOAD,
    );
    expect(result.payload).toEqual(REDACTED_ATTACK_RESOLVED_PAYLOAD);
  });

  it('rejects redacted-form mutations (missing/extra/ill-typed)', () => {
    const redactedMutations: readonly ((p: MutablePayload) => void)[] = [
      (p) => delete p['roll'],
      (p) => (p['weaponId'] = 'weapon-ac20-1'),
      (p) => (p['hit'] = 'yes'),
    ];
    for (const mutate of redactedMutations) {
      const payload = clone(REDACTED_ATTACK_RESOLVED_PAYLOAD);
      mutate(payload);
      let code: string | null = null;
      try {
        registry.upcast('attack_resolved', 1, payload);
      } catch (error) {
        if (error instanceof UnsupportedReplayHistoryError) code = error.code;
        else throw error;
      }
      expect(code).toBe('invalid-payload');
    }
  });

  it.each(INVENTORY_RANGED_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_RANGED_EVENT_PAYLOADS[eventType]);
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

  it('accepts the stored projection-enriched weaponAttacks form', () => {
    const payload = {
      attackerId: 'atlas-as7-d',
      targetId: 'locust-lct-1v',
      weapons: ['weapon-1'],
      toHitNumber: 8,
      modifiers: [],
      weaponAttacks: [
        {
          weaponId: 'weapon-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          mode: 'Direct',
          rangeBracket: 'medium',
          toHitNumber: null,
          modifiers: [],
        },
      ],
    };
    const upcast = registry.upcast('attack_declared', 1, payload);
    expect(upcast.payload).toEqual(payload);
  });

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('attack_cancelled', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'ammo_consumed',
        2,
        VALID_COMBAT_RANGED_EVENT_PAYLOADS['ammo_consumed'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved combat inputs as stored payload data (task 6.3)', () => {
    const resolved = registry.upcast(
      'attack_resolved',
      1,
      VALID_COMBAT_RANGED_EVENT_PAYLOADS['attack_resolved'],
    ).payload as Record<string, unknown>;
    expect(resolved['rolls']).toEqual([4, 5, 3, 4]);
    expect(resolved['location']).toBe('CT');
    expect(resolved['ammoBinId']).toBe('bin-ac20-1');
    expect(resolved['edgeSupersededRoll']).toBe(12);

    const ams = registry.upcast(
      'ams_interception',
      1,
      VALID_COMBAT_RANGED_EVENT_PAYLOADS['ams_interception'],
    ).payload as Record<string, unknown>;
    expect(ams['clusterRoll']).toBe(7);
    expect(ams['modifiedClusterRoll']).toBe(3);
    expect(ams['roll']).toEqual([3, 4]);

    const indirect = registry.upcast(
      'indirect_fire_spotter_selected',
      1,
      VALID_COMBAT_RANGED_EVENT_PAYLOADS['indirect_fire_spotter_selected'],
    ).payload as Record<string, unknown>;
    expect(indirect['basis']).toBe('los');
    expect(indirect['toHitPenalty']).toBe(1);
    expect(indirect['spotterAttackedThisTurn']).toBe(true);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatRangedBaselineSchemaPack.ts',
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
