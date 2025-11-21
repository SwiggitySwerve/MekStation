/**
 * Jump Jet Calculations Utility
 * Comprehensive system for all BattleTech jump jet variants with proper scaling and limitations
 */

export type JumpJetType = 
  | 'Standard Jump Jet'
  | 'Improved Jump Jet' 
  | 'Extended Jump Jet'
  | 'UMU'
  | 'Mechanical Jump Booster'
  | 'Partial Wing'
  | 'Jump Booster'
  | 'Prototype Jump Jet';

export interface JumpJetVariant {
  id: string;
  name: string;
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  introductionYear: number;
  rulesLevel: 'Standard' | 'Tournament' | 'Advanced' | 'Experimental';
  criticalSlots: number | 'variable'; // Some vary by tonnage
  weightCalculation: 'standard' | 'mechanical' | 'partial_wing';
  maxJumpMP: 'walk' | 'run' | 1; // Movement limit
  heatGeneration: number; // Heat per MP when jumping
  specialRules: string[];
  cost: number; // Base cost per unit
}

export const JUMP_JET_VARIANTS: Record<JumpJetType, JumpJetVariant> = {
  'Standard Jump Jet': {
    id: 'standard_jump_jet',
    name: 'Standard Jump Jet',
    techBase: 'Both',
    introductionYear: 2670,
    rulesLevel: 'Standard',
    criticalSlots: 1,
    weightCalculation: 'standard',
    maxJumpMP: 'walk',
    heatGeneration: 1,
    specialRules: ['Jump MP ≤ Walk MP'],
    cost: 200000
  },
  'Improved Jump Jet': {
    id: 'improved_jump_jet',
    name: 'Improved Jump Jet',
    techBase: 'Inner Sphere',
    introductionYear: 3064,
    rulesLevel: 'Tournament',
    criticalSlots: 2,
    weightCalculation: 'standard',
    maxJumpMP: 'walk',
    heatGeneration: 1,
    specialRules: ['Jump MP ≤ Walk MP', 'Improved efficiency'],
    cost: 500000
  },
  'Extended Jump Jet': {
    id: 'extended_jump_jet',
    name: 'Extended Jump Jet',
    techBase: 'Inner Sphere',
    introductionYear: 3050,
    rulesLevel: 'Experimental',
    criticalSlots: 1,
    weightCalculation: 'standard',
    maxJumpMP: 'run',
    heatGeneration: 1,
    specialRules: ['Jump MP ≤ Run MP', 'Prototype technology'],
    cost: 400000
  },
  'UMU': {
    id: 'umu',
    name: 'UMU (Underwater Maneuvering Unit)',
    techBase: 'Both',
    introductionYear: 2300,
    rulesLevel: 'Standard',
    criticalSlots: 1,
    weightCalculation: 'standard',
    maxJumpMP: 'walk',
    heatGeneration: 1,
    specialRules: ['Jump MP ≤ Walk MP', 'Underwater only'],
    cost: 200000
  },
  'Mechanical Jump Booster': {
    id: 'mechanical_jump_booster',
    name: 'Mechanical Jump Booster',
    techBase: 'Inner Sphere',
    introductionYear: 3057,
    rulesLevel: 'Advanced',
    criticalSlots: 'variable',
    weightCalculation: 'mechanical',
    maxJumpMP: 1,
    heatGeneration: 1,
    specialRules: ['Maximum 1 Jump MP total', 'Very heavy'],
    cost: 1000000
  },
  'Partial Wing': {
    id: 'partial_wing',
    name: 'Partial Wing',
    techBase: 'Inner Sphere',
    introductionYear: 3057,
    rulesLevel: 'Advanced',
    criticalSlots: 'variable',
    weightCalculation: 'partial_wing',
    maxJumpMP: 'walk',
    heatGeneration: 0,
    specialRules: ['Reduces other JJ weight by 50%', 'Multiple locations'],
    cost: 500000
  },
  'Jump Booster': {
    id: 'jump_booster',
    name: 'Jump Booster',
    techBase: 'Clan',
    introductionYear: 3055,
    rulesLevel: 'Tournament',
    criticalSlots: 2,
    weightCalculation: 'standard',
    maxJumpMP: 'walk',
    heatGeneration: 1,
    specialRules: ['Jump MP ≤ Walk MP', 'Clan technology'],
    cost: 600000
  },
  'Prototype Jump Jet': {
    id: 'prototype_jump_jet',
    name: 'Prototype Jump Jet',
    techBase: 'Inner Sphere',
    introductionYear: 2600,
    rulesLevel: 'Experimental',
    criticalSlots: 2,
    weightCalculation: 'standard',
    maxJumpMP: 'walk',
    heatGeneration: 2,
    specialRules: ['Jump MP ≤ Walk MP', 'Unreliable', 'High heat'],
    cost: 150000
  }
};

/**
 * Calculate weight per jump jet based on mech tonnage and jump jet type
 */
export function calculateJumpJetWeight(
  jumpJetType: JumpJetType, 
  mechTonnage: number, 
  jumpMP: number = 1
): number {
  const variant = JUMP_JET_VARIANTS[jumpJetType];
  
  switch (variant.weightCalculation) {
    case 'standard':
      // Standard jump jet weight scaling
      if (mechTonnage <= 55) {
        return 0.5;
      } else if (mechTonnage <= 85) {
        return 1.0;
      } else {
        return 2.0;
      }
      
    case 'mechanical':
      // Mechanical Jump Booster: 10% of mech tonnage per MP
      return mechTonnage * 0.1 * jumpMP;
      
    case 'partial_wing':
      // Partial Wing has fixed weight based on tonnage
      if (mechTonnage <= 55) {
        return 2.0;
      } else if (mechTonnage <= 85) {
        return 3.0;
      } else {
        return 5.0;
      }
      
    default:
      return 0.5;
  }
}

/**
 * Calculate critical slots required for a jump jet type
 */
export function calculateJumpJetCriticalSlots(
  jumpJetType: JumpJetType,
  mechTonnage: number
): number {
  const variant = JUMP_JET_VARIANTS[jumpJetType];
  
  if (typeof variant.criticalSlots === 'number') {
    return variant.criticalSlots;
  }
  
  // Variable critical slots based on tonnage
  switch (jumpJetType) {
    case 'Mechanical Jump Booster':
      // MJB requires many slots based on tonnage
      if (mechTonnage <= 55) {
        return 4;
      } else if (mechTonnage <= 85) {
        return 6;
      } else {
        return 8;
      }
      
    case 'Partial Wing':
      // Partial Wing takes slots in multiple torso locations
      return 6; // 3 per side torso
      
    default:
      return 1;
  }
}

/**
 * Get maximum allowed Jump MP for a jump jet type
 */
export function getMaxAllowedJumpMP(
  jumpJetType: JumpJetType,
  walkMP: number,
  runMP: number
): number {
  const variant = JUMP_JET_VARIANTS[jumpJetType];
  
  switch (variant.maxJumpMP) {
    case 'walk':
      return walkMP;
    case 'run':
      return runMP;
    case 1:
      return 1; // Mechanical Jump Booster limited to 1 MP
    default:
      return walkMP;
  }
}

/**
 * Calculate total weight for all jump jets on a unit
 */
export function calculateTotalJumpJetWeight(
  jumpJetCounts: Partial<Record<JumpJetType, number>>,
  mechTonnage: number,
  hasPartialWing: boolean = false
): number {
  let totalWeight = 0;
  let standardJJWeight = 0; // Track standard JJ weight for partial wing discount
  
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const weightPerJet = calculateJumpJetWeight(jumpJetType, mechTonnage);
    
    if (jumpJetType === 'Partial Wing') {
      totalWeight += weightPerJet; // Partial wing has its own weight
    } else {
      const jetWeight = weightPerJet * count;
      totalWeight += jetWeight;
      
      // Track standard JJ weight for partial wing discount
      if (['Standard Jump Jet', 'Improved Jump Jet', 'Extended Jump Jet', 'UMU', 'Jump Booster'].includes(jumpJetType)) {
        standardJJWeight += jetWeight;
      }
    }
  });
  
  // Apply partial wing discount (50% reduction to other JJ weight)
  if (hasPartialWing && standardJJWeight > 0) {
    totalWeight -= standardJJWeight * 0.5;
  }
  
  return Math.round(totalWeight * 2) / 2; // Round to nearest 0.5 tons
}

/**
 * Calculate total critical slots for all jump jets
 */
export function calculateTotalJumpJetCrits(
  jumpJetCounts: Partial<Record<JumpJetType, number>>,
  mechTonnage: number
): number {
  let totalCrits = 0;
  
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const critsPerJet = calculateJumpJetCriticalSlots(jumpJetType, mechTonnage);
    
    if (jumpJetType === 'Partial Wing') {
      totalCrits += critsPerJet; // Partial wing has fixed crit count
    } else {
      totalCrits += critsPerJet * count;
    }
  });
  
  return totalCrits;
}

/**
 * Validate jump jet configuration
 */
export function validateJumpJetConfiguration(
  jumpJetCounts: Partial<Record<JumpJetType, number>>,
  requestedJumpMP: number,
  walkMP: number,
  runMP: number,
  mechTonnage: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  maxAllowedJumpMP: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if any jump jets are configured
  const totalJumpJets = Object.values(jumpJetCounts).reduce((sum, count) => sum + (count || 0), 0);
  
  if (totalJumpJets === 0 && requestedJumpMP > 0) {
    errors.push('Cannot have Jump MP without jump jets installed');
  }
  
  // Determine maximum allowed Jump MP based on jump jet types
  let maxAllowedJumpMP = 0;
  let hasMechanicalJB = false;
  let hasPartialWing = false;
  
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const typeMax = getMaxAllowedJumpMP(jumpJetType, walkMP, runMP);
    
    if (jumpJetType === 'Mechanical Jump Booster') {
      hasMechanicalJB = true;
      maxAllowedJumpMP = Math.max(maxAllowedJumpMP, 1); // MJB limited to 1
    } else if (jumpJetType === 'Partial Wing') {
      hasPartialWing = true;
      // Partial wing doesn't provide jump MP itself
    } else {
      maxAllowedJumpMP = Math.max(maxAllowedJumpMP, typeMax);
    }
  });
  
  // Special validation for Mechanical Jump Booster
  if (hasMechanicalJB && requestedJumpMP > 1) {
    errors.push('Mechanical Jump Booster limits total Jump MP to 1');
    maxAllowedJumpMP = 1;
  }
  
  // Validate requested Jump MP against maximum
  if (requestedJumpMP > maxAllowedJumpMP) {
    errors.push(`Requested Jump MP (${requestedJumpMP}) exceeds maximum allowed (${maxAllowedJumpMP})`);
  }
  
  // Check for partial wing without other jump jets
  if (hasPartialWing && totalJumpJets === (jumpJetCounts['Partial Wing'] || 0)) {
    errors.push('Partial Wing requires other jump jets to function');
  }
  
  // Validate sufficient jump jets for requested MP
  const standardJumpJets = totalJumpJets - (jumpJetCounts['Partial Wing'] || 0);
  if (requestedJumpMP > standardJumpJets) {
    errors.push(`Insufficient jump jets: ${requestedJumpMP} Jump MP requires ${requestedJumpMP} jump jets (have ${standardJumpJets})`);
  }
  
  // Technology base warnings
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const variant = JUMP_JET_VARIANTS[jumpJetType];
    
    if (variant.rulesLevel === 'Experimental') {
      warnings.push(`${variant.name} is experimental technology`);
    }
    
    if (variant.techBase === 'Clan') {
      warnings.push(`${variant.name} requires Clan technology base`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    maxAllowedJumpMP
  };
}

/**
 * Calculate heat generation from jump jets
 */
export function calculateJumpJetHeat(
  jumpJetCounts: Partial<Record<JumpJetType, number>>,
  jumpMP: number
): number {
  let totalHeat = 0;
  
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const variant = JUMP_JET_VARIANTS[jumpJetType];
    
    // Heat generation per MP of jumping
    if (jumpJetType !== 'Partial Wing') { // Partial wing doesn't generate heat
      totalHeat += variant.heatGeneration * jumpMP;
    }
  });
  
  return totalHeat;
}

/**
 * Calculate cost for jump jet configuration
 */
export function calculateJumpJetCost(
  jumpJetCounts: Partial<Record<JumpJetType, number>>
): number {
  let totalCost = 0;
  
  Object.entries(jumpJetCounts).forEach(([type, count]) => {
    if (!count || count <= 0) return;
    
    const jumpJetType = type as JumpJetType;
    const variant = JUMP_JET_VARIANTS[jumpJetType];
    
    totalCost += variant.cost * count;
  });
  
  return totalCost;
}

/**
 * Get available jump jet types for a tech base and rules level
 */
export function getAvailableJumpJetTypes(
  techBase: 'Inner Sphere' | 'Clan',
  rulesLevel: 'Standard' | 'Tournament' | 'Advanced' | 'Experimental' = 'Standard'
): JumpJetType[] {
  const availableTypes: JumpJetType[] = [];
  
  const rulesLevelHierarchy = ['Standard', 'Tournament', 'Advanced', 'Experimental'];
  const maxLevelIndex = rulesLevelHierarchy.indexOf(rulesLevel);
  
  Object.entries(JUMP_JET_VARIANTS).forEach(([type, variant]) => {
    const variantLevelIndex = rulesLevelHierarchy.indexOf(variant.rulesLevel);
    
    // Check if tech base is compatible
    const techBaseCompatible = variant.techBase === 'Both' || variant.techBase === techBase;
    
    // Check if rules level allows this technology
    const rulesLevelCompatible = variantLevelIndex <= maxLevelIndex;
    
    if (techBaseCompatible && rulesLevelCompatible) {
      availableTypes.push(type as JumpJetType);
    }
  });
  
  return availableTypes;
}
