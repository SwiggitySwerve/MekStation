/**
 * Intent translation — guest → host action validation pipeline.
 *
 * Wave 4 multiplayer foundation B (`add-p2p-game-session-sync` § 5):
 * the guest peer never appends events directly. Instead it broadcasts
 * an `IGameIntent` that names the action it wants the host to perform.
 * The host receives the intent on `onPeerIntent`, validates it
 * (ownership, phase, basic shape), and either:
 *   - converts the intent into a host-authored event the host's engine
 *     appends through the normal reducer path; or
 *   - rejects the intent with a structured reason that the channel
 *     broadcasts back so the guest UI can surface a `peer-rejected`
 *     toast.
 *
 * This module is intentionally pure — it does NOT call into the
 * channel, the engine, or any side-effecty store. The host wiring
 * layer (`useHostIntentRouter`, server harness, integration tests)
 * passes a session snapshot in and gets translated host events, a
 * host-owned command, or a structured rejection back.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md "Side Ownership"
 */

import type {
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import { type IWeapon } from '@/simulation/ai/types';
import {
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameIntent,
  type IGameSession,
  canLocalPeerControlUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { getTorsoTwistFromSecondaryFacing } from '@/utils/gameplay/firingArc';
import { createWithdrawalDeclaredEvent } from '@/utils/gameplay/gameEvents/morale';
import { createFacingChangedEvent } from '@/utils/gameplay/gameEvents/movement';
import {
  createPhysicalAttackDeclaredEvent,
  createUnitEjectedEvent,
} from '@/utils/gameplay/gameEvents/statusPhysical';
import { requestSpot, validateTorsoTwist } from '@/utils/gameplay/gameSession';
import {
  getAllowedPhysicalAttackCount,
  physicalAttackDeclarationsForTurn,
  physicalAttackLimbForDeclaration,
  physicalAttackLimbsUsedThisTurn,
} from '@/utils/gameplay/physicalAttacks';

import {
  translateDeclareAttack,
  translateDeclareMovement,
} from './intentTranslationCombatTranslators';
import {
  translateActivateMovementEnhancement,
  translateConcede,
  translateConfirmHeat,
  translateEndPhase,
  translateGoProne,
  translateStand,
} from './intentTranslationCommandTranslators';
import {
  asEjectPayload,
  asPhysicalPayload,
  asRequestSpotPayload,
  asTorsoTwistPayload,
  asWithdrawPayload,
} from './intentTranslationPayloads';

export {
  buildActivateMovementEnhancementIntent,
  buildConcedeIntent,
  buildDeclareAttackIntent,
  buildDeclareMovementIntent,
  buildDeclarePhysicalIntent,
  buildEjectIntent,
  buildEndPhaseIntent,
  buildGoProneIntent,
  buildRequestSpotIntent,
  buildStandIntent,
  buildTorsoTwistIntent,
  buildWithdrawIntent,
  type IActivateMovementEnhancementIntentPayload,
  type IConcedeIntentPayload,
  type IDeclareAttackIntentPayload,
  type IDeclareMovementIntentPayload,
  type IDeclarePhysicalIntentPayload,
  type IEjectIntentPayload,
  type IEndPhaseIntentPayload,
  type IGoProneIntentPayload,
  type IRequestSpotIntentPayload,
  type IStandIntentPayload,
  type ITorsoTwistIntentPayload,
  type IWithdrawIntentPayload,
} from './intentTranslationPayloads';

// =============================================================================
// Translation result
// =============================================================================

export type IntentRejectionReason =
  | 'no-active-session'
  | 'malformed-payload'
  | 'wrong-phase'
  | 'unowned-unit'
  | 'physical-attack-limit-reached'
  | 'physical-attack-limb-used'
  | 'unsupported-intent';

export interface IIntentRejection {
  readonly ok: false;
  readonly reason: IntentRejectionReason;
  readonly detail?: string;
}

export interface IIntentTranslation {
  readonly ok: true;
  /**
   * Events to append in order. For example a `declareMovement` intent
   * yields `[MovementDeclared, MovementLocked]` so the host atomically
   * commits the move.
   */
  readonly events: readonly IGameEvent[];
}

export type IntentTranslationCommand =
  | {
      readonly kind: 'advancePhase';
      readonly phase: GamePhase;
    }
  | {
      readonly kind: 'concede';
      readonly side: GameSide;
    }
  | {
      readonly kind: 'stand';
      readonly unitId: string;
    }
  | {
      readonly kind: 'goProne';
      readonly unitId: string;
    }
  | {
      readonly kind: 'activateMovementEnhancement';
      readonly unitId: string;
      readonly enhancement: 'MASC' | 'Supercharger';
    };

export interface IIntentCommandTranslation {
  readonly ok: true;
  readonly events: readonly IGameEvent[];
  readonly command: IntentTranslationCommand;
}

export type IntentTranslationResult =
  | IIntentTranslation
  | IIntentCommandTranslation
  | IIntentRejection;

export interface IIntentTranslationAuthorityContext {
  readonly movementGrid?: IHexGrid;
  readonly movementByUnit?: ReadonlyMap<string, IMovementCapability>;
  readonly weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}

// =============================================================================
// Translation entry point
// =============================================================================

/**
 * Validate a guest-authored intent against the host's current session
 * and produce the events or host-owned command the host should apply.
 * Returns a structured rejection when the intent is malformed, out-of-
 * phase, or attempts to mutate a unit the guest does not own.
 *
 * The host wiring layer typically:
 *   1. Listens via `channel.onPeerIntent`.
 *   2. Calls `translateIntentToEvents(intent, getSession(), getNextSeq)`.
 *   3. On `ok: true`, appends each event through the engine and lets
 *      the channel broadcast them.
 *   4. On `ok: false`, calls `channel.broadcastRejection({ reason })`
 *      so the guest UI shows a `peer-rejected` toast.
 */
export function translateIntentToEvents(
  intent: IGameIntent,
  session: IGameSession | null,
  authority?: IIntentTranslationAuthorityContext,
): IntentTranslationResult {
  if (!session) {
    return { ok: false, reason: 'no-active-session' };
  }

  const translator = INTENT_TRANSLATORS[intent.type];
  return translator
    ? translator(intent, session, authority)
    : { ok: false, reason: 'unsupported-intent' };
}

type IntentTranslator = (
  intent: IGameIntent,
  session: IGameSession,
  authority: IIntentTranslationAuthorityContext | undefined,
) => IntentTranslationResult;

const INTENT_TRANSLATORS: Partial<
  Record<IGameIntent['type'], IntentTranslator>
> = {
  declareMovement: translateDeclareMovement,
  stand: translateStand,
  goProne: translateGoProne,
  activateMovementEnhancement: translateActivateMovementEnhancement,
  torsoTwist: translateTorsoTwist,
  declareAttack: translateDeclareAttack,
  declarePhysical: translateDeclarePhysical,
  requestSpot: translateRequestSpot,
  eject: translateEject,
  withdraw: translateWithdraw,
  endPhase: translateEndPhase,
  concede: translateConcede,
  confirmHeat: translateConfirmHeat,
};

// =============================================================================
// Per-intent translators
// =============================================================================

function translateTorsoTwist(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asTorsoTwistPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const legality = validateTorsoTwist(
    session,
    payload.unitId,
    payload.secondaryFacing,
  );
  if (!legality.ok) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: legality.reason,
    };
  }

  const unit = session.currentState.units[payload.unitId];
  const twist = getTorsoTwistFromSecondaryFacing(
    unit.facing,
    legality.secondaryFacing,
  );
  const event = createFacingChangedEvent(
    session.id,
    session.events.length,
    session.currentState.turn,
    GamePhase.WeaponAttack,
    payload.unitId,
    {
      secondaryFacing: legality.secondaryFacing,
      ...(twist ? { torsoTwist: twist } : {}),
    },
  );

  return { ok: true, events: [event] };
}

function translateDeclarePhysical(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asPhysicalPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.PhysicalAttack) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (
    !canLocalPeerControlUnit(session, intent.authorPeerId, payload.attackerId)
  ) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const attacker = session.currentState.units[payload.attackerId];
  const declarationsThisTurn = physicalAttackDeclarationsForTurn(
    session.events,
    session.currentState.turn,
    payload.attackerId,
  );
  const allowedPhysicalAttacks = getAllowedPhysicalAttackCount(
    attacker?.abilities,
  );
  if (declarationsThisTurn.length >= allowedPhysicalAttacks) {
    return { ok: false, reason: 'physical-attack-limit-reached' };
  }
  const declaredLimb = physicalAttackLimbForDeclaration(payload.attackType, {
    limb: payload.limb,
  });
  if (
    declaredLimb &&
    physicalAttackLimbsUsedThisTurn(
      session.events,
      session.currentState.turn,
      payload.attackerId,
    ).includes(declaredLimb)
  ) {
    return { ok: false, reason: 'physical-attack-limb-used' };
  }

  const event = createPhysicalAttackDeclaredEvent(
    session.id,
    session.events.length,
    session.currentState.turn,
    payload.attackerId,
    payload.targetId,
    payload.attackType,
    payload.toHitNumber ?? attacker?.piloting ?? 5,
    declaredLimb,
  );

  return { ok: true, events: [event] };
}

function translateRequestSpot(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asRequestSpotPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const eventCountBeforeDeclaration = session.events.length;
  try {
    const updatedSession = requestSpot(
      session,
      payload.unitId,
      payload.targetId,
    );
    return {
      ok: true,
      events: updatedSession.events.slice(eventCountBeforeDeclaration),
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function translateEject(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asEjectPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const event = createUnitEjectedEvent(
    session.id,
    session.events.length,
    session.currentState.turn,
    session.currentState.phase,
    payload.unitId,
    'player_declared',
  );
  return { ok: true, events: [event] };
}

function translateWithdraw(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asWithdrawPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const event = createWithdrawalDeclaredEvent(
    session.id,
    session.events.length,
    session.currentState.turn,
    session.currentState.phase,
    payload.unitId,
    payload.edge,
    'player',
  );
  return { ok: true, events: [event] };
}
