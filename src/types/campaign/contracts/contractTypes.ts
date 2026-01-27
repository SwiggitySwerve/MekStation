/**
 * Against the Bot (AtB) Contract Types and Definitions
 *
 * Defines 19 contract types organized into 4 groups (Garrison, Raid, Guerrilla, Special),
 * with operational tempo ranges, negotiation clause types, and clause levels.
 *
 * Based on MekHQ's AtB contract system.
 *
 * @module campaign/contracts/contractTypes
 */

import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';

// =============================================================================
// Contract Type Enum
// =============================================================================

/**
 * 19 Against the Bot contract types organized into 4 groups.
 *
 * Each type has an operational tempo range (multiplier on base pay) and
 * typical contract duration.
 *
 * @example
 * const type: AtBContractType = AtBContractType.GARRISON_DUTY;
 */
export enum AtBContractType {
  // Garrison Group (5 types) - defensive, low-intensity operations
  GARRISON_DUTY = 'garrison_duty',
  CADRE_DUTY = 'cadre_duty',
  SECURITY_DUTY = 'security_duty',
  RIOT_DUTY = 'riot_duty',
  RETAINER = 'retainer',

  // Raid Group (6 types) - offensive, short-duration operations
  DIVERSIONARY_RAID = 'diversionary_raid',
  OBJECTIVE_RAID = 'objective_raid',
  RECON_RAID = 'recon_raid',
  EXTRACTION_RAID = 'extraction_raid',
  ASSASSINATION = 'assassination',
  OBSERVATION_RAID = 'observation_raid',

  // Guerrilla Group (4 types) - long-duration, high-intensity operations
  GUERRILLA_WARFARE = 'guerrilla_warfare',
  ESPIONAGE = 'espionage',
  SABOTAGE = 'sabotage',
  TERRORISM = 'terrorism',

  // Special Group (4 types) - specialized operations
  PLANETARY_ASSAULT = 'planetary_assault',
  RELIEF_DUTY = 'relief_duty',
  PIRATE_HUNTING = 'pirate_hunting',
  MOLE_HUNTING = 'mole_hunting',
}

// =============================================================================
// Contract Group Type
// =============================================================================

/**
 * Contract groups for organizing contract types.
 *
 * @example
 * const group: ContractGroup = 'garrison';
 */
export type ContractGroup = 'garrison' | 'raid' | 'guerrilla' | 'special';

// =============================================================================
// Contract Type Definition Interface
// =============================================================================

/**
 * Definition of a contract type with operational parameters.
 *
 * @example
 * const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.GARRISON_DUTY];
 * console.log(def.name); // 'Garrison Duty'
 * console.log(def.opsTempo.min); // 1.0
 * console.log(def.opsTempo.max); // 1.0
 */
export interface IContractTypeDefinition {
  /** Display name of the contract type */
  readonly name: string;

  /** Contract group this type belongs to */
  readonly group: ContractGroup;

  /** Description of the contract type */
  readonly description: string;

  /** Typical contract duration in months */
  readonly durationMonths: number;

  /** Operational tempo range (pay multiplier) */
  readonly opsTempo: {
    readonly min: number;
    readonly max: number;
  };

  /** Primary combat roles for this contract type */
  readonly primaryRoles: readonly CombatRole[];

  /** Whether this contract type is available for player selection */
  readonly available: boolean;
}

// =============================================================================
// Contract Type Definitions
// =============================================================================

/**
 * Complete definitions for all 19 contract types.
 *
 * Organized by group for easy lookup and filtering.
 *
 * @example
 * const garrison = Object.entries(CONTRACT_TYPE_DEFINITIONS)
 *   .filter(([_, def]) => def.group === 'garrison')
 *   .map(([type, def]) => ({ type, ...def }));
 */
export const CONTRACT_TYPE_DEFINITIONS: Record<
  AtBContractType,
  IContractTypeDefinition
> = {
  // =========================================================================
  // Garrison Group (5 types)
  // =========================================================================

  [AtBContractType.GARRISON_DUTY]: {
    name: 'Garrison Duty',
    group: 'garrison',
    description: 'Defend a fixed position or installation',
    durationMonths: 18,
    opsTempo: { min: 1.0, max: 1.0 },
    primaryRoles: [CombatRole.FRONTLINE, CombatRole.AUXILIARY],
    available: true,
  },

  [AtBContractType.CADRE_DUTY]: {
    name: 'Cadre Duty',
    group: 'garrison',
    description: 'Train and mentor local forces',
    durationMonths: 12,
    opsTempo: { min: 0.8, max: 0.8 },
    primaryRoles: [CombatRole.TRAINING, CombatRole.CADRE],
    available: true,
  },

  [AtBContractType.SECURITY_DUTY]: {
    name: 'Security Duty',
    group: 'garrison',
    description: 'Provide security for a location or convoy',
    durationMonths: 6,
    opsTempo: { min: 1.2, max: 1.2 },
    primaryRoles: [CombatRole.PATROL, CombatRole.AUXILIARY],
    available: true,
  },

  [AtBContractType.RIOT_DUTY]: {
    name: 'Riot Duty',
    group: 'garrison',
    description: 'Suppress civil unrest and maintain order',
    durationMonths: 4,
    opsTempo: { min: 1.0, max: 1.0 },
    primaryRoles: [CombatRole.FRONTLINE, CombatRole.PATROL],
    available: true,
  },

  [AtBContractType.RETAINER]: {
    name: 'Retainer',
    group: 'garrison',
    description: 'Maintain readiness on standby',
    durationMonths: 12,
    opsTempo: { min: 1.3, max: 1.3 },
    primaryRoles: [CombatRole.RESERVE, CombatRole.AUXILIARY],
    available: true,
  },

  // =========================================================================
  // Raid Group (6 types)
  // =========================================================================

  [AtBContractType.DIVERSIONARY_RAID]: {
    name: 'Diversionary Raid',
    group: 'raid',
    description: 'Conduct a raid to distract enemy forces',
    durationMonths: 3,
    opsTempo: { min: 1.8, max: 1.8 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.PATROL],
    available: true,
  },

  [AtBContractType.OBJECTIVE_RAID]: {
    name: 'Objective Raid',
    group: 'raid',
    description: 'Raid to capture or destroy a specific objective',
    durationMonths: 3,
    opsTempo: { min: 1.6, max: 1.6 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.FRONTLINE],
    available: true,
  },

  [AtBContractType.RECON_RAID]: {
    name: 'Recon Raid',
    group: 'raid',
    description: 'Conduct reconnaissance in force',
    durationMonths: 3,
    opsTempo: { min: 1.6, max: 1.6 },
    primaryRoles: [CombatRole.PATROL, CombatRole.MANEUVER],
    available: true,
  },

  [AtBContractType.EXTRACTION_RAID]: {
    name: 'Extraction Raid',
    group: 'raid',
    description: 'Raid to extract personnel or assets',
    durationMonths: 3,
    opsTempo: { min: 1.6, max: 1.6 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.FRONTLINE],
    available: true,
  },

  [AtBContractType.ASSASSINATION]: {
    name: 'Assassination',
    group: 'raid',
    description: 'Eliminate a high-value target',
    durationMonths: 3,
    opsTempo: { min: 1.9, max: 1.9 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.PATROL],
    available: true,
  },

  [AtBContractType.OBSERVATION_RAID]: {
    name: 'Observation Raid',
    group: 'raid',
    description: 'Raid to observe and report on enemy activity',
    durationMonths: 3,
    opsTempo: { min: 1.6, max: 1.6 },
    primaryRoles: [CombatRole.PATROL, CombatRole.MANEUVER],
    available: true,
  },

  // =========================================================================
  // Guerrilla Group (4 types)
  // =========================================================================

  [AtBContractType.GUERRILLA_WARFARE]: {
    name: 'Guerrilla Warfare',
    group: 'guerrilla',
    description: 'Conduct sustained guerrilla operations',
    durationMonths: 24,
    opsTempo: { min: 2.1, max: 2.1 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.PATROL],
    available: true,
  },

  [AtBContractType.ESPIONAGE]: {
    name: 'Espionage',
    group: 'guerrilla',
    description: 'Gather intelligence through covert operations',
    durationMonths: 12,
    opsTempo: { min: 2.4, max: 2.4 },
    primaryRoles: [CombatRole.PATROL, CombatRole.AUXILIARY],
    available: true,
  },

  [AtBContractType.SABOTAGE]: {
    name: 'Sabotage',
    group: 'guerrilla',
    description: 'Conduct sabotage operations against enemy infrastructure',
    durationMonths: 24,
    opsTempo: { min: 2.4, max: 2.4 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.PATROL],
    available: true,
  },

  [AtBContractType.TERRORISM]: {
    name: 'Terrorism',
    group: 'guerrilla',
    description: 'Conduct terror operations to demoralize enemy',
    durationMonths: 3,
    opsTempo: { min: 1.9, max: 1.9 },
    primaryRoles: [CombatRole.MANEUVER, CombatRole.PATROL],
    available: true,
  },

  // =========================================================================
  // Special Group (4 types)
  // =========================================================================

  [AtBContractType.PLANETARY_ASSAULT]: {
    name: 'Planetary Assault',
    group: 'special',
    description: 'Conduct a large-scale planetary assault',
    durationMonths: 9,
    opsTempo: { min: 1.5, max: 1.5 },
    primaryRoles: [CombatRole.FRONTLINE, CombatRole.MANEUVER],
    available: true,
  },

  [AtBContractType.RELIEF_DUTY]: {
    name: 'Relief Duty',
    group: 'special',
    description: 'Provide relief and humanitarian assistance',
    durationMonths: 9,
    opsTempo: { min: 1.4, max: 1.4 },
    primaryRoles: [CombatRole.AUXILIARY, CombatRole.TRAINING],
    available: true,
  },

  [AtBContractType.PIRATE_HUNTING]: {
    name: 'Pirate Hunting',
    group: 'special',
    description: 'Hunt and eliminate pirate forces',
    durationMonths: 6,
    opsTempo: { min: 1.0, max: 1.0 },
    primaryRoles: [CombatRole.PATROL, CombatRole.MANEUVER],
    available: true,
  },

  [AtBContractType.MOLE_HUNTING]: {
    name: 'Mole Hunting',
    group: 'special',
    description: 'Hunt and eliminate infiltrators and saboteurs',
    durationMonths: 6,
    opsTempo: { min: 1.2, max: 1.2 },
    primaryRoles: [CombatRole.PATROL, CombatRole.FRONTLINE],
    available: true,
  },
};

// =============================================================================
// Contract Clause Type Enum
// =============================================================================

/**
 * Types of negotiation clauses for contracts.
 *
 * Each clause type has 4 levels (0-3) representing increasing commitment
 * or benefit to the player unit.
 *
 * @example
 * const clauseType: ContractClauseType = ContractClauseType.COMMAND;
 */
export enum ContractClauseType {
  /** Command authority and tactical autonomy */
  COMMAND = 'command',

  /** Salvage rights and equipment recovery */
  SALVAGE = 'salvage',

  /** Support and logistics provided by employer */
  SUPPORT = 'support',

  /** Transport and deployment logistics */
  TRANSPORT = 'transport',
}

// =============================================================================
// Contract Clause Interface
// =============================================================================

/**
 * A negotiation clause for a contract.
 *
 * Clauses define specific terms and conditions of the contract.
 *
 * @example
 * const clause: IContractClause = {
 *   type: ContractClauseType.COMMAND,
 *   level: 2,
 * };
 */
export interface IContractClause {
  /** Type of clause */
  readonly type: ContractClauseType;

  /** Level of the clause (0-3) */
  readonly level: 0 | 1 | 2 | 3;
}

// =============================================================================
// Clause Level Definitions
// =============================================================================

/**
 * Definition of a clause level.
 *
 * @example
 * const level = CLAUSE_LEVELS[ContractClauseType.COMMAND][2];
 * console.log(level.name); // 'Liaison'
 */
export interface IClauseLevelDefinition {
  /** Display name of the level */
  readonly name: string;

  /** Description of what this level provides */
  readonly description: string;
}

/**
 * Definitions for all clause levels by type.
 *
 * Each clause type has 4 levels (0-3) with increasing benefits/commitment.
 *
 * @example
 * const commandLevels = CLAUSE_LEVELS[ContractClauseType.COMMAND];
 * console.log(commandLevels[0].name); // 'Integrated'
 */
export const CLAUSE_LEVELS: Record<
  ContractClauseType,
  Record<0 | 1 | 2 | 3, IClauseLevelDefinition>
> = {
  [ContractClauseType.COMMAND]: {
    0: {
      name: 'Integrated',
      description: 'Unit is fully integrated into employer command structure',
    },
    1: {
      name: 'House',
      description: 'Employer provides strategic direction, unit handles tactics',
    },
    2: {
      name: 'Liaison',
      description: 'Liaison officer coordinates with employer',
    },
    3: {
      name: 'Independent',
      description: 'Unit has full tactical autonomy',
    },
  },

  [ContractClauseType.SALVAGE]: {
    0: {
      name: 'None',
      description: 'No salvage rights (employer keeps all)',
    },
    1: {
      name: 'Exchange',
      description: 'Unit can exchange salvage for cash at a percentage',
    },
    2: {
      name: 'Employer',
      description: 'Employer provides salvage from their stores',
    },
    3: {
      name: 'Integrated',
      description: 'Unit keeps a percentage of salvage directly',
    },
  },

  [ContractClauseType.SUPPORT]: {
    0: {
      name: 'None',
      description: 'No support provided by employer',
    },
    1: {
      name: 'Supplies Only',
      description: 'Employer provides ammunition and supplies',
    },
    2: {
      name: 'Partial',
      description: 'Employer provides supplies and repair facilities',
    },
    3: {
      name: 'Full',
      description: 'Employer provides full logistics and medical support',
    },
  },

  [ContractClauseType.TRANSPORT]: {
    0: {
      name: 'None',
      description: 'Unit provides own transport',
    },
    1: {
      name: 'Limited',
      description: 'Employer provides limited transport for personnel',
    },
    2: {
      name: 'Partial',
      description: 'Employer provides transport for personnel and light equipment',
    },
    3: {
      name: 'Full',
      description: 'Employer provides full transport for all personnel and equipment',
    },
  },
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is an AtBContractType.
 *
 * @param value - The value to check
 * @returns true if the value is a valid AtBContractType
 *
 * @example
 * if (isAtBContractType(value)) {
 *   // value is AtBContractType
 * }
 */
export function isAtBContractType(value: unknown): value is AtBContractType {
  return Object.values(AtBContractType).includes(value as AtBContractType);
}

/**
 * Type guard to check if a value is a ContractClauseType.
 *
 * @param value - The value to check
 * @returns true if the value is a valid ContractClauseType
 *
 * @example
 * if (isContractClauseType(value)) {
 *   // value is ContractClauseType
 * }
 */
export function isContractClauseType(
  value: unknown
): value is ContractClauseType {
  return Object.values(ContractClauseType).includes(value as ContractClauseType);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets all contract types in a specific group.
 *
 * @param group - The contract group to filter by
 * @returns Array of contract types in the group
 *
 * @example
 * const garrisonTypes = getContractTypesByGroup('garrison');
 * // Returns: [GARRISON_DUTY, CADRE_DUTY, SECURITY_DUTY, RIOT_DUTY, RETAINER]
 */
export function getContractTypesByGroup(group: ContractGroup): AtBContractType[] {
  return Object.entries(CONTRACT_TYPE_DEFINITIONS)
    .filter(([_, def]) => def.group === group)
    .map(([type]) => type as AtBContractType);
}

/**
 * Gets the operational tempo range for a contract type.
 *
 * @param contractType - The contract type
 * @returns The ops tempo range (min and max multipliers)
 *
 * @example
 * const tempo = getOpsTempo(AtBContractType.GARRISON_DUTY);
 * // Returns: { min: 1.0, max: 1.0 }
 */
export function getOpsTempo(
  contractType: AtBContractType
): { min: number; max: number } {
  const def = CONTRACT_TYPE_DEFINITIONS[contractType];
  return def.opsTempo;
}

/**
 * Gets the contract duration in months for a contract type.
 *
 * @param contractType - The contract type
 * @returns Duration in months
 *
 * @example
 * const duration = getContractDuration(AtBContractType.GARRISON_DUTY);
 * // Returns: 18
 */
export function getContractDuration(contractType: AtBContractType): number {
  return CONTRACT_TYPE_DEFINITIONS[contractType].durationMonths;
}

/**
 * Gets all available contract types.
 *
 * @returns Array of available contract types
 *
 * @example
 * const available = getAvailableContractTypes();
 */
export function getAvailableContractTypes(): AtBContractType[] {
  return Object.entries(CONTRACT_TYPE_DEFINITIONS)
    .filter(([_, def]) => def.available)
    .map(([type]) => type as AtBContractType);
}
