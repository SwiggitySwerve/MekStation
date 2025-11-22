// Component weight and critical slot calculations for BattleTech units

import { 
  calculateEngineWeight, 
  calculateStructureWeight, 
  calculateGyroWeight as calculateGyroWeightCentralized 
} from '../constants/BattleTechConstructionRules';
import { calculateInternalHeatSinks } from './heatSinkCalculations';
import { calculateArmorWeight } from './armorCalculations';
import { GyroType, StructureType, EngineType, ArmorType } from '../types/core';
import { ComponentConfiguration } from '../types/componentConfiguration';

export interface ComponentWeights {
  structure: number;
  engine: number;
  gyro: number;
  cockpit: number;
  heatSinks: number;
  armor: number;
  jumpJets: number;
  enhancement: number;
  total: number;
}

export interface ComponentCrits {
  structure: number;
  engine: number;
  gyro: number;
  cockpit: number;
  heatSinks: number;
  armor: number;
  jumpJets: number;
  enhancement: number;
  total: number;
}

// Type-safe casting functions for component enums
function castToGyroType(gyroType: string): GyroType {
  const validTypes: GyroType[] = ['Standard', 'XL', 'Compact', 'Heavy-Duty'];
  return validTypes.includes(gyroType as GyroType) ? gyroType as GyroType : 'Standard';
}

function castToStructureType(structureType: string): StructureType {
  const validTypes: StructureType[] = ['Standard', 'Endo Steel', 'Endo Steel (Clan)', 'Composite', 'Reinforced', 'Industrial', 'Endo Steel (IS)'];
  return validTypes.includes(structureType as StructureType) ? structureType as StructureType : 'Standard';
}

function castToEngineType(engineType: string): EngineType {
  const validTypes: EngineType[] = ['Standard', 'XL', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell', 'XL (IS)', 'XL (Clan)'];
  // Normalize XL to XL (IS) if needed, or just trust the cast if it matches any
  if (engineType === 'XL') return 'XL (IS)'; // Default for bare 'XL'
  return validTypes.includes(engineType as EngineType) ? engineType as EngineType : 'Standard';
}

function castToArmorType(armorType: string): ArmorType {
  const validTypes: ArmorType[] = ['Standard', 'Ferro-Fibrous', 'Ferro-Fibrous (Clan)', 'Light Ferro-Fibrous', 'Heavy Ferro-Fibrous', 'Stealth', 'Reactive', 'Reflective', 'Hardened'];
  return validTypes.includes(armorType as ArmorType) ? armorType as ArmorType : 'Standard';
}

// Legacy structure weight calculation - now using centralized module
// export function calculateStructureWeight(tonnage: number, structureType: string = 'Standard'): number {
//   const standardWeight = tonnage * 0.1; // 10% of tonnage
//   
//   switch (structureType) {
//     case 'Endo Steel':
//     case 'Endo Steel (Clan)':
//       return standardWeight * 0.5; // 50% of standard
//     case 'Composite':
//       return standardWeight * 0.5; // 50% of standard
//     case 'Reinforced':
//       return standardWeight * 2; // 200% of standard
//     default:
//       return standardWeight;
//   }
// }

// Legacy engine weight calculation - now using centralized module
// export function calculateEngineWeight(rating: number, engineType: string = 'Fusion'): number {
//   // Base engine weight calculation
//   const baseWeight = Math.ceil(rating / 25) * 0.5;
//   
//   switch (engineType) {
//     case 'XL':
//       return baseWeight * 0.5; // 50% of standard
//     case 'XXL':
//       return baseWeight / 3; // 33% of standard
//     case 'Light':
//       return baseWeight * 0.75; // 75% of standard
//     case 'Compact':
//       return baseWeight * 1.5; // 150% of standard
//     case 'ICE':
//       return baseWeight * 2; // 200% of standard
//     case 'Fuel Cell':
//       return baseWeight * 1.2; // 120% of standard
//     default:
//       return baseWeight;
//   }
// }

// Calculate gyro weight based on engine rating and type
export function calculateGyroWeight(engineRating: number, gyroType: string = 'Standard'): number {
  return calculateGyroWeightCentralized(engineRating, castToGyroType(gyroType));
}

// Calculate cockpit weight based on type
export function calculateCockpitWeight(cockpitType: string = 'Standard Cockpit'): number {
  switch (cockpitType) {
    case 'Small Cockpit':
      return 2;
    case 'Command Console':
      return 3;
    case 'Torso-Mounted':
      return 4;
    case 'Primitive':
      return 5;
    default: // Standard
      return 3;
  }
}

// Calculate heat sink weight beyond the 10 free
export function calculateHeatSinkWeight(count: number, type: string = 'Single'): number {
  const freeHeatSinks = 10;
  const extraHeatSinks = Math.max(0, count - freeHeatSinks);
  const weightPerSink = type === 'Double' ? 1 : 1;
  
  return extraHeatSinks * weightPerSink;
}

// Calculate jump jet weight - legacy function for compatibility
export function calculateJumpJetWeight(jumpMP: number, tonnage: number, jumpType: string = 'Jump Jet'): number {
  if (jumpMP === 0) return 0;
  
  // Legacy weight calculation for compatibility
  let weightPerJet: number;
  
  if (jumpType === 'Jump Jet' || jumpType === 'Standard Jump Jet' || jumpType === 'UMU') {
    // Standard jump jet weight scaling
    if (tonnage <= 55) {
      weightPerJet = 0.5;
    } else if (tonnage <= 85) {
      weightPerJet = 1;
    } else {
      weightPerJet = 2;
    }
  } else if (jumpType === 'Mechanical Jump Booster') {
    // MJB weighs 10% of mech tonnage per MP
    weightPerJet = tonnage * 0.1;
  } else {
    // Default to standard scaling for other types
    if (tonnage <= 55) {
      weightPerJet = 0.5;
    } else if (tonnage <= 85) {
      weightPerJet = 1;
    } else {
      weightPerJet = 2;
    }
  }
  
  return jumpMP * weightPerJet;
}

// Calculate enhancement weight (MASC, TSM, etc.)
export function calculateEnhancementWeight(tonnage: number, enhancements?: ComponentConfiguration[]): number {
  if (!enhancements || enhancements.length === 0) return 0;
  
  let totalWeight = 0;
  for (const enhancement of enhancements) {
    switch (enhancement.type) {
      case 'MASC':
        totalWeight += Math.ceil(tonnage * 0.05);
        break;
      case 'Triple Strength Myomer':
        totalWeight += Math.ceil(tonnage * 0.07);
        break;
      case 'Supercharger':
        totalWeight += Math.ceil(tonnage * 0.05);
        break;
      default:
        // Unknown enhancement type, no weight
        break;
    }
  }
  
  return totalWeight;
}

// Calculate total component weights
export function calculateComponentWeights(unit: any): ComponentWeights {
  const tonnage = unit.mass || 20;
  const structureType = unit.data?.structure?.type || 'Standard';
  const engineRating = (unit.data?.movement?.walk_mp || 1) * tonnage;
  const engineType = unit.data?.engine?.type || 'Standard';
  const gyroType = unit.data?.gyro?.type || 'Standard';
  const cockpitType = unit.data?.cockpit?.type || 'Standard Cockpit';
  const heatSinkCount = unit.data?.heat_sinks?.count || 10;
  const heatSinkType = unit.data?.heat_sinks?.type || 'Single';
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  const jumpType = unit.data?.movement?.jump_type || 'Jump Jet';
  const armorPoints = unit.data?.armor?.total_armor_points || 0;
  const armorType = unit.data?.armor?.type || 'Standard';
  const enhancements = unit.data?.enhancements || [];
  
  const weights = {
    structure: calculateStructureWeight(tonnage, castToStructureType(structureType)),
    engine: calculateEngineWeight(engineRating, castToEngineType(engineType)),
    gyro: calculateGyroWeightCentralized(engineRating, castToGyroType(gyroType)),
    cockpit: calculateCockpitWeight(cockpitType),
    heatSinks: calculateHeatSinkWeight(heatSinkCount, heatSinkType),
    armor: calculateArmorWeight(armorPoints, castToArmorType(armorType)),
    jumpJets: calculateJumpJetWeight(jumpMP, tonnage, jumpType),
    enhancement: calculateEnhancementWeight(tonnage, enhancements),
    total: 0
  };
  
  weights.total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
  return weights;
}

// Calculate critical slots for components
export function calculateComponentCrits(unit: any): ComponentCrits {
  const structureType = unit.data?.structure?.type || 'Standard';
  const engineType = unit.data?.engine?.type || 'Fusion';
  const engineRating = (unit.data?.movement?.walk_mp || 1) * (unit.mass || 20);
  const gyroType = unit.data?.gyro?.type || 'Standard';
  const cockpitType = unit.data?.cockpit?.type || 'Standard Cockpit';
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  const jumpType = unit.data?.movement?.jump_type || 'Jump Jet';
  const armorType = unit.data?.armor?.type || 'Standard';
  const enhancements = unit.data?.enhancements || [];
  const heatSinkType = unit.data?.heat_sinks?.type || 'Single';
  const heatSinkCount = unit.data?.heat_sinks?.count || 10;
  
  const crits = {
    structure: 0,
    engine: 0,
    gyro: 0,
    cockpit: 0,
    heatSinks: 0,
    armor: 0,
    jumpJets: jumpMP, // 1 crit per jump jet
    enhancement: 0,
    total: 0
  };
  
  // Structure crits
  switch (structureType) {
    case 'Endo Steel':
      crits.structure = 14;
      break;
    case 'Endo Steel (Clan)':
      crits.structure = 7;
      break;
    case 'Composite':
      crits.structure = 0;
      break;
    case 'Reinforced':
      crits.structure = 0;
      break;
  }
  
  // Engine crits (in side torsos)
  switch (engineType) {
    case 'XL':
      crits.engine = 6; // 3 per side torso
      break;
    case 'XXL':
      crits.engine = 12; // 6 per side torso
      break;
    case 'Light':
      crits.engine = 4; // 2 per side torso
      break;
    case 'Compact':
      crits.engine = 0;
      break;
    case 'ICE':
    case 'Fuel Cell':
      crits.engine = 6;
      break;
    default:
      crits.engine = 0;
  }
  
  // Gyro crits
  switch (gyroType) {
    case 'Standard':
      crits.gyro = 4;
      break;
    case 'XL':
      crits.gyro = 6;
      break;
    case 'Compact':
      crits.gyro = 2;
      break;
    case 'Heavy Duty':
      crits.gyro = 4;
      break;
    case 'None':
      crits.gyro = 0;
      break;
  }
  
  // Cockpit crits
  switch (cockpitType) {
    case 'Small Cockpit':
      crits.cockpit = 1;
      break;
    case 'Torso-Mounted':
      crits.cockpit = 1; // In CT
      break;
    case 'Command Console':
      crits.cockpit = 2;
      break;
    default:
      crits.cockpit = 1;
  }
  
  // Heat sink crits (only for extras beyond engine capacity)
  const engineCapacity = calculateInternalHeatSinks(engineRating);
  const externalHeatSinks = Math.max(0, heatSinkCount - engineCapacity);
  crits.heatSinks = heatSinkType === 'Double' ? externalHeatSinks * 3 : externalHeatSinks;
  
  // Armor crits
  switch (armorType) {
    case 'Ferro-Fibrous':
      crits.armor = 14;
      break;
    case 'Stealth':
      crits.armor = 12;
      break;
    default:
      crits.armor = 0;
  }
  
  // Enhancement crits
  for (const enhancement of enhancements) {
    switch (enhancement.type) {
      case 'MASC':
        crits.enhancement = Math.ceil((unit.mass || 20) / 20); // 1 per 20 tons
        break;
      case 'Triple Strength Myomer':
      case 'Industrial TSM':
        crits.enhancement = 6; // 1 per location except head
        break;
    }
  }
  
  crits.total = Object.values(crits).reduce((sum, crit) => sum + crit, 0);
  
  return crits;
}

// Use centralized heat sink calculation
export function calculateEngineFreeHeatSinks(engineRating: number, engineType: string = 'Fusion'): number {
  const { calculateInternalHeatSinksForEngine } = require('./heatSinkCalculations');
  return calculateInternalHeatSinksForEngine(engineRating, engineType);
}

// Get availability code for a component
export function getComponentAvailability(componentType: string, techBase: string = 'Inner Sphere'): string {
  // This is a simplified version - in reality, each component would have specific availability
  // Format: TechBase/Intro-Standard-Advanced-Experimental
  const prefix = techBase === 'Clan' ? 'C' : 'D';
  
  const availabilityMap: Record<string, string> = {
    'Standard': `${prefix}/C-C-C-C`,
    'Endo Steel': `${prefix}/E-D-C-C`,
    'Endo Steel (Clan)': 'C/D-C-C-C',
    'XL': `${prefix}/E-D-C-C`,
    'XXL': `${prefix}/X-E-D-C`,
    'Double': `${prefix}/E-D-C-C`,
    'MASC': `${prefix}/E-D-C-C`,
    'Triple Strength Myomer': `${prefix}/E-E-D-C`,
  };
  
  return availabilityMap[componentType] || `${prefix}/C-C-C-C`;
}

// Component introduction years
const componentIntroductionYears: Record<string, number> = {
  // Structure
  'Standard': 2439,
  'Endo Steel': 2487,
  'Endo Steel (Clan)': 2827,
  'Composite': 3061,
  'Reinforced': 3057,
  
  // Engines
  'Fusion': 2439,
  'XL': 2579,
  'XXL': 3055,
  'Light': 3055,
  'Compact': 3068,
  'ICE': 2300,
  'Fuel Cell': 2300,
  
  // Gyros
  'Standard Gyro': 2439,
  'XL Gyro': 3067,
  'Compact Gyro': 3068,
  'Heavy Duty Gyro': 3067,
  
  // Cockpits
  'Standard Cockpit': 2439,
  'Small Cockpit': 3067,
  'Torso-Mounted': 3053,
  'Command Console': 3052,
  'Primitive': 2439,
  
  // Heat Sinks
  'Single': 2439,
  'Double': 2567,
  
  // Armor
  'Standard Armor': 2439,
  'Ferro-Fibrous': 2571,
  'Stealth': 3063,
  
  // Enhancements
  'MASC': 2740,
  'Triple Strength Myomer': 3050,
  'Industrial TSM': 3055,
  
  // Jump Jets
  'Jump Jet': 2439,
  'UMU': 2439,
  'Mechanical Jump Booster': 3057,
};

// Calculate earliest possible year for a unit based on its components
export function calculateEarliestPossibleYear(unit: any): number {
  const years: number[] = [];
  
  // Structure
  const structureType = unit.data?.structure?.type || 'Standard';
  years.push(componentIntroductionYears[structureType] || 2439);
  
  // Engine
  const engineType = unit.data?.engine?.type || 'Fusion';
  years.push(componentIntroductionYears[engineType] || 2439);
  
  // Gyro
  const gyroType = unit.data?.gyro?.type || 'Standard';
  years.push(componentIntroductionYears[gyroType + ' Gyro'] || componentIntroductionYears[gyroType] || 2439);
  
  // Cockpit
  const cockpitType = unit.data?.cockpit?.type || 'Standard Cockpit';
  years.push(componentIntroductionYears[cockpitType] || 2439);
  
  // Heat Sinks
  const heatSinkType = unit.data?.heat_sinks?.type || 'Single';
  years.push(componentIntroductionYears[heatSinkType] || 2439);
  
  // Armor
  const armorType = unit.data?.armor?.type || 'Standard';
  years.push(componentIntroductionYears[armorType + ' Armor'] || componentIntroductionYears[armorType] || 2439);
  
  // Enhancement
  const enhancements = unit.data?.enhancements || [];
  for (const enhancement of enhancements) {
    years.push(componentIntroductionYears[enhancement.type] || 2439);
  }
  
  // Jump Type
  const jumpType = unit.data?.movement?.jump_type || 'Jump Jet';
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  if (jumpMP > 0) {
    years.push(componentIntroductionYears[jumpType] || 2439);
  }
  
  // Equipment - check all weapons and equipment
  if (unit.data?.weapons_and_equipment) {
    unit.data.weapons_and_equipment.forEach((item: any) => {
      // This would need a proper equipment database lookup
      // For now, we'll use some common examples
      const equipmentYears: Record<string, number> = {
        'ER PPC': 2751,
        'Gauss Rifle': 2590,
        'LB 10-X AC': 2595,
        'Ultra AC/5': 2640,
        'Streak SRM 2': 2647,
        'ER Large Laser': 2620,
        'Pulse Laser': 2609,
        'TAG': 2600,
        'C3 Master': 3050,
        'C3 Slave': 3050,
      };
      
      // Check if the item name contains any of our known equipment
      for (const [equip, year] of Object.entries(equipmentYears)) {
        if (item.item_name.includes(equip)) {
          years.push(year);
          break;
        }
      }
    });
  }
  
  // Return the latest year (most restrictive)
  return Math.max(...years);
}

// Calculate total equipment heat
export function calculateEquipmentHeat(unit: any): number {
  let totalHeat = 0;
  
  if (unit.data?.weapons_and_equipment) {
    unit.data.weapons_and_equipment.forEach((item: any) => {
      // Simple heat values for common weapons
      const weaponHeat: Record<string, number> = {
        'PPC': 10,
        'ER PPC': 15,
        'Large Laser': 8,
        'ER Large Laser': 12,
        'Medium Laser': 3,
        'ER Medium Laser': 5,
        'Small Laser': 1,
        'ER Small Laser': 2,
        'AC/20': 7,
        'AC/10': 3,
        'AC/5': 1,
        'AC/2': 1,
        'Ultra AC/20': 8,
        'Ultra AC/10': 4,
        'Ultra AC/5': 2,
        'Ultra AC/2': 1,
        'LB 10-X AC': 2,
        'Gauss Rifle': 1,
        'SRM 6': 4,
        'SRM 4': 3,
        'SRM 2': 2,
        'Streak SRM 6': 4,
        'Streak SRM 4': 3,
        'Streak SRM 2': 2,
        'LRM 20': 6,
        'LRM 15': 5,
        'LRM 10': 4,
        'LRM 5': 2,
      };
      
      // Check if the item is a weapon and get its heat
      for (const [weapon, heat] of Object.entries(weaponHeat)) {
        if (item.item_name.includes(weapon)) {
          totalHeat += heat;
          break;
        }
      }
      
      // Additional heat from equipment
      if (item.item_name.includes('MASC')) {
        totalHeat += 5; // MASC generates heat when used
      }
    });
  }
  
  // Jump jets generate heat (1 per MP used)
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  if (jumpMP > 0) {
    totalHeat += jumpMP; // Heat when jumping full distance
  }
  
  return totalHeat;
}
