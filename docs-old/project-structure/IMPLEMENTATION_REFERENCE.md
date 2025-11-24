# 🔧 BattleTech Editor App - Implementation Reference

## Overview
This document provides detailed implementation patterns, solutions, and technical references for specific features and systems within the BattleTech Editor App. Use this as a comprehensive guide for understanding how key features are implemented and how to extend them.

---

## 🎯 **Core Data Structures**

### **EditableUnit Interface**
```typescript
interface EditableUnit {
  // Identity and Basic Properties
  id: string;
  chassis: string;
  model: string;
  mass: number;
  
  // Technical Classification
  tech_base: TechBase;
  config: UnitConfig;
  rules_level: RulesLevel;
  era: string;
  role: UnitRole;
  
  // MegaMekLab Compatibility
  is_omnimech: boolean;
  omnimech_base_chassis?: string;
  omnimech_configuration?: string;
  
  // Physical Structure
  armorAllocation: ArmorAllocation;
  criticalSlots: CriticalSlotAssignment;
  equipment: EquipmentPlacement[];
  
  // Game Mechanics
  selectedQuirks: string[];
  battleValue: number;
  cost: number;
  
  // Metadata
  fluffData: FluffData;
  validationState: ValidationState;
  editorMetadata: EditorMetadata;
}

// Supporting Type Definitions
type TechBase = 'Inner Sphere' | 'Clan' | 'Mixed (IS Chassis)' | 'Mixed (Clan Chassis)';
type UnitConfig = 'Biped' | 'Biped Omnimech' | 'Quad' | 'Quad Omnimech' | 'Tripod' | 'Tripod Omnimech' | 'LAM';
type RulesLevel = 'standard' | 'advanced' | 'experimental';
type UnitRole = 'Sniper' | 'Skirmisher' | 'Brawler' | 'Striker' | 'Missile Boat' | 'Scout' | 'Juggernaut' | 'Fire Support' | 'Ambusher' | 'Cavalry' | 'Urban' | 'None';
```

### **ArmorAllocation Structure**
```typescript
interface ArmorAllocation {
  head: { front: number };
  center_torso: { front: number; rear: number };
  left_torso: { front: number; rear: number };
  right_torso: { front: number; rear: number };
  left_arm: { front: number };
  right_arm: { front: number };
  left_leg: { front: number };
  right_leg: { front: number };
}

// Armor calculation utilities
const calculateTotalArmor = (allocation: ArmorAllocation): number => {
  return Object.values(allocation).reduce((total, location) => {
    if ('rear' in location) {
      return total + location.front + location.rear;
    }
    return total + location.front;
  }, 0);
};

const calculateMaxArmorForTonnage = (mass: number): number => {
  // Standard BattleTech armor calculation: mass * 3.36, rounded down
  return Math.floor(mass * 3.36);
};
```

### **Equipment and Critical Slots**
```typescript
interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  tech_base: 'IS' | 'Clan' | 'Mixed';
  rules_level: RulesLevel;
  era: string;
  
  // Physical Properties
  slots: number;
  tons: number;
  cost: number;
  
  // Combat Properties
  heat?: number;
  damage?: number;
  range?: EquipmentRange;
  
  // Placement Rules
  location_restrictions?: string[];
  is_omnipod?: boolean;
  special_rules?: EquipmentSpecialRules;
}

interface CriticalSlot {
  id: string;
  equipment: Equipment | null;
  location: string;
  slot_number: number;
  is_destroyed?: boolean;
  is_system_equipment?: boolean;
}

type EquipmentType = 'weapon' | 'ammo' | 'equipment' | 'armor' | 'structure' | 'engine' | 'gyro' | 'cockpit' | 'life_support' | 'sensors' | 'myomer' | 'heat_sink' | 'jump_jet' | 'targeting_computer';
```

---

## ⚙️ **Armor System Implementation**

### **Auto-Allocation Algorithms**
```typescript
// Maximum Protection Pattern - Prioritizes survivability
export const allocateMaximumArmor = (unit: EditableUnit, totalPoints: number): ArmorAllocation => {
  const maxArmorPerLocation = {
    head: 9,
    center_torso_front: Math.min(20, Math.floor(totalPoints * 0.2)),
    center_torso_rear: Math.min(12, Math.floor(totalPoints * 0.12)),
    side_torso_front: Math.min(16, Math.floor(totalPoints * 0.15)),
    side_torso_rear: Math.min(8, Math.floor(totalPoints * 0.08)),
    arm: Math.min(12, Math.floor(totalPoints * 0.1)),
    leg: Math.min(16, Math.floor(totalPoints * 0.12))
  };
  
  return {
    head: { front: Math.min(maxArmorPerLocation.head, totalPoints) },
    center_torso: { 
      front: maxArmorPerLocation.center_torso_front,
      rear: maxArmorPerLocation.center_torso_rear
    },
    left_torso: { 
      front: maxArmorPerLocation.side_torso_front,
      rear: maxArmorPerLocation.side_torso_rear
    },
    right_torso: { 
      front: maxArmorPerLocation.side_torso_front,
      rear: maxArmorPerLocation.side_torso_rear
    },
    left_arm: { front: maxArmorPerLocation.arm },
    right_arm: { front: maxArmorPerLocation.arm },
    left_leg: { front: maxArmorPerLocation.leg },
    right_leg: { front: maxArmorPerLocation.leg }
  };
};

// Balanced Pattern - Even distribution with tactical considerations
export const allocateBalancedArmor = (unit: EditableUnit, totalPoints: number): ArmorAllocation => {
  const distribution = {
    head: 0.08,           // 8% - Critical protection
    center_torso: 0.25,   // 25% - Engine protection
    side_torso: 0.15,     // 15% each - Ammo/equipment protection
    arms: 0.10,           // 10% each - Weapon protection
    legs: 0.08            // 8% each - Mobility protection
  };
  
  const allocateByPercentage = (percentage: number, frontRearRatio: number = 1) => {
    const total = Math.floor(totalPoints * percentage);
    if (frontRearRatio === 1) {
      return { front: total };
    } else {
      const front = Math.floor(total * frontRearRatio);
      const rear = total - front;
      return { front, rear };
    }
  };
  
  return {
    head: allocateByPercentage(distribution.head),
    center_torso: allocateByPercentage(distribution.center_torso, 0.7), // 70% front, 30% rear
    left_torso: allocateByPercentage(distribution.side_torso, 0.75),    // 75% front, 25% rear
    right_torso: allocateByPercentage(distribution.side_torso, 0.75),
    left_arm: allocateByPercentage(distribution.arms),
    right_arm: allocateByPercentage(distribution.arms),
    left_leg: allocateByPercentage(distribution.legs),
    right_leg: allocateByPercentage(distribution.legs)
  };
};

// Front-Heavy Pattern - For offensive builds
export const allocateFrontHeavyArmor = (unit: EditableUnit, totalPoints: number): ArmorAllocation => {
  const frontBias = 0.85; // 85% to front-facing armor
  const frontPoints = Math.floor(totalPoints * frontBias);
  const rearPoints = totalPoints - frontPoints;
  
  return {
    head: { front: Math.min(9, Math.floor(frontPoints * 0.08)) },
    center_torso: { 
      front: Math.floor(frontPoints * 0.3),
      rear: Math.floor(rearPoints * 0.4)
    },
    left_torso: { 
      front: Math.floor(frontPoints * 0.18),
      rear: Math.floor(rearPoints * 0.3)
    },
    right_torso: { 
      front: Math.floor(frontPoints * 0.18),
      rear: Math.floor(rearPoints * 0.3)
    },
    left_arm: { front: Math.floor(frontPoints * 0.13) },
    right_arm: { front: Math.floor(frontPoints * 0.13) },
    left_leg: { front: Math.floor(frontPoints * 0.13) },
    right_leg: { front: Math.floor(frontPoints * 0.13) }
  };
};
```

### **Armor Validation**
```typescript
export const validateArmorAllocation = (unit: EditableUnit): ValidationError[] => {
  const errors: ValidationError[] = [];
  const allocation = unit.armorAllocation;
  const maxArmor = calculateMaxArmorForTonnage(unit.mass);
  const totalArmor = calculateTotalArmor(allocation);
  
  // Check total armor doesn't exceed maximum
  if (totalArmor > maxArmor) {
    errors.push({
      type: 'ARMOR_EXCEEDS_MAXIMUM',
      severity: 'error',
      message: `Total armor (${totalArmor}) exceeds maximum for ${unit.mass} tons (${maxArmor})`,
      field: 'armorAllocation'
    });
  }
  
  // Check individual location limits
  const locationLimits = {
    head: 9,
    center_torso_front: 20, center_torso_rear: 12,
    side_torso_front: 16, side_torso_rear: 8,
    arm: 12,
    leg: 16
  };
  
  if (allocation.head.front > locationLimits.head) {
    errors.push({
      type: 'LOCATION_ARMOR_EXCEEDS_MAXIMUM',
      severity: 'error',
      message: `Head armor (${allocation.head.front}) exceeds maximum (${locationLimits.head})`,
      location: 'head'
    });
  }
  
  // Check for negative armor values
  Object.entries(allocation).forEach(([location, armor]) => {
    if ('rear' in armor) {
      if (armor.front < 0 || armor.rear < 0) {
        errors.push({
          type: 'NEGATIVE_ARMOR_VALUE',
          severity: 'error',
          message: `${location} has negative armor values`,
          location
        });
      }
    } else {
      if (armor.front < 0) {
        errors.push({
          type: 'NEGATIVE_ARMOR_VALUE',
          severity: 'error',
          message: `${location} has negative armor value`,
          location
        });
      }
    }
  });
  
  return errors;
};
```

---

## 🛡️ **Critical Slot System**

### **Critical Slot Assignment**
```typescript
interface CriticalSlotAssignment {
  head: CriticalSlot[];
  center_torso: CriticalSlot[];
  left_torso: CriticalSlot[];
  right_torso: CriticalSlot[];
  left_arm: CriticalSlot[];
  right_arm: CriticalSlot[];
  left_leg: CriticalSlot[];
  right_leg: CriticalSlot[];
}

// Critical slot capacity by location and configuration
const getCriticalSlotCapacity = (location: string, config: UnitConfig): number => {
  const capacities = {
    'Biped': {
      head: 6,
      center_torso: 12,
      left_torso: 12,
      right_torso: 12,
      left_arm: 12,
      right_arm: 12,
      left_leg: 6,
      right_leg: 6
    },
    'Quad': {
      head: 6,
      center_torso: 12,
      left_torso: 12,
      right_torso: 12,
      front_left_leg: 6,
      front_right_leg: 6,
      rear_left_leg: 6,
      rear_right_leg: 6
    }
    // Add other configurations as needed
  };
  
  const baseConfig = config.replace(' Omnimech', '') as keyof typeof capacities;
  return capacities[baseConfig]?.[location] || 12;
};

// Equipment placement validation
export const canPlaceEquipmentInLocation = (
  equipment: Equipment,
  location: string,
  unit: EditableUnit
): boolean => {
  // Check location restrictions
  if (equipment.location_restrictions && equipment.location_restrictions.length > 0) {
    if (!equipment.location_restrictions.includes(location)) {
      return false;
    }
  }
  
  // Check available critical slots
  const currentSlots = unit.criticalSlots[location] || [];
  const usedSlots = currentSlots.filter(slot => slot.equipment !== null).length;
  const maxSlots = getCriticalSlotCapacity(location, unit.config);
  
  if (usedSlots + equipment.slots > maxSlots) {
    return false;
  }
  
  // Check tech base compatibility
  if (!isEquipmentCompatibleWithUnit(equipment, unit)) {
    return false;
  }
  
  // Special equipment rules
  return validateSpecialEquipmentRules(equipment, location, unit);
};

// System equipment auto-placement
export const placeSystemEquipment = (unit: EditableUnit): CriticalSlotAssignment => {
  const slots: CriticalSlotAssignment = initializeEmptySlots();
  
  // Engine placement (center torso)
  const engineSlots = calculateEngineSlots(unit.mass);
  for (let i = 0; i < engineSlots; i++) {
    slots.center_torso[i] = {
      id: `engine-${i}`,
      equipment: createSystemEquipment('Engine', 'engine'),
      location: 'center_torso',
      slot_number: i,
      is_system_equipment: true
    };
  }
  
  // Gyro placement (center torso, after engine)
  const gyroSlots = getGyroSlots(unit.gyroType || 'Standard');
  for (let i = 0; i < gyroSlots; i++) {
    slots.center_torso[engineSlots + i] = {
      id: `gyro-${i}`,
      equipment: createSystemEquipment('Gyro', 'gyro'),
      location: 'center_torso',
      slot_number: engineSlots + i,
      is_system_equipment: true
    };
  }
  
  // Cockpit placement (head)
  slots.head[0] = {
    id: 'cockpit',
    equipment: createSystemEquipment('Cockpit', 'cockpit'),
    location: 'head',
    slot_number: 0,
    is_system_equipment: true
  };
  
  // Life Support placement (head)
  slots.head[1] = {
    id: 'life-support',
    equipment: createSystemEquipment('Life Support', 'life_support'),
    location: 'head',
    slot_number: 1,
    is_system_equipment: true
  };
  
  // Sensors placement (head)
  slots.head[2] = {
    id: 'sensors',
    equipment: createSystemEquipment('Sensors', 'sensors'),
    location: 'head',
    slot_number: 2,
    is_system_equipment: true
  };
  
  return slots;
};
```

### **Drag and Drop Implementation**
```typescript
// Drag and drop configuration for critical slots
interface DragDropEquipmentData {
  equipment: Equipment;
  sourceLocation?: string;
  sourceSlot?: number;
  operation: 'move' | 'copy' | 'add';
}

export const useCriticalSlotDragDrop = (unit: EditableUnit, onUnitChange: (updates: Partial<EditableUnit>) => void) => {
  const handleDragStart = useCallback((e: DragEvent, equipment: Equipment, location?: string, slot?: number) => {
    const dragData: DragDropEquipmentData = {
      equipment,
      sourceLocation: location,
      sourceSlot: slot,
      operation: location ? 'move' : 'add'
    };
    
    e.dataTransfer.setData('application/equipment', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = dragData.operation === 'move' ? 'move' : 'copy';
  }, []);
  
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  const handleDrop = useCallback((e: DragEvent, targetLocation: string, targetSlot?: number) => {
    e.preventDefault();
    
    try {
      const dragDataString = e.dataTransfer.getData('application/equipment');
      if (!dragDataString) return;
      
      const dragData: DragDropEquipmentData = JSON.parse(dragDataString);
      
      // Validate placement
      if (!canPlaceEquipmentInLocation(dragData.equipment, targetLocation, unit)) {
        console.warn('Cannot place equipment in target location');
        return;
      }
      
      // Perform the placement
      const newCriticalSlots = { ...unit.criticalSlots };
      
      // Remove from source location if moving
      if (dragData.operation === 'move' && dragData.sourceLocation && dragData.sourceSlot !== undefined) {
        newCriticalSlots[dragData.sourceLocation][dragData.sourceSlot] = {
          ...newCriticalSlots[dragData.sourceLocation][dragData.sourceSlot],
          equipment: null
        };
      }
      
      // Add to target location
      const targetSlotIndex = targetSlot ?? findFirstAvailableSlot(newCriticalSlots[targetLocation]);
      if (targetSlotIndex !== -1) {
        newCriticalSlots[targetLocation][targetSlotIndex] = {
          id: `${targetLocation}-${targetSlotIndex}`,
          equipment: dragData.equipment,
          location: targetLocation,
          slot_number: targetSlotIndex,
          is_system_equipment: false
        };
        
        onUnitChange({ criticalSlots: newCriticalSlots });
      }
    } catch (error) {
      console.error('Error handling equipment drop:', error);
    }
  }, [unit, onUnitChange]);
  
  return { handleDragStart, handleDragOver, handleDrop };
};
```

---

## ✅ **Validation System Implementation**

### **Comprehensive Unit Validation**
```typescript
export const validateUnit = (unit: EditableUnit): ValidationState => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];
  
  // Weight validation
  errors.push(...validateWeight(unit));
  
  // Tech base consistency
  errors.push(...validateTechBaseConsistency(unit));
  warnings.push(...validateTechBaseOptimization(unit));
  
  // Critical space validation
  errors.push(...validateCriticalSpace(unit));
  
  // Armor validation
  errors.push(...validateArmorAllocation(unit));
  warnings.push(...validateArmorOptimization(unit));
  
  // Equipment compatibility
  errors.push(...validateEquipmentCompatibility(unit));
  suggestions.push(...suggestEquipmentOptimizations(unit));
  
  // Construction rules
  errors.push(...validateConstructionRules(unit));
  
  // Era restrictions
  warnings.push(...validateEraRestrictions(unit));
  
  // Heat management
  warnings.push(...validateHeatManagement(unit));
  suggestions.push(...suggestHeatOptimizations(unit));
  
  // Battle value calculation
  suggestions.push(...suggestBattleValueOptimizations(unit));
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
};

// Weight validation
const validateWeight = (unit: EditableUnit): ValidationError[] => {
  const errors: ValidationError[] = [];
  const totalWeight = calculateTotalWeight(unit);
  
  if (totalWeight > unit.mass) {
    errors.push({
      type: 'OVERWEIGHT',
      severity: 'error',
      message: `Unit is ${(totalWeight - unit.mass).toFixed(2)} tons overweight (${totalWeight}/${unit.mass})`,
      field: 'mass'
    });
  }
  
  // Check for underweight (less than 90% of chassis mass)
  if (totalWeight < unit.mass * 0.9) {
    errors.push({
      type: 'UNDERWEIGHT',
      severity: 'warning',
      message: `Unit is significantly underweight (${totalWeight}/${unit.mass} tons). Consider adding equipment or armor.`,
      field: 'mass'
    });
  }
  
  return errors;
};

// Tech base consistency validation
const validateTechBaseConsistency = (unit: EditableUnit): ValidationError[] => {
  const errors: ValidationError[] = [];
  const equipmentTechBases = unit.equipment.map(eq => eq.tech_base);
  const uniqueTechBases = [...new Set(equipmentTechBases)];
  
  // Mixed tech validation
  if (unit.tech_base.includes('Mixed')) {
    if (uniqueTechBases.length === 1) {
      errors.push({
        type: 'UNNECESSARY_MIXED_TECH',
        severity: 'warning',
        message: 'Mixed tech designation not required for single tech base equipment',
        field: 'tech_base'
      });
    }
    
    // Validate mixed tech rules
    const isEquipmentRatio = equipmentTechBases.filter(tb => tb === 'IS').length;
    const clanEquipmentRatio = equipmentTechBases.filter(tb => tb === 'Clan').length;
    
    if (unit.tech_base === 'Mixed (IS Chassis)' && clanEquipmentRatio > isEquipmentRatio) {
      errors.push({
        type: 'MIXED_TECH_RATIO_VIOLATION',
        severity: 'error',
        message: 'Inner Sphere chassis cannot have more Clan equipment than IS equipment',
        field: 'tech_base'
      });
    }
  } else {
    // Pure tech base validation
    const incompatibleEquipment = unit.equipment.filter(eq => {
      if (unit.tech_base === 'Inner Sphere' && eq.tech_base === 'Clan') return true;
      if (unit.tech_base === 'Clan' && eq.tech_base === 'IS') return true;
      return false;
    });
    
    if (incompatibleEquipment.length > 0) {
      errors.push({
        type: 'TECH_BASE_MISMATCH',
        severity: 'error',
        message: `${unit.tech_base} chassis cannot mount ${incompatibleEquipment[0].tech_base} equipment without mixed tech rules`,
        field: 'tech_base'
      });
    }
  }
  
  return errors;
};

// Heat management validation
const validateHeatManagement = (unit: EditableUnit): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  const weapons = unit.equipment.filter(eq => eq.type === 'weapon' && eq.heat > 0);
  const heatSinks = unit.equipment.filter(eq => eq.name.includes('Heat Sink'));
  
  const totalWeaponHeat = weapons.reduce((sum, weapon) => sum + (weapon.heat || 0), 0);
  const totalHeatDissipation = 10 + heatSinks.length; // Base 10 + heat sinks
  
  if (totalWeaponHeat > totalHeatDissipation) {
    warnings.push({
      type: 'HEAT_MANAGEMENT_ISSUE',
      severity: 'warning',
      message: `Heat generation (${totalWeaponHeat}) exceeds dissipation capacity (${totalHeatDissipation})`,
      suggestions: [
        'Add more heat sinks',
        'Replace high-heat weapons with alternatives',
        'Consider heat-efficient weapon combinations'
      ]
    });
  }
  
  return warnings;
};
```

### **Real-Time Validation with Debouncing**
```typescript
export const useUnitValidation = (unit: EditableUnit, debounceMs: number = 300) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  });
  
  const [isValidating, setIsValidating] = useState(false);
  
  // Debounced validation function
  const debouncedValidation = useMemo(
    () => debounce(async (unit: EditableUnit) => {
      setIsValidating(true);
      try {
        // Run validation in a web worker for complex units
        const result = await runValidationAsync(unit);
        setValidationState(result);
      } catch (error) {
        console.error('Validation error:', error);
        setValidationState({
          isValid: false,
          errors: [{
            type: 'VALIDATION_ERROR',
            severity: 'error',
            message: 'An error occurred during validation'
          }],
          warnings: [],
          suggestions: []
        });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );
  
  useEffect(() => {
    debouncedValidation(unit);
    return () => debouncedValidation.cancel();
  }, [unit, debouncedValidation]);
  
  return {
    ...validationState,
    isValidating
  };
};

// Async validation worker for complex validations
const runValidationAsync = async (unit: EditableUnit): Promise<ValidationState> => {
  return new Promise((resolve) => {
    // Use setTimeout to make validation non-blocking
    setTimeout(() => {
      const result = validateUnit(unit);
      resolve(result);
    }, 0);
  });
};
```

---

## 🎮 **Equipment Management System**

### **Equipment Database Structure**
```typescript
// Equipment categories and their properties
export const equipmentCategories = {
  weapons: {
    energy: ['Laser', 'PPC', 'Flamer'],
    ballistic: ['Autocannon', 'Machine Gun', 'Gauss Rifle'],
    missile: ['LRM', 'SRM', 'Streak SRM', 'NARC', 'TAG'],
    artillery: ['Arrow IV', 'Long Tom', 'Sniper', 'Thumper']
  },
  equipment: {
    targeting: ['Targeting Computer', 'Artemis IV FCS', 'TAG'],
    communication: ['C3 Master', 'C3 Slave', 'Guardian ECM', 'Beagle Active Probe'],
    movement: ['Jump Jets', 'Myomer Accelerator', 'Triple Strength Myomer'],
    protection: ['AMS', 'Laser AMS', 'Angel ECM', 'Null Signature System']
  },
  ammunition: {
    autocannon: ['AC/2 Ammo', 'AC/5 Ammo', 'AC/10 Ammo', 'AC/20 Ammo'],
    missile: ['LRM Ammo', 'SRM Ammo', 'Streak SRM Ammo'],
    special: ['Inferno SRM Ammo', 'NARC Ammo', 'AMS Ammo']
  }
};

// Equipment filtering and search
export const filterEquipment = (
  equipment: Equipment[],
  filters: EquipmentFilters
): Equipment[] => {
  return equipment.filter(item => {
    // Tech base filter
    if (filters.tech_base && filters.tech_base !== 'all') {
      if (item.tech_base !== filters.tech_base) return false;
    }
    
    // Type filter
    if (filters.type && filters.type !== 'all') {
      if (item.type !== filters.type) return false;
    }
    
    // Rules level filter
    if (filters.rules_level && filters.rules_level !== 'all') {
      if (item.rules_level !== filters.rules_level) return false;
    }
    
    // Era filter
    if (filters.era && filters.era !== 'all') {
      if (!isEquipmentAvailableInEra(item, filters.era)) return false;
    }
    
    // Text search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = `${item.name} ${item.type}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    // Tonnage range
    if (filters.tonnage_min !== undefined && item.tons < filters.tonnage_min) return false;
    if (filters.tonnage_max !== undefined && item.tons > filters.tonnage_max) return false;
    
    // Heat range (for weapons)
    if (filters.heat_min !== undefined && (item.heat || 0) < filters.heat_min) return false;
    if (filters.heat_max !== undefined && (item.heat || 0) > filters.heat_max) return false;
    
    return true;
  });
};

// Equipment compatibility checking
export const isEquipmentCompatibleWithUnit = (equipment: Equipment, unit: EditableUnit): boolean => {
  // Tech base compatibility
  if (unit.tech_base === 'Inner Sphere' && equipment.tech_base === 'Clan') {
    return false;
  }
  if (unit.tech_base === 'Clan' && equipment.tech_base === 'IS') {
    return false;
  }
  
  // Mixed tech rules
  if (unit.tech_base.includes('Mixed')) {
    // Mixed tech allows both IS and Clan equipment
    return true;
  }
  
  // Rules level compatibility
  const rulesLevelHierarchy = ['standard', 'advanced', 'experimental'];
  const unitLevel = rulesLevelHierarchy.indexOf(unit.rules_level);
  const equipmentLevel = rulesLevelHierarchy.indexOf(equipment.rules_level);
  
  return equipmentLevel <= unitLevel;
};

// Era availability checking
export const isEquipmentAvailableInEra = (equipment: Equipment, era: string): boolean => {
  const eraTimeline = [
    'Age of War',
    'Star League',
    'Succession Wars',
    'Clan Invasion',
    'FedCom Civil War',
    'Dark Age'
  ];
  
  const equipmentEraIndex = eraTimeline.indexOf(equipment.era);
  const targetEraIndex = eraTimeline.indexOf(era);
  
  return equipmentEraIndex <= targetEraIndex;
};
```

### **Equipment Tooltips and Information Display**
```typescript
interface EquipmentTooltipData {
  name: string;
  type: string;
  tech_base: string;
  rules_level: string;
  era: string;
  stats: EquipmentStats;
  special_rules: string[];
  location_restrictions: string[];
}

interface EquipmentStats {
  tonnage: number;
  slots: number;
  cost: number;
  heat?: number;
  damage?: number;
  range?: {
    short?: number;
    medium?: number;
    long?: number;
  };
  ammunition?: number;
}

export const generateEquipmentTooltip = (equipment: Equipment): EquipmentTooltipData => {
  return {
    name: equipment.name,
    type: equipment.type,
    tech_base: equipment.tech_base,
    rules_level: equipment.rules_level,
    era: equipment.era,
    stats: {
      tonnage: equipment.tons,
      slots: equipment.slots,
      cost: equipment.cost,
      heat: equipment.heat,
      damage: equipment.damage,
      range: equipment.range,
      ammunition: equipment.ammunition
    },
    special_rules: equipment.special_rules?.rules || [],
    location_restrictions: equipment.location_restrictions || []
  };
};
```

---

## 🔄 **State Management Patterns**

### **Undo/Redo System Implementation**
```typescript
interface UndoRedoManager<T> {
  current: T;
  undoStack: T[];
  redoStack: T[];
  maxStackSize: number;
}

export class UnitUndoRedoManager {
  private state: UndoRedoManager<EditableUnit>;
  private listeners: ((state: UndoRedoManager<EditableUnit>) => void)[] = [];
  
  constructor(initialUnit: EditableUnit, maxStackSize: number = 50) {
    this.state = {
      current: initialUnit,
      undoStack: [],
      redoStack: [],
      maxStackSize
    };
  }
  
  // Push a new state to the undo stack
  pushState(newUnit: EditableUnit): void {
    // Don't add to stack if the unit hasn't actually changed
    if (this.deepEqual(this.state.current, newUnit)) {
      return;
    }
    
    // Add current state to undo stack
    this.state.undoStack.push(this.state.current);
    
    // Limit stack size
    if (this.state.undoStack.length > this.state.maxStackSize) {
      this.state.undoStack.shift();
    }
    
    // Clear redo stack when new state is added
    this.state.redoStack = [];
    
    // Update current state
    this.state.current = newUnit;
    
    this.notifyListeners();
  }
  
  // Undo the last change
  undo(): EditableUnit | null {
    if (this.state.undoStack.length === 0) {
      return null;
    }
    
    const previousState = this.state.undoStack.pop()!;
    this.state.redoStack.push(this.state.current);
    this.state.current = previousState;
    
    this.notifyListeners();
    return this.state.current;
  }
  
  // Redo the last undone change
  redo(): EditableUnit | null {
    if (this.state.redoStack.length === 0) {
      return null;
    }
    
    const nextState = this.state.redoStack.pop()!;
    this.state.undoStack.push(this.state.current);
    this.state.current = nextState;
    
    this.notifyListeners();
    return this.state.current;
  }
  
  // Check if undo is available
  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }
  
  // Check if redo is available
  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }
  
  // Get current state
  getCurrentState(): EditableUnit {
    return this.state.current;
  }
  
  // Subscribe to state changes
  subscribe(listener: (state: UndoRedoManager<EditableUnit>) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
  
  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }
}

// React hook for undo/redo functionality
export const useUndoRedo = (initialUnit: EditableUnit) => {
  const [manager] = useState(() => new UnitUndoRedoManager(initialUnit));
  const [state, setState] = useState(() => manager.getCurrentState());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  useEffect(() => {
    const unsubscribe = manager.subscribe((managerState) => {
      setState(managerState.current);
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
    });
    
    return unsubscribe;
  }, [manager]);
  
  const updateUnit = useCallback((newUnit: EditableUnit) => {
    manager.pushState(newUnit);
  }, [manager]);
  
  const undo = useCallback(() => {
    const result = manager.undo();
    return result;
  }, [manager]);
  
  const redo = useCallback(() => {
    const result = manager.redo();
    return result;
  }, [manager]);
  
  return {
    unit: state,
    updateUnit,
    undo,
    redo,
    canUndo,
    canRedo
  };
};
```

### **Performance Optimization Patterns**
```typescript
// Memoization for expensive calculations
export const useMemoizedCalculations = (unit: EditableUnit) => {
  const totalWeight = useMemo(() => {
    return calculateTotalWeight(unit);
  }, [unit.equipment, unit.armorAllocation]);
  
  const battleValue = useMemo(() => {
    return calculateBattleValue(unit);
  }, [unit.equipment, unit.armorAllocation, unit.selectedQuirks]);
  
  const heatEfficiency = useMemo(() => {
    return calculateHeatEfficiency(unit);
  }, [unit.equipment]);
  
  const criticalSpaceUsage = useMemo(() => {
    return calculateCriticalSpaceUsage(unit);
  }, [unit.criticalSlots, unit.equipment]);
  
  return {
    totalWeight,
    battleValue,
    heatEfficiency,
    criticalSpaceUsage
  };
};

// Debounced state updates
export const useDebouncedUnitUpdate = (
  unit: EditableUnit,
  onUnitChange: (unit: EditableUnit) => void,
  delay: number = 300
) => {
  const [pendingUpdates, setPendingUpdates] = useState<Partial<EditableUnit>>({});
  
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<EditableUnit>) => {
      const newUnit = { ...unit, ...updates };
      onUnitChange(newUnit);
      setPendingUpdates({});
    }, delay),
    [unit, onUnitChange, delay]
  );
  
  const updateUnit = useCallback((updates: Partial<EditableUnit>) => {
    const newPendingUpdates = { ...pendingUpdates, ...updates };
    setPendingUpdates(newPendingUpdates);
    debouncedUpdate(newPendingUpdates);
  }, [pendingUpdates, debouncedUpdate]);
  
  return { updateUnit, hasPendingUpdates: Object.keys(pendingUpdates).length > 0 };
};
```

---

## 📊 **API Implementation Patterns**

### **Query Builder with Type Safety**
```typescript
interface QueryCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: any;
}

interface QueryOptions {
  conditions: QueryCondition[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

export class TypeSafeQueryBuilder {
  private conditions: QueryCondition[] = [];
  private orderByClause: { field: string; direction: 'asc' | 'desc' }[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  
  where(field: string, operator: QueryCondition['operator'], value: any): this {
    this.conditions.push({ field, operator, value });
    return this;
  }
  
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByClause.push({ field, direction });
    return this;
  }
  
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }
  
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }
  
  build(): { sql: string; params: any[] } {
    let sql = 'SELECT * FROM units';
    const params: any[] = [];
    
    if (this.conditions.length > 0) {
      const whereClause = this.conditions.map(condition => {
        switch (condition.operator) {
          case 'eq':
            params.push(condition.value);
            return `${condition.field} = ?`;
          case 'ne':
            params.push(condition.value);
            return `${condition.field} != ?`;
          case 'gt':
            params.push(condition.value);
            return `${condition.field} > ?`;
          case 'gte':
            params.push(condition.value);
            return `${condition.field} >= ?`;
          case 'lt':
            params.push(condition.value);
            return `${condition.field} < ?`;
          case 'lte':
            params.push(condition.value);
            return `${condition.field} <= ?`;
          case 'like':
            params.push(`%${condition.value}%`);
            return `${condition.field} LIKE ?`;
          case 'in':
            const placeholders = condition.value.map(() => '?').join(',');
            params.push(...condition.value);
            return `${condition.field} IN (${placeholders})`;
          default:
            throw new Error(`Unsupported operator: ${condition.operator}`);
        }
      });
      
      sql += ` WHERE ${whereClause.join(' AND ')}`;
    }
    
    if (this.orderByClause.length > 0) {
      const orderBy = this.orderByClause
        .map(clause => `${clause.field} ${clause.direction.toUpperCase()}`)
        .join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return { sql, params };
  }
}

// Usage example
const query = new TypeSafeQueryBuilder()
  .where('tech_base', 'eq', 'Inner Sphere')
  .where('mass', 'gte', 50)
  .where('mass', 'lte', 75)
  .orderBy('chassis', 'asc')
  .orderBy('model', 'asc')
  .limit(20)
  .build();
```

### **API Response Caching**
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class APICache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes
    this.defaultTTL = defaultTTL;
  }
  
  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Generate cache key from query parameters
  generateKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);
    
    return JSON.stringify(sortedParams);
  }
}

// API hook with caching
export const useUnitsAPI = () => {
  const cache = useMemo(() => new APICache(), []);
  
  const fetchUnits = useCallback(async (filters: UnitFilters) => {
    const cacheKey = cache.generateKey(filters);
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Fetch from API
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await fetch(`/api/units?${queryParams.toString()}`);
    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, data);
    
    return data;
  }, [cache]);
  
  return { fetchUnits };
};
```

---

## 🎨 **UI Component Patterns**

### **Compound Component Pattern**
```typescript
// ArmorAllocationPanel using compound component pattern
interface ArmorPanelContextType {
  unit: EditableUnit;
  allocation: ArmorAllocation;
  onArmorChange: (updates: Partial<ArmorAllocation>) => void;
  maxArmor: number;
  isReadOnly: boolean;
}

const ArmorPanelContext = createContext<ArmorPanelContextType | null>(null);

export const ArmorAllocationPanel = ({ unit, onUnitChange, readOnly = false }: TabProps) => {
  const allocation = unit.armorAllocation;
  const maxArmor = useMemo(() => calculateMaxArmorForTonnage(unit.mass), [unit.mass]);
  
  const handleArmorChange = useCallback((updates: Partial<ArmorAllocation>) => {
    const newAllocation = { ...allocation, ...updates };
    onUnitChange({ armorAllocation: newAllocation });
  }, [allocation, onUnitChange]);
  
  const contextValue: ArmorPanelContextType = {
    unit,
    allocation,
    onArmorChange: handleArmorChange,
    maxArmor,
    isReadOnly: readOnly
  };
  
  return (
    <ArmorPanelContext.Provider value={contextValue}>
      <div className="armor-allocation-panel">
        <ArmorAllocationPanel.Header />
        <ArmorAllocationPanel.Diagram />
        <ArmorAllocationPanel.Controls />
        <ArmorAllocationPanel.Summary />
      </div>
    </ArmorPanelContext.Provider>
  );
};

// Sub-components
ArmorAllocationPanel.Header = () => {
  const context = useContext(ArmorPanelContext)!;
  
  return (
    <div className="armor-header">
      <h3>Armor Allocation</h3>
      <span className="armor-total">
        {calculateTotalArmor(context.allocation)} / {context.maxArmor}
      </span>
    </div>
  );
};

ArmorAllocationPanel.Diagram = () => {
  const context = useContext(ArmorPanelContext)!;
  
  return (
    <ArmorDiagram
      unit={context.unit}
      allocation={context.allocation}
      onArmorChange={context.onArmorChange}
      readOnly={context.isReadOnly}
    />
  );
};

ArmorAllocationPanel.Controls = () => {
  const context = useContext(ArmorPanelContext)!;
  
  const handleAutoAllocate = (pattern: string) => {
    let newAllocation: ArmorAllocation;
    
    switch (pattern) {
      case 'maximum':
        newAllocation = allocateMaximumArmor(context.unit, context.maxArmor);
        break;
      case 'balanced':
        newAllocation = allocateBalancedArmor(context.unit, context.maxArmor);
        break;
      case 'front-heavy':
        newAllocation = allocateFrontHeavyArmor(context.unit, context.maxArmor);
        break;
      default:
        return;
    }
    
    context.onArmorChange(newAllocation);
  };
  
  return (
    <div className="armor-controls">
      <button onClick={() => handleAutoAllocate('maximum')}>
        Maximum Protection
      </button>
      <button onClick={() => handleAutoAllocate('balanced')}>
        Balanced
      </button>
      <button onClick={() => handleAutoAllocate('front-heavy')}>
        Front Heavy
      </button>
    </div>
  );
};

ArmorAllocationPanel.Summary = () => {
  const context = useContext(ArmorPanelContext)!;
  const totalArmor = calculateTotalArmor(context.allocation);
  const armorWeight = Math.ceil(totalArmor / 16); // 16 points per ton
  
  return (
    <div className="armor-summary">
      <div>Total Points: {totalArmor}</div>
      <div>Weight: {armorWeight} tons</div>
      <div>Efficiency: {((totalArmor / context.maxArmor) * 100).toFixed(1)}%</div>
    </div>
  );
};
```

### **Render Props Pattern for Data Fetching**
```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  }) => React.ReactNode;
  dependencies?: any[];
}

export const DataFetcher = <T,>({ url, children, dependencies = [] }: DataFetcherProps<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);
  
  return <>{children({ data, loading, error, refetch: fetchData })}</>;
};

// Usage
const UnitsListPage = () => {
  return (
    <DataFetcher<UnitsResponse> url="/api/units">
      {({ data, loading, error, refetch }) => {
        if (loading) return <LoadingSpinner />;
        if (error) return <ErrorMessage message={error} onRetry={refetch} />;
        if (!data) return <div>No data available</div>;
        
        return (
          <div>
            <h1>Units ({data.total})</h1>
            <UnitsList units={data.units} />
            <Pagination pagination={data.pagination} />
          </div>
        );
      }}
    </DataFetcher>
  );
};
```

---

## 🧪 **Testing Implementation Patterns**

### **Custom Test Utilities**
```typescript
// Custom render function with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options: {
    initialUnit?: Partial<EditableUnit>;
    theme?: 'light' | 'dark';
  } = {}
) => {
  const { initialUnit, theme = 'light' } = options;
  
  const mockUnit: EditableUnit = {
    id: 'test-unit',
    chassis: 'Test Chassis',
    model: 'Test Model',
    mass: 50,
    tech_base: 'Inner Sphere',
    config: 'Biped',
    rules_level: 'standard',
    era: 'Succession Wars',
    role: 'Brawler',
    is_omnimech: false,
    armorAllocation: createMockArmorAllocation(),
    criticalSlots: createMockCriticalSlots(),
    equipment: [],
    selectedQuirks: [],
    battleValue: 1000,
    cost: 5000000,
    fluffData: createMockFluffData(),
    validationState: { isValid: true, errors: [], warnings: [], suggestions: [] },
    editorMetadata: createMockEditorMetadata(),
    ...initialUnit
  };
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppProvider initialTheme={theme}>
      <UnitProvider initialUnit={mockUnit}>
        {children}
      </UnitProvider>
    </AppProvider>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data creators
export const createMockUnit = (overrides: Partial<EditableUnit> = {}): EditableUnit => {
  return {
    id: 'test-unit',
    chassis: 'Test Chassis',
    model: 'Test Model',
    mass: 50,
    tech_base: 'Inner Sphere',
    config: 'Biped',
    rules_level: 'standard',
    era: 'Succession Wars',
    role: 'Brawler',
    is_omnimech: false,
    armorAllocation: createMockArmorAllocation(),
    criticalSlots: createMockCriticalSlots(),
    equipment: [],
    selectedQuirks: [],
    battleValue: 1000,
    cost: 5000000,
    fluffData: createMockFluffData(),
    validationState: { isValid: true, errors: [], warnings: [], suggestions: [] },
    editorMetadata: createMockEditorMetadata(),
    ...overrides
  };
};

// Integration test helper
export const setupIntegrationTest = async () => {
  // Setup test database
  const db = await createTestDatabase();
  
  // Populate with test data
  await populateTestData(db);
  
  // Mock API endpoints
  const server = setupServer(
    rest.get('/api/units', (req, res, ctx) => {
      const filters = Object.fromEntries(req.url.searchParams);
      const units = getTestUnits(filters);
      return res(ctx.json({ units, total: units.length }));
    }),
    
    rest.post('/api/validate', (req, res, ctx) => {
      const unit = req.body as EditableUnit;
      const validation = validateUnit(unit);
      return res(ctx.json(validation));
    })
  );
  
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  return { db, server };
};
```

---

## 🚀 **Performance Monitoring Implementation**

### **Performance Metrics Collection**
```typescript
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  
  // Start timing an operation
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now()
      });
    };
  }
  
  // Record a metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    
    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`Slow operation: ${metric.name} took ${metric.duration}ms`);
    }
  }
  
  // Get metrics for analysis
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }
  
  // Get average duration for an operation
  getAverageDuration(name: string): number {
    const nameMetrics = this.getMetrics(name);
    if (nameMetrics.length === 0) return 0;
    
    const total = nameMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / nameMetrics.length;
  }
  
  // Setup automatic performance observation
  observePerformance(): void {
    // Observe navigation timing
    const navObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric({
          name: 'navigation',
          duration: entry.duration,
          timestamp: Date.now(),
          metadata: { type: entry.entryType }
        });
      });
    });
    navObserver.observe({ entryTypes: ['navigation'] });
    
    // Observe resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric({
          name: 'resource',
          duration: entry.duration,
          timestamp: Date.now(),
          metadata: { 
            type: entry.entryType,
            name: entry.name,
            size: (entry as any).transferSize
          }
        });
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    
    this.observers.set('navigation', navObserver);
    this.observers.set('resource', resourceObserver);
  }
  
  // Cleanup observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const [monitor] = useState(() => new PerformanceMonitor());
  
  useEffect(() => {
    monitor.observePerformance();
    return () => monitor.disconnect();
  }, [monitor]);
  
  const measureOperation = useCallback((name: string) => {
    return monitor.startTiming(name);
  }, [monitor]);
  
  const getMetrics = useCallback((name?: string) => {
    return monitor.getMetrics(name);
  }, [monitor]);
  
  return { measureOperation, getMetrics };
};
```

---

## 📋 **Error Handling Implementation**

### **Comprehensive Error Boundary**
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ComponentType<ErrorBoundaryState> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });
    
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }
  
  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Send to error tracking service (e.g., Sentry, LogRocket)
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    } catch (e) {
      console.error('Failed to log error to service:', e);
    }
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent {...this.state} />;
    }
    
    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorBoundaryState> = ({ error, errorInfo }) => (
  <div className="error-boundary p-6 bg-red-50 border border-red-200 rounded-lg">
    <h2 className="text-xl font-semibold text-red-800 mb-4">Something went wrong</h2>
    <p className="text-red-700 mb-4">
      An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
    </p>
    
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4">
        <summary className="cursor-pointer text-red-600 font-medium">Error Details (Development)</summary>
        <pre className="mt-2 p-4 bg-red-100 rounded text-sm overflow-auto">
          {error?.stack}
          {errorInfo?.componentStack}
        </pre>
      </details>
    )}
    
    <button 
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reload Page
    </button>
  </div>
);
```

### **Global Error Handler**
```typescript
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default browser behavior
    event.preventDefault();
    
    // Log to error service
    logError(new Error(`Unhandled Promise Rejection: ${event.reason}`));
  });
  
  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    logError(event.error);
  });
  
  // Handle network errors
  window.addEventListener('online', () => {
    console.log('Network connection restored');
  });
  
  window.addEventListener('offline', () => {
    console.warn('Network connection lost');
  });
};

const logError = async (error: Error) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
};
```

---

## 🔗 **Integration Patterns**

### **File Import/Export Implementation**
```typescript
// File format handlers
interface FileHandler {
  canHandle(file: File): boolean;
  import(file: File): Promise<EditableUnit>;
  export(unit: EditableUnit): Blob;
  formatName: string;
  fileExtension: string;
}

export class MegaMekLabFileHandler implements FileHandler {
  formatName = 'MegaMekLab Format';
  fileExtension = '.blk';
  
  canHandle(file: File): boolean {
    return file.name.toLowerCase().endsWith('.blk') || 
           file.name.toLowerCase().endsWith('.mtf');
  }
  
  async import(file: File): Promise<EditableUnit> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    const unit: Partial<EditableUnit> = {
      id: crypto.randomUUID(),
      equipment: [],
      selectedQuirks: []
    };
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      switch (key.trim()) {
        case 'chassis':
          unit.chassis = value;
          break;
        case 'model':
          unit.model = value;
          break;
        case 'mass':
          unit.mass = parseInt(value);
          break;
        case 'techbase':
          unit.tech_base = this.mapTechBase(value);
          break;
        case 'config':
          unit.config = this.mapConfig(value);
          break;
        // Handle other fields...
      }
    }
    
    // Validate and complete the unit
    return this.validateAndCompleteUnit(unit as EditableUnit);
  }
  
  export(unit: EditableUnit): Blob {
    const lines: string[] = [];
    
    lines.push(`chassis:${unit.chassis}`);
    lines.push(`model:${unit.model}`);
    lines.push(`mass:${unit.mass}`);
    lines.push(`techbase:${this.exportTechBase(unit.tech_base)}`);
    lines.push(`config:${this.exportConfig(unit.config)}`);
    
    // Add equipment
    unit.equipment.forEach((equipment, index) => {
      lines.push(`equipment:${equipment.name}:${equipment.location}`);
    });
    
    // Add armor
    Object.entries(unit.armorAllocation).forEach(([location, armor]) => {
      if ('rear' in armor) {
        lines.push(`armor:${location}:${armor.front}:${armor.rear}`);
      } else {
        lines.push(`armor:${location}:${armor.front}`);
      }
    });
    
    const content = lines.join('\n');
    return new Blob([content], { type: 'text/plain' });
  }
  
  private mapTechBase(value: string): TechBase {
    const mapping: Record<string, TechBase> = {
      'IS': 'Inner Sphere',
      'Clan': 'Clan',
      'Mixed (IS)': 'Mixed (IS Chassis)',
      'Mixed (Clan)': 'Mixed (Clan Chassis)'
    };
    return mapping[value] || 'Inner Sphere';
  }
  
  private exportTechBase(techBase: TechBase): string {
    const mapping: Record<TechBase, string> = {
      'Inner Sphere': 'IS',
      'Clan': 'Clan',
      'Mixed (IS Chassis)': 'Mixed (IS)',
      'Mixed (Clan Chassis)': 'Mixed (Clan)'
    };
    return mapping[techBase];
  }
  
  private mapConfig(value: string): UnitConfig {
    const mapping: Record<string, UnitConfig> = {
      'Biped': 'Biped',
      'Quad': 'Quad',
      'Tripod': 'Tripod',
      'LAM': 'LAM'
    };
    return mapping[value] || 'Biped';
  }
  
  private exportConfig(config: UnitConfig): string {
    return config.replace(' Omnimech', '');
  }
  
  private validateAndCompleteUnit(unit: EditableUnit): EditableUnit {
    // Ensure all required fields are present
    unit.armorAllocation = unit.armorAllocation || this.createDefaultArmorAllocation();
    unit.criticalSlots = unit.criticalSlots || this.createDefaultCriticalSlots();
    unit.validationState = validateUnit(unit);
    
    return unit;
  }
  
  private createDefaultArmorAllocation(): ArmorAllocation {
    return {
      head: { front: 9 },
      center_torso: { front: 16, rear: 8 },
      left_torso: { front: 12, rear: 6 },
      right_torso: { front: 12, rear: 6 },
      left_arm: { front: 8 },
      right_arm: { front: 8 },
      left_leg: { front: 10 },
      right_leg: { front: 10 }
    };
  }
  
  private createDefaultCriticalSlots(): CriticalSlotAssignment {
    const createEmptySlots = (count: number, location: string): CriticalSlot[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `${location}-${i}`,
        equipment: null,
        location,
        slot_number: i,
        is_system_equipment: false
      }));
    };
    
    return {
      head: createEmptySlots(6, 'head'),
      center_torso: createEmptySlots(12, 'center_torso'),
      left_torso: createEmptySlots(12, 'left_torso'),
      right_torso: createEmptySlots(12, 'right_torso'),
      left_arm: createEmptySlots(12, 'left_arm'),
      right_arm: createEmptySlots(12, 'right_arm'),
      left_leg: createEmptySlots(6, 'left_leg'),
      right_leg: createEmptySlots(6, 'right_leg')
    };
  }
}

// File manager for handling multiple formats
export class FileManager {
  private handlers: FileHandler[] = [
    new MegaMekLabFileHandler(),
    // Add other format handlers as needed
  ];
  
  async importFile(file: File): Promise<EditableUnit> {
    const handler = this.handlers.find(h => h.canHandle(file));
    
    if (!handler) {
      throw new Error(`Unsupported file format: ${file.name}`);
    }
    
    try {
      return await handler.import(file);
    } catch (error) {
      throw new Error(`Failed to import ${file.name}: ${error.message}`);
    }
  }
  
  exportUnit(unit: EditableUnit, format: string): Blob {
    const handler = this.handlers.find(h => h.formatName === format);
    
    if (!handler) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    return handler.export(unit);
  }
  
  getSupportedFormats(): Array<{ name: string; extension: string }> {
    return this.handlers.map(h => ({
      name: h.formatName,
      extension: h.fileExtension
    }));
  }
}
```

### **Batch Operations Implementation**
```typescript
interface BatchOperation<T> {
  execute(items: T[]): Promise<BatchResult<T>>;
  canExecute(items: T[]): boolean;
  name: string;
  description: string;
}

interface BatchResult<T> {
  success: T[];
  failed: Array<{ item: T; error: string }>;
  summary: string;
}

export class UnitBatchOperations {
  private operations: Map<string, BatchOperation<EditableUnit>> = new Map();
  
  constructor() {
    this.registerOperation(new TechBaseConversionOperation());
    this.registerOperation(new ArmorOptimizationOperation());
    this.registerOperation(new ValidationFixOperation());
  }
  
  registerOperation(operation: BatchOperation<EditableUnit>): void {
    this.operations.set(operation.name, operation);
  }
  
  async executeOperation(
    operationName: string, 
    units: EditableUnit[]
  ): Promise<BatchResult<EditableUnit>> {
    const operation = this.operations.get(operationName);
    
    if (!operation) {
      throw new Error(`Unknown operation: ${operationName}`);
    }
    
    if (!operation.canExecute(units)) {
      throw new Error(`Cannot execute ${operationName} on provided units`);
    }
    
    return await operation.execute(units);
  }
  
  getAvailableOperations(): Array<{ name: string; description: string }> {
    return Array.from(this.operations.values()).map(op => ({
      name: op.name,
      description: op.description
    }));
  }
}

// Example batch operation: Tech base conversion
class TechBaseConversionOperation implements BatchOperation<EditableUnit> {
  name = 'tech-base-conversion';
  description = 'Convert units to a different tech base';
  
  canExecute(units: EditableUnit[]): boolean {
    return units.length > 0 && units.every(unit => 
      unit.tech_base === 'Inner Sphere' || unit.tech_base === 'Clan'
    );
  }
  
  async execute(units: EditableUnit[]): Promise<BatchResult<EditableUnit>> {
    const success: EditableUnit[] = [];
    const failed: Array<{ item: EditableUnit; error: string }> = [];
    
    for (const unit of units) {
      try {
        const convertedUnit = this.convertTechBase(unit);
        const validation = validateUnit(convertedUnit);
        
        if (validation.isValid) {
          success.push(convertedUnit);
        } else {
          failed.push({
            item: unit,
            error: `Validation failed: ${validation.errors[0]?.message}`
          });
        }
      } catch (error) {
        failed.push({
          item: unit,
          error: error.message
        });
      }
    }
    
    return {
      success,
      failed,
      summary: `Converted ${success.length} units successfully, ${failed.length} failed`
    };
  }
  
  private convertTechBase(unit: EditableUnit): EditableUnit {
    const newTechBase: TechBase = unit.tech_base === 'Inner Sphere' ? 'Clan' : 'Inner Sphere';
    
    // Convert equipment to equivalent tech base
    const convertedEquipment = unit.equipment.map(eq => {
      const equivalent = this.findEquivalentEquipment(eq, newTechBase);
      return equivalent || eq;
    });
    
    return {
      ...unit,
      tech_base: newTechBase,
      equipment: convertedEquipment,
      validationState: { isValid: true, errors: [], warnings: [], suggestions: [] }
    };
  }
  
  private findEquivalentEquipment(equipment: Equipment, targetTechBase: TechBase): Equipment | null {
    // Implementation would include mapping between IS and Clan equivalents
    // This is a simplified example
    const equivalents: Record<string, Record<string, string>> = {
      'Large Laser': {
        'Inner Sphere': 'ER Large Laser',
        'Clan': 'ER Large Laser (Clan)'
      }
      // Add more mappings...
    };
    
    const mappingKey = targetTechBase === 'Clan' ? 'Clan' : 'Inner Sphere';
    const equivalentName = equivalents[equipment.name]?.[mappingKey];
    
    if (equivalentName) {
      // Find the equivalent equipment in the database
      // This would require access to the equipment database
      return { ...equipment, name: equivalentName, tech_base: targetTechBase === 'Clan' ? 'Clan' : 'IS' };
    }
    
    return null;
  }
}
```

---

## 📈 **Analytics and Metrics**

### **Usage Analytics Implementation**
```typescript
interface AnalyticsEvent {
  event: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;
  
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.isEnabled = process.env.NODE_ENV === 'production' && 
                     !localStorage.getItem('analytics-disabled');
  }
  
  // Track user actions
  track(event: string, category: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    const analyticsEvent: AnalyticsEvent = {
      event,
      category,
      properties,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };
    
    this.events.push(analyticsEvent);
    this.sendEvent(analyticsEvent);
  }
  
  // Track page views
  trackPageView(page: string, properties?: Record<string, any>): void {
    this.track('page_view', 'navigation', { page, ...properties });
  }
  
  // Track feature usage
  trackFeatureUsage(feature: string, action: string, properties?: Record<string, any>): void {
    this.track(action, 'feature_usage', { feature, ...properties });
  }
  
  // Track performance metrics
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track('performance_metric', 'performance', { 
      metric, 
      value, 
      ...properties 
    });
  }
  
  // Track errors
  trackError(error: Error, context?: string): void {
    this.track('error', 'error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }
  
  // Set user ID for session tracking
  setUserId(userId: string): void {
    this.userId = userId;
  }
  
  // Send event to analytics service
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Send to your analytics service (e.g., Google Analytics, Mixpanel, etc.)
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }
  
  // Batch send events periodically
  startBatchSending(intervalMs: number = 30000): void {
    setInterval(() => {
      if (this.events.length > 0) {
        this.sendBatch();
      }
    }, intervalMs);
  }
  
  private async sendBatch(): Promise<void> {
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventsToSend)
      });
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      // Re-add events to queue if sending failed
      this.events.unshift(...eventsToSend);
    }
  }
}

// React hook for analytics
export const useAnalytics = () => {
  const [analytics] = useState(() => new AnalyticsManager());
  
  useEffect(() => {
    analytics.startBatchSending();
  }, [analytics]);
  
  const trackUnitEdit = useCallback((action: string, unitType: string) => {
    analytics.trackFeatureUsage('unit_editor', action, { unit_type: unitType });
  }, [analytics]);
  
  const trackEquipmentUsage = useCallback((equipment: string, location: string) => {
    analytics.trackFeatureUsage('equipment_placement', 'place_equipment', {
      equipment,
      location
    });
  }, [analytics]);
  
  const trackValidationIssue = useCallback((issueType: string, severity: string) => {
    analytics.trackFeatureUsage('validation', 'validation_issue', {
      issue_type: issueType,
      severity
    });
  }, [analytics]);
  
  return {
    analytics,
    trackUnitEdit,
    trackEquipmentUsage,
    trackValidationIssue
  };
};
```

---

## 🎯 **Best Practices Summary**

### **Development Guidelines**
1. **Type Safety**: Always use TypeScript with strict mode enabled
2. **Immutability**: Never mutate state directly; always create new objects
3. **Performance**: Use React.memo, useMemo, and useCallback appropriately
4. **Error Handling**: Implement comprehensive error boundaries and validation
5. **Testing**: Maintain 100% test coverage for critical business logic
6. **Documentation**: Document complex algorithms and business rules inline

### **Code Organization Principles**
1. **Single Responsibility**: Each function/component should have one clear purpose
2. **Separation of Concerns**: Keep business logic separate from UI components
3. **Dependency Injection**: Use dependency injection for testability
4. **Configuration Over Code**: Use configuration files for environment-specific settings
5. **Progressive Enhancement**: Ensure core functionality works without advanced features

### **Performance Optimization Guidelines**
1. **Lazy Loading**: Load components and data only when needed
2. **Memoization**: Cache expensive calculations and components
3. **Debouncing**: Debounce user inputs and API calls
4. **Virtual Scrolling**: Use virtual scrolling for large lists
5. **Bundle Optimization**: Use code splitting and tree shaking

### **Security Best Practices**
1. **Input Validation**: Validate all user inputs on both client and server
2. **Sanitization**: Sanitize data before display or storage
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Authentication**: Implement proper authentication and authorization
5. **HTTPS**: Always use HTTPS in production environments

---

## 🏆 **Implementation Success Metrics**

### **Code Quality Metrics**
- **Type Coverage**: 100% TypeScript coverage
- **Test Coverage**: 66/66 tests passing (100%)
- **Performance**: Sub-1-second response times for all operations
- **Error Rate**: < 0.1% unhandled errors in production
- **Bundle Size**: Optimized for fast loading

### **User Experience Metrics**
- **Load Time**: < 3 seconds initial page load
- **Interaction Response**: < 100ms for UI interactions
- **Validation Feedback**: Real-time validation with < 300ms delay
- **Error Recovery**: Graceful degradation for all error scenarios
- **Accessibility**: WCAG 2.1 compliance

### **Maintainability Metrics**
- **Documentation Coverage**: Comprehensive inline and external documentation
- **Code Complexity**: Low cyclomatic complexity across all modules
- **Dependency Management**: Minimal and well-maintained dependencies
- **Refactoring Safety**: High test coverage enables safe refactoring
- **Team Onboarding**: New developers productive within 1 day

This implementation reference provides the detailed patterns and solutions needed to extend and maintain the BattleTech Editor App effectively. All patterns are production-tested and follow industry best practices for modern web applications.

---

# 🏗️ **Large File Refactoring Implementation Plan**

## Executive Summary

This section provides a comprehensive plan for breaking down large files (500+ lines) in the BattleTech Editor App into smaller, more maintainable components following SOLID principles and the project's architectural guidelines.

### **Critical Files Identified for Refactoring**

| File | Lines | Priority | Complexity | Dependencies |
|------|-------|----------|------------|--------------|
| `UnitCriticalManager.ts` | 3,257 | 🔴 Critical | Very High | Core system |
| `customizer-v2/index.tsx` | 2,020 | 🔴 Critical | High | UI components |
| `missile-weapons.ts` | 1,650 | 🟡 Medium | Low | Data only |
| `ballistic-weapons.ts` | 1,023 | 🟡 Medium | Low | Data only |
| `OverviewTabV2.tsx` | 992 | 🔴 High | High | UI + Logic |
| `UnitDetail.tsx` | 924 | 🟡 Medium | Medium | Display logic |
| `UnitValidationService.ts` | 868 | 🔴 High | High | Business logic |
| `EquipmentDatabase.tsx` | 843 | 🟡 Medium | Medium | UI + Data |
| `MultiUnitProvider.tsx` | 839 | 🔴 High | High | State management |

---

## 🎯 **Phase 1: UnitCriticalManager Breakdown (Priority 1)**

### **Current State Analysis**
```typescript
// Current monolithic structure (3,257 lines)
class UnitCriticalManager {
  // System component management (~800 lines)
  // Equipment allocation logic (~600 lines)
  // Critical slot calculations (~500 lines)
  // Weight and balance calculations (~400 lines)
  // Validation and rules checking (~400 lines)
  // State management and persistence (~300 lines)
  // Utility and helper methods (~250 lines)
}
```

### **Target Architecture**
```typescript
// New modular structure (~300-400 lines each)
interface UnitCriticalManager {
  // Core orchestrator (300 lines)
  systemComponentService: SystemComponentService;
  equipmentAllocationService: EquipmentAllocationService;
  criticalSlotCalculator: CriticalSlotCalculator;
  weightBalanceService: WeightBalanceService;
  constructionRulesValidator: ConstructionRulesValidator;
  unitStateManager: UnitStateManager;
}
```

### **Service Extraction Plan**

#### **1.1 SystemComponentService** (~400 lines)
```typescript
interface SystemComponentService {
  // Engine management
  calculateEngineWeight(rating: number, type: string): number;
  getEngineSlots(rating: number, type: string): number;
  validateEngineRating(tonnage: number, walkMP: number): boolean;
  
  // Gyro management  
  calculateGyroWeight(engineRating: number, type: string): number;
  getGyroSlots(type: string): number;
  
  // Heat sink management
  calculateHeatSinkRequirements(weapons: Equipment[]): number;
  allocateInternalHeatSinks(engineRating: number, heatSinkType: string): number;
  calculateExternalHeatSinks(total: number, internal: number): number;
  
  // Structure management
  calculateStructureWeight(tonnage: number, type: string): number;
  getStructureSlots(type: string): number;
}
```

#### **1.2 EquipmentAllocationService** (~500 lines)
```typescript
interface EquipmentAllocationService {
  // Equipment placement
  canPlaceEquipment(equipment: Equipment, location: string, unit: UnitData): ValidationResult;
  placeEquipment(equipment: Equipment, location: string, unit: UnitData): UnitData;
  removeEquipment(equipmentId: string, unit: UnitData): UnitData;
  moveEquipment(equipmentId: string, fromLocation: string, toLocation: string, unit: UnitData): UnitData;
  
  // Auto-allocation
  autoAllocateEquipment(equipment: Equipment[], unit: UnitData): AllocationResult;
  optimizeEquipmentPlacement(unit: UnitData): UnitData;
  
  // Validation
  validateEquipmentCompatibility(equipment: Equipment, unit: UnitData): ValidationResult;
  checkLocationRestrictions(equipment: Equipment, location: string): boolean;
}
```

#### **1.3 CriticalSlotCalculator** (~350 lines)
```typescript
interface CriticalSlotCalculator {
  // Slot calculations
  calculateTotalSlots(config: UnitConfig): LocationSlotBreakdown;
  calculateUsedSlots(unit: UnitData): LocationSlotBreakdown;
  calculateAvailableSlots(unit: UnitData): LocationSlotBreakdown;
  
  // Special component handling
  allocateSpecialComponents(unit: UnitData): CriticalSlotAllocation;
  validateSlotAllocation(allocation: CriticalSlotAllocation): ValidationResult;
  
  // Optimization
  optimizeSlotUsage(unit: UnitData): CriticalSlotAllocation;
  findBestLocationForEquipment(equipment: Equipment, unit: UnitData): string | null;
}

interface LocationSlotBreakdown {
  HD: { total: number; used: number; available: number };
  CT: { total: number; used: number; available: number };
  LT: { total: number; used: number; available: number };
  RT: { total: number; used: number; available: number };
  LA: { total: number; used: number; available: number };
  RA: { total: number; used: number; available: number };
  LL: { total: number; used: number; available: number };
  RL: { total: number; used: number; available: number };
}
```

#### **1.4 WeightBalanceService** (~350 lines)
```typescript
interface WeightBalanceService {
  // Weight calculations
  calculateTotalWeight(unit: UnitData): WeightBreakdown;
  calculateRemainingTonnage(unit: UnitData): number;
  validateWeightLimits(unit: UnitData): ValidationResult;
  
  // Balance analysis
  analyzeCenterOfGravity(unit: UnitData): BalanceAnalysis;
  checkStabilityFactors(unit: UnitData): StabilityReport;
  
  // Optimization suggestions
  suggestWeightOptimizations(unit: UnitData): OptimizationSuggestion[];
  findLightweightAlternatives(equipment: Equipment): Equipment[];
}

interface WeightBreakdown {
  structure: number;
  engine: number;
  gyro: number;
  cockpit: number;
  armor: number;
  equipment: number;
  total: number;
  percentage: number;
}
```

#### **1.5 ConstructionRulesValidator** (~400 lines)
```typescript
interface ConstructionRulesValidator {
  // Core validation
  validateUnit(unit: UnitData): ValidationResult;
  validateBattleTechRules(unit: UnitData): RuleViolation[];
  validateTechLevel(unit: UnitData): TechLevelValidation;
  
  // Specific rule checks
  validateArmorLimits(unit: UnitData): ValidationResult;
  validateWeaponRanges(unit: UnitData): ValidationResult;
  validateHeatManagement(unit: UnitData): ValidationResult;
  validateCriticalHits(unit: UnitData): ValidationResult;
  
  // Era and tech base validation
  validateEraRestrictions(unit: UnitData, era: string): ValidationResult;
  validateTechBaseConsistency(unit: UnitData): ValidationResult;
}
```

#### **1.6 UnitStateManager** (~300 lines)
```typescript
interface UnitStateManager {
  // State management
  getUnitState(): UnitData;
  updateUnitState(updates: Partial<UnitData>): void;
  resetUnitState(): void;
  
  // Persistence
  saveToStorage(key: string): Promise<void>;
  loadFromStorage(key: string): Promise<UnitData | null>;
  
  // History management
  pushState(state: UnitData): void;
  undo(): UnitData | null;
  redo(): UnitData | null;
  canUndo(): boolean;
  canRedo(): boolean;
  
  // Event handling
  subscribeToChanges(callback: (state: UnitData) => void): () => void;
  notifyStateChange(changes: Partial<UnitData>): void;
}
```

### **Data Flow Preservation Map**

```mermaid
graph TD
    A[UnitCriticalManager] --> B[SystemComponentService]
    A --> C[EquipmentAllocationService] 
    A --> D[CriticalSlotCalculator]
    A --> E[WeightBalanceService]
    A --> F[ConstructionRulesValidator]
    A --> G[UnitStateManager]
    
    B --> G
    C --> D
    C --> E
    C --> F
    D --> E
    E --> F
    F --> G
    
    G --> H[UI Components]
    G --> I[API Layer]
    G --> J[Persistence Layer]
```

### **Implementation Steps**

#### **Step 1.1: Extract UnitStateManager** (Day 1)
```typescript
// 1. Create new file: utils/unit/UnitStateManager.ts
// 2. Move state management logic
// 3. Update imports in UnitCriticalManager
// 4. Add interface contracts
// 5. Test state operations
```

#### **Step 1.2: Extract SystemComponentService** (Day 2)
```typescript
// 1. Create new file: services/SystemComponentService.ts  
// 2. Move engine, gyro, heat sink logic
// 3. Update UnitCriticalManager to use service
// 4. Add dependency injection
// 5. Test system component calculations
```

#### **Step 1.3: Extract WeightBalanceService** (Day 3)
```typescript
// 1. Create new file: services/WeightBalanceService.ts
// 2. Move weight calculation logic
// 3. Add balance analysis capabilities
// 4. Update dependent services
// 5. Test weight calculations
```

#### **Step 1.4: Extract CriticalSlotCalculator** (Day 4)
```typescript
// 1. Create new file: utils/criticalSlots/CriticalSlotCalculator.ts
// 2. Move slot calculation logic
// 3. Add optimization algorithms
// 4. Update equipment allocation service
// 5. Test slot calculations
```

#### **Step 1.5: Extract EquipmentAllocationService** (Day 5)
```typescript
// 1. Create new file: services/EquipmentAllocationService.ts
// 2. Move equipment placement logic
// 3. Add auto-allocation capabilities
// 4. Integrate with other services
// 5. Test equipment operations
```

#### **Step 1.6: Extract ConstructionRulesValidator** (Day 6)
```typescript
// 1. Create new file: services/ConstructionRulesValidator.ts
// 2. Move validation logic
// 3. Add comprehensive rule checking
// 4. Integrate with all services
// 5. Test validation rules
```

#### **Step 1.7: Refactor Core Manager** (Day 7)
```typescript
// 1. Simplify UnitCriticalManager to orchestrator
// 2. Add dependency injection
// 3. Update all component integrations
// 4. Run comprehensive tests
// 5. Performance validation
```

---

## 🎨 **Phase 2: Customizer V2 Tab Extraction (Priority 2)**

### **Current State Analysis**
```typescript
// Current monolithic structure (2,020 lines)
const CustomizerV2Content = () => {
  // StructureTabV2 component (~450 lines)
  // ArmorTabV2 component (~500 lines)  
  // EquipmentTabV2 component (~200 lines)
  // CriticalsTabV2 component (~100 lines)
  // FluffTabV2 component (~100 lines)
  // Main wrapper and state management (~670 lines)
};
```

### **Target Architecture**
```typescript
// New modular structure
const CustomizerV2Content = () => {
  // Main orchestrator only (~200 lines)
  return (
    <TabManager>
      <OverviewTabV2 />      // Existing component
      <StructureTabV2 />     // → components/editor/tabs/
      <ArmorTabV2 />         // → components/editor/tabs/
      <EquipmentTabV2 />     // → components/editor/tabs/
      <CriticalsTabV2 />     // → components/editor/tabs/
      <FluffTabV2 />         // → components/editor/tabs/
    </TabManager>
  );
};
```

### **Tab Component Extraction Plan**

#### **2.1 StructureTabV2.tsx** (~400 lines)
```typescript
// Target: components/editor/tabs/StructureTabV2.tsx
interface StructureTabProps {
  unit: UnitData;
  onUnitChange: (updates: Partial<UnitData>) => void;
  readOnly?: boolean;
}

const StructureTabV2: React.FC<StructureTabProps> = ({ unit, onUnitChange, readOnly }) => {
  // Core configuration panel
  // Engine type selector
  // Movement configuration
  // System components panel
  // Enhanced summary table
};
```

#### **2.2 ArmorTabV2.tsx** (~450 lines)
```typescript
// Target: components/editor/tabs/ArmorTabV2.tsx
interface ArmorTabProps {
  unit: UnitData;
  onUnitChange: (updates: Partial<UnitData>) => void;
  readOnly?: boolean;
}

const ArmorTabV2: React.FC<ArmorTabProps> = ({ unit, onUnitChange, readOnly }) => {
  // Armor type controls
  // Tonnage management
  // Interactive armor diagram
  // Auto-allocation buttons
  // Side panel editor
};
```

#### **2.3 Enhanced Tab Components** (~150 lines each)
```typescript
// EquipmentTabV2.tsx - Equipment browser integration
// CriticalsTabV2.tsx - Critical slots management
// FluffTabV2.tsx - Unit background and description
```

### **Shared Components Strategy**
```typescript
// Create reusable components for common patterns
interface TabHeaderProps {
  title: string;
  stats: UnitStats;
  readOnly?: boolean;
}

interface TabControlsProps {
  actions: TabAction[];
  readOnly?: boolean;
}

interface TabSummaryProps {
  data: SummaryData;
  className?: string;
}
```

### **Implementation Steps**

#### **Step 2.1: Extract StructureTabV2** (Day 8)
```typescript
// 1. Create components/editor/tabs/StructureTabV2.tsx
// 2. Move structure-related logic
// 3. Add proper prop interfaces
// 4. Update imports in main file
// 5. Test tab functionality
```

#### **Step 2.2: Extract ArmorTabV2** (Day 9)
```typescript
// 1. Create components/editor/tabs/ArmorTabV2.tsx
// 2. Move armor-related logic
// 3. Integrate with ArmorDiagram components
// 4. Update main file imports
// 5. Test armor interactions
```

#### **Step 2.3: Extract Remaining Tabs** (Day 10)
```typescript
// 1. Create EquipmentTabV2.tsx, CriticalsTabV2.tsx, FluffTabV2.tsx
// 2. Move respective logic
// 3. Add shared components
// 4. Update main file
// 5. Test all tab switching
```

#### **Step 2.4: Refactor Main Component** (Day 11)
```typescript
// 1. Simplify CustomizerV2Content to orchestrator
// 2. Add tab management logic
// 3. Update state management
// 4. Test integration
// 5. Performance validation
```

---

## 📊 **Phase 3: Data File Reorganization (Priority 3)**

### **Equipment Data Structure Reorganization**

#### **Current Structure Issues**
```typescript
// Problematic large files
missile-weapons.ts     // 1,650 lines - all missile weapons
ballistic-weapons.ts   // 1,023 lines - all ballistic weapons  
energy-weapons.ts      // 848 lines - all energy weapons
ammunition.ts          // 795 lines - all ammunition
```

#### **Target Structure**
```typescript
// New organized structure
data/equipment/
├── weapons/
│   ├── energy/
│   │   ├── inner-sphere-lasers.ts      (~150 lines)
│   │   ├── clan-lasers.ts              (~150 lines)
│   │   ├── particle-cannons.ts         (~150 lines)
│   │   ├── plasma-weapons.ts           (~100 lines)
│   │   └── index.ts                    (exports)
│   ├── ballistic/
│   │   ├── autocannons.ts              (~200 lines)
│   │   ├── gauss-rifles.ts             (~150 lines)
│   │   ├── machine-guns.ts             (~100 lines)
│   │   ├── ultra-autocannons.ts        (~150 lines)
│   │   └── index.ts                    (exports)
│   ├── missile/
│   │   ├── short-range-missiles.ts     (~200 lines)
│   │   ├── long-range-missiles.ts      (~200 lines)
│   │   ├── streak-missiles.ts          (~150 lines)
│   │   ├── artillery.ts                (~200 lines)
│   │   ├── special-missiles.ts         (~150 lines)
│   │   └── index.ts                    (exports)
│   └── ammunition/
│       ├── autocannon-ammo.ts          (~150 lines)
│       ├── missile-ammo.ts             (~200 lines)
│       ├── special-ammo.ts             (~150 lines)
│       └── index.ts                    (exports)
├── equipment/
│   ├── electronics.ts                  (~200 lines)
│   ├── movement.ts                     (~150 lines)
│   ├── targeting.ts                    (~150 lines)
│   └── index.ts                        (exports)
└── index.ts                            (main exports)
```

### **Data Migration Strategy**
```typescript
// Automated migration script
interface MigrationRule {
  sourceFile: string;
  targetFiles: Array<{
    path: string;
    filter: (item: EquipmentItem) => boolean;
  }>;
}

const migrationRules: MigrationRule[] = [
  {
    sourceFile: 'energy-weapons.ts',
    targetFiles: [
      {
        path: 'weapons/energy/inner-sphere-lasers.ts',
        filter: (item) => item.techBase === 'IS' && item.name.includes('Laser')
      },
      {
        path: 'weapons/energy/clan-lasers.ts', 
        filter: (item) => item.techBase === 'Clan' && item.name.includes('Laser')
      }
      // ... more rules
    ]
  }
  // ... more migration rules
];
```

### **Implementation Steps**

#### **Step 3.1: Create Migration Script** (Day 12)
```typescript
// 1. Create scripts/data-migration/split-equipment-files.ts
// 2. Define migration rules
// 3. Add validation logic
// 4. Test on sample data
```

#### **Step 3.2: Execute Data Migration** (Day 13)
```typescript
// 1. Run migration script
// 2. Update all import statements
// 3. Update equipment service
// 4. Test data integrity
```

#### **Step 3.3: Update Build System** (Day 14)
```typescript
// 1. Update webpack configuration
// 2. Add tree-shaking optimization
// 3. Update type exports
// 4. Test bundle optimization
```

---

## 🧩 **Phase 4: Component Modularization (Priority 4)**

### **Target Components for Breakdown**

#### **4.1 OverviewTabV2.tsx** (992 lines → 4 components)
```typescript
// Current monolithic component
OverviewTabV2 // 992 lines total

// Target breakdown
├── OverviewTabV2.tsx              // Main component (~200 lines)
├── TechProgressionPanel.tsx       // Tech base management (~250 lines)
├── UnitIdentityPanel.tsx          // Basic unit info (~200 lines)  
├── TechRatingPanel.tsx            // Tech rating controls (~200 lines)
└── OverviewSummaryPanel.tsx       // Statistics display (~150 lines)
```

#### **4.2 UnitDetail.tsx** (924 lines → 5 components)
```typescript
// Current monolithic component
UnitDetail // 924 lines total

// Target breakdown  
├── UnitDetail.tsx                 // Main component (~150 lines)
├── UnitBasicInfo.tsx             // Header and basic stats (~150 lines)
├── UnitTechnicalSpecs.tsx        // Technical specifications (~200 lines)
├── UnitEquipmentSummary.tsx      // Equipment listing (~200 lines)
├── UnitArmorDisplay.tsx          // Armor visualization (~150 lines)
└── UnitActionButtons.tsx         // Actions and controls (~100 lines)
```

#### **4.3 MultiUnitProvider.tsx** (839 lines → 3 services + provider)
```typescript
// Current provider with embedded logic
MultiUnitProvider // 839 lines total

// Target breakdown
├── MultiUnitProvider.tsx          // React provider only (~200 lines)
├── MultiUnitStateService.ts      // State management (~250 lines)
├── UnitComparisonService.ts       // Unit comparison logic (~200 lines)
└── UnitSynchronizationService.ts // Multi-unit sync (~200 lines)
```

### **Implementation Steps**

#### **Step 4.1: OverviewTabV2 Breakdown** (Days 15-16)
```typescript
// Day 15: Extract tech progression and identity panels
// Day 16: Extract tech rating and summary panels, refactor main component
```

#### **Step 4.2: UnitDetail Breakdown** (Days 17-18)
```typescript
// Day 17: Extract basic info and technical specs
// Day 18: Extract equipment, armor, and action components
```

#### **Step 4.3: MultiUnitProvider Breakdown** (Days 19-20)
```typescript
// Day 19: Extract state and comparison services
// Day 20: Extract synchronization service, refactor provider
```

---

## 🧪 **Phase 5: Validation & Testing (Priority 5)**

### **Testing Strategy**

#### **5.1 Unit Tests for Extracted Services**
```typescript
// Test coverage requirements
describe('SystemComponentService', () => {
  test('engine weight calculations', () => {});
  test('gyro slot requirements', () => {});
  test('heat sink allocation', () => {});
  // 100% coverage required
});

describe('EquipmentAllocationService', () => {
  test('equipment placement validation', () => {});
  test('auto-allocation algorithms', () => {});
  test('location restrictions', () => {});
  // 100% coverage required
});
```

#### **5.2 Integration Tests**
```typescript
// Cross-service integration testing
describe('UnitCriticalManager Integration', () => {
  test('service coordination', () => {});
  test('data flow integrity', () => {});
  test('state synchronization', () => {});
});

describe('Component Integration', () => {
  test('tab component communication', () => {});
  test('prop passing', () => {});
  test('event handling', () => {});
});
```

#### **5.3 Performance Testing**
```typescript
// Performance benchmarks
describe('Performance Validation', () => {
  test('service initialization time < 100ms', () => {});
  test('unit calculation time < 500ms', () => {});
  test('UI response time < 100ms', () => {});
  test('memory usage within bounds', () => {});
});
```

### **Implementation Steps**

#### **Step 5.1: Service Testing** (Days 21-22)
```typescript
// Create comprehensive test suites for all extracted services
// Validate business logic correctness
// Ensure edge case handling
```

#### **Step 5.2: Integration Testing** (Days 23-24)
```typescript
// Test service interactions
// Validate data flow preservation
// Test UI component integration
```

#### **Step 5.3: Performance Validation** (Days 25)
```typescript
// Benchmark performance improvements
// Validate memory usage
// Test loading times
```

---

## 🛡️ **Risk Mitigation & Rollback Strategy**

### **Pre-Implementation Safeguards**

#### **Code Backup Strategy**
```bash
# Create feature branch for each phase
git checkout -b refactor/phase-1-unit-critical-manager
git checkout -b refactor/phase-2-customizer-tabs
git checkout -b refactor/phase-3-data-reorganization
git checkout -b refactor/phase-4-component-modularization
```

#### **Incremental Validation**
```typescript
// Validation checkpoints after each step
interface ValidationCheckpoint {
  phase: string;
  step: string;
  testsPass: boolean;
  performanceMetrics: PerformanceMetrics;
  regressionTests: boolean;
  codeQuality: CodeQualityMetrics;
}
```

### **Rollback Procedures**

#### **Service Extraction Rollback**
```typescript
// If extracted service fails validation
const rollbackService = (serviceName: string) => {
  // 1. Revert to original monolithic structure
  // 2. Remove service files
  // 3. Restore original imports
  // 4. Run regression tests
  // 5. Validate functionality
};
```

#### **Component Extraction Rollback**
```typescript
// If component extraction causes issues
const rollbackComponent = (componentName: string) => {
  // 1. Merge component back into parent
  // 2. Remove extracted files
  // 3. Restore inline logic
  // 4. Test UI functionality
  // 5. Validate user workflows
};
```

### **Monitoring During Implementation**

#### **Automated Checks**
```typescript
// Continuous validation during refactoring
interface RefactoringMonitor {
  testCoverage: number;        // Must stay >= current
  performanceMetrics: object;  // Must not degrade > 10%
  bundleSize: number;         // Must not increase > 5%
  errorRate: number;          // Must stay at 0%
}
```

#### **Manual Validation Points**
```typescript
// Required manual testing after each step
const validationChecklist = [
  'Unit creation workflow',
  'Equipment placement',
  'Armor allocation', 
  'Critical slot management',
  'Validation system',
  'Data persistence',
  'Import/export functionality'
];
```

---

## 📈 **Success Metrics & Timeline**

### **Key Performance Indicators**

#### **Code Quality Metrics**
```typescript
interface CodeQualityTargets {
  maxFileSize: 400;                    // lines per file
  averageFileSize: 250;               // lines per file
  cyclomaticComplexity: 10;           // max per function
  testCoverage: 100;                  // percentage
  typeScriptCoverage: 100;            // percentage
}
```

#### **Performance Targets**
```typescript
interface PerformanceTargets {
  serviceInitialization: 100;         // milliseconds
  unitCalculation: 500;              // milliseconds
  uiResponseTime: 100;               // milliseconds
  bundleSizeReduction: 15;           // percentage
  memoryUsageReduction: 20;          // percentage
}
```

#### **Maintainability Improvements**
```typescript
interface MaintainabilityTargets {
  developOnboardingTime: 4;           // hours to productivity
  newFeatureAddTime: 2;              // hours average
  bugFixTime: 1;                     // hours average
  testExecutionTime: 30;             // seconds
  buildTime: 60;                     // seconds
}
```

### **Implementation Timeline**

```mermaid
gantt
    title Large File Refactoring Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: UnitCriticalManager
    Extract UnitStateManager        :2025-01-02, 1d
    Extract SystemComponentService  :2025-01-03, 1d
    Extract WeightBalanceService    :2025-01-04, 1d
    Extract CriticalSlotCalculator  :2025-01-05, 1d
    Extract EquipmentAllocation     :2025-01-06, 1d
    Extract ConstructionRules       :2025-01-07, 1d
    Refactor Core Manager          :2025-01-08, 1d
    
    section Phase 2: Customizer V2
    Extract StructureTabV2         :2025-01-09, 1d
    Extract ArmorTabV2             :2025-01-10, 1d
    Extract Remaining Tabs         :2025-01-11, 1d
    Refactor Main Component        :2025-01-12, 1d
    
    section Phase 3: Data Files
    Create Migration Script        :2025-01-13, 1d
    Execute Data Migration         :2025-01-14, 1d
    Update Build System           :2025-01-15, 1d
    
    section Phase 4: Components
    OverviewTabV2 Breakdown       :2025-01-16, 2d
    UnitDetail Breakdown          :2025-01-18, 2d
    MultiUnitProvider Breakdown   :2025-01-20, 2d
    
    section Phase 5: Validation
    Service Testing
