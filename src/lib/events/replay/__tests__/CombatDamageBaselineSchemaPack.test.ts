/**
 * Combat damage/heat/critical baseline schema pack contract
 * (replay-safety PR 7).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 7 (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix; `unit_destroyed`
 * accepts BOTH its public and fog-of-war REDACTED stored forms with
 * dedicated redacted mutation coverage; resolved damage inputs
 * (armor/structure remainders, crit outcomes, consumed d6 sequences,
 * explosion sources) survive validation byte-for-byte; unknown
 * discriminants fail closed; the pack's runtime module graph imports no
 * catalog, clock, or RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  REDACTED_UNIT_DESTROYED_PAYLOAD,
  VALID_COMBAT_DAMAGE_EVENT_PAYLOADS,
} from '../__fixtures__/CombatDamageBaselineSchemaPack.fixture';
import {
  COMBAT_DAMAGE_BASELINE_SCHEMA_PACK,
  COMBAT_DAMAGE_EVENT_TYPES,
} from '../CombatDamageBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-7 inventory row as runtime discriminant values. */
const INVENTORY_DAMAGE_DISCRIMINANTS = [
  'damage_applied',
  'heat_generated',
  'heat_dissipated',
  'heat_effect_applied',
  'pilot_hit',
  'unit_destroyed',
  'ammo_explosion',
  'critical_hit',
  'critical_hit_resolved',
  'location_destroyed',
  'transfer_damage',
  'component_destroyed',
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
  damage_applied: [
    (p) => delete p['armorRemaining'],
    (p) => (p['penetrated'] = true),
    (p) => (p['damage'] = 'twenty'),
  ],
  heat_generated: [
    (p) => delete p['newTotal'],
    (p) => (p['coolantFlush'] = true),
    (p) => (p['source'] = 'friction'),
  ],
  heat_dissipated: [
    (p) => delete (p['breakdown'] as MutablePayload)['baseDissipation'],
    (p) => ((p['breakdown'] as MutablePayload)['radiatorBonus'] = 2),
    (p) => (p['amount'] = 'minus-fourteen'),
  ],
  heat_effect_applied: [
    (p) => delete p['effect'],
    (p) => (p['durationTurns'] = 1),
    (p) => (p['effect'] = 'meltdown'),
  ],
  pilot_hit: [
    (p) => delete p['consciousnessCheckRequired'],
    (p) => (p['unexpected'] = true),
    (p) => (p['source'] = 'psychic_shock'),
  ],
  unit_destroyed: [
    (p) => delete p['unitId'],
    (p) => (p['salvageable'] = true),
    (p) => (p['cause'] = 'gm_fiat'),
  ],
  ammo_explosion: [
    (p) => delete p['source'],
    (p) => (p['containment'] = 'full'),
    (p) => (p['caseProtection'] = 'case_iii'),
  ],
  critical_hit: [
    (p) => delete p['location'],
    (p) => (p['severity'] = 'major'),
    (p) => (p['count'] = 'one'),
  ],
  critical_hit_resolved: [
    (p) => delete p['componentName'],
    (p) => (p['throughArmor'] = true),
    (p) => (p['destroyed'] = 'yes'),
  ],
  location_destroyed: [
    (p) => delete p['location'],
    (p) => (p['blownOff'] = true),
    (p) => (p['viaTransfer'] = 'cascade'),
  ],
  transfer_damage: [
    (p) => delete p['toLocation'],
    (p) => (p['transferChain'] = 2),
    (p) => (p['damage'] = 'six'),
  ],
  component_destroyed: [
    (p) => delete p['slotIndex'],
    (p) => (p['repairable'] = false),
    (p) => (p['slotIndex'] = 'four'),
  ],
};

describe('combat damage/heat/critical baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_DAMAGE_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-7 inventory row', () => {
    const packTypes = [...COMBAT_DAMAGE_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_DAMAGE_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_DAMAGE_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_DAMAGE_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_DAMAGE_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_DAMAGE_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it('accepts the fog-of-war REDACTED unit_destroyed stored form', () => {
    const result = registry.upcast(
      'unit_destroyed',
      1,
      REDACTED_UNIT_DESTROYED_PAYLOAD,
    );
    expect(result.payload).toEqual(REDACTED_UNIT_DESTROYED_PAYLOAD);
  });

  it('rejects redacted-form mutations (missing/extra/ill-typed)', () => {
    const redactedMutations: readonly ((p: MutablePayload) => void)[] = [
      (p) => delete p['unitId'],
      (p) => (p['cause'] = 'gm_fiat'),
      (p) => (p['unitId'] = 9),
    ];
    for (const mutate of redactedMutations) {
      const payload = clone(REDACTED_UNIT_DESTROYED_PAYLOAD);
      mutate(payload);
      let code: string | null = null;
      try {
        registry.upcast('unit_destroyed', 1, payload);
      } catch (error) {
        if (error instanceof UnsupportedReplayHistoryError) code = error.code;
        else throw error;
      }
      expect(code).toBe('invalid-payload');
    }
  });

  it.each(INVENTORY_DAMAGE_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_DAMAGE_EVENT_PAYLOADS[eventType]);
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
    expect(() => registry.upcast('unit_repaired', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'transfer_damage',
        2,
        VALID_COMBAT_DAMAGE_EVENT_PAYLOADS['transfer_damage'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved damage inputs as stored payload data', () => {
    const damage = registry.upcast(
      'damage_applied',
      1,
      VALID_COMBAT_DAMAGE_EVENT_PAYLOADS['damage_applied'],
    ).payload as Record<string, unknown>;
    expect(damage['armorRemaining']).toBe(4);
    expect(damage['structureRemaining']).toBe(16);

    const crit = registry.upcast(
      'critical_hit_resolved',
      1,
      VALID_COMBAT_DAMAGE_EVENT_PAYLOADS['critical_hit_resolved'],
    ).payload as Record<string, unknown>;
    expect(crit['rolls']).toEqual([5, 4, 3, 6]);
    expect(crit['slotIndex']).toBe(2);

    const dissipated = registry.upcast(
      'heat_dissipated',
      1,
      VALID_COMBAT_DAMAGE_EVENT_PAYLOADS['heat_dissipated'],
    ).payload as Record<string, unknown>;
    expect(
      (dissipated['breakdown'] as Record<string, unknown>)['waterBonus'],
    ).toBe(4);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatDamageBaselineSchemaPack.ts',
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
