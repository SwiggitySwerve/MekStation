import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../types/componentConfiguration';

// Test configuration with Endo Steel and Ferro-Fibrous
const testConfig: UnitConfiguration = {
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

describe('Special Component Tracing - Endo Steel and Ferro-Fibrous', () => {
  it('should trace the complete flow of special component creation and allocation', () => {
    console.log('[TRACE_TEST] === STARTING SPECIAL COMPONENT TRACE ===');
    
    // Step 1: Create the unit manager
    console.log('[TRACE_TEST] Step 1: Creating UnitCriticalManager with Endo Steel and Ferro-Fibrous config');
    const manager = new UnitCriticalManager(testConfig);
    
    // Step 2: Check initial unallocated equipment
    console.log('[TRACE_TEST] Step 2: Checking initial unallocated equipment');
    const initialUnallocated = manager.getUnallocatedEquipment();
    console.log(`[TRACE_TEST] Initial unallocated count: ${initialUnallocated.length}`);
    
    // Step 3: Analyze what's in the unallocated pool
    console.log('[TRACE_TEST] Step 3: Analyzing unallocated equipment contents');
    const endoSteelItems = initialUnallocated.filter(eq => 
      eq.equipmentData.id === 'endo_steel' || 
      eq.equipmentData.name.includes('Endo Steel')
    );
    const ferroFibrousItems = initialUnallocated.filter(eq => 
      eq.equipmentData.id === 'ferro_fibrous' || 
      eq.equipmentData.name.includes('Ferro-Fibrous')
    );
    
    console.log(`[TRACE_TEST] Endo Steel items found: ${endoSteelItems.length}`);
    console.log(`[TRACE_TEST] Ferro-Fibrous items found: ${ferroFibrousItems.length}`);
    
    // Step 4: Check unit configuration
    console.log('[TRACE_TEST] Step 4: Verifying unit configuration');
    const config = manager.getConfiguration();
    console.log(`[TRACE_TEST] Structure type: ${config.structureType?}`);
    console.log(`[TRACE_TEST] Armor type: ${config.armorType?}`);
    
    // Step 5: Check if special components are being created but immediately allocated
    console.log('[TRACE_TEST] Step 5: Checking if components are allocated to slots');
    const allSections = manager.getAllSections();
    let allocatedEndoSteel = 0;
    let allocatedFerroFibrous = 0;
    
    for (const section of allSections) {
      const slots = section.getAllSlots();
      for (const slot of slots) {
        if (slot.hasEquipment() && slot.content?.equipmentReference) {
          const equipment = slot.content.equipmentReference;
          if (equipment.equipmentData.id === 'endo_steel' || 
              equipment.equipmentData.name.includes('Endo Steel')) {
            allocatedEndoSteel++;
            console.log(`[TRACE_TEST] Found allocated Endo Steel in ${section.location} slot ${slot.slotIndex}`);
          }
          if (equipment.equipmentData.id === 'ferro_fibrous' || 
              equipment.equipmentData.name.includes('Ferro-Fibrous')) {
            allocatedFerroFibrous++;
            console.log(`[TRACE_TEST] Found allocated Ferro-Fibrous in ${section.location} slot ${slot.slotIndex}`);
          }
        }
      }
    }
    
    console.log(`[TRACE_TEST] Allocated Endo Steel: ${allocatedEndoSteel}`);
    console.log(`[TRACE_TEST] Allocated Ferro-Fibrous: ${allocatedFerroFibrous}`);
    
    // Step 6: Check total counts
    const totalEndoSteel = endoSteelItems.length + allocatedEndoSteel;
    const totalFerroFibrous = ferroFibrousItems.length + allocatedFerroFibrous;
    
    console.log(`[TRACE_TEST] Total Endo Steel (unallocated + allocated): ${totalEndoSteel}`);
    console.log(`[TRACE_TEST] Total Ferro-Fibrous (unallocated + allocated): ${totalFerroFibrous}`);
    
    // Step 7: Verify expected slot counts
    console.log('[TRACE_TEST] Step 7: Verifying expected slot counts');
    // For a 100-ton mech, Endo Steel should require 14 slots, Ferro-Fibrous should require 14 slots
    const expectedEndoSteelSlots = 14;
    const expectedFerroFibrousSlots = 14;
    
    console.log(`[TRACE_TEST] Expected Endo Steel slots: ${expectedEndoSteelSlots}`);
    console.log(`[TRACE_TEST] Expected Ferro-Fibrous slots: ${expectedFerroFibrousSlots}`);
    
    // Assertions
    expect(totalEndoSteel).toBe(expectedEndoSteelSlots);
    expect(totalFerroFibrous).toBe(expectedFerroFibrousSlots);
    
    // Step 8: Verify unallocated pool has some items
    expect(endoSteelItems.length).toBeGreaterThan(0);
    expect(ferroFibrousItems.length).toBeGreaterThan(0);
    
    console.log('[TRACE_TEST] === SPECIAL COMPONENT TRACE COMPLETED ===');
  });
  
  it('should verify that special components are properly categorized in unallocated pool', () => {
    console.log('[TRACE_TEST] === TESTING UNALLOCATED POOL CATEGORIZATION ===');
    
    const manager = new UnitCriticalManager(testConfig);
    const unallocated = manager.getUnallocatedEquipment();
    
    // Check that Endo Steel and Ferro-Fibrous are in the unallocated pool
    const endoSteelInPool = unallocated.filter(eq => 
      eq.equipmentData.id === 'endo_steel'
    );
    const ferroFibrousInPool = unallocated.filter(eq => 
      eq.equipmentData.id === 'ferro_fibrous'
    );
    
    console.log(`[TRACE_TEST] Endo Steel in unallocated pool: ${endoSteelInPool.length}`);
    console.log(`[TRACE_TEST] Ferro-Fibrous in unallocated pool: ${ferroFibrousInPool.length}`);
    
    // Verify they have the correct properties
    if (endoSteelInPool.length > 0) {
      const sampleEndo = endoSteelInPool[0];
      console.log(`[TRACE_TEST] Sample Endo Steel:`, {
        id: sampleEndo.equipmentData.id,
        name: sampleEndo.equipmentData.name,
        componentType: (sampleEndo.equipmentData as any).componentType,
        instanceId: (sampleEndo.equipmentData as any).instanceId
      });
      
      expect(sampleEndo.equipmentData.id).toBe('endo_steel');
      expect(sampleEndo.equipmentData.name).toBe('Endo Steel Structure');
      expect((sampleEndo.equipmentData as any).componentType).toBe('structure');
    }
    
    if (ferroFibrousInPool.length > 0) {
      const sampleFerro = ferroFibrousInPool[0];
      console.log(`[TRACE_TEST] Sample Ferro-Fibrous:`, {
        id: sampleFerro.equipmentData.id,
        name: sampleFerro.equipmentData.name,
        componentType: (sampleFerro.equipmentData as any).componentType,
        instanceId: (sampleFerro.equipmentData as any).instanceId
      });
      
      expect(sampleFerro.equipmentData.id).toBe('ferro_fibrous');
      expect(sampleFerro.equipmentData.name).toBe('Ferro-Fibrous Armor');
      expect((sampleFerro.equipmentData as any).componentType).toBe('armor');
    }
    
    console.log('[TRACE_TEST] === CATEGORIZATION TEST COMPLETED ===');
  });
}); 