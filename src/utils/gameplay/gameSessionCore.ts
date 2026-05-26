import { v4 as uuidv4 } from 'uuid';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IEncounterMeta,
  IGameConfig,
  IGameCreatedPayload,
  IGameEvent,
  IGameSession,
  IGameUnit,
  IHexCoordinate,
  IToHitModifier,
  IWeaponAttack,
  IWeaponAttackData,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';

/**
 * Per `add-victory-and-post-battle-summary` design D3 + spec scenario
 * "Turn limit with near-equal damage is draw": tolerance against which
 * total damage delta is compared when deciding the turn-limit winner.
 *
 * The predicate is `|p - o| / max(p, o) <= TURN_LIMIT_DRAW_TOLERANCE`
 * with a `max === 0` short-circuit to draw (both sides dealt zero
 * damage). Codified as an exported constant so the
 * `GameOutcomeCalculator`, UI labels, and tests all read the same
 * number.
 */
export const TURN_LIMIT_DRAW_TOLERANCE = 0.05;

/**
 * Per `add-victory-and-post-battle-summary` design D3: pure predicate
 * answering "given the two sides' total damage, is this a draw under
 * the turn-limit rule?" Centralized so the engine, the
 * `GameOutcomeCalculator`, and tests all use one implementation. The
 * `max === 0` guard prevents division-by-zero on zero-damage matches
 * (spec scenario: "Turn limit with zero damage on both sides is
 * draw").
 */
export function isTurnLimitDraw(
  playerDamage: number,
  opponentDamage: number,
): boolean {
  const max = Math.max(playerDamage, opponentDamage);
  if (max === 0) return true;
  const delta = Math.abs(playerDamage - opponentDamage) / max;
  return delta <= TURN_LIMIT_DRAW_TOLERANCE;
}

import { type D6Roller, defaultD6Roller } from './diceTypes';
import {
  createAttackDeclaredEvent,
  createAttackLockedEvent,
  createGameCreatedEvent,
  createGameEndedEvent,
  createGameStartedEvent,
  createIndirectFireForwardObserverEvent,
  createIndirectFireNarcOverrideEvent,
  createIndirectFireSpotterSelectedEvent,
  createInitiativeOrderSetEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createPhaseChangedEvent,
} from './gameEvents';
import {
  invalidateEvadingAttackerAttack,
  invalidateInvalidTargetAttack,
  invalidateSprintingAttackerAttack,
} from './gameSessionAttackResolutionValidation';
import { appendEvent } from './gameSessionEvents';
import { allUnitsLocked, deriveState } from './gameState';
import {
  calculateSideInitiativeModifier,
  hasSideTacticalGeniusInitiativeReroll,
} from './initiativeModifiers';
import { isSemiGuidedLRM } from './specialWeaponMechanics';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
} from './toHit';

export interface ICreateGameSessionOptions {
  readonly id?: string;
  readonly createdAt?: string;
  readonly hostPeerId?: string | null;
  readonly guestPeerId?: string | null;
  readonly sideOwners?: Readonly<Record<GameSide, string>> | null;
  /**
   * Per `link-encounters-to-replays` PR 3: optional encounter snapshot
   * stamped onto the GameCreated event payload when the session
   * originated from an encounter launch. Read by the replay-library
   * backfill scan to recover encounter metadata when rebuilding the
   * manifest from disk. Null/omitted for non-encounter callers.
   */
  readonly encounterMeta?: IEncounterMeta;
}

export function createGameSession(
  config: IGameConfig,
  units: readonly IGameUnit[],
  options: ICreateGameSessionOptions = {},
): IGameSession {
  const id = options.id ?? uuidv4();
  const now = options.createdAt ?? new Date().toISOString();

  const createdEvent = createGameCreatedEvent(
    id,
    config,
    units,
    options.encounterMeta,
  );
  const events: IGameEvent[] = [createdEvent];
  const currentState = deriveState(id, events);

  return {
    id,
    matchId: id,
    createdAt: now,
    updatedAt: now,
    config,
    units,
    events,
    currentState,
    hostPeerId: options.hostPeerId,
    guestPeerId: options.guestPeerId,
    sideOwners: options.sideOwners,
  };
}

export function hydrateGameSessionFromEvents(
  matchId: string,
  events: readonly IGameEvent[],
): IGameSession {
  if (events.length === 0) {
    throw new Error('Match log not found');
  }

  const orderedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
  const createdEvent = orderedEvents[0];
  if (createdEvent.type !== GameEventType.GameCreated) {
    throw new Error('Match log not found');
  }

  const payload = createdEvent.payload as IGameCreatedPayload;
  const lastEvent = orderedEvents[orderedEvents.length - 1];

  return {
    id: matchId,
    matchId,
    createdAt: createdEvent.timestamp,
    updatedAt: lastEvent.timestamp,
    config: payload.config,
    units: payload.units,
    events: orderedEvents,
    currentState: deriveState(matchId, orderedEvents),
  };
}

export function startGame(
  session: IGameSession,
  firstSide: GameSide,
): IGameSession {
  if (session.currentState.status !== GameStatus.Setup) {
    throw new Error('Game is not in setup state');
  }

  const sequence = session.events.length;
  const event = createGameStartedEvent(session.id, sequence, firstSide);
  return appendEvent(session, event);
}

export function endGame(
  session: IGameSession,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective' | 'aborted',
): IGameSession {
  if (session.currentState.status !== GameStatus.Active) {
    throw new Error('Game is not active');
  }

  const { turn, phase } = session.currentState;
  const sequence = session.events.length;
  const event = createGameEndedEvent(
    session.id,
    sequence,
    turn,
    phase,
    winner,
    reason,
  );

  return appendEvent(session, event);
}

export { appendEvent } from './gameSessionEvents';

export function getEventsForTurn(
  session: IGameSession,
  turn: number,
): readonly IGameEvent[] {
  return session.events.filter((event) => event.turn === turn);
}

export function getEventsForPhase(
  session: IGameSession,
  turn: number,
  phase: GamePhase,
): readonly IGameEvent[] {
  return session.events.filter(
    (event) => event.turn === turn && event.phase === phase,
  );
}

export function getNextPhase(currentPhase: GamePhase): GamePhase {
  const phaseOrder: GamePhase[] = [
    GamePhase.Initiative,
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
    GamePhase.Heat,
    GamePhase.End,
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return GamePhase.Initiative;
  }

  return phaseOrder[currentIndex + 1];
}

export function advancePhase(session: IGameSession): IGameSession {
  const { phase, turn } = session.currentState;
  const nextPhase = getNextPhase(phase);
  const nextTurn =
    nextPhase === GamePhase.Initiative && phase !== GamePhase.Initiative
      ? turn + 1
      : turn;

  const sequence = session.events.length;
  const event = createPhaseChangedEvent(
    session.id,
    sequence,
    nextTurn,
    phase,
    nextPhase,
  );

  return appendEvent(session, event);
}

export function canAdvancePhase(session: IGameSession): boolean {
  const { phase, status } = session.currentState;

  if (status !== GameStatus.Active) {
    return false;
  }

  if (
    phase === GamePhase.Movement ||
    phase === GamePhase.WeaponAttack ||
    phase === GamePhase.PhysicalAttack
  ) {
    return allUnitsLocked(session.currentState);
  }

  return true;
}

export function roll2d6(diceRoller: D6Roller = defaultD6Roller): number {
  return diceRoller() + diceRoller();
}

export interface IInitiativeRollOptions {
  readonly tacticalGeniusRerollSide?: GameSide;
}

export function rollInitiative(
  session: IGameSession,
  movesFirst?: GameSide,
  diceRoller: D6Roller = defaultD6Roller,
  options: IInitiativeRollOptions = {},
): IGameSession {
  if (session.currentState.phase !== GamePhase.Initiative) {
    throw new Error('Not in initiative phase');
  }

  // Per `add-quick-resolve-monte-carlo`: accept an injectable D6 roller
  // so the Monte Carlo wrapper can drive initiative deterministically
  // from a SeededRandom. Default preserves prior behavior (Math.random).
  const initialPlayerRoll = roll2d6(diceRoller);
  const initialOpponentRoll = roll2d6(diceRoller);
  let playerRoll = initialPlayerRoll;
  let opponentRoll = initialOpponentRoll;
  const tacticalGeniusRerollSide =
    options.tacticalGeniusRerollSide &&
    hasSideTacticalGeniusInitiativeReroll(
      session.currentState,
      options.tacticalGeniusRerollSide,
    )
      ? options.tacticalGeniusRerollSide
      : undefined;

  if (tacticalGeniusRerollSide === GameSide.Player) {
    playerRoll = roll2d6(diceRoller);
  } else if (tacticalGeniusRerollSide === GameSide.Opponent) {
    opponentRoll = roll2d6(diceRoller);
  }
  const playerModifier = calculateSideInitiativeModifier(
    session.currentState,
    GameSide.Player,
  );
  const opponentModifier = calculateSideInitiativeModifier(
    session.currentState,
    GameSide.Opponent,
  );
  const playerTotal = playerRoll + playerModifier;
  const opponentTotal = opponentRoll + opponentModifier;

  let winner: GameSide;
  if (playerTotal > opponentTotal) {
    winner = GameSide.Player;
  } else if (opponentTotal > playerTotal) {
    winner = GameSide.Opponent;
  } else {
    winner = GameSide.Player;
  }

  const actualMovesFirst =
    movesFirst ??
    (winner === GameSide.Player ? GameSide.Opponent : GameSide.Player);

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const initiativeRolledEvent = createInitiativeRolledEvent(
    session.id,
    sequence,
    turn,
    playerRoll,
    opponentRoll,
    winner,
    actualMovesFirst,
    { playerModifier, opponentModifier },
    tacticalGeniusRerollSide
      ? {
          side: tacticalGeniusRerollSide,
          originalPlayerRoll: initialPlayerRoll,
          originalOpponentRoll: initialOpponentRoll,
        }
      : undefined,
  );
  const initiativeOrderSetEvent = createInitiativeOrderSetEvent(
    session.id,
    sequence + 1,
    turn,
    winner,
    actualMovesFirst,
  );

  return appendEvent(
    appendEvent(session, initiativeRolledEvent),
    initiativeOrderSetEvent,
  );
}

export function declareMovement(
  session: IGameSession,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpUsed: number,
  heatGenerated: number,
  path?: readonly IHexCoordinate[],
): IGameSession {
  if (session.currentState.phase !== GamePhase.Movement) {
    throw new Error('Not in movement phase');
  }

  const unit = session.currentState.units[unitId];
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createMovementDeclaredEvent(
    session.id,
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
    path,
  );

  return appendEvent(session, event);
}

export function lockMovement(
  session: IGameSession,
  unitId: string,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Movement) {
    throw new Error('Not in movement phase');
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createMovementLockedEvent(session.id, sequence, turn, unitId);

  return appendEvent(session, event);
}

// Firing arc is intentionally NOT a parameter here. It's computed at
// resolve time from current attacker/target positions so facing changes
// between declaration and resolution don't corrupt hit-location selection.
// (Per wire-firing-arc-resolution; previously `_firingArc` was accepted
// and silently discarded.)
export function declareAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weapons: readonly IWeaponAttack[],
  range: number,
  rangeBracket: RangeBracket,
  /**
   * Wave 8 PR-K4: optional pre-computed indirect-fire resolution. When
   * present and `permitted && isIndirect`, the resolution's `toHitPenalty`
   * is appended to the to-hit modifier list AND the appropriate indirect-
   * fire event (`IndirectFireSpotterSelected` / `IndirectFireNarcOverride`)
   * is emitted immediately after `AttackDeclared`. When undefined, the
   * function behaves identically to its pre-PR-K4 contract.
   *
   * Wave 8 PR-K11: also accepts the new `IAttackPreResolution`
   * discriminated union returned by `prepareAttackContext`. The union
   * is normalized internally - callers may pass either the bare
   * `IIndirectFireResolution` (legacy, pre-K11) OR the union (the
   * post-K11 callers). Back-compat preserved.
   */
  indirectFireResolutionInput?:
    | import('@/types/gameplay/IndirectFireInterfaces').IIndirectFireResolution
    | import('@/engine/attackContext').IAttackPreResolution,
  /**
   * Optional target hex carried on the indirect-fire event payloads.
   * Defaults to the live target unit position when omitted.
   */
  targetHex?: import('@/types/gameplay/HexGridInterfaces').IHexCoordinate,
): IGameSession {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const attackerUnit = session.currentState.units[attackerId];
  const targetUnit = session.currentState.units[targetId];

  if (!attackerUnit) {
    throw new Error(`Attacker unit ${attackerId} not found`);
  }

  const invalidTargetSession = invalidateInvalidTargetAttack(
    session,
    attackerId,
    targetId,
    weapons.map((weapon) => weapon.weaponId),
  );
  if (invalidTargetSession) return invalidTargetSession;

  const evadingAttackerSession = invalidateEvadingAttackerAttack(
    session,
    attackerId,
    targetId,
    weapons.map((weapon) => weapon.weaponId),
  );
  if (evadingAttackerSession) return evadingAttackerSession;

  const sprintingAttackerSession = invalidateSprintingAttackerAttack(
    session,
    attackerId,
    targetId,
    weapons.map((weapon) => weapon.weaponId),
  );
  if (sprintingAttackerSession) return sprintingAttackerSession;

  if (!targetUnit) {
    throw new Error(`Target unit ${targetId} not found`);
  }

  const attacker = session.units.find((unit) => unit.id === attackerId);
  if (!attacker) {
    throw new Error(`Attacker ${attackerId} not found in units`);
  }

  // Wave 8 PR-K11: normalize IAttackPreResolution union → bare resolution
  // so the existing pipeline below uses one shape. Back-compat: pre-K11
  // callers passing IIndirectFireResolution directly continue to work.
  const indirectFireResolution:
    | import('@/types/gameplay/IndirectFireInterfaces').IIndirectFireResolution
    | undefined = !indirectFireResolutionInput
    ? undefined
    : 'kind' in indirectFireResolutionInput
      ? indirectFireResolutionInput.kind === 'indirect'
        ? indirectFireResolutionInput.resolution
        : undefined
      : indirectFireResolutionInput;

  const primaryWeapon = weapons[0];
  const semiGuidedTagContext = primaryWeapon
    ? {
        isSemiGuided:
          isSemiGuidedLRM(primaryWeapon.ammoType ?? '') ||
          isSemiGuidedLRM(primaryWeapon.weaponId) ||
          isSemiGuidedLRM(primaryWeapon.weaponName),
        targetTagDesignated: targetUnit.tagDesignated,
        isIndirectFire:
          indirectFireResolution?.permitted === true &&
          indirectFireResolution.isIndirect,
      }
    : undefined;

  const toHitCalc = calculateToHit(
    buildWeaponAttackAttackerToHitState(
      attackerUnit,
      attacker.gunnery,
      primaryWeapon
        ? {
            id: primaryWeapon.weaponId,
            name: primaryWeapon.weaponName,
            category: primaryWeapon.category,
          }
        : undefined,
      targetId,
      undefined,
      weapons.some((weapon) => weapon.calledShot === true),
      weapons.some((weapon) => weapon.teammateCalledShot === true),
    ),
    buildWeaponAttackTargetToHitState(targetUnit, false),
    rangeBracket,
    range,
    primaryWeapon?.minRange,
    primaryWeapon?.weaponId,
    semiGuidedTagContext,
  );

  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  }));

  // Wave 8 PR-K4: append indirect-fire penalty to the modifier list so
  // the AttackDeclared event's toHitNumber reflects the live indirect
  // resolution. The penalty math (base +1, +1 spotter-walked, -1 FO SPA)
  // happened upstream in `computeIndirectFireContext`.
  let finalToHit = toHitCalc.finalToHit;
  if (
    indirectFireResolution &&
    indirectFireResolution.permitted &&
    indirectFireResolution.isIndirect &&
    indirectFireResolution.toHitPenalty > 0
  ) {
    modifiers.push({
      name: 'Indirect fire',
      value: indirectFireResolution.toHitPenalty,
      source: 'other',
    });
    finalToHit += indirectFireResolution.toHitPenalty;
  }

  const weaponIds = weapons.map((weapon) => weapon.weaponId);
  const weaponAttackData: IWeaponAttackData[] = weapons.map((weapon) => ({
    weaponId: weapon.weaponId,
    weaponName: weapon.weaponName,
    damage: weapon.damage,
    heat: weapon.heat,
  }));

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createAttackDeclaredEvent(
    session.id,
    sequence,
    turn,
    attackerId,
    targetId,
    weaponIds,
    finalToHit,
    modifiers,
    weaponAttackData,
  );

  let updatedSession = appendEvent(session, event);

  // Wave 8 PR-K4: emit the indirect-fire dispatch event after AttackDeclared.
  // Multi-weapon attacks share the same resolution today (the upstream
  // collaborator returns a per-weapon result; callers pre-merge when they
  // declare a multi-weapon attack). The first weaponId in the attack is
  // used as the event's weapon reference.
  if (
    indirectFireResolution &&
    indirectFireResolution.permitted &&
    indirectFireResolution.isIndirect &&
    weaponIds.length > 0
  ) {
    const resolvedTargetHex = targetHex ?? targetUnit.position;
    const eventWeaponId = weaponIds[0];
    const eventSequence = updatedSession.events.length;
    if (
      indirectFireResolution.basis === 'narc' ||
      indirectFireResolution.basis === 'inarc'
    ) {
      const narcEvent = createIndirectFireNarcOverrideEvent(
        updatedSession.id,
        eventSequence,
        turn,
        attackerId,
        eventWeaponId,
        resolvedTargetHex,
        indirectFireResolution.basis,
        indirectFireResolution.toHitPenalty,
      );
      updatedSession = appendEvent(updatedSession, narcEvent);
    } else if (indirectFireResolution.spotterId) {
      const spotterEvent = createIndirectFireSpotterSelectedEvent(
        updatedSession.id,
        eventSequence,
        turn,
        attackerId,
        indirectFireResolution.spotterId,
        eventWeaponId,
        resolvedTargetHex,
        indirectFireResolution.toHitPenalty,
      );
      updatedSession = appendEvent(updatedSession, spotterEvent);
      if (indirectFireResolution.forwardObserverApplied) {
        const forwardObserverEvent = createIndirectFireForwardObserverEvent(
          updatedSession.id,
          updatedSession.events.length,
          turn,
          attackerId,
          indirectFireResolution.spotterId,
          eventWeaponId,
          resolvedTargetHex,
          indirectFireResolution.toHitPenalty,
        );
        updatedSession = appendEvent(updatedSession, forwardObserverEvent);
      }
    }
  }

  return updatedSession;
}

export function lockAttack(
  session: IGameSession,
  unitId: string,
): IGameSession {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createAttackLockedEvent(session.id, sequence, turn, unitId);

  return appendEvent(session, event);
}
