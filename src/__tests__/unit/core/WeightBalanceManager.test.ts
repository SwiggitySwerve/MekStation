import { WeightBalanceManager } from '../../../utils/criticalSlots/WeightBalanceManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../../types/componentConfiguration';

// Mock the internal structure table requirement
jest.mock('../../../utils/internalStructureTable', () => ({
  getMaxArmorPoints: (tonnage: number) => {
    if (tonnage === 50) return 169;
    return 0;
  },
  getInternalStructurePoints: (tonnage: number) => {
    if (tonnage === 50) {
      return {
        HD: 3,
        CT: 16,
        LT: 12,
        RT: 12,
        LA: 8,
        RA: 8,
        LL: 12,
        RL: 12
      };
    }
    return {};
  }
}));

describe('WeightBalanceManager', () => {
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

  const manager = new WeightBalanceManager(defaultConfig, []);

  describe('Max Armor Calculations', () => {
    it('should calculate max armor tonnage', () => {
      const maxTonnage = manager.getMaxArmorTonnage();
      // 169 / 16 = 10.5625
      expect(maxTonnage).toBeCloseTo(10.5625);
    });

    it('should calculate max armor points', () => {
      const maxPoints = manager.getMaxArmorPoints();
      expect(maxPoints).toBe(169);
    });
  });

  describe('Internal Structure', () => {
    it('should return correct internal structure points', () => {
      const points = manager.getInternalStructurePoints();
      expect(points.HD).toBe(3);
      expect(points.CT).toBe(16);
      expect(points.LT).toBe(12);
      expect(points.RT).toBe(12);
      expect(points.LA).toBe(8);
      expect(points.RA).toBe(8);
      expect(points.LL).toBe(12);
      expect(points.RL).toBe(12);
    });
  });
});
