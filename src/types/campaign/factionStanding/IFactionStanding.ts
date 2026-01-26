/**
 * Faction Standing System
 *
 * Defines the types and constants for tracking faction standing in campaigns.
 * Standing ranges from -60 (Outlawed) to +60 (Honored) across 9 levels.
 *
 * Based on MekHQ's FactionStandings system.
 */

/**
 * Faction standing levels from Outlawed to Honored.
 * Each level has a range of regard values.
 */
export enum FactionStandingLevel {
  LEVEL_0 = 0, // Outlawed (-60 to -50)
  LEVEL_1 = 1, // Hostile (-50 to -40)
  LEVEL_2 = 2, // Unfriendly (-40 to -25)
  LEVEL_3 = 3, // Cool (-25 to -10)
  LEVEL_4 = 4, // Neutral (-10 to +10) — DEFAULT
  LEVEL_5 = 5, // Warm (+10 to +25)
  LEVEL_6 = 6, // Friendly (+25 to +40)
  LEVEL_7 = 7, // Allied (+40 to +50)
  LEVEL_8 = 8, // Honored (+50 to +60)
}

/**
 * Thresholds for each standing level.
 * Regard values are clamped to [-60, +60].
 */
export const STANDING_LEVEL_THRESHOLDS: Record<
  FactionStandingLevel,
  { min: number; max: number }
> = {
  [FactionStandingLevel.LEVEL_0]: { min: -60, max: -50 },
  [FactionStandingLevel.LEVEL_1]: { min: -50, max: -40 },
  [FactionStandingLevel.LEVEL_2]: { min: -40, max: -25 },
  [FactionStandingLevel.LEVEL_3]: { min: -25, max: -10 },
  [FactionStandingLevel.LEVEL_4]: { min: -10, max: 10 },
  [FactionStandingLevel.LEVEL_5]: { min: 10, max: 25 },
  [FactionStandingLevel.LEVEL_6]: { min: 25, max: 40 },
  [FactionStandingLevel.LEVEL_7]: { min: 40, max: 50 },
  [FactionStandingLevel.LEVEL_8]: { min: 50, max: 60 },
};

/**
 * Regard change deltas for various contract and faction events.
 * Values are exact MekHQ values.
 */
export const REGARD_DELTAS = {
  CONTRACT_SUCCESS: 1.875,
  CONTRACT_PARTIAL: 0.625,
  CONTRACT_FAILURE: -1.875,
  CONTRACT_BREACH: -5.156,
  ACCEPT_ENEMY_CONTRACT: -1.875,
  REFUSE_BATCHALL: -10.3125,
  DAILY_DECAY: 0.375, // Toward zero per day
};

/**
 * Represents a single faction standing record.
 */
export interface IFactionStanding {
  readonly factionId: string;
  readonly regard: number; // -60 to +60
  readonly level: FactionStandingLevel;
  readonly accoladeLevel: number; // 0-4 (escalation)
  readonly censureLevel: number; // 0-4 (escalation)
  readonly lastChangeDate?: Date;
  readonly history: readonly IRegardChangeEvent[];
}

/**
 * Represents a single regard change event in the standing history.
 */
export interface IRegardChangeEvent {
  readonly date: Date;
  readonly delta: number;
  readonly reason: string;
  readonly previousRegard: number;
  readonly newRegard: number;
  readonly previousLevel: FactionStandingLevel;
  readonly newLevel: FactionStandingLevel;
}

/**
 * Maps a regard value to its corresponding standing level.
 * Regard is clamped to [-60, +60] before mapping.
 *
 * @param regard The regard value to map
 * @returns The corresponding FactionStandingLevel
 */
export function getStandingLevel(regard: number): FactionStandingLevel {
  // Clamp regard to valid range
  const clampedRegard = Math.max(-60, Math.min(60, regard));

  // Find the level that contains this regard value
  for (const [level, threshold] of Object.entries(STANDING_LEVEL_THRESHOLDS)) {
    if (clampedRegard >= threshold.min && clampedRegard <= threshold.max) {
      return parseInt(level, 10) as FactionStandingLevel;
    }
  }

  // Fallback (should never reach here with proper thresholds)
  return FactionStandingLevel.LEVEL_4;
}
