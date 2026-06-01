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
 * passes a session snapshot in and gets a `Result<IGameEvent[],
 * IntentRejection>` back.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md "Side Ownership"
 */

import {
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameIntent,
  type IGameSession,
  type IWeaponAttackData,
  canLocalPeerControlSide,
  canLocalPeerControlUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  type Facing,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type MovementType,
} from '@/types/gameplay/HexGridInterfaces';
import {
  createAttackDeclaredEvent,
  createAttackLockedEvent,
} from '@/utils/gameplay/gameEvents/combat';
import {
  createMovementDeclaredEvent,
  createMovementLockedEvent,
} from '@/utils/gameplay/gameEvents/movement';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents/turnPhase';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  gridWithUnitOccupants,
  validateCommittedMovement,
} from '@/utils/gameplay/movement';

// =============================================================================
// Public payload shapes
// =============================================================================

/**
 * Payload the guest UI sends with a `declareMovement` intent. Mirrors
 * the parameters of `applyMovement` on the host's `InteractiveSession`
 * but expressed as a flat data record so it serializes cleanly through
 * the Yjs channel.
 */
export interface IDeclareMovementIntentPayload {
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly mpUsed: number;
  readonly heatGenerated: number;
  readonly path?: readonly IHexCoordinate[];
}

/**
 * Payload for a `declareAttack` intent. The host re-derives the actual
 * to-hit modifiers + range bracket from authoritative state at resolve
 * time; the intent only needs to name the attacker, target and weapon
 * picks plus the snapshot of weapon stats the UI was looking at.
 */
export interface IDeclareAttackIntentPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weapons: readonly string[];
  readonly toHitNumber: number;
  readonly weaponAttacks?: readonly IWeaponAttackData[];
}

/**
 * Payload for an `endPhase` intent — the guest is asking the host to
 * advance through the current phase. Host validates that the local
 * phase matches the intent's `phase` to refuse stale clicks.
 */
export interface IEndPhaseIntentPayload {
  readonly phase: GamePhase;
}

// =============================================================================
// Translation result
// =============================================================================

export type IntentRejectionReason =
  | 'no-active-session'
  | 'malformed-payload'
  | 'wrong-phase'
  | 'unowned-unit'
  | 'illegal-movement'
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

export type IntentTranslationResult = IIntentTranslation | IIntentRejection;

export interface IIntentMovementRules {
  readonly grid: IHexGrid;
  readonly movementByUnit: ReadonlyMap<string, IMovementCapability>;
}

export interface IIntentTranslationOptions {
  readonly movementRules?: IIntentMovementRules;
}

// =============================================================================
// Translation entry point
// =============================================================================

/**
 * Validate a guest-authored intent against the host's current session
 * and produce the events the host should append. Returns a structured
 * rejection when the intent is malformed, out-of-phase, or attempts
 * to mutate a unit the guest does not own.
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
  options: IIntentTranslationOptions = {},
): IntentTranslationResult {
  if (!session) {
    return { ok: false, reason: 'no-active-session' };
  }

  switch (intent.type) {
    case 'declareMovement':
      return translateDeclareMovement(intent, session, options);
    case 'declareAttack':
      return translateDeclareAttack(intent, session);
    case 'endPhase':
      return translateEndPhase(intent, session);
    case 'concede':
      return translateConcede(intent, session);
    case 'declarePhysical':
    case 'confirmHeat':
      // These intents are reserved by the spec but not yet wired into
      // the host translator; UI consumers can broadcast them today and
      // the host will surface a structured rejection so the guest sees
      // a deterministic "not implemented" toast instead of a silent
      // drop. Promoting them to translated events is a Wave 5 polish.
      return { ok: false, reason: 'unsupported-intent', detail: intent.type };
  }
}

// =============================================================================
// Per-intent translators
// =============================================================================

function translateDeclareMovement(
  intent: IGameIntent,
  session: IGameSession,
  options: IIntentTranslationOptions,
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

  const resolvedMovement = resolveHostMovementPayload(
    payload,
    session,
    options.movementRules,
  );
  if (!resolvedMovement.ok) return resolvedMovement;

  const baseSeq = session.events.length;
  const declared = createMovementDeclaredEvent(
    session.id,
    baseSeq,
    session.currentState.turn,
    payload.unitId,
    resolvedMovement.from,
    payload.to,
    payload.facing,
    payload.movementType,
    resolvedMovement.mpUsed,
    resolvedMovement.heatGenerated,
    resolvedMovement.path,
  );
  const locked = createMovementLockedEvent(
    session.id,
    baseSeq + 1,
    session.currentState.turn,
    payload.unitId,
  );

  return { ok: true, events: [declared, locked] };
}

type ResolvedMovementPayload =
  | {
      readonly ok: true;
      readonly from: IHexCoordinate;
      readonly mpUsed: number;
      readonly heatGenerated: number;
      readonly path?: readonly IHexCoordinate[];
    }
  | IIntentRejection;

function resolveHostMovementPayload(
  payload: IDeclareMovementIntentPayload,
  session: IGameSession,
  movementRules: IIntentMovementRules | undefined,
): ResolvedMovementPayload {
  if (!movementRules) {
    return {
      ok: true,
      from: payload.from,
      mpUsed: payload.mpUsed,
      heatGenerated: payload.heatGenerated,
      path: payload.path,
    };
  }

  const unit = session.currentState.units[payload.unitId];
  if (!unit) {
    return {
      ok: false,
      reason: 'malformed-payload',
      detail: `Unknown unit ${payload.unitId}`,
    };
  }

  if (!hexEquals(payload.from, unit.position)) {
    return {
      ok: false,
      reason: 'illegal-movement',
      detail: `Intent starts at (${payload.from.q}, ${payload.from.r}) but unit ${payload.unitId} is at (${unit.position.q}, ${unit.position.r})`,
    };
  }

  const validation = validateCommittedMovement({
    grid: gridWithUnitOccupants(movementRules.grid, session.currentState.units),
    unit,
    to: payload.to,
    facing: payload.facing,
    movementType: payload.movementType,
    capability: movementRules.movementByUnit.get(payload.unitId),
    path: payload.path,
  });

  if (!validation.valid) {
    return {
      ok: false,
      reason: 'illegal-movement',
      detail: validation.details,
    };
  }

  return {
    ok: true,
    from: unit.position,
    mpUsed: validation.mpCost,
    heatGenerated: validation.heatGenerated,
    path: validation.path,
  };
}

function translateDeclareAttack(
  intent: IGameIntent,
  session: IGameSession,
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

  const baseSeq = session.events.length;
  const declared = createAttackDeclaredEvent(
    session.id,
    baseSeq,
    session.currentState.turn,
    payload.attackerId,
    payload.targetId,
    payload.weapons,
    payload.toHitNumber,
    [],
    payload.weaponAttacks,
  );
  const locked = createAttackLockedEvent(
    session.id,
    baseSeq + 1,
    session.currentState.turn,
    payload.attackerId,
  );

  return { ok: true, events: [declared, locked] };
}

function translateEndPhase(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asEndPhasePayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== payload.phase) {
    return { ok: false, reason: 'wrong-phase' };
  }

  // The guest can request "end my movement turn" / "end my weapon
  // turn" only when they own at least one unit on the board. Without
  // ownership, an end-phase request is meaningless and we reject
  // rather than silently advance — keeps the host log free of stale
  // input from third peers that somehow snuck a rebroadcast in.
  const guestOwnsAnySide =
    canLocalPeerControlSide(session, intent.authorPeerId, GameSide.Player) ||
    canLocalPeerControlSide(session, intent.authorPeerId, GameSide.Opponent);
  if (!guestOwnsAnySide) {
    return { ok: false, reason: 'unowned-unit' };
  }

  // Phase transitions are owned by the host's `advancePhase` reducer
  // because they may carry side-effects (initiative resolution,
  // heat dissipation, etc.). Translating an `endPhase` intent into a
  // raw `PhaseChanged` event would skip those side-effects, so we
  // emit a marker event the host wiring layer treats as "call
  // advancePhase()". The integration test covers the round trip.
  const seq = session.events.length;
  const marker = createPhaseChangedEvent(
    session.id,
    seq,
    session.currentState.turn,
    payload.phase,
    payload.phase,
  );

  return { ok: true, events: [marker] };
}

function translateConcede(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  if (
    !canLocalPeerControlSide(session, intent.authorPeerId, GameSide.Player) &&
    !canLocalPeerControlSide(session, intent.authorPeerId, GameSide.Opponent)
  ) {
    return { ok: false, reason: 'unowned-unit' };
  }
  // The host's `concede(side)` takes care of constructing the
  // GameEnded event with the correct winner. We surface a sentinel
  // shape the host wiring routes to `concede()` instead of a synthetic
  // GameEnded event so the existing tryFinalizeAndPublish path runs
  // (campaign hook, outcome bus emit). Wave 5 follow-up will make this
  // a first-class translator output once the host harness needs it.
  return { ok: false, reason: 'unsupported-intent', detail: 'concede' };
}

// =============================================================================
// Payload shape guards
// =============================================================================

function asMovementPayload(
  payload: unknown,
): IDeclareMovementIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string') return null;
  if (!isHexCoord(payload.from) || !isHexCoord(payload.to)) return null;
  if (typeof payload.facing !== 'number') return null;
  if (typeof payload.movementType !== 'string') return null;
  if (typeof payload.mpUsed !== 'number') return null;
  if (typeof payload.heatGenerated !== 'number') return null;
  if (
    payload.path !== undefined &&
    !(Array.isArray(payload.path) && payload.path.every(isHexCoord))
  ) {
    return null;
  }
  return payload as unknown as IDeclareMovementIntentPayload;
}

function asAttackPayload(payload: unknown): IDeclareAttackIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.attackerId !== 'string') return null;
  if (typeof payload.targetId !== 'string') return null;
  if (
    !Array.isArray(payload.weapons) ||
    !payload.weapons.every((value) => typeof value === 'string')
  ) {
    return null;
  }
  if (typeof payload.toHitNumber !== 'number') return null;
  return payload as unknown as IDeclareAttackIntentPayload;
}

function asEndPhasePayload(payload: unknown): IEndPhaseIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.phase !== 'string') return null;
  return payload as unknown as IEndPhaseIntentPayload;
}

function isHexCoord(value: unknown): value is IHexCoordinate {
  return (
    isRecord(value) &&
    typeof value.q === 'number' &&
    typeof value.r === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// =============================================================================
// Convenience: typed intent constructors for the guest UI
// =============================================================================

/**
 * Build a fully-formed `declareMovement` intent. The guest UI uses this
 * to keep the channel call site free of `as` casts; the host's
 * translator validates the shape regardless.
 */
export function buildDeclareMovementIntent(
  authorPeerId: string,
  payload: IDeclareMovementIntentPayload,
): IGameIntent {
  return {
    type: 'declareMovement',
    payload,
    authorPeerId,
  };
}

export function buildDeclareAttackIntent(
  authorPeerId: string,
  payload: IDeclareAttackIntentPayload,
): IGameIntent {
  return {
    type: 'declareAttack',
    payload,
    authorPeerId,
  };
}

export function buildEndPhaseIntent(
  authorPeerId: string,
  payload: IEndPhaseIntentPayload,
): IGameIntent {
  return {
    type: 'endPhase',
    payload,
    authorPeerId,
  };
}
