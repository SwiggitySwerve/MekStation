/**
 * FormationLevel - Campaign formation level enumeration
 * Defines the organizational level of military units.
 */

/**
 * Military formation organizational level
 */
export enum FormationLevel {
  /** Lance - 4 mechs (smallest unit) */
  LANCE = 'Lance',

  /** Company - 12 mechs (3 lances) */
  COMPANY = 'Company',

  /** Battalion - 36 mechs (3 companies) */
  BATTALION = 'Battalion',

  /** Regiment - 108+ mechs (3 battalions) */
  REGIMENT = 'Regiment',

  /** Reinforced Lance - 5-6 mechs */
  REINFORCED_LANCE = 'Reinforced Lance',

  /** Reinforced Company - 15+ mechs */
  REINFORCED_COMPANY = 'Reinforced Company',

  /** Reinforced Battalion - 45+ mechs */
  REINFORCED_BATTALION = 'Reinforced Battalion',

  /** Reinforced Regiment - 120+ mechs */
  REINFORCED_REGIMENT = 'Reinforced Regiment',
}

/**
 * Array of all valid FormationLevel values for iteration
 */
export const ALL_FORMATION_LEVELS: readonly FormationLevel[] = Object.freeze([
  FormationLevel.LANCE,
  FormationLevel.COMPANY,
  FormationLevel.BATTALION,
  FormationLevel.REGIMENT,
  FormationLevel.REINFORCED_LANCE,
  FormationLevel.REINFORCED_COMPANY,
  FormationLevel.REINFORCED_BATTALION,
  FormationLevel.REINFORCED_REGIMENT,
]);

/**
 * Check if a value is a valid FormationLevel
 */
export function isValidFormationLevel(value: unknown): value is FormationLevel {
  return Object.values(FormationLevel).includes(value as FormationLevel);
}

/**
 * Display name for FormationLevel
 */
export function displayFormationLevel(level: FormationLevel): string {
  return level;
}
