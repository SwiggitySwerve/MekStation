import {
  isValidCriticalSlots,
  validateCriticalSlots,
  getLocationSlotCapacity,
  canAllocateSlots,
  LOCATION_SLOT_CAPACITY,
  TOTAL_MECH_SLOTS,
} from '@/utils/physical/criticalSlotUtils';

describe('criticalSlotUtils', () => {
  describe('isValidCriticalSlots()', () => {
    it('should return true for valid slot count', () => {
      expect(isValidCriticalSlots(0)).toBe(true);
      expect(isValidCriticalSlots(5)).toBe(true);
      expect(isValidCriticalSlots(12)).toBe(true);
    });

    it('should return false for negative slots', () => {
      expect(isValidCriticalSlots(-1)).toBe(false);
    });

    it('should return false for non-integer slots', () => {
      expect(isValidCriticalSlots(5.5)).toBe(false);
    });
  });

  describe('validateCriticalSlots()', () => {
    it('should return valid for correct slots', () => {
      const result = validateCriticalSlots(5);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for invalid slots', () => {
      const result = validateCriticalSlots(-1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include context in errors', () => {
      const result = validateCriticalSlots(-1, 'Test');
      expect(result.errors[0]).toContain('Test');
    });
  });

  describe('getLocationSlotCapacity()', () => {
    it('should return capacity for head', () => {
      expect(getLocationSlotCapacity('Head')).toBe(6);
      expect(getLocationSlotCapacity('HEAD')).toBe(6);
    });

    it('should return capacity for center torso', () => {
      expect(getLocationSlotCapacity('Center Torso')).toBe(12);
      expect(getLocationSlotCapacity('CENTER_TORSO')).toBe(12);
    });

    it('should return undefined for invalid location', () => {
      expect(getLocationSlotCapacity('Invalid')).toBeUndefined();
    });
  });

  describe('canAllocateSlots()', () => {
    it('should return true when allocation fits', () => {
      expect(canAllocateSlots(5, 3, 12)).toBe(true);
    });

    it('should return false when allocation exceeds capacity', () => {
      expect(canAllocateSlots(10, 5, 12)).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(canAllocateSlots(-1, 5, 12)).toBe(false);
      expect(canAllocateSlots(5, -1, 12)).toBe(false);
      expect(canAllocateSlots(5, 3, -1)).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have LOCATION_SLOT_CAPACITY defined', () => {
      expect(LOCATION_SLOT_CAPACITY.HEAD).toBe(6);
      expect(LOCATION_SLOT_CAPACITY.CENTER_TORSO).toBe(12);
    });

    it('should have TOTAL_MECH_SLOTS equal to sum', () => {
      const sum =
        LOCATION_SLOT_CAPACITY.HEAD +
        LOCATION_SLOT_CAPACITY.CENTER_TORSO +
        LOCATION_SLOT_CAPACITY.LEFT_TORSO +
        LOCATION_SLOT_CAPACITY.RIGHT_TORSO +
        LOCATION_SLOT_CAPACITY.LEFT_ARM +
        LOCATION_SLOT_CAPACITY.RIGHT_ARM +
        LOCATION_SLOT_CAPACITY.LEFT_LEG +
        LOCATION_SLOT_CAPACITY.RIGHT_LEG;

      expect(TOTAL_MECH_SLOTS).toBe(sum);
    });
  });
});
