/**
 * Pilot System Constants
 * XP costs, skill limits, and other game constants for the pilot system.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import {
  IPilotSkills,
  IPilotTemplate,
  PilotExperienceLevel,
} from './PilotInterfaces';

// =============================================================================
// Skill Constants
// =============================================================================

/** Minimum skill value (best possible) */
export const MIN_SKILL_VALUE = 1;

/** Maximum skill value (worst possible) */
export const MAX_SKILL_VALUE = 8;

/** Default gunnery skill for new pilots */
export const DEFAULT_GUNNERY = 4;

/** Default piloting skill for new pilots */
export const DEFAULT_PILOTING = 5;

/** Default skills for a new pilot */
export const DEFAULT_PILOT_SKILLS: IPilotSkills = {
  gunnery: DEFAULT_GUNNERY,
  piloting: DEFAULT_PILOTING,
};

// =============================================================================
// Wound Constants
// =============================================================================

/** Maximum wounds before death */
export const MAX_WOUNDS = 6;

/** Skill penalty per wound */
export const WOUND_SKILL_PENALTY = 1;

// =============================================================================
// XP Constants
// =============================================================================

/**
 * XP awarded for various actions.
 */
export const XP_AWARDS = {
  /** XP for surviving a mission */
  missionSurvival: 10,
  /** XP per kill */
  kill: 15,
  /** Bonus XP for mission victory */
  victoryBonus: 10,
  /** Bonus XP for first blood */
  firstBlood: 5,
  /** Bonus XP for defeating higher BV opponent */
  higherBVOpponent: 5,
} as const;

/**
 * XP costs to improve gunnery skill.
 * Key is the current skill level, value is cost to improve by 1.
 */
export const GUNNERY_IMPROVEMENT_COSTS: Record<number, number> = {
  8: 50,
  7: 75,
  6: 100,
  5: 100,
  4: 200,
  3: 400,
  2: 800,
  // 1 is the best, cannot improve further
};

/**
 * XP costs to improve piloting skill.
 * Key is the current skill level, value is cost to improve by 1.
 */
export const PILOTING_IMPROVEMENT_COSTS: Record<number, number> = {
  8: 40,
  7: 60,
  6: 75,
  5: 75,
  4: 150,
  3: 300,
  2: 600,
  // 1 is the best, cannot improve further
};

/**
 * Get XP cost to improve gunnery from current level.
 * @returns XP cost, or null if cannot improve
 */
export function getGunneryImprovementCost(currentLevel: number): number | null {
  if (currentLevel <= MIN_SKILL_VALUE) return null;
  return GUNNERY_IMPROVEMENT_COSTS[currentLevel] ?? null;
}

/**
 * Get XP cost to improve piloting from current level.
 * @returns XP cost, or null if cannot improve
 */
export function getPilotingImprovementCost(currentLevel: number): number | null {
  if (currentLevel <= MIN_SKILL_VALUE) return null;
  return PILOTING_IMPROVEMENT_COSTS[currentLevel] ?? null;
}

// =============================================================================
// Pilot Templates
// =============================================================================

/**
 * Predefined pilot templates for quick generation.
 */
export const PILOT_TEMPLATES: Record<PilotExperienceLevel, IPilotTemplate> = {
  [PilotExperienceLevel.Green]: {
    level: PilotExperienceLevel.Green,
    name: 'Green',
    skills: { gunnery: 5, piloting: 6 },
    startingXp: 0,
    description: 'Inexperienced pilot fresh from training.',
  },
  [PilotExperienceLevel.Regular]: {
    level: PilotExperienceLevel.Regular,
    name: 'Regular',
    skills: { gunnery: 4, piloting: 5 },
    startingXp: 0,
    description: 'Standard combat-ready pilot.',
  },
  [PilotExperienceLevel.Veteran]: {
    level: PilotExperienceLevel.Veteran,
    name: 'Veteran',
    skills: { gunnery: 3, piloting: 4 },
    startingXp: 50,
    description: 'Experienced pilot with multiple campaigns.',
  },
  [PilotExperienceLevel.Elite]: {
    level: PilotExperienceLevel.Elite,
    name: 'Elite',
    skills: { gunnery: 2, piloting: 3 },
    startingXp: 100,
    description: 'Highly skilled ace pilot.',
  },
};

/**
 * Get template by experience level.
 */
export function getPilotTemplate(level: PilotExperienceLevel): IPilotTemplate {
  return PILOT_TEMPLATES[level];
}

// =============================================================================
// Skill Rating Helpers
// =============================================================================

/**
 * Get descriptive label for a skill level.
 */
export function getSkillLabel(skillValue: number): string {
  if (skillValue <= 1) return 'Legendary';
  if (skillValue === 2) return 'Elite';
  if (skillValue === 3) return 'Veteran';
  if (skillValue === 4) return 'Regular';
  if (skillValue === 5) return 'Green';
  if (skillValue === 6) return 'Untrained';
  if (skillValue === 7) return 'Poor';
  return 'Terrible';
}

/**
 * Get combined pilot rating (gunnery/piloting) label.
 */
export function getPilotRating(skills: IPilotSkills): string {
  return `${skills.gunnery}/${skills.piloting}`;
}

/**
 * Calculate effective skill after wound penalties.
 */
export function getEffectiveSkill(baseSkill: number, wounds: number): number {
  return Math.min(MAX_SKILL_VALUE, baseSkill + wounds * WOUND_SKILL_PENALTY);
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a skill value is within bounds.
 */
export function isValidSkillValue(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_SKILL_VALUE &&
    value <= MAX_SKILL_VALUE
  );
}

/**
 * Validate a wounds value is within bounds.
 */
export function isValidWoundsValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_WOUNDS;
}

/**
 * Validate pilot skills object.
 */
export function validatePilotSkills(skills: IPilotSkills): string[] {
  const errors: string[] = [];

  if (!isValidSkillValue(skills.gunnery)) {
    errors.push(`Gunnery must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
  }

  if (!isValidSkillValue(skills.piloting)) {
    errors.push(`Piloting must be between ${MIN_SKILL_VALUE} and ${MAX_SKILL_VALUE}`);
  }

  return errors;
}
