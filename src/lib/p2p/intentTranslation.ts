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

import { type IWeapon } from '@/simulation/ai/types';
import {
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameIntent,
  type IGameSession,
  canLocalPeerControlSide,
  canLocalPeerControlUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  RangeBracket,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { getTorsoTwistFromSecondaryFacing } from '@/utils/gameplay/firingArc';
import { createAttackLockedEvent } from '@/utils/gameplay/gameEvents/combat';
import { createWithdrawalDeclaredEvent } from '@/utils/gameplay/gameEvents/morale';
import {
  createMovementDeclaredEvent,
  createFacingChangedEvent,
  createMovementLockedEvent,
} from '@/utils/gameplay/gameEvents/movement';
import {
  createPhysicalAttackDeclaredEvent,
  createUnitEjectedEvent,
} from '@/utils/gameplay/gameEvents/statusPhysical';
import {
  declareAttack,
  validateTorsoTwist,
} from '@/utils/gameplay/gameSession';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import {
  getAllowedPhysicalAttackCount,
  physicalAttackDeclarationsForTurn,
  physicalAttackLimbForDeclaration,
  physicalAttackLimbsUsedThisTurn,
} from '@/utils/gameplay/physicalAttacks';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import {
  asActivateMovementEnhancementPayload,
  asAttackPayload,
  asConcedePayload,
  asEjectPayload,
  asEndPhasePayload,
  asGoPronePayload,
  asMovementPayload,
  asPhysicalPayload,
  asStandPayload,
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

  switch (intent.type) {
    case 'declareMovement':
      return translateDeclareMovement(intent, session, authority);
    case 'stand':
      return translateStand(intent, session);
    case 'goProne':
      return translateGoProne(intent, session);
    case 'activateMovementEnhancement':
      return translateActivateMovementEnhancement(intent, session);
    case 'torsoTwist':
      return translateTorsoTwist(intent, session);
    case 'declareAttack':
      return translateDeclareAttack(intent, session, authority);
    case 'declarePhysical':
      return translateDeclarePhysical(intent, session);
    case 'eject':
      return translateEject(intent, session);
    case 'withdraw':
      return translateWithdraw(intent, session);
    case 'endPhase':
      return translateEndPhase(intent, session);
    case 'concede':
      return translateConcede(intent, session);
    case 'confirmHeat':
      return translateConfirmHeat(intent, session);
  }
}

// =============================================================================
// Per-intent translators
// =============================================================================

function translateDeclareMovement(
  intent: IGameIntent,
  session: IGameSession,
  authority: IIntentTranslationAuthorityContext | undefined,
): IntentTranslationResult {
  const payload = asMovementPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const unit = session.currentState.units[payload.unitId];
  if (!unit) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: `Unit '${payload.unitId}' does not exist`,
    };
  }

  if (!hexEquals(payload.from, unit.position)) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Movement origin does not match authoritative host state',
    };
  }

  const grid = authority?.movementGrid;
  const capability = authority?.movementByUnit?.get(payload.unitId);
  if (!grid || !capability) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Host movement authority is unavailable',
    };
  }

  const validation = validateMovement(
    grid,
    {
      unitId: payload.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: unit.prone ?? false,
    },
    payload.to,
    payload.facing,
    payload.movementType,
    capability,
    unit.heat,
    undefined,
    { pilotAbilities: unit.abilities },
  );
  if (!validation.valid) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: validation.error ?? 'Invalid movement',
    };
  }

  const eventPath = buildMovementEventPath({
    grid,
    from: unit.position,
    to: payload.to,
    movementType: payload.movementType,
    maxCost: Math.min(
      validation.mpCost,
      maxMovementCostForCapability(capability, payload.movementType),
    ),
    movementContext: { pilotAbilities: unit.abilities },
  });

  const baseSeq = session.events.length;
  const declared = createMovementDeclaredEvent(
    session.id,
    baseSeq,
    session.currentState.turn,
    payload.unitId,
    unit.position,
    payload.to,
    payload.facing,
    payload.movementType,
    validation.mpCost,
    validation.heatGenerated,
    eventPath,
  );
  const locked = createMovementLockedEvent(
    session.id,
    baseSeq + 1,
    session.currentState.turn,
    payload.unitId,
  );

  return { ok: true, events: [declared, locked] };
}

function translateStand(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asStandPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'stand', unitId: payload.unitId },
  };
}

function translateGoProne(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asGoPronePayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'goProne', unitId: payload.unitId },
  };
}

function translateActivateMovementEnhancement(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asActivateMovementEnhancementPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: {
      kind: 'activateMovementEnhancement',
      unitId: payload.unitId,
      enhancement: payload.enhancement,
    },
  };
}

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

function translateDeclareAttack(
  intent: IGameIntent,
  session: IGameSession,
  authority: IIntentTranslationAuthorityContext | undefined,
): IntentTranslationResult {
  const payload = asAttackPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (
    !canLocalPeerControlUnit(session, intent.authorPeerId, payload.attackerId)
  ) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const weaponsByUnit = authority?.weaponsByUnit;
  if (!weaponsByUnit) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Host weapon authority is unavailable',
    };
  }

  const weaponAttacks = buildWeaponAttacks(
    payload.weapons,
    weaponsByUnit.get(payload.attackerId) ?? [],
    payload.attackerId,
  );
  if (weaponAttacks.length !== payload.weapons.length) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'One or more declared weapons are unavailable on the attacker',
    };
  }

  const eventCountBeforeDeclaration = session.events.length;
  let updatedSession = declareAttack(
    session,
    payload.attackerId,
    payload.targetId,
    weaponAttacks,
    3,
    RangeBracket.Short,
  );
  const declarationEmitted = updatedSession.events
    .slice(eventCountBeforeDeclaration)
    .some((event) => event.type === 'attack_declared');
  if (declarationEmitted) {
    updatedSession = {
      ...updatedSession,
      events: [
        ...updatedSession.events,
        createAttackLockedEvent(
          updatedSession.id,
          updatedSession.events.length,
          session.currentState.turn,
          payload.attackerId,
        ),
      ],
    };
  }

  return {
    ok: true,
    events: updatedSession.events.slice(eventCountBeforeDeclaration),
  };
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

function translateEndPhase(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asEndPhasePayload(intent.payload);
  if (!payload) return { ok: false, reason: 'malformed-payload' };

  if (session.currentState.phase !== payload.phase) {
    return { ok: false, reason: 'wrong-phase' };
  }

  // The guest can request "end my movement turn" / "end my weapon
  // turn" only when they own at least one unit on the board. Without
  // ownership, an end-phase request is meaningless and we reject
  // rather than silently advance — keeps the host log free of stale
  // input from third peers that somehow snuck a rebroadcast in.
  if (!peerOwnsAnySide(session, intent.authorPeerId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'advancePhase', phase: payload.phase },
  };
}

function translateConfirmHeat(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  if (session.currentState.phase !== GamePhase.Heat)
    return { ok: false, reason: 'wrong-phase' };

  return peerOwnsAnySide(session, intent.authorPeerId)
    ? {
        ok: true,
        events: [],
        command: { kind: 'advancePhase', phase: GamePhase.Heat },
      }
    : { ok: false, reason: 'unowned-unit' };
}

function translateConcede(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asConcedePayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (!canLocalPeerControlSide(session, intent.authorPeerId, payload.side)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'concede', side: payload.side },
  };
}

function peerOwnsAnySide(session: IGameSession, peerId: string): boolean {
  return (
    canLocalPeerControlSide(session, peerId, GameSide.Player) ||
    canLocalPeerControlSide(session, peerId, GameSide.Opponent)
  );
}
