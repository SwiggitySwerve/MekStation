/**
 * Combat movement, locks, and facing baseline schema pack (replay-safety
 * PR 5).
 *
 * Strict concrete v1 payload schemas for the six movement discriminants
 * the frozen schema-pack-inventory row assigns to this pack:
 * `MovementDeclared`, `MovementInvalid`, `MovementLocked`,
 * `RuntimeMovementStateChanged`, `MovementEnhancementActivated`,
 * `FacingChanged` — registered at baseline v1 with no transitions, keyed
 * by the RUNTIME `GameEventType` values. Ranged `AttackLocked` stays
 * owned by task 6 (inventory ownership).
 *
 * Legacy movement compatibility is EXPLICIT in the baseline rather than
 * reconstructed from current movement rules: the decomposition fields
 * (`mode`, `path`, `hexesMoved`, `straightHexes`, `turningMpCost`,
 * `netDisplacement`, `steps`) are all optional exactly as the payload
 * interface declares for pre-enrichment event streams, and the
 * `IMovementStep` union is mirrored as a `kind`-discriminated union.
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import { hexCoordinateSchema } from './CombatLifecycleSharedSchemas';

/** The six movement discriminants this pack owns. */
export type CombatMovementEventType =
  | GameEventType.MovementDeclared
  | GameEventType.MovementInvalid
  | GameEventType.MovementLocked
  | GameEventType.RuntimeMovementStateChanged
  | GameEventType.MovementEnhancementActivated
  | GameEventType.FacingChanged;

const finiteNumber = z.number().finite();
const finiteInt = z.number().int().finite();

const facingSchema = z.nativeEnum(Facing);
const movementTypeSchema = z.nativeEnum(MovementType);

/** MovementAnimationMode = MovementType.Walk | Run | Jump. */
const movementAnimationModeSchema = z.enum(['walk', 'run', 'jump']);

const standUpModeSchema = z.enum(['normal', 'careful']);

// =============================================================================
// IMovementStep discriminated union (12 kinds)
// =============================================================================

const forwardStepSchema = z
  .object({
    kind: z.literal('forward'),
    index: finiteInt,
    direction: z.enum(['forward', 'backward']),
    from: hexCoordinateSchema,
    to: hexCoordinateSchema,
    mpCost: finiteNumber,
    terrainEntered: z.string(),
    elevationDelta: finiteNumber,
  })
  .strict();

const turnStepSchema = z
  .object({
    kind: z.literal('turn'),
    index: finiteInt,
    at: hexCoordinateSchema,
    fromFacing: facingSchema,
    toFacing: facingSchema,
    mpCost: finiteNumber,
  })
  .strict();

const lateralStepSchema = z
  .object({
    kind: z.literal('lateral'),
    index: finiteInt,
    direction: z.enum(['left', 'right', 'left-backwards', 'right-backwards']),
    from: hexCoordinateSchema,
    to: hexCoordinateSchema,
    mpCost: finiteNumber,
    terrainEntered: z.string(),
  })
  .strict();

const jumpStepSchema = z
  .object({
    kind: z.literal('jump'),
    index: finiteInt,
    from: hexCoordinateSchema,
    to: hexCoordinateSchema,
    mpCost: finiteNumber,
    terrainEntered: z.string(),
    usesMechanicalJumpBooster: z.boolean().optional(),
  })
  .strict();

const standUpStepSchema = z
  .object({
    kind: z.literal('standUp'),
    index: finiteInt,
    at: hexCoordinateSchema,
    mpCost: finiteNumber,
    psrTriggered: z.boolean(),
    mode: standUpModeSchema.optional(),
  })
  .strict();

const goProneStepSchema = z
  .object({
    kind: z.literal('goProne'),
    index: finiteInt,
    at: hexCoordinateSchema,
    mpCost: finiteNumber,
  })
  .strict();

const hullDownStepSchema = z
  .object({
    kind: z.literal('hullDown'),
    index: finiteInt,
    at: hexCoordinateSchema,
    mpCost: finiteNumber,
  })
  .strict();

const convertModeStepSchema = z
  .object({
    kind: z.literal('convertMode'),
    index: finiteInt,
    at: hexCoordinateSchema,
    mpCost: finiteNumber,
    stepNumber: finiteInt,
    stepCount: finiteInt,
  })
  .strict();

const altitudeControlStepSchema = z
  .object({
    kind: z.literal('altitudeControl'),
    index: finiteInt,
    at: hexCoordinateSchema,
    mpCost: finiteNumber,
    direction: z.enum(['up', 'down']),
    stepNumber: finiteInt,
    stepCount: finiteInt,
  })
  .strict();

const chargeDeclaredStepSchema = z
  .object({
    kind: z.literal('chargeDeclared'),
    index: finiteInt,
    at: hexCoordinateSchema,
    targetId: z.string(),
    straightLineHexes: finiteNumber,
  })
  .strict();

const dfaDeclaredStepSchema = z
  .object({
    kind: z.literal('dfaDeclared'),
    index: finiteInt,
    at: hexCoordinateSchema,
    targetId: z.string(),
    jumpHeight: finiteNumber,
  })
  .strict();

const shakeOffSwarmStepSchema = z
  .object({
    kind: z.literal('shakeOffSwarm'),
    index: finiteInt,
    at: hexCoordinateSchema,
    psrTriggered: z.boolean(),
  })
  .strict();

const movementStepSchema = z.discriminatedUnion('kind', [
  forwardStepSchema,
  turnStepSchema,
  lateralStepSchema,
  jumpStepSchema,
  standUpStepSchema,
  goProneStepSchema,
  hullDownStepSchema,
  convertModeStepSchema,
  altitudeControlStepSchema,
  chargeDeclaredStepSchema,
  dfaDeclaredStepSchema,
  shakeOffSwarmStepSchema,
]);

// =============================================================================
// Payload schemas
// =============================================================================

const COMBAT_MOVEMENT_PAYLOAD_SCHEMAS = {
  [GameEventType.MovementDeclared]: z
    .object({
      unitId: z.string(),
      from: hexCoordinateSchema,
      to: hexCoordinateSchema,
      facing: facingSchema,
      movementType: movementTypeSchema,
      mode: movementAnimationModeSchema.optional(),
      path: z.array(hexCoordinateSchema).optional(),
      mpUsed: finiteNumber,
      heatGenerated: finiteNumber,
      standUpAttempt: z.boolean().optional(),
      standUpSucceeded: z.boolean().optional(),
      standUpMode: standUpModeSchema.optional(),
      hullDownExitAttempt: z.boolean().optional(),
      hullDownEntryAttempt: z.boolean().optional(),
      goProneAttempt: z.boolean().optional(),
      conversionStepCount: finiteNumber.optional(),
      conversionMpCost: finiteNumber.optional(),
      altitudeControlStepCount: finiteNumber.optional(),
      altitudeControlMpCost: finiteNumber.optional(),
      hexesMoved: finiteNumber.optional(),
      straightHexes: finiteNumber.optional(),
      turningMpCost: finiteNumber.optional(),
      netDisplacement: finiteNumber.optional(),
      steps: z.array(movementStepSchema).optional(),
    })
    .strict(),
  [GameEventType.MovementInvalid]: z
    .object({
      unitId: z.string(),
      from: hexCoordinateSchema,
      to: hexCoordinateSchema,
      facing: facingSchema,
      movementType: movementTypeSchema,
      reason: z.enum([
        'NoMovementCapability',
        'DestinationOutOfBounds',
        'DestinationOccupied',
        'JumpUnavailable',
        'NoLegalPath',
        'InsufficientMP',
        'UnitImmobile',
        'UnitAlreadyMoved',
        'InvalidPath',
        'TerrainBlocked',
        'InvalidDestination',
      ]),
      details: z.string().optional(),
      mpCost: finiteNumber.optional(),
      heatGenerated: finiteNumber.optional(),
    })
    .strict(),
  [GameEventType.MovementLocked]: z.object({ unitId: z.string() }).strict(),
  [GameEventType.RuntimeMovementStateChanged]: z
    .object({
      unitId: z.string(),
      source: z.enum([
        'conversion_action',
        'altitude_control_action',
        'automatic_wige_landing',
        'infantry_mount_action',
        'scenario_setup',
        'rules_correction',
      ]),
      conversionMode: z
        .union([
          z.enum([
            'mek',
            'mech',
            'airmek',
            'airmech',
            'fighter',
            'vehicle',
            'tracked',
            'wheeled',
          ]),
          finiteNumber,
        ])
        .nullable()
        .optional(),
      conversionStepCount: finiteNumber.optional(),
      conversionMpCost: finiteNumber.optional(),
      unitHeight: finiteNumber.nullable().optional(),
      vehicleAltitude: finiteNumber.optional(),
      protoAltitude: finiteNumber.optional(),
      lamAirMekAltitude: finiteNumber.optional(),
      altitudeControlStepCount: finiteNumber.optional(),
      altitudeControlMpCost: finiteNumber.optional(),
      lamAirMekLandingControlRequired: z.boolean().optional(),
      lamAirMekLandingControlReason: z.string().optional(),
      lamAirMekLandingControlModifier: finiteNumber.optional(),
      lamAirMekLandingControlModifierDetails: z.array(z.string()).optional(),
      lamAirMekLandingControlFallHeight: finiteNumber.optional(),
      infantryMounted: z.boolean().nullable().optional(),
      infantryMountHeight: finiteNumber.nullable().optional(),
    })
    .strict(),
  [GameEventType.MovementEnhancementActivated]: z
    .object({
      unitId: z.string(),
      enhancement: z.enum(['MASC', 'Supercharger']),
    })
    .strict(),
  [GameEventType.FacingChanged]: z
    .object({
      unitId: z.string(),
      facing: facingSchema.optional(),
      secondaryFacing: facingSchema.optional(),
      torsoTwist: z.enum(['left', 'right']).optional(),
    })
    .strict(),
} satisfies Record<CombatMovementEventType, z.ZodType>;

/** The six runtime discriminant values this pack registers. */
export const COMBAT_MOVEMENT_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(
    Object.keys(COMBAT_MOVEMENT_PAYLOAD_SCHEMAS) as GameEventType[],
  );

/**
 * Every movement variant registered at baseline v1, ready for composition
 * into a `ReplaySchemaRegistry`.
 */
export const COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_MOVEMENT_PAYLOAD_SCHEMAS) as readonly [
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
