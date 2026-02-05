/**
 * Era Definitions with Year Boundaries
 *
 * Defines all canonical BattleTech eras with their historical year ranges.
 * This is the SINGLE SOURCE OF TRUTH for Era definitions.
 *
 * @spec openspec/specs/era-temporal-system/spec.md
 */

/**
 * Canonical BattleTech Eras
 *
 * These represent the major historical periods in the BattleTech universe.
 * Each era has distinct technological and political characteristics.
 */
export enum Era {
  /** Early Spaceflight (pre-2005) - Before the Age of War */
  EARLY_SPACEFLIGHT = 'Early Spaceflight',

  /** Age of War (2005-2570) */
  AGE_OF_WAR = 'Age of War',

  /** Star League (2571-2780) - Golden age of technology */
  STAR_LEAGUE = 'Star League',

  /** Early Succession Wars (2781-2900) - Devastating wars following Star League fall */
  EARLY_SUCCESSION_WARS = 'Early Succession Wars',

  /** Late Succession Wars (2901-3019) - Period of technological decline */
  LATE_SUCCESSION_WARS = 'Late Succession Wars',

  /** Renaissance (3020-3049) - Recovery marked by Helm Memory Core discovery */
  RENAISSANCE = 'Renaissance',

  /** Clan Invasion (3050-3061) - Return of the Clans */
  CLAN_INVASION = 'Clan Invasion',

  /** Civil War (3062-3067) - FedCom Civil War */
  CIVIL_WAR = 'Civil War',

  /** Jihad (3068-3081) - Word of Blake Jihad */
  JIHAD = 'Jihad',

  /** Dark Age (3082-3150) - Collapse of HPG network */
  DARK_AGE = 'Dark Age',

  /** ilClan (3151+) - Era following ilClan Trial on Terra */
  IL_CLAN = 'ilClan',
}

/**
 * Era definition with year boundaries
 */
export interface EraDefinition {
  readonly era: Era;
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly description: string;
}

/**
 * Era date range definition (simplified)
 */
export interface EraRange {
  readonly era: Era;
  readonly startYear: number;
  readonly endYear: number;
}

/**
 * Canonical era definitions with year boundaries
 *
 * Year ranges are inclusive: a component introduced in 2439 is available
 * in the Age of War era (which ends in 2570).
 */
export const ERA_DEFINITIONS: readonly EraDefinition[] = [
  {
    era: Era.EARLY_SPACEFLIGHT,
    name: 'Early Spaceflight',
    startYear: -Infinity,
    endYear: 2004,
    description:
      'The period before widespread interstellar travel and the Age of War.',
  },
  {
    era: Era.AGE_OF_WAR,
    name: 'Age of War',
    startYear: 2005,
    endYear: 2570,
    description:
      'The period of interstellar expansion and conflict before the Star League.',
  },
  {
    era: Era.STAR_LEAGUE,
    name: 'Star League',
    startYear: 2571,
    endYear: 2780,
    description: 'The golden age of human civilization under the Star League.',
  },
  {
    era: Era.EARLY_SUCCESSION_WARS,
    name: 'Early Succession Wars',
    startYear: 2781,
    endYear: 2900,
    description: 'The devastating wars following the fall of the Star League.',
  },
  {
    era: Era.LATE_SUCCESSION_WARS,
    name: 'Late Succession Wars',
    startYear: 2901,
    endYear: 3019,
    description: 'The period of technological decline and limited warfare.',
  },
  {
    era: Era.RENAISSANCE,
    name: 'Renaissance',
    startYear: 3020,
    endYear: 3049,
    description:
      'The recovery period marked by the discovery of the Helm Memory Core.',
  },
  {
    era: Era.CLAN_INVASION,
    name: 'Clan Invasion',
    startYear: 3050,
    endYear: 3061,
    description:
      'The return of the Clans and their invasion of the Inner Sphere.',
  },
  {
    era: Era.CIVIL_WAR,
    name: 'Civil War',
    startYear: 3062,
    endYear: 3067,
    description: 'The FedCom Civil War and related conflicts.',
  },
  {
    era: Era.JIHAD,
    name: 'Jihad',
    startYear: 3068,
    endYear: 3081,
    description: 'The Word of Blake Jihad and its devastating consequences.',
  },
  {
    era: Era.DARK_AGE,
    name: 'Dark Age',
    startYear: 3082,
    endYear: 3150,
    description: 'The collapse of the HPG network and rise of new powers.',
  },
  {
    era: Era.IL_CLAN,
    name: 'ilClan',
    startYear: 3151,
    endYear: 9999, // Ongoing era
    description: 'The era following the ilClan Trial on Terra.',
  },
] as const;

/**
 * Era ranges derived from definitions
 */
export const ERA_RANGES: readonly EraRange[] = ERA_DEFINITIONS.map((def) => ({
  era: def.era,
  startYear: def.startYear,
  endYear: def.endYear,
}));

/**
 * Array of all Era values
 */
export const ALL_ERAS: readonly Era[] = Object.freeze(
  ERA_DEFINITIONS.map((def) => def.era),
);

/**
 * Map for quick era lookup by enum value
 */
export const ERA_MAP: ReadonlyMap<Era, EraDefinition> = new Map(
  ERA_DEFINITIONS.map((def) => [def.era, def]),
);

/**
 * Get era definition by era enum
 */
export function getEraDefinition(era: Era): EraDefinition | undefined {
  return ERA_MAP.get(era);
}

/**
 * Get all era definitions
 */
export function getAllEraDefinitions(): readonly EraDefinition[] {
  return ERA_DEFINITIONS;
}

/**
 * Determine the era for a given year
 */
export function getEraForYear(year: number): Era {
  for (const def of ERA_DEFINITIONS) {
    if (year >= def.startYear && year <= def.endYear) {
      return def.era;
    }
  }
  // Default to ilClan for future years
  return Era.IL_CLAN;
}

/**
 * Get the date range for an era
 */
export function getEraRange(era: Era): EraRange | undefined {
  const def = ERA_MAP.get(era);
  if (!def) return undefined;
  return { era: def.era, startYear: def.startYear, endYear: def.endYear };
}

/**
 * Check if a year falls within an era
 */
export function isYearInEra(year: number, era: Era): boolean {
  const range = getEraRange(era);
  if (!range) return false;
  return year >= range.startYear && year <= range.endYear;
}
