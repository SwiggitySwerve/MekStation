import { EditableUnit } from '../types/editor';
import { IArmorAllocation } from '../types/core/UnitInterfaces';
import { EQUIPMENT_DATABASE } from './equipmentData';
import { calculateEngineWeight, calculateStructureWeight } from '../constants/BattleTechConstructionRules';
import { calculateInternalHeatSinksForEngine } from './heatSinkCalculations';
import { getArmorType, ArmorType } from './armorTypes';
import { StructureType, EngineType } from '../types/core';

export interface ArmorAllocation {
  [location: string]: {
    front: number;
    rear?: number;
  };
}

// Use official BattleTech internal structure table
import { getInternalStructurePoints as getOfficialStructure } from './internalStructureTable';

// Type-safe casting functions for component enums
function castToStructureType(structureType: string): StructureType {
  const validTypes: StructureType[] = ['Standard', 'Endo Steel', 'Endo Steel (Clan)', 'Composite', 'Reinforced', 'Industrial', 'Endo Steel (IS)'];
  return validTypes.includes(structureType as StructureType) ? structureType as StructureType : 'Standard';
}

function castToEngineType(engineType: string): EngineType {
  const validTypes: EngineType[] = ['Standard', 'XL', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell', 'XL (IS)', 'XL (Clan)'];
  if (engineType === 'XL') return 'XL (IS)';
  return validTypes.includes(engineType as EngineType) ? engineType as EngineType : 'Standard';
}

// Helper function to get standard armor type as fallback
function getStandardArmorType(): ArmorType {
  return getArmorType('standard');
}

/**
 * Converts a dynamic record of armor values to a typed IArmorAllocation object.
 * Ensures all required fields are present with default values.
 */
export function convertToIArmorAllocation(allocation: Record<string, number>): IArmorAllocation {
  return {
    head: allocation['head'] || 0,
    centerTorso: allocation['centerTorso'] || 0,
    centerTorsoRear: allocation['centerTorsoRear'] || 0,
    leftTorso: allocation['leftTorso'] || 0,
    leftTorsoRear: allocation['leftTorsoRear'] || 0,
    rightTorso: allocation['rightTorso'] || 0,
    rightTorsoRear: allocation['rightTorsoRear'] || 0,
    leftArm: allocation['leftArm'] || 0,
    rightArm: allocation['rightArm'] || 0,
    leftLeg: allocation['leftLeg'] || 0,
    rightLeg: allocation['rightLeg'] || 0
  };
}

export function calculateMaxArmorPoints(unit: EditableUnit): number {
  let maxArmor = 0;
  
  // Head has fixed armor maximum per BattleTech construction rules
  const headMax = 9; // Always 9 points maximum
  maxArmor += headMax;
  
  // Other locations get 2x internal structure
  const locations = ['CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
  locations.forEach(loc => {
    const internalStructure = getInternalStructure(unit, loc);
    maxArmor += internalStructure * 2;
  });
  
  return maxArmor;
}

// Helper function to get internal structure for a location using official BattleTech table
function getInternalStructure(unit: EditableUnit, location: string): number {
  const tonnage = unit.mass || 50;
  
  try {
    const structure = getOfficialStructure(tonnage);
    
    // Map location names to structure properties
    const locationMap: Record<string, keyof typeof structure> = {
      'HEAD': 'HD', 'HD': 'HD',
      'CT': 'CT',
      'LT': 'LT',
      'RT': 'RT', 
      'LA': 'LA',
      'RA': 'RA',
      'LL': 'LL',
      'RL': 'RL'
    };
    
    const structureKey = locationMap[location.toUpperCase()];
    if (structureKey) {
      return structure[structureKey];
    }
    
    return 10; // Fallback value
  } catch (error) {
    // Fallback for invalid tonnage
    return 10;
  }
}

export function autoAllocateArmor(unit: EditableUnit): ArmorAllocation {
  const armorLocations = unit.data?.armor?.locations || [];
  const totalArmorPoints = unit.data?.armor?.total_armor_points || 0;
  
  if (totalArmorPoints === 0) {
    return createEmptyAllocation();
  }
  
  const maxArmor = calculateMaxArmorPoints(unit);
  
  // Calculate percentage of max armor we can allocate
  const percent = Math.min(1, totalArmorPoints / maxArmor);
  
  // Head gets 5x percentage (capped at max) - MegaMekLab formula
  const headMax = 9; // Always 9 points maximum per BattleTech construction rules
  const headArmor = Math.min(Math.floor(percent * headMax * 5), headMax);
  
  let remainingPoints = totalArmorPoints - headArmor;
  const remainingMaxArmor = maxArmor - headMax;
  
  // Recalculate percentage for remaining locations
  const remainingPercent = remainingMaxArmor > 0 ? remainingPoints / remainingMaxArmor : 0;
  
  const allocation: ArmorAllocation = {
    HEAD: { front: headArmor }
  };
  
  // Allocate to other locations
  const locations = [
    { id: 'CT', hasRear: true },
    { id: 'LT', hasRear: true },
    { id: 'RT', hasRear: true },
    { id: 'LA', hasRear: false },
    { id: 'RA', hasRear: false },
    { id: 'LL', hasRear: false },
    { id: 'RL', hasRear: false }
  ];
  
  locations.forEach(loc => {
    const internal = getInternalStructure(unit, loc.id);
    const maxLocationArmor = internal * 2;
    const allocatedArmor = Math.min(Math.floor(maxLocationArmor * remainingPercent), remainingPoints);
    
    if (loc.hasRear) {
      // MegaMekLab: 75% front, 25% rear for torso locations
      let rear = Math.floor(allocatedArmor * 0.25);
      let front = Math.ceil(allocatedArmor * 0.75);
      
      // Make sure rounding doesn't add an extra point
      if (rear + front > allocatedArmor) {
        if (front > rear * 3) {
          front--;
        } else {
          rear--;
        }
      }
      
      allocation[loc.id] = { front, rear };
      remainingPoints -= (front + rear);
    } else {
      allocation[loc.id] = { front: Math.floor(allocatedArmor) };
      remainingPoints -= Math.floor(allocatedArmor);
    }
  });
  
  // Allocate any leftover points using MegaMekLab logic
  if (remainingPoints > 0) {
    return allocateLeftoverPoints(unit, remainingPoints, allocation);
  }
  
  return allocation;
}

export function allocateLeftoverPoints(
  unit: EditableUnit,
  points: number,
  currentAllocation: ArmorAllocation
): ArmorAllocation {
  const allocation = { ...currentAllocation };
  const headMax = 9; // Always 9 points maximum per BattleTech construction rules
  
  while (points >= 1) {
    // If we have 2+ points, allocate to symmetric locations
    if (points >= 2) {
      // MegaMekLab priority: torso pairs first
      if (canAddToLocation(unit, allocation, 'LT') && canAddToLocation(unit, allocation, 'RT')) {
        allocation.LT.front += 1;
        allocation.RT.front += 1;
        points -= 2;
        continue;
      }
      
      // Then leg pairs
      if (canAddToLocation(unit, allocation, 'LL') && canAddToLocation(unit, allocation, 'RL')) {
        allocation.LL.front += 1;
        allocation.RL.front += 1;
        points -= 2;
        continue;
      }
      
      // Then arm pairs
      if (canAddToLocation(unit, allocation, 'LA') && canAddToLocation(unit, allocation, 'RA')) {
        allocation.LA.front += 1;
        allocation.RA.front += 1;
        points -= 2;
        continue;
      }
    }
    
    // Single point allocation
    // Special case: if only 1 point left and head & CT are at max, remove 1 from CT
    if (points === 1 && allocation.HEAD.front === headMax) {
      const ctMax = getInternalStructure(unit, 'CT') * 2;
      const ctTotal = allocation.CT.front + (allocation.CT.rear || 0);
      if (ctTotal === ctMax) {
        // Remove 1 from CT to allow symmetric locations to get extra
        allocation.CT.front -= 1;
        points += 1;
        continue;
      }
    }
    
    // First try head
    if (allocation.HEAD.front < headMax) {
      allocation.HEAD.front += 1;
      points -= 1;
      continue;
    }
    
    // Then balance uneven allocations in MegaMekLab order
    const ltTotal = allocation.LT.front + (allocation.LT.rear || 0);
    const rtTotal = allocation.RT.front + (allocation.RT.rear || 0);
    const laTotal = allocation.LA.front;
    const raTotal = allocation.RA.front;
    const llTotal = allocation.LL.front;
    const rlTotal = allocation.RL.front;
    
    if (ltTotal < rtTotal && canAddToLocation(unit, allocation, 'LT')) {
      allocation.LT.front += 1;
      points -= 1;
      continue;
    } else if (rtTotal < ltTotal && canAddToLocation(unit, allocation, 'RT')) {
      allocation.RT.front += 1;
      points -= 1;
      continue;
    } else if (raTotal < laTotal && canAddToLocation(unit, allocation, 'RA')) {
      allocation.RA.front += 1;
      points -= 1;
      continue;
    } else if (laTotal < raTotal && canAddToLocation(unit, allocation, 'LA')) {
      allocation.LA.front += 1;
      points -= 1;
      continue;
    } else if (rlTotal < llTotal && canAddToLocation(unit, allocation, 'RL')) {
      allocation.RL.front += 1;
      points -= 1;
      continue;
    } else if (llTotal < rlTotal && canAddToLocation(unit, allocation, 'LL')) {
      allocation.LL.front += 1;
      points -= 1;
      continue;
    }
    
    // If nothing is uneven, add to CT
    if (canAddToLocation(unit, allocation, 'CT')) {
      allocation.CT.front += 1;
      points -= 1;
      continue;
    }
    
    // If we can't allocate anymore, break
    break;
  }
  
  return allocation;
}

function canAddToLocation(unit: EditableUnit, allocation: ArmorAllocation, location: string): boolean {
  const internal = getInternalStructure(unit, location);
  const maxArmor = internal * 2;
  const currentArmor = (allocation[location]?.front || 0) + (allocation[location]?.rear || 0);
  return currentArmor < maxArmor;
}

function findUnbalancedLocation(allocation: ArmorAllocation): string | null {
  // Check for imbalances in symmetric locations
  const pairs = [
    ['LT', 'RT'],
    ['LA', 'RA'],
    ['LL', 'RL']
  ];
  
  for (const [left, right] of pairs) {
    const leftTotal = (allocation[left]?.front || 0) + (allocation[left]?.rear || 0);
    const rightTotal = (allocation[right]?.front || 0) + (allocation[right]?.rear || 0);
    
    if (leftTotal < rightTotal) return left;
    if (rightTotal < leftTotal) return right;
  }
  
  return null;
}

function createEmptyAllocation(): ArmorAllocation {
  return {
    HEAD: { front: 0 },
    CT: { front: 0, rear: 0 },
    LT: { front: 0, rear: 0 },
    RT: { front: 0, rear: 0 },
    LA: { front: 0 },
    RA: { front: 0 },
    LL: { front: 0 },
    RL: { front: 0 }
  };
}

export function maximizeArmor(unit: EditableUnit, armorType?: any): number {
  const maxTonnage = calculateMaxArmorTonnage(unit, armorType);
  return maxTonnage;
}

export function calculateMaxArmorTonnage(unit: EditableUnit, armorType?: any): number {
  // Maximum armor is based on internal structure
  const maxPoints = calculateMaxArmorPoints(unit);
  
  // Use provided armor type or default to standard
  if (!armorType) {
    armorType = getArmorType('standard');
  }
  
  // Fallback if armor type is still null or missing pointsPerTon
  if (!armorType || !armorType.pointsPerTon) {
    // Hard fallback to standard armor specs
    armorType = {
      pointsPerTon: 16,
      criticalSlots: 0,
      techBase: 'Both'
    };
  }
  
  const pointsPerTon = armorType.pointsPerTon || 16; // Extra safety check
  
  // Calculate weight and round to nearest half-ton
  const armorWeight = maxPoints / pointsPerTon;
  return Math.ceil(armorWeight * 2) / 2;
}

// Helper functions to map test values to proper case
function mapStructureType(type: string): string {
  const mapping: Record<string, string> = {
    'standard': 'Standard',
    'endo-steel': 'Endo Steel',
    'endo-steel (clan)': 'Endo Steel (Clan)',
    'composite': 'Composite',
    'reinforced': 'Reinforced',
    'industrial': 'Industrial'
  };
  return mapping[type.toLowerCase()] || type;
}

function mapEngineType(type: string): string {
  const mapping: Record<string, string> = {
    'standard': 'Standard',
    'xl': 'XL (IS)',
    'xl (is)': 'XL (IS)',
    'xl (clan)': 'XL (Clan)',
    'light': 'Light',
    'xxl': 'XXL',
    'compact': 'Compact',
    'ice': 'ICE',
    'fuel cell': 'Fuel Cell',
    'fission': 'Fission'
  };
  return mapping[type.toLowerCase()] || type;
}

function mapArmorType(type: string): string {
  const mapping: Record<string, string> = {
    'standard': 'Standard',
    'ferro-fibrous': 'Ferro-Fibrous',
    'ferro-fibrous (clan)': 'Ferro-Fibrous (Clan)',
    'light ferro-fibrous': 'Light Ferro-Fibrous',
    'heavy ferro-fibrous': 'Heavy Ferro-Fibrous',
    'stealth': 'Stealth',
    'reactive': 'Reactive',
    'reflective': 'Reflective',
    'hardened': 'Hardened'
  };
  return mapping[type.toLowerCase()] || type;
}

export function calculateRemainingTonnage(unit: EditableUnit): number {
  const totalTonnage = unit.mass || 0;
  let usedTonnage = 0;

  // Structure weight
  const structureType = unit.data?.structure?.type || 'Standard';
  usedTonnage += calculateStructureWeight(totalTonnage, castToStructureType(mapStructureType(structureType)));

  // Engine weight
  const engineRating = unit.data?.engine?.rating || 200;
  const engineType = unit.data?.engine?.type || 'Standard';
  usedTonnage += calculateEngineWeight(engineRating, castToEngineType(mapEngineType(engineType)));

  // Gyro (unchanged for now)
  const gyroType = unit.data?.gyro?.type || 'standard';
  const gyroWeights: { [key: string]: number } = {
    'standard': Math.ceil(engineRating / 100.0),
    'compact': Math.ceil(engineRating / 100.0) * 1.5,
    'heavy-duty': Math.ceil(engineRating / 100.0) * 2,
    'xl': Math.ceil(engineRating / 100.0) * 0.5,
    'none': 0
  };
  usedTonnage += gyroWeights[gyroType] || Math.ceil(engineRating / 100.0);

  // Cockpit (unchanged for now)
  const cockpitType = unit.data?.cockpit?.type || 'standard';
  const cockpitWeights: { [key: string]: number } = {
    'standard': 3,
    'small': 2,
    'command-console': 3,
    'torso-mounted': 4
  };
  usedTonnage += cockpitWeights[cockpitType] || 3;

  // Heat sinks (beyond free engine sinks)
  const totalHeatSinks = unit.data?.heat_sinks?.count || 10;
    const engineHeatSinks = calculateInternalHeatSinksForEngine(engineRating, 'Standard');
  const extraHeatSinks = Math.max(0, totalHeatSinks - engineHeatSinks);
  const heatSinkType = unit.data?.heat_sinks?.type || 'single';
  const heatSinkWeight = 1; // Both single and double are 1 ton each
  usedTonnage += extraHeatSinks * heatSinkWeight;

  // Equipment (unchanged)
  (unit.data?.weapons_and_equipment || []).forEach(item => {
    const equipment = EQUIPMENT_DATABASE.find(e => e.name === item.item_name);
    if (equipment) {
      usedTonnage += equipment.weight || 0;
    }
  });

  // Current armor
  const currentArmorPoints = unit.data?.armor?.total_armor_points || 0;
  const armorTypeId = unit.armorAllocation?.['Center Torso']?.type?.id || 'standard';
  let armorType = getArmorType(armorTypeId);
  if (!armorType || !armorType.pointsPerTon) {
    // Hard fallback to standard armor specs
    armorType = {
      id: 'standard',
      name: 'Standard',
      pointsPerTon: 16,
      criticalSlots: 0,
      techBase: 'Both',
      minTechLevel: 1,
      costMultiplier: 1.0,
      hasRearArmor: true,
    };
  }
  const pointsPerTon = armorType.pointsPerTon || 16; // Extra safety check
  usedTonnage += currentArmorPoints / pointsPerTon;

  // Jump jets (unchanged)
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  const jumpJetWeight = jumpMP * (totalTonnage <= 55 ? 0.5 : totalTonnage <= 85 ? 1.0 : 2.0);
  usedTonnage += jumpJetWeight;

  // Round to nearest half-ton for comparison
  const remaining = totalTonnage - usedTonnage;
  return Math.floor(remaining * 2) / 2;
}

export function calculateRemainingTonnageForArmor(unit: EditableUnit, armorType?: any): number {
  const remainingTonnage = calculateRemainingTonnage(unit);
  
  // Use provided armor type or default to standard
  if (!armorType) {
    armorType = getArmorType('standard');
  }
  
  // Fallback if armor type is still null or missing pointsPerTon
  if (!armorType || !armorType.pointsPerTon) {
    // Hard fallback to standard armor specs
    armorType = {
      pointsPerTon: 16,
      criticalSlots: 0,
      techBase: 'Both'
    };
  }
  
  // Get current armor tonnage
  const currentArmorPoints = unit.data?.armor?.total_armor_points || 0;
  const pointsPerTon = armorType.pointsPerTon || 16; // Extra safety check
  const currentArmorTonnage = currentArmorPoints / pointsPerTon;
  
  // Add remaining tonnage to current armor tonnage
  const newArmorTonnage = currentArmorTonnage + remainingTonnage;
  
  // Ensure we don't exceed maximum armor tonnage
  const maxArmorTonnage = calculateMaxArmorTonnage(unit, armorType);
  const finalTonnage = Math.min(newArmorTonnage, maxArmorTonnage);
  
  // Round to nearest half-ton (using MegaMekLab formula)
  return Math.ceil(finalTonnage * 2) / 2;
}
