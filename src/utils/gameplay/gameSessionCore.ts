import { v4 as uuidv4 } from 'uuid';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  IGameConfig,
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

import { type D6Roller, defaultD6Roller } from './diceTypes';
import {
  createAttackDeclaredEvent,
  createAttackLockedEvent,
  createGameCreatedEvent,
  createGameEndedEvent,
  createGameStartedEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createPhaseChangedEvent,
} from './gameEvents';
import { allUnitsLocked, deriveState } from './gameState';
import { calculateToHit } from './toHit';

export function createGameSession(
  config: IGameConfig,
  units: readonly IGameUnit[],
): IGameSession {
  const id = uuidv4();
  const now = new Date().toISOString();

  const createdEvent = createGameCreatedEvent(id, config, units);
  const events: IGameEvent[] = [createdEvent];
  const currentState = deriveState(id, events);

  return {
    id,
    createdAt: now,
    updatedAt: now,
    config,
    units,
    events,
    currentState,
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
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective',
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
): IGameSession {
  if (session.currentState.phase !== GamePhase.Initiative) {
    throw new Error('Not in initiative phase');
  }

  const playerRoll = roll2d6();
  const opponentRoll = roll2d6();

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

export function declareAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weapons: readonly IWeaponAttack[],
  range: number,
  rangeBracket: RangeBracket,
  _firingArc: FiringArc,
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

  const toHitCalc = calculateToHit(
    {
      gunnery: attacker.gunnery,
      movementType: attackerUnit.movementThisTurn,
      heat: attackerUnit.heat,
      damageModifiers: [],
    },
    {
      movementType: targetUnit.movementThisTurn,
      hexesMoved: targetUnit.hexesMovedThisTurn,
      prone: false,
      immobile: false,
      partialCover: false,
    },
    rangeBracket,
    range,
  );

  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  }));

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
    toHitCalc.finalToHit,
    modifiers,
    weaponAttackData,
  );

  return appendEvent(session, event);
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
