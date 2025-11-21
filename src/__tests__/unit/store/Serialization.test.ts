import { UnitSerializationManager } from '../../../utils/criticalSlots/UnitSerializationManager';
import { UnitCriticalManager } from '../../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../../types/componentConfiguration';

describe('Serialization', () => {
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

  it('should serialize and deserialize state correctly', () => {
    const manager = new UnitCriticalManager(config);
    
    // Serialize
    const serialized = manager.serializeCompleteState();
    expect(serialized).toBeDefined();
    expect(serialized.configuration.tonnage).toBe(50);

    // Deserialize into new manager
    const newManager = new UnitCriticalManager(config); // Initial config doesn't matter if we overwrite
    newManager.deserializeCompleteState(serialized);

    expect(newManager.getConfiguration().tonnage).toBe(50);
    // Ensure deep equality of critical parts
    expect(newManager.getConfiguration().techBase).toBe(manager.getConfiguration().techBase);
  });

  it('should handle equipment persistence', () => {
    // This test verifies that equipment added to the unit is preserved through serialization
    const manager = new UnitCriticalManager(config);
    
    // getUnallocatedEquipment returns an array of EquipmentAllocation.
    // EquipmentAllocation interface likely has 'equipment' property which is of type Equipment (containing equipmentData) or directly equipmentData.
    // Let's check the structure based on the error or assume it's just the allocation object itself if getUnallocatedEquipment returns allocated items directly.
    
    // Based on previous error: Cannot read properties of undefined (reading 'equipmentData') on e.equipment
    // This implies `e` does not have an `equipment` property, OR `e` is the equipment object itself but we are accessing it wrong.
    
    // Let's look at what getUnallocatedEquipment returns. It likely returns EquipmentAllocation[]
    // interface EquipmentAllocation {
    //   equipment: Equipment; // or similar
    //   ...
    // }
    // Wait, the debug log showed:
    // [{"equipmentData":{...}, "equipmentGroupId":...}, ...]
    // So the object returned IS the allocation, and it has `equipmentData` directly on it, NOT inside an `equipment` property.
    
    const heatSinks = manager.getUnallocatedEquipment().filter(e => e.equipmentData && e.equipmentData.name.includes('Heat Sink'));
    expect(heatSinks.length).toBeGreaterThan(0);

    const serialized = manager.serializeCompleteState();
    
    const newManager = new UnitCriticalManager(config);
    newManager.deserializeCompleteState(serialized);

    const restoredHeatSinks = newManager.getUnallocatedEquipment().filter(e => e.equipmentData && e.equipmentData.name.includes('Heat Sink'));
    expect(restoredHeatSinks.length).toBe(heatSinks.length);
  });
});
