/**
 * Combat battle-armor baseline schema pack (replay-safety PR 10).
 *
 * Strict concrete v1 payload schemas for the ten battle-armor
 * discriminants the frozen schema-pack-inventory row assigns to this
 * pack: `TrooperKilled`, `SquadEliminated`, `SwarmAttached`,
 * `SwarmDamage`, `SwarmDismounted`, `LegAttack`, `LegAttackResolved`,
 * `VibroClawAttackResolved`, `MimeticBonus`, `StealthBonus` —
 * registered at baseline v1 with no transitions, keyed by the RUNTIME
 * `GameEventType` values.
 *
 * Resolved battle-armor inputs are RETAINED data: swarm roll totals and
 * target numbers, cluster missile hits, leg-attack hit locations and
 * crit modifiers, and stealth/mimetic bonus values all validate from
 * stored payload — no catalog, clock, or RNG lookup (the contract test
 * pins the import surface).
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

/** The ten battle-armor discriminants this pack owns. */
export type CombatBattleArmorEventType =
  | GameEventType.TrooperKilled
  | GameEventType.SquadEliminated
  | GameEventType.SwarmAttached
  | GameEventType.SwarmDamage
  | GameEventType.SwarmDismounted
  | GameEventType.LegAttack
  | GameEventType.LegAttackResolved
  | GameEventType.VibroClawAttackResolved
  | GameEventType.MimeticBonus
  | GameEventType.StealthBonus;

const finiteNumber = z.number().finite();

const COMBAT_BATTLE_ARMOR_PAYLOAD_SCHEMAS = {
  [GameEventType.TrooperKilled]: z
    .object({
      unitId: z.string(),
      trooperIndex: finiteNumber,
      survivingTroopers: finiteNumber,
    })
    .strict(),
  [GameEventType.SquadEliminated]: z.object({ unitId: z.string() }).strict(),
  [GameEventType.SwarmAttached]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      rollTotal: finiteNumber,
      targetNumber: finiteNumber,
    })
    .strict(),
  [GameEventType.SwarmDamage]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      damage: finiteNumber,
      locationLabel: z.string(),
    })
    .strict(),
  [GameEventType.SwarmDismounted]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      cause: z.enum([
        'dismount_roll',
        'go_prone_dislodgement',
        'squad_destroyed',
        'target_destroyed',
      ]),
      dismountDamage: finiteNumber,
    })
    .strict(),
  [GameEventType.LegAttack]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      success: z.boolean(),
      damageToLeg: finiteNumber,
      selfDamage: finiteNumber,
      survivingTroopers: finiteNumber,
    })
    .strict(),
  [GameEventType.LegAttackResolved]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      hit: z.boolean(),
      damage: finiteNumber,
      hitLocation: z.string(),
      critModifier: finiteNumber,
      survivingTroopers: finiteNumber,
    })
    .strict(),
  [GameEventType.VibroClawAttackResolved]: z
    .object({
      unitId: z.string(),
      targetUnitId: z.string(),
      damage: finiteNumber,
      missileHits: finiteNumber,
      vibroClawCount: finiteNumber,
      survivingTroopers: finiteNumber,
    })
    .strict(),
  [GameEventType.MimeticBonus]: z
    .object({
      unitId: z.string(),
      attackerId: z.string(),
      toHitBonus: finiteNumber,
    })
    .strict(),
  [GameEventType.StealthBonus]: z
    .object({
      unitId: z.string(),
      attackerId: z.string(),
      toHitBonus: finiteNumber,
      source: z.enum([
        'stealth_basic',
        'stealth_improved',
        'stealth_prototype',
      ]),
    })
    .strict(),
} satisfies Record<CombatBattleArmorEventType, z.ZodType>;

/** The ten runtime discriminant values this pack registers. */
export const COMBAT_BATTLE_ARMOR_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(
    Object.keys(COMBAT_BATTLE_ARMOR_PAYLOAD_SCHEMAS) as GameEventType[],
  );

/**
 * Every battle-armor variant registered at baseline v1, ready for
 * composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_BATTLE_ARMOR_PAYLOAD_SCHEMAS) as readonly [
        GameEventType,
        z.ZodType,
      ][]
    ).map(([eventType, schema]) =>
      Object.freeze({
        eventType,
        targetSchemaVersion: 1,
        schemas: [
          {
            schemaVersion: 1,
            schemaId: `combat.${eventType}.v1`,
            parse: (payload: unknown) => schema.parse(payload),
          },
        ],
        transitions: [],
      }),
    ),
  );
