/**
 * Combat terrain, mission, morale, and withdrawal baseline schema pack
 * (replay-safety PR 9B).
 *
 * Strict concrete v1 payload schemas for the thirteen discriminants the
 * frozen schema-pack-inventory row assigns to this pack:
 * `CommandResultPublished`, `TerrainChanged`, `MinefieldChanged`,
 * `EmpMinefieldEffectApplied`, `RetreatTriggered`, `UnitRetreated`,
 * `UnitEjected`, `ObjectiveCaptured`, `ObjectiveLost`,
 * `ObjectiveProgress`, `MoraleShifted`, `WithdrawalDeclared`,
 * `ForcedWithdrawalTriggered` — registered at baseline v1 with no
 * transitions, keyed by the RUNTIME `GameEventType` values.
 *
 * CONCRETIZATION DECISION (`command_result_published`): the canonical
 * interface types `result` as `unknown`, but every producer
 * (`buildPlayerSafeCommandResultEvent`) stores the projected
 * `IPlayerCommandResult` envelope, whose `publicEffect` is
 * domain-specific JSON. The baseline therefore locks the ENVELOPE
 * concretely (commandId/domain/status/subjectRefs/diagnosticEvent/
 * committedAt + optionals) and bounds `publicEffect` with a closed
 * recursive JSON-value grammar — no `z.unknown()`, no passthrough
 * objects; the tightest honest bound for an arbitrary-JSON field.
 * `domain` mirrors the interface's OPEN string union
 * (`CommandScreenDomain` ends in `(string & {})`), so it is a string.
 *
 * Not wired to production replay until the task-11 composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { GameEventType, GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import {
  hexCoordinateSchema,
  representedMinefieldStateSchema,
} from './CombatLifecycleSharedSchemas';

/** The thirteen terrain/mission/morale/withdrawal discriminants. */
type CombatMissionEventType =
  | GameEventType.CommandResultPublished
  | GameEventType.TerrainChanged
  | GameEventType.MinefieldChanged
  | GameEventType.EmpMinefieldEffectApplied
  | GameEventType.RetreatTriggered
  | GameEventType.UnitRetreated
  | GameEventType.UnitEjected
  | GameEventType.ObjectiveCaptured
  | GameEventType.ObjectiveLost
  | GameEventType.ObjectiveProgress
  | GameEventType.MoraleShifted
  | GameEventType.WithdrawalDeclared
  | GameEventType.ForcedWithdrawalTriggered;

const finiteNumber = z.number().finite();

/**
 * Closed recursive JSON-value grammar — the bound for stored
 * domain-specific JSON (`publicEffect`). Not `z.unknown()`: every node
 * must be a JSON primitive, array, or string-keyed object.
 */
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    finiteNumber,
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const commandSubjectRefSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    label: z.string().optional(),
  })
  .strict();

const commandReasonSchema = z
  .object({
    code: z.string(),
    kind: z.enum([
      'legal',
      'illegal',
      'costly',
      'blocked',
      'risky',
      'stale',
      'manual-takeover',
    ]),
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string(),
    affectedRefs: z.array(commandSubjectRefSchema).optional(),
    source: z.string().optional(),
  })
  .strict();

const commandStateSummarySchema = z
  .object({
    label: z.string(),
    entityRefs: z.array(commandSubjectRefSchema),
    fields: z.record(
      z.string(),
      z.union([z.string(), finiteNumber, z.boolean(), z.null()]),
    ),
  })
  .strict();

/**
 * Stored `IPlayerCommandResult` envelope (the projected player-safe
 * result every producer writes into `result`).
 */
const playerCommandResultSchema = z
  .object({
    commandId: z.string(),
    previewId: z.string().optional(),
    domain: z.string(),
    status: z.enum(['committed', 'rejected', 'drift', 'manual-required']),
    subjectRefs: z.array(commandSubjectRefSchema),
    publicEffect: jsonValueSchema,
    rejectionReason: commandReasonSchema.optional(),
    resultingState: commandStateSummarySchema.optional(),
    ledgerRef: z.string().optional(),
    diagnosticEvent: z.enum([
      'command_malformed_payload_rejected',
      'command_preview_created',
      'command_preview_rejected',
      'command_invalid_action_rejected',
      'command_commit_rejected',
      'command_commit_succeeded',
      'command_commit_drift_detected',
      'command_reload_validated',
      'command_gm_intervention_committed',
    ]),
    committedAt: z.string(),
  })
  .strict();

const mapEdgeSchema = z.enum(['north', 'south', 'east', 'west']);

const objectiveSideSchema = z.enum(['player', 'opponent', 'neutral']);

const moraleLevelSchema = z.enum([
  'ROUTED',
  'BROKEN',
  'SHAKEN',
  'STEADY',
  'CONFIDENT',
  'INSPIRED',
  'OVERWHELMING',
]);

const COMBAT_MISSION_PAYLOAD_SCHEMAS = {
  [GameEventType.CommandResultPublished]: z
    .object({
      source: z.enum(['host-command', 'host-gm-intervention']),
      result: playerCommandResultSchema,
      publicSummary: z.string(),
    })
    .strict(),
  [GameEventType.TerrainChanged]: z
    .object({
      hex: hexCoordinateSchema,
      terrain: z.string(),
      elevation: finiteNumber.optional(),
      previousTerrain: z.string().optional(),
      previousElevation: finiteNumber.optional(),
      reason: z.enum(['battlefield_wreckage', 'damageable_cover_hit']),
      sourceEventId: z.string().optional(),
      sourceUnitId: z.string().optional(),
      optionalRule: z.string().optional(),
    })
    .strict(),
  [GameEventType.MinefieldChanged]: z
    .object({
      operation: z.enum([
        'add',
        'set',
        'remove',
        'clear',
        'reset',
        'detonate',
        'detect',
        'reveal',
      ]),
      hex: hexCoordinateSchema.optional(),
      minefield: representedMinefieldStateSchema.optional(),
      minefields: z
        .record(z.string(), representedMinefieldStateSchema)
        .optional(),
      detectingSide: z.nativeEnum(GameSide).optional(),
      reason: z
        .enum([
          'scenario_setup',
          'movement_detonation',
          'detection',
          'clearing',
          'mine_sweeper',
          'collateral_reset',
          'manual_adjustment',
          'test_fixture',
        ])
        .optional(),
      sourceEventId: z.string().optional(),
      sourceUnitId: z.string().optional(),
    })
    .strict(),
  [GameEventType.EmpMinefieldEffectApplied]: z
    .object({
      unitId: z.string(),
      hex: hexCoordinateSchema,
      roll: finiteNumber,
      modifier: finiteNumber,
      modifiedRoll: finiteNumber,
      effect: z.enum(['none', 'interference', 'shutdown']),
      durationTurns: finiteNumber.optional(),
      source: z.literal('minefield'),
    })
    .strict(),
  [GameEventType.RetreatTriggered]: z
    .object({
      unitId: z.string(),
      edge: mapEdgeSchema,
      reason: z.enum(['structural_threshold', 'vital_crit']),
    })
    .strict(),
  [GameEventType.UnitRetreated]: z
    .object({
      unitId: z.string(),
      retreatEdge: mapEdgeSchema,
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.UnitEjected]: z
    .object({
      unitId: z.string(),
      turn: finiteNumber,
      reason: z.enum(['player_declared', 'forced', 'pilot_survival']),
    })
    .strict(),
  [GameEventType.ObjectiveCaptured]: z
    .object({
      objectiveId: z.string(),
      hexKey: z.string(),
      capturingSide: objectiveSideSchema,
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.ObjectiveLost]: z
    .object({
      objectiveId: z.string(),
      hexKey: z.string(),
      losingSide: objectiveSideSchema,
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.ObjectiveProgress]: z
    .object({
      objectiveId: z.string(),
      hexKey: z.string(),
      controlSide: objectiveSideSchema,
      holdProgress: finiteNumber,
      holdTurnsRequired: finiteNumber,
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.MoraleShifted]: z
    .object({
      side: z.nativeEnum(GameSide),
      from: moraleLevelSchema,
      to: moraleLevelSchema,
      cause: z.string(),
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.WithdrawalDeclared]: z
    .object({
      unitId: z.string(),
      edge: mapEdgeSchema,
      declaredBy: z.enum(['player', 'forced']),
      turn: finiteNumber,
    })
    .strict(),
  [GameEventType.ForcedWithdrawalTriggered]: z
    .object({
      unitId: z.string(),
      reason: z.enum(['morale-broken', 'crippled']),
      turn: finiteNumber,
    })
    .strict(),
} satisfies Record<CombatMissionEventType, z.ZodType>;

/** The thirteen runtime discriminant values this pack registers. */
export const COMBAT_MISSION_EVENT_TYPES: readonly GameEventType[] =
  Object.freeze(Object.keys(COMBAT_MISSION_PAYLOAD_SCHEMAS) as GameEventType[]);

/**
 * Every terrain/mission/morale/withdrawal variant registered at baseline
 * v1, ready for composition into a `ReplaySchemaRegistry`.
 */
export const COMBAT_MISSION_BASELINE_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze(
    (
      Object.entries(COMBAT_MISSION_PAYLOAD_SCHEMAS) as readonly [
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
