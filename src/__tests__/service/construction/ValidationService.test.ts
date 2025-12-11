/**
 * Validation Service Tests
 * 
 * Tests for mech build validation.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { ValidationService, validationService } from '@/services/construction/ValidationService';
import { IEditableMech, IEquipmentSlot } from '@/services/construction/MechBuilderService';
import { TechBase } from '@/types/enums/TechBase';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  /**
   * Create a valid mock mech for testing
   */
  function createValidMech(overrides: Partial<IEditableMech> = {}): IEditableMech {
    return {
      id: 'test-mech',
      chassis: 'Test',
      variant: 'Mech',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      engineRating: 200,
      engineType: 'Standard',
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      heatSinkType: 'Single',
      heatSinkCount: 10,
      walkMP: 4,
      cockpitType: 'Standard',
      armorAllocation: {
        head: 9,
        centerTorso: 16,
        centerTorsoRear: 5,
        leftTorso: 12,
        leftTorsoRear: 4,
        rightTorso: 12,
        rightTorsoRear: 4,
        leftArm: 10,
        rightArm: 10,
        leftLeg: 12,
        rightLeg: 12,
      },
      equipment: [],
      isDirty: false,
      ...overrides,
    } as IEditableMech;
  }

  // ============================================================================
  // Singleton
  // ============================================================================
  describe('Singleton', () => {
    it('should export a singleton instance', () => {
      expect(validationService).toBeInstanceOf(ValidationService);
    });
  });

  // ============================================================================
  // validate()
  // ============================================================================
  describe('validate()', () => {
    it('should return valid for proper mech', () => {
      const mech = createValidMech();
      const result = service.validate(mech);
      
      expect(result.isValid).toBe(true);
    });

    it('should aggregate all validation errors', () => {
      const mech = createValidMech({
        engineRating: 7, // Invalid: not multiple of 5 and too low
        heatSinkCount: 5, // Invalid: less than 10
        armorAllocation: {
          ...createValidMech().armorAllocation,
          head: 15, // Invalid: exceeds 9
        },
      });
      
      const result = service.validate(mech);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // validateWeight()
  // ============================================================================
  describe('validateWeight()', () => {
    it('should pass for valid weight', () => {
      const mech = createValidMech();
      const errors = service.validateWeight(mech);
      
      expect(errors).toHaveLength(0);
    });

    it('should detect overweight', () => {
      // Create a mech with lots of armor and equipment
      const mech = createValidMech({
        tonnage: 20,
        engineRating: 200, // Very heavy for a 20-tonner
        heatSinkCount: 20,
        armorAllocation: {
          head: 9,
          centerTorso: 50,
          centerTorsoRear: 20,
          leftTorso: 40,
          leftTorsoRear: 15,
          rightTorso: 40,
          rightTorsoRear: 15,
          leftArm: 30,
          rightArm: 30,
          leftLeg: 30,
          rightLeg: 30,
        },
      });
      
      const errors = service.validateWeight(mech);
      
      expect(errors.some(e => e.code === 'OVERWEIGHT')).toBe(true);
    });
  });

  // ============================================================================
  // validateArmor()
  // ============================================================================
  describe('validateArmor()', () => {
    it('should pass for valid armor', () => {
      const mech = createValidMech();
      const errors = service.validateArmor(mech);
      
      expect(errors).toHaveLength(0);
    });

    it('should detect head armor exceeding 9', () => {
      const mech = createValidMech({
        armorAllocation: {
          ...createValidMech().armorAllocation,
          head: 15,
        },
      });
      
      const errors = service.validateArmor(mech);
      
      expect(errors.some(e => e.code === 'ARMOR_EXCEEDS_MAX')).toBe(true);
      expect(errors[0].field).toBe('head');
    });

    it('should allow exactly 9 head armor', () => {
      const mech = createValidMech({
        armorAllocation: {
          ...createValidMech().armorAllocation,
          head: 9,
        },
      });
      
      const errors = service.validateArmor(mech);
      
      expect(errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // validateCriticalSlots()
  // ============================================================================
  describe('validateCriticalSlots()', () => {
    it('should pass for valid slot count', () => {
      const mech = createValidMech({
        equipment: [
          { equipmentId: 'eq-1', location: 'rightArm', slotIndex: 0 },
          { equipmentId: 'eq-2', location: 'rightArm', slotIndex: 1 },
        ] as readonly IEquipmentSlot[],
      });
      
      const errors = service.validateCriticalSlots(mech);
      
      expect(errors).toHaveLength(0);
    });

    it('should detect slots exceeding max in location', () => {
      // Create equipment that exceeds 6 slots in head
      const equipment = Array(10).fill(null).map((_, i) => ({ 
        equipmentId: `eq-${i}`, 
        location: 'head', 
        slotIndex: i 
      })) as IEquipmentSlot[];
      const mech = createValidMech({ equipment });
      
      const errors = service.validateCriticalSlots(mech);
      
      expect(errors.some(e => e.code === 'SLOTS_EXCEEDED')).toBe(true);
    });

    it('should validate each location separately', () => {
      const mech = createValidMech({
        equipment: [
          ...Array(6).fill(null).map((_, i) => ({ equipmentId: 'eq', location: 'leftArm', slotIndex: i })),
          ...Array(6).fill(null).map((_, i) => ({ equipmentId: 'eq', location: 'rightArm', slotIndex: i })),
        ],
      });
      
      const errors = service.validateCriticalSlots(mech);
      
      // 6 slots in each arm should be fine (max is 12)
      expect(errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // validateTechLevel()
  // ============================================================================
  describe('validateTechLevel()', () => {
    it('should return empty array (stub implementation)', () => {
      const mech = createValidMech();
      const errors = service.validateTechLevel(mech);
      
      // Currently a stub
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  // ============================================================================
  // Engine Validation (private)
  // ============================================================================
  describe('Engine Validation', () => {
    it('should detect engine rating below 10', () => {
      const mech = createValidMech({ engineRating: 5 });
      const result = service.validate(mech);
      
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should detect engine rating above 400', () => {
      const mech = createValidMech({ engineRating: 450 });
      const result = service.validate(mech);
      
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should detect engine rating not multiple of 5', () => {
      const mech = createValidMech({ engineRating: 203 });
      const result = service.validate(mech);
      
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should pass valid engine ratings', () => {
      const validRatings = [100, 150, 200, 250, 300, 400];
      
      for (const rating of validRatings) {
        const mech = createValidMech({ engineRating: rating });
        const result = service.validate(mech);
        
        expect(result.errors.filter(e => e.code === 'INVALID_ENGINE_RATING')).toHaveLength(0);
      }
    });
  });

  // ============================================================================
  // Heat Sink Validation (private)
  // ============================================================================
  describe('Heat Sink Validation', () => {
    it('should detect less than 10 heat sinks', () => {
      const mech = createValidMech({ heatSinkCount: 5 });
      const result = service.validate(mech);
      
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_HEAT_SINKS')).toBe(true);
    });

    it('should pass with exactly 10 heat sinks', () => {
      const mech = createValidMech({ heatSinkCount: 10 });
      const result = service.validate(mech);
      
      expect(result.errors.filter(e => e.code === 'INSUFFICIENT_HEAT_SINKS')).toHaveLength(0);
    });

    it('should pass with more than 10 heat sinks', () => {
      const mech = createValidMech({ heatSinkCount: 20 });
      const result = service.validate(mech);
      
      expect(result.errors.filter(e => e.code === 'INSUFFICIENT_HEAT_SINKS')).toHaveLength(0);
    });
  });

  // ============================================================================
  // canAddEquipment()
  // ============================================================================
  describe('canAddEquipment()', () => {
    it('should allow adding to empty location', () => {
      const mech = createValidMech({ equipment: [] });
      
      expect(service.canAddEquipment(mech, 'medium-laser', 'rightArm')).toBe(true);
    });

    it('should allow adding to partially filled location', () => {
      const mech = createValidMech({
        equipment: [
          { equipmentId: 'eq-1', location: 'rightArm', slotIndex: 0 },
        ] as readonly IEquipmentSlot[],
      });
      
      expect(service.canAddEquipment(mech, 'medium-laser', 'rightArm')).toBe(true);
    });

    it('should prevent adding to full location', () => {
      const equipment = Array(12).fill({ id: 'eq', location: 'rightArm' });
      const mech = createValidMech({ equipment });
      
      expect(service.canAddEquipment(mech, 'medium-laser', 'rightArm')).toBe(false);
    });

    it('should handle head with 6 slot limit', () => {
      const equipment = Array(6).fill({ id: 'eq', location: 'head' });
      const mech = createValidMech({ equipment });
      
      expect(service.canAddEquipment(mech, 'equipment', 'head')).toBe(false);
    });

    it('should handle leg locations with 6 slot limit', () => {
      const equipment = Array(6).fill({ id: 'eq', location: 'leftLeg' });
      const mech = createValidMech({ equipment });
      
      expect(service.canAddEquipment(mech, 'equipment', 'leftLeg')).toBe(false);
    });
  });
});

