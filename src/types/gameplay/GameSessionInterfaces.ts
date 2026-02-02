/**
 * Game Session Interfaces
 * Core type definitions for the game session system.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { IHexCoordinate, Facing, MovementType } from './HexGridInterfaces';

// =============================================================================
// Enums
// =============================================================================

/**
 * Game session lifecycle states.
 */
export enum GameStatus {
  /** Game is being configured */
  Setup = 'setup',
  /** Game is actively being played */
  Active = 'active',
  /** Game has ended */
  Completed = 'completed',
  /** Game was abandoned */
  Abandoned = 'abandoned',
}

/**
 * Game phases in turn order.
 */
export enum GamePhase {
  /** Determine initiative order */
  Initiative = 'initiative',
  /** Units move in alternating order */
  Movement = 'movement',
  /** Weapon attacks are declared and resolved */
  WeaponAttack = 'weapon_attack',
  /** Physical attacks (future) */
  PhysicalAttack = 'physical_attack',
  /** Heat accumulation and dissipation */
  Heat = 'heat',
  /** End of turn cleanup and victory check */
  End = 'end',
}

/**
 * Lock states for actions.
 */
export enum LockState {
  /** Action not yet started */
  Pending = 'pending',
  /** Action is being planned (can be changed) */
  Planning = 'planning',
  /** Action is locked (cannot be changed) */
  Locked = 'locked',
  /** Action has been revealed */
  Revealed = 'revealed',
  /** Action has been resolved */
  Resolved = 'resolved',
}

/**
 * All game event types.
 */
export enum GameEventType {
  // Lifecycle events
  GameCreated = 'game_created',
  GameStarted = 'game_started',
  GameEnded = 'game_ended',
  
  // Turn/Phase events
  TurnStarted = 'turn_started',
  TurnEnded = 'turn_ended',
  PhaseChanged = 'phase_changed',
  
  // Initiative events
  InitiativeRolled = 'initiative_rolled',
  InitiativeOrderSet = 'initiative_order_set',
  
  // Movement events
  MovementDeclared = 'movement_declared',
  MovementLocked = 'movement_locked',
  FacingChanged = 'facing_changed',
  
  // Combat events
  AttackDeclared = 'attack_declared',
  AttackLocked = 'attack_locked',
  AttacksRevealed = 'attacks_revealed',
  AttackResolved = 'attack_resolved',
  DamageApplied = 'damage_applied',
  
  // Status events
  HeatGenerated = 'heat_generated',
  HeatDissipated = 'heat_dissipated',
  HeatEffectApplied = 'heat_effect_applied',
  PilotHit = 'pilot_hit',
  UnitDestroyed = 'unit_destroyed',
  AmmoExplosion = 'ammo_explosion',
  CriticalHit = 'critical_hit',
}

/**
 * Side/team in the game.
 */
export enum GameSide {
  Player = 'player',
  Opponent = 'opponent',
}

// =============================================================================
// Event Interfaces
// =============================================================================

/**
 * Base interface for all game events.
 */
export interface IGameEventBase {
  /** Unique event ID */
  readonly id: string;
  /** Game this event belongs to */
  readonly gameId: string;
  /** Sequence number within the game */
  readonly sequence: number;
  /** Event timestamp */
  readonly timestamp: string;
  /** Event type */
  readonly type: GameEventType;
  /** Turn number (1-based) */
  readonly turn: number;
  /** Phase when event occurred */
  readonly phase: GamePhase;
  /** Unit that triggered the event (if applicable) */
  readonly actorId?: string;
}

/**
 * Game created event payload.
 */
export interface IGameCreatedPayload {
  /** Game configuration */
  readonly config: IGameConfig;
  /** Participating units */
  readonly units: readonly IGameUnit[];
}

/**
 * Game started event payload.
 */
export interface IGameStartedPayload {
  /** Starting player (who moves first in first turn) */
  readonly firstSide: GameSide;
}

/**
 * Game ended event payload.
 */
export interface IGameEndedPayload {
  /** Winning side */
  readonly winner: GameSide | 'draw';
  /** Reason for game end */
  readonly reason: 'destruction' | 'concede' | 'turn_limit' | 'objective';
}

/**
 * Turn started event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnStartedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_started';
}

/**
 * Turn ended event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnEndedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_ended';
}

/**
 * Phase changed event payload.
 */
export interface IPhaseChangedPayload {
  /** Previous phase */
  readonly fromPhase: GamePhase;
  /** New phase */
  readonly toPhase: GamePhase;
}

/**
 * Initiative rolled event payload.
 */
export interface IInitiativeRolledPayload {
  /** Player roll result (2d6) */
  readonly playerRoll: number;
  /** Opponent roll result (2d6) */
  readonly opponentRoll: number;
  /** Winner of initiative */
  readonly winner: GameSide;
  /** Did the winner choose to move first? */
  readonly movesFirst: GameSide;
}

/**
 * Movement declared event payload.
 */
export interface IMovementDeclaredPayload {
  /** Unit that moved */
  readonly unitId: string;
  /** Starting position */
  readonly from: IHexCoordinate;
  /** Ending position */
  readonly to: IHexCoordinate;
  /** New facing */
  readonly facing: Facing;
  /** Movement type used */
  readonly movementType: MovementType;
  /** MP spent */
  readonly mpUsed: number;
  /** Heat generated */
  readonly heatGenerated: number;
}

/**
 * Movement locked event payload.
 */
export interface IMovementLockedPayload {
  /** Unit whose movement was locked */
  readonly unitId: string;
}

/**
 * Attack locked event payload.
 */
export interface IAttackLockedPayload {
  /** Unit whose attack was locked */
  readonly unitId: string;
}

/**
 * Attack declared event payload.
 */
export interface IAttackDeclaredPayload {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapon(s) used */
  readonly weapons: readonly string[];
  /** Calculated to-hit number */
  readonly toHitNumber: number;
  /** All to-hit modifiers */
  readonly modifiers: readonly IToHitModifier[];
}

/**
 * Attack resolved event payload.
 */
export interface IAttackResolvedPayload {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapon used */
  readonly weaponId: string;
  /** Dice roll result */
  readonly roll: number;
  /** To-hit number */
  readonly toHitNumber: number;
  /** Hit or miss */
  readonly hit: boolean;
  /** Hit location (if hit) */
  readonly location?: string;
  /** Damage dealt (if hit) */
  readonly damage?: number;
}

/**
 * Damage applied event payload.
 */
export interface IDamageAppliedPayload {
  /** Unit that took damage */
  readonly unitId: string;
  /** Location hit */
  readonly location: string;
  /** Damage amount */
  readonly damage: number;
  /** Armor remaining after damage */
  readonly armorRemaining: number;
  /** Structure remaining after damage */
  readonly structureRemaining: number;
  /** Was location destroyed? */
  readonly locationDestroyed: boolean;
  /** Critical hits triggered */
  readonly criticals?: readonly string[];
  /** Unit that dealt the damage (undefined for self-damage: ammo explosions, falling, heat, etc.) */
  readonly sourceUnitId?: string;
  /** Attack ID that caused this damage (links to AttackResolved event) */
  readonly attackId?: string;
}

/**
 * Heat event payload.
 */
export interface IHeatPayload {
  /** Unit */
  readonly unitId: string;
  /** Heat amount (positive for generated, negative for dissipated) */
  readonly amount: number;
  /** Heat source */
  readonly source: 'movement' | 'weapons' | 'dissipation' | 'external';
  /** New total heat */
  readonly newTotal: number;
}

/**
 * Pilot hit event payload.
 */
export interface IPilotHitPayload {
  /** Unit */
  readonly unitId: string;
  /** Wounds inflicted */
  readonly wounds: number;
  /** Total wounds */
  readonly totalWounds: number;
  /** Source of the hit */
  readonly source: 'head_hit' | 'ammo_explosion' | 'mech_destruction';
  /** Consciousness check required? */
  readonly consciousnessCheckRequired: boolean;
  /** Consciousness check result (if required) */
  readonly consciousnessCheckPassed?: boolean;
}

/**
 * Unit destroyed event payload.
 */
export interface IUnitDestroyedPayload {
  /** Unit that was destroyed */
  readonly unitId: string;
  /** Cause of destruction */
  readonly cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown';
  /** Unit that killed this unit (undefined for self-destruction: ammo explosions, pilot death, etc.) */
  readonly killerUnitId?: string;
}

/**
 * To-hit modifier for tracking.
 */
export interface IToHitModifier {
  /** Modifier name */
  readonly name: string;
  /** Modifier value */
  readonly value: number;
  /** Modifier source */
  readonly source: string;
}

/**
 * Union type for all event payloads.
 */
export type GameEventPayload =
  | IGameCreatedPayload
  | IGameStartedPayload
  | IGameEndedPayload
  | ITurnStartedPayload
  | ITurnEndedPayload
  | IPhaseChangedPayload
  | IInitiativeRolledPayload
  | IMovementDeclaredPayload
  | IMovementLockedPayload
  | IAttackDeclaredPayload
  | IAttackLockedPayload
  | IAttackResolvedPayload
  | IDamageAppliedPayload
  | IHeatPayload
  | IPilotHitPayload
  | IUnitDestroyedPayload;

/**
 * Complete game event with payload.
 */
export interface IGameEvent extends IGameEventBase {
  /** Event-specific payload */
  readonly payload: GameEventPayload;
}

// =============================================================================
// Game Configuration
// =============================================================================

/**
 * Game configuration.
 */
export interface IGameConfig {
  /** Map size (radius) */
  readonly mapRadius: number;
  /** Turn limit (0 = no limit) */
  readonly turnLimit: number;
  /** Victory conditions */
  readonly victoryConditions: readonly string[];
  /** Optional rules enabled */
  readonly optionalRules: readonly string[];
}

/**
 * Unit participating in a game.
 */
export interface IGameUnit {
  /** Unit ID */
  readonly id: string;
  /** Unit name */
  readonly name: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Unit reference (ID from unit database) */
  readonly unitRef: string;
  /** Pilot reference (ID from pilot database, or inline statblock) */
  readonly pilotRef: string;
  /** Pilot skills */
  readonly gunnery: number;
  readonly piloting: number;
}

// =============================================================================
// Game State
// =============================================================================

/**
 * Current state of a unit in the game.
 */
export interface IUnitGameState {
  /** Unit ID */
  readonly id: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Current position */
  readonly position: IHexCoordinate;
  /** Current facing */
  readonly facing: Facing;
  /** Current heat */
  readonly heat: number;
  /** Movement this turn */
  readonly movementThisTurn: MovementType;
  /** Hexes moved this turn */
  readonly hexesMovedThisTurn: number;
  /** Armor remaining per location */
  readonly armor: Record<string, number>;
  /** Structure remaining per location */
  readonly structure: Record<string, number>;
  /** Destroyed locations */
  readonly destroyedLocations: readonly string[];
  /** Destroyed equipment */
  readonly destroyedEquipment: readonly string[];
  /** Ammo remaining per weapon */
  readonly ammo: Record<string, number>;
  /** Pilot wounds */
  readonly pilotWounds: number;
  /** Is pilot conscious? */
  readonly pilotConscious: boolean;
  /** Is unit destroyed? */
  readonly destroyed: boolean;
  /** Lock state for current phase */
  readonly lockState: LockState;
  /** Pending action (if planning) */
  readonly pendingAction?: unknown;
}

/**
 * Overall game state derived from events.
 */
export interface IGameState {
  /** Game ID */
  readonly gameId: string;
  /** Current status */
  readonly status: GameStatus;
  /** Current turn number */
  readonly turn: number;
  /** Current phase */
  readonly phase: GamePhase;
  /** Initiative winner this turn */
  readonly initiativeWinner?: GameSide;
  /** Side that moves first this turn */
  readonly firstMover?: GameSide;
  /** Index of next unit to act (for alternating phases) */
  readonly activationIndex: number;
  /** Per-unit states */
  readonly units: Record<string, IUnitGameState>;
  /** Events this turn for display */
  readonly turnEvents: readonly IGameEvent[];
  /** Game result (if completed) */
  readonly result?: {
    readonly winner: GameSide | 'draw';
    readonly reason: string;
  };
}

// =============================================================================
// Game Session
// =============================================================================

/**
 * Game session with events and derived state.
 */
export interface IGameSession {
  /** Session ID */
  readonly id: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  readonly updatedAt: string;
  /** Game configuration */
  readonly config: IGameConfig;
  /** Participating units */
  readonly units: readonly IGameUnit[];
  /** All events in sequence order */
  readonly events: readonly IGameEvent[];
  /** Current derived state */
  readonly currentState: IGameState;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for IGameEvent.
 */
export function isGameEvent(obj: unknown): obj is IGameEvent {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as IGameEvent;
  return (
    typeof event.id === 'string' &&
    typeof event.gameId === 'string' &&
    typeof event.sequence === 'number' &&
    typeof event.timestamp === 'string' &&
    typeof event.type === 'string' &&
    typeof event.turn === 'number' &&
    typeof event.phase === 'string' &&
    typeof event.payload === 'object'
  );
}

/**
 * Type guard for IGameSession.
 */
export function isGameSession(obj: unknown): obj is IGameSession {
  if (typeof obj !== 'object' || obj === null) return false;
  const session = obj as IGameSession;
  return (
    typeof session.id === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.config === 'object' &&
    Array.isArray(session.units) &&
    Array.isArray(session.events) &&
    typeof session.currentState === 'object'
  );
}
