/**
 * ForceRole - Campaign force role enumeration
 * Defines the role/mission type of a military force.
 */

/**
 * Military force role (mission purpose)
 */
export enum ForceRole {
  /** Standard combat force */
  STANDARD = 'Standard',

  /** Support force (logistics, medical, etc.) */
  SUPPORT = 'Support',

  /** Convoy/transport force */
  CONVOY = 'Convoy',

  /** Security/garrison force */
  SECURITY = 'Security',

  /** Reconnaissance force */
  RECON = 'Reconnaissance',

  /** Strike force */
  STRIKE = 'Strike',

  /** Reserve force */
  RESERVE = 'Reserve',

  /** Mixed composition force */
  MIXED = 'Mixed',
}

/**
 * Array of all valid ForceRole values for iteration
 */
export const ALL_FORCE_ROLES: readonly ForceRole[] = Object.freeze([
  ForceRole.STANDARD,
  ForceRole.SUPPORT,
  ForceRole.CONVOY,
  ForceRole.SECURITY,
  ForceRole.RECON,
  ForceRole.STRIKE,
  ForceRole.RESERVE,
  ForceRole.MIXED,
]);

/**
 * Check if a value is a valid ForceRole
 */
export function isValidForceRole(value: unknown): value is ForceRole {
  return Object.values(ForceRole).includes(value as ForceRole);
}

/**
 * Display name for ForceRole
 */
export function displayForceRole(role: ForceRole): string {
  return role;
}
