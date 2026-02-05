/**
 * Scenario Template Data
 * Pre-defined scenario templates for battle generation.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import {
  BiomeType,
  DeploymentZone,
  type IScenarioTemplate,
  ScenarioObjectiveType,
} from '../../types/scenario';

/**
 * Standup Fight scenario - classic head-to-head battle.
 */
export const STANDUP_FIGHT_TEMPLATE: IScenarioTemplate = {
  id: 'standup_fight',
  name: 'Standup Fight',
  description:
    'A classic head-to-head engagement. Both forces deploy on opposite sides and fight until one is destroyed or withdraws.',
  objectiveType: ScenarioObjectiveType.Destroy,
  victoryConditions: [
    {
      id: 'destroy_all',
      name: 'Total Victory',
      description: 'Destroy or force the withdrawal of all enemy units.',
      primary: true,
      victoryPoints: 100,
    },
    {
      id: 'destroy_percent',
      name: 'Decisive Victory',
      description: 'Destroy at least 75% of enemy forces by BV.',
      primary: false,
      percentage: 75,
      victoryPoints: 75,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.South,
    depth: 3,
  },
  enemyDeployment: {
    zone: DeploymentZone.North,
    depth: 3,
  },
  turnLimit: 0,
  specialRules: [],
  suggestedBiomes: [BiomeType.Plains, BiomeType.Desert, BiomeType.Badlands],
  defaultOpForMultiplier: 1.0,
  supportsReinforcements: false,
  minPlayerUnits: 1,
  maxPlayerUnits: 0,
  tags: ['combat', 'classic', 'beginner-friendly'],
};

/**
 * Base Assault scenario - attack a defended position.
 */
export const BASE_ASSAULT_TEMPLATE: IScenarioTemplate = {
  id: 'base_assault',
  name: 'Base Assault',
  description:
    'Attack and destroy an enemy base or facility. The enemy has defensive positions and may receive reinforcements.',
  objectiveType: ScenarioObjectiveType.Capture,
  victoryConditions: [
    {
      id: 'capture_objective',
      name: 'Base Captured',
      description:
        'Capture the enemy base by moving a unit into the objective hex.',
      primary: true,
      objectiveCount: 1,
      victoryPoints: 100,
    },
    {
      id: 'destroy_percent',
      name: 'Base Destroyed',
      description: 'Destroy the base by eliminating all defending units.',
      primary: false,
      percentage: 100,
      victoryPoints: 75,
    },
  ],
  defeatConditions: [
    {
      id: 'destroy_percent',
      name: 'Force Destroyed',
      description: 'Your force has been eliminated.',
      primary: true,
      percentage: 100,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.South,
    depth: 2,
  },
  enemyDeployment: {
    zone: DeploymentZone.Center,
    depth: 4,
  },
  turnLimit: 20,
  specialRules: [
    {
      id: 'defender_advantage',
      name: 'Defender Advantage',
      description: 'Defending units receive +1 to-hit bonus when stationary.',
      optional: false,
      effects: { defenderBonus: 1 },
    },
  ],
  suggestedBiomes: [BiomeType.Urban, BiomeType.Plains],
  defaultOpForMultiplier: 0.8,
  supportsReinforcements: true,
  minPlayerUnits: 4,
  maxPlayerUnits: 0,
  tags: ['assault', 'objective', 'intermediate'],
};

/**
 * Defensive Hold scenario - defend a position.
 */
export const DEFENSIVE_HOLD_TEMPLATE: IScenarioTemplate = {
  id: 'defensive_hold',
  name: 'Defensive Hold',
  description:
    'Hold your position against enemy assault. Survive for the required number of turns or eliminate the attackers.',
  objectiveType: ScenarioObjectiveType.Defend,
  victoryConditions: [
    {
      id: 'survive_turns',
      name: 'Position Held',
      description:
        'Maintain at least one unit in the objective zone for 10 turns.',
      primary: true,
      turnCount: 10,
      minimumSurvivors: 1,
      victoryPoints: 100,
    },
    {
      id: 'destroy_all',
      name: 'Attackers Repulsed',
      description: 'Destroy all attacking forces.',
      primary: false,
      victoryPoints: 120,
    },
  ],
  defeatConditions: [
    {
      id: 'destroy_all',
      name: 'Defense Overrun',
      description: 'All defending units have been destroyed.',
      primary: true,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.Center,
    depth: 3,
  },
  enemyDeployment: {
    zone: DeploymentZone.North,
    depth: 2,
  },
  turnLimit: 15,
  specialRules: [
    {
      id: 'prepared_positions',
      name: 'Prepared Positions',
      description: 'Defending units may begin the game in hull-down positions.',
      optional: true,
      effects: { hullDownDeployment: true },
    },
  ],
  suggestedBiomes: [BiomeType.Urban, BiomeType.Mountains, BiomeType.Badlands],
  defaultOpForMultiplier: 1.2,
  supportsReinforcements: true,
  minPlayerUnits: 2,
  maxPlayerUnits: 8,
  tags: ['defense', 'survival', 'intermediate'],
};

/**
 * Convoy Escort scenario - protect moving units.
 */
export const CONVOY_ESCORT_TEMPLATE: IScenarioTemplate = {
  id: 'convoy_escort',
  name: 'Convoy Escort',
  description:
    'Protect a convoy of non-combat vehicles as they traverse the map. At least half the convoy must survive.',
  objectiveType: ScenarioObjectiveType.Escort,
  victoryConditions: [
    {
      id: 'escort_units',
      name: 'Convoy Protected',
      description:
        'At least 50% of convoy vehicles must exit the far map edge.',
      primary: true,
      requiredUnits: 0,
      requiredPercent: 50,
      victoryPoints: 100,
    },
    {
      id: 'escort_units',
      name: 'Perfect Escort',
      description: 'All convoy vehicles exit safely.',
      primary: false,
      requiredPercent: 100,
      requiredUnits: 0,
      victoryPoints: 150,
    },
  ],
  defeatConditions: [
    {
      id: 'escort_units',
      name: 'Convoy Lost',
      description: 'More than 50% of convoy vehicles destroyed.',
      primary: true,
      requiredPercent: 50,
      requiredUnits: 0,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.South,
    depth: 2,
  },
  enemyDeployment: {
    zone: DeploymentZone.East,
    depth: 3,
  },
  turnLimit: 15,
  specialRules: [
    {
      id: 'convoy_movement',
      name: 'Convoy Movement',
      description:
        'Convoy vehicles must move towards the exit each turn if possible.',
      optional: false,
      effects: { forcedMovement: true, exitEdge: 'north' },
    },
    {
      id: 'ambush_deployment',
      name: 'Ambush',
      description: 'Enemy forces may deploy hidden.',
      optional: true,
      effects: { hiddenDeployment: true },
    },
  ],
  suggestedBiomes: [BiomeType.Forest, BiomeType.Mountains, BiomeType.Jungle],
  defaultOpForMultiplier: 0.9,
  supportsReinforcements: true,
  minPlayerUnits: 2,
  maxPlayerUnits: 6,
  tags: ['escort', 'protection', 'advanced'],
};

/**
 * Recon scenario - scout and withdraw.
 */
export const RECON_TEMPLATE: IScenarioTemplate = {
  id: 'recon',
  name: 'Reconnaissance',
  description:
    'Scout enemy positions and gather intelligence. Scan designated objectives and withdraw before being overwhelmed.',
  objectiveType: ScenarioObjectiveType.Recon,
  victoryConditions: [
    {
      id: 'recon',
      name: 'Intel Gathered',
      description: 'Scan at least 3 objectives and exit at least one unit.',
      primary: true,
      requiredUnits: 1,
      scanObjectives: 3,
      victoryPoints: 100,
    },
    {
      id: 'recon',
      name: 'Complete Recon',
      description: 'Scan all 5 objectives and exit at least half your force.',
      primary: false,
      requiredUnits: 0,
      requiredPercent: 50,
      scanObjectives: 5,
      victoryPoints: 150,
    },
  ],
  defeatConditions: [
    {
      id: 'destroy_all',
      name: 'Recon Force Lost',
      description: 'All recon units destroyed.',
      primary: true,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.South,
    depth: 2,
  },
  enemyDeployment: {
    zone: DeploymentZone.Scattered,
    depth: 0,
  },
  turnLimit: 12,
  specialRules: [
    {
      id: 'sensor_scan',
      name: 'Sensor Scan',
      description:
        'Units can scan objectives by ending movement adjacent to them.',
      optional: false,
      effects: { scanRange: 1 },
    },
    {
      id: 'light_units',
      name: 'Light Forces',
      description: 'Recommended to use fast, light units for this mission.',
      optional: true,
      effects: {},
    },
  ],
  suggestedBiomes: [BiomeType.Forest, BiomeType.Jungle, BiomeType.Urban],
  defaultOpForMultiplier: 1.3,
  supportsReinforcements: false,
  minPlayerUnits: 2,
  maxPlayerUnits: 4,
  tags: ['recon', 'stealth', 'speed', 'advanced'],
};

/**
 * Breakthrough scenario - escape through enemy lines.
 */
export const BREAKTHROUGH_TEMPLATE: IScenarioTemplate = {
  id: 'breakthrough',
  name: 'Breakthrough',
  description:
    'Break through enemy lines and exit units from the far map edge. Speed and firepower are both valuable.',
  objectiveType: ScenarioObjectiveType.Breakthrough,
  victoryConditions: [
    {
      id: 'breakthrough',
      name: 'Successful Breakthrough',
      description: 'Exit at least 50% of your force from the enemy map edge.',
      primary: true,
      requiredUnits: 0,
      requiredPercent: 50,
      victoryPoints: 100,
    },
    {
      id: 'breakthrough',
      name: 'Total Breakthrough',
      description: 'Exit at least 75% of your force.',
      primary: false,
      requiredUnits: 0,
      requiredPercent: 75,
      victoryPoints: 125,
    },
  ],
  defeatConditions: [
    {
      id: 'destroy_percent',
      name: 'Breakthrough Failed',
      description: 'Fewer than 25% of units exit.',
      primary: true,
      percentage: 25,
    },
  ],
  playerDeployment: {
    zone: DeploymentZone.South,
    depth: 2,
  },
  enemyDeployment: {
    zone: DeploymentZone.Center,
    depth: 6,
  },
  turnLimit: 10,
  specialRules: [
    {
      id: 'exit_zone',
      name: 'Exit Zone',
      description: 'Units must exit from the northern map edge.',
      optional: false,
      effects: { exitEdge: 'north' },
    },
    {
      id: 'blocking_force',
      name: 'Blocking Force',
      description: 'Enemy units are deployed to block your advance.',
      optional: false,
      effects: { spreadDeployment: true },
    },
  ],
  suggestedBiomes: [BiomeType.Plains, BiomeType.Desert, BiomeType.Badlands],
  defaultOpForMultiplier: 1.1,
  supportsReinforcements: false,
  minPlayerUnits: 4,
  maxPlayerUnits: 12,
  tags: ['breakthrough', 'speed', 'intermediate'],
};

/**
 * All available scenario templates.
 */
export const SCENARIO_TEMPLATES: readonly IScenarioTemplate[] = [
  STANDUP_FIGHT_TEMPLATE,
  BASE_ASSAULT_TEMPLATE,
  DEFENSIVE_HOLD_TEMPLATE,
  CONVOY_ESCORT_TEMPLATE,
  RECON_TEMPLATE,
  BREAKTHROUGH_TEMPLATE,
];

/**
 * Get a scenario template by ID.
 */
export function getScenarioTemplateById(
  id: string,
): IScenarioTemplate | undefined {
  return SCENARIO_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get scenario templates by objective type.
 */
export function getScenarioTemplatesByObjective(
  objectiveType: ScenarioObjectiveType,
): readonly IScenarioTemplate[] {
  return SCENARIO_TEMPLATES.filter((t) => t.objectiveType === objectiveType);
}

/**
 * Get scenario templates by tag.
 */
export function getScenarioTemplatesByTag(
  tag: string,
): readonly IScenarioTemplate[] {
  return SCENARIO_TEMPLATES.filter((t) => t.tags.includes(tag));
}
