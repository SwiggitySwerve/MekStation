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

/**
 * Calculate XP earned for a mission.
 */
export function calculateMissionXp(
  kills: number,
  victory: boolean,
  survivedCritical: boolean,
  optionalObjectivesCompleted: number,
): number {
  let xp = XP_REWARDS.MISSION_PARTICIPATION;
  xp += kills * XP_REWARDS.KILL;
  if (victory) xp += XP_REWARDS.VICTORY_BONUS;
  if (survivedCritical) xp += XP_REWARDS.SURVIVAL_BONUS;
  xp += optionalObjectivesCompleted * XP_REWARDS.OPTIONAL_OBJECTIVE;
  return xp;
}

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

/**
 * Validate a campaign.
 */
export function validateCampaign(
  campaign: ICampaign,
): ICampaignValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: name
  if (!campaign.name || campaign.name.trim().length === 0) {
    errors.push('Campaign name is required');
  }

  // Required: at least one mission
  if (!campaign.missions || campaign.missions.length === 0) {
    errors.push('Campaign must have at least one mission');
  }

  // Required: roster has units or pilots
  if (
    (!campaign.roster.units || campaign.roster.units.length === 0) &&
    (!campaign.roster.pilots || campaign.roster.pilots.length === 0)
  ) {
    errors.push('Campaign must have at least one unit or pilot');
  }

  // Validate mission graph
  const missionIds = new Set(campaign.missions.map((m) => m.id));
  for (const mission of campaign.missions) {
    // Check prerequisites exist
    for (const prereq of mission.prerequisites) {
      if (!missionIds.has(prereq)) {
        errors.push(
          `Mission "${mission.name}" references non-existent prerequisite: ${prereq}`,
        );
      }
    }
    // Check branches exist
    for (const branch of mission.branches) {
      if (!missionIds.has(branch.targetMissionId)) {
        errors.push(
          `Mission "${mission.name}" branches to non-existent mission: ${branch.targetMissionId}`,
        );
      }
    }
  }

  // Warning: no final mission
  const hasFinalMission = campaign.missions.some((m) => m.isFinal);
  if (!hasFinalMission) {
    warnings.push('Campaign has no final mission - it may never end');
  }

  // Warning: units without pilots
  const assignedPilots = new Set(
    campaign.roster.units.map((u) => u.pilotId).filter(Boolean),
  );
  const totalPilots = campaign.roster.pilots.length;
  const operationalUnits = campaign.roster.units.filter(
    (u) =>
      u.status === CampaignUnitStatus.Operational ||
      u.status === CampaignUnitStatus.Damaged,
  ).length;
  if (operationalUnits > assignedPilots.size && totalPilots > 0) {
    warnings.push(
      `${operationalUnits - assignedPilots.size} operational units have no assigned pilot`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for ICampaign.
 */
export function isCampaign(obj: unknown): obj is ICampaign {
  if (typeof obj !== 'object' || obj === null) return false;
  const campaign = obj as ICampaign;
  return (
    typeof campaign.id === 'string' &&
    typeof campaign.name === 'string' &&
    typeof campaign.status === 'string' &&
    Array.isArray(campaign.missions) &&
    typeof campaign.roster === 'object' &&
    typeof campaign.resources === 'object' &&
    typeof campaign.progress === 'object'
  );
}

/**
 * Type guard for ICampaignMission.
 */
export function isCampaignMission(obj: unknown): obj is ICampaignMission {
  if (typeof obj !== 'object' || obj === null) return false;
  const mission = obj as ICampaignMission;
  return (
    typeof mission.id === 'string' &&
    typeof mission.name === 'string' &&
    typeof mission.status === 'string' &&
    typeof mission.order === 'number' &&
    Array.isArray(mission.prerequisites)
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get available missions (unlocked and not completed).
 */
export function getAvailableMissions(
  campaign: ICampaign,
): readonly ICampaignMission[] {
  return campaign.missions.filter(
    (m) =>
      m.status === CampaignMissionStatus.Available ||
      m.status === CampaignMissionStatus.InProgress,
  );
}

/**
 * Get operational units from roster.
 */
export function getOperationalUnits(
  roster: ICampaignRoster,
): readonly ICampaignUnitState[] {
  return roster.units.filter(
    (u) =>
      u.status === CampaignUnitStatus.Operational ||
      u.status === CampaignUnitStatus.Damaged,
  );
}

/**
 * Get available pilots from roster.
 */
export function getAvailablePilots(
  roster: ICampaignRoster,
): readonly ICampaignPilotState[] {
  return roster.pilots.filter((p) => p.status === CampaignPilotStatus.Active);
}

/**
 * Check if campaign is complete (won or lost).
 */
export function isCampaignComplete(campaign: ICampaign): boolean {
  return (
    campaign.status === CampaignStatus.Victory ||
    campaign.status === CampaignStatus.Defeat ||
    campaign.status === CampaignStatus.Abandoned
  );
}

/**
 * Calculate total campaign value.
 */
export function calculateCampaignValue(campaign: ICampaign): number {
  return (
    campaign.resources.cBills +
    campaign.resources.supplies * 100 +
    campaign.resources.salvageParts * 1000
  );
}
