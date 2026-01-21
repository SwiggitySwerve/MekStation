/**
 * Award System Interfaces
 * Type definitions for the pilot awards and achievements system.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Award rarity tiers.
 */
export enum AwardRarity {
  /** Common awards, easily earned */
  Common = 'common',
  /** Uncommon awards, require some effort */
  Uncommon = 'uncommon',
  /** Rare awards, significant achievement */
  Rare = 'rare',
  /** Legendary awards, exceptional achievement */
  Legendary = 'legendary',
}

/**
 * Award category for grouping.
 */
export enum AwardCategory {
  /** Combat-related awards (kills, damage) */
  Combat = 'combat',
  /** Survival-related awards (missions survived) */
  Survival = 'survival',
  /** Campaign completion awards */
  Campaign = 'campaign',
  /** Long-term service awards */
  Service = 'service',
  /** Special/unique awards */
  Special = 'special',
}

/**
 * Criteria types for award evaluation.
 */
export enum CriteriaType {
  /** Total kills achieved */
  TotalKills = 'total_kills',
  /** Kills in a single mission */
  KillsInMission = 'kills_in_mission',
  /** Total damage dealt */
  DamageDealt = 'damage_dealt',
  /** Damage dealt in a single mission */
  DamageInMission = 'damage_in_mission',
  /** Missions completed */
  MissionsCompleted = 'missions_completed',
  /** Campaigns completed */
  CampaignsCompleted = 'campaigns_completed',
  /** Consecutive missions survived */
  ConsecutiveSurvival = 'consecutive_survival',
  /** Total games played */
  GamesPlayed = 'games_played',
  /** Specific event occurred */
  SpecificEvent = 'specific_event',
  /** Custom condition check */
  Custom = 'custom',
}

// =============================================================================
// Award Criteria Interfaces
// =============================================================================

/**
 * Base criteria interface for award requirements.
 */
export interface IAwardCriteria {
  /** Type of criteria */
  readonly type: CriteriaType;
  /** Threshold value to meet */
  readonly threshold: number;
  /** Optional additional conditions */
  readonly conditions?: Record<string, unknown>;
  /** Description of the requirement */
  readonly description: string;
}

/**
 * Progress toward earning an award.
 */
export interface IAwardProgress {
  /** Current value toward threshold */
  readonly current: number;
  /** Target threshold */
  readonly target: number;
  /** Percentage complete (0-100) */
  readonly percentage: number;
}

// =============================================================================
// Award Definition Interfaces
// =============================================================================

/**
 * Award definition - the template for an award.
 */
export interface IAward {
  /** Unique award identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description/flavor text */
  readonly description: string;
  /** Category for grouping */
  readonly category: AwardCategory;
  /** Rarity tier */
  readonly rarity: AwardRarity;
  /** Icon identifier or path */
  readonly icon: string;
  /** Criteria to earn this award */
  readonly criteria: IAwardCriteria;
  /** Whether award can be earned multiple times */
  readonly repeatable: boolean;
  /** Order for display sorting */
  readonly sortOrder: number;
  /** Whether award is hidden until earned */
  readonly secret?: boolean;
}

/**
 * Award earned by a pilot.
 */
export interface IPilotAward {
  /** Reference to award definition ID */
  readonly awardId: string;
  /** When the award was earned (ISO 8601) */
  readonly earnedAt: string;
  /** Context in which award was earned */
  readonly context: IAwardContext;
  /** Number of times earned (for repeatable awards) */
  readonly timesEarned: number;
}

/**
 * Context for when an award was earned.
 */
export interface IAwardContext {
  /** Campaign ID if earned in campaign */
  readonly campaignId?: string;
  /** Mission ID if earned in mission */
  readonly missionId?: string;
  /** Game ID if earned in specific game */
  readonly gameId?: string;
  /** Additional context data */
  readonly data?: Record<string, unknown>;
}

// =============================================================================
// Pilot Statistics Interfaces
// =============================================================================

/**
 * Combat statistics for a pilot.
 */
export interface IPilotCombatStats {
  /** Total kills across all games */
  readonly totalKills: number;
  /** Maximum kills in a single mission */
  readonly maxKillsInMission: number;
  /** Total damage dealt */
  readonly totalDamageDealt: number;
  /** Maximum damage in a single mission */
  readonly maxDamageInMission: number;
  /** Total damage received */
  readonly totalDamageReceived: number;
  /** Headshots/cockpit hits */
  readonly criticalHits: number;
}

/**
 * Career statistics for a pilot.
 */
export interface IPilotCareerStats {
  /** Total missions participated */
  readonly missionsCompleted: number;
  /** Total missions survived */
  readonly missionsSurvived: number;
  /** Current consecutive survival streak */
  readonly consecutiveSurvival: number;
  /** Best consecutive survival streak */
  readonly bestSurvivalStreak: number;
  /** Campaigns completed */
  readonly campaignsCompleted: number;
  /** Campaigns won */
  readonly campaignsWon: number;
  /** Total games played */
  readonly gamesPlayed: number;
  /** Total time in combat (seconds) */
  readonly totalCombatTime: number;
}

/**
 * Complete pilot statistics.
 */
export interface IPilotStats {
  /** Combat statistics */
  readonly combat: IPilotCombatStats;
  /** Career statistics */
  readonly career: IPilotCareerStats;
  /** Last updated timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Store Interfaces
// =============================================================================

/**
 * Award notification for UI display.
 */
export interface IAwardNotification {
  /** Unique notification ID */
  readonly id: string;
  /** The award that was earned */
  readonly award: IAward;
  /** Pilot who earned it */
  readonly pilotId: string;
  /** Pilot name for display */
  readonly pilotName: string;
  /** When notification was created */
  readonly createdAt: string;
  /** Whether notification has been dismissed */
  dismissed: boolean;
}

/**
 * Input for granting an award.
 */
export interface IGrantAwardInput {
  /** Pilot ID to grant award to */
  pilotId: string;
  /** Award ID to grant */
  awardId: string;
  /** Context of the award */
  context: IAwardContext;
}

/**
 * Result of checking award criteria.
 */
export interface IAwardCheckResult {
  /** Award being checked */
  readonly award: IAward;
  /** Whether criteria is met */
  readonly earned: boolean;
  /** Current progress toward award */
  readonly progress: IAwardProgress;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for IAward.
 */
export function isAward(obj: unknown): obj is IAward {
  if (typeof obj !== 'object' || obj === null) return false;
  const award = obj as IAward;
  return (
    typeof award.id === 'string' &&
    typeof award.name === 'string' &&
    typeof award.description === 'string' &&
    typeof award.category === 'string' &&
    typeof award.rarity === 'string' &&
    typeof award.criteria === 'object'
  );
}

/**
 * Type guard for IPilotAward.
 */
export function isPilotAward(obj: unknown): obj is IPilotAward {
  if (typeof obj !== 'object' || obj === null) return false;
  const pilotAward = obj as IPilotAward;
  return (
    typeof pilotAward.awardId === 'string' &&
    typeof pilotAward.earnedAt === 'string' &&
    typeof pilotAward.context === 'object' &&
    typeof pilotAward.timesEarned === 'number'
  );
}

/**
 * Type guard for IPilotStats.
 */
export function isPilotStats(obj: unknown): obj is IPilotStats {
  if (typeof obj !== 'object' || obj === null) return false;
  const stats = obj as IPilotStats;
  return (
    typeof stats.combat === 'object' &&
    typeof stats.career === 'object' &&
    typeof stats.updatedAt === 'string'
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create empty combat stats.
 */
export function createEmptyCombatStats(): IPilotCombatStats {
  return {
    totalKills: 0,
    maxKillsInMission: 0,
    totalDamageDealt: 0,
    maxDamageInMission: 0,
    totalDamageReceived: 0,
    criticalHits: 0,
  };
}

/**
 * Create empty career stats.
 */
export function createEmptyCareerStats(): IPilotCareerStats {
  return {
    missionsCompleted: 0,
    missionsSurvived: 0,
    consecutiveSurvival: 0,
    bestSurvivalStreak: 0,
    campaignsCompleted: 0,
    campaignsWon: 0,
    gamesPlayed: 0,
    totalCombatTime: 0,
  };
}

/**
 * Create empty pilot stats.
 */
export function createEmptyPilotStats(): IPilotStats {
  return {
    combat: createEmptyCombatStats(),
    career: createEmptyCareerStats(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate progress percentage.
 */
export function calculateProgress(current: number, target: number): IAwardProgress {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  return { current, target, percentage };
}

/**
 * Get rarity color class for UI.
 */
export function getRarityColor(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'text-slate-400';
    case AwardRarity.Uncommon:
      return 'text-emerald-400';
    case AwardRarity.Rare:
      return 'text-blue-400';
    case AwardRarity.Legendary:
      return 'text-amber-400';
    default:
      return 'text-slate-400';
  }
}

/**
 * Get rarity background class for UI.
 */
export function getRarityBackground(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'bg-slate-500/20';
    case AwardRarity.Uncommon:
      return 'bg-emerald-500/20';
    case AwardRarity.Rare:
      return 'bg-blue-500/20';
    case AwardRarity.Legendary:
      return 'bg-amber-500/20';
    default:
      return 'bg-slate-500/20';
  }
}
