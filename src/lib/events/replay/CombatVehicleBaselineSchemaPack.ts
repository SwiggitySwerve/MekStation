/**
 * Combat vehicle and represented-system-state baseline schema pack
 * (replay-safety PR 9A).
 *
 * Strict concrete v1 payload schemas for the nine vehicle/system-state
 * discriminants the frozen schema-pack-inventory row assigns to this
 * pack: `ShutdownCheck`, `StartupAttempt`, `NeuralInterfaceStateChanged`,
 * `MotiveDamaged`, `MotivePenaltyApplied`, `VehicleImmobilized`,
 * `TurretLocked`, `VehicleCrewStunned`, `VTOLCrashCheck` — registered at
 * baseline v1 with no transitions, keyed by the RUNTIME `GameEventType`
 * values.
 *
 * Resolved system-state inputs are RETAINED data: shutdown/startup
 * target numbers and consumed d6 pairs, motive severities + MP deltas,
 * immobilization causes, and VTOL crash altitude/fall-damage figures
 * all validate from stored payload — no catalog, clock, or RNG lookup
 * (the contract test pins the import surface).
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

/** The nine vehicle/system-state discriminants this pack owns. */
type CombatVehicleEventType =
  | GameEventType.ShutdownCheck
  | GameEventType.StartupAttempt
  | GameEventType.NeuralInterfaceStateChanged
  | GameEventType.MotiveDamaged
  | GameEventType.MotivePenaltyApplied
  | GameEventType.VehicleImmobilized
  | GameEventType.TurretLocked
  | GameEventType.VehicleCrewStunned
  | GameEventType.VTOLCrashCheck;

const finiteNumber = z.number().finite();

const COMBAT_VEHICLE_PAYLOAD_SCHEMAS = {
  [GameEventType.ShutdownCheck]: z
    .object({
      unitId: z.string(),
      heatLevel: finiteNumber,
      targetNumber: finiteNumber,
      roll: finiteNumber,
      shutdownOccurred: z.boolean(),
      automatic: z.boolean().optional(),
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.StartupAttempt]: z
    .object({
      unitId: z.string(),
      targetNumber: finiteNumber,
      roll: finiteNumber,
      success: z.boolean(),
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.NeuralInterfaceStateChanged]: z
    .object({
      unitId: z.string(),
      active: z.boolean(),
      turn: finiteNumber,
      reason: z.enum([
        'scenario_setup',
        'pilot_jacked_in',
        'pilot_jacked_out',
        'shutdown',
        'manual_adjustment',
        'test_fixture',
      ]),
    })
    .strict(),
  [GameEventType.MotiveDamaged]: z
    .object({
      unitId: z.string(),
      severity: z.enum(['none', 'minor', 'moderate', 'heavy', 'immobilized']),
      mpPenalty: finiteNumber,
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.MotivePenaltyApplied]: z
    .object({
      unitId: z.string(),
      previousCruiseMP: finiteNumber,
      newCruiseMP: finiteNumber,
      newFlankMP: finiteNumber,
    })
    .strict(),
  [GameEventType.VehicleImmobilized]: z
    .object({
      unitId: z.string(),
      cause: z.enum([
        'motive_roll',
        'aggravation',
        'rotor_destroyed',
        'engine_destroyed',
        'crew_killed',
      ]),
    })
    .strict(),
  [GameEventType.TurretLocked]: z
    .object({ unitId: z.string(), secondary: z.boolean() })
    .strict(),
  [GameEventType.VehicleCrewStunned]: z
    .object({ unitId: z.string(), phasesStunned: finiteNumber })
    .strict(),
  [GameEventType.VTOLCrashCheck]: z
    .object({
      unitId: z.string(),
      altitude: finiteNumber,
      fallDamage: finiteNumber,
    })
    .strict(),
} satisfies Record<CombatVehicleEventType, z.ZodType>;

/** The nine runtime discriminant values this pack registers. */
export const COMBAT_VEHICLE_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(Object.keys(COMBAT_VEHICLE_PAYLOAD_SCHEMAS) as GameEventType[]);

/**
 * Every vehicle/system-state variant registered at baseline v1, ready
 * for composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_VEHICLE_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_VEHICLE_PAYLOAD_SCHEMAS) as readonly [
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
