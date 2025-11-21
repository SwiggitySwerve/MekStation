// Unit validation rules for BattleTech mechs

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// Validate engine rating limits
export function validateEngineRating(rating: number, engineType: string = 'Fusion'): ValidationError | null {
  const maxRating = engineType === 'XXL' ? 500 : 400;
  
  if (rating > maxRating) {
    return {
      field: 'engine',
      message: `${engineType} engine rating cannot exceed ${maxRating}`,
      severity: 'error'
    };
  }
  
  if (rating < 10) {
    return {
      field: 'engine',
      message: 'Engine rating must be at least 10',
      severity: 'error'
    };
  }
  
  if (rating % 5 !== 0) {
    return {
      field: 'engine',
      message: 'Engine rating must be divisible by 5',
      severity: 'error'
    };
  }
  
  return null;
}

// Validate armor points for a location
export function validateArmorPoints(
  location: string, 
  armorPoints: number, 
  maxArmor: number, 
  isRear: boolean = false
): ValidationError | null {
  if (armorPoints > maxArmor) {
    return {
      field: `armor_${location}${isRear ? '_rear' : ''}`,
      message: `${location}${isRear ? ' rear' : ''} armor cannot exceed ${maxArmor} points`,
      severity: 'error'
    };
  }
  
  if (armorPoints < 0) {
    return {
      field: `armor_${location}${isRear ? '_rear' : ''}`,
      message: `${location}${isRear ? ' rear' : ''} armor cannot be negative`,
      severity: 'error'
    };
  }
  
  return null;
}

// Validate total tonnage
export function validateTotalTonnage(
  usedTonnage: number, 
  maxTonnage: number
): ValidationError | null {
  if (usedTonnage > maxTonnage) {
    return {
      field: 'tonnage',
      message: `Total weight (${usedTonnage.toFixed(1)}t) exceeds mech tonnage (${maxTonnage}t)`,
      severity: 'error'
    };
  }
  
  return null;
}

// Validate heat sink count
export function validateHeatSinks(
  count: number, 
  engineType: string = 'Fusion'
): ValidationError | null {
  // Heat sinks cannot be negative regardless of engine type
  if (count < 0) {
    return {
      field: 'heat_sinks',
      message: 'Heat sink count cannot be negative',
      severity: 'error'
    };
  }
  
  const minHeatSinks = engineType === 'ICE' || engineType === 'Fuel Cell' ? 0 : 10;
  
  if (count < minHeatSinks) {
    return {
      field: 'heat_sinks',
      message: `${engineType} engines require at least ${minHeatSinks} heat sinks`,
      severity: 'error'
    };
  }
  
  return null;
}

// Validate critical slots
export function validateCriticalSlots(
  usedSlots: number, 
  totalSlots: number
): ValidationError | null {
  if (usedSlots > totalSlots) {
    return {
      field: 'critical_slots',
      message: `Used critical slots (${usedSlots}) exceed available slots (${totalSlots})`,
      severity: 'error'
    };
  }
  
  return null;
}

// Validate tech level compatibility
export function validateTechLevelCompatibility(
  components: { type: string; techBase: string }[],
  unitTechBase: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check if mixing tech bases when unit is not Mixed
  if (unitTechBase !== 'Mixed') {
    const incompatibleComponents = components.filter(comp => {
      // Check if component tech base matches unit tech base
      if (unitTechBase === 'Inner Sphere' && comp.techBase === 'Clan') {
        return true;
      }
      if (unitTechBase === 'Clan' && comp.techBase === 'Inner Sphere') {
        return true;
      }
      return false;
    });
    
    incompatibleComponents.forEach(comp => {
      errors.push({
        field: 'tech_base',
        message: `${comp.type} (${comp.techBase}) incompatible with ${unitTechBase} unit`,
        severity: 'error'
      });
    });
  }
  
  return errors;
}

// Check for incompatible component combinations
export function validateComponentCompatibility(unit: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // XXL Engine incompatibilities
  if (unit.data?.engine?.type === 'XXL') {
    if (unit.data?.structure?.type === 'Endo Steel' || unit.data?.structure?.type === 'Endo Steel (Clan)') {
      errors.push({
        field: 'engine',
        message: 'XXL engines cannot be used with Endo Steel structure',
        severity: 'error'
      });
    }
  }
  
  // Stealth Armor requirements
  if (unit.data?.armor?.type === 'Stealth') {
    if (unit.data?.heat_sinks?.type !== 'Double') {
      errors.push({
        field: 'armor',
        message: 'Stealth armor requires double heat sinks',
        severity: 'error'
      });
    }
  }
  
  // TSM heat requirements
  if (unit.data?.myomer?.type === 'Triple Strength Myomer') {
    const heatSinkCount = unit.data?.heat_sinks?.count || 10;
    if (heatSinkCount > 10) {
      errors.push({
        field: 'myomer',
        message: 'TSM works best with exactly 10 heat sinks for heat buildup',
        severity: 'error'
      });
    }
  }
  
  return errors;
}

// Validate jump jets
export function validateJumpJets(
  jumpMP: number,
  walkMP: number,
  jumpType: string = 'Jump Jet'
): ValidationError | null {
  if (jumpType === 'Jump Jet' || jumpType === 'UMU') {
    if (jumpMP > walkMP) {
      return {
        field: 'jump_mp',
        message: 'Jump MP cannot exceed Walk MP for standard jump jets',
        severity: 'error'
      };
    }
  } else if (jumpType === 'Mechanical Jump Booster') {
    if (jumpMP > 1) {
      return {
        field: 'jump_mp',
        message: 'Mechanical Jump Booster provides exactly 1 Jump MP',
        severity: 'error'
      };
    }
  }
  
  return null;
}

// Generate warnings for suboptimal configurations
export function generateWarnings(unit: any): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Warn about unused tonnage
  const maxTonnage = unit.mass || 0;
  const usedTonnage = unit.data?.total_weight || 0;
  const unusedTonnage = maxTonnage - usedTonnage;
  
  if (unusedTonnage > 0.5) {
    warnings.push({
      field: 'tonnage',
      message: `${unusedTonnage.toFixed(1)} tons unused`,
      severity: 'warning'
    });
  }
  
  // Warn about low armor
  const totalArmor = unit.data?.armor?.total_armor_points || 0;
  const tonnageClass = maxTonnage <= 35 ? 'light' : 
                      maxTonnage <= 55 ? 'medium' : 
                      maxTonnage <= 75 ? 'heavy' : 'assault';
  
  const minRecommendedArmor = {
    'light': 60,
    'medium': 120,
    'heavy': 200,
    'assault': 280
  };
  
  if (totalArmor < minRecommendedArmor[tonnageClass]) {
    warnings.push({
      field: 'armor',
      message: `Low armor for ${tonnageClass} mech (recommended: ${minRecommendedArmor[tonnageClass]}+ points)`,
      severity: 'warning'
    });
  }
  
  // Warn about head armor
  const headArmor = unit.data?.armor?.locations?.find((loc: any) => loc.location === 'Head')?.armor_points || 0;
  if (headArmor < 9) {
    warnings.push({
      field: 'armor_head',
      message: 'Head armor below maximum (9) leaves pilot vulnerable',
      severity: 'warning'
    });
  }
  
  return warnings;
}

// Main validation function
export function validateUnit(unit: any, weights: any, crits: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Engine validation
  const engineRating = (unit.data?.movement?.walk_mp || 1) * (unit.mass || 20);
  const engineError = validateEngineRating(engineRating, unit.data?.engine?.type);
  if (engineError) errors.push(engineError);
  
  // Tonnage validation
  const equipmentWeight = unit.data?.weapons_and_equipment?.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.tons) || 0);
  }, 0) || 0;
  const totalWeight = weights.total + equipmentWeight;
  const tonnageError = validateTotalTonnage(totalWeight, unit.mass || 20);
  if (tonnageError) errors.push(tonnageError);
  
  // Heat sink validation
  const heatSinkError = validateHeatSinks(
    unit.data?.heat_sinks?.count || 10, 
    unit.data?.engine?.type || 'Fusion'
  );
  if (heatSinkError) errors.push(heatSinkError);
  
  // Critical slot validation
  const critError = validateCriticalSlots(crits.total, 78); // Standard mech has 78 slots
  if (critError) errors.push(critError);
  
  // Jump jet validation
  const jumpError = validateJumpJets(
    unit.data?.movement?.jump_mp || 0,
    unit.data?.movement?.walk_mp || 1,
    unit.data?.movement?.jump_type || 'Jump Jet'
  );
  if (jumpError) errors.push(jumpError);
  
  // Component compatibility
  const compatibilityErrors = validateComponentCompatibility(unit);
  errors.push(...compatibilityErrors);
  
  // Generate warnings
  const unitWarnings = generateWarnings(unit);
  warnings.push(...unitWarnings);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
