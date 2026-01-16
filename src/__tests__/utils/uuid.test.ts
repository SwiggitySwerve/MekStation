import {
  generateUUID,
  isValidUUID,
  generateUnitId,
  isValidUnitId,
} from '@/utils/uuid';

describe('uuid utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate different UUIDs each time', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('generateUnitId', () => {
    it('should generate a valid UUID-like unit ID', () => {
      const unitId = generateUnitId();
      expect(isValidUnitId(unitId)).toBe(true);
    });
  });

  describe('isValidUnitId', () => {
    it('should return true for valid unit ID', () => {
      expect(isValidUnitId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid unit ID', () => {
      expect(isValidUnitId('invalid')).toBe(false);
    });
  });
});
