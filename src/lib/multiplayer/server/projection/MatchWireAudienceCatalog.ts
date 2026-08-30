/**
 * Versioned audience catalog for the live match wire (authority-audit
 * PR 8, design D2).
 *
 * v2 declares an EXPLICIT decision for every GameEventType the match
 * wire can carry. Tactical declarations are sealed to their actor and
 * the GM until the committed reveal boundary; every other event stays
 * public. The project function is identity pass-through: the payload
 * object is returned unchanged so host stamps (rolls, intentId) stay
 * byte-identical. A future audience rule MUST land as a new
 * projectorVersion with a reviewed decision.
 *
 * Adding a GameEventType without a catalog entry is a compile error
 * (`satisfies Record<GameEventType, IPublicAudienceDecision>`).
 * Lobby / Error / Pong / Heartbeat control frames are not events and
 * stay outside this catalog.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';
import type {
  IPublicAudienceDecision,
  IViewerAudienceEventDecision,
  IViewerAudienceProjectorDefinition,
} from './ViewerAudienceProjector';
import type { JsonValue } from './ViewerProjectionTypes';

import { ViewerAudienceProjector } from './ViewerAudienceProjector';

/** Catalog identity. Bump when any match-wire decision kind changes. */
export const MATCH_WIRE_PROJECTOR_VERSION = 2;

/** Stream type used when this catalog is registered as a projector. */
export const MATCH_WIRE_STREAM_TYPE = 'match-wire';

/**
 * Identity projector for match-wire events.
 *
 * Why identity: the match wire format must not change. Returning the
 * same payload reference keeps stamps on the envelope byte-identical
 * to the raw host frame. Do not clone, destamp, or reshape here.
 */
export function projectMatchWirePayloadUnchanged(
  payload: unknown,
  _viewer: IAuthorizedViewer,
): JsonValue {
  return payload as JsonValue;
}

/**
 * The single public decision reused for ordinary catalog entries.
 * Frozen so a caller cannot swap kind after module load.
 */
export const MATCH_WIRE_PUBLIC_IDENTITY: IPublicAudienceDecision =
  Object.freeze({
    kind: 'public',
    project: projectMatchWirePayloadUnchanged,
  });

const PUBLIC = MATCH_WIRE_PUBLIC_IDENTITY;
const SEALED_TO_ACTOR_UNTIL_REVEALED = Object.freeze({
  kind: 'sealed-to-actor-until-revealed' as const,
  project: projectMatchWirePayloadUnchanged,
});

/**
 * Exhaustive v2 map: only tactical declaration events are sealed.
 */
export const MATCH_WIRE_V2_DECISIONS = {
  [GameEventType.GameCreated]: PUBLIC,
  [GameEventType.GameStarted]: PUBLIC,
  [GameEventType.GameEnded]: PUBLIC,
  [GameEventType.TurnStarted]: PUBLIC,
  [GameEventType.TurnEnded]: PUBLIC,
  [GameEventType.PhaseChanged]: PUBLIC,
  [GameEventType.InitiativeRolled]: PUBLIC,
  [GameEventType.InitiativeOrderSet]: PUBLIC,
  [GameEventType.MovementDeclared]: SEALED_TO_ACTOR_UNTIL_REVEALED,
  [GameEventType.MovementInvalid]: PUBLIC,
  [GameEventType.MovementLocked]: PUBLIC,
  [GameEventType.RuntimeMovementStateChanged]: PUBLIC,
  [GameEventType.MovementEnhancementActivated]: PUBLIC,
  [GameEventType.FacingChanged]: PUBLIC,
  [GameEventType.AttackDeclared]: SEALED_TO_ACTOR_UNTIL_REVEALED,
  [GameEventType.AttackLocked]: PUBLIC,
  [GameEventType.AttacksRevealed]: PUBLIC,
  [GameEventType.AttackResolved]: PUBLIC,
  [GameEventType.DamageApplied]: PUBLIC,
  [GameEventType.SpottingDeclared]: PUBLIC,
  [GameEventType.IndirectFireSpotterSelected]: PUBLIC,
  [GameEventType.IndirectFireSpotterLost]: PUBLIC,
  [GameEventType.IndirectFireForwardObserver]: PUBLIC,
  [GameEventType.IndirectFireNarcOverride]: PUBLIC,
  [GameEventType.HeatGenerated]: PUBLIC,
  [GameEventType.HeatDissipated]: PUBLIC,
  [GameEventType.HeatEffectApplied]: PUBLIC,
  [GameEventType.CommandResultPublished]: PUBLIC,
  [GameEventType.PilotHit]: PUBLIC,
  [GameEventType.UnitDestroyed]: PUBLIC,
  [GameEventType.TerrainChanged]: PUBLIC,
  [GameEventType.MinefieldChanged]: PUBLIC,
  [GameEventType.EmpMinefieldEffectApplied]: PUBLIC,
  [GameEventType.AmmoExplosion]: PUBLIC,
  [GameEventType.CriticalHit]: PUBLIC,
  [GameEventType.CriticalHitResolved]: PUBLIC,
  [GameEventType.PSRTriggered]: PUBLIC,
  [GameEventType.PSRResolved]: PUBLIC,
  [GameEventType.UnitFell]: PUBLIC,
  [GameEventType.UnitStuck]: PUBLIC,
  [GameEventType.UnitStood]: PUBLIC,
  [GameEventType.PhysicalAttackDeclared]: SEALED_TO_ACTOR_UNTIL_REVEALED,
  [GameEventType.PhysicalAttackLocked]: PUBLIC,
  [GameEventType.PhysicalAttackResolved]: PUBLIC,
  [GameEventType.GroundObjectPickedUp]: PUBLIC,
  [GameEventType.GroundObjectDropped]: PUBLIC,
  [GameEventType.ShutdownCheck]: PUBLIC,
  [GameEventType.StartupAttempt]: PUBLIC,
  [GameEventType.AmmoConsumed]: PUBLIC,
  [GameEventType.AMSInterception]: PUBLIC,
  [GameEventType.DesignatorMarkerApplied]: PUBLIC,
  [GameEventType.AttackInvalid]: PUBLIC,
  [GameEventType.LocationDestroyed]: PUBLIC,
  [GameEventType.TransferDamage]: PUBLIC,
  [GameEventType.ComponentDestroyed]: PUBLIC,
  [GameEventType.RetreatTriggered]: PUBLIC,
  [GameEventType.UnitRetreated]: PUBLIC,
  [GameEventType.UnitEjected]: PUBLIC,
  [GameEventType.NeuralInterfaceStateChanged]: PUBLIC,
  [GameEventType.MotiveDamaged]: PUBLIC,
  [GameEventType.MotivePenaltyApplied]: PUBLIC,
  [GameEventType.VehicleImmobilized]: PUBLIC,
  [GameEventType.TurretLocked]: PUBLIC,
  [GameEventType.VehicleCrewStunned]: PUBLIC,
  [GameEventType.VTOLCrashCheck]: PUBLIC,
  [GameEventType.TrooperKilled]: PUBLIC,
  [GameEventType.SquadEliminated]: PUBLIC,
  [GameEventType.SwarmAttached]: PUBLIC,
  [GameEventType.SwarmDamage]: PUBLIC,
  [GameEventType.SwarmDismounted]: PUBLIC,
  [GameEventType.LegAttack]: PUBLIC,
  [GameEventType.LegAttackResolved]: PUBLIC,
  [GameEventType.VibroClawAttackResolved]: PUBLIC,
  [GameEventType.MimeticBonus]: PUBLIC,
  [GameEventType.StealthBonus]: PUBLIC,
  [GameEventType.ObjectiveCaptured]: PUBLIC,
  [GameEventType.ObjectiveLost]: PUBLIC,
  [GameEventType.ObjectiveProgress]: PUBLIC,
  [GameEventType.MoraleShifted]: PUBLIC,
  [GameEventType.WithdrawalDeclared]: PUBLIC,
  [GameEventType.ForcedWithdrawalTriggered]: PUBLIC,
} as const satisfies Record<
  GameEventType,
  IViewerAudienceEventDecision['decision']
>;

/**
 * Lists every GameEventType the production catalog declares.
 * Used by the runtime pin for the v2 public-versus-sealed event policy.
 */
export function listedMatchWireEventTypes(): readonly GameEventType[] {
  return Object.freeze(Object.values(GameEventType));
}

/**
 * Builds the projector definition from the exhaustive v2 map.
 * Why a function: ViewerAudienceProjector copies then freezes
 * decisions at construction; callers must not share a mutable array.
 */
export function matchWireAudienceDefinition(): IViewerAudienceProjectorDefinition {
  const decisions: IViewerAudienceEventDecision[] = [];
  for (const eventType of listedMatchWireEventTypes()) {
    decisions.push({
      eventType,
      decision: MATCH_WIRE_V2_DECISIONS[eventType],
    });
  }
  return {
    projectorVersion: MATCH_WIRE_PROJECTOR_VERSION,
    streamType: MATCH_WIRE_STREAM_TYPE,
    decisions: Object.freeze(decisions),
  };
}

/**
 * Constructs the validated v2 match-wire audience projector.
 */
export function createMatchWireAudienceProjector(): ViewerAudienceProjector {
  return new ViewerAudienceProjector(matchWireAudienceDefinition());
}
