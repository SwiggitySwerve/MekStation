/**
 * Combat lifecycle and initiative baseline schema pack (replay-safety PR 4).
 *
 * Strict concrete v1 payload schemas for the eight lifecycle/initiative
 * discriminants the frozen schema-pack-inventory row assigns to this pack:
 * `GameCreated`, `GameStarted`, `GameEnded`, `TurnStarted`, `TurnEnded`,
 * `PhaseChanged`, `InitiativeRolled`, `InitiativeOrderSet` — registered at
 * baseline v1 with no transitions, keyed by the RUNTIME `GameEventType`
 * values (`game_created`, ...). The `satisfies` clause makes the pack
 * exhaustive against the local eight-member union at compile time; the
 * whole-union composition proof is task 11's job.
 *
 * Resolved setup/initiative inputs are RETAINED data: `InitiativeRolled`
 * keeps the raw 2d6 values, modifiers, totals, Tactical Genius audit
 * fields, and the consumed `rolls` array as stored payload — validation
 * needs no catalog, clock, or RNG lookup (task 4.3; the contract test
 * pins the import surface).
 *
 * Not wired to production replay: per the change law, packs stay unwired
 * until the task-11 exhaustive-composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import {
  c3NetworkStateSchema,
  encounterMetaSchema,
  gameConfigSchema,
  gamePhaseSchema,
  gameSideSchema,
  gameUnitSchema,
  hexTerrainSchema,
  objectiveMarkerSchema,
  representedGroundObjectStateSchema,
  representedMinefieldStateSchema,
} from './CombatLifecycleSharedSchemas';

/** The eight lifecycle/initiative discriminants this pack owns. */
type CombatLifecycleEventType =
  | GameEventType.GameCreated
  | GameEventType.GameStarted
  | GameEventType.GameEnded
  | GameEventType.TurnStarted
  | GameEventType.TurnEnded
  | GameEventType.PhaseChanged
  | GameEventType.InitiativeRolled
  | GameEventType.InitiativeOrderSet;

const finiteNumber = z.number().finite();

const winnerOrDrawSchema = z.union([gameSideSchema, z.literal('draw')]);

const COMBAT_LIFECYCLE_PAYLOAD_SCHEMAS = {
  [GameEventType.GameCreated]: z
    .object({
      config: gameConfigSchema,
      units: z.array(gameUnitSchema),
      hexTerrain: z.array(hexTerrainSchema).optional(),
      c3Network: c3NetworkStateSchema.optional(),
      encounterMeta: encounterMetaSchema.optional(),
      objectives: z.record(z.string(), objectiveMarkerSchema).optional(),
      groundObjects: z
        .record(z.string(), representedGroundObjectStateSchema)
        .optional(),
      minefields: z
        .record(z.string(), representedMinefieldStateSchema)
        .optional(),
    })
    .strict(),
  [GameEventType.GameStarted]: z.object({ firstSide: gameSideSchema }).strict(),
  [GameEventType.GameEnded]: z
    .object({
      winner: winnerOrDrawSchema,
      reason: z.enum([
        'destruction',
        'concede',
        'turn_limit',
        'objective',
        'aborted',
      ]),
      turns: finiteNumber.optional(),
    })
    .strict(),
  [GameEventType.TurnStarted]: z
    .object({ _type: z.literal('turn_started').optional() })
    .strict(),
  [GameEventType.TurnEnded]: z
    .object({ _type: z.literal('turn_ended').optional() })
    .strict(),
  [GameEventType.PhaseChanged]: z
    .object({ fromPhase: gamePhaseSchema, toPhase: gamePhaseSchema })
    .strict(),
  [GameEventType.InitiativeRolled]: z
    .object({
      playerRoll: finiteNumber,
      opponentRoll: finiteNumber,
      playerModifier: finiteNumber.optional(),
      opponentModifier: finiteNumber.optional(),
      playerTotal: finiteNumber.optional(),
      opponentTotal: finiteNumber.optional(),
      tacticalGeniusRerollSide: gameSideSchema.optional(),
      playerOriginalRoll: finiteNumber.optional(),
      opponentOriginalRoll: finiteNumber.optional(),
      winner: gameSideSchema,
      movesFirst: gameSideSchema,
      rolls: z.array(finiteNumber).optional(),
    })
    .strict(),
  [GameEventType.InitiativeOrderSet]: z
    .object({
      winner: gameSideSchema,
      firstMover: gameSideSchema,
      secondMover: gameSideSchema,
    })
    .strict(),
} satisfies Record<CombatLifecycleEventType, z.ZodType>;

/** The eight runtime discriminant values this pack registers. */
export const COMBAT_LIFECYCLE_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(
    Object.keys(COMBAT_LIFECYCLE_PAYLOAD_SCHEMAS) as GameEventType[],
  );

/**
 * Every lifecycle/initiative variant registered at baseline v1, ready for
 * composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_LIFECYCLE_PAYLOAD_SCHEMAS) as readonly [
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
