/**
 * Combat physical, PSR, and ground-object baseline schema pack
 * (replay-safety PR 8).
 *
 * Strict concrete v1 payload schemas for the ten discriminants the
 * schema-pack-inventory row (as amended 2026-08-21) assigns to this
 * pack: `PSRTriggered`, `PSRResolved`, `UnitFell`, `UnitStuck`,
 * `UnitStood`, `PhysicalAttackDeclared`, `PhysicalAttackLocked`,
 * `PhysicalAttackResolved`, `GroundObjectPickedUp`,
 * `GroundObjectDropped` — registered at baseline v1 with no
 * transitions, keyed by the RUNTIME `GameEventType` values.
 *
 * Resolved PSR/physical inputs are RETAINED data: PSR targets/rolls,
 * consumed d6 sequences, fall damage + facing, per-cluster charge/DFA
 * (damage, location) pairs, displacement chains, and domino step-out
 * decisions validate from stored payload — no catalog, clock, or RNG
 * lookup (the contract test pins the import surface).
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import { hexCoordinateSchema } from './CombatLifecycleSharedSchemas';
import { representedGroundObjectStateSchema } from './CombatLifecycleSharedSchemas';

/** The ten physical/PSR/ground-object discriminants this pack owns. */
export type CombatPhysicalEventType =
  | GameEventType.PSRTriggered
  | GameEventType.PSRResolved
  | GameEventType.UnitFell
  | GameEventType.UnitStuck
  | GameEventType.UnitStood
  | GameEventType.PhysicalAttackDeclared
  | GameEventType.PhysicalAttackLocked
  | GameEventType.PhysicalAttackResolved
  | GameEventType.GroundObjectPickedUp
  | GameEventType.GroundObjectDropped;

const finiteNumber = z.number().finite();

const psrTriggerSchema = z.nativeEnum(PSRTrigger);

/** PhysicalAttackEventType — 18 total (11 core + 7 melee-weapon variants). */
const physicalAttackTypeSchema = z.enum([
  'punch',
  'kick',
  'charge',
  'dfa',
  'push',
  'trip',
  'thrash',
  'jump-jet-attack',
  'brush-off',
  'grapple',
  'break-grapple',
  'hatchet',
  'sword',
  'mace',
  'lance',
  'retractable-blade',
  'flail',
  'wrecking-ball',
]);

/** PhysicalAttackINarcPodSelection — team + pod type, optional location. */
const iNarcPodSelectionSchema = z
  .object({
    teamId: z.string(),
    podType: z.enum(['homing', 'ecm', 'haywire', 'nemesis']),
    location: z.string().optional(),
  })
  .strict();

const dominoStepOutOptionSchema = z
  .object({
    kind: z.enum(['forward', 'backward']),
    to: hexCoordinateSchema,
  })
  .strict();

const dominoStepOutContextSchema = z
  .object({
    sideEntered: z.boolean(),
    blockerJumped: z.boolean(),
    legalStepOptions: z.array(dominoStepOutOptionSchema),
  })
  .strict();

const dominoStepOutDecisionSchema = z
  .object({
    blockerUnitId: z.string(),
    from: hexCoordinateSchema,
    response: z.enum(['move', 'declined', 'failed', 'no-response']),
    psrPassed: z.boolean(),
    context: dominoStepOutContextSchema,
    path: z.array(hexCoordinateSchema),
  })
  .strict();

const physicalDisplacementSchema = z
  .object({
    unitId: z.string(),
    from: hexCoordinateSchema,
    to: hexCoordinateSchema,
    reason: z.enum([
      'push',
      'charge',
      'charge_miss',
      'dfa',
      'dfa_miss',
      'break-grapple',
      'domino_step_out',
      'domino',
    ]),
  })
  .strict();

const physicalAttackResolvedBase = z
  .object({
    attackerId: z.string(),
    targetId: z.string(),
    attackType: physicalAttackTypeSchema,
    roll: finiteNumber,
    // STORED FORM (replay-safety PR 18): an impossible physical
    // resolves with toHitNumber: Infinity (JSON null), roll: 0, and
    // hit: false (physicalAttacks/resolution.ts). A null toHitNumber
    // with hit: true is corrupt and rejected below.
    toHitNumber: finiteNumber.nullable(),
    hit: z.boolean(),
    damage: finiteNumber.optional(),
    location: z.string().optional(),
    clusters: z
      .array(z.object({ damage: finiteNumber, location: z.string() }).strict())
      .optional(),
    displacements: z.array(physicalDisplacementSchema).optional(),
    automaticHit: z.boolean().optional(),
    automaticHitReason: z.string().optional(),
    selectedINarcPod: iNarcPodSelectionSchema.optional(),
    rolls: z.array(finiteNumber).optional(),
  })
  .strict();

const COMBAT_PHYSICAL_PAYLOAD_SCHEMAS = {
  [GameEventType.PSRTriggered]: z
    .object({
      unitId: z.string(),
      reason: z.string(),
      additionalModifier: finiteNumber,
      triggerSource: z.string(),
      basePilotingSkill: finiteNumber.optional(),
      fixedTargetNumber: finiteNumber.optional(),
      reasonCode: psrTriggerSchema.optional(),
    })
    .strict(),
  [GameEventType.PSRResolved]: z
    .object({
      unitId: z.string(),
      targetNumber: finiteNumber,
      roll: finiteNumber,
      modifiers: finiteNumber,
      passed: z.boolean(),
      reason: z.string(),
      edgeReroll: z.boolean().optional(),
      edgeSuperseded: z.boolean().optional(),
      edgeTrigger: z.string().optional(),
      edgePointsRemaining: finiteNumber.optional(),
      rolls: z.array(finiteNumber).optional(),
      reasonCode: psrTriggerSchema.optional(),
    })
    .strict(),
  [GameEventType.UnitFell]: z
    .object({
      unitId: z.string(),
      fallDamage: finiteNumber,
      newFacing: z.nativeEnum(Facing),
      pilotDamage: finiteNumber,
      rolls: z.array(finiteNumber).optional(),
      location: z.string().optional(),
      reason: z.string().optional(),
      reasonCode: psrTriggerSchema.optional(),
    })
    .strict(),
  [GameEventType.UnitStuck]: z
    .object({
      unitId: z.string(),
      reason: z.string().optional(),
      reasonCode: psrTriggerSchema.optional(),
    })
    .strict(),
  [GameEventType.UnitStood]: z
    .object({
      unitId: z.string(),
      turn: finiteNumber,
      roll: finiteNumber,
      targetNumber: finiteNumber,
      automaticSuccessReason: z.string().optional(),
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.PhysicalAttackDeclared]: z
    .object({
      attackerId: z.string(),
      targetId: z.string(),
      attackType: physicalAttackTypeSchema,
      toHitNumber: finiteNumber,
      limb: z.enum(['leftArm', 'rightArm', 'leftLeg', 'rightLeg']).optional(),
      hitTable: z.enum(['punch', 'kick']).optional(),
      twoHandedZweihander: z.boolean().optional(),
      selectedINarcPod: iNarcPodSelectionSchema.optional(),
      blockerStepOutDecision: dominoStepOutDecisionSchema.optional(),
    })
    .strict(),
  [GameEventType.PhysicalAttackLocked]: z
    .object({ unitId: z.string() })
    .strict(),
  [GameEventType.PhysicalAttackResolved]:
    physicalAttackResolvedBase.superRefine((value, context) => {
      if (value.toHitNumber === null && value.hit)
        context.addIssue({
          code: 'custom',
          path: ['toHitNumber'],
          message: 'An impossible resolution (null toHitNumber) cannot hit',
        });
    }),
  [GameEventType.GroundObjectPickedUp]: z
    .object({
      unitId: z.string(),
      objectId: z.string(),
      object: representedGroundObjectStateSchema,
      from: hexCoordinateSchema,
      carryLocation: z.enum(['leftArm', 'rightArm', 'both']),
      capacityTonnage: finiteNumber,
      capacityMarginTonnage: finiteNumber,
    })
    .strict(),
  [GameEventType.GroundObjectDropped]: z
    .object({
      unitId: z.string(),
      objectId: z.string(),
      to: hexCoordinateSchema,
      reason: z.enum(['drop', 'throw']),
    })
    .strict(),
} satisfies Record<CombatPhysicalEventType, z.ZodType>;

/** The ten runtime discriminant values this pack registers. */
export const COMBAT_PHYSICAL_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(
    Object.keys(COMBAT_PHYSICAL_PAYLOAD_SCHEMAS) as GameEventType[],
  );

/**
 * Every physical/PSR/ground-object variant registered at baseline v1,
 * ready for composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_PHYSICAL_PAYLOAD_SCHEMAS) as readonly [
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
