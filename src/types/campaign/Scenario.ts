/**
 * Scenario and Objective entities for campaign missions
 *
 * A Scenario represents a single battle/engagement within a mission.
 * Each scenario has objectives that determine success or failure.
 *
 * Based on MekHQ Scenario.java and ScenarioObjective.java, simplified for MVP.
 *
 * @module campaign/Scenario
 */

import { ScenarioStatus } from './enums/ScenarioStatus';
import type { IScenarioConditions } from './scenario/scenarioTypes';

// =============================================================================
// Objective Type
// =============================================================================

/**
 * Types of scenario objectives.
 *
 * - Destroy: Eliminate specific targets
 * - Capture: Capture a location or unit
 * - Defend: Hold a position for a duration
 * - Escort: Protect a unit/convoy to destination
 * - Recon: Scout an area and report
 * - Withdraw: Safely extract forces
 * - Custom: User-defined objective
 */
export type ObjectiveType =
  | 'Destroy'
  | 'Capture'
  | 'Defend'
  | 'Escort'
  | 'Recon'
  | 'Withdraw'
  | 'Custom';

// =============================================================================
// Objective Interface
// =============================================================================

/**
 * A single objective within a scenario.
 *
 * Objectives define what must be accomplished for a scenario to be
 * considered successful. Required objectives must all be completed
 * for full success; optional objectives provide bonuses.
 *
 * @example
 * const objective: IObjective = {
 *   id: 'obj-001',
 *   description: 'Destroy the enemy command lance',
 *   type: 'Destroy',
 *   completed: false,
 *   required: true,
 * };
 */
export interface IObjective {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable description of the objective */
  readonly description: string;

  /** Type of objective */
  readonly type: ObjectiveType;

  /** Whether this objective has been completed */
  readonly completed: boolean;

  /** Whether this objective is required for mission success */
  readonly required: boolean;
}

// =============================================================================
// Scenario Interface
// =============================================================================

/**
 * A scenario (battle/engagement) within a mission.
 *
 * Scenarios represent individual battles that make up a mission.
 * Each scenario has a set of objectives, deployed forces, and
 * terrain/map configuration.
 *
 * @example
 * const scenario: IScenario = {
 *   id: 'scenario-001',
 *   name: 'Supply Depot Raid',
 *   status: ScenarioStatus.PENDING,
 *   missionId: 'mission-001',
 *   deployedForceIds: ['force-alpha', 'force-bravo'],
 *   objectives: [objective1, objective2],
 *   terrainType: 'Urban',
 *   mapSize: { width: 30, height: 20 },
 *   opponentForceDescription: 'One lance of medium mechs with infantry support',
 *   date: '3025-06-20',
 *   createdAt: '2026-01-26T10:00:00Z',
 *   updatedAt: '2026-01-26T10:00:00Z',
 * };
 */
export interface IScenario {
  /** Unique identifier */
  readonly id: string;

  /** Scenario name */
  readonly name: string;

  /** Current scenario status */
  readonly status: ScenarioStatus;

  /** Parent mission ID */
  readonly missionId: string;

  /** IDs of forces deployed to this scenario */
  readonly deployedForceIds: readonly string[];

  /** Scenario objectives */
  readonly objectives: readonly IObjective[];

  /** Terrain type (e.g., 'Urban', 'Forest', 'Desert', 'Plains') */
  readonly terrainType: string;

  /** Map dimensions */
  readonly mapSize: {
    readonly width: number;
    readonly height: number;
  };

   /** Description of opposing forces */
   readonly opponentForceDescription: string;

   /** Date when scenario occurs (ISO date string, e.g., '3025-06-20') */
   readonly date?: string;

   /** Environmental conditions for this scenario (optional) */
   readonly conditions?: IScenarioConditions;

   /** After-action report (filled after completion) */
   readonly report?: string;

   /** Creation timestamp (ISO 8601) */
   readonly createdAt: string;

   /** Last update timestamp (ISO 8601) */
   readonly updatedAt: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a scenario is in a terminal (completed) state.
 *
 * Terminal states: Victory, Defeat, Draw, Cancelled, Mixed
 *
 * @param scenario - The scenario to check
 * @returns true if the scenario is complete
 *
 * @example
 * if (isScenarioComplete(scenario)) {
 *   console.log('Battle is over');
 * }
 */
export function isScenarioComplete(scenario: IScenario): boolean {
  const terminalStatuses: ScenarioStatus[] = [
    ScenarioStatus.VICTORY,
    ScenarioStatus.DEFEAT,
    ScenarioStatus.DRAW,
    ScenarioStatus.CANCELLED,
    ScenarioStatus.MIXED,
  ];
  return terminalStatuses.includes(scenario.status);
}

/**
 * Checks if a scenario was a success (all required objectives met).
 *
 * A scenario is successful when ALL required objectives are completed.
 * If there are no required objectives, the scenario is considered successful
 * if it has Victory status.
 *
 * @param scenario - The scenario to check
 * @returns true if all required objectives are completed
 *
 * @example
 * if (isScenarioSuccess(scenario)) {
 *   console.log('Mission accomplished!');
 * }
 */
export function isScenarioSuccess(scenario: IScenario): boolean {
  const requiredObjectives = scenario.objectives.filter((o) => o.required);
  if (requiredObjectives.length === 0) {
    return scenario.status === ScenarioStatus.VICTORY;
  }
  return requiredObjectives.every((o) => o.completed);
}

/**
 * Gets all required objectives from a scenario.
 *
 * @param scenario - The scenario to query
 * @returns Array of required objectives
 *
 * @example
 * const required = getRequiredObjectives(scenario);
 */
export function getRequiredObjectives(scenario: IScenario): IObjective[] {
  return scenario.objectives.filter((o) => o.required);
}

/**
 * Gets all optional objectives from a scenario.
 *
 * @param scenario - The scenario to query
 * @returns Array of optional objectives
 */
export function getOptionalObjectives(scenario: IScenario): IObjective[] {
  return scenario.objectives.filter((o) => !o.required);
}

/**
 * Gets all completed objectives from a scenario.
 *
 * @param scenario - The scenario to query
 * @returns Array of completed objectives
 */
export function getCompletedObjectives(scenario: IScenario): IObjective[] {
  return scenario.objectives.filter((o) => o.completed);
}

/**
 * Gets the completion percentage of objectives.
 *
 * @param scenario - The scenario to query
 * @returns Percentage (0-100) of completed objectives
 */
export function getObjectiveCompletionPercent(scenario: IScenario): number {
  if (scenario.objectives.length === 0) return 100;
  const completed = scenario.objectives.filter((o) => o.completed).length;
  return Math.round((completed / scenario.objectives.length) * 100);
}

/**
 * Gets the number of deployed forces.
 *
 * @param scenario - The scenario to query
 * @returns Number of deployed force IDs
 */
export function getDeployedForceCount(scenario: IScenario): number {
  return scenario.deployedForceIds.length;
}

/**
 * Checks if a scenario has any deployed forces.
 *
 * @param scenario - The scenario to check
 * @returns true if at least one force is deployed
 */
export function hasDeployedForces(scenario: IScenario): boolean {
  return scenario.deployedForceIds.length > 0;
}

/**
 * Checks if a scenario has any objectives.
 *
 * @param scenario - The scenario to check
 * @returns true if at least one objective exists
 */
export function hasObjectives(scenario: IScenario): boolean {
  return scenario.objectives.length > 0;
}

/**
 * Checks if a scenario is in a pending/not-yet-started state.
 *
 * @param scenario - The scenario to check
 * @returns true if status is PENDING
 */
export function isScenarioPending(scenario: IScenario): boolean {
  return scenario.status === ScenarioStatus.PENDING;
}

/**
 * Checks if a scenario is currently active.
 *
 * @param scenario - The scenario to check
 * @returns true if status is CURRENT
 */
export function isScenarioActive(scenario: IScenario): boolean {
  return scenario.status === ScenarioStatus.CURRENT;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is an IObjective.
 *
 * @param value - The value to check
 * @returns true if the value is an IObjective
 *
 * @example
 * if (isObjective(obj)) {
 *   console.log(obj.description);
 * }
 */
export function isObjective(value: unknown): value is IObjective {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as IObjective;
  return (
    typeof obj.id === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.completed === 'boolean' &&
    typeof obj.required === 'boolean'
  );
}

/**
 * Type guard to check if a value is an IScenario.
 *
 * @param value - The value to check
 * @returns true if the value is an IScenario
 *
 * @example
 * if (isScenario(obj)) {
 *   console.log(obj.name);
 * }
 */
export function isScenario(value: unknown): value is IScenario {
  if (typeof value !== 'object' || value === null) return false;
  const scenario = value as IScenario;
  return (
    typeof scenario.id === 'string' &&
    typeof scenario.name === 'string' &&
    typeof scenario.status === 'string' &&
    typeof scenario.missionId === 'string' &&
    Array.isArray(scenario.deployedForceIds) &&
    Array.isArray(scenario.objectives) &&
    typeof scenario.terrainType === 'string' &&
    typeof scenario.mapSize === 'object' &&
    scenario.mapSize !== null &&
    typeof scenario.mapSize.width === 'number' &&
    typeof scenario.mapSize.height === 'number' &&
    typeof scenario.opponentForceDescription === 'string' &&
    typeof scenario.createdAt === 'string' &&
    typeof scenario.updatedAt === 'string'
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new objective with default values.
 *
 * @param params - Objective parameters
 * @returns A new IObjective instance
 *
 * @example
 * const obj = createObjective({
 *   id: 'obj-001',
 *   description: 'Destroy enemy command lance',
 * });
 */
export function createObjective(params: {
  id: string;
  description: string;
  type?: ObjectiveType;
  completed?: boolean;
  required?: boolean;
}): IObjective {
  return {
    id: params.id,
    description: params.description,
    type: params.type ?? 'Custom',
    completed: params.completed ?? false,
    required: params.required ?? true,
  };
}

/**
 * Creates a new scenario with default values.
 *
 * @param params - Scenario parameters
 * @returns A new IScenario instance
 *
 * @example
 * const scenario = createScenario({
 *   id: 'scenario-001',
 *   name: 'Supply Depot Raid',
 *   missionId: 'mission-001',
 * });
 */
export function createScenario(params: {
  id: string;
  name: string;
  missionId: string;
  status?: ScenarioStatus;
  deployedForceIds?: string[];
  objectives?: IObjective[];
  terrainType?: string;
  mapSize?: { width: number; height: number };
  opponentForceDescription?: string;
  date?: string;
  report?: string;
}): IScenario {
  const now = new Date().toISOString();
  return {
    id: params.id,
    name: params.name,
    status: params.status ?? ScenarioStatus.PENDING,
    missionId: params.missionId,
    deployedForceIds: params.deployedForceIds ?? [],
    objectives: params.objectives ?? [],
    terrainType: params.terrainType ?? 'Plains',
    mapSize: params.mapSize ?? { width: 30, height: 20 },
    opponentForceDescription: params.opponentForceDescription ?? 'Unknown forces',
    date: params.date,
    report: params.report,
    createdAt: now,
    updatedAt: now,
  };
}
