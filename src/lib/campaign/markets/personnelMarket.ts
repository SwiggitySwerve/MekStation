/**
 * Personnel Market - Generates random personnel for hire in campaign
 *
 * Provides daily personnel generation with role-weighted selection,
 * experience-based expiration, and hire cost calculation.
 * Only MekHQ style is implemented; CamOps styles are stubs.
 *
 * Based on MekHQ PersonnelMarket.java, simplified for MVP.
 *
 * @module lib/campaign/markets/personnelMarket
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import { PersonnelMarketStyle, ExperienceLevel } from '@/types/campaign/markets/marketTypes';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import { CampaignPersonnelRole, getRoleCategory } from '@/types/campaign/enums/CampaignPersonnelRole';

// =============================================================================
// Types
// =============================================================================

/** Injectable random function for testability. */
export type RandomFn = () => number;

// =============================================================================
// Constants
// =============================================================================

/** Combat roles available on the personnel market. */
const COMBAT_ROLES: readonly CampaignPersonnelRole[] = Object.freeze([
  CampaignPersonnelRole.PILOT,
  CampaignPersonnelRole.AEROSPACE_PILOT,
  CampaignPersonnelRole.VEHICLE_DRIVER,
  CampaignPersonnelRole.BATTLE_ARMOUR,
  CampaignPersonnelRole.SOLDIER,
]);

/** Support roles available on the personnel market. */
const SUPPORT_ROLES: readonly CampaignPersonnelRole[] = Object.freeze([
  CampaignPersonnelRole.MEK_TECH,
  CampaignPersonnelRole.MECHANIC,
  CampaignPersonnelRole.DOCTOR,
  CampaignPersonnelRole.MEDIC,
  CampaignPersonnelRole.ADMIN_LOGISTICS,
  CampaignPersonnelRole.ADMIN_HR,
]);

const FIRST_NAMES: readonly string[] = Object.freeze([
  'Alexander', 'Natasha', 'Morgan', 'Hanse', 'Katrina',
  'Victor', 'Kai', 'Phelan', 'Aidan', 'Joanna',
  'Takashi', 'Melissa',
]);

const LAST_NAMES: readonly string[] = Object.freeze([
  'Kerensky', 'Davion', 'Steiner', 'Liao', 'Marik',
  'Kurita', 'Allard', 'Ward', 'Pryde', 'Sortek',
  'Cameron', 'Hazen',
]);

/** Expiration days by experience level. */
const EXPIRATION_DAYS: Record<ExperienceLevel, number> = {
  [ExperienceLevel.ELITE]: 3,
  [ExperienceLevel.VETERAN]: 7,
  [ExperienceLevel.REGULAR]: 14,
  [ExperienceLevel.GREEN]: 30,
};

/** Skill level by experience (lower is better in BattleTech). */
const SKILL_BY_EXPERIENCE: Record<ExperienceLevel, number> = {
  [ExperienceLevel.GREEN]: 5,
  [ExperienceLevel.REGULAR]: 4,
  [ExperienceLevel.VETERAN]: 3,
  [ExperienceLevel.ELITE]: 2,
};

/** Base hire cost by role category. */
const BASE_COST: Record<string, number> = {
  combat: 50000,
  support: 30000,
  civilian: 15000,
};

/** Cost multiplier by experience level. */
const EXPERIENCE_COST_MULTIPLIER: Record<ExperienceLevel, number> = {
  [ExperienceLevel.GREEN]: 0.5,
  [ExperienceLevel.REGULAR]: 1.0,
  [ExperienceLevel.VETERAN]: 2.0,
  [ExperienceLevel.ELITE]: 4.0,
};

// =============================================================================
// Core Functions
// =============================================================================

/** Returns expiration days for a given experience level. */
export function getExpirationDays(experience: ExperienceLevel): number {
  return EXPIRATION_DAYS[experience];
}

/** Returns 1-3 daily recruits (MekHQ style). */
export function calculateDailyRecruits(random: RandomFn): number {
  return Math.floor(random() * 3) + 1;
}

/** Selects a random role: 60% combat, 40% support. */
export function selectRandomRole(random: RandomFn): CampaignPersonnelRole {
  if (random() < 0.6) {
    const index = Math.floor(random() * COMBAT_ROLES.length);
    return COMBAT_ROLES[index];
  }
  const index = Math.floor(random() * SUPPORT_ROLES.length);
  return SUPPORT_ROLES[index];
}

/** Selects experience level: GREEN=40%, REGULAR=35%, VETERAN=20%, ELITE=5%. */
export function selectExperienceLevel(random: RandomFn): ExperienceLevel {
  const roll = random();
  if (roll < 0.40) return ExperienceLevel.GREEN;
  if (roll < 0.75) return ExperienceLevel.REGULAR;
  if (roll < 0.95) return ExperienceLevel.VETERAN;
  return ExperienceLevel.ELITE;
}

/** Returns default skills for a role and experience level. */
export function generateDefaultSkills(
  role: CampaignPersonnelRole,
  experience: ExperienceLevel
): Record<string, number> {
  const level = SKILL_BY_EXPERIENCE[experience];
  const category = getRoleCategory(role);

  if (category === 'combat') {
    return { gunnery: level, piloting: level };
  }
  return { technician: level };
}

/** Calculates C-bill hire cost based on role category and experience. */
export function calculateHireCost(
  role: CampaignPersonnelRole,
  experience: ExperienceLevel
): number {
  const category = getRoleCategory(role);
  const base = BASE_COST[category] ?? BASE_COST.civilian;
  return base * EXPERIENCE_COST_MULTIPLIER[experience];
}

/** Generates a random name from first/last name arrays. */
export function generateRandomName(random: RandomFn): string {
  const firstIndex = Math.floor(random() * FIRST_NAMES.length);
  const lastIndex = Math.floor(random() * LAST_NAMES.length);
  return `${FIRST_NAMES[firstIndex]} ${LAST_NAMES[lastIndex]}`;
}

/** Adds days to an ISO date string, returns YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

// =============================================================================
// Market Operations
// =============================================================================

/** Generates personnel offers for a single day. */
export function generatePersonnelForDay(
  campaign: ICampaign,
  random: RandomFn
): IPersonnelMarketOffer[] {
  const style = campaign.options.personnelMarketStyle ?? PersonnelMarketStyle.DISABLED;
  if (style === PersonnelMarketStyle.DISABLED) {
    return [];
  }

  const count = calculateDailyRecruits(random);
  const currentDate = campaign.currentDate.toISOString().split('T')[0];
  const offers: IPersonnelMarketOffer[] = [];

  for (let i = 0; i < count; i++) {
    const role = selectRandomRole(random);
    const experience = selectExperienceLevel(random);
    const skills = generateDefaultSkills(role, experience);
    const hireCost = calculateHireCost(role, experience);
    const name = generateRandomName(random);
    const expirationDate = addDays(currentDate, getExpirationDays(experience));

    offers.push({
      id: `pmo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      role,
      experienceLevel: experience,
      skills,
      hireCost,
      expirationDate,
    });
  }

  return offers;
}

/** Removes offers whose expirationDate is before currentDate. */
export function removeExpiredOffers(
  offers: readonly IPersonnelMarketOffer[],
  currentDate: string
): IPersonnelMarketOffer[] {
  return offers.filter((offer) => offer.expirationDate >= currentDate);
}

/** Finds and returns an offer by ID for hiring. */
export function hirePerson(
  offerId: string,
  offers: readonly IPersonnelMarketOffer[]
): { hired: IPersonnelMarketOffer | null; reason?: string } {
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) {
    return { hired: null, reason: 'Offer not found' };
  }
  return { hired: offer };
}
