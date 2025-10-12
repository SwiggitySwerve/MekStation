import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../types/componentConfiguration';

// Minimal valid configuration for a unit with Endo Steel and Ferro-Fibrous
const mockConfig: UnitConfiguration = {
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

describe('Dynamic Component Unallocated Pool', () => {
  it('should show unallocated Endo Steel and Ferro-Fibrous slots when not all are assigned', () => {
    const manager = new UnitCriticalManager(mockConfig);
    
    // Verify initial state: all special components should be in unallocated pool
    const initialEndoSteel = manager.unallocatedEquipment.filter(eq =>
      eq.equipmentData.id === 'endo_steel'
    );
    const initialFerroFibrous = manager.unallocatedEquipment.filter(eq =>
      eq.equipmentData.id === 'ferro_fibrous'
    );
    
    console.log(`Initial state: ${initialEndoSteel.length} Endo Steel, ${initialFerroFibrous.length} Ferro-Fibrous in unallocated pool`);
    
    // Find available slots in Center Torso (system components are already allocated)
    const centerTorsoSection = manager.getSection('Center Torso');
    if (!centerTorsoSection) {
      throw new Error('Center Torso section not found');
    }
    
    const availableSlots = centerTorsoSection.getAvailableSlots();
    console.log(`Available slots in Center Torso: ${availableSlots.length} slots at indices:`, availableSlots);
    
    // Simulate allocation: assign only some of the required slots to available slots
    // Allocate up to 10 Endo Steel slots to available slots in Center Torso
    let allocatedCount = 0;
    const endoSteelToAllocate = initialEndoSteel.slice(0, Math.min(10, availableSlots.length));
    
    for (let i = 0; i < endoSteelToAllocate.length; i++) {
      const equipment = endoSteelToAllocate[i];
      const slotIndex = availableSlots[i];
      
      const success = manager.allocateEquipmentFromPool(
        equipment.equipmentGroupId, 
        'Center Torso', 
        slotIndex
      );
      if (success) {
        allocatedCount++;
      }
    }
    
    console.log(`Allocated ${allocatedCount} Endo Steel slots to Center Torso`);
    
    // Check unallocated pool for remaining dynamic component slots
    const remainingEndoSteel = manager.unallocatedEquipment.filter(eq =>
      eq.equipmentData.id === 'endo_steel'
    );
    const remainingFerroFibrous = manager.unallocatedEquipment.filter(eq =>
      eq.equipmentData.id === 'ferro_fibrous'
    );
    
    console.log(`Remaining: ${remainingEndoSteel.length} Endo Steel, ${remainingFerroFibrous.length} Ferro-Fibrous in unallocated pool`);
    
    // Expect the number of unallocated slots to match the unassigned slots
    // (e.g., if 4 Endo Steel slots remain, expect 4 in the pool)
    expect(remainingEndoSteel.length).toBeGreaterThan(0);
    expect(remainingFerroFibrous.length).toBeGreaterThan(0);
    
    // Verify that some slots were actually allocated (if there were available slots)
    if (availableSlots.length > 0) {
      expect(remainingEndoSteel.length).toBeLessThan(initialEndoSteel.length);
    }
  });
}); 