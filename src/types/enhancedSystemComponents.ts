/**
 * Enhanced System Components Data Model
 * Extended structure with tech base awareness and construction rules validation
 */

import { 
  SystemComponents, 
  EngineComponent, 
  GyroComponent, 
  CockpitComponent, 
  StructureComponent, 
  ArmorComponent, 
  HeatSinkComponent,
  EngineType,
  HeatSinkType 
} from './systemComponents';

// Enhanced tech base types
export type TechBase = 'Inner Sphere' | 'Clan' | 'Mixed (IS Chassis)' | 'Mixed (Clan Chassis)';
export type TechLevel = 'Introductory' | 'Standard' | 'Advanced' | 'Experimental';

// Enhanced component interfaces with tech base awareness
export interface EnhancedEngineComponent extends EngineComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: EngineSpecification;
}

export interface EnhancedHeatSinkComponent extends HeatSinkComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: HeatSinkSpecification;
}

export interface EnhancedStructureComponent extends StructureComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: StructureSpecification;
}

export interface EnhancedArmorComponent extends ArmorComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: ArmorSpecification;
}

export interface EnhancedGyroComponent extends GyroComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: GyroSpecification;
}

export interface EnhancedCockpitComponent extends CockpitComponent {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  specification: CockpitSpecification;
}

// Enhanced system components interface
export interface EnhancedSystemComponents extends SystemComponents {
  techBase: TechBase;
  techLevel: TechLevel;
  era: string;
  
  // Enhanced component specs with tech base awareness
  engine: EnhancedEngineComponent;
  gyro: EnhancedGyroComponent;
  cockpit: EnhancedCockpitComponent;
  structure: EnhancedStructureComponent;
  armor: EnhancedArmorComponent;
  heatSinks: EnhancedHeatSinkComponent;
}

// Component specifications
export interface EngineSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  weightMultiplier: number;
  slotRequirements: {
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
  };
  survivabilityRules: {
    sideDestroyed: 'shutdown' | 'continue_penalty' | 'destroyed';
    bothSidesDestroyed: 'destroyed' | 'continue_severe';
  };
  heatSinkCapacity: number;
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

export interface HeatSinkSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  dissipation: number;
  weight: number;
  criticalSlots: number;
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

export interface StructureSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  weightMultiplier: number;
  criticalSlots: number;
  slotDistribution: { [location: string]: number };
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

export interface ArmorSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  weightMultiplier: number;
  criticalSlots: number;
  slotDistribution: { [location: string]: number };
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

export interface GyroSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  weightMultiplier: number;
  criticalSlots: number;
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

export interface CockpitSpecification {
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  weight: number;
  criticalSlots: number;
  costMultiplier: number;
  techLevel: TechLevel;
  introductionYear: number;
  extinctionYear?: number;
}

// Construction context for validation
export interface ConstructionContext {
  mechTonnage: number;
  techBase: TechBase;
  techLevel: TechLevel;
  era: string;
  allowMixedTech: boolean;
  customRules?: string[];
}

// Validation results
export interface ConstructionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  techBaseViolations: TechBaseViolation[];
  slotViolations: SlotViolation[];
  weightViolations: WeightViolation[];
  costCalculation: CostCalculation | null;
}

export interface TechBaseViolation {
  component: string;
  violation: 'tech_base_mismatch' | 'era_unavailable' | 'tech_level_incompatible';
  details: string;
}

export interface SlotViolation {
  location: string;
  required: number;
  available: number;
  component: string;
}

export interface WeightViolation {
  type: 'overweight' | 'invalid_modifier';
  excess?: number;
  details: string;
}

export interface CostCalculation {
  totalCost: number;
  breakdown: CostBreakdown;
  modifiers: CostModifier[];
}

export interface CostBreakdown {
  chassis: number;
  engine: number;
  structure: number;
  armor: number;
  heatSinks: number;
  gyro: number;
  cockpit: number;
  equipment: number;
  mixedTechPenalty: number;
}

export interface CostModifier {
  type: string;
  description: string;
  multiplier: number;
  applies_to: string[];
}

// Change impact analysis
export interface ConstructionChangeImpact {
  slotImpact: SlotChangeImpact;
  weightImpact: WeightChangeImpact;
  costImpact: CostChangeImpact;
  techCompatibilityImpact: TechCompatibilityImpact;
}

export interface SlotChangeImpact {
  displacedEquipment: EquipmentAllocation[];
  newSlotRequirements: { [location: string]: number };
  availabilityChange: { [location: string]: number };
}

export interface WeightChangeImpact {
  weightDelta: number;
  newTotalWeight: number;
  affectedSystems: string[];
  violations: WeightViolation[];
}

export interface CostChangeImpact {
  costDelta: number;
  newTotalCost: number;
  affectedSystems: string[];
}

export interface TechCompatibilityImpact {
  compatibilityChanges: string[];
  newRestrictions: string[];
  removedRestrictions: string[];
}

export interface EquipmentAllocation {
  equipmentData: any; // Will be defined when integrating with equipment system
  location: string;
  slots: number[];
}

// Component change tracking
export interface ComponentChange {
  componentType: 'engine' | 'gyro' | 'structure' | 'armor' | 'heatSink' | 'cockpit';
  oldValue: any;
  newValue: any;
}

// Component options for UI
export interface ComponentOption {
  id: string
  name: string
  techBase: string
  available: boolean
  reason?: string
  details?: {
    weight: number
    criticalSlots: number
    cost: number
    techLevel: string
    introductionYear: number
  }
}

export interface EquipmentCompatibilityResult {
  isCompatible: boolean
  issues: string[]
  warnings: string[]
  recommendations: string[]
}

export type ComponentType = 'engine' | 'gyro' | 'structure' | 'armor' | 'heatSink' | 'cockpit';

// Tech compatibility utilities
export interface TechCompatibilityResult {
  isCompatible: boolean;
  restrictions: string[];
  warnings: string[];
  errors: string[];
}

// Mixed tech rules
export interface MixedTechPenalties {
  battleValueMultiplier: number;
  costMultiplier: number;
  additionalRestrictions: string[];
}

export interface MixedTechValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  violations: TechBaseViolation[];
}

// Era availability
export interface EraAvailability {
  available: boolean;
  rating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';
  costMultiplier: number;
  restrictions?: string[];
}

// Enhanced utility functions
export function isTechBaseCompatible(
  componentTechBase: string, 
  chassisTechBase: TechBase
): boolean {
  const compatibilityRules: { [key: string]: TechBase[] } = {
    'Inner Sphere': ['Inner Sphere', 'Mixed (IS Chassis)'],
    'Clan': ['Clan', 'Mixed (Clan Chassis)'],
    'Both': ['Inner Sphere', 'Clan', 'Mixed (IS Chassis)', 'Mixed (Clan Chassis)']
  };

  return compatibilityRules[componentTechBase]?.includes(chassisTechBase) || false;
}

export function getTechBaseFromEngineType(engineType: EngineType): 'Inner Sphere' | 'Clan' | 'Both' {
  if (engineType === 'XL (IS)' || engineType === 'Light') {
    return 'Inner Sphere';
  } else if (engineType === 'XL (Clan)') {
    return 'Clan';
  }
  return 'Both';
}

export function getTechBaseFromHeatSinkType(heatSinkType: HeatSinkType): 'Inner Sphere' | 'Clan' | 'Both' {
  if (heatSinkType === 'Double (IS)') {
    return 'Inner Sphere';
  } else if (heatSinkType === 'Double (Clan)') {
    return 'Clan';
  }
  return 'Both';
}

export function isAdvancedTechnology(techLevel: TechLevel): boolean {
  return techLevel === 'Advanced' || techLevel === 'Experimental';
}

export function isTechLevelCompatible(
  componentTechLevel: TechLevel, 
  contextTechLevel: TechLevel
): boolean {
  const techLevelHierarchy: TechLevel[] = ['Introductory', 'Standard', 'Advanced', 'Experimental'];
  const componentIndex = techLevelHierarchy.indexOf(componentTechLevel);
  const contextIndex = techLevelHierarchy.indexOf(contextTechLevel);
  return componentIndex <= contextIndex;
}

// Engine survivability utility
export function getEngineSurvivabilityDescription(engineType: EngineType): string {
  if (engineType === 'XL (IS)') {
    return 'Destroyed if either side torso is lost';
  } else if (engineType === 'XL (Clan)') {
    return 'Continues with -2 penalty if one side torso is lost';
  } else if (engineType === 'Light') {
    return 'Reduced penalty for side torso loss';
  } else if (engineType === 'XXL') {
    return 'Destroyed if any side torso is lost';
  }
  return 'Standard survivability - continues operating with penalties';
}

// Heat sink efficiency utility
export function getHeatSinkEfficiency(heatSinkType: HeatSinkType): number {
  const efficiencyMap: { [key in HeatSinkType]: number } = {
    'Single': 1.0,           // 1 dissipation / 1 slot = 1.0
    'Double (IS)': 0.67,     // 2 dissipation / 3 slots = 0.67
    'Double (Clan)': 1.0,    // 2 dissipation / 2 slots = 1.0
    'Compact': 1.0,          // 1 dissipation / 1 slot = 1.0
    'Laser': 1.0             // 2 dissipation / 2 slots = 1.0
  };
  
  return efficiencyMap[heatSinkType] || 0;
}
