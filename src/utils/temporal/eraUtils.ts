/**
 * Era Utility Functions
 *
 * Functions for determining era from year and working with era boundaries.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

import { Era, ERA_DEFINITIONS, EraDefinition } from '../../types/temporal/Era';

/**
 * Determine the era for a given year
 *
 * @param year - The year to check
 * @returns The era that contains the given year, or undefined if year is out of range
 */
export function getEraForYear(year: number): Era | undefined {
  if (!Number.isFinite(year)) {
    return undefined;
  }

  for (const def of ERA_DEFINITIONS) {
    if (year >= def.startYear && year <= def.endYear) {
      return def.era;
    }
  }

  return undefined;
}

/**
 * Get the era definition for a given year
 *
 * @param year - The year to check
 * @returns The era definition that contains the given year
 */
export function getEraDefinitionForYear(
  year: number,
): EraDefinition | undefined {
  if (!Number.isFinite(year)) {
    return undefined;
  }

  return ERA_DEFINITIONS.find(
    (def) => year >= def.startYear && year <= def.endYear,
  );
}

/**
 * Check if a year falls within a specific era
 *
 * @param year - The year to check
 * @param era - The era to check against
 * @returns True if the year is within the era's boundaries
 */
export function isYearInEra(year: number, era: Era): boolean {
  const def = ERA_DEFINITIONS.find((d) => d.era === era);
  if (!def || !Number.isFinite(year)) {
    return false;
  }
  return year >= def.startYear && year <= def.endYear;
}

/**
 * Get the start year of an era
 *
 * @param era - The era to get the start year for
 * @returns The start year of the era
 */
export function getEraStartYear(era: Era): number | undefined {
  const def = ERA_DEFINITIONS.find((d) => d.era === era);
  return def?.startYear;
}

/**
 * Get the end year of an era
 *
 * @param era - The era to get the end year for
 * @returns The end year of the era
 */
export function getEraEndYear(era: Era): number | undefined {
  const def = ERA_DEFINITIONS.find((d) => d.era === era);
  return def?.endYear;
}

/**
 * Compare two eras chronologically
 *
 * @param a - First era
 * @param b - Second era
 * @returns Negative if a comes before b, positive if after, 0 if same
 */
export function compareEras(a: Era, b: Era): number {
  const defA = ERA_DEFINITIONS.find((d) => d.era === a);
  const defB = ERA_DEFINITIONS.find((d) => d.era === b);

  if (!defA || !defB) {
    return 0;
  }

  return defA.startYear - defB.startYear;
}

/**
 * Get all eras that contain or follow a given year
 *
 * @param year - The starting year
 * @returns Array of eras from that year onward
 */
export function getErasFromYear(year: number): Era[] {
  return ERA_DEFINITIONS.filter((def) => def.endYear >= year).map(
    (def) => def.era,
  );
}

/**
 * Get all eras up to and including a given year
 *
 * @param year - The ending year
 * @returns Array of eras up to that year
 */
export function getErasUntilYear(year: number): Era[] {
  return ERA_DEFINITIONS.filter((def) => def.startYear <= year).map(
    (def) => def.era,
  );
}
