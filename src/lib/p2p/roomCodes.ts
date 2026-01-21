/**
 * Room Code Utilities
 *
 * Generates and parses memorable room codes for P2P sync.
 * Uses 6-character alphanumeric codes (excluding confusing chars like I/O/0/1).
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

import { P2P_CONFIG } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Characters used in room codes.
 * Excludes I, O, 0, 1 to avoid confusion.
 * 32 chars = 32^6 = ~1 billion combinations
 */
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// =============================================================================
// Generation
// =============================================================================

/**
 * Generate a random room code.
 *
 * @returns A 6-character uppercase room code
 */
export function generateRoomCode(): string {
  let code = '';
  const length = P2P_CONFIG.roomCodeLength;

  // Use crypto.getRandomValues if available for better randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      code += ROOM_CODE_CHARS[array[i] % ROOM_CODE_CHARS.length];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  }

  return code;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a room code for display.
 * Adds a hyphen in the middle: ABCDEF -> ABC-DEF
 *
 * @param code The room code to format
 * @returns Formatted room code
 */
export function formatRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

/**
 * Normalize a room code for internal use.
 * Removes non-alphanumeric characters, converts to uppercase.
 *
 * @param input User input that might contain a room code
 * @returns Normalized room code
 */
export function normalizeRoomCode(input: string): string {
  return input
    .replace(/[^A-Za-z0-9]/g, '') // Remove non-alphanumeric
    .toUpperCase()
    .slice(0, P2P_CONFIG.roomCodeLength);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a room code.
 *
 * @param code The room code to validate
 * @returns True if valid, false otherwise
 */
export function isValidRoomCode(code: string): boolean {
  const normalized = normalizeRoomCode(code);
  if (normalized.length !== P2P_CONFIG.roomCodeLength) {
    return false;
  }

  // Check all characters are in allowed set
  for (const char of normalized) {
    if (!ROOM_CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Parse and validate user input as a room code.
 *
 * @param input User input
 * @returns Parsed room code or null if invalid
 */
export function parseRoomCode(input: string): string | null {
  const normalized = normalizeRoomCode(input);
  return isValidRoomCode(normalized) ? normalized : null;
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Get a description of the room code format for UI hints.
 */
export function getRoomCodeHint(): string {
  return `${P2P_CONFIG.roomCodeLength} characters (letters and numbers)`;
}

/**
 * Get the placeholder pattern for room code input.
 */
export function getRoomCodePlaceholder(): string {
  return 'ABC-DEF';
}
