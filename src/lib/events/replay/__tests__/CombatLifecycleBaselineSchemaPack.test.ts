/**
 * Combat lifecycle baseline schema pack contract (replay-safety PR 4).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 4 (as runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * and a missing/extra/ill-typed mutation matrix — several mutations
 * target the deep `game_created` nested surface (unit init blocks,
 * terrain, C3, minefields) on purpose; unknown discriminants fail
 * closed; and validation is pure data — the pack's module graph imports
 * no catalog, clock, or RNG surface (task 4.3).
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from '../__fixtures__/CombatLifecycleBaselineSchemaPack.fixture';
import {
  COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK,
  COMBAT_LIFECYCLE_EVENT_TYPES,
} from '../CombatLifecycleBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/**
 * The frozen task/PR-4 inventory row (schema-pack-inventory.md), expressed
 * as the runtime discriminant values events actually carry.
 */
const INVENTORY_LIFECYCLE_DISCRIMINANTS = [
  'game_created',
  'game_started',
  'game_ended',
  'turn_started',
  'turn_ended',
  'phase_changed',
  'initiative_rolled',
  'initiative_order_set',
] as const;

type MutablePayload = Record<string, unknown>;

const clone = (value: unknown): MutablePayload =>
  JSON.parse(JSON.stringify(value)) as MutablePayload;

/**
 * Per-variant mutation matrix: one missing required field, one extra
 * field, one ill-typed field — the game_created mutations reach into the
 * nested unit/terrain/minefield shapes deliberately.
 */
const MUTATIONS: Readonly<
  Record<string, readonly ((payload: MutablePayload) => void)[]>
> = {
  game_created: [
    (p) => {
      const units = p['units'] as MutablePayload[];
      delete (units[3]['infantryInit'] as MutablePayload)['platoonStrength'];
    },
    (p) => {
      const units = p['units'] as MutablePayload[];
      const armor = (units[1]['vehicleInit'] as MutablePayload)[
        'armor'
      ] as MutablePayload;
      armor['Sponson Bay'] = 10;
    },
    (p) => {
      const minefields = p['minefields'] as MutablePayload;
      (minefields['4,4'] as MutablePayload)['damagePerLeg'] = 'six';
    },
  ],
  game_started: [
    (p) => delete p['firstSide'],
    (p) => (p['unexpected'] = true),
    (p) => (p['firstSide'] = 'observer'),
  ],
  game_ended: [
    (p) => delete p['winner'],
    (p) => (p['mvp'] = 'player-1'),
    (p) => (p['reason'] = 'rage_quit'),
  ],
  turn_started: [
    (p) => (p['turn'] = 3),
    (p) => (p['_type'] = 'turn_ended'),
    (p) => (p['_type'] = 7),
  ],
  turn_ended: [
    (p) => (p['turn'] = 3),
    (p) => (p['_type'] = 'turn_started'),
    (p) => (p['_type'] = false),
  ],
  phase_changed: [
    (p) => delete p['toPhase'],
    (p) => (p['unexpected'] = true),
    (p) => (p['fromPhase'] = 'deployment'),
  ],
  initiative_rolled: [
    (p) => delete p['movesFirst'],
    (p) => (p['rerolled'] = true),
    (p) => (p['rolls'] = ['2', '2']),
  ],
  initiative_order_set: [
    (p) => delete p['secondMover'],
    (p) => (p['thirdMover'] = 'player'),
    (p) => (p['winner'] = 3),
  ],
};

describe('combat lifecycle baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-4 inventory row', () => {
    const packTypes = [...COMBAT_LIFECYCLE_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_LIFECYCLE_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_LIFECYCLE_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_LIFECYCLE_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS[eventType]);
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
    expect(() => registry.upcast('game_paused', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'game_started',
        2,
        VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS['game_started'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved initiative inputs as stored payload data', () => {
    // The audit trail (raw 2d6 values, modifiers, totals, Tactical Genius
    // fields, consumed rolls) survives validation byte-for-byte — nothing
    // is recomputed or looked up (task 4.3).
    const fixture = VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS[
      'initiative_rolled'
    ] as Record<string, unknown>;
    const result = registry.upcast('initiative_rolled', 1, fixture)
      .payload as Record<string, unknown>;
    expect(result['rolls']).toEqual([2, 2, 4, 2, 5, 4]);
    expect(result['playerOriginalRoll']).toBe(4);
    expect(result['playerTotal']).toBe(11);
    expect(result['tacticalGeniusRerollSide']).toBe('player');
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    // Task 4.3: the pack's runtime module graph must not reach services,
    // catalogs, stores, or RNG. Runtime imports are allowed only from zod,
    // pure `@/types/...` modules, and replay-local relative modules;
    // `import type` lines are erased at runtime and exempt.
    const repoRoot = process.cwd();
    const sources = [
      'src/lib/events/replay/CombatLifecycleBaselineSchemaPack.ts',
      'src/lib/events/replay/CombatLifecycleSharedSchemas.ts',
    ];
    for (const source of sources) {
      const text = fs.readFileSync(path.join(repoRoot, source), 'utf8');
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
    }
  });
});
