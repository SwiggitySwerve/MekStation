/**
 * Combat damage, heat, and critical baseline schema pack (replay-safety
 * PR 7).
 *
 * Strict concrete v1 payload schemas for the twelve damage/heat/critical
 * discriminants the frozen schema-pack-inventory row assigns to this
 * pack: `DamageApplied`, `HeatGenerated`, `HeatDissipated`,
 * `HeatEffectApplied`, `PilotHit`, `UnitDestroyed`, `AmmoExplosion`,
 * `CriticalHit`, `CriticalHitResolved`, `LocationDestroyed`,
 * `TransferDamage`, `ComponentDestroyed` — registered at baseline v1
 * with no transitions, keyed by the RUNTIME `GameEventType` values.
 *
 * `unit_destroyed` is a UNION of the public payload and the fog-of-war
 * redacted form (`IRedactedUnitDestroyedPayload` — unit id only): both
 * are genuine stored history. `HeatGenerated`/`HeatDissipated` share the
 * canonical `IHeatPayload` shape (same interface, two discriminants).
 *
 * Resolved damage inputs are RETAINED data: armor/structure remainders,
 * crit slot outcomes, consumed d6 sequences, Edge audit fields, and
 * explosion sources all validate from stored payload — no catalog,
 * clock, or RNG lookup (the contract test pins the import surface).
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

/** The twelve damage/heat/critical discriminants this pack owns. */
type CombatDamageEventType =
  | GameEventType.DamageApplied
  | GameEventType.HeatGenerated
  | GameEventType.HeatDissipated
  | GameEventType.HeatEffectApplied
  | GameEventType.PilotHit
  | GameEventType.UnitDestroyed
  | GameEventType.AmmoExplosion
  | GameEventType.CriticalHit
  | GameEventType.CriticalHitResolved
  | GameEventType.LocationDestroyed
  | GameEventType.TransferDamage
  | GameEventType.ComponentDestroyed;

const finiteNumber = z.number().finite();

const heatVisualThresholdSchema = z.enum([
  'normal',
  'warm',
  'hot',
  'overheat',
  'critical',
]);

/** Canonical `IHeatPayload` mirror, shared by both heat discriminants. */
const heatPayloadSchema = z
  .object({
    unitId: z.string(),
    amount: finiteNumber,
    source: z.enum([
      'movement',
      'firing',
      'weapons',
      'engine_hit',
      'environment',
      'dissipation',
      'external',
    ]),
    newTotal: finiteNumber,
    previousTotal: finiteNumber.optional(),
    previousThreshold: heatVisualThresholdSchema.optional(),
    currentThreshold: heatVisualThresholdSchema.optional(),
    ammoExplosionRisk: z.boolean().optional(),
    breakdown: z
      .object({
        baseDissipation: finiteNumber,
        waterBonus: finiteNumber,
        environmentalModifier: finiteNumber.optional(),
        heatGenerationReduction: finiteNumber.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const unitDestroyedPublicSchema = z
  .object({
    unitId: z.string(),
    cause: z.enum([
      'damage',
      'ammo_explosion',
      'pilot_death',
      'engine_destroyed',
      'impossible_displacement',
      'ct_destroyed',
      'head_destroyed',
    ]),
    killerUnitId: z.string().optional(),
  })
  .strict();

/** Fog-of-war redacted destruction notice — unit id only. */
const unitDestroyedRedactedSchema = z.object({ unitId: z.string() }).strict();

const COMBAT_DAMAGE_PAYLOAD_SCHEMAS = {
  [GameEventType.DamageApplied]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      damage: finiteNumber,
      armorRemaining: finiteNumber,
      structureRemaining: finiteNumber,
      locationDestroyed: z.boolean(),
      criticals: z.array(z.string()).optional(),
      sourceUnitId: z.string().optional(),
      attackId: z.string().optional(),
    })
    .strict(),
  [GameEventType.HeatGenerated]: heatPayloadSchema,
  [GameEventType.HeatDissipated]: heatPayloadSchema,
  [GameEventType.HeatEffectApplied]: z
    .object({
      unitId: z.string(),
      threshold: finiteNumber,
      effect: z.enum([
        'movement_penalty',
        'attack_penalty',
        'shutdown_check',
        'shutdown',
        'pilot_damage',
        'ammo_explosion_risk',
      ]),
      heatLevel: finiteNumber,
    })
    .strict(),
  [GameEventType.PilotHit]: z
    .object({
      unitId: z.string(),
      wounds: finiteNumber,
      totalWounds: finiteNumber,
      source: z.enum([
        'head_hit',
        'ammo_explosion',
        'mech_destruction',
        'fall',
        'heat',
        'neural_feedback',
      ]),
      consciousnessCheckRequired: z.boolean(),
      consciousnessCheckPassed: z.boolean().optional(),
      edgeReroll: z.boolean().optional(),
      edgeSuperseded: z.boolean().optional(),
      edgeTrigger: z.string().optional(),
      edgePointsRemaining: finiteNumber.optional(),
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.UnitDestroyed]: z.union([
    unitDestroyedPublicSchema,
    unitDestroyedRedactedSchema,
  ]),
  [GameEventType.AmmoExplosion]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      binId: z.string().optional(),
      equipmentName: z.string().optional(),
      weaponType: z.string().optional(),
      roundsDestroyed: finiteNumber.optional(),
      damage: finiteNumber,
      caseProtection: z.enum(['none', 'case', 'case_ii']).optional(),
      source: z.enum(['HeatInduced', 'CritInduced']),
    })
    .strict(),
  [GameEventType.CriticalHit]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      sourceUnitId: z.string().optional(),
      component: z.string().optional(),
      count: finiteNumber.optional(),
    })
    .strict(),
  [GameEventType.CriticalHitResolved]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      slotIndex: finiteNumber,
      componentType: z.string(),
      componentName: z.string(),
      weaponId: z.string().optional(),
      ammoBinId: z.string().optional(),
      hotLoaded: z.boolean().optional(),
      linkedCriticalWeaponId: z.string().optional(),
      linkedCriticalWeaponName: z.string().optional(),
      explosionDamage: finiteNumber.optional(),
      effect: z.string(),
      destroyed: z.boolean(),
      missing: z.boolean().optional(),
      breached: z.boolean().optional(),
      edgePointsRemaining: finiteNumber.optional(),
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.LocationDestroyed]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      cascadedTo: z.string().optional(),
      viaTransfer: z.boolean().optional(),
    })
    .strict(),
  [GameEventType.TransferDamage]: z
    .object({
      unitId: z.string(),
      fromLocation: z.string(),
      toLocation: z.string(),
      damage: finiteNumber,
    })
    .strict(),
  [GameEventType.ComponentDestroyed]: z
    .object({
      unitId: z.string(),
      location: z.string(),
      componentType: z.string(),
      slotIndex: finiteNumber,
      componentName: z.string().optional(),
      ammoBinId: z.string().optional(),
    })
    .strict(),
} satisfies Record<CombatDamageEventType, z.ZodType>;

/** The twelve runtime discriminant values this pack registers. */
export const COMBAT_DAMAGE_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(Object.keys(COMBAT_DAMAGE_PAYLOAD_SCHEMAS) as GameEventType[]);

/**
 * Every damage/heat/critical variant registered at baseline v1, ready for
 * composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_DAMAGE_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_DAMAGE_PAYLOAD_SCHEMAS) as readonly [
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
