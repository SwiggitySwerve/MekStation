/**
 * Tech Rating System Types
 * 
 * Defines technology availability and rating classifications.
 * 
 * @spec openspec/changes/implement-phase4-validation/specs/tech-rating-system/spec.md
 */

/**
 * Tech rating enumeration (A through F)
 */
export enum TechRating {
  A = 'A', // Primitive
  B = 'B', // Pre-Industrial
  C = 'C', // Industrial
  D = 'D', // High-Tech
  E = 'E', // Advanced
  F = 'F', // Experimental
}

/**
 * Availability code parts
 */
export interface AvailabilityCode {
  readonly techRating: TechRating;
  readonly eraCodes: string; // e.g., "C-C-C-B"
  readonly extinctionEras?: string[];
}

/**
 * Technology availability by era
 */
export interface TechAvailability {
  readonly componentId: string;
  readonly componentName: string;
  readonly techRating: TechRating;
  readonly innerSphereIntroYear: number;
  readonly innerSphereExtinctYear?: number;
  readonly clanIntroYear?: number;
  readonly clanExtinctYear?: number;
  readonly reintroductionYear?: number;
}

/**
 * Era codes for availability
 */
export enum EraCode {
  STAR_LEAGUE = 'SL',
  EARLY_SUCCESSION = 'ES',
  LATE_SUCCESSION = 'LS',
  CLAN_INVASION = 'CI',
  CIVIL_WAR = 'CW',
  JIHAD = 'JH',
  DARK_AGE = 'DA',
}

/**
 * Tech rating comparison values
 */
export const TECH_RATING_VALUES: Record<TechRating, number> = {
  [TechRating.A]: 0,
  [TechRating.B]: 1,
  [TechRating.C]: 2,
  [TechRating.D]: 3,
  [TechRating.E]: 4,
  [TechRating.F]: 5,
};

/**
 * Compare tech ratings
 */
export function compareTechRatings(a: TechRating, b: TechRating): number {
  return TECH_RATING_VALUES[a] - TECH_RATING_VALUES[b];
}

/**
 * Get highest tech rating from components
 */
export function getHighestTechRating(ratings: TechRating[]): TechRating {
  if (ratings.length === 0) return TechRating.C;
  
  return ratings.reduce((highest, current) => {
    return compareTechRatings(current, highest) > 0 ? current : highest;
  }, TechRating.A);
}

/**
 * Check if technology is available in year
 */
export function isTechAvailable(
  availability: TechAvailability,
  year: number,
  isClan: boolean
): boolean {
  if (isClan) {
    if (!availability.clanIntroYear) return false;
    if (year < availability.clanIntroYear) return false;
    if (availability.clanExtinctYear && year > availability.clanExtinctYear) {
      return availability.reintroductionYear 
        ? year >= availability.reintroductionYear 
        : false;
    }
    return true;
  }
  
  if (year < availability.innerSphereIntroYear) return false;
  if (availability.innerSphereExtinctYear && year > availability.innerSphereExtinctYear) {
    return availability.reintroductionYear 
      ? year >= availability.reintroductionYear 
      : false;
  }
  return true;
}

