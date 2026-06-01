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
  IHexTerrain,
  IToHitModifier,
  IToHitModifierDetail,
  IWeaponAttack,
  IWeaponAttackData,
  MovementType,
  RangeBracket,
  type StandUpMode,
} from '@/types/gameplay';

import type { ILOSInterveningTerrainEffect } from './lineOfSight';

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

import { calculateGroundToAirAltitudeModifier } from './aerospace/groundToAir';
import { isRepresentedTargetImmobile } from './combatImmobility';
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
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createPhaseChangedEvent,
} from './gameEvents';
import { allUnitsLocked, deriveState } from './gameState';
import { isGroundToGroundGameAttack } from './groundToGround';
import { getWeaponRangeBracket } from './range';
import { calculateInterveningTerrainModifier, calculateToHit } from './toHit';
import { calculateToHitWithC3, selectC3RangeBracket } from './toHit/c3';
import { deriveVehicleToHitContext } from './vehicleToHitContext';

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
  /**
   * Non-default initial terrain/elevation seed captured from the grid
   * used to start the session.
   */
  readonly hexTerrain?: readonly IHexTerrain[];
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
    undefined,
    options.hexTerrain,
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

export function appendEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  const events = [...session.events, event];
  const currentState = deriveState(session.id, events);

  return {
    ...session,
    events,
    currentState,
    updatedAt: new Date().toISOString(),
  };
}

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

export function rollInitiative(
  session: IGameSession,
  movesFirst?: GameSide,
  diceRoller: D6Roller = defaultD6Roller,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Initiative) {
    throw new Error('Not in initiative phase');
  }

  // Per `add-quick-resolve-monte-carlo`: accept an injectable D6 roller
  // so the Monte Carlo wrapper can drive initiative deterministically
  // from a SeededRandom. Default preserves prior behavior (Math.random).
  const playerRoll = roll2d6(diceRoller);
  const opponentRoll = roll2d6(diceRoller);

  let winner: GameSide;
  if (playerRoll > opponentRoll) {
    winner = GameSide.Player;
  } else if (opponentRoll > playerRoll) {
    winner = GameSide.Opponent;
  } else {
    winner = GameSide.Player;
  }

  const actualMovesFirst =
    movesFirst ??
    (winner === GameSide.Player ? GameSide.Opponent : GameSide.Player);

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createInitiativeRolledEvent(
    session.id,
    sequence,
    turn,
    playerRoll,
    opponentRoll,
    winner,
    actualMovesFirst,
  );

  return appendEvent(session, event);
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
  options?: {
    readonly standUpAttempt?: boolean;
    readonly standUpSucceeded?: boolean;
    readonly standUpMode?: StandUpMode;
    readonly hullDownExitAttempt?: boolean;
    readonly hullDownEntryAttempt?: boolean;
    readonly goProneAttempt?: boolean;
    readonly conversionStepCount?: number;
    readonly conversionMpCost?: number;
    readonly altitudeControlStepCount?: number;
    readonly altitudeControlMpCost?: number;
  },
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
    options,
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
  /** Whether the target's hex grants partial cover for this declaration. */
  targetPartialCover = false,
  /** Intervening LOS terrain effects that should modify the attack to-hit. */
  interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[] = [],
  /** Target-hex woods/smoke terrain modifier, separate from true partial cover. */
  targetTerrainModifier: IToHitModifierDetail | null = null,
): IGameSession {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const attackerUnit = session.currentState.units[attackerId];
  const targetUnit = session.currentState.units[targetId];

  if (!attackerUnit) {
    throw new Error(`Attacker unit ${attackerId} not found`);
  }
  if (!targetUnit) {
    throw new Error(`Target unit ${targetId} not found`);
  }

  const attacker = session.units.find((unit) => unit.id === attackerId);
  if (!attacker) {
    throw new Error(`Attacker ${attackerId} not found in units`);
  }

  const indirectFireResolution:
    | import('@/types/gameplay/IndirectFireInterfaces').IIndirectFireResolution
    | undefined = !indirectFireResolutionInput
    ? undefined
    : 'kind' in indirectFireResolutionInput
      ? indirectFireResolutionInput.kind === 'indirect'
        ? indirectFireResolutionInput.resolution
        : undefined
      : indirectFireResolutionInput;

  const resolvedTargetHex = targetHex ?? targetUnit.position;
  const interveningTerrainModifier = calculateInterveningTerrainModifier(
    interveningTerrainEffects,
  );
  const groundToAirAltitudeModifier = calculateGroundToAirAltitudeModifier(
    attackerUnit,
    targetUnit,
  );
  const attackContextModifiers = [
    interveningTerrainModifier,
    targetTerrainModifier,
    groundToAirAltitudeModifier,
  ].filter(
    (modifier): modifier is IToHitModifierDetail =>
      modifier !== null && modifier !== undefined,
  );

  const c3State = session.currentState.c3State;
  const indirectAttack =
    indirectFireResolution?.permitted === true &&
    indirectFireResolution.isIndirect;
  const spottingPenaltyApplies =
    !indirectAttack &&
    wasElectedIndirectSpotterThisTurn(
      session,
      attackerId,
      session.currentState.turn,
    );
  const calculateAttackToHitForWeapons = (
    attackWeapons: readonly IWeaponAttack[],
  ): {
    readonly rangeBracket: RangeBracket;
    readonly toHitNumber: number;
    readonly modifiers: readonly IToHitModifier[];
  } => {
    const directRangeBracket = bestRangeBracketForAttack(range, attackWeapons);
    const attackRangeBracket =
      directRangeBracket === RangeBracket.OutOfRange
        ? rangeBracket
        : directRangeBracket;
    const attackerState = {
      gunnery: attacker.gunnery,
      movementType: attackerUnit.movementThisTurn,
      heat: attackerUnit.heat,
      damageModifiers: attackContextModifiers,
      prone: attackerUnit.prone ?? false,
      ...deriveVehicleToHitContext(attackerUnit, attackWeapons),
    };
    const targetState = {
      movementType: targetUnit.movementThisTurn,
      hexesMoved: targetUnit.hexesMovedThisTurn,
      prone: targetUnit.prone ?? false,
      immobile: isRepresentedTargetImmobile(targetUnit),
      partialCover: targetPartialCover,
      hullDown: targetUnit.hullDown === true,
    };
    const minimumRange = minimumRangeForAttack(
      attackWeapons,
      range,
      isGroundToGroundGameAttack(attackerUnit, targetUnit),
    );
    const weaponRangeProfiles = attackWeapons.map((weapon) => ({
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    }));
    const c3Selection =
      indirectAttack || !c3State
        ? undefined
        : selectC3RangeBracket({
            attackerEntityId: attackerId,
            targetPosition: resolvedTargetHex,
            weaponRangeProfiles,
            directRangeBracket: attackRangeBracket,
            c3State,
          });
    const c3WeaponRangeProfile =
      c3Selection !== undefined
        ? weaponRangeProfiles[c3Selection.weaponIndex]
        : undefined;
    let effectiveRangeBracket = attackRangeBracket;
    const toHitCalc =
      c3Selection !== undefined && c3WeaponRangeProfile !== undefined && c3State
        ? (() => {
            const c3ToHit = calculateToHitWithC3(
              attackerState,
              targetState,
              attackRangeBracket,
              range,
              {
                attackerEntityId: attackerId,
                targetPosition: resolvedTargetHex,
                weaponRangeProfile: c3WeaponRangeProfile,
                c3State,
              },
              minimumRange,
            );
            if (c3ToHit.c3Result.benefitApplied) {
              effectiveRangeBracket = c3ToHit.c3Result.bestBracket;
            }
            return c3ToHit;
          })()
        : calculateToHit(
            attackerState,
            targetState,
            attackRangeBracket,
            range,
            minimumRange,
          );

    const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
      name: modifier.name,
      value: modifier.value,
      source: modifier.source,
      description: modifier.description,
    }));

    // Wave 8 PR-K4: append indirect-fire and spotting penalties to the
    // modifier list so target-number metadata stays replayable.
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
    if (spottingPenaltyApplies) {
      modifiers.push({
        name: 'Spotting for indirect fire',
        value: 1,
        source: 'other',
      });
      finalToHit += 1;
    }

    return {
      rangeBracket: effectiveRangeBracket,
      toHitNumber: finalToHit,
      modifiers,
    };
  };

  const weaponIds = weapons.map((weapon) => weapon.weaponId);
  const aggregateToHit = calculateAttackToHitForWeapons(weapons);
  const finalToHit = aggregateToHit.toHitNumber;
  const modifiers = aggregateToHit.modifiers;
  const effectiveRangeBracket = aggregateToHit.rangeBracket;
  const weaponAttackData: IWeaponAttackData[] = weapons.map((weapon) => {
    const weaponToHit = calculateAttackToHitForWeapons([weapon]);
    return {
      weaponId: weapon.weaponId,
      weaponName: weapon.weaponName,
      mode: weapon.mode ?? 'Direct',
      damage: weapon.damage,
      heat: weapon.heat,
      toHitNumber: weaponToHit.toHitNumber,
      modifiers: weaponToHit.modifiers,
    };
  });

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
    effectiveRangeBracket,
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
        undefined,
        indirectFireResolution.spotterGunnery,
        indirectFireResolution.spotterSkillModifier,
      );
      updatedSession = appendEvent(updatedSession, spotterEvent);
      if (indirectFireResolution.forwardObserverApplied === true) {
        const forwardObserverEvent = createIndirectFireForwardObserverEvent(
          updatedSession.id,
          updatedSession.events.length,
          turn,
          attackerId,
          indirectFireResolution.spotterId,
          eventWeaponId,
          resolvedTargetHex,
          indirectFireResolution.toHitPenalty,
          undefined,
          indirectFireResolution.spotterGunnery,
          indirectFireResolution.spotterSkillModifier,
        );
        updatedSession = appendEvent(updatedSession, forwardObserverEvent);
      }
    }
  }

  return updatedSession;
}

function minimumRangeForAttack(
  weapons: readonly IWeaponAttack[],
  range: number,
  minimumRangeApplies = true,
): number {
  if (!minimumRangeApplies) return 0;
  return weapons.reduce((strictestMinimum, weapon) => {
    const minimum = weapon.minRange ?? 0;
    return minimum > range
      ? Math.max(strictestMinimum, minimum)
      : strictestMinimum;
  }, 0);
}

const ATTACK_RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

function bestRangeBracketForAttack(
  range: number,
  weapons: readonly IWeaponAttack[],
): RangeBracket {
  return weapons.reduce<RangeBracket>((best, weapon) => {
    const bracket = getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    });
    return ATTACK_RANGE_BRACKET_RANK[bracket] < ATTACK_RANGE_BRACKET_RANK[best]
      ? bracket
      : best;
  }, RangeBracket.OutOfRange);
}

function wasElectedIndirectSpotterThisTurn(
  session: IGameSession,
  spotterId: string,
  turn: number,
): boolean {
  return session.events.some((event) => {
    if (
      event.turn !== turn ||
      event.type !== GameEventType.IndirectFireSpotterSelected
    ) {
      return false;
    }
    const payload = event.payload as { readonly spotterId?: string | null };
    return payload.spotterId === spotterId;
  });
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
