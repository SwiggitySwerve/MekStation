/**
 * Gameplay Utilities Index
 * Export barrel for all gameplay-related utilities.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

// Hex Math - Coordinate calculations
export * from './hexMath';

// Hex Grid - Grid creation and management
export * from './hexGrid';

// Unit Position - Position tracking
export * from './unitPosition';

// Firing Arcs - Arc determination
export * from './firingArcs';

// Movement - Movement calculations
export * from './movement';

// Range - Range calculations
export * from './range';

// Game Events - Event creation and serialization
export * from './gameEvents';

// Game State - State derivation from events
export * from './gameState';

// Game Session - Session management (excluding roll2d6 which conflicts with hitLocation)
export {
  createGameSession,
  startGame,
  endGame,
  advancePhase,
  getNextPhase,
  rollInitiative,
  declareMovement,
  lockMovement,
  replayToSequence,
  replayToTurn,
  generateGameLog,
} from './gameSession';

// Combat Resolution - To-hit, hit location, damage
// Note: toHit has its own versions of calculateTMM and getRangeBracket for modifier objects
export {
  RANGE_MODIFIERS,
  ATTACKER_MOVEMENT_MODIFIERS,
  HEAT_THRESHOLDS,
  PROBABILITY_TABLE,
  createBaseModifier,
  calculateRangeModifier,
  getRangeModifierForBracket,
  calculateAttackerMovementModifier,
  calculateTMM as calculateTMMModifier, // Renamed to avoid conflict with movement.ts
  calculateHeatModifier,
  calculateMinimumRangeModifier,
  calculateProneModifier,
  calculateImmobileModifier,
  calculatePartialCoverModifier,
  calculatePilotWoundModifier,
  calculateSecondaryTargetModifier,
  calculateTargetingComputerModifier,
  calculateSensorDamageModifier,
  calculateActuatorDamageModifier,
  calculateAttackerProneModifier,
  calculateIndirectFireModifier,
  calculateCalledShotModifier,
  calculateToHit,
  calculateToHitFromContext,
  aggregateModifiers,
  getProbability,
  getRangeBracket as getToHitRangeBracket, // Renamed to avoid conflict with range.ts
  simpleToHit,
  formatToHitBreakdown,
} from './toHit';

export * from './hitLocation';
export * from './damage';
export * from './clusterWeapons';
