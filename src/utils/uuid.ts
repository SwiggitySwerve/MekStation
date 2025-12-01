/**
 * UUID Utilities
 * 
 * Provides consistent UUID v4 generation for unit identification.
 * UUIDs enable multi-user support and shareable unit URLs.
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * Generate a new UUID v4 for unit identification
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Generate a unit ID with UUID format
 * Prefixes with 'unit-' for clarity in logs/debugging
 */
export function generateUnitId(): string {
  return uuidv4();
}

/**
 * Check if a unit ID is in valid UUID format
 */
export function isValidUnitId(id: string): boolean {
  return uuidValidate(id);
}

