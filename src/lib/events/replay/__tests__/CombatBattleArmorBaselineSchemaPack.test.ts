/**
 * Combat battle-armor baseline schema pack contract (replay-safety
 * PR 10).
 *
 * Pins: the pack's discriminants exactly equal the frozen
 * schema-pack-inventory row for task/PR 10 (runtime `GameEventType`
 * values); every variant has a valid fixture that parses at baseline v1
 * plus a missing/extra/ill-typed mutation matrix; resolved battle-armor
 * inputs survive validation byte-for-byte; unknown discriminants fail
 * closed; the pack's runtime module graph imports no catalog, clock, or
 * RNG surface.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS } from '../__fixtures__/CombatBattleArmorBaselineSchemaPack.fixture';
import {
  COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK,
  COMBAT_BATTLE_ARMOR_EVENT_TYPES,
} from '../CombatBattleArmorBaselineSchemaPack';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
} from '../ReplaySchemaRegistry';

/** The frozen task/PR-10 inventory row as runtime discriminant values. */
const INVENTORY_BATTLE_ARMOR_DISCRIMINANTS = [
  'trooper_killed',
  'squad_eliminated',
  'swarm_attached',
  'swarm_damage',
  'swarm_dismounted',
  'leg_attack',
  'leg_attack_resolved',
  'vibro_claw_attack_resolved',
  'mimetic_bonus',
  'stealth_bonus',
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
  trooper_killed: [
    (p) => delete p['trooperIndex'],
    (p) => (p['killedBy'] = 'weapon-mlas-2'),
    (p) => (p['survivingTroopers'] = 'four'),
  ],
  squad_eliminated: [
    (p) => delete p['unitId'],
    (p) => (p['lastStand'] = true),
    (p) => (p['unitId'] = 11),
  ],
  swarm_attached: [
    (p) => delete p['targetNumber'],
    (p) => (p['attachLocation'] = 'rear'),
    (p) => (p['rollTotal'] = 'nine'),
  ],
  swarm_damage: [
    (p) => delete p['locationLabel'],
    (p) => (p['critical'] = true),
    (p) => (p['damage'] = 'twenty'),
  ],
  swarm_dismounted: [
    (p) => delete p['cause'],
    (p) => (p['unexpected'] = true),
    (p) => (p['cause'] = 'shaken_off'),
  ],
  leg_attack: [
    (p) => delete p['success'],
    (p) => (p['legTargeted'] = 'left'),
    (p) => (p['damageToLeg'] = 'four'),
  ],
  leg_attack_resolved: [
    (p) => delete p['hitLocation'],
    (p) => (p['psrTriggered'] = true),
    (p) => (p['critModifier'] = 'minus-two'),
  ],
  vibro_claw_attack_resolved: [
    (p) => delete p['missileHits'],
    (p) => (p['unexpected'] = true),
    (p) => (p['vibroClawCount'] = 'two'),
  ],
  mimetic_bonus: [
    (p) => delete p['toHitBonus'],
    (p) => (p['hexesMoved'] = 0),
    (p) => (p['toHitBonus'] = 'three'),
  ],
  stealth_bonus: [
    (p) => delete p['source'],
    (p) => (p['ecmActive'] = true),
    (p) => (p['source'] = 'mimetic'),
  ],
};

describe('combat battle-armor baseline schema pack', () => {
  const registry = new ReplaySchemaRegistry({
    events: COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK,
  });

  it('registers discriminants exactly equal to the frozen PR-10 inventory row', () => {
    const packTypes = [...COMBAT_BATTLE_ARMOR_EVENT_TYPES].sort();
    expect(packTypes).toEqual([...INVENTORY_BATTLE_ARMOR_DISCRIMINANTS].sort());
    expect(
      [
        ...COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK.map((e) => e.eventType),
      ].sort(),
    ).toEqual(packTypes);
    expect(Object.isFrozen(COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK)).toBe(
      true,
    );
  });

  it.each(INVENTORY_BATTLE_ARMOR_DISCRIMINANTS)(
    '%s parses its valid fixture at baseline v1 and round-trips deterministically',
    (eventType) => {
      const fixture = VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS[eventType];
      const first = registry.upcast(eventType, 1, fixture);
      const second = registry.upcast(eventType, 1, fixture);

      expect(first.eventType).toBe(eventType);
      expect(first.schemaVersion).toBe(1);
      expect(first.payload).toEqual(fixture);
      expect(second.payload).toEqual(first.payload);
      expect(Object.isFrozen(first.payload)).toBe(true);
    },
  );

  it.each(INVENTORY_BATTLE_ARMOR_DISCRIMINANTS)(
    '%s rejects its missing/extra/ill-typed mutation matrix',
    (eventType) => {
      const mutations = MUTATIONS[eventType];
      expect(mutations).toHaveLength(3);
      for (const mutate of mutations) {
        const payload = clone(
          VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS[eventType],
        );
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
    expect(() => registry.upcast('trooper_revived', 1, {})).toThrow(
      UnsupportedReplayHistoryError,
    );
    expect(() =>
      registry.upcast(
        'squad_eliminated',
        2,
        VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS['squad_eliminated'],
      ),
    ).toThrow(UnsupportedReplayHistoryError);
  });

  it('retains resolved battle-armor inputs as stored payload data', () => {
    const swarm = registry.upcast(
      'swarm_attached',
      1,
      VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS['swarm_attached'],
    ).payload as Record<string, unknown>;
    expect(swarm['rollTotal']).toBe(9);
    expect(swarm['targetNumber']).toBe(7);

    const leg = registry.upcast(
      'leg_attack_resolved',
      1,
      VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS['leg_attack_resolved'],
    ).payload as Record<string, unknown>;
    expect(leg['hitLocation']).toBe('Left Leg');
    expect(leg['critModifier']).toBe(-2);

    const claws = registry.upcast(
      'vibro_claw_attack_resolved',
      1,
      VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS['vibro_claw_attack_resolved'],
    ).payload as Record<string, unknown>;
    expect(claws['missileHits']).toBe(3);
    expect(claws['damage']).toBe(6);
  });

  it('imports no catalog, clock, or RNG surface (pure-data validation)', () => {
    const repoRoot = process.cwd();
    const text = fs.readFileSync(
      path.join(
        repoRoot,
        'src/lib/events/replay/CombatBattleArmorBaselineSchemaPack.ts',
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
