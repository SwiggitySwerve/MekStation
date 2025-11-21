import { UnitCriticalManager } from '../../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../../types/componentConfiguration';

describe('UnitCriticalManager', () => {
  // 1. Basic Initialization
  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config: UnitConfiguration = {
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

      const manager = new UnitCriticalManager(config);
      expect(manager).toBeDefined();
      expect(manager.getConfiguration().tonnage).toBe(50);
      expect(manager.getConfiguration().techBase).toBe('Inner Sphere');
    });
  });

  // 2. updateConfiguration
  describe('updateConfiguration', () => {
    it('should update configuration and reflect changes', () => {
      const config: UnitConfiguration = {
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

      const manager = new UnitCriticalManager(config);
      
      const newConfig = {
        ...config,
        tonnage: 55
      };

      manager.updateConfiguration(newConfig);
      expect(manager.getConfiguration().tonnage).toBe(55);
    });
  });

  // 3. Delegation (checking if sub-managers are likely working via high-level calls)
  describe('Delegation', () => {
    it('should delegate weight calculation correctly', () => {
       const config: UnitConfiguration = {
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
      const manager = new UnitCriticalManager(config);
      // Weight calculation involves multiple components, verification implies managers are wired
      const usedTonnage = manager.getUsedTonnage();
      expect(usedTonnage).toBeGreaterThan(0);
    });
  });
});

