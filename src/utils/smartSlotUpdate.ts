/**
 * Smart Slot Update Utilities
 * Handles intelligent displacement of equipment when system components change
 */

import { CriticalSlot, CriticalAllocationMap, EngineType, GyroType } from '../types/systemComponents';
import { MECH_LOCATIONS } from '../types/editor';
import { WeaponOrEquipmentItem } from '../types';

export interface SlotRange {
  location: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Get the exact slots occupied by an engine type
 * @param engineType The type of engine
 * @param gyroType Optional gyro type to handle XL gyro special case
 */
export function getEngineSlots(engineType: EngineType, gyroType?: GyroType): SlotRange[] {
  const slots: SlotRange[] = [];
  
  // All engines take 6 slots in CT
  // Check if we have an XL gyro which requires special engine placement
  const hasXLGyro = gyroType === 'XL';
  const canUseSpecialLayout = hasXLGyro &&
    (String(engineType).includes('XL') || engineType === 'Light' || engineType === 'XXL');
  
  if (canUseSpecialLayout) {
    // Special layout for XL/Light/XXL engines with XL gyro
    // Engine uses slots 0-2 and 9-11 to avoid XL gyro at 3-8
    slots.push({
      location: MECH_LOCATIONS.CENTER_TORSO,
      startIndex: 0,
      endIndex: 2
    });
    
    slots.push({
      location: MECH_LOCATIONS.CENTER_TORSO,
      startIndex: 9,
      endIndex: 11
    });
  } else {
    // Standard layout: slots 0-2 and 7-9
    slots.push({
      location: MECH_LOCATIONS.CENTER_TORSO,
      startIndex: 0,
      endIndex: 2
    });
    
    slots.push({
      location: MECH_LOCATIONS.CENTER_TORSO,
      startIndex: 7,
      endIndex: 9
    });
  }
  
  // XL, Light, and XXL engines also take side torso slots
  if (String(engineType).includes('XL') || engineType === 'Light' || engineType === 'XXL') {
    // XL/XXL: 3 slots in each side torso
    // Light: 2 slots in each side torso
    const sideSlots = engineType === 'Light' ? 2 : 3;
    
    slots.push({
      location: MECH_LOCATIONS.LEFT_TORSO,
      startIndex: 0,
      endIndex: sideSlots - 1
    });
    
    slots.push({
      location: MECH_LOCATIONS.RIGHT_TORSO,
      startIndex: 0,
      endIndex: sideSlots - 1
    });
  }
  
  return slots;
}

/**
 * Get the exact slots occupied by a gyro type
 * Gyro occupies slots 3-6 in Center Torso
 */
export function getGyroSlots(gyroType: GyroType): SlotRange[] {
  let gyroSlots = 4; // Default standard gyro
  
  switch (gyroType) {
    case 'Compact':
      gyroSlots = 2;
      break;
    case 'XL':
      gyroSlots = 6;
      break;
    case 'Heavy-Duty':
      gyroSlots = 4;
      break;
  }
  
  return [{
    location: MECH_LOCATIONS.CENTER_TORSO,
    startIndex: 3,
    endIndex: 3 + gyroSlots - 1 // This gives us exactly gyroSlots number of slots
  }];
}

/**
 * Smart update of critical slots when a component changes
 * Only displaces equipment that would conflict with the new component
 */
export function smartUpdateSlots(
  currentAllocations: CriticalAllocationMap,
  oldSlots: SlotRange[],
  newSlots: SlotRange[],
  componentName: string
): {
  updatedAllocations: CriticalAllocationMap;
  displacedEquipment: string[];
} {
  const updatedAllocations = JSON.parse(JSON.stringify(currentAllocations)) as CriticalAllocationMap;
  const displacedEquipment: string[] = [];
  
  // Step 1: Clear old component slots that are NOT in the new slots
  // This preserves slots that are used by both old and new configurations
  oldSlots.forEach(oldRange => {
    const locationSlots = updatedAllocations[oldRange.location];
    if (!locationSlots) return;
    
    for (let i = oldRange.startIndex; i <= oldRange.endIndex && i < locationSlots.length; i++) {
      const slot = locationSlots[i];
      
      // Check if this slot is also needed in the new configuration
      const isNeededInNew = newSlots.some(newRange => 
        newRange.location === oldRange.location &&
        i >= newRange.startIndex &&
        i <= newRange.endIndex
      );
      
      // Only clear if not needed in new configuration
      if (!isNeededInNew && (slot.name === componentName)) {
        locationSlots[i] = {
          index: i,
          name: '-Empty-',
          type: 'empty',
          isFixed: false,
          isManuallyPlaced: false
        };
      }
    }
  });
  
  // Step 2: Place new component, only displacing equipment in the way
  newSlots.forEach(range => {
    const locationSlots = updatedAllocations[range.location];
    if (!locationSlots) return;
    
    for (let i = range.startIndex; i <= range.endIndex && i < locationSlots.length; i++) {
      const currentSlot = locationSlots[i];
      
      // Only displace if there's equipment in this slot (not already the component)
      if (currentSlot.name !== '-Empty-' && 
          currentSlot.type !== 'empty' && 
          currentSlot.name !== componentName) {
        
        const itemName = currentSlot.name;
        
        // Check if this is part of a multi-slot item
        if (currentSlot.linkedSlots && currentSlot.linkedSlots.length > 0) {
          // This is a multi-slot item, clear all linked slots
          currentSlot.linkedSlots.forEach(linkedIndex => {
            if (locationSlots[linkedIndex]) {
              locationSlots[linkedIndex] = {
                index: linkedIndex,
                name: '-Empty-',
                type: 'empty',
                isFixed: false,
                isManuallyPlaced: false
              };
            }
          });
          
          // Also check if any other slots link to this one
          locationSlots.forEach((slot, idx) => {
            if (slot.linkedSlots && slot.linkedSlots.includes(i)) {
              // This slot is linked to our current slot, clear it
              locationSlots[idx] = {
                index: idx,
                name: '-Empty-',
                type: 'empty',
                isFixed: false,
                isManuallyPlaced: false
              };
            }
          });
        } else {
          // Single slot item or part of a multi-slot where we need to check all slots
          // Look for other slots with the same name in the same location
          locationSlots.forEach((slot, idx) => {
            if (slot.name === itemName) {
              locationSlots[idx] = {
                index: idx,
                name: '-Empty-',
                type: 'empty',
                isFixed: false,
                isManuallyPlaced: false
              };
            }
          });
        }
        
        if (!displacedEquipment.includes(itemName)) {
          displacedEquipment.push(itemName);
        }
      }
      
      // Place the new component
      locationSlots[i] = {
        index: i,
        name: componentName,
        type: 'system',
        isFixed: true,
        isManuallyPlaced: false
      };
    }
  });
  
  return {
    updatedAllocations,
    displacedEquipment
  };
}

/**
 * Update equipment locations based on displaced items
 */
export function updateDisplacedEquipment(
  equipment: WeaponOrEquipmentItem[],
  displacedNames: string[]
): WeaponOrEquipmentItem[] {
  if (displacedNames.length === 0) return equipment;
  
  return equipment.map(item => {
    if (displacedNames.includes(item.item_name) && item.location) {
      // Unallocate the displaced equipment
      return { ...item, location: '' };
    }
    return item;
  });
}
