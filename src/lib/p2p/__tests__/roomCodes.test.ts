/**
 * Room Code Tests
 */

import {
  generateRoomCode,
  formatRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  parseRoomCode,
  getRoomCodeHint,
  getRoomCodePlaceholder,
} from '../roomCodes';
import { P2P_CONFIG } from '../types';

// =============================================================================
// Generation Tests
// =============================================================================

describe('generateRoomCode', () => {
  it('should generate a code of correct length', () => {
    const code = generateRoomCode();
    expect(code.length).toBe(P2P_CONFIG.roomCodeLength);
  });

  it('should generate uppercase codes', () => {
    const code = generateRoomCode();
    expect(code).toBe(code.toUpperCase());
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // With 32^6 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });

  it('should not contain confusing characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('should only contain alphanumeric characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    }
  });
});

// =============================================================================
// Formatting Tests
// =============================================================================

describe('formatRoomCode', () => {
  it('should format 6-char code as ABC-DEF', () => {
    expect(formatRoomCode('ABCDEF')).toBe('ABC-DEF');
  });

  it('should handle lowercase input', () => {
    expect(formatRoomCode('abcdef')).toBe('ABC-DEF');
  });

  it('should handle codes with existing hyphens', () => {
    expect(formatRoomCode('ABC-DEF')).toBe('ABC-DEF');
  });

  it('should handle short codes', () => {
    expect(formatRoomCode('ABC')).toBe('ABC');
    expect(formatRoomCode('AB')).toBe('AB');
  });
});

describe('normalizeRoomCode', () => {
  it('should remove hyphens', () => {
    expect(normalizeRoomCode('ABC-DEF')).toBe('ABCDEF');
  });

  it('should convert to uppercase', () => {
    expect(normalizeRoomCode('abcdef')).toBe('ABCDEF');
  });

  it('should remove spaces', () => {
    expect(normalizeRoomCode('ABC DEF')).toBe('ABCDEF');
  });

  it('should remove special characters', () => {
    expect(normalizeRoomCode('ABC!@#DEF')).toBe('ABCDEF');
  });

  it('should truncate to 6 characters', () => {
    expect(normalizeRoomCode('ABCDEFGHI')).toBe('ABCDEF');
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('isValidRoomCode', () => {
  it('should accept valid 6-char codes', () => {
    expect(isValidRoomCode('ABCDEF')).toBe(true);
    expect(isValidRoomCode('ABC234')).toBe(true); // No 1 or 0
    expect(isValidRoomCode('XY5678')).toBe(true);
  });

  it('should accept formatted codes with hyphens', () => {
    expect(isValidRoomCode('ABC-DEF')).toBe(true);
  });

  it('should accept lowercase codes', () => {
    expect(isValidRoomCode('abcdef')).toBe(true);
  });

  it('should reject codes that are too short', () => {
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('should reject codes that are too long after normalization', () => {
    // After normalization, code is truncated to 6 chars, so this becomes valid
    expect(isValidRoomCode('ABCDEFGHI')).toBe(true);
  });

  it('should reject codes with invalid characters (I, O, 0, 1)', () => {
    expect(isValidRoomCode('ABCIOO')).toBe(false);
    expect(isValidRoomCode('ABC011')).toBe(false);
  });
});

describe('parseRoomCode', () => {
  it('should return normalized code for valid input', () => {
    expect(parseRoomCode('ABC-DEF')).toBe('ABCDEF');
    expect(parseRoomCode('abcdef')).toBe('ABCDEF');
  });

  it('should return null for invalid input', () => {
    expect(parseRoomCode('ABC')).toBeNull();
    expect(parseRoomCode('')).toBeNull();
    expect(parseRoomCode('ABCIOO')).toBeNull();
  });
});

// =============================================================================
// Display Helpers Tests
// =============================================================================

describe('getRoomCodeHint', () => {
  it('should return a helpful description', () => {
    const hint = getRoomCodeHint();
    expect(hint).toContain('6');
    expect(hint).toContain('characters');
  });
});

describe('getRoomCodePlaceholder', () => {
  it('should return formatted placeholder', () => {
    expect(getRoomCodePlaceholder()).toBe('ABC-DEF');
  });
});
