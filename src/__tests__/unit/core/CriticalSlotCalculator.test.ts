import { CriticalSlotCalculatorImpl } from '../../../utils/criticalSlots/CriticalSlotCalculator';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../../types/componentConfiguration';
import { EquipmentAllocation } from '../../../utils/criticalSlots/CriticalSlot';

describe('CriticalSlotCalculator', () => {
  const calculator = new CriticalSlotCalculatorImpl();

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

  describe('System Slot Calculation', () => {
    it('should calculate correct slots for standard engine', () => {
      const slots = calculator.getEngineSlots('Standard');
      // 6 slots for standard fusion engine
      expect(slots).toBe(6);
    });

    it('should calculate correct slots for XL engine', () => {
      const slots = calculator.getEngineSlots('XL');
      // 12 slots for XL engine (6 CT + 3 LT + 3 RT)
      expect(slots).toBe(12);
    });

    it('should calculate correct slots for Light engine', () => {
      const slots = calculator.getEngineSlots('Light');
      // 10 slots for Light engine (4 CT + 3 LT + 3 RT)
      expect(slots).toBe(10);
    });

    it('should calculate correct slots for Compact engine', () => {
      const slots = calculator.getEngineSlots('Compact');
      // 3 slots for Compact engine
      expect(slots).toBe(3);
    });

    it('should calculate correct slots for standard gyro', () => {
      const slots = calculator.getGyroSlots('Standard');
      expect(slots).toBe(4);
    });

    it('should calculate correct slots for XL gyro', () => {
      const slots = calculator.getGyroSlots('XL');
      expect(slots).toBe(6);
    });
  });

  describe('Endo Steel Calculation', () => {
    it('should require 14 slots for IS Endo Steel', () => {
      const config = { ...defaultConfig, structureType: createComponentConfiguration('structure', 'Endo Steel', 'Inner Sphere')! };
      const req = calculator.getEndoSteelRequirement(config);
      expect(req).toBe(14);
    });

    it('should require 7 slots for Clan Endo Steel', () => {
      const config = { ...defaultConfig, structureType: createComponentConfiguration('structure', 'Endo Steel (Clan)', 'Clan')! };
      const req = calculator.getEndoSteelRequirement(config);
      expect(req).toBe(7);
    });

    it('should require 0 slots for Standard structure', () => {
      const config = { ...defaultConfig, structureType: createComponentConfiguration('structure', 'Standard', 'Inner Sphere')! };
      const req = calculator.getEndoSteelRequirement(config);
      expect(req).toBe(0);
    });
  });

  describe('Ferro-Fibrous Calculation', () => {
    it('should require 14 slots for IS Ferro-Fibrous', () => {
      const config = { ...defaultConfig, armorType: createComponentConfiguration('armor', 'Ferro-Fibrous', 'Inner Sphere')! };
      const req = calculator.getFerroFibrousRequirement(config);
      expect(req).toBe(14);
    });

    it('should require 7 slots for Clan Ferro-Fibrous', () => {
      const config = { ...defaultConfig, armorType: createComponentConfiguration('armor', 'Ferro-Fibrous (Clan)', 'Clan')! };
      const req = calculator.getFerroFibrousRequirement(config);
      expect(req).toBe(7);
    });
  });

  describe('Total Available Slots', () => {
    it('should calculate available slots correctly', () => {
        // This tests calculateAvailableSlots which returns total slots available for allocation
        // after accounting for engine, gyro, fixed components (cockpit, life support, sensors, actuators)
        const available = calculator.calculateAvailableSlots(defaultConfig);
        
        // Total slots: 78 (standard mech)
        // Fixed slots: 17 (Head: 1 cockpit, 2 life support, 2 sensors = 5; Arms: 2x(Shoulder+Upper+Lower+Hand) = 8; Legs: 2x(Hip+Upper+Lower+Foot) = 8 -> Wait, Arms are 4 each, Legs are 4 each = 16 + 5 = 21. But Legs have 2 actuators each? No, Hip, Upper, Lower, Foot = 4.
        // Standard:
        // Head: 6 slots total. Fixed: Life Support(2), Sensors(2), Cockpit(1) = 5. Available: 1.
        // CT: 12 slots. Engine(6), Gyro(4) = 10. Available: 2.
        // LT: 12 slots. Available: 12.
        // RT: 12 slots. Available: 12.
        // LA: 12 slots. Shoulder, Upper, Lower, Hand = 4. Available: 8.
        // RA: 12 slots. Shoulder, Upper, Lower, Hand = 4. Available: 8.
        // LL: 6 slots. Hip, Upper, Lower, Foot = 4. Available: 2.
        // RL: 6 slots. Hip, Upper, Lower, Foot = 4. Available: 2.
        // Total Available = 1 + 2 + 12 + 12 + 8 + 8 + 2 + 2 = 47.
        
        expect(available.total).toBe(47);
    });
  });
});
