/**
 * Critical Slot Validation Utility
 * Ensures compliance with BattleTech 78-slot total rule
 */

// Official BattleTech critical slot distribution per location
export const CRITICAL_SLOTS_PER_LOCATION = {
  'HEAD': 6,
  'CENTER_TORSO': 12,
  'LEFT_TORSO': 12,
  'RIGHT_TORSO': 12,
  'LEFT_ARM': 12,
  'RIGHT_ARM': 12,
  'LEFT_LEG': 6,
  'RIGHT_LEG': 6
} as const;

// Total slots must equal 78 for all BattleMechs
export const TOTAL_CRITICAL_SLOTS = 78;

export interface CriticalSlotValidationResult {
  isValid: boolean;
  totalSlots: number;
  expectedSlots: number;
  locationResults: LocationValidationResult[];
  errors: string[];
  warnings: string[];
}

export interface LocationValidationResult {
  location: string;
  expectedSlots: number;
  actualSlots: number;
  isValid: boolean;
  usedSlots: number;
  availableSlots: number;
}

/**
 * Validates that critical slot distribution follows BattleTech rules
 */
export function validateCriticalSlotDistribution(
  criticalSlots: Record<string, any[]>
): CriticalSlotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const locationResults: LocationValidationResult[] = [];
  let totalSlots = 0;

  // Check each location against expected slot count
  Object.entries(CRITICAL_SLOTS_PER_LOCATION).forEach(([location, expectedSlots]) => {
    const normalizedLocation = normalizeLocationName(location);
    const actualSlots = criticalSlots[normalizedLocation]?.length || 0;
    const usedSlots = criticalSlots[normalizedLocation]?.filter(slot => 
      slot && slot !== '-Empty-' && slot.trim() !== ''
    ).length || 0;
    
    const isValid = actualSlots === expectedSlots;
    
    if (!isValid) {
      errors.push(
        `${location}: Expected ${expectedSlots} slots, found ${actualSlots}`
      );
    }
    
    locationResults.push({
      location,
      expectedSlots,
      actualSlots,
      isValid,
      usedSlots,
      availableSlots: actualSlots - usedSlots
    });
    
    totalSlots += actualSlots;
  });

  // Check total slot count
  const totalValid = totalSlots === TOTAL_CRITICAL_SLOTS;
  if (!totalValid) {
    errors.push(
      `Total critical slots: Expected ${TOTAL_CRITICAL_SLOTS}, found ${totalSlots}`
    );
  }

  // Check for missing locations
  const requiredLocations = Object.keys(CRITICAL_SLOTS_PER_LOCATION);
  const providedLocations = Object.keys(criticalSlots).map(normalizeLocationName);
  
  requiredLocations.forEach(location => {
    const normalized = normalizeLocationName(location);
    if (!providedLocations.includes(normalized)) {
      errors.push(`Missing required location: ${location}`);
    }
  });

  // Check for unexpected locations
  providedLocations.forEach(location => {
    const expectedLocation = Object.keys(CRITICAL_SLOTS_PER_LOCATION)
      .find(expected => normalizeLocationName(expected) === location);
    
    if (!expectedLocation) {
      warnings.push(`Unexpected location found: ${location}`);
    }
  });

  return {
    isValid: errors.length === 0,
    totalSlots,
    expectedSlots: TOTAL_CRITICAL_SLOTS,
    locationResults,
    errors,
    warnings
  };
}

/**
 * Normalizes location names to handle different naming conventions
 */
function normalizeLocationName(location: string): string {
  const normalized = location.toUpperCase()
    .replace(/[\s_-]/g, '_')
    .replace('CENTRE_TORSO', 'CENTER_TORSO')
    .replace('CT', 'CENTER_TORSO')
    .replace('LT', 'LEFT_TORSO')
    .replace('RT', 'RIGHT_TORSO')
    .replace('LA', 'LEFT_ARM')
    .replace('RA', 'RIGHT_ARM')
    .replace('LL', 'LEFT_LEG')
    .replace('RL', 'RIGHT_LEG')
    .replace('HD', 'HEAD');
  
  return normalized;
}

/**
 * Creates a valid critical slot structure with proper slot counts
 */
export function createValidCriticalSlotStructure(): Record<string, string[]> {
  const structure: Record<string, string[]> = {};
  
  Object.entries(CRITICAL_SLOTS_PER_LOCATION).forEach(([location, slotCount]) => {
    structure[location] = Array(slotCount).fill('-Empty-');
  });
  
  return structure;
}

/**
 * Validates equipment placement in critical slots
 */
export function validateEquipmentPlacement(
  criticalSlots: Record<string, any[]>,
  equipment: { name: string; slots: number; location?: string }[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  equipment.forEach(item => {
    if (item.slots <= 0) {
      warnings.push(`${item.name}: Equipment requires no critical slots`);
      return;
    }
    
    if (item.location) {
      const normalizedLocation = normalizeLocationName(item.location);
      const locationSlots = criticalSlots[normalizedLocation];
      
      if (!locationSlots) {
        errors.push(`${item.name}: Invalid location ${item.location}`);
        return;
      }
      
      const availableSlots = locationSlots.filter(slot => 
        !slot || slot === '-Empty-' || slot.trim() === ''
      ).length;
      
      if (availableSlots < item.slots) {
        errors.push(
          `${item.name}: Requires ${item.slots} slots but ${item.location} only has ${availableSlots} available`
        );
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculates critical slot utilization statistics
 */
export function calculateSlotUtilization(
  criticalSlots: Record<string, any[]>
): {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  utilizationPercentage: number;
  locationBreakdown: Record<string, { used: number; total: number; percentage: number }>;
} {
  let totalSlots = 0;
  let usedSlots = 0;
  const locationBreakdown: Record<string, { used: number; total: number; percentage: number }> = {};
  
  Object.entries(criticalSlots).forEach(([location, slots]) => {
    const total = slots.length;
    const used = slots.filter(slot => 
      slot && slot !== '-Empty-' && slot.trim() !== ''
    ).length;
    
    totalSlots += total;
    usedSlots += used;
    
    locationBreakdown[location] = {
      used,
      total,
      percentage: total > 0 ? (used / total) * 100 : 0
    };
  });
  
  return {
    totalSlots,
    usedSlots,
    availableSlots: totalSlots - usedSlots,
    utilizationPercentage: totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0,
    locationBreakdown
  };
}

/**
 * Validates that mandatory systems are present in critical slots
 */
export function validateMandatorySystems(
  criticalSlots: Record<string, any[]>
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for mandatory systems in Center Torso
  const centerTorsoSlots = criticalSlots['CENTER_TORSO'] || [];
  const centerTorsoItems = centerTorsoSlots.filter(slot => 
    slot && slot !== '-Empty-' && slot.trim() !== ''
  );
  
  // Engine should occupy center torso slots
  const hasEngine = centerTorsoItems.some(item => 
    item.toLowerCase().includes('engine')
  );
  
  if (!hasEngine) {
    errors.push('No engine found in Center Torso critical slots');
  }
  
  // Gyro should be present
  const hasGyro = centerTorsoItems.some(item => 
    item.toLowerCase().includes('gyro')
  );
  
  if (!hasGyro) {
    errors.push('No gyro found in Center Torso critical slots');
  }
  
  // Head should have cockpit
  const headSlots = criticalSlots['HEAD'] || [];
  const hasCockpit = headSlots.some(slot => 
    slot && slot.toLowerCase().includes('cockpit')
  );
  
  if (!hasCockpit) {
    warnings.push('No cockpit found in Head critical slots');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Runs comprehensive critical slot validation
 */
export function runComprehensiveCriticalSlotValidation(
  criticalSlots: Record<string, any[]>,
  equipment?: { name: string; slots: number; location?: string }[]
): CriticalSlotValidationResult & {
  equipmentValidation?: ReturnType<typeof validateEquipmentPlacement>;
  systemValidation?: ReturnType<typeof validateMandatorySystems>;
  utilization?: ReturnType<typeof calculateSlotUtilization>;
} {
  const baseValidation = validateCriticalSlotDistribution(criticalSlots);
  
  const result = {
    ...baseValidation,
    equipmentValidation: equipment ? validateEquipmentPlacement(criticalSlots, equipment) : undefined,
    systemValidation: validateMandatorySystems(criticalSlots),
    utilization: calculateSlotUtilization(criticalSlots)
  };
  
  // Combine all errors and warnings
  if (result.equipmentValidation) {
    result.errors.push(...result.equipmentValidation.errors);
    result.warnings.push(...result.equipmentValidation.warnings);
  }
  
  if (result.systemValidation) {
    result.errors.push(...result.systemValidation.errors);
    result.warnings.push(...result.systemValidation.warnings);
  }
  
  result.isValid = result.errors.length === 0;
  
  return result;
}
