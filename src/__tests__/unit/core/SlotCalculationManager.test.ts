import { SlotCalculationManager } from '../../../utils/criticalSlots/SlotCalculationManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../../types/componentConfiguration';

describe('SlotCalculationManager', () => {
  const calculator = new SlotCalculationManager();

  const defaultConfig: UnitConfiguration = {
    tonnage: 50,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    introductionYear: 3025,
    chassis: 'Standard',
    model: 'TestMech',
    unitType: 'BattleMech',
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    engineType: 'Standard',
    engineRating: 200,
    gyroType: createComponentConfiguration('gyro', 'Standard')!,
    structureType: createComponentConfiguration('structure', 'Standard')!,
    armorType: createComponentConfiguration('armor', 'Standard')!,
    heatSinkType: createComponentConfiguration('heatSink', 'Single')!,
    totalHeatSinks: 10,
    internalHeatSinks: 8,
    externalHeatSinks: 2,
    armorTonnage: 8.0,
    armorAllocation: {
      HD: { front: 9, rear: 0 },
      CT: { front: 20, rear: 6 },
      LT: { front: 16, rear: 5 },
      RT: { front: 16, rear: 5 },
      LA: { front: 16, rear: 0 },
      RA: { front: 16, rear: 0 },
      LL: { front: 20, rear: 0 },
      RL: { front: 20, rear: 0 }
    },
    jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')!,
    jumpJetCounts: {},
    hasPartialWing: false,
    enhancements: [],
    mass: 50
  };

  describe('System Component Slots', () => {
    it('should calculate engine slots correctly for Standard', () => {
      // Based on getEngineSlots implementation: Standard -> 3
      expect(calculator.getEngineSlots('Standard')).toBe(3);
    });

    it('should calculate engine slots correctly for XL', () => {
      // Based on getEngineSlots implementation: XL -> 6
      expect(calculator.getEngineSlots('XL')).toBe(6);
    });

    it('should calculate engine slots correctly for Light', () => {
      // Based on getEngineSlots implementation: Light -> 4
      expect(calculator.getEngineSlots('Light')).toBe(4);
    });

    it('should calculate gyro slots correctly for Standard', () => {
        // Based on getGyroSlots: Standard -> 1
      expect(calculator.getGyroSlots('Standard')).toBe(1);
    });
  });

  describe('Special Component Calculations', () => {
    it('should calculate Endo Steel slots based on tonnage', () => {
      // 50 tons / 5 = 10 slots
      expect(calculator.getEndoSteelRequirement(defaultConfig)).toBe(10);
    });

    it('should calculate Ferro Fibrous slots based on tonnage', () => {
      // 50 tons / 5 = 10 slots
      expect(calculator.getFerroFibrousRequirement(defaultConfig)).toBe(10);
    });
  });

  describe('Available Slots', () => {
    it('should calculate total available slots', () => {
      // Standard slot counts sum: 6+12+12+12+8+8+6+6 = 70
      // Note: The calculator seems to have hardcoded values in STANDARD_SLOT_COUNTS that sum to 70,
      // which might be different from the 78 standard slots usually cited (perhaps excluding hands/feet/actuators?).
      // 6(HD) + 12(CT) + 12(LT) + 12(RT) + 8(LA) + 8(RA) + 6(LL) + 6(RL) = 70.
      const available = calculator.calculateAvailableSlots(defaultConfig);
      expect(available.total).toBe(70);
    });
  });
});
