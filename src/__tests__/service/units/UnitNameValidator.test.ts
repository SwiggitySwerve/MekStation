import { unitNameValidator } from '@/services/units/UnitNameValidator';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitService } from '@/services/units/CustomUnitService';
import { IUnitIndexEntry } from '@/services/common/types';

// Mock dependencies
jest.mock('@/services/units/CanonicalUnitService');
jest.mock('@/services/units/CustomUnitService');

const mockCanonicalUnitService = canonicalUnitService as jest.Mocked<typeof canonicalUnitService>;
const mockCustomUnitService = customUnitService as jest.Mocked<typeof customUnitService>;

// Helper to create partial IUnitIndexEntry mocks for testing
function mockUnit(data: { id: string; chassis: string; variant: string; name: string }): IUnitIndexEntry {
  return data as IUnitIndexEntry;
}

describe('UnitNameValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeForComparison', () => {
    it('should normalize names for case-insensitive comparison', () => {
      expect(unitNameValidator.normalizeForComparison('Atlas AS7-D')).toBe('atlas as7-d');
      expect(unitNameValidator.normalizeForComparison('  Atlas   AS7-D  ')).toBe('atlas as7-d');
      expect(unitNameValidator.normalizeForComparison('ATLAS AS7-D')).toBe('atlas as7-d');
    });

    it('should normalize multiple spaces to single space', () => {
      expect(unitNameValidator.normalizeForComparison('Atlas   AS7-D')).toBe('atlas as7-d');
    });
  });

  describe('buildFullName', () => {
    it('should build full name from chassis and variant', () => {
      expect(unitNameValidator.buildFullName('Atlas', 'AS7-D')).toBe('Atlas AS7-D');
    });

    it('should handle empty variant', () => {
      expect(unitNameValidator.buildFullName('Atlas', '')).toBe('Atlas');
    });

    it('should trim whitespace', () => {
      expect(unitNameValidator.buildFullName('  Atlas  ', '  AS7-D  ')).toBe('Atlas AS7-D');
    });
  });

  describe('validateUnitName', () => {
    it('should reject empty chassis', async () => {
      const result = await unitNameValidator.validateUnitName('', 'AS7-D');
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Chassis name is required');
      expect(result.isCanonicalConflict).toBe(false);
      expect(result.isCustomConflict).toBe(false);
    });

    it('should reject empty variant', async () => {
      const result = await unitNameValidator.validateUnitName('Atlas', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Variant designation is required');
    });

    it('should reject canonical unit conflicts', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([
        mockUnit({
          id: 'canon-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          name: 'Atlas AS7-D',
        }),
      ]);
      mockCustomUnitService.list.mockResolvedValue([]);
      
      const result = await unitNameValidator.validateUnitName('Atlas', 'AS7-D');
      
      expect(result.isValid).toBe(false);
      expect(result.isCanonicalConflict).toBe(true);
      expect(result.isCustomConflict).toBe(false);
      expect(result.errorMessage).toContain('official BattleTech unit');
      expect(result.suggestedName).toBeDefined();
    });

    it('should detect custom unit conflicts', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([]);
      mockCustomUnitService.list.mockResolvedValue([
        mockUnit({
          id: 'custom-1',
          chassis: 'Custom Atlas',
          variant: 'AS7-X',
          name: 'Custom Atlas AS7-X',
        }),
      ]);
      
      const result = await unitNameValidator.validateUnitName('Custom Atlas', 'AS7-X');
      
      expect(result.isValid).toBe(true); // Valid but needs confirmation
      expect(result.isCanonicalConflict).toBe(false);
      expect(result.isCustomConflict).toBe(true);
      expect(result.conflictingUnitId).toBe('custom-1');
      expect(result.errorMessage).toContain('already exists');
    });

    it('should exclude unit ID from conflict check', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([]);
      mockCustomUnitService.list.mockResolvedValue([
        mockUnit({
          id: 'custom-1',
          chassis: 'Custom Atlas',
          variant: 'AS7-X',
          name: 'Custom Atlas AS7-X',
        }),
      ]);
      
      const result = await unitNameValidator.validateUnitName('Custom Atlas', 'AS7-X', 'custom-1');
      
      expect(result.isValid).toBe(true);
      expect(result.isCustomConflict).toBe(false);
    });

    it('should accept unique names', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([]);
      mockCustomUnitService.list.mockResolvedValue([]);
      
      const result = await unitNameValidator.validateUnitName('Unique Mech', 'UM-1');
      
      expect(result.isValid).toBe(true);
      expect(result.isCanonicalConflict).toBe(false);
      expect(result.isCustomConflict).toBe(false);
    });

    it('should handle case-insensitive matching', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([
        mockUnit({
          id: 'canon-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          name: 'Atlas AS7-D',
        }),
      ]);
      mockCustomUnitService.list.mockResolvedValue([]);
      
      const result = await unitNameValidator.validateUnitName('atlas', 'as7-d');
      
      expect(result.isCanonicalConflict).toBe(true);
    });

    it('should handle canonical service errors gracefully', async () => {
      mockCanonicalUnitService.getIndex.mockRejectedValue(new Error('Service error'));
      mockCustomUnitService.list.mockResolvedValue([]);
      
      const result = await unitNameValidator.validateUnitName('Test Mech', 'TM-1');
      
      // Should not block on canonical check failure
      expect(result.isCanonicalConflict).toBe(false);
    });
  });

  describe('generateUniqueName', () => {
    it('should generate unique name by appending suffix', async () => {
      mockCanonicalUnitService.getIndex.mockResolvedValue([
        mockUnit({
          id: 'canon-1',
          chassis: 'Atlas',
          variant: 'AS7-D',
          name: 'Atlas AS7-D',
        }),
      ]);
      mockCustomUnitService.list.mockResolvedValue([
        mockUnit({
          id: 'custom-1',
          chassis: 'Atlas',
          variant: 'AS7-D (2)',
          name: 'Atlas AS7-D (2)',
        }),
      ]);
      
      // First two names are taken, third should be available
      let callCount = 0;
      mockCanonicalUnitService.getIndex.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve([
            mockUnit({
              id: 'canon-1',
              chassis: 'Atlas',
              variant: callCount === 1 ? 'AS7-D' : 'AS7-D (2)',
              name: `Atlas AS7-D${callCount === 2 ? ' (2)' : ''}`,
            }),
          ]);
        }
        return Promise.resolve([]);
      });
      
      mockCustomUnitService.list.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve([
            mockUnit({
              id: 'custom-1',
              chassis: 'Atlas',
              variant: callCount === 1 ? 'AS7-D' : 'AS7-D (2)',
              name: `Atlas AS7-D${callCount === 2 ? ' (2)' : ''}`,
            }),
          ]);
        }
        return Promise.resolve([]);
      });
      
      const result = await unitNameValidator.generateUniqueName('Atlas', 'AS7-D');
      
      expect(result.chassis).toBe('Atlas');
      expect(result.variant).toBe('AS7-D (3)');
    });

    it('should use timestamp fallback if many conflicts', async () => {
      // Mock to always return conflicts
      mockCanonicalUnitService.getIndex.mockResolvedValue([
        mockUnit({ id: 'canon-1', chassis: 'Atlas', variant: 'AS7-D', name: 'Atlas AS7-D' }),
      ]);
      mockCustomUnitService.list.mockResolvedValue([
        mockUnit({ id: 'custom-1', chassis: 'Atlas', variant: 'AS7-D (2)', name: 'Atlas AS7-D (2)' }),
      ]);
      
      // Mock validateUnitName to always return conflicts for first 100 attempts
      const originalValidate = unitNameValidator.validateUnitName.bind(unitNameValidator);
      let attemptCount = 0;
      jest.spyOn(unitNameValidator, 'validateUnitName').mockImplementation(async (chassis, variant) => {
        attemptCount++;
        if (attemptCount < 100) {
          return {
            isValid: false,
            isCanonicalConflict: true,
            isCustomConflict: false,
          };
        }
        return originalValidate(chassis, variant);
      });
      
      const result = await unitNameValidator.generateUniqueName('Atlas', 'AS7-D');
      
      expect(result.chassis).toBe('Atlas');
      expect(result.variant).toMatch(/AS7-D-[a-z0-9]+/); // Timestamp suffix
      
      jest.restoreAllMocks();
    });
  });
});

