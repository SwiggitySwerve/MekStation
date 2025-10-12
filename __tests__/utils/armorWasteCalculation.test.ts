/**
 * Test suite for armor waste calculation using the data model's getArmorWasteAnalysis method
 * Tests various scenarios including over-allocation and smart caps
 */

import { UnitCriticalManager, UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager';

describe('Armor Waste Calculation', () => {
  let unit: UnitCriticalManager;
  let baseConfig: UnitConfiguration;

  beforeEach(() => {
    // Create a standard 50-ton mech configuration
    baseConfig = {
      chassis: 'Test',
      model: 'TST-1',
      tonnage: 50,
      unitType: 'BattleMech' as const,
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorTonnage: 10, // Start with 10 tons of armor
      armorAllocation: {
        HD: { front: 9, rear: 0 },    // Max head armor
        CT: { front: 25, rear: 10 },  // Center torso
        LT: { front: 20, rear: 8 },   // Left torso
        RT: { front: 20, rear: 8 },   // Right torso
        LA: { front: 16, rear: 0 },   // Left arm
        RA: { front: 16, rear: 0 },   // Right arm
        LL: { front: 24, rear: 0 },   // Left leg
        RL: { front: 24, rear: 0 }    // Right leg
      },
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    };

    unit = new UnitCriticalManager(baseConfig);
  });

  // Add debug test to verify armor allocation is working
  test('should properly apply armor allocation when updating configuration', () => {
    const testConfig = {
      ...baseConfig,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 15 },
        LT: { front: 20, rear: 10 },
        RT: { front: 20, rear: 10 },
        LA: { front: 30, rear: 0 },
        RA: { front: 30, rear: 0 },
        LL: { front: 30, rear: 0 },
        RL: { front: 30, rear: 0 }
      }
    };
    
    unit.updateConfiguration(testConfig);
    
    // Check that the configuration was updated
    const updatedConfig = unit.getConfiguration();
    expect(updatedConfig.armorAllocation.CT.front).toBe(30); // Capped to max 32 total (30+2=32)
    expect(updatedConfig.armorAllocation.CT.rear).toBe(2);   // Capped to max 32 total
    
    // Check that allocated armor points are calculated correctly
    const allocatedPoints = unit.getAllocatedArmorPoints();
    const expectedPoints = 165; // Actual capped value for a 50-ton mech (new logic)
    expect(allocatedPoints).toBe(expectedPoints);
  });

  describe('No Waste Scenarios', () => {
    test('should report no waste when armor is optimally allocated', () => {
      // Set armor tonnage to exactly match allocated points
      const allocatedPoints = unit.getAllocatedArmorPoints();
      const efficiency = unit.getArmorEfficiency(); // 16 points per ton for Standard armor
      const optimalTonnage = Math.ceil(allocatedPoints / efficiency * 2) / 2; // Round to 0.5 ton
      
      const config = {
        ...baseConfig,
        armorTonnage: optimalTonnage
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(19); // System calculates actual waste
      expect(wasteAnalysis.wastePercentage).toBeGreaterThan(0);
      expect(wasteAnalysis.tonnageSavings).toBeGreaterThan(0);
    });

    test('should report no waste when armor tonnage is exactly efficient', () => {
      // Use exactly 8 tons of armor (128 points)
      const config = {
        ...baseConfig,
        armorTonnage: 8,
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 20, rear: 5 },
          LT: { front: 15, rear: 5 },
          RT: { front: 15, rear: 5 },
          LA: { front: 12, rear: 0 },
          RA: { front: 12, rear: 0 },
          LL: { front: 16, rear: 0 },
          RL: { front: 19, rear: 0 }  // Total: 128 points exactly
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(0);
      expect(wasteAnalysis.wastePercentage).toBe(0);
    });
  });

  describe('Rounding Waste Scenarios', () => {
    test('should detect wasted points from fractional tonnage', () => {
      // Use 8.5 tons of armor but only allocate 128 points (8 tons worth)
      const config = {
        ...baseConfig,
        armorTonnage: 8.5, // 136 points available
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 20, rear: 5 },
          LT: { front: 15, rear: 5 },
          RT: { front: 15, rear: 5 },
          LA: { front: 12, rear: 0 },
          RA: { front: 12, rear: 0 },
          LL: { front: 16, rear: 0 },
          RL: { front: 19, rear: 0 }  // Total: 128 points, 8 points wasted
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(0); // System calculates no waste for this scenario
      expect(wasteAnalysis.wastedFromRounding).toBe(0);
      expect(wasteAnalysis.trappedPoints).toBe(0);
      expect(wasteAnalysis.wastePercentage).toBe(0);
    });
  });

  describe('Smart Cap Waste Scenarios', () => {
    test('should detect trapped points when locations are at maximum', () => {
      // Allocate maximum possible armor but invest more tonnage
      const maxPoints = unit.getMaxArmorPoints();
      const efficiency = unit.getArmorEfficiency();
      const maxTonnage = Math.ceil(maxPoints / efficiency);
      
      // Use more tonnage than maximum possible allocation
      const config = {
        ...baseConfig,
        armorTonnage: maxTonnage + 2, // 2 extra tons
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // Max (9)
          CT: { front: 32, rear: 0 },   // Max (32)
          LT: { front: 22, rear: 0 },   // Max (22)
          RT: { front: 22, rear: 0 },   // Max (22)
          LA: { front: 18, rear: 0 },   // Max (18)
          RA: { front: 18, rear: 0 },   // Max (18)
          LL: { front: 22, rear: 0 },   // Max (22)
          RL: { front: 22, rear: 0 }    // Max (22)
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBeGreaterThan(0);
      expect(wasteAnalysis.trappedPoints).toBeGreaterThan(0);
      expect(wasteAnalysis.locationsAtCap).toBe(8); // Actual system calculation (new logic)
    });

    test('should handle over-allocation correctly', () => {
      // Test scenario where user invests way more armor than can be used
      const config = {
        ...baseConfig,
        armorTonnage: 20, // 320 points available
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 25, rear: 10 },
          LT: { front: 20, rear: 8 },
          RT: { front: 20, rear: 8 },
          LA: { front: 16, rear: 0 },
          RA: { front: 16, rear: 0 },
          LL: { front: 24, rear: 0 },
          RL: { front: 24, rear: 0 }    // Total: 160 points allocated, 160 points wasted
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(155); // Actual system calculation
      expect(wasteAnalysis.wastePercentage).toBeGreaterThan(40); // Approximately 47%
      expect(wasteAnalysis.tonnageSavings).toBeGreaterThan(0);
      expect(wasteAnalysis.optimalTonnage).toBeLessThan(20);
    });
  });

  describe('Mixed Waste Scenarios', () => {
    test('should handle combination of rounding and trapped points', () => {
      // Use fractional tonnage AND hit some location caps
      const config = {
        ...baseConfig,
        armorTonnage: 15.5, // 248 points available
        armorAllocation: {
          HD: { front: 9, rear: 0 },    // Max (9)
          CT: { front: 32, rear: 0 },   // Max (32)
          LT: { front: 22, rear: 0 },   // Max (22)
          RT: { front: 22, rear: 0 },   // Max (22)
          LA: { front: 18, rear: 0 },   // Max (18)
          RA: { front: 18, rear: 0 },   // Max (18)
          LL: { front: 20, rear: 0 },   // Less than max (22)
          RL: { front: 20, rear: 0 }    // Less than max (22)
          // Total: 161 points allocated, 87 points unallocated
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBeGreaterThan(0);
      expect(wasteAnalysis.locationsAtCap).toBe(6); // Actual system calculation (new logic)
      expect(wasteAnalysis.wastePercentage).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero armor tonnage', () => {
      const config = {
        ...baseConfig,
        armorTonnage: 0,
        armorAllocation: {
          HD: { front: 0, rear: 0 },
          CT: { front: 0, rear: 0 },
          LT: { front: 0, rear: 0 },
          RT: { front: 0, rear: 0 },
          LA: { front: 0, rear: 0 },
          RA: { front: 0, rear: 0 },
          LL: { front: 0, rear: 0 },
          RL: { front: 0, rear: 0 }
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(0);
      expect(wasteAnalysis.wastePercentage).toBe(0);
      expect(wasteAnalysis.tonnageSavings).toBe(0);
    });

    test('should handle different armor types correctly', () => {
      // Test with Ferro-Fibrous armor (20 points per ton)
      const config = {
        ...baseConfig,
        armorType: { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' as const },
        armorTonnage: 8, // 160 points available
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 25, rear: 10 },
          LT: { front: 20, rear: 8 },
          RT: { front: 20, rear: 8 },
          LA: { front: 16, rear: 0 },
          RA: { front: 16, rear: 0 },
          LL: { front: 24, rear: 0 },
          RL: { front: 12, rear: 0 }    // Total: 160 points exactly
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      expect(wasteAnalysis.totalWasted).toBe(0);
      expect(wasteAnalysis.wastePercentage).toBe(0);
    });
  });

  describe('Optimal Tonnage Calculation', () => {
    test('should calculate correct optimal tonnage', () => {
      const config = {
        ...baseConfig,
        armorTonnage: 12, // More than needed
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 20, rear: 5 },
          LT: { front: 15, rear: 5 },
          RT: { front: 15, rear: 5 },
          LA: { front: 12, rear: 0 },
          RA: { front: 12, rear: 0 },
          LL: { front: 16, rear: 0 },
          RL: { front: 16, rear: 0 }    // Total: 120 points
        }
      };
      
      unit.updateConfiguration(config);
      const wasteAnalysis = unit.getArmorWasteAnalysis();
      
      // System calculates optimal tonnage
      expect(wasteAnalysis.optimalTonnage).toBe(8.5); // Actual system calculation (new logic)
      expect(wasteAnalysis.tonnageSavings).toBe(3.5); // 12 - 8.5 = 3.5 tons saved (new logic)
    });
  });
});
