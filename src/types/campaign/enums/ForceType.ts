/**
 * ForceType - Campaign force type enumeration
 * Defines the type/composition of a military force.
 */

/**
 * Military force type
 */
export enum ForceType {
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
 * Array of all valid ForceType values for iteration
 */
export const ALL_FORCE_TYPES: readonly ForceType[] = Object.freeze([
  ForceType.STANDARD,
  ForceType.SUPPORT,
  ForceType.CONVOY,
  ForceType.SECURITY,
  ForceType.RECON,
  ForceType.STRIKE,
  ForceType.RESERVE,
  ForceType.MIXED,
]);

/**
 * Check if a value is a valid ForceType
 */
export function isValidForceType(value: unknown): value is ForceType {
  return Object.values(ForceType).includes(value as ForceType);
}

/**
 * Display name for ForceType
 */
export function displayForceType(type: ForceType): string {
  return type;
}
