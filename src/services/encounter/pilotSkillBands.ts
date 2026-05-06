/**
 * Pilot Skill Bands
 *
 * Named presets mapping PilotSkillTemplate enum values to concrete
 * [min, max] ranges for gunnery and piloting skill generation.
 * Lower skill numbers are better (BattleTech convention).
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md
 */

import { PilotSkillTemplate } from '@/types/encounter/EncounterInterfaces';

// =============================================================================
// IPilotSkillTemplate Interface
// =============================================================================

/**
 * Skill range definition for a pilot experience band.
 * Both ranges are inclusive [min, max]. Lower values = better skill.
 */
export interface IPilotSkillTemplate {
  /** Gunnery skill range [min, max] (inclusive, lower = better) */
  readonly gunneryRange: readonly [number, number];
  /** Piloting skill range [min, max] (inclusive, lower = better) */
  readonly pilotingRange: readonly [number, number];
}

// =============================================================================
// Skill Band Definitions
// =============================================================================

/**
 * Green pilots: 5/6 skills (least experienced).
 */
export const GREEN_BAND: IPilotSkillTemplate = {
  gunneryRange: [5, 6],
  pilotingRange: [6, 7],
};

/**
 * Regular pilots: 4/5 skills (standard trooper).
 */
export const REGULAR_BAND: IPilotSkillTemplate = {
  gunneryRange: [4, 5],
  pilotingRange: [5, 6],
};

/**
 * Veteran pilots: 3/4 skills (experienced combatant).
 */
export const VETERAN_BAND: IPilotSkillTemplate = {
  gunneryRange: [3, 4],
  pilotingRange: [4, 5],
};

/**
 * Elite pilots: 2/3 skills (exceptional warriors).
 */
export const ELITE_BAND: IPilotSkillTemplate = {
  gunneryRange: [2, 3],
  pilotingRange: [3, 4],
};

/**
 * Map from PilotSkillTemplate enum to IPilotSkillTemplate range.
 * Mixed is intentionally omitted — callers must handle it by randomly
 * selecting one of the four named bands.
 */
export const SKILL_BAND_MAP: Readonly<
  Record<
    Exclude<PilotSkillTemplate, PilotSkillTemplate.Mixed>,
    IPilotSkillTemplate
  >
> = {
  [PilotSkillTemplate.Green]: GREEN_BAND,
  [PilotSkillTemplate.Regular]: REGULAR_BAND,
  [PilotSkillTemplate.Veteran]: VETERAN_BAND,
  [PilotSkillTemplate.Elite]: ELITE_BAND,
};

/**
 * The ordered list of concrete bands used for Mixed sampling.
 * Order matches ascending skill quality (green → elite).
 */
export const ALL_BANDS: readonly IPilotSkillTemplate[] = [
  GREEN_BAND,
  REGULAR_BAND,
  VETERAN_BAND,
  ELITE_BAND,
];

/**
 * Resolve a PilotSkillTemplate enum value to an IPilotSkillTemplate.
 * For Mixed, picks a random band from ALL_BANDS using the provided random fn.
 */
export function resolveBand(
  template: PilotSkillTemplate,
  randomNext: () => number,
): IPilotSkillTemplate {
  if (template === PilotSkillTemplate.Mixed) {
    const idx = Math.floor(randomNext() * ALL_BANDS.length);
    return ALL_BANDS[idx];
  }
  return SKILL_BAND_MAP[template];
}
