/**
 * Combat vehicle/represented-system-state baseline schema pack contract
 * (replay-safety PR 9A).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 9A (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix; resolved system-state
 * inputs survive validation byte-for-byte; unknown discriminants fail
 * closed; the pack's runtime module graph imports no catalog, clock, or
 * RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { VALID_COMBAT_VEHICLE_EVENT_PAYLOADS } from '../__fixtures__/CombatVehicleBaselineSchemaPack.fixture';
import {
  COMBAT_VEHICLE_BASELINE_SCHEMA_PACK,
  COMBAT_VEHICLE_EVENT_TYPES,
} from '../CombatVehicleBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-9A inventory row as runtime discriminant values. */
const INVENTORY_VEHICLE_DISCRIMINANTS = [
  'shutdown_check',
  'startup_attempt',
  'neural_interface_state_changed',
  'motive_damaged',
  'motive_penalty_applied',
  'vehicle_immobilized',
  'turret_locked',
  'vehicle_crew_stunned',
  'vtol_crash_check',
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
  shutdown_check: [
    (p) => delete p['shutdownOccurred'],
    (p) => (p['coolantFlush'] = true),
    (p) => (p['roll'] = 'eight'),
  ],
  startup_attempt: [
    (p) => delete p['success'],
    (p) => (p['retriesRemaining'] = 1),
    (p) => (p['targetNumber'] = 'four'),
  ],
  neural_interface_state_changed: [
    (p) => delete p['reason'],
    (p) => (p['painFeedback'] = true),
    (p) => (p['reason'] = 'ecm_burst'),
  ],
  motive_damaged: [
    (p) => delete p['severity'],
    (p) => (p['trackThrown'] = true),
    (p) => (p['severity'] = 'catastrophic'),
  ],
  motive_penalty_applied: [
    (p) => delete p['newFlankMP'],
    (p) => (p['newJumpMP'] = 0),
    (p) => (p['newCruiseMP'] = 'three'),
  ],
  vehicle_immobilized: [
    (p) => delete p['cause'],
    (p) => (p['recoverable'] = false),
    (p) => (p['cause'] = 'stuck_in_mud'),
  ],
  turret_locked: [
    (p) => delete p['secondary'],
    (p) => (p['arc'] = 'front'),
    (p) => (p['secondary'] = 'no'),
  ],
  vehicle_crew_stunned: [
    (p) => delete p['phasesStunned'],
    (p) => (p['unexpected'] = true),
    (p) => (p['phasesStunned'] = 'two'),
  ],
  vtol_crash_check: [
    (p) => delete p['altitude'],
    (p) => (p['crashed'] = true),
    (p) => (p['fallDamage'] = 'thirty'),
  ],
};

describe('combat vehicle/system-state baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_VEHICLE_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-9A inventory row', () => {
    const packTypes = [...COMBAT_VEHICLE_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_VEHICLE_DISCRIMINANTS].sort());
    expect(
      [...COMBAT_VEHICLE_BASELINE_SCHEMA_PACK.map((e) => e.eventType)].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_VEHICLE_BASELINE_SCHEMA_PACK)).toBe(true);
  });

  it.each(INVENTORY_VEHICLE_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_VEHICLE_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_VEHICLE_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(VALID_COMBAT_VEHICLE_EVENT_PAYLOADS[eventType]);
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

  it('accepts the stored auto-shutdown form (targetNumber null)', () => {
    const payload = {
      unitId: 'atlas-as7-d',
      heatLevel: 35,
      targetNumber: null,
      roll: 0,
      shutdownOccurred: true,
    };
    const upcast = registry.upcast('shutdown_check', 1, payload);
    expect(upcast.payload).toEqual(payload);
  });

  it('fails closed on unknown discriminants and unknown versions', () => {
    expect(() => registry.upcast('vehicle_repaired', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'turret_locked',
        2,
        VALID_COMBAT_VEHICLE_EVENT_PAYLOADS['turret_locked'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved system-state inputs as stored payload data', () => {
    const shutdown = registry.upcast(
      'shutdown_check',
      1,
      VALID_COMBAT_VEHICLE_EVENT_PAYLOADS['shutdown_check'],
    ).payload as Record<string, unknown>;
    expect(shutdown['rolls']).toEqual([4, 4]);
    expect(shutdown['targetNumber']).toBe(6);

    const motive = registry.upcast(
      'motive_damaged',
      1,
      VALID_COMBAT_VEHICLE_EVENT_PAYLOADS['motive_damaged'],
    ).payload as Record<string, unknown>;
    expect(motive['severity']).toBe('moderate');
    expect(motive['rolls']).toEqual([5, 5]);

    const crash = registry.upcast(
      'vtol_crash_check',
      1,
      VALID_COMBAT_VEHICLE_EVENT_PAYLOADS['vtol_crash_check'],
    ).payload as Record<string, unknown>;
    expect(crash['fallDamage']).toBe(30);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatVehicleBaselineSchemaPack.ts',
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
