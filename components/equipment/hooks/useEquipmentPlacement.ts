import { useState, useCallback } from 'react';
import { FullEquipment } from '../../../types';
import { EditableUnit, CriticalSlotAssignment } from '../../../types/editor';
import { SystemComponentRules } from '../../../utils/criticalSlots/SystemComponentRules';
import { ComponentConfiguration as CoreComponentConfiguration } from '../../../types/componentConfiguration';

export interface PlacementOptions {
  strategy: 'balanced' | 'concentrated' | 'distributed' | 'manual';
  prioritize: 'protection' | 'heat' | 'weight' | 'criticals';
  restrictions: {
    noExplosivesInCT: boolean;
    caseProtection: boolean;
    symmetricArms: boolean;
    avoidHead: boolean;
  };
}

export interface PlacementSuggestion {
  location: string;
  score: number;
  reasons: string[];
  warnings: string[];
  slots: number[];
}

export interface PlacementResult {
  placements: {
    equipment: FullEquipment;
    location: string;
    slots: number[];
    success: boolean;
    error?: string;
  }[];
  warnings: string[];
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OptimizationResult {
  changes: {
    equipment: string;
    fromLocation: string;
    toLocation: string;
    reason: string;
  }[];
  improvementScore: number;
  warnings: string[];
}

interface LocationScore {
  location: string;
  score: number;
  reasons: string[];
  warnings: string[];
}

const DEFAULT_OPTIONS: PlacementOptions = {
  strategy: 'balanced',
  prioritize: 'protection',
  restrictions: {
    noExplosivesInCT: true,
    caseProtection: true,
    symmetricArms: true,
    avoidHead: true,
  },
};

export interface UseEquipmentPlacementReturn {
  suggestPlacement: (equipment: FullEquipment, unit: EditableUnit) => PlacementSuggestion[];
  autoPlace: (equipment: FullEquipment[], unit: EditableUnit, options?: PlacementOptions) => PlacementResult;
  validatePlacement: (equipment: FullEquipment, location: string, unit: EditableUnit) => ValidationResult;
  optimizePlacements: (unit: EditableUnit, options?: PlacementOptions) => OptimizationResult;
  placementOptions: PlacementOptions;
  setPlacementOptions: (options: Partial<PlacementOptions>) => void;
}

// Location priority maps for different strategies
const LOCATION_PRIORITIES: Record<string, Record<string, number>> = {
  balanced: {
    'Right Torso': 85,
    'Left Torso': 85,
    'Right Arm': 80,
    'Left Arm': 80,
    'Center Torso': 70,
    'Right Leg': 60,
    'Left Leg': 60,
    'Head': 30,
  },
  concentrated: {
    'Right Torso': 90,
    'Left Torso': 90,
    'Center Torso': 85,
    'Right Arm': 70,
    'Left Arm': 70,
    'Right Leg': 50,
    'Left Leg': 50,
    'Head': 20,
  },
  distributed: {
    'Right Arm': 90,
    'Left Arm': 90,
    'Right Leg': 85,
    'Left Leg': 85,
    'Right Torso': 70,
    'Left Torso': 70,
    'Center Torso': 60,
    'Head': 40,
  },
  manual: {
    // All locations equal priority for manual placement
    'Right Torso': 50,
    'Left Torso': 50,
    'Right Arm': 50,
    'Left Arm': 50,
    'Center Torso': 50,
    'Right Leg': 50,
    'Left Leg': 50,
    'Head': 50,
  },
};

export function useEquipmentPlacement(): UseEquipmentPlacementReturn {
  const [placementOptions, setOptions] = useState<PlacementOptions>(DEFAULT_OPTIONS);

  const setPlacementOptions = useCallback((options: Partial<PlacementOptions>) => {
    setOptions(prev => ({
      ...prev,
      ...options,
      restrictions: {
        ...prev.restrictions,
        ...(options.restrictions || {}),
      },
    }));
  }, []);

  // Get critical slots for a specific location
  const getCriticalSlotsForLocation = useCallback((
    location: string,
    criticalSlots: CriticalSlotAssignment[]
  ): CriticalSlotAssignment[] => {
    return criticalSlots.filter(slot => slot.location === location);
  }, []);

  // Calculate available slots in a location
  const getAvailableSlots = useCallback((location: string, unit: EditableUnit): number[] => {
    const locationSlots = getCriticalSlotsForLocation(location, unit.criticalSlots || []);
    const availableSlots: number[] = [];
    
    // Assume 12 slots per location for mechs
    for (let i = 0; i < 12; i++) {
      const slotAssignment = locationSlots.find(slot => slot.slotIndex === i);
      if (!slotAssignment || slotAssignment.isEmpty) {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  }, [getCriticalSlotsForLocation]);

  // Check if equipment can fit in location
  const canFitInLocation = useCallback((
    equipment: FullEquipment,
    location: string,
    unit: EditableUnit
  ): { canFit: boolean; slots: number[] } => {
    const availableSlots = getAvailableSlots(location, unit);
    const slotsNeeded = equipment.space || 1;
    
    // Check for contiguous slots
    for (let i = 0; i <= availableSlots.length - slotsNeeded; i++) {
      let hasContiguousSlots = true;
      const potentialSlots: number[] = [];
      
      for (let j = 0; j < slotsNeeded; j++) {
        const slotIndex = availableSlots[i] + j;
        if (!availableSlots.includes(slotIndex) || (j > 0 && slotIndex !== availableSlots[i] + j)) {
          hasContiguousSlots = false;
          break;
        }
        potentialSlots.push(slotIndex);
      }
      
      if (hasContiguousSlots && potentialSlots.length === slotsNeeded) {
        return { canFit: true, slots: potentialSlots };
      }
    }
    
    return { canFit: false, slots: [] };
  }, [getAvailableSlots]);

  // Check if location has CASE protection
  const hasCASE = useCallback((location: string, unit: EditableUnit): boolean => {
    const locationSlots = getCriticalSlotsForLocation(location, unit.criticalSlots || []);
    return locationSlots.some(slot => 
      slot.equipment?.name?.includes('CASE') ?? false
    );
  }, [getCriticalSlotsForLocation]);

  // Check if location has matching weapon
  const hasMatchingWeapon = useCallback((
    weaponType: string,
    location: string,
    unit: EditableUnit
  ): boolean => {
    const locationSlots = getCriticalSlotsForLocation(location, unit.criticalSlots || []);
    return locationSlots.some(slot => 
      slot.equipment?.name?.includes(weaponType) ?? false
    );
  }, [getCriticalSlotsForLocation]);

  // Calculate heat in location
  const getLocationHeat = useCallback((location: string, unit: EditableUnit): number => {
    const locationSlots = getCriticalSlotsForLocation(location, unit.criticalSlots || []);
    return locationSlots.reduce((total, slot) => {
      return total + (slot.equipment?.heat || 0);
    }, 0);
  }, [getCriticalSlotsForLocation]);

  // Score a location for equipment placement
  const scoreLocation = useCallback((
    equipment: FullEquipment,
    location: string,
    unit: EditableUnit,
    options: PlacementOptions
  ): LocationScore => {
    const baseScore = LOCATION_PRIORITIES[options.strategy][location] || 50;
    let score = baseScore;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check if equipment can fit
    const { canFit } = canFitInLocation(equipment, location, unit);
    if (!canFit) {
      return { location, score: 0, reasons: ['No space available'], warnings };
    }

    // Apply restrictions
    if (options.restrictions.avoidHead && location === 'Head' && equipment.type !== 'Sensor') {
      score -= 50;
      warnings.push('Head location should be reserved for sensors');
    }

    if (options.restrictions.noExplosivesInCT && location === 'Center Torso') {
      if (equipment.type === 'Ammunition' || equipment.name.includes('Gauss')) {
        score -= 100;
        warnings.push('Explosive equipment in Center Torso is dangerous');
      }
    }

    // Ammunition placement considerations
    if (equipment.type === 'Ammunition') {
      // Check for CASE protection
      const hasProtection = hasCASE(location, unit);
      
      if (options.restrictions.caseProtection && !hasProtection && !location.includes('Arm')) {
        score -= 30;
        warnings.push('Location lacks CASE protection');
      }

      // Prefer locations with matching weapons
      const weaponType = equipment.name.replace(' Ammo', '').replace('Ammo', '').trim();
      if (hasMatchingWeapon(weaponType, location, unit)) {
        score += 20;
        reasons.push('Near matching weapon');
      }
    }

    // Weapon placement considerations
    if (equipment.type.includes('Weapon')) {
      // Arm weapons get firing arc bonus
      if (location.includes('Arm')) {
        score += 15;
        reasons.push('Better firing arc');
      }

      // Symmetric placement for paired weapons
      if (options.restrictions.symmetricArms && location.includes('Arm')) {
        const oppositeArm = location.includes('Right') ? 'Left Arm' : 'Right Arm';
        const oppositeSlots = getCriticalSlotsForLocation(oppositeArm, unit.criticalSlots || []);
        const hasSimilarWeapon = oppositeSlots.some(slot =>
          slot.equipment?.type === equipment.type
        );
        
        if (hasSimilarWeapon) {
          score += 10;
          reasons.push('Maintains symmetry');
        }
      }

      // Heat distribution
      if (options.prioritize === 'heat' && equipment.heat) {
        const locationHeat = getLocationHeat(location, unit);

        if (locationHeat < 10) {
          score += 10;
          reasons.push('Good heat distribution');
        } else {
          score -= 10;
          warnings.push('High heat concentration');
        }
      }
    }

    // Weight distribution
    if (options.prioritize === 'weight') {
      // Prefer lower locations for heavy equipment
      if (equipment.weight && equipment.weight > 5) {
        if (location.includes('Leg')) {
          score += 10;
          reasons.push('Lower center of gravity');
        } else if (location === 'Head') {
          score -= 20;
          warnings.push('Heavy equipment in head affects balance');
        }
      }
    }

    // Critical space optimization
    if (options.prioritize === 'criticals') {
      const availableSlots = getAvailableSlots(location, unit).length;
      const efficiency = (equipment.space || 1) / availableSlots;
      
      if (efficiency > 0.8) {
        score += 15;
        reasons.push('Efficient space usage');
      } else if (efficiency < 0.2) {
        score -= 10;
        warnings.push('Poor space utilization');
      }
    }

    return { location, score, reasons, warnings };
  }, [canFitInLocation, hasCASE, hasMatchingWeapon, getLocationHeat, getCriticalSlotsForLocation, getAvailableSlots]);

  // Suggest best placements for equipment
  const suggestPlacement = useCallback((
    equipment: FullEquipment,
    unit: EditableUnit
  ): PlacementSuggestion[] => {
    const locations = Object.keys(LOCATION_PRIORITIES[placementOptions.strategy]);
    const suggestions: PlacementSuggestion[] = [];

    locations.forEach(location => {
      const { canFit, slots } = canFitInLocation(equipment, location, unit);
      if (canFit) {
        const { score, reasons, warnings } = scoreLocation(equipment, location, unit, placementOptions);
        suggestions.push({
          location,
          score,
          reasons,
          warnings,
          slots,
        });
      }
    });

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score);
  }, [placementOptions, canFitInLocation, scoreLocation]);

  // Auto-place multiple equipment items
  const autoPlace = useCallback((
    equipment: FullEquipment[],
    unit: EditableUnit,
    options: PlacementOptions = placementOptions
  ): PlacementResult => {
    const placements: PlacementResult['placements'] = [];
    const warnings: string[] = [];
    let totalScore = 0;
    
    // Create a copy of the unit to track placements
    const workingUnit = JSON.parse(JSON.stringify(unit)) as EditableUnit;

    // Sort equipment by priority (weapons first, then ammo, then equipment)
    const sortedEquipment = [...equipment].sort((a, b) => {
      const priorityA = a.type.includes('Weapon') ? 3 : a.type === 'Ammunition' ? 1 : 2;
      const priorityB = b.type.includes('Weapon') ? 3 : b.type === 'Ammunition' ? 1 : 2;
      return priorityB - priorityA;
    });

    sortedEquipment.forEach(item => {
      const suggestions = suggestPlacement(item, workingUnit);
      
      if (suggestions.length > 0) {
        const bestSuggestion = suggestions[0];
        
        // Place equipment in working unit's critical slots
        bestSuggestion.slots.forEach(slotIndex => {
          const existingSlotIndex = workingUnit.criticalSlots.findIndex(
            slot => slot.location === bestSuggestion.location && slot.slotIndex === slotIndex
          );
          
          if (existingSlotIndex >= 0) {
            workingUnit.criticalSlots[existingSlotIndex] = {
              ...workingUnit.criticalSlots[existingSlotIndex],
              equipment: item,
              isEmpty: false,
            };
          } else {
            workingUnit.criticalSlots.push({
              location: bestSuggestion.location,
              slotIndex,
              equipment: item,
              isFixed: false,
              isEmpty: false,
            });
          }
        });

        placements.push({
          equipment: item,
          location: bestSuggestion.location,
          slots: bestSuggestion.slots,
          success: true,
        });

        totalScore += bestSuggestion.score;
        warnings.push(...bestSuggestion.warnings);
      } else {
        placements.push({
          equipment: item,
          location: '',
          slots: [],
          success: false,
          error: 'No valid placement found',
        });
        warnings.push(`Could not place ${item.name}`);
      }
    });

    return {
      placements,
      warnings: Array.from(new Set(warnings)), // Remove duplicates
      score: totalScore / Math.max(placements.length, 1),
    };
  }, [placementOptions, suggestPlacement]);

  // Validate a specific placement
  const validatePlacement = useCallback((
    equipment: FullEquipment,
    location: string,
    unit: EditableUnit
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if location exists
    if (!LOCATION_PRIORITIES[placementOptions.strategy][location]) {
      errors.push(`Invalid location: ${location}`);
    }

    // Check if equipment can fit
    const { canFit } = canFitInLocation(equipment, location, unit);
    if (!canFit) {
      errors.push(`Not enough space in ${location} for ${equipment.name}`);
    }

    // Enforce Supercharger rule: must be placed in a location that currently has engine slots
    const isSupercharger = equipment.name?.toLowerCase() === 'supercharger' || equipment.baseType === 'Supercharger';
    if (isSupercharger) {
      // Derive engine and gyro types from unit
      const engineType = (unit as any)?.engineType || 'Standard';
      const gyroValue = (unit as any)?.gyroType || 'Standard';
      const gyroType: CoreComponentConfiguration =
        typeof gyroValue === 'string' ? { type: gyroValue, techBase: (unit as any)?.techBase || 'Inner Sphere' } : gyroValue;

      const engineSlots = SystemComponentRules.getEngineAllocation(engineType as any, gyroType);
      const hasEngineSlotsInLocation = (
        (location === 'Center Torso' && engineSlots.centerTorso.length > 0) ||
        (location === 'Left Torso' && engineSlots.leftTorso.length > 0) ||
        (location === 'Right Torso' && engineSlots.rightTorso.length > 0)
      );
      if (!hasEngineSlotsInLocation) {
        errors.push('Supercharger must be placed in a torso location that contains engine slots');
      }
    }

    // Check restrictions
    if (placementOptions.restrictions.noExplosivesInCT && 
        location === 'Center Torso' && 
        (equipment.type === 'Ammunition' || equipment.name.includes('Gauss'))) {
      errors.push('Explosive equipment cannot be placed in Center Torso');
    }

    // Check for warnings
    const { warnings: locationWarnings } = scoreLocation(equipment, location, unit, placementOptions);
    warnings.push(...locationWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, [placementOptions, canFitInLocation, scoreLocation]);

  // Optimize existing placements
  const optimizePlacements = useCallback((
    unit: EditableUnit,
    options: PlacementOptions = placementOptions
  ): OptimizationResult => {
    const changes: OptimizationResult['changes'] = [];
    const currentPlacements: { equipment: FullEquipment; location: string }[] = [];
    
    // Collect current equipment placements
    const equipmentByLocation = new Map<string, FullEquipment[]>();
    
    unit.criticalSlots.forEach(slot => {
      if (slot.equipment && !slot.isFixed) {
        if (!equipmentByLocation.has(slot.location)) {
          equipmentByLocation.set(slot.location, []);
        }
        const locationEquipment = equipmentByLocation.get(slot.location)!;
        if (!locationEquipment.find(eq => eq.id === slot.equipment!.id)) {
          locationEquipment.push(slot.equipment);
          currentPlacements.push({ equipment: slot.equipment, location: slot.location });
        }
      }
    });

    // Calculate current score
    let currentScore = 0;
    currentPlacements.forEach(({ equipment, location }) => {
      const { score } = scoreLocation(equipment, location, unit, options);
      currentScore += score;
    });

    // Try to optimize each equipment placement
    const workingUnit = JSON.parse(JSON.stringify(unit)) as EditableUnit;
    let optimizedScore = currentScore;

    currentPlacements.forEach(({ equipment, location: currentLocation }) => {
      // Remove equipment from current location in working unit
      workingUnit.criticalSlots = workingUnit.criticalSlots.map(slot => {
        if (slot.location === currentLocation && slot.equipment?.id === equipment.id) {
          return { ...slot, equipment: undefined, isEmpty: true };
        }
        return slot;
      });

      // Find better placement
      const suggestions = suggestPlacement(equipment, workingUnit);
      if (suggestions.length > 0 && suggestions[0].location !== currentLocation) {
        const bestLocation = suggestions[0].location;
        const currentLocationScore = scoreLocation(equipment, currentLocation, unit, options).score;
        const improvement = suggestions[0].score - currentLocationScore;
        
        if (improvement > 10) { // Only suggest if significant improvement
          changes.push({
            equipment: equipment.name,
            fromLocation: currentLocation,
            toLocation: bestLocation,
            reason: suggestions[0].reasons[0] || 'Better placement',
          });
          
          optimizedScore += improvement;
          
          // Update working unit with new placement
          suggestions[0].slots.forEach(slotIndex => {
            const existingSlotIndex = workingUnit.criticalSlots.findIndex(
              slot => slot.location === bestLocation && slot.slotIndex === slotIndex
            );
            
            if (existingSlotIndex >= 0) {
              workingUnit.criticalSlots[existingSlotIndex] = {
                ...workingUnit.criticalSlots[existingSlotIndex],
                equipment,
                isEmpty: false,
              };
            }
          });
        } else {
          // Keep in current location - restore the equipment
          workingUnit.criticalSlots = workingUnit.criticalSlots.map(slot => {
            if (slot.location === currentLocation && 
                unit.criticalSlots.find(s => s.location === slot.location && 
                                            s.slotIndex === slot.slotIndex && 
                                            s.equipment?.id === equipment.id)) {
              return { ...slot, equipment, isEmpty: false };
            }
            return slot;
          });
        }
      }
    });

    return {
      changes,
      improvementScore: optimizedScore - currentScore,
      warnings: changes.length === 0 ? ['Placements are already optimal'] : [],
    };
  }, [placementOptions, scoreLocation, suggestPlacement]);

  return {
    suggestPlacement,
    autoPlace,
    validatePlacement,
    optimizePlacements,
    placementOptions,
    setPlacementOptions,
  };
}
