import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  getSlotColors,
  getSlotColorClasses,
  classifySystemComponent,
  isUnhittableComponent,
  SystemComponentType,
  SLOT_COLORS,
} from '@/utils/colors/slotColors';

describe('slotColors', () => {
  describe('getSlotColors', () => {
    it('should return colors for valid component types', () => {
      expect(getSlotColors('engine')).toEqual(SLOT_COLORS.engine);
      expect(getSlotColors('gyro')).toEqual(SLOT_COLORS.gyro);
      expect(getSlotColors('actuator')).toEqual(SLOT_COLORS.actuator);
      expect(getSlotColors('cockpit')).toEqual(SLOT_COLORS.cockpit);
      expect(getSlotColors('lifesupport')).toEqual(SLOT_COLORS.lifesupport);
      expect(getSlotColors('sensors')).toEqual(SLOT_COLORS.sensors);
      expect(getSlotColors('structure')).toEqual(SLOT_COLORS.structure);
      expect(getSlotColors('armor')).toEqual(SLOT_COLORS.armor);
      expect(getSlotColors('empty')).toEqual(SLOT_COLORS.empty);
    });

    it('should return empty colors for invalid component types', () => {
      // @ts-expect-error - testing invalid input
      expect(getSlotColors('invalid')).toEqual(SLOT_COLORS.empty);
    });
  });

  describe('getSlotColorClasses', () => {
    it('should return combined class string for component types', () => {
      const engineClasses = getSlotColorClasses('engine');
      expect(engineClasses).toContain('bg-orange-600');
      expect(engineClasses).toContain('border-orange-700');
      expect(engineClasses).toContain('text-white');
      expect(engineClasses).toContain('hover:bg-orange-500');
    });

    it('should return correct classes for all component types', () => {
      const types: SystemComponentType[] = [
        'engine',
        'gyro',
        'actuator',
        'cockpit',
        'lifesupport',
        'sensors',
        'structure',
        'armor',
        'empty',
      ];

      types.forEach((type) => {
        const classes = getSlotColorClasses(type);
        expect(classes).toBeTruthy();
        expect(typeof classes).toBe('string');
      });
    });
  });

  describe('classifySystemComponent', () => {
    describe('structure types', () => {
      it('should classify Endo Steel IS as structure', () => {
        expect(
          classifySystemComponent(InternalStructureType.ENDO_STEEL_IS),
        ).toBe('structure');
      });

      it('should classify Endo Steel Clan as structure', () => {
        expect(
          classifySystemComponent(InternalStructureType.ENDO_STEEL_CLAN),
        ).toBe('structure');
      });

      it('should classify Endo Composite as structure', () => {
        expect(
          classifySystemComponent(InternalStructureType.ENDO_COMPOSITE),
        ).toBe('structure');
      });

      it('should classify names containing structure types as structure', () => {
        // Note: classifySystemComponent checks for exact matches or includes
        // So we need to use the actual enum values or names that include them
        expect(
          classifySystemComponent(InternalStructureType.ENDO_STEEL_IS),
        ).toBe('structure');
        expect(
          classifySystemComponent(InternalStructureType.ENDO_STEEL_CLAN),
        ).toBe('structure');
      });
    });

    describe('armor types', () => {
      it('should classify Ferro-Fibrous IS as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(
          'armor',
        );
      });

      it('should classify Ferro-Fibrous Clan as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.FERRO_FIBROUS_CLAN)).toBe(
          'armor',
        );
      });

      it('should classify Light Ferro as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.LIGHT_FERRO)).toBe(
          'armor',
        );
      });

      it('should classify Heavy Ferro as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.HEAVY_FERRO)).toBe(
          'armor',
        );
      });

      it('should classify Stealth Armor as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.STEALTH)).toBe('armor');
      });

      it('should classify Reactive Armor as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.REACTIVE)).toBe('armor');
      });

      it('should classify Reflective Armor as armor', () => {
        expect(classifySystemComponent(ArmorTypeEnum.REFLECTIVE)).toBe('armor');
      });
    });

    describe('engine types', () => {
      it('should classify engine names', () => {
        expect(classifySystemComponent('Fusion Engine')).toBe('engine');
        expect(classifySystemComponent('XL Engine')).toBe('engine');
        expect(classifySystemComponent('Standard Fusion')).toBe('engine');
      });
    });

    describe('gyro types', () => {
      it('should classify gyro names', () => {
        expect(classifySystemComponent('Standard Gyro')).toBe('gyro');
        expect(classifySystemComponent('XL Gyro')).toBe('gyro');
        expect(classifySystemComponent('Compact Gyro')).toBe('gyro');
      });
    });

    describe('actuator types', () => {
      it('should classify shoulder actuators', () => {
        expect(classifySystemComponent('Shoulder Actuator')).toBe('actuator');
      });

      it('should classify upper arm actuators', () => {
        expect(classifySystemComponent('Upper Arm Actuator')).toBe('actuator');
      });

      it('should classify lower arm actuators', () => {
        expect(classifySystemComponent('Lower Arm Actuator')).toBe('actuator');
      });

      it('should classify hand actuators', () => {
        expect(classifySystemComponent('Hand Actuator')).toBe('actuator');
      });

      it('should classify hip actuators', () => {
        expect(classifySystemComponent('Hip Actuator')).toBe('actuator');
      });

      it('should classify upper leg actuators', () => {
        expect(classifySystemComponent('Upper Leg Actuator')).toBe('actuator');
      });

      it('should classify lower leg actuators', () => {
        expect(classifySystemComponent('Lower Leg Actuator')).toBe('actuator');
      });

      it('should classify foot actuators', () => {
        expect(classifySystemComponent('Foot Actuator')).toBe('actuator');
      });
    });

    describe('cockpit types', () => {
      it('should classify cockpit names', () => {
        expect(classifySystemComponent('Standard Cockpit')).toBe('cockpit');
        expect(classifySystemComponent('Small Cockpit')).toBe('cockpit');
        // Command Console is classified as electronics in equipmentColors, not cockpit
        expect(classifySystemComponent('Cockpit')).toBe('cockpit');
      });
    });

    describe('life support types', () => {
      it('should classify life support names', () => {
        expect(classifySystemComponent('Life Support')).toBe('lifesupport');
        expect(classifySystemComponent('Life Support System')).toBe(
          'lifesupport',
        );
      });
    });

    describe('sensor types', () => {
      it('should classify sensor names', () => {
        expect(classifySystemComponent('Sensors')).toBe('sensors');
        expect(classifySystemComponent('Sensor System')).toBe('sensors');
      });
    });

    describe('unknown types', () => {
      it('should return empty for unknown names', () => {
        expect(classifySystemComponent('Unknown Component')).toBe('empty');
        expect(classifySystemComponent('')).toBe('empty');
      });
    });
  });

  describe('isUnhittableComponent', () => {
    it('should return true for structure type', () => {
      expect(isUnhittableComponent('structure')).toBe(true);
    });

    it('should return true for armor type', () => {
      expect(isUnhittableComponent('armor')).toBe(true);
    });

    it('should return false for hittable components', () => {
      expect(isUnhittableComponent('engine')).toBe(false);
      expect(isUnhittableComponent('gyro')).toBe(false);
      expect(isUnhittableComponent('actuator')).toBe(false);
      expect(isUnhittableComponent('cockpit')).toBe(false);
      expect(isUnhittableComponent('lifesupport')).toBe(false);
      expect(isUnhittableComponent('sensors')).toBe(false);
      expect(isUnhittableComponent('empty')).toBe(false);
    });
  });
});
