/**
 * Unit Conversion Service Tests
 * 
 * Tests for the centralized unit conversion service that handles
 * conversions between FullUnit, EditableUnit, CustomizableUnit, and
 * ICompleteUnitConfiguration.
 */

import { UnitConversionService } from '../../../services/conversion/UnitConversionService';
import { FullUnit } from '../../../types';
import { EditableUnit } from '../../../types/editor';
import { CustomizableUnit } from '../../../types/customizer';
import { TechBase, RulesLevel } from '../../../types/core/BaseTypes';

describe('UnitConversionService', () => {
  let service: UnitConversionService;

  beforeEach(() => {
    service = new UnitConversionService();
  });

  describe('toEditableUnit', () => {
    it('should convert valid FullUnit to EditableUnit', () => {
      const fullUnit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: 'Succession Wars',
        tech_base: 'Inner Sphere',
        rules_level: 'Standard',
        data: {
          chassis: 'Atlas',
          model: 'AS7-D',
          mass: 100,
          tech_base: 'Inner Sphere',
          rules_level: 'Standard'
        }
      };

      const result = service.toEditableUnit(fullUnit);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-1');
        expect(result.data.chassis).toBe('Atlas');
        expect(result.data.model).toBe('AS7-D');
        expect(result.data.tonnage).toBe(100);
        expect(result.data.techBase).toBe(TechBase.INNER_SPHERE);
        expect(result.data.rulesLevel).toBe(RulesLevel.STANDARD);
      }
    });

    it('should return error for invalid FullUnit', () => {
      const invalidUnit = {
        id: '',
        chassis: '',
        model: ''
      } as FullUnit;

      const result = service.toEditableUnit(invalidUnit);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SOURCE');
        expect(result.error.message).toContain('Invalid FullUnit');
      }
    });
  });

  describe('toFullUnit', () => {
    it('should convert valid EditableUnit to FullUnit', () => {
      const editableUnit: Partial<EditableUnit> = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        tonnage: 100,
        era: 'Succession Wars',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        name: 'AS7-D',
        equipment: [],
        fixedAllocations: [],
        groups: [],
        metadata: {
          version: '1.0',
          created: new Date(),
          modified: new Date(),
          checksum: '',
          size: 0
        },
        structure: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Structure',
            techBase: TechBase.INNER_SPHERE,
            weightMultiplier: 1,
            slots: 0,
            cost: 0,
            introduction: 0
          },
          currentPoints: {
            head: 3,
            centerTorso: 10,
            leftTorso: 7,
            rightTorso: 7,
            leftArm: 5,
            rightArm: 5,
            leftLeg: 7,
            rightLeg: 7
          },
          maxPoints: {
            head: 3,
            centerTorso: 10,
            leftTorso: 7,
            rightTorso: 7,
            leftArm: 5,
            rightArm: 5,
            leftLeg: 7,
            rightLeg: 7
          }
        },
        engine: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Engine',
            techBase: TechBase.INNER_SPHERE,
            ratingMultiplier: 1,
            slots: 0,
            cost: 0,
            introduction: 0
          },
          rating: 300,
          tonnage: 19
        },
        gyro: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Gyro',
            techBase: TechBase.INNER_SPHERE,
            weightMultiplier: 1,
            slots: 4,
            cost: 0,
            introduction: 0
          },
          tonnage: 3
        },
        cockpit: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Cockpit',
            techBase: TechBase.INNER_SPHERE,
            tonnage: 3,
            slots: 1,
            cost: 0,
            introduction: 0
          },
          tonnage: 3
        },
        armor: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Armor',
            techBase: TechBase.INNER_SPHERE,
            pointsPerTon: 16,
            slots: 0,
            cost: 0,
            introduction: 0
          },
          tonnage: 10,
          allocation: {}
        },
        heatSinks: {
          definition: {
            id: 'single',
            name: 'Single',
            type: 'Heat Sink',
            techBase: TechBase.INNER_SPHERE,
            dissipation: 1,
            slots: 1,
            cost: 0,
            introduction: 0
          },
          count: 10,
          engineHeatsinks: 10
        },
        jumpJets: {
          definition: {
            id: 'standard',
            name: 'Standard',
            type: 'Jump Jet',
            techBase: TechBase.INNER_SPHERE,
            weightMultiplier: 1,
            slots: 1,
            cost: 0,
            introduction: 0
          },
          count: 0
        },
        validationState: { isValid: true, errors: [], warnings: [] },
        editorMetadata: {
          lastModified: new Date(),
          isDirty: false,
          version: '1.0'
        },
        fluffData: {},
        unallocatedEquipment: []
      };

      const result = service.toFullUnit(editableUnit as EditableUnit);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-1');
        expect(result.data.chassis).toBe('Atlas');
        expect(result.data.model).toBe('AS7-D');
        expect(result.data.mass).toBe(100);
        expect(result.data.tech_base).toBe('Inner Sphere');
        expect(result.data.rules_level).toBe('Standard');
      }
    });

    it('should return error for invalid EditableUnit', () => {
      const invalidUnit = {
        id: '',
        chassis: '',
        model: ''
      } as EditableUnit;

      const result = service.toFullUnit(invalidUnit);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SOURCE');
      }
    });
  });

  describe('toCustomizableUnit', () => {
    it('should convert FullUnit to CustomizableUnit', () => {
      const fullUnit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: 'Succession Wars',
        tech_base: 'Inner Sphere',
        rules_level: 'Standard',
        data: {
          chassis: 'Atlas',
          model: 'AS7-D',
          mass: 100,
          tech_base: 'Inner Sphere'
        }
      };

      const result = service.toCustomizableUnit(fullUnit);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-1');
        expect(result.data.chassis).toBe('Atlas');
        expect(result.data.model).toBe('AS7-D');
        expect(result.data.mass).toBe(100);
      }
    });
  });

  describe('fromCustomizableUnit', () => {
    it('should convert CustomizableUnit to FullUnit', () => {
      const customizableUnit: CustomizableUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        type: 'BattleMech',
        data: {
          chassis: 'Atlas',
          model: 'AS7-D',
          mass: 100,
          tech_base: 'Inner Sphere',
          era: 'Succession Wars',
          rules_level: 'Standard'
        }
      };

      const result = service.fromCustomizableUnit(customizableUnit);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('test-1');
        expect(result.data.chassis).toBe('Atlas');
        expect(result.data.model).toBe('AS7-D');
        expect(result.data.mass).toBe(100);
      }
    });
  });

  describe('validateSource', () => {
    it('should validate valid FullUnit', () => {
      const fullUnit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: 'Succession Wars',
        tech_base: 'Inner Sphere',
        rules_level: 'Standard',
        data: {}
      };

      const result = service.validateSource(fullUnit, 'FullUnit');

      expect(result.success).toBe(true);
    });

    it('should reject invalid FullUnit', () => {
      const invalidUnit = {
        id: '',
        chassis: ''
      } as FullUnit;

      const result = service.validateSource(invalidUnit, 'FullUnit');

      expect(result.success).toBe(false);
    });
  });

  describe('getConversionMetadata', () => {
    it('should return metadata for FullUnit to EditableUnit conversion', () => {
      const metadata = service.getConversionMetadata('FullUnit', 'EditableUnit');

      expect(metadata.sourceType).toBe('FullUnit');
      expect(metadata.targetType).toBe('EditableUnit');
      expect(metadata.requiredFields).toContain('id');
      expect(metadata.requiredFields).toContain('chassis');
      expect(metadata.requiredFields).toContain('model');
      expect(metadata.canConvert).toBe(true);
    });
  });

  describe('Round-trip conversions', () => {
    it('should convert FullUnit to EditableUnit and back', () => {
      const fullUnit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: 'Succession Wars',
        tech_base: 'Inner Sphere',
        rules_level: 'Standard',
        data: {
          chassis: 'Atlas',
          model: 'AS7-D',
          mass: 100,
          tech_base: 'Inner Sphere',
          rules_level: 'Standard'
        }
      };

      const toEditableResult = service.toEditableUnit(fullUnit);
      expect(toEditableResult.success).toBe(true);

      if (toEditableResult.success) {
        const toFullResult = service.toFullUnit(toEditableResult.data);
        expect(toFullResult.success).toBe(true);

        if (toFullResult.success) {
          expect(toFullResult.data.id).toBe(fullUnit.id);
          expect(toFullResult.data.chassis).toBe(fullUnit.chassis);
          expect(toFullResult.data.model).toBe(fullUnit.model);
          expect(toFullResult.data.mass).toBe(fullUnit.mass);
        }
      }
    });
  });
});
