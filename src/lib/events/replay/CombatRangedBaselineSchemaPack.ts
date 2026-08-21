/**
 * Combat ranged and indirect attack baseline schema pack (replay-safety
 * PR 6).
 *
 * Strict concrete v1 payload schemas for the thirteen ranged/indirect
 * discriminants the frozen schema-pack-inventory row assigns to this
 * pack: `AttackDeclared`, `AttackInvalid`, `AttackLocked`,
 * `AttacksRevealed`, `AttackResolved`, `SpottingDeclared`, the four
 * indirect-fire payloads, `AmmoConsumed`, `AMSInterception`, and
 * `DesignatorMarkerApplied` — registered at baseline v1 with no
 * transitions, keyed by the RUNTIME `GameEventType` values.
 *
 * `attack_resolved` is a UNION of the public payload and the fog-of-war
 * redacted form (`IRedactedAttackResolvedPayload` — attacker/weapon
 * identifiers intentionally absent): both are genuine stored history.
 *
 * Resolved combat inputs are RETAINED data: to-hit rolls (raw `roll`,
 * consumed `rolls` arrays), hit locations, cluster results, Edge audit
 * fields, ammunition bin references, and indirect-fire spotter/basis
 * decisions all validate from stored payload — no catalog, clock, or
 * RNG lookup (task 6.3; the contract test pins the import surface).
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import { FiringArc } from '@/types/gameplay/HexGridInterfaces';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import { hexCoordinateSchema } from './CombatLifecycleSharedSchemas';

/** The thirteen ranged/indirect discriminants this pack owns. */
export type CombatRangedEventType =
  | GameEventType.AttackDeclared
  | GameEventType.AttackInvalid
  | GameEventType.AttackLocked
  | GameEventType.AttacksRevealed
  | GameEventType.AttackResolved
  | GameEventType.SpottingDeclared
  | GameEventType.IndirectFireSpotterSelected
  | GameEventType.IndirectFireSpotterLost
  | GameEventType.IndirectFireForwardObserver
  | GameEventType.IndirectFireNarcOverride
  | GameEventType.AmmoConsumed
  | GameEventType.AMSInterception
  | GameEventType.DesignatorMarkerApplied;

const finiteNumber = z.number().finite();

const firingArcSchema = z.nativeEnum(FiringArc);

const arcLiteralSchema = z.enum(['front', 'left', 'right', 'rear']);

const toHitModifierSchema = z
  .object({
    name: z.string(),
    value: finiteNumber,
    source: z.string(),
    description: z.string().optional(),
  })
  .strict();

const weaponAttackDataSchema = z
  .object({
    weaponId: z.string(),
    weaponName: z.string(),
    damage: finiteNumber,
    heat: finiteNumber,
  })
  .strict();

const selectedAMSWeaponMountDataSchema = z
  .object({
    weaponId: z.string(),
    weaponName: z.string(),
    heat: finiteNumber,
    ammoWeaponType: z.string().optional(),
    mountingArc: firingArcSchema.optional(),
    mountingArcs: z.array(firingArcSchema).optional(),
    amsMultiUse: z.boolean().optional(),
  })
  .strict();

/** Public `IAttackResolvedPayload` mirror. */
const attackResolvedPublicSchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string(),
    weaponId: z.string(),
    roll: finiteNumber,
    toHitNumber: finiteNumber,
    hit: z.boolean(),
    location: z.string().optional(),
    damage: finiteNumber.optional(),
    heat: finiteNumber.optional(),
    attackerArc: arcLiteralSchema.optional(),
    ammoBinId: z.string().nullable().optional(),
    visualCategory: z
      .enum(['laser', 'missile', 'ballistic', 'physical', 'energy'])
      .optional(),
    visualSubtype: z.string().optional(),
    projectileCount: finiteNumber.optional(),
    rolls: z.array(finiteNumber).optional(),
    edgeReroll: z.boolean().optional(),
    edgeSuperseded: z.boolean().optional(),
    edgeTrigger: z.string().optional(),
    edgePointsRemaining: finiteNumber.optional(),
    edgeSupersededLocation: z.string().optional(),
    edgeSupersededRoll: finiteNumber.optional(),
  })
  .strict();

/**
 * Fog-of-war redacted `IRedactedAttackResolvedPayload` mirror — the
 * attacker/weapon identifiers are intentionally absent. A genuine stored
 * form of the same discriminant.
 */
const attackResolvedRedactedSchema = z
  .object({
    targetId: z.string(),
    roll: finiteNumber,
    toHitNumber: finiteNumber,
    hit: z.boolean(),
    location: z.string().optional(),
    damage: finiteNumber.optional(),
    rolls: z.array(finiteNumber).optional(),
  })
  .strict();

/** Shared indirect-fire base fields (IIndirectFireEventBase). */
const indirectFireBaseShape = {
  attackerId: z.string(),
  weaponId: z.string(),
  ammoId: z.string().optional(),
  targetHex: hexCoordinateSchema,
  toHitPenalty: finiteNumber,
  spotterAttackedThisTurn: z.boolean().optional(),
};

const COMBAT_RANGED_PAYLOAD_SCHEMAS = {
  [GameEventType.AttackDeclared]: z
    .object({
      attackerId: z.string(),
      targetId: z.string(),
      weapons: z.array(z.string()),
      weaponModes: z.record(z.string(), z.string()).optional(),
      selectedAMSWeaponIds: z.record(z.string(), z.string()).optional(),
      selectedAMSWeaponMounts: z
        .record(z.string(), selectedAMSWeaponMountDataSchema)
        .optional(),
      weaponAttacks: z.array(weaponAttackDataSchema).optional(),
      toHitNumber: finiteNumber,
      modifiers: z.array(toHitModifierSchema),
      range: z.enum(['short', 'medium', 'long', 'extreme']).optional(),
      firingArc: arcLiteralSchema.optional(),
    })
    .strict(),
  [GameEventType.AttackInvalid]: z
    .object({
      attackerId: z.string(),
      targetId: z.string(),
      weaponId: z.string().optional(),
      reason: z.enum([
        'OutOfAmmo',
        'SameHex',
        'OutOfRange',
        'OutOfArc',
        'NoLineOfSight',
        'TargetNotVisible',
        'InvalidTarget',
        'UnknownWeapon',
        'WeaponDestroyed',
        'WeaponJammed',
        'AttackerEvading',
        'AttackerSprinted',
      ]),
      details: z.string().optional(),
    })
    .strict(),
  [GameEventType.AttackLocked]: z.object({ unitId: z.string() }).strict(),
  [GameEventType.AttacksRevealed]: z
    .object({
      unitIds: z.array(z.string()),
      attackCount: finiteNumber,
    })
    .strict(),
  [GameEventType.AttackResolved]: z.union([
    attackResolvedPublicSchema,
    attackResolvedRedactedSchema,
  ]),
  [GameEventType.SpottingDeclared]: z
    .object({
      unitId: z.string(),
      targetId: z.string(),
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.IndirectFireSpotterSelected]: z
    .object({
      ...indirectFireBaseShape,
      basis: z.literal('los'),
      spotterId: z.string(),
    })
    .strict(),
  [GameEventType.IndirectFireSpotterLost]: z
    .object({
      ...indirectFireBaseShape,
      basis: z.enum(['los', 'narc', 'inarc', 'semi-guided-tag']),
      spotterId: z.string().nullable(),
      reason: z.string(),
    })
    .strict(),
  [GameEventType.IndirectFireForwardObserver]: z
    .object({
      ...indirectFireBaseShape,
      basis: z.enum(['los', 'narc', 'inarc', 'semi-guided-tag']),
      spotterId: z.string().nullable(),
      penaltyCancelled: finiteNumber,
    })
    .strict(),
  [GameEventType.IndirectFireNarcOverride]: z
    .object({
      ...indirectFireBaseShape,
      basis: z.enum(['narc', 'inarc']),
      spotterId: z.null(),
    })
    .strict(),
  [GameEventType.AmmoConsumed]: z
    .object({
      unitId: z.string(),
      binId: z.string(),
      weaponType: z.string(),
      roundsConsumed: finiteNumber,
      roundsRemaining: finiteNumber,
    })
    .strict(),
  [GameEventType.AMSInterception]: z
    .object({
      defenderId: z.string(),
      targetId: z.string(),
      attackerId: z.string(),
      incomingWeaponId: z.string(),
      amsWeaponId: z.string(),
      resolution: z.enum(['cluster-table', 'single-missile']),
      incomingProjectiles: finiteNumber,
      projectilesIntercepted: finiteNumber,
      projectilesRemaining: finiteNumber,
      ammoConsumed: finiteNumber,
      roll: z.array(finiteNumber),
      clusterRoll: finiteNumber.optional(),
      clusterModifier: finiteNumber.optional(),
      modifiedClusterRoll: finiteNumber.optional(),
      ammoBinId: z.string().optional(),
      ammoRemaining: finiteNumber.optional(),
    })
    .strict(),
  [GameEventType.DesignatorMarkerApplied]: z
    .object({
      attackerId: z.string(),
      targetId: z.string(),
      weaponId: z.string(),
      marker: z.enum(['inarc', 'narc', 'tag']),
      podType: z.enum(['homing', 'ecm', 'haywire', 'nemesis']).optional(),
      persistent: z.boolean(),
      turn: finiteNumber,
      location: z.string().optional(),
      teamId: z.string().optional(),
    })
    .strict(),
} satisfies Record<CombatRangedEventType, z.ZodType>;

/** The thirteen runtime discriminant values this pack registers. */
export const COMBAT_RANGED_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(Object.keys(COMBAT_RANGED_PAYLOAD_SCHEMAS) as GameEventType[]);

/**
 * Every ranged/indirect variant registered at baseline v1, ready for
 * composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_RANGED_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_RANGED_PAYLOAD_SCHEMAS) as readonly [
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
