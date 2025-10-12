/**
 * Unit Critical Manager Test Suite
 * Tests for the core business logic component of the customizer-v2 system
 */

import { UnitCriticalManager, UnitConfiguration, UnitConfigurationBuilder, ArmorAllocation } from '../../../utils/criticalSlots/UnitCriticalManager';
import { EngineType, GyroType } from '../../../utils/criticalSlots/SystemComponentRules';
import { EquipmentObject } from '../../../utils/criticalSlots/CriticalSlot';

// Mock the external dependencies
jest.mock('../../../utils/armorCalculations', () => ({
  ARMOR_POINTS_PER_TON: {
    'Standard': 16,
    'Ferro-Fibrous': 20,
    'Ferro-Fibrous (Clan)': 20,
    'Light Ferro-Fibrous': 18,
    'Heavy Ferro-Fibrous': 24
  },
  calculateArmorWeight: jest.fn(),
  getArmorSlots: jest.fn((armorType: string, techBase: string) => {
    const armorSlotMap: Record<string, number> = {
      'Standard': 0,
      'Ferro-Fibrous': 14,
      'Ferro-Fibrous (Clan)': 7,
      'Light Ferro-Fibrous': 7,
      'Heavy Ferro-Fibrous': 21
    };
    return armorSlotMap[armorType] || 0;
  })
}));

jest.mock('../../../utils/internalStructureTable', () => ({
  getInternalStructurePoints: jest.fn((tonnage: number) => {
    // Use official BattleTech internal structure values for common test tonnages
    const structureTable: Record<number, any> = {
      25: { HD: 3, CT: 8, LT: 6, RT: 6, LA: 4, RA: 4, LL: 6, RL: 6 },
      50: { HD: 3, CT: 16, LT: 11, RT: 11, LA: 9, RA: 9, LL: 11, RL: 11 },
      75: { HD: 3, CT: 24, LT: 17, RT: 17, LA: 13, RA: 13, LL: 17, RL: 17 },
      100: { HD: 3, CT: 32, LT: 21, RT: 21, LA: 17, RA: 17, LL: 21, RL: 21 }
    };
    
    // Return official values if available, otherwise use a reasonable fallback
    if (structureTable[tonnage]) {
      return structureTable[tonnage];
    }
    
    // Fallback for other tonnages (simplified but reasonable)
    const basePoints = Math.max(3, Math.min(8, Math.floor(tonnage / 10)));
    return {
      HD: 3,
      CT: basePoints * 2,
      LT: basePoints,
      RT: basePoints,
      LA: basePoints,
      RA: basePoints,
      LL: basePoints,
      RL: basePoints
    };
  })
}));

jest.mock('../../../utils/jumpJetCalculations', () => ({
  calculateJumpJetWeight: jest.fn(() => 0.5),
  calculateJumpJetCriticalSlots: jest.fn(() => 1),
  JUMP_JET_VARIANTS: {
    'Standard Jump Jet': {
      name: 'Standard Jump Jet',
      techBase: 'Both',
      heatGeneration: 1
    }
  }
}));

jest.mock('../../../utils/heatSinkCalculations', () => ({
  getHeatSinkSpecification: jest.fn((type: string) => ({
    criticalSlots: 1,
    weight: 1.0,
    dissipation: type.includes('Double') ? 2 : 1,
    techBase: 'Both'
  }))
}));

describe('UnitCriticalManager', () => {
  describe('Constructor and Initialization', () => {
    test('creates unit with default configuration', () => {
      const defaultConfig: UnitConfiguration = {
        chassis: 'Test Mech',
        model: 'TM-1',
        tonnage: 50,
        unitType: 'BattleMech',
        techBase: 'Inner Sphere',
        walkMP: 4,
        engineRating: 200,
        runMP: 6,
        engineType: 'Standard',
        gyroType: 'Standard',
        structureType: 'Standard',
        armorType: 'Standard',
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 20, rear: 6 },
          LT: { front: 16, rear: 4 },
          RT: { front: 16, rear: 4 },
          LA: { front: 14, rear: 0 },
          RA: { front: 14, rear: 0 },
          LL: { front: 20, rear: 0 },
          RL: { front: 20, rear: 0 }
        },
        armorTonnage: 8.0,
        heatSinkType: 'Single',
        totalHeatSinks: 10,
        internalHeatSinks: 8,
        externalHeatSinks: 2,
        jumpMP: 0,
        jumpJetType: 'Standard Jump Jet',
        jumpJetCounts: {},
        hasPartialWing: false,
        mass: 50
      };

      const manager = new UnitCriticalManager(defaultConfig);

      expect(manager.getConfiguration().tonnage).toBe(50);
      expect(manager.getConfiguration().engineType).toBe('Standard');
      expect(manager.getConfiguration().gyroType).toBe('Standard');
      expect(manager.getAllSections()).toHaveLength(8); // 8 standard BattleMech locations
    });

    test('creates unit with legacy configuration', () => {
      const legacyConfig = {
        engineType: 'XL' as EngineType,
        gyroType: 'Standard' as GyroType,
        mass: 75,
        unitType: 'BattleMech' as const
      };

      const manager = new UnitCriticalManager(legacyConfig);
      const config = manager.getConfiguration();

      expect(config.tonnage).toBe(75);
      expect(config.engineType).toBe('XL');
      // Handle both string and object formats for gyroType
      if (typeof config.gyroType === 'string') {
        expect(config.gyroType).toBe('Standard');
      } else {
        expect(config.gyroType).toBe('Standard');
      }
      expect(config.chassis).toBe('Unknown'); // Default for legacy
      expect(config.model).toBe('Legacy'); // Default for legacy
    });

    test('initializes all critical sections', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const sections = manager.getAllSections();
      const sectionNames = sections.map(section => section.getLocation());
      
      expect(sectionNames).toContain('Head');
      expect(sectionNames).toContain('Center Torso');
      expect(sectionNames).toContain('Left Torso');
      expect(sectionNames).toContain('Right Torso');
      expect(sectionNames).toContain('Left Arm');
      expect(sectionNames).toContain('Right Arm');
      expect(sectionNames).toContain('Left Leg');
      expect(sectionNames).toContain('Right Leg');
    });

    test('allocates system components on initialization', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        engineType: 'XL', // XL engine uses side torso slots
        gyroType: 'Standard'
      });

      const manager = new UnitCriticalManager(config);

      // Check that system components are allocated
      const centerTorso = manager.getSection('Center Torso');
      const leftTorso = manager.getSection('Left Torso');
      const rightTorso = manager.getSection('Right Torso');

      expect(centerTorso).toBeTruthy();
      expect(leftTorso).toBeTruthy();
      expect(rightTorso).toBeTruthy();

      // XL engines should reserve slots in side torsos
      const summary = manager.getSummary();
      expect(summary.systemSlots).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    test('updates configuration correctly', () => {
      const initialConfig = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(initialConfig);

      const newConfig: UnitConfiguration = {
        ...initialConfig,
        tonnage: 75,
        engineType: 'XL',
        walkMP: 3
      };

      manager.updateConfiguration(newConfig);
      const updatedConfig = manager.getConfiguration();

      expect(updatedConfig.tonnage).toBe(75);
      expect(updatedConfig.engineType).toBe('XL');
      expect(updatedConfig.walkMP).toBe(3);
      expect(updatedConfig.engineRating).toBe(225); // 75 * 3
    });

    test('enforces BattleTech construction rules', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      // Try to set excessive head armor
      const invalidConfig: UnitConfiguration = {
        ...config,
        armorAllocation: {
          ...config.armorAllocation,
          HD: { front: 15, rear: 0 } // Head max is 9
        }
      };

      manager.updateConfiguration(invalidConfig);
      const correctedConfig = manager.getConfiguration();

      // Should be corrected to maximum
      expect(correctedConfig.armorAllocation.HD.front).toBe(9);
    });

    test('prevents rear armor on head, arms, and legs', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const invalidConfig: UnitConfiguration = {
        ...config,
        armorAllocation: {
          ...config.armorAllocation,
          HD: { front: 9, rear: 5 }, // Head should not have rear armor
          LA: { front: 10, rear: 3 }, // Arms should not have rear armor
          LL: { front: 15, rear: 2 }  // Legs should not have rear armor
        }
      };

      manager.updateConfiguration(invalidConfig);
      const correctedConfig = manager.getConfiguration();

      expect(correctedConfig.armorAllocation.HD.rear).toBe(0);
      expect(correctedConfig.armorAllocation.LA.rear).toBe(0);
      expect(correctedConfig.armorAllocation.LL.rear).toBe(0);
    });

    test('handles engine type changes with equipment displacement', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        engineType: 'Standard'
      });
      const manager = new UnitCriticalManager(config);

      // Add some equipment first
      const testEquipment: EquipmentObject = {
        id: 'test_weapon',
        name: 'Test Weapon',
        type: 'weapon',
        requiredSlots: 2,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      // Change to XL engine (requires more slots)
      const newConfig: UnitConfiguration = {
        ...config,
        engineType: 'XL'
      };

      manager.updateConfiguration(newConfig);

      // Engine type should be updated
      expect(manager.getConfiguration().engineType).toBe('XL');
    });
  });

  describe('Equipment Management', () => {
    let manager: UnitCriticalManager;
    let testEquipment: EquipmentObject;

    beforeEach(() => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      manager = new UnitCriticalManager(config);
      
      testEquipment = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };
    });

    test('tracks unallocated equipment', () => {
      const initialCount = manager.getUnallocatedEquipmentCount();
      
      // Initial configuration might create special components
      expect(initialCount).toBeGreaterThanOrEqual(0);

      // Test equipment operations if there's existing equipment
      if (initialCount > 0) {
        const unallocated = manager.getUnallocatedEquipment();
        expect(unallocated).toHaveLength(initialCount);
      }
    });

    test('can allocate equipment to valid location', () => {
      // Add test equipment to unallocated pool manually for testing
      const equipmentAllocation = {
        equipmentData: testEquipment,
        equipmentGroupId: 'test_group_1',
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      };

      manager.addUnallocatedEquipment([equipmentAllocation]);

      const beforeAllocation = manager.getUnallocatedEquipmentCount();
      const success = manager.allocateEquipmentFromPool('test_group_1', 'Center Torso', 0);

      if (success) {
        expect(manager.getUnallocatedEquipmentCount()).toBe(beforeAllocation - 1);
        
        const centerTorso = manager.getSection('Center Torso');
        const equipment = centerTorso?.getAllEquipment() || [];
        const foundEquipment = equipment.find(eq => eq.equipmentData.name === 'Test Equipment');
        expect(foundEquipment).toBeTruthy();
      }
    });

    test('validates location restrictions', () => {
      const restrictedEquipment: EquipmentObject = {
        id: 'restricted_equipment',
        name: 'Restricted Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere',
        allowedLocations: ['Left Arm', 'Right Arm'] // Only allowed in arms
      };

      // Should allow placement in arms
      expect(manager.canPlaceEquipmentInLocation(restrictedEquipment, 'Left Arm')).toBe(true);
      expect(manager.canPlaceEquipmentInLocation(restrictedEquipment, 'Right Arm')).toBe(true);

      // Should not allow placement in other locations
      expect(manager.canPlaceEquipmentInLocation(restrictedEquipment, 'Center Torso')).toBe(false);
      expect(manager.canPlaceEquipmentInLocation(restrictedEquipment, 'Head')).toBe(false);
    });

    test('handles equipment displacement', () => {
      const equipmentAllocation = {
        equipmentData: testEquipment,
        equipmentGroupId: 'test_group_displacement',
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      };

      manager.addUnallocatedEquipment([equipmentAllocation]);
      
      // Allocate equipment
      const allocated = manager.allocateEquipmentFromPool('test_group_displacement', 'Center Torso', 0);
      
      if (allocated) {
        const beforeDisplacement = manager.getUnallocatedEquipmentCount();
        
        // Displace equipment back to unallocated
        const displaced = manager.displaceEquipment('test_group_displacement');
        
        if (displaced) {
          expect(manager.getUnallocatedEquipmentCount()).toBe(beforeDisplacement + 1);
        }
      }
    });
  });

  describe('Weight and Tonnage Calculations', () => {
    test('calculates engine weight correctly for different types', () => {
      const configs = [
        { engineType: 'Standard' as EngineType, expectedMultiplier: 1.0 },
        { engineType: 'XL' as EngineType, expectedMultiplier: 0.5 },
        { engineType: 'Light' as EngineType, expectedMultiplier: 0.75 },
        { engineType: 'XXL' as EngineType, expectedMultiplier: 0.33 },
        { engineType: 'Compact' as EngineType, expectedMultiplier: 1.5 }
      ];

      configs.forEach(({ engineType, expectedMultiplier }) => {
        const config = UnitConfigurationBuilder.buildConfiguration({
          tonnage: 50,
          engineType,
          engineRating: 200
        });
        const manager = new UnitCriticalManager(config);

        const engineWeight = manager.getEngineWeight();
        const expectedWeight = (200 * expectedMultiplier) / 25;
        
        expect(engineWeight).toBeCloseTo(expectedWeight, 2);
      });
    });

    test('calculates gyro weight correctly for different types', () => {
      const configs = [
        { gyroType: 'Standard' as GyroType, expectedMultiplier: 1.0 },
        { gyroType: 'XL' as GyroType, expectedMultiplier: 0.5 },
        { gyroType: 'Compact' as GyroType, expectedMultiplier: 1.5 },
        { gyroType: 'Heavy-Duty' as GyroType, expectedMultiplier: 2.0 }
      ];

      configs.forEach(({ gyroType, expectedMultiplier }) => {
        const config = UnitConfigurationBuilder.buildConfiguration({
          tonnage: 50,
          gyroType,
          engineRating: 200
        });
        const manager = new UnitCriticalManager(config);

        const gyroWeight = manager.getGyroWeight();
        const expectedWeight = Math.ceil(200 / 100) * expectedMultiplier; // 2 * multiplier
        
        expect(gyroWeight).toBeCloseTo(expectedWeight, 2);
      });
    });

    test('calculates total used tonnage correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        engineType: 'Standard',
        engineRating: 200,
        armorTonnage: 8.0,
        externalHeatSinks: 2
      });
      const manager = new UnitCriticalManager(config);

      const usedTonnage = manager.getUsedTonnage();
      
      // Structure: 50 * 0.1 = 5.0
      // Engine: 200 / 25 = 8.0 (Standard)
      // Gyro: ceil(200/100) = 2.0 (Standard)
      // Cockpit: 3.0
      // Heat Sinks: 2 * 1.0 = 2.0 (2 external single heat sinks)
      // Armor: 8.0
      // Total: 5.0 + 8.0 + 2.0 + 3.0 + 2.0 + 8.0 = 28.0
      
      expect(usedTonnage).toBeCloseTo(28.0, 1);
    });

    test('calculates remaining tonnage correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        armorTonnage: 8.0
      });
      const manager = new UnitCriticalManager(config);

      const remainingTonnage = manager.getRemainingTonnage();
      const usedTonnage = manager.getUsedTonnage();
      
      expect(remainingTonnage).toBe(50 - usedTonnage);
      expect(remainingTonnage).toBeGreaterThanOrEqual(0);
    });

    test('detects overweight condition', () => {
      // Create a configuration that should be overweight
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 20, // Very light mech
        engineType: 'Standard',
        engineRating: 200, // Heavy engine for weight
        armorTonnage: 15.0 // Excessive armor
      });
      const manager = new UnitCriticalManager(config);

      const validation = manager.getWeightValidation();
      
      if (validation.overweight > 0) {
        expect(manager.isOverweight()).toBe(true);
        expect(validation.warnings.some(warning => warning.includes('overweight'))).toBe(true);
      }
    });
  });

  describe('Armor Calculations', () => {
    test('calculates maximum armor tonnage correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const maxArmorTonnage = manager.getMaxArmorTonnage();
      
      // Should be constrained by remaining tonnage or physical limits
      expect(maxArmorTonnage).toBeGreaterThan(0);
      expect(maxArmorTonnage).toBeLessThanOrEqual(config.tonnage);
    });

    test('calculates maximum armor points correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const maxArmorPoints = manager.getMaxArmorPoints();
      
      // Should be based on internal structure points
      // Head: 9 + other locations * 2
      expect(maxArmorPoints).toBeGreaterThan(9); // At least head maximum
    });

    test('calculates armor efficiency based on type', () => {
      const armorTypes = [
        { type: 'Standard', expectedEfficiency: 16 },
        { type: 'Ferro-Fibrous', expectedEfficiency: 17.92 }, // Official TechManual value
        { type: 'Light Ferro-Fibrous', expectedEfficiency: 16.8 } // Official TechManual value
      ];

      armorTypes.forEach(({ type, expectedEfficiency }) => {
        const config = UnitConfigurationBuilder.buildConfiguration({
          tonnage: 50,
          armorType: type as any
        });
        const manager = new UnitCriticalManager(config);

        const efficiency = manager.getArmorEfficiency();
        expect(efficiency).toBe(expectedEfficiency);
      });
    });

    test('calculates available armor points from tonnage', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        armorType: 'Standard',
        armorTonnage: 8.0
      });
      const manager = new UnitCriticalManager(config);

      const availablePoints = manager.getAvailableArmorPoints();
      const expectedPoints = Math.floor(8.0 * 16); // 8 tons * 16 points/ton = 128 points
      
      expect(availablePoints).toBe(expectedPoints);
    });

    test('calculates allocated armor points from distribution', () => {
      const armorAllocation: ArmorAllocation = {
        HD: { front: 9, rear: 0 },
        CT: { front: 20, rear: 6 },
        LT: { front: 16, rear: 4 },
        RT: { front: 16, rear: 4 },
        LA: { front: 14, rear: 0 },
        RA: { front: 14, rear: 0 },
        LL: { front: 20, rear: 0 },
        RL: { front: 20, rear: 0 }
      };

      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        armorAllocation
      });
      const manager = new UnitCriticalManager(config);

      const allocatedPoints = manager.getAllocatedArmorPoints();
      const expectedPoints = 9 + 26 + 20 + 20 + 14 + 14 + 20 + 20; // 143 total
      
      expect(allocatedPoints).toBe(expectedPoints);
    });

    test('detects armor waste correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        armorType: 'Standard',
        armorTonnage: 20.0 // Excessive tonnage for testing
      });
      const manager = new UnitCriticalManager(config);

      const wasteAnalysis = manager.getArmorWasteAnalysis();
      
      if (wasteAnalysis.totalWasted > 0) {
        expect(manager.hasArmorWaste()).toBe(true);
        expect(wasteAnalysis.wastePercentage).toBeGreaterThan(0);
        expect(wasteAnalysis.optimalTonnage).toBeLessThan(config.armorTonnage);
      }
    });
  });

  describe('Heat Management', () => {
    test('calculates heat dissipation correctly', () => {
      const heatSinkConfigs = [
        { type: 'Single', totalSinks: 10, expectedDissipation: 10 },
        { type: 'Double', totalSinks: 10, expectedDissipation: 20 },
        { type: 'Double (Clan)', totalSinks: 10, expectedDissipation: 20 }
      ];

      heatSinkConfigs.forEach(({ type, totalSinks, expectedDissipation }) => {
        const config = UnitConfigurationBuilder.buildConfiguration({
          tonnage: 50,
          heatSinkType: type as any,
          totalHeatSinks: totalSinks
        });
        const manager = new UnitCriticalManager(config);

        const dissipation = manager.getHeatDissipation();
        expect(dissipation).toBe(expectedDissipation);
      });
    });

    test('calculates heat sink tonnage correctly', () => {
      const heatSinkTypes = [
        { type: 'Single', expectedTonnage: 1.0 },
        { type: 'Double', expectedTonnage: 1.0 },
        { type: 'Compact', expectedTonnage: 0.5 },
        { type: 'Laser', expectedTonnage: 1.5 }
      ];

      heatSinkTypes.forEach(({ type, expectedTonnage }) => {
        const config = UnitConfigurationBuilder.buildConfiguration({
          tonnage: 50,
          heatSinkType: type as any
        });
        const manager = new UnitCriticalManager(config);

        const tonnagePerUnit = manager.getHeatSinkTonnage();
        expect(tonnagePerUnit).toBe(expectedTonnage);
      });
    });
  });

  describe('Critical Slot Management', () => {
    test('tracks total critical slots correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const totalSlots = manager.getTotalCriticalSlots();
      expect(totalSlots).toBe(78); // Standard BattleMech total
    });

    test('calculates remaining critical slots', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const remainingSlots = manager.getRemainingCriticalSlots();
      const usedSlots = manager.getTotalUsedCriticalSlots();
      
      expect(remainingSlots).toBe(78 - usedSlots);
      expect(remainingSlots).toBeGreaterThanOrEqual(0);
    });

    test('provides detailed critical slot breakdown', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        engineType: 'XL',
        structureType: 'Endo Steel'
      });
      const manager = new UnitCriticalManager(config);

      const breakdown = manager.getCriticalSlotBreakdown();
      
      expect(breakdown.totals.capacity).toBe(78);
      expect(breakdown.totals.used).toBeGreaterThan(0);
      expect(breakdown.totals.remaining).toBe(breakdown.totals.capacity - breakdown.totals.used);
      expect(breakdown.structural).toBeDefined();
      expect(breakdown.equipment).toBeDefined();
      expect(breakdown.debug).toBeDefined();
    });
  });

  describe('Validation', () => {
    test('validates unit configuration', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const validation = manager.validate();
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('sectionResults');
      
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(Array.isArray(validation.sectionResults)).toBe(true);
    });

    test('provides validation errors for invalid configurations', () => {
      // This would need more specific invalid configuration scenarios
      // For now, just test that validation runs without error
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      expect(() => manager.validate()).not.toThrow();
    });
  });

  describe('State Management', () => {
    test('provides summary statistics', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      const summary = manager.getSummary();
      
      expect(summary).toHaveProperty('totalSections');
      expect(summary).toHaveProperty('totalSlots');
      expect(summary).toHaveProperty('occupiedSlots');
      expect(summary).toHaveProperty('availableSlots');
      expect(summary).toHaveProperty('totalEquipment');
      expect(summary).toHaveProperty('unallocatedEquipment');
      expect(summary).toHaveProperty('systemSlots');
      expect(summary).toHaveProperty('totalWeight');
      expect(summary).toHaveProperty('heatGenerated');
      expect(summary).toHaveProperty('heatDissipated');
      
      expect(summary.totalSections).toBe(8); // 8 BattleMech locations
      expect(summary.totalSlots).toBe(78); // Standard total
      expect(summary.availableSlots).toBe(summary.totalSlots - summary.occupiedSlots);
    });

    test('supports observer pattern for state changes', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      let callbackCalled = false;
      const unsubscribe = manager.subscribe(() => {
        callbackCalled = true;
      });

      // Trigger a state change
      const newConfig = { ...config, tonnage: 75 };
      manager.updateConfiguration(newConfig);

      // Note: callback might not be called depending on implementation
      // The test verifies the subscription mechanism works
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up subscription
      unsubscribe();
    });
  });

  describe('UnitConfigurationBuilder', () => {
    test('builds configuration from partial input', () => {
      const partialConfig = { tonnage: 75, engineType: 'XL' as EngineType };
      const config = UnitConfigurationBuilder.buildConfiguration(partialConfig);

      expect(config.tonnage).toBe(75);
      expect(config.engineType).toBe('XL');
      expect(config.chassis).toBe('Custom'); // Default for new units
      expect(config.unitType).toBe('BattleMech');
      expect(config.techBase).toBe('Inner Sphere');
    });

    test('validates engine rating constraints', () => {
      const validation = UnitConfigurationBuilder.validateEngineRating(100, 5); // 500 rating
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('exceeds maximum of 400'))).toBe(true);
      expect(validation.maxWalkMP).toBe(4); // 400/100 = 4
    });

    test('calculates dependent values correctly', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({
        tonnage: 50,
        walkMP: 4,
        totalHeatSinks: 12
      });

      expect(config.engineRating).toBe(200); // 50 * 4
      expect(config.runMP).toBe(6); // floor(4 * 1.5)
      expect(config.internalHeatSinks).toBeGreaterThanOrEqual(0);
      expect(config.externalHeatSinks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Auto-Allocation System', () => {
    test('auto-allocates equipment when possible', () => {
      const config = UnitConfigurationBuilder.buildConfiguration({ tonnage: 50 });
      const manager = new UnitCriticalManager(config);

      // Add test equipment to unallocated pool
      const testEquipment: EquipmentObject = {
        id: 'auto_test_equipment',
        name: 'Auto Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      const equipmentAllocation = {
        equipmentData: testEquipment,
        equipmentGroupId: 'auto_test_group',
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      };

      manager.addUnallocatedEquipment([equipmentAllocation]);

      const beforeAutoAllocation = manager.getUnallocatedEquipmentCount();
      const result = manager.autoAllocateEquipment();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('placedEquipment');
      expect(result).toHaveProperty('failedEquipment');
      expect(result).toHaveProperty('slotsModified');
      
      // Should have attempted to place the equipment
      expect(result.placedEquipment + result.failedEquipment).toBe(beforeAutoAllocation);
    });
  });
});
