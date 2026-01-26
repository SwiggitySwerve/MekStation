/**
 * ScenarioStatus - Campaign scenario status enumeration
 * Defines the status of a scenario/battle.
 */

/**
 * Scenario/battle status
 */
export enum ScenarioStatus {
  /** Scenario currently active */
  CURRENT = 'Current',
  
  /** Scenario resulted in player victory */
  VICTORY = 'Victory',
  
  /** Scenario resulted in player defeat */
  DEFEAT = 'Defeat',
  
  /** Scenario resulted in draw */
  DRAW = 'Draw',
  
  /** Scenario pending start */
  PENDING = 'Pending',
  
  /** Scenario cancelled */
  CANCELLED = 'Cancelled',
  
  /** Scenario paused */
  PAUSED = 'Paused',
  
  /** Scenario completed with mixed results */
  MIXED = 'Mixed Results',
}

/**
 * Array of all valid ScenarioStatus values for iteration
 */
export const ALL_SCENARIO_STATUSES: readonly ScenarioStatus[] = Object.freeze([
  ScenarioStatus.CURRENT,
  ScenarioStatus.VICTORY,
  ScenarioStatus.DEFEAT,
  ScenarioStatus.DRAW,
  ScenarioStatus.PENDING,
  ScenarioStatus.CANCELLED,
  ScenarioStatus.PAUSED,
  ScenarioStatus.MIXED,
]);

/**
 * Check if a value is a valid ScenarioStatus
 */
export function isValidScenarioStatus(value: unknown): value is ScenarioStatus {
  return Object.values(ScenarioStatus).includes(value as ScenarioStatus);
}

/**
 * Display name for ScenarioStatus
 */
export function displayScenarioStatus(status: ScenarioStatus): string {
  return status;
}
