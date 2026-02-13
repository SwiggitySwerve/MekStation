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
  calculateToHitWithC3,
} from './toHit';

export * from './hitLocation';
export * from './damage';
export * from './clusterWeapons';
export * from './specialWeaponMechanics';
export * from './electronicWarfare';
export * from './c3Network';
export * from './environmentalModifiers';

// Dice Types - Dice rolling utilities
export * from './diceTypes';

// Ammo Tracking - Ammunition management and explosions
export * from './ammoTracking';

// Combat Statistics - Damage tracking and performance metrics
export * from './combatStatistics';

// Critical Hit Resolution - Critical hit determination and effects
export * from './criticalHitResolution';

// Event Payloads - Event payload extraction utilities
export * from './eventPayloads';

// Fall Mechanics - Fall damage and direction resolution
export * from './fallMechanics';

// Firing Arc - Arc calculations and facing
export * from './firingArc';

// Heat - Heat dissipation and effects
export * from './heat';

// Indirect Fire - Indirect fire and spotter mechanics
export * from './indirectFire';

// Line of Sight - LOS calculations and terrain blocking
export * from './lineOfSight';

// Physical Attacks - Melee combat resolution
export * from './physicalAttacks';

// Piloting Skill Rolls - PSR resolution and modifiers
export * from './pilotingSkillRolls';

// Quirk Modifiers - Unit and weapon quirk effects
export * from './quirkModifiers';

// SPA Modifiers - Special Pilot Ability effects
export * from './spaModifiers';

// Terrain Generator - Procedural terrain generation
export * from './terrainGenerator';
