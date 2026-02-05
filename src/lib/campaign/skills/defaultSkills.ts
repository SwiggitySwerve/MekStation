/**
 * Default Skills by Role and Experience Level
 *
 * Defines the standard skill sets for each campaign personnel role,
 * adjusted by experience level to reflect character progression.
 *
 * @module campaign/skills/defaultSkills
 */

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { ISkill } from '@/types/campaign/skills';
import { SkillExperienceLevel } from '@/types/campaign/skills/experienceLevels';

/**
 * A set of default skills for a particular role.
 *
 * Skills are represented as skillId → level mappings.
 * The createDefaultSkills() function converts these to full ISkill objects.
 *
 * @example
 * const pilotSkills: IDefaultSkillSet = {
 *   skills: { 'gunnery': 4, 'piloting': 5 }
 * };
 */
export interface IDefaultSkillSet {
  readonly skills: Record<string, number>;
}

/**
 * Default skill sets for each campaign personnel role.
 *
 * Each role has a predefined set of skills at specific levels.
 * These represent the baseline competencies for that role.
 *
 * - PILOT: Combat pilot with gunnery and mech piloting
 * - AEROSPACE_PILOT: Aerospace combat pilot
 * - VEHICLE_DRIVER: Ground vehicle operator
 * - TECH: Mech technician
 * - DOCTOR: Medical doctor
 * - ADMIN: Administrative/logistics personnel
 * - MEDIC: Field medic
 * - SUPPORT: Support staff with tech and admin skills
 * - SOLDIER: Infantry soldier with small arms and anti-mech
 * - UNASSIGNED: No default skills
 *
 * @example
 * const pilotSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.PILOT];
 * // { skills: { 'gunnery': 4, 'piloting': 5 } }
 */
export const DEFAULT_SKILLS_BY_ROLE: Record<
  CampaignPersonnelRole,
  IDefaultSkillSet
> = {
  // Combat roles
  [CampaignPersonnelRole.PILOT]: {
    skills: { gunnery: 4, piloting: 5 },
  },
  [CampaignPersonnelRole.LAM_PILOT]: {
    skills: { gunnery: 4, piloting: 5, 'lam-piloting': 4 },
  },
  [CampaignPersonnelRole.AEROSPACE_PILOT]: {
    skills: { 'gunnery-aerospace': 4, 'piloting-aerospace': 5 },
  },
  [CampaignPersonnelRole.VEHICLE_DRIVER]: {
    skills: { 'gunnery-vehicle': 4, driving: 5 },
  },
  [CampaignPersonnelRole.VEHICLE_CREW_NAVAL]: {
    skills: { 'gunnery-vehicle': 4, driving: 5, 'naval-ops': 3 },
  },
  [CampaignPersonnelRole.VEHICLE_CREW_VTOL]: {
    skills: { 'gunnery-vehicle': 4, 'vtol-piloting': 5 },
  },
  [CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT]: {
    skills: { 'gunnery-aircraft': 4, 'aircraft-piloting': 5 },
  },
  [CampaignPersonnelRole.PROTOMEK_PILOT]: {
    skills: { gunnery: 4, 'protomek-piloting': 5 },
  },
  [CampaignPersonnelRole.BATTLE_ARMOUR]: {
    skills: { 'small-arms': 5, 'battle-armor': 5 },
  },
  [CampaignPersonnelRole.SOLDIER]: {
    skills: { 'small-arms': 5, 'anti-mek': 7 },
  },
  [CampaignPersonnelRole.VESSEL_PILOT]: {
    skills: { 'vessel-piloting': 5, navigation: 4 },
  },
  [CampaignPersonnelRole.VESSEL_GUNNER]: {
    skills: { 'vessel-gunnery': 5, gunnery: 4 },
  },
  [CampaignPersonnelRole.VESSEL_CREW]: {
    skills: { 'vessel-ops': 4 },
  },
  [CampaignPersonnelRole.VESSEL_NAVIGATOR]: {
    skills: { navigation: 5, 'vessel-ops': 3 },
  },

  // Support roles
  [CampaignPersonnelRole.TECH]: {
    skills: { 'tech-mech': 5, 'tech-general': 5 },
  },
  [CampaignPersonnelRole.MEK_TECH]: {
    skills: { 'tech-mech': 5, 'tech-general': 5 },
  },
  [CampaignPersonnelRole.MECHANIC]: {
    skills: { 'tech-vehicle': 5, 'tech-general': 5 },
  },
  [CampaignPersonnelRole.AERO_TEK]: {
    skills: { 'tech-aerospace': 5, 'tech-general': 5 },
  },
  [CampaignPersonnelRole.BA_TECH]: {
    skills: { 'tech-ba': 5, 'tech-general': 5 },
  },
  [CampaignPersonnelRole.ASTECH]: {
    skills: { astech: 5 },
  },
  [CampaignPersonnelRole.DOCTOR]: {
    skills: { medicine: 5 },
  },
  [CampaignPersonnelRole.MEDIC]: {
    skills: { medtech: 5 },
  },
  [CampaignPersonnelRole.ADMIN_COMMAND]: {
    skills: { administration: 5, leadership: 4 },
  },
  [CampaignPersonnelRole.ADMIN_LOGISTICS]: {
    skills: { administration: 5, logistics: 4 },
  },
  [CampaignPersonnelRole.ADMIN_TRANSPORT]: {
    skills: { administration: 5, logistics: 4 },
  },
  [CampaignPersonnelRole.ADMIN_HR]: {
    skills: { administration: 5, 'personnel-mgmt': 4 },
  },

  // Civilian roles
  [CampaignPersonnelRole.DEPENDENT]: {
    skills: {},
  },
  [CampaignPersonnelRole.CIVILIAN_OTHER]: {
    skills: {},
  },
  [CampaignPersonnelRole.MERCHANT]: {
    skills: { trading: 4 },
  },
  [CampaignPersonnelRole.TEACHER]: {
    skills: { education: 4 },
  },
  [CampaignPersonnelRole.LAWYER]: {
    skills: { law: 4 },
  },
  [CampaignPersonnelRole.MUSICIAN]: {
    skills: { music: 4 },
  },
  [CampaignPersonnelRole.CHEF]: {
    skills: { cooking: 4 },
  },
  [CampaignPersonnelRole.BARTENDER]: {
    skills: { bartending: 4 },
  },
  [CampaignPersonnelRole.FIREFIGHTER]: {
    skills: { 'fire-fighting': 4 },
  },
  [CampaignPersonnelRole.FARMER]: {
    skills: { farming: 4 },
  },
  [CampaignPersonnelRole.MINER]: {
    skills: { mining: 4 },
  },
  [CampaignPersonnelRole.FACTORY_WORKER]: {
    skills: { manufacturing: 4 },
  },
  [CampaignPersonnelRole.COURIER]: {
    skills: { driving: 4 },
  },
  [CampaignPersonnelRole.GAMBLER]: {
    skills: { gambling: 4 },
  },
  [CampaignPersonnelRole.HISTORIAN]: {
    skills: { history: 4 },
  },
  [CampaignPersonnelRole.PAINTER]: {
    skills: { art: 4 },
  },
  [CampaignPersonnelRole.RELIGIOUS_LEADER]: {
    skills: { religion: 4 },
  },
  [CampaignPersonnelRole.PSYCHOLOGIST]: {
    skills: { psychology: 4 },
  },
  [CampaignPersonnelRole.NOBLE]: {
    skills: { administration: 4, leadership: 4 },
  },

  // Legacy roles
  [CampaignPersonnelRole.ADMIN]: {
    skills: { administration: 5 },
  },
  [CampaignPersonnelRole.SUPPORT]: {
    skills: { astech: 5, administration: 7 },
  },
  [CampaignPersonnelRole.UNASSIGNED]: {
    skills: {},
  },
};

/**
 * Experience level adjustments to default skill levels.
 *
 * Experience levels modify the base skill levels to reflect character progression:
 * - GREEN: +1 (worse, higher TN for skill checks)
 * - REGULAR: 0 (default, no adjustment)
 * - VETERAN: -1 (better, lower TN for skill checks)
 * - ELITE: -2 (best, significantly lower TN)
 *
 * The modifier is added to each skill level when creating default skills.
 *
 * @example
 * // A GREEN pilot gets gunnery 4+1=5, piloting 5+1=6
 * // An ELITE pilot gets gunnery 4-2=2, piloting 5-2=3
 */
export const EXPERIENCE_SKILL_MODIFIER: Record<SkillExperienceLevel, number> = {
  [SkillExperienceLevel.Green]: 1,
  [SkillExperienceLevel.Regular]: 0,
  [SkillExperienceLevel.Veteran]: -1,
  [SkillExperienceLevel.Elite]: -2,
};

/**
 * Creates default skills for a character based on role and experience level.
 *
 * Returns a Record of skillId → ISkill with:
 * - Level adjusted by experience modifier
 * - Bonus set to 0
 * - xpProgress set to 0
 * - typeId set to the skill ID
 *
 * @param role - The character's campaign role
 * @param level - The character's experience level
 *
 * @returns A Record of skillId → ISkill for the role and experience level
 *
 * @example
 * // Create skills for a GREEN pilot
 * const skills = createDefaultSkills(CampaignPersonnelRole.PILOT, SkillExperienceLevel.Green);
 * // {
 * //   gunnery: { level: 5, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
 * //   piloting: { level: 6, bonus: 0, xpProgress: 0, typeId: 'piloting' }
 * // }
 *
 * // Create skills for an ELITE pilot
 * const eliteSkills = createDefaultSkills(CampaignPersonnelRole.PILOT, SkillExperienceLevel.Elite);
 * // {
 * //   gunnery: { level: 2, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
 * //   piloting: { level: 3, bonus: 0, xpProgress: 0, typeId: 'piloting' }
 * // }
 */
export function createDefaultSkills(
  role: CampaignPersonnelRole,
  level: SkillExperienceLevel,
): Record<string, ISkill> {
  const skillSet = DEFAULT_SKILLS_BY_ROLE[role];
  const modifier = EXPERIENCE_SKILL_MODIFIER[level];

  const result: Record<string, ISkill> = {};

  for (const [skillId, baseLevel] of Object.entries(skillSet.skills)) {
    const adjustedLevel = Math.max(0, baseLevel + modifier);

    result[skillId] = {
      level: adjustedLevel,
      bonus: 0,
      xpProgress: 0,
      typeId: skillId,
    };
  }

  return result;
}
