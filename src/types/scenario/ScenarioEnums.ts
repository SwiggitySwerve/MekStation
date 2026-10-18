// =============================================================================
// Scenario Template Enums
// =============================================================================

/**
 * Objective types for scenarios.
 * Determines win conditions and tactical goals.
 */
export enum ScenarioObjectiveType {
  /** Destroy all enemy units or force withdrawal */
  Destroy = 'destroy',
  /** Capture and hold a specific location */
  Capture = 'capture',
  /** Defend a position for a set number of turns */
  Defend = 'defend',
  /** Escort units from one edge to another */
  Escort = 'escort',
  /** Scan objectives and exit the map */
  Recon = 'recon',
  /** Exit units from the enemy map edge */
  Breakthrough = 'breakthrough',
  /** Custom objective defined by scenario */
  Custom = 'custom',
}

/**
 * Deployment zone types.
 */
export enum DeploymentZone {
  /** Northern map edge */
  North = 'north',
  /** Southern map edge */
  South = 'south',
  /** Eastern map edge */
  East = 'east',
  /** Western map edge */
  West = 'west',
  /** Center of the map */
  Center = 'center',
  /** Random deployment within specified radius */
  Random = 'random',
  /** Scattered deployment (orbital drop) */
  Scattered = 'scattered',
}

/**
 * Biome types for terrain generation.
 */
export enum BiomeType {
  /** Open grasslands, minimal terrain */
  Plains = 'plains',
  /** Scattered to dense forest */
  Forest = 'forest',
  /** Urban environment with buildings */
  Urban = 'urban',
  /** Rocky, uneven terrain */
  Badlands = 'badlands',
  /** Arid desert environment */
  Desert = 'desert',
  /** Frozen tundra */
  Arctic = 'arctic',
  /** Swamps and wetlands */
  Swamp = 'swamp',
  /** Volcanic/lava terrain */
  Volcanic = 'volcanic',
  /** Tropical jungle */
  Jungle = 'jungle',
  /** Mountainous terrain */
  Mountains = 'mountains',
}

/**
 * Modifier effect types.
 */
export enum ModifierEffect {
  /** Positive for the player */
  Positive = 'positive',
  /** Negative for the player */
  Negative = 'negative',
  /** Neutral - affects both sides equally */
  Neutral = 'neutral',
}

/**
 * Skill level templates for OpFor pilots.
 */
export enum OpForSkillLevel {
  /** Green: Gunnery 5, Piloting 6 */
  Green = 'green',
  /** Regular: Gunnery 4, Piloting 5 */
  Regular = 'regular',
  /** Veteran: Gunnery 3, Piloting 4 */
  Veteran = 'veteran',
  /** Elite: Gunnery 2, Piloting 3 */
  Elite = 'elite',
  /** Legendary: Gunnery 1, Piloting 2 */
  Legendary = 'legendary',
  /** Mixed skills within the force */
  Mixed = 'mixed',
}

/**
 * Unit type categories for OpFor generation.
 */
export enum UnitTypeCategory {
  BattleMech = 'battlemech',
  Vehicle = 'vehicle',
  Infantry = 'infantry',
  BattleArmor = 'battle_armor',
  Aerospace = 'aerospace',
  ProtoMech = 'protomech',
  ConventionalFighter = 'conventional_fighter',
}
