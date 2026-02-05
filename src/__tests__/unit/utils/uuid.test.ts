import {
  generateUUID,
  isValidUUID,
  generateUnitId,
  isValidUnitId,
} from '@/utils/uuid';

describe('uuid utilities', () => {
  describe('generateUUID()', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUID v4 format', () => {
      const uuid = generateUUID();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('isValidUUID()', () => {
    it('should return true for valid UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUUID('')).toBe(false);
    });

    it('should return false for malformed UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('generateUnitId()', () => {
    it('should generate a valid UUID', () => {
      const id = generateUnitId();
      expect(isValidUUID(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateUnitId();
      const id2 = generateUnitId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidUnitId()', () => {
    it('should return true for valid UUID', () => {
      expect(isValidUnitId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUnitId('not-a-uuid')).toBe(false);
    });
  });
});
