/**
 * Game Event Utilities
 * Factory functions for creating game events.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IGameEvent,
  IGameEventBase,
  GameEventType,
  GamePhase,
  GameSide,
  IGameConfig,
  IGameUnit,
  IGameCreatedPayload,
  IGameStartedPayload,
  IGameEndedPayload,
  IPhaseChangedPayload,
  IInitiativeRolledPayload,
  IMovementDeclaredPayload,
  IMovementLockedPayload,
  IAttackDeclaredPayload,
  IWeaponAttackData,
  IAttackLockedPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IToHitModifier,
} from '@/types/gameplay';
import { IHexCoordinate, Facing, MovementType } from '@/types/gameplay';

// =============================================================================
// Event ID Generation
// =============================================================================

/**
 * Generate a unique event ID.
 */
export function generateEventId(): string {
  return uuidv4();
}

// =============================================================================
// Base Event Creation
// =============================================================================

/**
 * Create the base event properties.
 */
function createEventBase(
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  actorId?: string,
): IGameEventBase {
  return {
    id: generateEventId(),
    gameId,
    sequence,
    timestamp: new Date().toISOString(),
    type,
    turn,
    phase,
    actorId,
  };
}

// =============================================================================
// Lifecycle Event Factories
// =============================================================================

/**
 * Create a game created event.
 */
export function createGameCreatedEvent(
  gameId: string,
  config: IGameConfig,
  units: readonly IGameUnit[],
): IGameEvent {
  const payload: IGameCreatedPayload = { config, units };
  return {
    ...createEventBase(
      gameId,
      0,
      GameEventType.GameCreated,
      0,
      GamePhase.Initiative,
    ),
    payload,
  };
}

/**
 * Create a game started event.
 */
export function createGameStartedEvent(
  gameId: string,
  sequence: number,
  firstSide: GameSide,
): IGameEvent {
  const payload: IGameStartedPayload = { firstSide };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.GameStarted,
      1,
      GamePhase.Initiative,
    ),
    payload,
  };
}

/**
 * Create a game ended event.
 */
export function createGameEndedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective',
): IGameEvent {
  const payload: IGameEndedPayload = { winner, reason };
  return {
    ...createEventBase(gameId, sequence, GameEventType.GameEnded, turn, phase),
    payload,
  };
}

// =============================================================================
// Turn/Phase Event Factories
// =============================================================================

/**
 * Create a phase changed event.
 */
export function createPhaseChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  fromPhase: GamePhase,
  toPhase: GamePhase,
): IGameEvent {
  const payload: IPhaseChangedPayload = { fromPhase, toPhase };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PhaseChanged,
      turn,
      toPhase,
    ),
    payload,
  };
}

// =============================================================================
// Initiative Event Factories
// =============================================================================

/**
 * Create an initiative rolled event.
 */
export function createInitiativeRolledEvent(
  gameId: string,
  sequence: number,
  turn: number,
  playerRoll: number,
  opponentRoll: number,
  winner: GameSide,
  movesFirst: GameSide,
): IGameEvent {
  const payload: IInitiativeRolledPayload = {
    playerRoll,
    opponentRoll,
    winner,
    movesFirst,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.InitiativeRolled,
      turn,
      GamePhase.Initiative,
    ),
    payload,
  };
}

// =============================================================================
// Movement Event Factories
// =============================================================================

/**
 * Create a movement declared event.
 */
export function createMovementDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpUsed: number,
  heatGenerated: number,
): IGameEvent {
  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementDeclared,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

/**
 * Create a movement locked event.
 */
export function createMovementLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
): IGameEvent {
  const payload: IMovementLockedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MovementLocked,
      turn,
      GamePhase.Movement,
      unitId,
    ),
    payload,
  };
}

// =============================================================================
// Combat Event Factories
// =============================================================================

/**
 * Create an attack declared event.
 */
export function createAttackDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weapons: readonly string[],
  toHitNumber: number,
  modifiers: readonly IToHitModifier[],
  weaponAttacks?: readonly IWeaponAttackData[],
): IGameEvent {
  const payload: IAttackDeclaredPayload = {
    attackerId,
    targetId,
    weapons,
    toHitNumber,
    modifiers,
    weaponAttacks,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackDeclared,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export function createAttackLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
): IGameEvent {
  const payload: IAttackLockedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackLocked,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

/**
 * Create an attack resolved event.
 */
export function createAttackResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weaponId: string,
  roll: number,
  toHitNumber: number,
  hit: boolean,
  location?: string,
  damage?: number,
): IGameEvent {
  const payload: IAttackResolvedPayload = {
    attackerId,
    targetId,
    weaponId,
    roll,
    toHitNumber,
    hit,
    location,
    damage,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackResolved,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Create a damage applied event.
 */
export function createDamageAppliedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  damage: number,
  armorRemaining: number,
  structureRemaining: number,
  locationDestroyed: boolean,
  criticals?: readonly string[],
): IGameEvent {
  const payload: IDamageAppliedPayload = {
    unitId,
    location,
    damage,
    armorRemaining,
    structureRemaining,
    locationDestroyed,
    criticals,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.DamageApplied,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

// =============================================================================
// Status Event Factories
// =============================================================================

/**
 * Create a heat generated event.
 */
export function createHeatGeneratedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  amount: number,
  source: 'movement' | 'weapons' | 'dissipation' | 'external',
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = { unitId, amount, source, newTotal };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatGenerated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Create a heat dissipated event.
 */
export function createHeatDissipatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  amount: number,
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = {
    unitId,
    amount: -Math.abs(amount),
    source: 'dissipation',
    newTotal,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatDissipated,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload,
  };
}

/**
 * Create a pilot hit event.
 */
export function createPilotHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  wounds: number,
  totalWounds: number,
  source: 'head_hit' | 'ammo_explosion' | 'mech_destruction',
  consciousnessCheckRequired: boolean,
  consciousnessCheckPassed?: boolean,
): IGameEvent {
  const payload: IPilotHitPayload = {
    unitId,
    wounds,
    totalWounds,
    source,
    consciousnessCheckRequired,
    consciousnessCheckPassed,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PilotHit,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Create a unit destroyed event.
 */
export function createUnitDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown',
): IGameEvent {
  const payload: IUnitDestroyedPayload = { unitId, cause };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitDestroyed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

// =============================================================================
// Event Serialization
// =============================================================================

/**
 * Serialize an event to JSON string.
 */
export function serializeEvent(event: IGameEvent): string {
  return JSON.stringify(event);
}

/**
 * Deserialize an event from JSON string.
 */
export function deserializeEvent(json: string): IGameEvent {
  return JSON.parse(json) as IGameEvent;
}

/**
 * Serialize multiple events to JSON string.
 */
export function serializeEvents(events: readonly IGameEvent[]): string {
  return JSON.stringify(events);
}

/**
 * Deserialize multiple events from JSON string.
 */
export function deserializeEvents(json: string): IGameEvent[] {
  return JSON.parse(json) as IGameEvent[];
}
