/**
 * Game Session Management
 * Create and manage game sessions.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IGameSession,
  IGameEvent,
  IGameState,
  IGameConfig,
  IGameUnit,
  GameStatus,
  GamePhase,
  GameSide,
} from '@/types/gameplay';
import {
  IHexCoordinate,
  Facing,
  MovementType,
  RangeBracket,
  FiringArc,
  GameEventType,
  IAttackDeclaredPayload,
  IWeaponAttack,
  IToHitModifier,
  IMovementDeclaredPayload,
} from '@/types/gameplay';

import {
  createGameCreatedEvent,
  createGameStartedEvent,
  createGameEndedEvent,
  createPhaseChangedEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createAttackDeclaredEvent,
  createAttackLockedEvent,
  createAttackResolvedEvent,
  createDamageAppliedEvent,
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
} from './gameEvents';
import { deriveState, allUnitsLocked } from './gameState';
import {
  roll2d6 as rollDice,
  determineHitLocationFromRoll,
} from './hitLocation';
import { calculateToHit } from './toHit';

// =============================================================================
// Session Creation
// =============================================================================

/**
 * Create a new game session.
 */
export function createGameSession(
  config: IGameConfig,
  units: readonly IGameUnit[],
): IGameSession {
  const id = uuidv4();
  const now = new Date().toISOString();

  // Create the initial event
  const createdEvent = createGameCreatedEvent(id, config, units);
  const events: IGameEvent[] = [createdEvent];

  // Derive initial state
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

/**
 * Start a game session.
 */
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

/**
 * End a game session.
 */
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

// =============================================================================
// Event Management
// =============================================================================

/**
 * Append an event to the session (immutable).
 */
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

/**
 * Get events for a specific turn.
 */
export function getEventsForTurn(
  session: IGameSession,
  turn: number,
): readonly IGameEvent[] {
  return session.events.filter((e) => e.turn === turn);
}

/**
 * Get events for a specific phase.
 */
export function getEventsForPhase(
  session: IGameSession,
  turn: number,
  phase: GamePhase,
): readonly IGameEvent[] {
  return session.events.filter((e) => e.turn === turn && e.phase === phase);
}

// =============================================================================
// Phase Management
// =============================================================================

/**
 * Get the next phase in sequence.
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  const phaseOrder: GamePhase[] = [
    GamePhase.Initiative,
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.Heat,
    GamePhase.End,
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return GamePhase.Initiative; // Wrap to next turn
  }

  return phaseOrder[currentIndex + 1];
}

/**
 * Advance to the next phase.
 */
export function advancePhase(session: IGameSession): IGameSession {
  const { phase, turn } = session.currentState;
  const nextPhase = getNextPhase(phase);

  // If wrapping to initiative, increment turn
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

/**
 * Check if the current phase can advance.
 */
export function canAdvancePhase(session: IGameSession): boolean {
  const { phase, status } = session.currentState;

  if (status !== GameStatus.Active) {
    return false;
  }

  // Movement and Attack phases require all units to be locked
  if (phase === GamePhase.Movement || phase === GamePhase.WeaponAttack) {
    return allUnitsLocked(session.currentState);
  }

  // Other phases can advance freely
  return true;
}

// =============================================================================
// Initiative Phase
// =============================================================================

/**
 * Roll 2d6.
 */
export function roll2d6(): number {
  return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

/**
 * Roll initiative for both sides.
 */
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
    // Tie - re-roll (for simplicity, player wins ties)
    winner = GameSide.Player;
  }

  // Winner chooses who moves first (default: winner moves second for tactical advantage)
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

// =============================================================================
// Movement Phase
// =============================================================================

/**
 * Declare movement for a unit.
 */
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

/**
 * Lock movement for a unit.
 */
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

// =============================================================================
// Weapon Attack Phase
// =============================================================================

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

  const attacker = session.units.find((u) => u.id === attackerId);
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

  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((m) => ({
    name: m.name,
    value: m.value,
    source: m.source,
  }));

  const weaponIds = weapons.map((w) => w.weaponId);

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

export type DiceRoller = () => {
  dice: readonly number[];
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
};

export function resolveAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const payload = attackEvent.payload as IAttackDeclaredPayload;
  const { attackerId, targetId, weapons, toHitNumber } = payload;

  let currentSession = session;

  for (const weaponId of weapons) {
    const attackRoll = diceRoller();
    const hit = attackRoll.total >= toHitNumber;

    const sequence = currentSession.events.length;
    const { turn } = currentSession.currentState;

    if (hit) {
      const locationRoll = diceRoller();
      const hitLocationResult = determineHitLocationFromRoll(
        FiringArc.Front,
        locationRoll,
      );
      const location = hitLocationResult.location;
      const damage = 5;

      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        true,
        location,
        damage,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);

      const damageSequence = currentSession.events.length;
      const damageEvent = createDamageAppliedEvent(
        currentSession.id,
        damageSequence,
        turn,
        targetId,
        location,
        damage,
        0,
        0,
        false,
      );
      currentSession = appendEvent(currentSession, damageEvent);
    } else {
      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        false,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);
    }
  }

  return currentSession;
}

export function resolveAllAttacks(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const { turn } = session.currentState;

  const attackEvents = session.events.filter(
    (e) => e.type === GameEventType.AttackDeclared && e.turn === turn,
  );

  let currentSession = session;

  for (const attackEvent of attackEvents) {
    currentSession = resolveAttack(currentSession, attackEvent, diceRoller);
  }

  return currentSession;
}

// =============================================================================
// Heat Phase
// =============================================================================

export function resolveHeatPhase(session: IGameSession): IGameSession {
  if (session.currentState.phase !== GamePhase.Heat) {
    throw new Error('Not in heat phase');
  }

  const { turn } = session.currentState;
  let currentSession = session;

  const turnEvents = session.events.filter((e) => e.turn === turn);

  const unitIds = Object.keys(session.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    const unit = currentSession.units.find((u) => u.id === unitId);

    if (!unit || unitState.destroyed) {
      continue;
    }

    let heatFromMovement = 0;
    const movementEvent = turnEvents.find(
      (e) => e.type === GameEventType.MovementDeclared && e.actorId === unitId,
    );
    if (movementEvent) {
      const payload = movementEvent.payload as IMovementDeclaredPayload;
      heatFromMovement = payload.heatGenerated;
    }

    let heatFromWeapons = 0;
    const attackEvents = turnEvents.filter(
      (e) => e.type === GameEventType.AttackDeclared && e.actorId === unitId,
    );
    for (const attackEvent of attackEvents) {
      const payload = attackEvent.payload as IAttackDeclaredPayload;
      heatFromWeapons += payload.weapons.length * 10;
    }

    const totalHeatGenerated = heatFromMovement + heatFromWeapons;

    if (totalHeatGenerated > 0) {
      const heatGenSequence = currentSession.events.length;
      const heatGenEvent = createHeatGeneratedEvent(
        currentSession.id,
        heatGenSequence,
        turn,
        GamePhase.Heat,
        unitId,
        totalHeatGenerated,
        'weapons',
        unitState.heat + totalHeatGenerated,
      );
      currentSession = appendEvent(currentSession, heatGenEvent);
    }

    const currentHeat = currentSession.currentState.units[unitId].heat;

    const baseHeatSinks = 10;
    const waterCoolingBonus = 0;
    const totalDissipation = baseHeatSinks + waterCoolingBonus;

    const newHeat = Math.max(0, currentHeat - totalDissipation);

    const dissipationSequence = currentSession.events.length;
    const dissipationEvent = createHeatDissipatedEvent(
      currentSession.id,
      dissipationSequence,
      turn,
      unitId,
      totalDissipation,
      newHeat,
    );

    currentSession = appendEvent(currentSession, dissipationEvent);
  }

  return currentSession;
}

// =============================================================================
// Replay
// =============================================================================

/**
 * Get state at a specific event sequence.
 */
export function replayToSequence(
  session: IGameSession,
  sequence: number,
): IGameState {
  const eventsUpTo = session.events.filter((e) => e.sequence <= sequence);
  return deriveState(session.id, eventsUpTo);
}

/**
 * Get state at a specific turn.
 */
export function replayToTurn(session: IGameSession, turn: number): IGameState {
  const eventsUpTo = session.events.filter((e) => e.turn <= turn);
  return deriveState(session.id, eventsUpTo);
}

/**
 * Generate a text log of game events.
 */
export function generateGameLog(session: IGameSession): string {
  const lines: string[] = [];

  for (const event of session.events) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const prefix = `[Turn ${event.turn}/${event.phase}] ${timestamp}:`;

    switch (event.type) {
      case 'game_created':
        lines.push(`${prefix} Game created`);
        break;
      case 'game_started':
        lines.push(`${prefix} Game started`);
        break;
      case 'game_ended':
        lines.push(`${prefix} Game ended`);
        break;
      case 'phase_changed':
        lines.push(`${prefix} Phase changed to ${event.phase}`);
        break;
      case 'initiative_rolled':
        lines.push(`${prefix} Initiative rolled`);
        break;
      case 'movement_declared':
        lines.push(`${prefix} Unit ${event.actorId} moved`);
        break;
      case 'movement_locked':
        lines.push(`${prefix} Unit ${event.actorId} locked movement`);
        break;
      case 'attack_declared':
        lines.push(`${prefix} Unit ${event.actorId} declared attack`);
        break;
      case 'attack_resolved':
        lines.push(`${prefix} Attack resolved`);
        break;
      case 'damage_applied':
        lines.push(`${prefix} Damage applied`);
        break;
      case 'unit_destroyed':
        lines.push(`${prefix} Unit ${event.actorId} destroyed`);
        break;
      default:
        lines.push(`${prefix} ${event.type}`);
    }
  }

  return lines.join('\n');
}
