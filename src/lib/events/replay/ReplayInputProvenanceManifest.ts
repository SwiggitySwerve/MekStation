/**
 * Deterministic replay input provenance manifest (replay-safety PR 12).
 *
 * Exhaustive declaration, for EVERY canonical replay discriminant (7
 * campaign + 81 combat, keyed by runtime values with compile-time
 * exhaustiveness over both live unions), of which resolved
 * nondeterministic inputs its replay depends on and HOW each is
 * satisfied. Categories:
 *
 * - `randomness` - payload fields storing resolved roll-derived
 *   outcomes (dice totals, hit flags, roll-chosen locations/slots).
 * - `time` - payload fields storing resolved LOGICAL time (turn/day
 *   counters). No variant reads a wall clock at replay.
 * - `catalogRules` - payload fields storing resolved catalog- or
 *   rules-derived values (unit/config snapshots, computed target
 *   numbers, tonnage-derived damage) so replay never consults the live
 *   catalog or rules services.
 * - `external` - payload fields storing resolved external/authority
 *   responses (currently only the published command-result envelope).
 *
 * An EMPTY entry is a positive claim: that variant's projection is
 * fully determined by its payload with no nondeterministic input.
 * Every listed field MUST be a top-level REQUIRED field of the
 * variant's strict schema - the contract test proves this by deleting
 * each listed field and requiring the SCHEMA to reject, then requiring
 * `assertReplayInputProvenance` to reject with the typed
 * `missing-required-input` code. The checker never repairs a payload
 * from current services; it only verifies presence and fails typed.
 *
 * UNION-PAYLOAD NOTES: `attack_resolved` is a public/redacted union,
 * but BOTH arms require `roll`, `hit`, and `toHitNumber`, so those are
 * listed and presence-checked across the union; `unit_destroyed`'s
 * redacted arm is `{unitId}` only, so it stays empty here and its
 * public-arm retention contract is enforced by the damage pack's union
 * schema and tests.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { CampaignEventType } from '@/types/campaign/CampaignSync';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import { UnsupportedReplayHistoryError } from './ReplaySchemaRegistry';

/** How one variant's nondeterministic replay inputs are satisfied. */
export interface IReplayInputProvenance {
  readonly randomness: readonly string[];
  readonly time: readonly string[];
  readonly catalogRules: readonly string[];
  readonly external: readonly string[];
}

const NONE: IReplayInputProvenance = Object.freeze({
  randomness: Object.freeze([]),
  time: Object.freeze([]),
  catalogRules: Object.freeze([]),
  external: Object.freeze([]),
});

const provenance = (
  parts: Partial<IReplayInputProvenance>,
): IReplayInputProvenance =>
  Object.freeze({
    randomness: Object.freeze([...(parts.randomness ?? [])]),
    time: Object.freeze([...(parts.time ?? [])]),
    catalogRules: Object.freeze([...(parts.catalogRules ?? [])]),
    external: Object.freeze([...(parts.external ?? [])]),
  });

/** The exhaustive per-discriminant provenance manifest. */
export const REPLAY_INPUT_PROVENANCE_MANIFEST = {
  // Campaign - committed results; catalog-derived snapshots are stored.
  CampaignDayAdvanced: provenance({ time: ['newDay'] }),
  FundsChanged: NONE,
  PilotHired: provenance({ catalogRules: ['pilot'] }),
  ContractAccepted: provenance({ catalogRules: ['contract'] }),
  RosterUnitChanged: provenance({ catalogRules: ['unit'] }),
  SalvageAllocated: provenance({ catalogRules: ['value'] }),
  CampaignSnapshotPublished: provenance({ catalogRules: ['state'] }),

  // Combat lifecycle / initiative.
  [GameEventType.GameCreated]: provenance({
    catalogRules: ['config', 'units'],
  }),
  [GameEventType.GameStarted]: NONE,
  [GameEventType.GameEnded]: NONE,
  [GameEventType.TurnStarted]: NONE,
  [GameEventType.TurnEnded]: NONE,
  [GameEventType.PhaseChanged]: NONE,
  [GameEventType.InitiativeRolled]: provenance({
    randomness: ['playerRoll', 'opponentRoll'],
  }),
  [GameEventType.InitiativeOrderSet]: NONE,

  // Combat movement / facing - MP and heat are rules-derived, stored.
  [GameEventType.MovementDeclared]: provenance({
    catalogRules: ['mpUsed', 'heatGenerated'],
  }),
  [GameEventType.MovementInvalid]: NONE,
  [GameEventType.MovementLocked]: NONE,
  [GameEventType.RuntimeMovementStateChanged]: NONE,
  [GameEventType.MovementEnhancementActivated]: NONE,
  [GameEventType.FacingChanged]: NONE,

  // Combat ranged / indirect.
  [GameEventType.AttackDeclared]: provenance({
    catalogRules: ['toHitNumber'],
  }),
  [GameEventType.AttackInvalid]: NONE,
  [GameEventType.AttackLocked]: NONE,
  [GameEventType.AttacksRevealed]: NONE,
  [GameEventType.AttackResolved]: provenance({
    randomness: ['roll', 'hit'],
    catalogRules: ['toHitNumber'],
  }),
  [GameEventType.SpottingDeclared]: provenance({ time: ['turn'] }),
  [GameEventType.IndirectFireSpotterSelected]: NONE,
  [GameEventType.IndirectFireSpotterLost]: NONE,
  [GameEventType.IndirectFireForwardObserver]: NONE,
  [GameEventType.IndirectFireNarcOverride]: NONE,
  [GameEventType.AmmoConsumed]: NONE,
  [GameEventType.AMSInterception]: provenance({
    randomness: ['roll', 'projectilesIntercepted'],
  }),
  [GameEventType.DesignatorMarkerApplied]: provenance({ time: ['turn'] }),

  // Combat damage / heat / critical.
  [GameEventType.DamageApplied]: provenance({ randomness: ['location'] }),
  [GameEventType.HeatGenerated]: NONE,
  [GameEventType.HeatDissipated]: NONE,
  [GameEventType.HeatEffectApplied]: NONE,
  [GameEventType.PilotHit]: NONE,
  // Union payload - see the header's union-payload notes.
  [GameEventType.UnitDestroyed]: NONE,
  [GameEventType.AmmoExplosion]: provenance({ catalogRules: ['damage'] }),
  [GameEventType.CriticalHit]: provenance({ randomness: ['location'] }),
  [GameEventType.CriticalHitResolved]: provenance({
    randomness: ['slotIndex'],
  }),
  [GameEventType.LocationDestroyed]: NONE,
  [GameEventType.TransferDamage]: NONE,
  [GameEventType.ComponentDestroyed]: NONE,

  // Combat physical / PSR / ground objects.
  [GameEventType.PSRTriggered]: NONE,
  [GameEventType.PSRResolved]: provenance({
    randomness: ['roll', 'passed'],
    catalogRules: ['targetNumber'],
  }),
  [GameEventType.UnitFell]: provenance({
    randomness: ['newFacing'],
    catalogRules: ['fallDamage'],
  }),
  [GameEventType.UnitStuck]: NONE,
  [GameEventType.UnitStood]: provenance({
    randomness: ['roll'],
    time: ['turn'],
    catalogRules: ['targetNumber'],
  }),
  [GameEventType.PhysicalAttackDeclared]: provenance({
    catalogRules: ['toHitNumber'],
  }),
  [GameEventType.PhysicalAttackLocked]: NONE,
  [GameEventType.PhysicalAttackResolved]: provenance({
    randomness: ['roll', 'hit'],
    catalogRules: ['toHitNumber'],
  }),
  [GameEventType.GroundObjectPickedUp]: provenance({
    catalogRules: ['capacityTonnage'],
  }),
  [GameEventType.GroundObjectDropped]: NONE,

  // Combat vehicle / represented system state.
  [GameEventType.ShutdownCheck]: provenance({
    randomness: ['roll', 'shutdownOccurred'],
    catalogRules: ['targetNumber'],
  }),
  [GameEventType.StartupAttempt]: provenance({
    randomness: ['roll', 'success'],
    catalogRules: ['targetNumber'],
  }),
  [GameEventType.NeuralInterfaceStateChanged]: provenance({
    time: ['turn'],
  }),
  [GameEventType.MotiveDamaged]: provenance({ randomness: ['severity'] }),
  [GameEventType.MotivePenaltyApplied]: NONE,
  [GameEventType.VehicleImmobilized]: NONE,
  [GameEventType.TurretLocked]: NONE,
  [GameEventType.VehicleCrewStunned]: NONE,
  [GameEventType.VTOLCrashCheck]: provenance({
    catalogRules: ['fallDamage'],
  }),

  // Combat terrain / mission / morale / withdrawal.
  [GameEventType.CommandResultPublished]: provenance({
    external: ['result'],
  }),
  [GameEventType.TerrainChanged]: NONE,
  [GameEventType.MinefieldChanged]: NONE,
  [GameEventType.EmpMinefieldEffectApplied]: provenance({
    randomness: ['roll', 'modifiedRoll'],
    catalogRules: ['modifier'],
  }),
  [GameEventType.RetreatTriggered]: NONE,
  [GameEventType.UnitRetreated]: provenance({ time: ['turn'] }),
  [GameEventType.UnitEjected]: provenance({ time: ['turn'] }),
  [GameEventType.ObjectiveCaptured]: provenance({ time: ['turn'] }),
  [GameEventType.ObjectiveLost]: provenance({ time: ['turn'] }),
  [GameEventType.ObjectiveProgress]: provenance({ time: ['turn'] }),
  [GameEventType.MoraleShifted]: provenance({ time: ['turn'] }),
  [GameEventType.WithdrawalDeclared]: provenance({ time: ['turn'] }),
  [GameEventType.ForcedWithdrawalTriggered]: provenance({ time: ['turn'] }),

  // Combat battle armor.
  [GameEventType.TrooperKilled]: provenance({ randomness: ['trooperIndex'] }),
  [GameEventType.SquadEliminated]: NONE,
  [GameEventType.SwarmAttached]: provenance({
    randomness: ['rollTotal'],
    catalogRules: ['targetNumber'],
  }),
  [GameEventType.SwarmDamage]: provenance({ randomness: ['locationLabel'] }),
  [GameEventType.SwarmDismounted]: NONE,
  [GameEventType.LegAttack]: provenance({ randomness: ['success'] }),
  [GameEventType.LegAttackResolved]: provenance({
    randomness: ['hit', 'hitLocation', 'critModifier'],
  }),
  [GameEventType.VibroClawAttackResolved]: provenance({
    randomness: ['missileHits'],
  }),
  [GameEventType.MimeticBonus]: NONE,
  [GameEventType.StealthBonus]: NONE,
} as const satisfies Record<
  CampaignEventType | GameEventType,
  IReplayInputProvenance
>;

/**
 * All manifest-listed required-input fields for one discriminant,
 * flattened across the four categories.
 */
export function requiredReplayInputFields(
  eventType: string,
): readonly string[] {
  const entry = (
    REPLAY_INPUT_PROVENANCE_MANIFEST as Record<
      string,
      IReplayInputProvenance | undefined
    >
  )[eventType];
  if (!entry) return Object.freeze([]);
  return Object.freeze([
    ...entry.randomness,
    ...entry.time,
    ...entry.catalogRules,
    ...entry.external,
  ]);
}

/**
 * Rejects a supported payload that lacks a manifest-declared resolved
 * input. Verification only - the payload is never mutated and nothing
 * is recomputed or refetched from current services; absence fails
 * typed so the affected history is quarantined rather than repaired.
 */
export function assertReplayInputProvenance(
  eventType: string,
  payload: unknown,
): void {
  const fields = requiredReplayInputFields(eventType);
  if (fields.length === 0) return;
  const record =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : undefined;
  // Absence means the key is undefined; an explicit null is a stored
  // value and stays the schema's concern, not a provenance gap.
  const missing = fields.filter(
    (field) => record === undefined || record[field] === undefined,
  );
  if (missing.length > 0)
    throw new UnsupportedReplayHistoryError(
      'missing-required-input',
      eventType,
      1,
      `Payload for ${eventType} lacks required resolved input(s): ${missing.join(', ')}`,
    );
}
