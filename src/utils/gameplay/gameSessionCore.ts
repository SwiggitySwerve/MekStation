import { v4 as uuidv4 } from 'uuid';

import {
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
  IHexTerrain,
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

import { type IC3NetworkState } from './c3Network';
import { type D6Roller, defaultD6Roller } from './diceTypes';
import {
  createAttackLockedEvent,
  createGameCreatedEvent,
  createGameEndedEvent,
  createGameStartedEvent,
  createInitiativeOrderSetEvent,
  createInitiativeRolledEvent,
  createMovementLockedEvent,
  createPhaseChangedEvent,
  createSpottingDeclaredEvent,
} from './gameEvents';
import { appendAttackRevealIfReady } from './gameSessionAttackReveal';
import { appendEvent } from './gameSessionEvents';
import { allUnitsLocked, deriveState } from './gameState';
import {
  calculateSideInitiativeModifier,
  hasSideTacticalGeniusInitiativeReroll,
} from './initiativeModifiers';
export { declareAttack } from './gameSessionCore.attack';
export {
  declareMovement,
  type IDeclareMovementOptions,
} from './gameSessionCore.movement';

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
  readonly hexTerrain?: readonly IHexTerrain[];
  readonly c3Network?: IC3NetworkState;
  readonly groundObjects?: IGameCreatedPayload['groundObjects'];
  readonly minefields?: IGameCreatedPayload['minefields'];
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
    options.c3Network,
    options.groundObjects,
    options.minefields,
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

  return appendAttackRevealIfReady(appendEvent(session, event), unitId);
}

function assertCanRequestSpot(
  session: IGameSession,
  unitId: string,
  targetId: string,
): void {
  if (session.currentState.status !== GameStatus.Active) {
    throw new Error('Game is not active');
  }
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const unit = session.currentState.units[unitId];
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }
  if (unit.destroyed || unit.hasRetreated || unit.hasEjected) {
    throw new Error(`Unit ${unitId} is not active`);
  }
  if (unit.shutdown || !unit.pilotConscious) {
    throw new Error(`Unit ${unitId} cannot spot`);
  }
  if (unit.sprintedThisTurn || unit.isEvading) {
    throw new Error(`Unit ${unitId} cannot spot after sprinting or evading`);
  }
  if (unit.isSpotting) {
    throw new Error(`Unit ${unitId} is already spotting`);
  }

  const target = session.currentState.units[targetId];
  if (!target) {
    throw new Error(`Target unit ${targetId} not found`);
  }
  if (target.destroyed || target.hasRetreated || target.hasEjected) {
    throw new Error(`Target unit ${targetId} is not targetable`);
  }
  if (target.side === unit.side) {
    throw new Error('Cannot spot a friendly target');
  }
}

export function requestSpot(
  session: IGameSession,
  unitId: string,
  targetId: string,
): IGameSession {
  assertCanRequestSpot(session, unitId, targetId);

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createSpottingDeclaredEvent(
    session.id,
    sequence,
    turn,
    unitId,
    targetId,
  );

  return appendEvent(session, event);
}
