/**
 * XP Calculator
 * Shared logic for calculating experience points across quick games and campaign games.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

// =============================================================================
// Types
// =============================================================================

/**
 * XP calculation input.
 */
export interface IXPCalculationInput {
  /** Number of kills by this pilot */
  readonly kills: number;
  /** Was this a victory? */
  readonly victory: boolean;
  /** Did the pilot survive a critical situation? */
  readonly survivedCritical: boolean;
  /** Number of optional objectives completed */
  readonly optionalObjectivesCompleted: number;
  /** Was the pilot wounded? */
  readonly wasWounded?: boolean;
  /** Did the pilot's unit take heavy damage (>50%)? */
  readonly heavyDamage?: boolean;
}

/**
 * Detailed XP breakdown.
 */
export interface IXPBreakdown {
  /** Base XP for participating */
  readonly baseXP: number;
  /** XP from kills */
  readonly killXP: number;
  /** XP from victory */
  readonly victoryXP: number;
  /** XP from surviving critical situations */
  readonly survivalXP: number;
  /** XP from objectives */
  readonly objectiveXP: number;
  /** Bonus XP from wounds/damage */
  readonly bonusXP: number;
  /** Total XP awarded */
  readonly totalXP: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * XP award values.
 */
export const XP_VALUES = {
  /** Base XP for participating in a mission */
  BASE_PARTICIPATION: 1,
  /** XP per kill */
  PER_KILL: 2,
  /** XP for victory */
  VICTORY_BONUS: 3,
  /** XP for surviving a critical situation */
  CRITICAL_SURVIVAL: 1,
  /** XP per optional objective completed */
  PER_OBJECTIVE: 1,
  /** XP for surviving while wounded */
  WOUNDED_SURVIVAL: 1,
  /** XP for surviving with heavy damage */
  HEAVY_DAMAGE_SURVIVAL: 1,
} as const;

// =============================================================================
// Calculator Functions
// =============================================================================

/**
 * Calculate XP for a pilot based on mission performance.
 * This matches the existing calculateMissionXp from CampaignInterfaces.
 */
export function calculateMissionXP(input: IXPCalculationInput): number {
  const breakdown = calculateXPBreakdown(input);
  return breakdown.totalXP;
}

/**
 * Calculate detailed XP breakdown.
 */
export function calculateXPBreakdown(input: IXPCalculationInput): IXPBreakdown {
  const baseXP = XP_VALUES.BASE_PARTICIPATION;
  const killXP = input.kills * XP_VALUES.PER_KILL;
  const victoryXP = input.victory ? XP_VALUES.VICTORY_BONUS : 0;
  const survivalXP = input.survivedCritical ? XP_VALUES.CRITICAL_SURVIVAL : 0;
  const objectiveXP =
    input.optionalObjectivesCompleted * XP_VALUES.PER_OBJECTIVE;

  let bonusXP = 0;
  if (input.wasWounded) {
    bonusXP += XP_VALUES.WOUNDED_SURVIVAL;
  }
  if (input.heavyDamage) {
    bonusXP += XP_VALUES.HEAVY_DAMAGE_SURVIVAL;
  }

  const totalXP =
    baseXP + killXP + victoryXP + survivalXP + objectiveXP + bonusXP;

  return {
    baseXP,
    killXP,
    victoryXP,
    survivalXP,
    objectiveXP,
    bonusXP,
    totalXP,
  };
}

/**
 * Calculate XP required for next skill level.
 * Based on BattleTech progression.
 */
export function xpRequiredForLevel(currentLevel: number): number {
  // Standard BT progression: lower skill = better
  // Skill 5 -> 4 = 10 XP
  // Skill 4 -> 3 = 15 XP
  // Skill 3 -> 2 = 20 XP
  // Skill 2 -> 1 = 25 XP
  // Skill 1 -> 0 = 30 XP

  if (currentLevel <= 0) return Infinity; // Can't improve beyond 0
  if (currentLevel >= 6) return 5; // Green pilots improve quickly

  // Higher XP needed for better skills
  return 5 + (6 - currentLevel) * 5;
}

/**
 * Check if a pilot has enough XP to improve a skill.
 */
export function canImproveSkill(
  currentSkillLevel: number,
  availableXP: number,
): {
  canImprove: boolean;
  xpRequired: number;
  xpRemaining: number;
} {
  const xpRequired = xpRequiredForLevel(currentSkillLevel);
  const canImprove = availableXP >= xpRequired;

  return {
    canImprove,
    xpRequired,
    xpRemaining: canImprove ? availableXP - xpRequired : availableXP,
  };
}

/**
 * Calculate total XP for multiple pilots in a game.
 */
export function calculateTeamXP(
  pilots: Array<{
    id: string;
    kills: number;
    survived: boolean;
    survivedCritical: boolean;
  }>,
  victory: boolean,
  objectivesCompleted: number,
): Record<string, number> {
  const xpByPilot: Record<string, number> = {};

  for (const pilot of pilots) {
    if (!pilot.survived) {
      // Dead pilots don't earn XP (they might have posthumous awards in campaigns)
      xpByPilot[pilot.id] = 0;
      continue;
    }

    xpByPilot[pilot.id] = calculateMissionXP({
      kills: pilot.kills,
      victory,
      survivedCritical: pilot.survivedCritical,
      optionalObjectivesCompleted: objectivesCompleted,
    });
  }

  return xpByPilot;
}
