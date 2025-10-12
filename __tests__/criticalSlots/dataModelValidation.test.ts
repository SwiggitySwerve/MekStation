import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../types/componentConfiguration';

describe('Data Model Validation - Endo Steel and Ferro-Fibrous', () => {
  
  it('should validate that the data model correctly handles ComponentConfiguration objects', () => {
    console.log('[DATA_MODEL_TEST] === TESTING COMPONENT CONFIGURATION DATA MODEL ===');
    
    // Test 1: Create ComponentConfiguration objects (like UI would)
    const structureConfig = createComponentConfiguration('structure', 'Endo Steel');
    const armorConfig = createComponentConfiguration('armor', 'Ferro-Fibrous');
    
    console.log('[DATA_MODEL_TEST] Structure config:', {
      type: structureConfig?,
      techBase: structureConfig?.techBase
    });
    
    console.log('[DATA_MODEL_TEST] Armor config:', {
      type: armorConfig?,
      techBase: armorConfig?.techBase
    });
    
    expect(structureConfig).toBeDefined();
    expect(armorConfig).toBeDefined();
    expect(structureConfig?).toBe('Endo Steel');
    expect(armorConfig?).toBe('Ferro-Fibrous');
    
    // Test 2: Create full unit configuration with ComponentConfiguration objects
    const unitConfig: UnitConfiguration = {
      chassis: 'TestMech',
      model: 'TM-1',
      tonnage: 100,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 3,
      engineRating: 300,
      runMP: 5,
      engineType: 'Standard',
      jumpMP: 0,
      jumpJetType: 'createComponentConfiguration('jumpJet', 'Standard Jump Jet')!',
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard',
      structureType: structureConfig!,
      armorType: armorConfig!,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 20, rear: 8 },
        RT: { front: 20, rear: 8 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 6 },
        RL: { front: 20, rear: 6 },
      },
      armorTonnage: 19,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      enhancements: [],
      mass: 100,
    };
    
    console.log('[DATA_MODEL_TEST] Full unit config structure/armor types:', {
      structureType: unitConfig.structureType?,
      armorType: unitConfig.armorType?
    });
    
    // Test 3: Create UnitCriticalManager and verify it receives the config correctly
    const manager = new UnitCriticalManager(unitConfig);
    const managerConfig = manager.getConfiguration();
    
    console.log('[DATA_MODEL_TEST] Manager received config:', {
      structureType: managerConfig.structureType?,
      armorType: managerConfig.armorType?
    });
    
    expect(managerConfig.structureType?).toBe('Endo Steel');
    expect(managerConfig.armorType?).toBe('Ferro-Fibrous');
    
    // Test 4: Check unallocated equipment
    const unallocated = manager.getUnallocatedEquipment();
    const endoSteelCount = unallocated.filter(eq => eq.equipmentData.id === 'endo_steel').length;
    const ferroFibrousCount = unallocated.filter(eq => eq.equipmentData.id === 'ferro_fibrous').length;
    
    console.log('[DATA_MODEL_TEST] Unallocated equipment counts:', {
      total: unallocated.length,
      endoSteel: endoSteelCount,
      ferroFibrous: ferroFibrousCount
    });
    
    expect(endoSteelCount).toBe(14);
    expect(ferroFibrousCount).toBe(14);
    
    console.log('[DATA_MODEL_TEST] === COMPONENT CONFIGURATION TEST PASSED ===');
  });
  
  it('should validate legacy string-based configuration still works', () => {
    console.log('[DATA_MODEL_TEST] === TESTING LEGACY STRING CONFIGURATION ===');
    
    // Test legacy configuration (old format)
    const legacyConfig: UnitConfiguration = {
      chassis: 'TestMech',
      model: 'TM-1',
      tonnage: 100,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 3,
      engineRating: 300,
      runMP: 5,
      engineType: 'Standard',
      jumpMP: 0,
      jumpJetType: 'createComponentConfiguration('jumpJet', 'Standard Jump Jet')!',
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard',
      structureType: 'Endo Steel',
      armorType: 'Ferro-Fibrous',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 20, rear: 8 },
        RT: { front: 20, rear: 8 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 6 },
        RL: { front: 20, rear: 6 },
      },
      armorTonnage: 19,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      enhancements: [],
      mass: 100,
      // Legacy fields
      legacyStructureType: 'Endo Steel',
      legacyArmorType: 'Ferro-Fibrous'
    };
    
    console.log('[DATA_MODEL_TEST] Legacy config with both new and legacy fields');
    
    const manager = new UnitCriticalManager(legacyConfig);
    const unallocated = manager.getUnallocatedEquipment();
    const endoSteelCount = unallocated.filter(eq => eq.equipmentData.id === 'endo_steel').length;
    const ferroFibrousCount = unallocated.filter(eq => eq.equipmentData.id === 'ferro_fibrous').length;
    
    console.log('[DATA_MODEL_TEST] Legacy config results:', {
      total: unallocated.length,
      endoSteel: endoSteelCount,
      ferroFibrous: ferroFibrousCount
    });
    
    expect(endoSteelCount).toBe(14);
    expect(ferroFibrousCount).toBe(14);
    
    console.log('[DATA_MODEL_TEST] === LEGACY CONFIGURATION TEST PASSED ===');
  });
  
  it('should validate configuration changes trigger special component updates', () => {
    console.log('[DATA_MODEL_TEST] === TESTING CONFIGURATION CHANGE TRIGGERS ===');
    
    // Start with standard configuration
    const standardConfig: UnitConfiguration = {
      chassis: 'TestMech',
      model: 'TM-1',
      tonnage: 100,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 3,
      engineRating: 300,
      runMP: 5,
      engineType: 'Standard',
      jumpMP: 0,
      jumpJetType: 'createComponentConfiguration('jumpJet', 'Standard Jump Jet')!',
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 20, rear: 8 },
        RT: { front: 20, rear: 8 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 6 },
        RL: { front: 20, rear: 6 },
      },
      armorTonnage: 19,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      enhancements: [],
      mass: 100,
    };
    
    const manager = new UnitCriticalManager(standardConfig);
    
    console.log('[DATA_MODEL_TEST] Initial config (Standard/Standard):', {
      structureType: manager.getConfiguration().structureType?,
      armorType: manager.getConfiguration().armorType?,
      unallocatedCount: manager.getUnallocatedEquipment().length
    });
    
    // Change to Endo Steel and Ferro-Fibrous
    const updatedConfig: UnitConfiguration = {
      ...standardConfig,
      structureType: 'Endo Steel',
      armorType: 'Ferro-Fibrous'
    };
    
    console.log('[DATA_MODEL_TEST] Updating configuration to Endo Steel/Ferro-Fibrous');
    manager.updateConfiguration(updatedConfig);
    
    const finalConfig = manager.getConfiguration();
    const finalUnallocated = manager.getUnallocatedEquipment();
    const endoSteelCount = finalUnallocated.filter(eq => eq.equipmentData.id === 'endo_steel').length;
    const ferroFibrousCount = finalUnallocated.filter(eq => eq.equipmentData.id === 'ferro_fibrous').length;
    
    console.log('[DATA_MODEL_TEST] After configuration update:', {
      structureType: finalConfig.structureType?,
      armorType: finalConfig.armorType?,
      totalUnallocated: finalUnallocated.length,
      endoSteel: endoSteelCount,
      ferroFibrous: ferroFibrousCount
    });
    
    expect(finalConfig.structureType?).toBe('Endo Steel');
    expect(finalConfig.armorType?).toBe('Ferro-Fibrous');
    expect(endoSteelCount).toBe(14);
    expect(ferroFibrousCount).toBe(14);
    
    console.log('[DATA_MODEL_TEST] === CONFIGURATION CHANGE TEST PASSED ===');
  });
  
  it('should validate that the data model handles edge cases correctly', () => {
    console.log('[DATA_MODEL_TEST] === TESTING EDGE CASES ===');
    
    // Test with undefined/null component configurations
    const edgeCaseConfig: UnitConfiguration = {
      chassis: 'TestMech',
      model: 'TM-1',
      tonnage: 100,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 3,
      engineRating: 300,
      runMP: 5,
      engineType: 'Standard',
      jumpMP: 0,
      jumpJetType: 'createComponentConfiguration('jumpJet', 'Standard Jump Jet')!',
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard',
      structureType: 'Endo Steel',
      armorType: 'Ferro-Fibrous',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 20, rear: 8 },
        RT: { front: 20, rear: 8 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 6 },
        RL: { front: 20, rear: 6 },
      },
      armorTonnage: 19,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      enhancements: [],
      mass: 100,
    };
    
    console.log('[DATA_MODEL_TEST] Testing edge case configuration');
    
    const manager = new UnitCriticalManager(edgeCaseConfig);
    const unallocated = manager.getUnallocatedEquipment();
    
    console.log('[DATA_MODEL_TEST] Edge case results:', {
      totalUnallocated: unallocated.length,
      hasEndoSteel: unallocated.some(eq => eq.equipmentData.id === 'endo_steel'),
      hasFerroFibrous: unallocated.some(eq => eq.equipmentData.id === 'ferro_fibrous')
    });
    
    expect(unallocated.some(eq => eq.equipmentData.id === 'endo_steel')).toBe(true);
    expect(unallocated.some(eq => eq.equipmentData.id === 'ferro_fibrous')).toBe(true);
    
    console.log('[DATA_MODEL_TEST] === EDGE CASE TEST PASSED ===');
  });
}); 