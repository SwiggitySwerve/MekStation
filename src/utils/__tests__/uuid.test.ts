/**
 * UUID Utilities Tests
 *
 * Tests for UUID generation and validation.
 */

import {
  generateUUID,
  isValidUUID,
  generateUnitId,
  isValidUnitId,
} from '../uuid';

// =============================================================================
// generateUUID Tests
// =============================================================================

describe('generateUUID', () => {
  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV4Pattern);
  });

  it('should generate unique UUIDs', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    // All 100 should be unique
    expect(uuids.size).toBe(100);
  });

  it('should generate UUIDs of correct length', () => {
    const uuid = generateUUID();
    // Standard UUID length with hyphens: 36 characters
    expect(uuid.length).toBe(36);
  });
});

// =============================================================================
// isValidUUID Tests
// =============================================================================

describe('isValidUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isValidUUID(generateUUID())).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
  });

  it('should return false for UUIDs with invalid characters', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
    expect(isValidUUID('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(false);
  });
});

// =============================================================================
// generateUnitId Tests
// =============================================================================

describe('generateUnitId', () => {
  it('should generate a valid UUID v4 format', () => {
    const unitId = generateUnitId();
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(unitId).toMatch(uuidV4Pattern);
  });

  it('should generate unique unit IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateUnitId());
    }
    expect(ids.size).toBe(50);
  });
});

// =============================================================================
// isValidUnitId Tests
// =============================================================================

describe('isValidUnitId', () => {
  it('should return true for valid unit IDs', () => {
    expect(isValidUnitId(generateUnitId())).toBe(true);
    expect(isValidUnitId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for invalid unit IDs', () => {
    expect(isValidUnitId('')).toBe(false);
    expect(isValidUnitId('invalid')).toBe(false);
    expect(isValidUnitId('unit-12345')).toBe(false);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('UUID Integration', () => {
  it('should validate generated UUIDs', () => {
    // Every generated UUID should be valid
    for (let i = 0; i < 10; i++) {
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    }
  });

  it('should validate generated unit IDs', () => {
    for (let i = 0; i < 10; i++) {
      const unitId = generateUnitId();
      expect(isValidUnitId(unitId)).toBe(true);
    }
  });
});
