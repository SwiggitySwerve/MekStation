import { useMemo } from 'react';
import { ArmorLocationData } from './useArmorCalculations';

export interface ArmorValidationError {
  location: string;
  type: 'excess' | 'invalid' | 'balance';
  message: string;
  severity: 'error' | 'warning';
}

export interface ArmorValidationResult {
  isValid: boolean;
  errors: ArmorValidationError[];
  warnings: ArmorValidationError[];
}

export function useArmorValidation(
  locations: Record<string, ArmorLocationData>,
  totalArmorTonnage: number,
  maxArmorTonnage: number
): ArmorValidationResult {
  return useMemo(() => {
    const errors: ArmorValidationError[] = [];
    const warnings: ArmorValidationError[] = [];

    // Check each location for violations
    Object.values(locations).forEach((location) => {
      const total = location.front + location.rear;
      
      // Check if armor exceeds maximum
      if (total > location.max) {
        errors.push({
          location: location.location,
          type: 'excess',
          message: `Armor (${total}) exceeds maximum (${location.max})`,
          severity: 'error',
        });
      }

      // Check rear armor ratio for torso locations
      if (location.hasRear && location.front > 0) {
        const rearRatio = location.rear / (location.front + location.rear);
        if (rearRatio < 0.1 && location.rear > 0) {
          warnings.push({
            location: location.location,
            type: 'balance',
            message: `Very low rear armor coverage (${Math.round(rearRatio * 100)}%)`,
            severity: 'warning',
          });
        }
      }

      // Warn about unarmored locations
      if (total === 0 && location.location !== 'Head') {
        warnings.push({
          location: location.location,
          type: 'invalid',
          message: 'No armor allocated',
          severity: 'warning',
        });
      }
    });

    // Check symmetric balance
    const symmetricPairs = [
      ['Left Torso', 'Right Torso'],
      ['Left Arm', 'Right Arm'],
      ['Left Leg', 'Right Leg'],
    ];

    symmetricPairs.forEach(([left, right]) => {
      const leftTotal = (locations[left]?.front || 0) + (locations[left]?.rear || 0);
      const rightTotal = (locations[right]?.front || 0) + (locations[right]?.rear || 0);
      const difference = Math.abs(leftTotal - rightTotal);
      
      if (difference > 5) {
        warnings.push({
          location: `${left}/${right}`,
          type: 'balance',
          message: `Armor imbalance: ${left} (${leftTotal}) vs ${right} (${rightTotal})`,
          severity: 'warning',
        });
      }
    });

    // Check total armor tonnage
    if (totalArmorTonnage > maxArmorTonnage) {
      errors.push({
        location: 'Total',
        type: 'excess',
        message: `Total armor tonnage (${totalArmorTonnage}) exceeds maximum (${maxArmorTonnage})`,
        severity: 'error',
      });
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
    };
  }, [locations, totalArmorTonnage, maxArmorTonnage]);
}

// Helper to check if armor allocation meets minimum standards
export function checkMinimumArmorStandards(
  locations: Record<string, ArmorLocationData>,
  unitRole?: string
): ArmorValidationError[] {
  const warnings: ArmorValidationError[] = [];
  
  // Role-specific minimum coverage recommendations
  const roleMinimums: Record<string, Record<string, number>> = {
    'Brawler': {
      'Center Torso': 80,
      'Left Torso': 70,
      'Right Torso': 70,
    },
    'Sniper': {
      'Center Torso': 60,
      'Left Torso': 50,
      'Right Torso': 50,
    },
    'Scout': {
      'Center Torso': 50,
      'Left Leg': 60,
      'Right Leg': 60,
    },
  };

  const minimums = roleMinimums[unitRole || ''] || {};
  
  Object.entries(minimums).forEach(([location, minCoverage]) => {
    const locationData = locations[location];
    if (locationData && locationData.coverage < minCoverage) {
      warnings.push({
        location,
        type: 'invalid',
        message: `Below recommended ${minCoverage}% coverage for ${unitRole} role`,
        severity: 'warning',
      });
    }
  });

  return warnings;
}

// Helper to validate armor distribution
export function validateArmorDistribution(
  front: number,
  rear: number,
  max: number,
  hasRear: boolean
): { isValid: boolean; error?: string } {
  const total = front + rear;
  
  if (total > max) {
    return {
      isValid: false,
      error: `Total armor (${total}) exceeds maximum (${max})`,
    };
  }

  if (front < 0 || rear < 0) {
    return {
      isValid: false,
      error: 'Armor values cannot be negative',
    };
  }

  if (!hasRear && rear > 0) {
    return {
      isValid: false,
      error: 'This location does not have rear armor',
    };
  }

  return { isValid: true };
}
