/**
 * Combat terrain/mission/morale/withdrawal baseline schema pack contract
 * (replay-safety PR 9B).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 9B (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix — the command-result
 * mutations reach the projected envelope, and the JSON-value grammar's
 * bound is proven (a function inside `publicEffect` is rejected);
 * unknown discriminants fail closed; the pack's runtime module graph
 * imports no catalog, clock, or RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { VALID_COMBAT_MISSION_EVENT_PAYLOADS } from '../__fixtures__/CombatMissionBaselineSchemaPack.fixture';
import {
  COMBAT_MISSION_BASELINE_SCHEMA_PACK,
  COMBAT_MISSION_EVENT_TYPES,
} from '../CombatMissionBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-9B inventory row as runtime discriminant values. */
const INVENTORY_MISSION_DISCRIMINANTS = [
  'command_result_published',
  'terrain_changed',
  'minefield_changed',
  'emp_minefield_effect_applied',
  'retreat_triggered',
  'unit_retreated',
  'unit_ejected',
  'objective_captured',
  'objective_lost',
  'objective_progress',
  'morale_shifted',
  'withdrawal_declared',
  'forced_withdrawal_triggered',
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
  command_result_published: [
    (p) => delete (p['result'] as MutablePayload)['diagnosticEvent'],
    (p) => ((p['result'] as MutablePayload)['privateEffect'] = { gm: true }),
    (p) => ((p['result'] as MutablePayload)['status'] = 'maybe'),
  ],
  terrain_changed: [
    (p) => delete p['terrain'],
    (p) => (p['burning'] = true),
    (p) => (p['reason'] = 'earthquake'),
  ],
  minefield_changed: [
    (p) => delete p['operation'],
    (p) => (p['sweepRadius'] = 2),
    (p) => (p['operation'] = 'disarm'),
  ],
  emp_minefield_effect_applied: [
    (p) => delete p['modifiedRoll'],
    (p) => (p['unexpected'] = true),
    (p) => (p['effect'] = 'meltdown'),
  ],
  retreat_triggered: [
    (p) => delete p['edge'],
    (p) => (p['panicked'] = true),
    (p) => (p['reason'] = 'low_ammo'),
  ],
  unit_retreated: [
    (p) => delete p['retreatEdge'],
    (p) => (p['salvageLeft'] = false),
    (p) => (p['turn'] = 'six'),
  ],
  unit_ejected: [
    (p) => delete p['reason'],
    (p) => (p['chuteFailed'] = false),
    (p) => (p['reason'] = 'panic'),
  ],
  objective_captured: [
    (p) => delete p['capturingSide'],
    (p) => (p['points'] = 5),
    (p) => (p['capturingSide'] = 'mercenary'),
  ],
  objective_lost: [
    (p) => delete p['losingSide'],
    (p) => (p['contested'] = true),
    (p) => (p['turn'] = 'five'),
  ],
  objective_progress: [
    (p) => delete p['holdProgress'],
    (p) => (p['unexpected'] = true),
    (p) => (p['holdTurnsRequired'] = 'two'),
  ],
  morale_shifted: [
    (p) => delete p['cause'],
    (p) => (p['magnitude'] = 1),
    (p) => (p['to'] = 'PANICKED'),
  ],
  withdrawal_declared: [
    (p) => delete p['declaredBy'],
    (p) => (p['unexpected'] = true),
    (p) => (p['declaredBy'] = 'gm'),
  ],
  forced_withdrawal_triggered: [
    (p) => delete p['reason'],
    (p) => (p['overridden'] = false),
    (p) => (p['reason'] = 'out_of_ammo'),
  ],
};

describe('combat terrain/mission/morale/withdrawal baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_MISSION_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-9B inventory row', () => {
    const packTypes = [...COMBAT_MISSION_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_MISSION_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_MISSION_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_MISSION_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_MISSION_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_MISSION_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_MISSION_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_MISSION_EVENT_PAYLOADS[eventType]);
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

  it('bounds publicEffect to the closed JSON grammar (no non-JSON values)', () => {
    const payload = clone(
      VALID_COMBAT_MISSION_EVENT_PAYLOADS['command_result_published'],
    );
    ((payload['result'] as MutablePayload)['publicEffect'] as MutablePayload)[
      'callback'
    ] = () => 42;
    let code: string | null = null;
    try {
      registry.upcast('command_result_published', 1, payload);
    } catch (error) {
      if (error instanceof UnsupportedReplayHistoryError) code = error.code;
      else throw error;
    }
    expect(code).toBe('invalid-payload');
  });

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('objective_abandoned', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'morale_shifted',
        2,
        VALID_COMBAT_MISSION_EVENT_PAYLOADS['morale_shifted'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatMissionBaselineSchemaPack.ts',
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
