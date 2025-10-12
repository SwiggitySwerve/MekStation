import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../types/componentConfiguration';

// Test configuration starting with Standard structure and armor
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

describe('Special Component Duplication Test', () => {
  it('should demonstrate the duplication issue when changing to Endo Steel and Ferro-Fibrous', () => {
    console.log('[DUPLICATION_TEST] === STARTING DUPLICATION TEST ===');
    
    // Step 1: Create unit with Standard structure and armor
    console.log('[DUPLICATION_TEST] Step 1: Creating unit with Standard structure and armor');
    const manager = new UnitCriticalManager(standardConfig);
    
    const initialUnallocated = manager.getUnallocatedEquipment();
    console.log(`[DUPLICATION_TEST] Initial unallocated count: ${initialUnallocated.length}`);
    
    // Step 2: Change to Endo Steel and Ferro-Fibrous
    console.log('[DUPLICATION_TEST] Step 2: Changing to Endo Steel and Ferro-Fibrous');
    const endoFerroConfig: UnitConfiguration = {
      ...standardConfig,
      structureType: 'Endo Steel',
      armorType: 'Ferro-Fibrous'
    };
    
    manager.updateConfiguration(endoFerroConfig);
    
    const afterChangeUnallocated = manager.getUnallocatedEquipment();
    console.log(`[DUPLICATION_TEST] After change unallocated count: ${afterChangeUnallocated.length}`);
    
    // Step 3: Count the components
    const endoSteelItems = afterChangeUnallocated.filter(eq => 
      eq.equipmentData.id === 'endo_steel' || 
      eq.equipmentData.name.includes('Endo Steel')
    );
    const ferroFibrousItems = afterChangeUnallocated.filter(eq => 
      eq.equipmentData.id === 'ferro_fibrous' || 
      eq.equipmentData.name.includes('Ferro-Fibrous')
    );
    
    console.log(`[DUPLICATION_TEST] Endo Steel items: ${endoSteelItems.length}`);
    console.log(`[DUPLICATION_TEST] Ferro-Fibrous items: ${ferroFibrousItems.length}`);
    
    // Step 4: Change back to Standard
    console.log('[DUPLICATION_TEST] Step 4: Changing back to Standard');
    manager.updateConfiguration(standardConfig);
    
    const afterRevertUnallocated = manager.getUnallocatedEquipment();
    console.log(`[DUPLICATION_TEST] After revert unallocated count: ${afterRevertUnallocated.length}`);
    
    // Step 5: Change to Endo Steel and Ferro-Fibrous again
    console.log('[DUPLICATION_TEST] Step 5: Changing to Endo Steel and Ferro-Fibrous again');
    manager.updateConfiguration(endoFerroConfig);
    
    const finalUnallocated = manager.getUnallocatedEquipment();
    console.log(`[DUPLICATION_TEST] Final unallocated count: ${finalUnallocated.length}`);
    
    const finalEndoSteelItems = finalUnallocated.filter(eq => 
      eq.equipmentData.id === 'endo_steel' || 
      eq.equipmentData.name.includes('Endo Steel')
    );
    const finalFerroFibrousItems = finalUnallocated.filter(eq => 
      eq.equipmentData.id === 'ferro_fibrous' || 
      eq.equipmentData.name.includes('Ferro-Fibrous')
    );
    
    console.log(`[DUPLICATION_TEST] Final Endo Steel items: ${finalEndoSteelItems.length}`);
    console.log(`[DUPLICATION_TEST] Final Ferro-Fibrous items: ${finalFerroFibrousItems.length}`);
    
    // Expected: Should have exactly 14 of each, not more
    const expectedEndoSteel = 14;
    const expectedFerroFibrous = 14;
    
    console.log(`[DUPLICATION_TEST] Expected Endo Steel: ${expectedEndoSteel}`);
    console.log(`[DUPLICATION_TEST] Expected Ferro-Fibrous: ${expectedFerroFibrous}`);
    
    // This is where the duplication issue would be revealed
    expect(finalEndoSteelItems.length).toBe(expectedEndoSteel);
    expect(finalFerroFibrousItems.length).toBe(expectedFerroFibrous);
    
    console.log('[DUPLICATION_TEST] === DUPLICATION TEST COMPLETED ===');
  });
}); 

describe('Special Component Creation Test', () => {
  it('should create only Endo Steel components when only Endo Steel is selected', () => {
    const endoConfig: UnitConfiguration = {
      ...standardConfig,
      structureType: 'Endo Steel',
      armorType: 'Standard'
    };
    const manager = new UnitCriticalManager(endoConfig);
    const unallocated = manager.getUnallocatedEquipment();
    const endoSteelItems = unallocated.filter(eq => eq.equipmentData.id === 'endo_steel' || eq.equipmentData.name.includes('Endo Steel'));
    const ferroFibrousItems = unallocated.filter(eq => eq.equipmentData.id === 'ferro_fibrous' || eq.equipmentData.name.includes('Ferro-Fibrous'));
    expect(endoSteelItems.length).toBe(14);
    expect(ferroFibrousItems.length).toBe(0);
  });

  it('should create only Ferro-Fibrous components when only Ferro-Fibrous is selected', () => {
    const ferroConfig: UnitConfiguration = {
      ...standardConfig,
      structureType: 'Standard',
      armorType: 'Ferro-Fibrous'
    };
    const manager = new UnitCriticalManager(ferroConfig);
    const unallocated = manager.getUnallocatedEquipment();
    const endoSteelItems = unallocated.filter(eq => eq.equipmentData.id === 'endo_steel' || eq.equipmentData.name.includes('Endo Steel'));
    const ferroFibrousItems = unallocated.filter(eq => eq.equipmentData.id === 'ferro_fibrous' || eq.equipmentData.name.includes('Ferro-Fibrous'));
    expect(endoSteelItems.length).toBe(0);
    expect(ferroFibrousItems.length).toBe(14);
  });
}); 