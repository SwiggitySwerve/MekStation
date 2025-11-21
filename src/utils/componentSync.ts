/**
 * Component Synchronization Service
 * Handles synchronization between system components and critical slots
 */

import { EditableUnit, MECH_LOCATIONS } from '../types/editor';
import { CriticalSlotLocation } from '../types/index';
import {
  SystemComponents,
  EngineType,
  GyroType,
  CockpitType,
  StructureType,
  ArmorType,
  HeatSinkType,
  calculateIntegratedHeatSinks,
  calculateExternalHeatSinks,
} from '../types/systemComponents';
import { STRUCTURE_SLOT_REQUIREMENTS } from '../types/systemComponents';
import { ARMOR_SLOT_REQUIREMENTS } from './armorCalculations';
import {
  initializeCriticalSlots,
  generateHeatSinkItems,
  validateComponentPlacement,
} from './componentRules';
import {
  getEngineSlots,
  getGyroSlots,
  smartUpdateSlots,
  updateDisplacedEquipment,
  SlotRange,
} from './smartSlotUpdate';

/**
 * Initialize system components from existing unit data
 */
export function initializeSystemComponents(unit: EditableUnit): SystemComponents {
  const data = unit.data || {};
  
  // Map old engine types to new ones
  let engineType: EngineType = 'Standard';
  if (data.engine?.type) {
    const oldType = data.engine.type;
    if (oldType === 'Fusion' || oldType === 'Standard') {
      engineType = 'Standard';
    } else if (oldType === 'XL' || oldType === 'XL Engine') {
      engineType = 'XL (IS)'; // Default to Inner Sphere
    } else if (oldType === 'Light' || oldType === 'Light Engine') {
      engineType = 'Light';
    } else if (oldType === 'XXL' || oldType === 'XXL Engine') {
      engineType = 'XXL';
    } else if (oldType === 'Compact' || oldType === 'Compact Engine') {
      engineType = 'Compact';
    } else {
      engineType = oldType as EngineType;
    }
  }
  
  return {
    engine: {
      type: engineType,
      rating: data.engine?.rating || 300,
      manufacturer: data.engine?.manufacturer,
    },
    gyro: {
      type: (unit.data?.gyro?.type || 'Standard') as GyroType,
    },
    cockpit: {
      type: 'Standard', // Default, can be expanded later
    },
    structure: {
      type: (unit.data?.structure?.type || 'Standard') as StructureType,
    },
    armor: {
      type: (unit.data?.armor?.type || 'Standard') as ArmorType,
    },
    heatSinks: {
      type: (unit.data?.heat_sinks?.type || 'Single') as HeatSinkType,
      total: unit.data?.heat_sinks?.count || 10,
      engineIntegrated: calculateIntegratedHeatSinks(data.engine?.rating || 300),
      externalRequired: calculateExternalHeatSinks(
        unit.data?.heat_sinks?.count || 10,
        data.engine?.rating || 300
      ),
    },
  };
}

/**
 * Sync critical slots when engine changes
 */
export function syncEngineChange(
  unit: EditableUnit,
  newEngineType: EngineType,
  newRating?: number
): Partial<EditableUnit> {
  // Initialize system components if not present
  const systemComponents = unit.systemComponents || initializeSystemComponents(unit);
  
  // Get current critical allocations (or initialize if not present)
  let criticalAllocations = unit.criticalAllocations;
  if (!criticalAllocations) {
    criticalAllocations = initializeCriticalSlots(systemComponents, unit.mass);
  }
  
  // Update engine in system components
  const updatedComponents: SystemComponents = {
    ...systemComponents,
    engine: {
      type: newEngineType,
      rating: newRating || systemComponents.engine.rating,
    },
  };
  
  // Recalculate heat sinks
  const engineRating = newRating || systemComponents.engine.rating;
  updatedComponents.heatSinks = {
    ...systemComponents.heatSinks,
    engineIntegrated: calculateIntegratedHeatSinks(engineRating),
    externalRequired: calculateExternalHeatSinks(
      systemComponents.heatSinks.total,
      engineRating
    ),
  };
  
  // Get old and new engine slot requirements (pass gyro type for XL gyro handling)
  const oldEngineSlots = getEngineSlots(systemComponents.engine.type, systemComponents.gyro.type);
  const newEngineSlots = getEngineSlots(newEngineType, systemComponents.gyro.type);
  
  // Smart update - only displace equipment in conflicting slots
  let { updatedAllocations, displacedEquipment } = smartUpdateSlots(
    criticalAllocations,
    oldEngineSlots,
    newEngineSlots,
    'Engine'
  );
  
  // After engine update, ensure gyro is placed correctly
  // First, find and clear any existing gyro slots (they might be in the wrong place)
  const oldGyroSlots: SlotRange[] = [];
  Object.entries(updatedAllocations).forEach(([location, slots]) => {
    slots.forEach((slot, index) => {
      if (slot.name === 'Gyro') {
        // Track where the gyro currently is
        if (oldGyroSlots.length === 0 || oldGyroSlots[oldGyroSlots.length - 1].location !== location) {
          oldGyroSlots.push({
            location,
            startIndex: index,
            endIndex: index
          });
        } else {
          // Extend the range
          oldGyroSlots[oldGyroSlots.length - 1].endIndex = index;
        }
      }
    });
  });
  
  // Now place the gyro in its correct position
  const newGyroSlots = getGyroSlots(systemComponents.gyro.type);
  const gyroResult = smartUpdateSlots(
    updatedAllocations,
    oldGyroSlots, // Clear old gyro positions
    newGyroSlots, // Place in new positions
    'Gyro'
  );
  
  updatedAllocations = gyroResult.updatedAllocations;
  displacedEquipment = [...displacedEquipment, ...gyroResult.displacedEquipment];
  
  // Update equipment locations for displaced items
  const updatedEquipment = updateDisplacedEquipment(
    unit.data?.weapons_and_equipment || [],
    displacedEquipment
  );
  
  // Convert to legacy criticals format
  const criticals = convertToLegacyCriticals(updatedAllocations);
  
  return {
    systemComponents: updatedComponents,
    criticalAllocations: updatedAllocations,
    data: {
      ...unit.data,
      engine: {
        type: newEngineType,
        rating: engineRating,
      },
      criticals,
      weapons_and_equipment: updatedEquipment,
    },
  };
}

/**
 * Sync critical slots when gyro changes
 */
export function syncGyroChange(
  unit: EditableUnit,
  newGyroType: GyroType
): Partial<EditableUnit> {
  const systemComponents = unit.systemComponents || initializeSystemComponents(unit);
  
  // XL Gyro is incompatible with standard engine layouts
  // See ../docs/battletech/battletech_critical_slots.md for details
  if (newGyroType === 'XL') {
    const engineType = systemComponents.engine.type;
    // Standard, ICE, Fuel Cell, and Compact engines use the split CT layout (0-2, 7-9)
    // which conflicts with XL gyro (3-8)
    if (engineType === 'Standard' || engineType === 'ICE' || engineType === 'Fuel Cell' || engineType === 'Compact') {
      console.warn('XL Gyro is incompatible with this engine type. XL Gyro requires slots 3-8 which conflicts with engine slots at 7-9.');
      return {}; // Return unchanged
    }
    // XL, Light, and XXL engines are compatible because they use side torso slots
  }
  
  // Get current critical allocations (or initialize if not present)
  let criticalAllocations = unit.criticalAllocations;
  if (!criticalAllocations) {
    criticalAllocations = initializeCriticalSlots(systemComponents, unit.mass);
  }
  
  const updatedComponents: SystemComponents = {
    ...systemComponents,
    gyro: {
      type: newGyroType,
    },
  };
  
  // Get old and new gyro slot requirements
  const oldGyroSlots = getGyroSlots(systemComponents.gyro.type);
  const newGyroSlots = getGyroSlots(newGyroType);
  
  // Smart update - only displace equipment in conflicting slots
  let { updatedAllocations, displacedEquipment } = smartUpdateSlots(
    criticalAllocations,
    oldGyroSlots,
    newGyroSlots,
    'Gyro'
  );
  
  // If we're changing to XL gyro with a compatible engine, we need to re-place the engine
  if (newGyroType === 'XL' && 
      (String(systemComponents.engine.type).includes('XL') || 
       systemComponents.engine.type === 'Light' || 
       systemComponents.engine.type === 'XXL')) {
    
    // Find current engine slots
    const oldEngineSlots: SlotRange[] = [];
    Object.entries(updatedAllocations).forEach(([location, slots]) => {
      slots.forEach((slot, index) => {
        if (slot.name === 'Engine') {
          // Track where the engine currently is
          if (oldEngineSlots.length === 0 || oldEngineSlots[oldEngineSlots.length - 1].location !== location ||
              oldEngineSlots[oldEngineSlots.length - 1].endIndex < index - 1) {
            oldEngineSlots.push({
              location,
              startIndex: index,
              endIndex: index
            });
          } else {
            // Extend the range
            oldEngineSlots[oldEngineSlots.length - 1].endIndex = index;
          }
        }
      });
    });
    
    // Get new engine slots with XL gyro layout
    const newEngineSlots = getEngineSlots(systemComponents.engine.type, newGyroType);
    
    // Re-place the engine
    const engineResult = smartUpdateSlots(
      updatedAllocations,
      oldEngineSlots,
      newEngineSlots,
      'Engine'
    );
    
    updatedAllocations = engineResult.updatedAllocations;
    displacedEquipment = [...displacedEquipment, ...engineResult.displacedEquipment];
  }
  
  // Update equipment locations for displaced items
  const updatedEquipment = updateDisplacedEquipment(
    unit.data?.weapons_and_equipment || [],
    displacedEquipment
  );
  
  // Convert to legacy criticals format
  const criticals = convertToLegacyCriticals(updatedAllocations);
  
  return {
    systemComponents: updatedComponents,
    criticalAllocations: updatedAllocations,
    data: {
      ...unit.data,
      gyro: {
        type: newGyroType,
      },
      criticals,
      weapons_and_equipment: updatedEquipment,
    },
  };
}

/**
 * Sync critical slots when structure changes
 */
export function syncStructureChange(
  unit: EditableUnit,
  newStructureType: StructureType
): Partial<EditableUnit> {
  const systemComponents = unit.systemComponents || initializeSystemComponents(unit);
  
  const updatedComponents: SystemComponents = {
    ...systemComponents,
    structure: {
      type: newStructureType,
    },
  };
  
  // Don't reinitialize critical slots - preserve existing equipment
  // Just update the equipment list
  let updatedEquipment = unit.data?.weapons_and_equipment || [];
  
  // Remove old structure items
  updatedEquipment = updatedEquipment.filter(eq => 
    !eq.item_name.includes('Endo Steel') && 
    !eq.item_name.includes('Composite') &&
    !eq.item_name.includes('Reinforced')
  );
  
  // Add new structure items if needed
  const slotsRequired = STRUCTURE_SLOT_REQUIREMENTS[newStructureType] || 0;
  for (let i = 0; i < slotsRequired; i++) {
    updatedEquipment.push({
      item_name: newStructureType,
      item_type: 'equipment' as const,
      location: '', // Unallocated
      tech_base: unit.tech_base as 'IS' | 'Clan',
      tons: 0, // Structure weight is calculated separately
      crits: 1,
    });
  }
  
  return {
    systemComponents: updatedComponents,
    // Don't update criticalAllocations - preserve existing
    data: {
      ...unit.data,
      structure: {
        type: newStructureType,
      },
      // Don't update criticals - preserve existing equipment placements
      weapons_and_equipment: updatedEquipment,
    },
  };
}

/**
 * Sync critical slots when armor changes
 */
export function syncArmorChange(
  unit: EditableUnit,
  newArmorType: ArmorType
): Partial<EditableUnit> {
  const systemComponents = unit.systemComponents || initializeSystemComponents(unit);
  
  const updatedComponents: SystemComponents = {
    ...systemComponents,
    armor: {
      type: newArmorType,
    },
  };
  
  // Don't reinitialize critical slots - preserve existing equipment
  // Just update the equipment list
  let updatedEquipment = unit.data?.weapons_and_equipment || [];
  
  // Remove old armor items
  updatedEquipment = updatedEquipment.filter(eq => 
    !eq.item_name.includes('Ferro-Fibrous') && 
    !eq.item_name.includes('Stealth') &&
    !eq.item_name.includes('Reactive') &&
    !eq.item_name.includes('Reflective') &&
    !eq.item_name.includes('Hardened')
  );
  
  // Add new armor items if needed
  const armorReq = ARMOR_SLOT_REQUIREMENTS[newArmorType];
  const slotsRequired = armorReq?.slots || 0;
  
  for (let i = 0; i < slotsRequired; i++) {
    updatedEquipment.push({
      item_name: newArmorType,
      item_type: 'equipment' as const,
      location: '', // Unallocated
      tech_base: unit.tech_base as 'IS' | 'Clan',
      tons: 0, // Armor weight is calculated separately
      crits: 1,
    });
  }
  
  return {
    systemComponents: updatedComponents,
    // Don't update criticalAllocations - preserve existing
    data: {
      ...unit.data,
      armor: {
        ...unit.data?.armor,
        type: newArmorType,
        locations: unit.data?.armor?.locations || [],
      },
      // Don't update criticals - preserve existing equipment placements
      weapons_and_equipment: updatedEquipment,
    },
  };
}

/**
 * Sync heat sinks and generate external heat sink items
 */
export function syncHeatSinkChange(
  unit: EditableUnit,
  newType: HeatSinkType,
  newCount: number
): Partial<EditableUnit> {
  const systemComponents = unit.systemComponents || initializeSystemComponents(unit);
  const engineRating = systemComponents.engine.rating;
  
  const updatedComponents: SystemComponents = {
    ...systemComponents,
    heatSinks: {
      type: newType,
      total: newCount,
      engineIntegrated: calculateIntegratedHeatSinks(engineRating),
      externalRequired: calculateExternalHeatSinks(newCount, engineRating),
    },
  };
  
  // Generate external heat sink items
  const heatSinkItems = generateHeatSinkItems(newType, newCount, engineRating);
  
  // Remove existing heat sinks from weapons_and_equipment
  const filteredEquipment = (unit.data?.weapons_and_equipment || []).filter(
    item => !item.item_name.includes('Heat Sink')
  );
  
  // Add new heat sink items as unallocated equipment
  const newEquipment = [
    ...filteredEquipment,
    ...heatSinkItems.map(hs => ({
      item_name: hs.name,
      item_type: 'equipment' as const,
      location: '', // Unallocated
      tech_base: unit.tech_base as 'IS' | 'Clan',
    })),
  ];
  
  return {
    systemComponents: updatedComponents,
    data: {
      ...unit.data,
      heat_sinks: {
        type: newType,
        count: newCount,
      },
      weapons_and_equipment: newEquipment,
    },
  };
}

/**
 * Convert critical allocations to legacy criticals format
 */
function convertToLegacyCriticals(
  criticalAllocations: Record<string, Array<{ name?: string; type?: string }>>
): CriticalSlotLocation[] {
  return Object.entries(criticalAllocations).map(([location, slots]) => ({
    location,
    slots: slots.map(slot => slot.name || '-Empty-'),
  }));
}

/**
 * Find equipment that was displaced by component changes
 */
function findDisplacedEquipment(
  unit: EditableUnit,
  newCriticals: CriticalSlotLocation[]
): string[] {
  const displaced: string[] = [];
  
  // Compare old and new criticals
  unit.data?.criticals?.forEach(oldLocation => {
    const newLocation = newCriticals.find(loc => loc.location === oldLocation.location);
    if (!newLocation) return;
    
    oldLocation.slots.forEach((oldSlot, index) => {
      const oldSlotName = typeof oldSlot === 'string' ? oldSlot : 
                         (oldSlot && typeof oldSlot === 'object' && oldSlot.name) ? oldSlot.name : '-Empty-';
      const newSlot = newLocation.slots[index];
      const newSlotName = typeof newSlot === 'string' ? newSlot :
                         (newSlot && typeof newSlot === 'object' && newSlot.name) ? newSlot.name : '-Empty-';
      
      if (oldSlotName !== '-Empty-' && 
          !isSystemComponent(oldSlot) &&
          newSlotName !== oldSlotName) {
        displaced.push(oldSlotName);
      }
    });
  });
  
  return displaced;
}

/**
 * Check if a slot content is a system component
 */
function isSystemComponent(content: string | { name?: string; type?: string } | null | undefined): boolean {
  // Handle both string and object formats
  let slotName: string;
  
  if (typeof content === 'string') {
    slotName = content;
  } else if (content && typeof content === 'object' && content.name) {
    slotName = content.name;
  } else {
    return false;
  }
  
  const systemComponents = [
    'Engine', 'Gyro', 'Cockpit', 'Life Support', 'Sensors',
    'Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator',
    'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator',
  ];
  
  return systemComponents.some(comp => slotName.includes(comp));
}

/**
 * Validate system component changes
 */
export function validateComponentChange(
  unit: EditableUnit,
  componentType: 'engine' | 'gyro' | 'structure',
  newValue: { rating?: number; type?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check weight limits
  if (componentType === 'engine') {
    const maxRating = unit.mass * 400 / 100; // Max engine rating formula
    if (newValue.rating > maxRating) {
      errors.push(`Engine rating ${newValue.rating} exceeds maximum of ${maxRating} for ${unit.mass}-ton mech`);
    }
  }
  
  // Check tech level compatibility
  // TODO: Add tech level validation
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Handle equipment placement in critical slots
 */
export function placeEquipmentInCriticals(
  unit: EditableUnit,
  equipmentName: string,
  location: string,
  startSlot: number
): Partial<EditableUnit> {
  const criticals = [...(unit.data?.criticals || [])];
  const locationIndex = criticals.findIndex(c => c.location === location);
  
  if (locationIndex === -1) {
    throw new Error(`Location ${location} not found`);
  }
  
  // Find equipment details
  const equipment = unit.data?.weapons_and_equipment?.find(
    w => w.item_name === equipmentName && !w.location
  );
  
  if (!equipment) {
    throw new Error(`Unallocated equipment ${equipmentName} not found`);
  }
  
  // Update equipment location
  const updatedEquipment = unit.data?.weapons_and_equipment?.map(eq => 
    eq === equipment ? { ...eq, location } : eq
  ) || [];
  
  // TODO: Update critical slots based on equipment size
  // For now, just update the data
  
  return {
    data: {
      ...unit.data,
      weapons_and_equipment: updatedEquipment,
    },
  };
}
