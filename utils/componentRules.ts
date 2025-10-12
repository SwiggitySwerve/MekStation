/**
 * Component Rules Engine
 * Handles placement rules, validation, and conflict detection for system components
 */

import {
  SystemComponents,
  EngineType,
  GyroType,
  CockpitType,
  StructureType,
  ArmorType,
  CriticalSlot,
  CriticalAllocationMap,
  ENGINE_SLOT_REQUIREMENTS,
  GYRO_SLOT_REQUIREMENTS,
  COCKPIT_SLOT_REQUIREMENTS,
  STRUCTURE_SLOT_REQUIREMENTS,
  calculateIntegratedHeatSinks,
  calculateExternalHeatSinks,
  isFixedComponent,
  isConditionallyRemovable,
  getSlotContentType,
} from '../types/systemComponents';
import { ARMOR_SLOT_REQUIREMENTS } from './armorCalculations';
import { MECH_LOCATIONS } from '../types/editor';

// Standard mech locations and their slot counts
export const LOCATION_SLOT_COUNTS: Record<string, number> = {
  [MECH_LOCATIONS.HEAD]: 6,
  [MECH_LOCATIONS.CENTER_TORSO]: 12,
  [MECH_LOCATIONS.LEFT_TORSO]: 12,
  [MECH_LOCATIONS.RIGHT_TORSO]: 12,
  [MECH_LOCATIONS.LEFT_ARM]: 12,
  [MECH_LOCATIONS.RIGHT_ARM]: 12,
  [MECH_LOCATIONS.LEFT_LEG]: 6,
  [MECH_LOCATIONS.RIGHT_LEG]: 6,
};

// Initialize critical slots with standard actuators and system components
export function initializeCriticalSlots(
  systemComponents: SystemComponents,
  mechTonnage: number
): CriticalAllocationMap {
  const criticalSlots: CriticalAllocationMap = {};
  
  // Initialize all locations with empty slots
  Object.entries(LOCATION_SLOT_COUNTS).forEach(([location, slotCount]) => {
    criticalSlots[location] = Array(slotCount).fill(null).map((_, index) => ({
      index,
      name: '-Empty-',
      type: 'empty',
      isFixed: false,
      isManuallyPlaced: false,
    } as CriticalSlot));
  });
  
  // Initialize actuator states if not present
  if (!systemComponents.leftArmActuators) {
    systemComponents.leftArmActuators = { hasLowerArm: true, hasHand: true };
  }
  if (!systemComponents.rightArmActuators) {
    systemComponents.rightArmActuators = { hasLowerArm: true, hasHand: true };
  }
  
  // Place actuators
  placeActuators(criticalSlots, systemComponents);
  
  // Place cockpit components
  placeCockpitComponents(criticalSlots, systemComponents.cockpit.type);
  
  // Place engine (pass gyro type for XL gyro compatibility check)
  placeEngine(criticalSlots, systemComponents.engine.type, systemComponents.gyro.type);
  
  // Place gyro
  placeGyro(criticalSlots, systemComponents.gyro.type);
  
  // Don't automatically place structure or armor - they should be equipment items
  // that the user can manually allocate
  
  return criticalSlots;
}

// Place standard actuators with proper fixed/removable flags
function placeActuators(criticalSlots: CriticalAllocationMap, systemComponents: SystemComponents): void {
  // Arms
  [
    { location: MECH_LOCATIONS.LEFT_ARM, actuators: systemComponents.leftArmActuators },
    { location: MECH_LOCATIONS.RIGHT_ARM, actuators: systemComponents.rightArmActuators }
  ].forEach(({ location, actuators }) => {
    const slots = criticalSlots[location];
    if (slots) {
      // Shoulder and Upper Arm are always present and fixed
      slots[0] = { 
        index: 0, 
        name: 'Shoulder', 
        type: 'system', 
        isFixed: true, 
        isManuallyPlaced: false 
      };
      slots[1] = { 
        index: 1, 
        name: 'Upper Arm Actuator', 
        type: 'system', 
        isFixed: true, 
        isManuallyPlaced: false 
      };
      
      // Lower Arm Actuator (conditionally removable)
      if (actuators?.hasLowerArm) {
        slots[2] = { 
          index: 2, 
          name: 'Lower Arm Actuator', 
          type: 'system', 
          isFixed: false,
          isConditionallyRemovable: true,
          isManuallyPlaced: false,
          contextMenuOptions: [{
            label: 'Remove Lower Arm',
            action: 'remove',
            component: 'Lower Arm Actuator',
            isEnabled: () => true
          }]
        };
      }
      
      // Hand Actuator (conditionally removable, requires lower arm)
      if (actuators?.hasHand && actuators?.hasLowerArm) {
        slots[3] = { 
          index: 3, 
          name: 'Hand Actuator', 
          type: 'system', 
          isFixed: false,
          isConditionallyRemovable: true,
          isManuallyPlaced: false,
          contextMenuOptions: [{
            label: 'Remove Hand',
            action: 'remove',
            component: 'Hand Actuator',
            isEnabled: () => true
          }]
        };
      }
      
      // Add context menu for empty slots where actuators can be added
      if (!actuators?.hasLowerArm && slots[2].name === '-Empty-') {
        slots[2].contextMenuOptions = [{
          label: 'Add Lower Arm',
          action: 'add',
          component: 'Lower Arm Actuator',
          isEnabled: () => true
        }];
      }
      
      if (!actuators?.hasHand && actuators?.hasLowerArm && slots[3].name === '-Empty-') {
        slots[3].contextMenuOptions = [{
          label: 'Add Hand',
          action: 'add',
          component: 'Hand Actuator',
          isEnabled: () => actuators.hasLowerArm
        }];
      }
    }
  });
  
  // Legs - all actuators are fixed
  [MECH_LOCATIONS.LEFT_LEG, MECH_LOCATIONS.RIGHT_LEG].forEach(location => {
    const slots = criticalSlots[location];
    if (slots) {
      slots[0] = { index: 0, name: 'Hip', type: 'system', isFixed: true, isManuallyPlaced: false };
      slots[1] = { index: 1, name: 'Upper Leg Actuator', type: 'system', isFixed: true, isManuallyPlaced: false };
      slots[2] = { index: 2, name: 'Lower Leg Actuator', type: 'system', isFixed: true, isManuallyPlaced: false };
      slots[3] = { index: 3, name: 'Foot Actuator', type: 'system', isFixed: true, isManuallyPlaced: false };
    }
  });
}

// Place cockpit components in head (and center torso for torso-mounted)
function placeCockpitComponents(criticalSlots: CriticalAllocationMap, cockpitType: CockpitType): void {
  const headSlots = criticalSlots[MECH_LOCATIONS.HEAD];
  const ctSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO];
  
  if (!headSlots) return;
  
  // Standard head components
  if (cockpitType !== 'Torso-Mounted') {
    headSlots[0] = { index: 0, name: 'Life Support', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[1] = { index: 1, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[2] = { index: 2, name: 'Standard Cockpit', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[3] = { index: 3, name: '-Empty-', type: 'empty', isFixed: false, isManuallyPlaced: false };
    headSlots[4] = { index: 4, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[5] = { index: 5, name: 'Life Support', type: 'system', isFixed: true, isManuallyPlaced: false };
    
    // Command Console takes extra slot
    if (cockpitType === 'Command Console') {
      headSlots[4] = { index: 4, name: 'Command Console', type: 'system', isFixed: true, isManuallyPlaced: false };
    }
    
    // Primitive cockpit takes 5 slots
    if (cockpitType === 'Primitive') {
      headSlots[4] = { index: 4, name: 'Primitive Cockpit', type: 'system', isFixed: true, isManuallyPlaced: false };
    }
  } else {
    // Torso-mounted cockpit
    headSlots[0] = { index: 0, name: 'Life Support', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[1] = { index: 1, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[2] = { index: 2, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[3] = { index: 3, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    headSlots[4] = { index: 4, name: 'Sensors', type: 'system', isFixed: true, isManuallyPlaced: false };
    
    // Place cockpit in CT slot 11 (last slot)
    if (ctSlots) {
      ctSlots[11] = { index: 11, name: 'Torso-Mounted Cockpit', type: 'system', isFixed: true, isManuallyPlaced: false };
    }
  }
}

// Place engine in appropriate locations
function placeEngine(criticalSlots: CriticalAllocationMap, engineType: EngineType, gyroType?: GyroType): void {
  // Ensure engineType is valid and exists in requirements
  const validEngineType = Object.keys(ENGINE_SLOT_REQUIREMENTS).includes(engineType) ? 
    engineType : 'Standard';
  
  const requirements = ENGINE_SLOT_REQUIREMENTS[validEngineType];
  
  // If requirements still not found (which shouldn't happen after the above check), use Standard as fallback
  if (!requirements) {
    console.warn(`Engine type ${engineType} not found in requirements, using Standard fallback`);
    const standardReqs = ENGINE_SLOT_REQUIREMENTS['Standard'];
    if (!standardReqs) {
      console.error('Standard engine requirements not found, cannot place engine');
      return;
    }
    
    // Place standard engine in center torso (split around gyro)
    const ctSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO];
    if (ctSlots && ctSlots.length >= 12) {
      // Engine occupies slots 0-2 and 7-9 (6 slots total, split around gyro)
      for (let i = 0; i < 3; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
      for (let i = 7; i < 10 && i < ctSlots.length; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
    }
    return;
  }
  
  // Place in center torso
  const ctSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO];
  if (ctSlots && requirements.centerTorso === 6) {
    // Check if we have an XL gyro which takes slots 3-8
    const hasXLGyro = gyroType === 'XL';
    
    if (hasXLGyro && (String(validEngineType).includes('XL') || String(validEngineType).includes('Light') || String(validEngineType).includes('XXL'))) {
      // Special layout for XL/Light/XXL engines with XL gyro
      // Engine uses slots 0-2 and 9-11 to avoid XL gyro at 3-8
      for (let i = 0; i < 3; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
      for (let i = 9; i < 12 && i < ctSlots.length; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
    } else {
      // Standard layout: 0-2 and 7-9
      for (let i = 0; i < 3; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
      for (let i = 7; i < 10 && i < ctSlots.length; i++) {
        ctSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
    }
  }
  
  // Place in side torsos for XL/Light/XXL engines
  if (requirements.leftTorso && requirements.leftTorso > 0) {
    const ltSlots = criticalSlots[MECH_LOCATIONS.LEFT_TORSO];
    if (ltSlots) {
      for (let i = 0; i < requirements.leftTorso && i < ltSlots.length; i++) {
        ltSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
    }
  }
  
  if (requirements.rightTorso && requirements.rightTorso > 0) {
    const rtSlots = criticalSlots[MECH_LOCATIONS.RIGHT_TORSO];
    if (rtSlots) {
      for (let i = 0; i < requirements.rightTorso && i < rtSlots.length; i++) {
        rtSlots[i] = { 
          index: i, 
          name: 'Engine', 
          type: 'system', 
          isFixed: true,
          isManuallyPlaced: false 
        };
      }
    }
  }
}

// Place gyro in center torso
function placeGyro(criticalSlots: CriticalAllocationMap, gyroType: GyroType): void {
  const slots = GYRO_SLOT_REQUIREMENTS[gyroType];
  const ctSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO];
  
  if (!ctSlots) return;
  
  // Gyro always starts at slot 3 (after engine slots 0-2)
  const startSlot = 3;
  
  // Place gyro
  for (let i = 0; i < slots && startSlot + i < ctSlots.length; i++) {
    ctSlots[startSlot + i] = { 
      index: startSlot + i, 
      name: 'Gyro', 
      type: 'system', 
      isFixed: true, 
      isManuallyPlaced: false,
      linkedSlots: Array.from({ length: slots }, (_, j) => startSlot + j)
    };
  }
}

// Place structure criticals (like Endo Steel)
function placeStructure(criticalSlots: CriticalAllocationMap, structureType: StructureType, mechTonnage: number): void {
  const totalSlots = STRUCTURE_SLOT_REQUIREMENTS[structureType];
  if (totalSlots === 0) return;
  
  // Distribute structure slots across locations
  // Standard distribution pattern for Endo Steel
  const distribution = getStructureDistribution(structureType, mechTonnage);
  
  Object.entries(distribution).forEach(([location, count]) => {
    const locationSlots = criticalSlots[location];
    if (!locationSlots) return;
    
    let placed = 0;
    for (let i = 0; i < locationSlots.length && placed < count; i++) {
      if (locationSlots[i].type === 'empty') {
        locationSlots[i] = {
          index: i,
          name: structureType,
          type: 'endo-steel',
          isFixed: false,  // Make movable
          isManuallyPlaced: false,
        };
        placed++;
      }
    }
  });
}

// Place armor criticals (like Ferro-Fibrous)
function placeArmor(criticalSlots: CriticalAllocationMap, armorType: ArmorType, mechTonnage: number): void {
  const armorReq = ARMOR_SLOT_REQUIREMENTS[armorType];
  const totalSlots = armorReq.slots;
  if (totalSlots === 0) return;
  
  // Distribute armor slots across locations
  const distribution = getArmorDistribution(armorType, mechTonnage);
  
  Object.entries(distribution).forEach(([location, count]) => {
    const locationSlots = criticalSlots[location];
    if (!locationSlots) return;
    
    let placed = 0;
    for (let i = 0; i < locationSlots.length && placed < count; i++) {
      if (locationSlots[i].type === 'empty') {
        locationSlots[i] = {
          index: i,
          name: armorType,
          type: 'ferro-fibrous',
          isFixed: false,  // Make movable
          isManuallyPlaced: false,
        };
        placed++;
      }
    }
  });
}

// Get distribution pattern for structure slots
function getStructureDistribution(structureType: StructureType, mechTonnage: number): Record<string, number> {
  const totalSlots = STRUCTURE_SLOT_REQUIREMENTS[structureType];
  
  // Standard Endo Steel distribution
  if (structureType === 'Endo Steel' && totalSlots === 14) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 2,
      [MECH_LOCATIONS.RIGHT_ARM]: 2,
      [MECH_LOCATIONS.LEFT_TORSO]: 3,
      [MECH_LOCATIONS.RIGHT_TORSO]: 3,
      [MECH_LOCATIONS.LEFT_LEG]: 2,
      [MECH_LOCATIONS.RIGHT_LEG]: 2,
    };
  }
  
  // Clan Endo Steel distribution
  if (structureType === 'Endo Steel (Clan)' && totalSlots === 7) {
    return {
      [MECH_LOCATIONS.LEFT_TORSO]: 2,
      [MECH_LOCATIONS.RIGHT_TORSO]: 2,
      [MECH_LOCATIONS.LEFT_LEG]: 1,
      [MECH_LOCATIONS.RIGHT_LEG]: 1,
      [MECH_LOCATIONS.HEAD]: 1,
    };
  }
  
  return {};
}

// Get distribution pattern for armor slots
function getArmorDistribution(armorType: ArmorType, mechTonnage: number): Record<string, number> {
  const armorReq = ARMOR_SLOT_REQUIREMENTS[armorType];
  const totalSlots = armorReq.slots;
  
  // Standard Ferro-Fibrous distribution (14 slots)
  if (armorType === 'Ferro-Fibrous' && totalSlots === 14) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 2,
      [MECH_LOCATIONS.RIGHT_ARM]: 2,
      [MECH_LOCATIONS.LEFT_TORSO]: 3,
      [MECH_LOCATIONS.RIGHT_TORSO]: 3,
      [MECH_LOCATIONS.LEFT_LEG]: 2,
      [MECH_LOCATIONS.RIGHT_LEG]: 2,
    };
  }
  
  // Clan Ferro-Fibrous distribution (7 slots)
  if ((armorType === 'Ferro-Fibrous (Clan)' || armorType === 'Light Ferro-Fibrous') && totalSlots === 7) {
    return {
      [MECH_LOCATIONS.LEFT_TORSO]: 2,
      [MECH_LOCATIONS.RIGHT_TORSO]: 2,
      [MECH_LOCATIONS.LEFT_LEG]: 1,
      [MECH_LOCATIONS.RIGHT_LEG]: 1,
      [MECH_LOCATIONS.CENTER_TORSO]: 1,
    };
  }
  
  // Heavy Ferro-Fibrous distribution (21 slots)
  if (armorType === 'Heavy Ferro-Fibrous' && totalSlots === 21) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 3,
      [MECH_LOCATIONS.RIGHT_ARM]: 3,
      [MECH_LOCATIONS.LEFT_TORSO]: 4,
      [MECH_LOCATIONS.RIGHT_TORSO]: 4,
      [MECH_LOCATIONS.LEFT_LEG]: 2,
      [MECH_LOCATIONS.RIGHT_LEG]: 2,
      [MECH_LOCATIONS.CENTER_TORSO]: 2,
      [MECH_LOCATIONS.HEAD]: 1,
    };
  }
  
  // Stealth armor distribution (12 slots)
  if (armorType === 'Stealth' && totalSlots === 12) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 2,
      [MECH_LOCATIONS.RIGHT_ARM]: 2,
      [MECH_LOCATIONS.LEFT_TORSO]: 2,
      [MECH_LOCATIONS.RIGHT_TORSO]: 2,
      [MECH_LOCATIONS.LEFT_LEG]: 2,
      [MECH_LOCATIONS.RIGHT_LEG]: 2,
    };
  }
  
  // Reactive/Reflective armor distribution (14/10 slots)
  if (armorType === 'Reactive' && totalSlots === 14) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 2,
      [MECH_LOCATIONS.RIGHT_ARM]: 2,
      [MECH_LOCATIONS.LEFT_TORSO]: 3,
      [MECH_LOCATIONS.RIGHT_TORSO]: 3,
      [MECH_LOCATIONS.LEFT_LEG]: 2,
      [MECH_LOCATIONS.RIGHT_LEG]: 2,
    };
  }
  
  if (armorType === 'Reflective' && totalSlots === 10) {
    return {
      [MECH_LOCATIONS.LEFT_ARM]: 2,
      [MECH_LOCATIONS.RIGHT_ARM]: 2,
      [MECH_LOCATIONS.LEFT_TORSO]: 2,
      [MECH_LOCATIONS.RIGHT_TORSO]: 2,
      [MECH_LOCATIONS.LEFT_LEG]: 1,
      [MECH_LOCATIONS.RIGHT_LEG]: 1,
    };
  }
  
  return {};
}

// Validate component placement
export function validateComponentPlacement(
  criticalSlots: CriticalAllocationMap,
  systemComponents: SystemComponents
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate engine placement
  const engineReq = ENGINE_SLOT_REQUIREMENTS[systemComponents.engine.type];
  const ctEngineSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO]?.filter(s => s.name === 'Engine').length || 0;
  if (ctEngineSlots !== engineReq.centerTorso) {
    errors.push(`Engine requires ${engineReq.centerTorso} CT slots but has ${ctEngineSlots}`);
  }
  
  // Validate gyro placement
  const gyroSlots = criticalSlots[MECH_LOCATIONS.CENTER_TORSO]?.filter(s => s.name === 'Gyro').length || 0;
  const requiredGyroSlots = GYRO_SLOT_REQUIREMENTS[systemComponents.gyro.type];
  if (gyroSlots !== requiredGyroSlots) {
    errors.push(`Gyro requires ${requiredGyroSlots} slots but has ${gyroSlots}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate heat sink equipment items
export function generateHeatSinkItems(
  heatSinkType: string,
  totalCount: number,
  engineRating: number
): Array<{ name: string; type: string; slots: number; weight: number }> {
  const integrated = calculateIntegratedHeatSinks(engineRating);
  const external = calculateExternalHeatSinks(totalCount, engineRating);
  
  if (external <= 0) return [];
  
  const items: Array<{ name: string; type: string; slots: number; weight: number }> = [];
  
  for (let i = 0; i < external; i++) {
    items.push({
      name: heatSinkType === 'Double' ? 'Double Heat Sink' : 
            heatSinkType === 'Double (Clan)' ? 'Double Heat Sink (Clan)' : 'Heat Sink',
      type: 'heat-sink',
      slots: heatSinkType === 'Double' ? 3 : heatSinkType === 'Double (Clan)' ? 2 : 1,
      weight: 1,
    });
  }
  
  return items;
}

// Handle actuator removal
export function removeActuator(
  criticalSlots: CriticalAllocationMap,
  systemComponents: SystemComponents,
  location: string,
  actuatorType: 'Lower Arm Actuator' | 'Hand Actuator'
): void {
  const isLeftArm = location === MECH_LOCATIONS.LEFT_ARM;
  const actuators = isLeftArm ? systemComponents.leftArmActuators : systemComponents.rightArmActuators;
  
  if (!actuators) return;
  
  const slots = criticalSlots[location];
  if (!slots) return;
  
  if (actuatorType === 'Lower Arm Actuator') {
    // Remove both lower arm and hand
    actuators.hasLowerArm = false;
    actuators.hasHand = false;
    
    // Clear slots 2 and 3
    if (slots[2]) {
      slots[2] = {
        index: 2,
        name: '-Empty-',
        type: 'empty',
        isFixed: false,
        isManuallyPlaced: false,
        contextMenuOptions: [{
          label: 'Add Lower Arm',
          action: 'add',
          component: 'Lower Arm Actuator',
          isEnabled: () => true
        }]
      };
    }
    if (slots[3]) {
      slots[3] = {
        index: 3,
        name: '-Empty-',
        type: 'empty',
        isFixed: false,
        isManuallyPlaced: false,
      };
    }
  } else if (actuatorType === 'Hand Actuator') {
    // Remove only hand
    actuators.hasHand = false;
    
    // Clear slot 3
    if (slots[3]) {
      slots[3] = {
        index: 3,
        name: '-Empty-',
        type: 'empty',
        isFixed: false,
        isManuallyPlaced: false,
        contextMenuOptions: [{
          label: 'Add Hand',
          action: 'add',
          component: 'Hand Actuator',
          isEnabled: () => actuators.hasLowerArm
        }]
      };
    }
  }
}

// Handle actuator addition
export function addActuator(
  criticalSlots: CriticalAllocationMap,
  systemComponents: SystemComponents,
  location: string,
  actuatorType: 'Lower Arm Actuator' | 'Hand Actuator'
): void {
  const isLeftArm = location === MECH_LOCATIONS.LEFT_ARM;
  const actuators = isLeftArm ? systemComponents.leftArmActuators : systemComponents.rightArmActuators;
  
  if (!actuators) return;
  
  const slots = criticalSlots[location];
  if (!slots) return;
  
  if (actuatorType === 'Lower Arm Actuator') {
    // Add lower arm
    actuators.hasLowerArm = true;
    
    // Place in slot 2
    if (slots[2]) {
      slots[2] = {
        index: 2,
        name: 'Lower Arm Actuator',
        type: 'system',
        isFixed: false,
        isConditionallyRemovable: true,
        isManuallyPlaced: false,
        contextMenuOptions: [{
          label: 'Remove Lower Arm',
          action: 'remove',
          component: 'Lower Arm Actuator',
          isEnabled: () => true
        }]
      };
    }
    
    // Update slot 3 to allow hand addition
    if (slots[3] && slots[3].name === '-Empty-') {
      slots[3].contextMenuOptions = [{
        label: 'Add Hand',
        action: 'add',
        component: 'Hand Actuator',
        isEnabled: () => true
      }];
    }
  } else if (actuatorType === 'Hand Actuator' && actuators.hasLowerArm) {
    // Add hand (only if lower arm exists)
    actuators.hasHand = true;
    
    // Place in slot 3
    if (slots[3]) {
      slots[3] = {
        index: 3,
        name: 'Hand Actuator',
        type: 'system',
        isFixed: false,
        isConditionallyRemovable: true,
        isManuallyPlaced: false,
        contextMenuOptions: [{
          label: 'Remove Hand',
          action: 'remove',
          component: 'Hand Actuator',
          isEnabled: () => true
        }]
      };
    }
  }
}
