import { FullEquipment } from '../types/index';
import { MechLocation, MECH_LOCATIONS, CriticalAllocation } from '../types/editor';

export interface CriticalAutoAllocationOptions {
  fillUnhittables: boolean;     // Prioritize unhittable equipment in head/center torso
  spreadEquipment: boolean;     // Spread multi-slot equipment across locations
  balanceWeight: boolean;       // Balance weight distribution
  prioritizeSymmetry: boolean;  // Place equipment symmetrically when possible
}

export interface LocationCriticalSlots {
  location: MechLocation;
  totalSlots: number;
  availableSlots: number;
  fixedSlots: number;
  assignments: CriticalSlotAssignment[];
}

export interface CriticalSlotAssignment {
  slotIndex: number;
  equipment?: FullEquipment;
  systemType?: 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator';
  isFixed: boolean;
  isEmpty: boolean;
}

/**
 * Get critical slots for equipment, handling different property names
 */
const getCriticalSlots = (equipment: FullEquipment): number => {
  // Try different property names that might contain critical slots
  if (equipment.space) return Number(equipment.space);
  if (equipment.data?.slots) return Number(equipment.data.slots);
  if (equipment.data?.critical_slots) return Number(equipment.data.critical_slots);
  return 1; // Default to 1 slot
};

/**
 * Standard critical slot counts per location for bipedal mechs
 */
export const getStandardCriticalSlots = (): Record<MechLocation, number> => {
  return {
    [MECH_LOCATIONS.HEAD]: 6,
    [MECH_LOCATIONS.CENTER_TORSO]: 12,
    [MECH_LOCATIONS.LEFT_TORSO]: 12,
    [MECH_LOCATIONS.RIGHT_TORSO]: 12,
    [MECH_LOCATIONS.LEFT_ARM]: 12,
    [MECH_LOCATIONS.RIGHT_ARM]: 12,
    [MECH_LOCATIONS.LEFT_LEG]: 6,
    [MECH_LOCATIONS.RIGHT_LEG]: 6,
    [MECH_LOCATIONS.CENTER_LEG]: 6, // For tripods
  } as Record<MechLocation, number>;
};

/**
 * Initialize critical slot layout with fixed internal structure
 */
export const initializeCriticalSlots = (
  tonnage: number,
  engineRating: number,
  gyroType: string = 'Standard',
  cockpitType: string = 'Standard'
): LocationCriticalSlots[] => {
  const slotCounts = getStandardCriticalSlots();
  const locations: LocationCriticalSlots[] = [];
  
  // Calculate engine slots (varies by rating)
      const { calculateInternalHeatSinksForEngine } = require('../heatSinkCalculations');
    const engineSlots = calculateInternalHeatSinksForEngine(engineRating, 'Standard');
  
  // Head slots
  const headSlots = Array(slotCounts[MECH_LOCATIONS.HEAD]).fill(null).map((_, index) => ({
    slotIndex: index,
    systemType: getHeadSystemType(index),
    isFixed: true,
    isEmpty: false,
  } as CriticalSlotAssignment));
  
  locations.push({
    location: MECH_LOCATIONS.HEAD,
    totalSlots: slotCounts[MECH_LOCATIONS.HEAD],
    availableSlots: 2, // Usually 2 free slots in head
    fixedSlots: 4,
    assignments: headSlots,
  });
  
  // Center Torso slots
  const centerTorsoSlots = Array(slotCounts[MECH_LOCATIONS.CENTER_TORSO]).fill(null).map((_, index) => ({
    slotIndex: index,
    systemType: getCenterTorsoSystemType(index, engineSlots, gyroType),
    isFixed: index < (engineSlots + getGyroSlots(gyroType)),
    isEmpty: index >= (engineSlots + getGyroSlots(gyroType)),
  } as CriticalSlotAssignment));
  
  locations.push({
    location: MECH_LOCATIONS.CENTER_TORSO,
    totalSlots: slotCounts[MECH_LOCATIONS.CENTER_TORSO],
    availableSlots: slotCounts[MECH_LOCATIONS.CENTER_TORSO] - (engineSlots + getGyroSlots(gyroType)),
    fixedSlots: engineSlots + getGyroSlots(gyroType),
    assignments: centerTorsoSlots,
  });
  
  // Side torso locations (usually empty initially)
  for (const location of [MECH_LOCATIONS.LEFT_TORSO, MECH_LOCATIONS.RIGHT_TORSO]) {
    const slots = Array(slotCounts[location]).fill(null).map((_, index) => ({
      slotIndex: index,
      isFixed: false,
      isEmpty: true,
    } as CriticalSlotAssignment));
    
    locations.push({
      location,
      totalSlots: slotCounts[location],
      availableSlots: slotCounts[location],
      fixedSlots: 0,
      assignments: slots,
    });
  }
  
  // Arm locations with actuators
  for (const location of [MECH_LOCATIONS.LEFT_ARM, MECH_LOCATIONS.RIGHT_ARM]) {
    const armSlots = Array(slotCounts[location]).fill(null).map((_, index) => ({
      slotIndex: index,
      systemType: getArmActuatorType(index),
      isFixed: index < 4, // Usually 4 actuator slots
      isEmpty: index >= 4,
    } as CriticalSlotAssignment));
    
    locations.push({
      location,
      totalSlots: slotCounts[location],
      availableSlots: slotCounts[location] - 4,
      fixedSlots: 4,
      assignments: armSlots,
    });
  }
  
  // Leg locations with actuators
  for (const location of [MECH_LOCATIONS.LEFT_LEG, MECH_LOCATIONS.RIGHT_LEG]) {
    const legSlots = Array(slotCounts[location]).fill(null).map((_, index) => ({
      slotIndex: index,
      systemType: getLegActuatorType(index),
      isFixed: index < 4, // Usually 4 actuator slots
      isEmpty: index >= 4,
    } as CriticalSlotAssignment));
    
    locations.push({
      location,
      totalSlots: slotCounts[location],
      availableSlots: slotCounts[location] - 4,
      fixedSlots: 4,
      assignments: legSlots,
    });
  }
  
  return locations;
};

/**
 * Auto-allocate equipment to critical slots following MegaMekLab logic
 */
export const autoAllocateEquipment = (
  equipment: FullEquipment[],
  currentSlots: LocationCriticalSlots[],
  options: CriticalAutoAllocationOptions = {
    fillUnhittables: true,
    spreadEquipment: true,
    balanceWeight: true,
    prioritizeSymmetry: true,
  }
): CriticalAllocation[] => {
  const allocations: CriticalAllocation[] = [];
  const remainingEquipment = [...equipment];
  const slotsCopy = JSON.parse(JSON.stringify(currentSlots)) as LocationCriticalSlots[];
  
  // Step 1: Allocate unhittable equipment to head/center torso if enabled
  if (options.fillUnhittables) {
    const unhittableEquipment = remainingEquipment.filter(eq => isUnhittableEquipment(eq));
    
    for (const eq of unhittableEquipment) {
      const allocation = allocateToPreferredLocation(
        eq,
        [MECH_LOCATIONS.HEAD, MECH_LOCATIONS.CENTER_TORSO],
        slotsCopy
      );
      
      if (allocation) {
        allocations.push(...allocation);
        removeEquipmentFromList(eq, remainingEquipment);
      }
    }
  }
  
  // Step 2: Allocate heat sinks
  const heatSinks = remainingEquipment.filter(eq => 
    eq.name.toLowerCase().includes('heat sink') || eq.type === 'HeatSink'
  );
  
  for (const heatSink of heatSinks) {
    // Try to place in side torsos first, then other locations
    const allocation = allocateToPreferredLocation(
      heatSink,
      [MECH_LOCATIONS.LEFT_TORSO, MECH_LOCATIONS.RIGHT_TORSO, MECH_LOCATIONS.LEFT_ARM, MECH_LOCATIONS.RIGHT_ARM],
      slotsCopy
    );
    
    if (allocation) {
      allocations.push(...allocation);
      removeEquipmentFromList(heatSink, remainingEquipment);
    }
  }
  
  // Step 3: Allocate weapons and other equipment
  const sortedEquipment = remainingEquipment.sort((a, b) => {
    // Prioritize larger equipment first
    const aCrits = getCriticalSlots(a);
    const bCrits = getCriticalSlots(b);
    return bCrits - aCrits;
  });
  
  for (const eq of sortedEquipment) {
    let allocation: CriticalAllocation[] | null = null;
    
    // Try symmetric placement for weapons if enabled
    if (options.prioritizeSymmetry && isWeapon(eq)) {
      allocation = allocateSymmetrically(eq, slotsCopy);
    }
    
    // Fall back to best fit allocation
    if (!allocation) {
      allocation = allocateToBestFit(eq, slotsCopy, options);
    }
    
    if (allocation) {
      allocations.push(...allocation);
    }
  }
  
  return allocations;
};

/**
 * Allocate equipment to preferred locations
 */
const allocateToPreferredLocation = (
  equipment: FullEquipment,
  preferredLocations: MechLocation[],
  availableSlots: LocationCriticalSlots[]
): CriticalAllocation[] | null => {
  const slotsNeeded = getCriticalSlots(equipment);
  
  for (const location of preferredLocations) {
    const locationSlots = availableSlots.find(slot => slot.location === location);
    
    if (locationSlots && locationSlots.availableSlots >= slotsNeeded) {
      const startSlot = findConsecutiveSlots(locationSlots, slotsNeeded);
      
      if (startSlot !== -1) {
        const allocations: CriticalAllocation[] = [];
        
        // Mark slots as occupied
        for (let i = 0; i < slotsNeeded; i++) {
          locationSlots.assignments[startSlot + i] = {
            slotIndex: startSlot + i,
            equipment,
            isFixed: false,
            isEmpty: false,
          };
          
          allocations.push({
            location,
            slot: startSlot + i,
            equipmentId: equipment.id,
            equipment,
          });
        }
        
        locationSlots.availableSlots -= slotsNeeded;
        return allocations;
      }
    }
  }
  
  return null;
};

/**
 * Find consecutive available slots in a location
 */
const findConsecutiveSlots = (locationSlots: LocationCriticalSlots, slotsNeeded: number): number => {
  for (let i = 0; i <= locationSlots.assignments.length - slotsNeeded; i++) {
    let consecutive = true;
    
    for (let j = 0; j < slotsNeeded; j++) {
      if (!locationSlots.assignments[i + j]?.isEmpty) {
        consecutive = false;
        break;
      }
    }
    
    if (consecutive) {
      return i;
    }
  }
  
  return -1;
};

/**
 * Allocate equipment symmetrically (for weapons)
 */
const allocateSymmetrically = (
  equipment: FullEquipment,
  availableSlots: LocationCriticalSlots[]
): CriticalAllocation[] | null => {
  const symmetricPairs = [
    [MECH_LOCATIONS.LEFT_ARM, MECH_LOCATIONS.RIGHT_ARM],
    [MECH_LOCATIONS.LEFT_TORSO, MECH_LOCATIONS.RIGHT_TORSO],
    [MECH_LOCATIONS.LEFT_LEG, MECH_LOCATIONS.RIGHT_LEG],
  ];
  
  for (const [leftLoc, rightLoc] of symmetricPairs) {
    const leftSlots = availableSlots.find(slot => slot.location === leftLoc);
    const rightSlots = availableSlots.find(slot => slot.location === rightLoc);
    
    const slotsNeeded = getCriticalSlots(equipment);
    
    if (leftSlots && rightSlots && 
        leftSlots.availableSlots >= slotsNeeded && 
        rightSlots.availableSlots >= slotsNeeded) {
      
      // Try to place in left side first
      return allocateToPreferredLocation(equipment, [leftLoc], availableSlots);
    }
  }
  
  return null;
};

/**
 * Allocate to best fitting location
 */
const allocateToBestFit = (
  equipment: FullEquipment,
  availableSlots: LocationCriticalSlots[],
  options: CriticalAutoAllocationOptions
): CriticalAllocation[] | null => {
  const slotsNeeded = getCriticalSlots(equipment);
  
  // Sort locations by available space (smallest first for better packing)
  const sortedLocations = availableSlots
    .filter(slot => slot.availableSlots >= slotsNeeded)
    .sort((a, b) => a.availableSlots - b.availableSlots);
  
  if (sortedLocations.length > 0) {
    return allocateToPreferredLocation(equipment, [sortedLocations[0].location], availableSlots);
  }
  
  return null;
};

// Helper functions for system identification
const getHeadSystemType = (slotIndex: number): string => {
  switch (slotIndex) {
    case 0:
    case 1: return 'lifesupport';
    case 2: return 'sensors';
    case 3: return 'cockpit';
    case 4:
    case 5: return 'sensors';
    default: return 'sensors';
  }
};

const getCenterTorsoSystemType = (slotIndex: number, engineSlots: number, gyroType: string): string => {
  if (slotIndex < engineSlots) return 'engine';
  if (slotIndex < engineSlots + getGyroSlots(gyroType)) return 'gyro';
  return '';
};

const getGyroSlots = (gyroType: string): number => {
  switch (gyroType) {
    case 'Compact': return 2;
    case 'Heavy-Duty': return 4;
    case 'XL': return 6;
    default: return 4; // Standard
  }
};

const getArmActuatorType = (slotIndex: number): string => {
  switch (slotIndex) {
    case 0: return 'actuator'; // Shoulder
    case 1: return 'actuator'; // Upper Arm
    case 2: return 'actuator'; // Lower Arm
    case 3: return 'actuator'; // Hand
    default: return '';
  }
};

const getLegActuatorType = (slotIndex: number): string => {
  switch (slotIndex) {
    case 0: return 'actuator'; // Hip
    case 1: return 'actuator'; // Upper Leg
    case 2: return 'actuator'; // Lower Leg
    case 3: return 'actuator'; // Foot
    default: return '';
  }
};

const isUnhittableEquipment = (equipment: FullEquipment): boolean => {
  const unhittableTypes = [
    'endo steel', 'ferro-fibrous', 'artemis', 'narc', 'c3', 'ecm', 'bap',
    'targeting computer', 'command console'
  ];
  
  return unhittableTypes.some(type => 
    equipment.name.toLowerCase().includes(type) || 
    equipment.type?.toLowerCase().includes(type)
  );
};

const isWeapon = (equipment: FullEquipment): boolean => {
  const weaponTypes = ['Energy', 'Ballistic', 'Missile', 'Physical', 'Artillery'];
  return weaponTypes.includes(equipment.type || '');
};

const removeEquipmentFromList = (equipment: FullEquipment, list: FullEquipment[]): void => {
  const index = list.findIndex(eq => eq.id === equipment.id);
  if (index > -1) {
    list.splice(index, 1);
  }
};

/**
 * Validate critical slot allocation
 */
export const validateCriticalAllocation = (
  allocations: CriticalAllocation[],
  maxSlots: Record<MechLocation, number>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const locationCounts: Record<string, number> = {};
  
  // Count allocations per location
  for (const allocation of allocations) {
    const location = allocation.location as string;
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  }
  
  // Check against maximums
  for (const [location, count] of Object.entries(locationCounts)) {
    const mechLocation = location as MechLocation;
    const max = maxSlots[mechLocation];
    if (count > max) {
      errors.push(`${location} has ${count} critical slots but maximum is ${max}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
