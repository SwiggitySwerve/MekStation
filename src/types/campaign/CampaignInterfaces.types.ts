/**
 * Campaign System Interfaces
 * Type definitions for multi-mission campaigns with persistent state.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Campaign lifecycle status.
 */
export enum CampaignStatus {
  /** Initial setup phase */
  Setup = 'setup',
  /** Campaign is active */
  Active = 'active',
  /** Campaign won */
  Victory = 'victory',
  /** Campaign lost */
  Defeat = 'defeat',
  /** Campaign abandoned */
  Abandoned = 'abandoned',
}

/**
 * Campaign mission status.
 */
export enum CampaignMissionStatus {
  /** Mission is locked (prerequisites not met) */
  Locked = 'locked',
  /** Mission is available to play */
  Available = 'available',
  /** Mission is in progress */
  InProgress = 'in_progress',
  /** Mission completed successfully */
  Victory = 'victory',
  /** Mission failed */
  Defeat = 'defeat',
  /** Mission skipped */
  Skipped = 'skipped',
}

/**
 * Unit operational status in campaign.
 */
export enum CampaignUnitStatus {
  /** Fully operational */
  Operational = 'operational',
  /** Damaged but functional */
  Damaged = 'damaged',
  /** In repair bay, not available */
  Repairing = 'repairing',
  /** Destroyed, cannot be used */
  Destroyed = 'destroyed',
  /** Salvaged from enemy */
  Salvage = 'salvage',
}

/**
 * Pilot operational status in campaign.
 */
export enum CampaignPilotStatus {
  /** Ready for duty */
  Active = 'active',
  /** Wounded, penalties apply */
  Wounded = 'wounded',
  /** Critically wounded, unavailable */
  Critical = 'critical',
  /** Missing in action */
  MIA = 'mia',
  /** Killed in action */
  KIA = 'kia',
}

// =============================================================================
// Resource Types
// =============================================================================

/**
 * Campaign resources tracked between missions.
 */
export interface ICampaignResources {
  /** C-Bills available for purchases and repairs */
  readonly cBills: number;
  /** Supply points for field repairs */
  readonly supplies: number;
  /** Morale level (0-100) affecting unit performance */
  readonly morale: number;
  /** Salvage parts in inventory */
  readonly salvageParts: number;
}

/**
 * Default resources for new campaigns.
 */
export const DEFAULT_CAMPAIGN_RESOURCES: ICampaignResources = {
  cBills: 1000000,
  supplies: 100,
  morale: 75,
  salvageParts: 0,
};

// =============================================================================
// Unit/Pilot State Tracking
// =============================================================================

/**
 * Unit state snapshot for campaign tracking.
 */
export interface ICampaignUnitState {
  /** Reference to vault unit ID */
  readonly unitId: string;
  /** Unit name (cached for display) */
  readonly unitName: string;
  /** Current operational status */
  readonly status: CampaignUnitStatus;
  /** Armor damage per location (keyed by location name) */
  readonly armorDamage: Record<string, number>;
  /** Structure damage per location */
  readonly structureDamage: Record<string, number>;
  /** Destroyed/damaged components (by location) */
  readonly destroyedComponents: string[];
  /** Ammunition expended (keyed by ammo type) */
  readonly ammoExpended: Record<string, number>;
  /** Heat accumulated (for shutdown tracking) */
  readonly currentHeat: number;
  /** Estimated repair cost */
  readonly repairCost: number;
  /** Estimated repair time (in mission cycles) */
  readonly repairTime: number;
  /** Assigned pilot ID (if any) */
  readonly pilotId?: string;
}

/**
 * Pilot state snapshot for campaign tracking.
 */
export interface ICampaignPilotState {
  /** Reference to vault pilot ID */
  readonly pilotId: string;
  /** Pilot name (cached for display) */
  readonly pilotName: string;
  /** Current operational status */
  readonly status: CampaignPilotStatus;
  /** Current wounds (0-6) */
  readonly wounds: number;
  /** Current XP pool */
  readonly xp: number;
  /** XP earned this campaign */
  readonly campaignXpEarned: number;
  /** Kills this campaign */
  readonly campaignKills: number;
  /** Missions completed this campaign */
  readonly campaignMissions: number;
  /** Assigned unit ID (if any) */
  readonly assignedUnitId?: string;
  /** Recovery time remaining (in mission cycles) */
  readonly recoveryTime: number;
}

/**
 * Campaign roster - all units and pilots in the campaign.
 */
export interface ICampaignRoster {
  /** Units in the campaign */
  readonly units: readonly ICampaignUnitState[];
  /** Pilots in the campaign */
  readonly pilots: readonly ICampaignPilotState[];
}

// =============================================================================
// Mission Types
// =============================================================================

/**
 * Mission outcome details.
 */
export interface IMissionOutcome {
  /** Victory or defeat */
  readonly result: 'victory' | 'defeat' | 'draw';
  /** Enemy units destroyed */
  readonly enemyUnitsDestroyed: number;
  /** Enemy BV destroyed */
  readonly enemyBVDestroyed: number;
  /** Player units destroyed */
  readonly playerUnitsDestroyed: number;
  /** Player BV lost */
  readonly playerBVLost: number;
  /** Salvage collected (unit names) */
  readonly salvage: readonly string[];
  /** C-Bills reward */
  readonly cBillsReward: number;
  /** XP awarded per pilot */
  readonly xpAwarded: Record<string, number>;
  /** Notes about the outcome */
  readonly notes?: string;
  /** Turn count */
  readonly turnsPlayed: number;
  /** Game session ID */
  readonly gameSessionId?: string;
}

/**
 * Mission branch definition for branching campaigns.
 */
export interface IMissionBranch {
  /** Condition trigger (outcome that leads here) */
  readonly condition: 'victory' | 'defeat' | 'special';
  /** Special condition name (if applicable) */
  readonly specialCondition?: string;
  /** Mission ID this branch leads to */
  readonly targetMissionId: string;
}

/**
 * Campaign mission definition.
 */
export interface ICampaignMission {
  /** Unique mission ID within campaign */
  readonly id: string;
  /** Mission name */
  readonly name: string;
  /** Mission description/briefing */
  readonly description: string;
  /** Mission status */
  readonly status: CampaignMissionStatus;
  /** Reference to encounter template */
  readonly encounterId?: string;
  /** Mission order/sequence number */
  readonly order: number;
  /** Prerequisite mission IDs (must be completed first) */
  readonly prerequisites: readonly string[];
  /** Branches to other missions based on outcome */
  readonly branches: readonly IMissionBranch[];
  /** Roster state at mission start (snapshot) */
  readonly rosterSnapshot?: ICampaignRoster;
  /** Mission outcome (if completed) */
  readonly outcome?: IMissionOutcome;
  /** Date completed */
  readonly completedAt?: string;
  /** Is this the campaign finale? */
  readonly isFinal: boolean;
  /** Optional objectives for bonus rewards */
  readonly optionalObjectives?: readonly string[];
}

// =============================================================================
// Campaign Entity
// =============================================================================

/**
 * Campaign progress tracking.
 */
export interface ICampaignProgress {
  /** Current mission ID (null if between missions) */
  readonly currentMissionId: string | null;
  /** Total missions completed */
  readonly missionsCompleted: number;
  /** Total missions available */
  readonly missionsTotal: number;
  /** Total victories */
  readonly victories: number;
  /** Total defeats */
  readonly defeats: number;
  /** Campaign start date */
  readonly startedAt: string;
  /** Last mission date */
  readonly lastMissionAt?: string;
  /** Days elapsed in campaign */
  readonly daysElapsed: number;
}

/**
 * Campaign entity - the main campaign data structure.
 */
export interface ICampaign {
  /** Unique identifier */
  readonly id: string;
  /** Campaign name */
  readonly name: string;
  /** Campaign description/narrative */
  readonly description?: string;
  /** Campaign status */
  readonly status: CampaignStatus;
  /** Campaign missions */
  readonly missions: readonly ICampaignMission[];
  /** Current roster state */
  readonly roster: ICampaignRoster;
  /** Campaign resources */
  readonly resources: ICampaignResources;
  /** Progress tracking */
  readonly progress: ICampaignProgress;
  /** Campaign difficulty modifier */
  readonly difficultyModifier: number;
  /** Created timestamp */
  readonly createdAt: string;
  /** Updated timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Creation Types
// =============================================================================

/**
 * Input for creating a new campaign.
 */
export interface ICreateCampaignInput {
  /** Campaign name */
  readonly name: string;
  /** Campaign description */
  readonly description?: string;
  /** Initial unit IDs to include in roster */
  readonly unitIds: readonly string[];
  /** Initial pilot IDs to include in roster */
  readonly pilotIds: readonly string[];
  /** Template ID to base campaign on (optional) */
  readonly templateId?: string;
  /** Starting resources override */
  readonly resources?: Partial<ICampaignResources>;
  /** Difficulty modifier (1.0 = normal) */
  readonly difficultyModifier?: number;
}

/**
 * Input for adding a mission to a campaign.
 */
export interface IAddMissionInput {
  /** Mission name */
  readonly name: string;
  /** Mission description */
  readonly description: string;
  /** Encounter template ID */
  readonly encounterId?: string;
  /** Mission order */
  readonly order: number;
  /** Prerequisite mission IDs */
  readonly prerequisites?: readonly string[];
  /** Is this the finale? */
  readonly isFinal?: boolean;
  /** Optional objectives */
  readonly optionalObjectives?: readonly string[];
}

/**
 * Input for recording mission outcome.
 */
export interface IRecordMissionOutcomeInput {
  /** Mission ID */
  readonly missionId: string;
  /** Outcome details */
  readonly outcome: Omit<IMissionOutcome, 'xpAwarded'>;
  /** Unit state updates after mission */
  readonly unitUpdates: readonly Partial<ICampaignUnitState>[];
  /** Pilot state updates after mission */
  readonly pilotUpdates: readonly Partial<ICampaignPilotState>[];
}

// =============================================================================
// XP and Progression
// =============================================================================

/**
 * XP rewards per action.
 */
export const XP_REWARDS = {
  /** XP for participating in a mission */
  MISSION_PARTICIPATION: 1,
  /** XP per enemy kill */
  KILL: 2,
  /** XP for mission victory */
  VICTORY_BONUS: 2,
  /** XP for surviving critical damage */
  SURVIVAL_BONUS: 1,
  /** XP for completing optional objective */
  OPTIONAL_OBJECTIVE: 1,
} as const;

/**
 * Skill improvement thresholds.
 */
export const SKILL_IMPROVEMENT_COSTS = {
  /** XP cost to improve gunnery by 1 */
  GUNNERY_IMPROVEMENT: 8,
  /** XP cost to improve piloting by 1 */
  PILOTING_IMPROVEMENT: 8,
  /** Minimum skill value (best) */
  MIN_SKILL: 1,
  /** Maximum skill value (worst) */
  MAX_SKILL: 8,
} as const;

// =============================================================================
// Campaign Templates
// =============================================================================

/**
 * Campaign template for quick creation.
 */
export interface ICampaignTemplate {
  /** Template ID */
  readonly id: string;
  /** Template name */
  readonly name: string;
  /** Template description */
  readonly description: string;
  /** Mission definitions */
  readonly missions: readonly Omit<
    ICampaignMission,
    'status' | 'rosterSnapshot' | 'outcome' | 'completedAt'
  >[];
  /** Starting resources */
  readonly startingResources: ICampaignResources;
  /** Difficulty recommendation */
  readonly recommendedDifficulty: number;
  /** Estimated playtime */
  readonly estimatedMissions: number;
}

/**
 * Built-in campaign templates.
 */
export const CAMPAIGN_TEMPLATES: readonly ICampaignTemplate[] = [
  {
    id: 'three-mission-raid',
    name: 'Border Raid',
    description:
      'A quick three-mission campaign: Recon, Assault, and Extraction.',
    missions: [
      {
        id: 'm1',
        name: 'Recon',
        description: 'Scout enemy positions without being detected.',
        order: 1,
        prerequisites: [],
        branches: [],
        isFinal: false,
      },
      {
        id: 'm2',
        name: 'Assault',
        description: 'Strike the enemy base while defenses are down.',
        order: 2,
        prerequisites: ['m1'],
        branches: [],
        isFinal: false,
      },
      {
        id: 'm3',
        name: 'Extraction',
        description: 'Escape with the data before reinforcements arrive.',
        order: 3,
        prerequisites: ['m2'],
        branches: [],
        isFinal: true,
      },
    ],
    startingResources: DEFAULT_CAMPAIGN_RESOURCES,
    recommendedDifficulty: 1.0,
    estimatedMissions: 3,
  },
  {
    id: 'branching-contract',
    name: 'The Contract',
    description:
      'A branching campaign where choices matter. Victory in mission 2 leads to different mission 3.',
    missions: [
      {
        id: 'm1',
        name: 'Contract Negotiations',
        description: 'Prove your worth by eliminating a pirate outpost.',
        order: 1,
        prerequisites: [],
        branches: [],
        isFinal: false,
      },
      {
        id: 'm2',
        name: 'Supply Run',
        description: 'Escort a supply convoy through hostile territory.',
        order: 2,
        prerequisites: ['m1'],
        branches: [
          { condition: 'victory', targetMissionId: 'm3a' },
          { condition: 'defeat', targetMissionId: 'm3b' },
        ],
        isFinal: false,
      },
      {
        id: 'm3a',
        name: 'Glory Road',
        description: 'With supplies secure, launch the main assault.',
        order: 3,
        prerequisites: ['m2'],
        branches: [],
        isFinal: true,
      },
      {
        id: 'm3b',
        name: 'Desperate Defense',
        description: 'Supplies lost. Hold the line against the counterattack.',
        order: 3,
        prerequisites: ['m2'],
        branches: [],
        isFinal: true,
      },
    ],
    startingResources: {
      ...DEFAULT_CAMPAIGN_RESOURCES,
      cBills: 1500000,
    },
    recommendedDifficulty: 1.2,
    estimatedMissions: 4,
  },
];

// =============================================================================
// Validation
// =============================================================================

/**
 * Campaign validation result.
 */
export interface ICampaignValidationResult {
  /** Is campaign valid? */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly string[];
  /** Validation warnings */
  readonly warnings: readonly string[];
}
