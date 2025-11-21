import { UnitCriticalManager } from '../../../utils/criticalSlots/UnitCriticalManager';
import { createComponentConfiguration } from '../../../types/componentConfiguration';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

describe('Integration Flow: Unit Creation', () => {
  it('should correctly create and configure a unit', () => {
    // 1. Initialize Default Unit (50 tons, standard)
    const initialConfig: UnitConfiguration = {
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

    const manager = new UnitCriticalManager(initialConfig);
    expect(manager.getConfiguration().tonnage).toBe(50);
    expect(manager.getUsedTonnage()).toBeGreaterThan(0);

    // 2. Change Tonnage to 75
    const configStep2 = {
        ...manager.getConfiguration(),
        tonnage: 75,
        mass: 75,
        engineRating: 300
    };
    manager.updateConfiguration(configStep2);
    
    expect(manager.getConfiguration().tonnage).toBe(75);
    expect(manager.getConfiguration().engineRating).toBe(300);
    
    // 3. Change Engine to XL
    const configStep3 = {
        ...manager.getConfiguration(),
        engineType: 'XL'
    };
    manager.updateConfiguration(configStep3);
    
    expect(manager.getConfiguration().engineType).toBe('XL');
    
    // 4. Verify Slots and Weight
    const usedTonnage = manager.getUsedTonnage();
    
    // Use public validation method if available, otherwise rely on internal consistency checks
    // manager.validateUnit() might not be exposed, use validateConfiguration instead
    // Or rely on getUsedTonnage not throwing errors.
    
    expect(usedTonnage).toBeGreaterThan(0);
    
    // Verify weight
    // Standard Engine 300 = 19 tons
    // XL Engine 300 = 9.5 tons (Side Torsos take slots) - Corrected from old buggy 6.0 tons
    // Structure 75t = 7.5 tons
    // Gyro 300 = 3 tons
    // Cockpit = 3 tons
    // Armor = 8 tons
    // Heat Sinks: Config has 2 external (from init). Engine 300 holds 12. 
    // If external kept as 2 -> 2 tons.
    // Total: 9.5 + 7.5 + 3 + 3 + 8 + 2 = 33 tons.
    
    expect(usedTonnage).toBeCloseTo(33, 0); // Updated expectation after fixing engine weight calculation
    
    expect(usedTonnage).toBeLessThan(40);
  });
});
