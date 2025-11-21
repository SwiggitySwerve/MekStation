/**
 * Critical Slot Types - Comprehensive Type System
 * 
 * Defines concrete data structures for all critical slot components,
 * locations, and breakdowns following BattleTech rules.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { ComponentConfiguration } from '../../types/componentConfiguration';
import { TechBase } from '../../types/core/BaseTypes';

// ===== CORE COMPONENT TYPES =====

/**
 * Engine component with location-specific slot allocation
 */
export interface EngineComponent {
  type: 'engine';
  engineType: string;
  totalSlots: number;
  locationAllocation: {
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
  };
  weight: number;
  rating: number;
  techBase: TechBase;
}

/**
 * Gyro component with center torso allocation
 */
export interface GyroComponent {
  type: 'gyro';
  gyroType: string;
  slots: number;
  location: 'centerTorso';
  weight: number;
  techBase: TechBase;
}

/**
 * Cockpit component with head allocation
 */
export interface CockpitComponent {
  type: 'cockpit';
  cockpitType: string;
  slots: number;
  location: 'head';
  weight: number;
  techBase: TechBase;
}

/**
 * Life support component with head allocation
 */
export interface LifeSupportComponent {
  type: 'life_support';
  slots: number;
  location: 'head';
  weight: number;
}

/**
 * Sensors component with head allocation
 */
export interface SensorsComponent {
  type: 'sensors';
  slots: number;
  location: 'head';
  weight: number;
}

/**
 * Actuator component with limb allocation
 */
export interface ActuatorComponent {
  type: 'actuator';
  actuatorType: 'shoulder' | 'upperArm' | 'lowerArm' | 'hand' | 'hip' | 'upperLeg' | 'lowerLeg' | 'foot';
  slots: number;
  location: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
  weight: number;
  removable: boolean;
}

/**
 * Equipment component with flexible allocation
 */
export interface EquipmentComponent {
  type: 'equipment';
  equipmentType: 'weapon' | 'ammunition' | 'heat_sink' | 'equipment' | 'structure' | 'armor';
  name: string;
  slots: number;
  location: string;
  weight: number;
  quantity: number;
  explosive?: boolean;
  techBase?: TechBase;
}

/**
 * Union type for all system components
 */
export type SystemComponent = 
  | EngineComponent 
  | GyroComponent 
  | CockpitComponent 
  | LifeSupportComponent 
  | SensorsComponent 
  | ActuatorComponent;

/**
 * Union type for all components
 */
export type CriticalSlotComponent = SystemComponent | EquipmentComponent;

// ===== LOCATION-SPECIFIC TYPES =====

/**
 * Head location breakdown (6 slots total)
 */
export interface HeadLocationBreakdown {
  location: 'head';
  totalSlots: 6;
  fixedComponents: {
    lifeSupport: LifeSupportComponent[];
    sensors: SensorsComponent[];
    cockpit: CockpitComponent;
  };
  equipment: EquipmentComponent[];
  availableSlots: number;
  utilization: {
    used: number;
    percentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

/**
 * Center Torso location breakdown (12 slots total)
 */
export interface CenterTorsoLocationBreakdown {
  location: 'centerTorso';
  totalSlots: 12;
  systemComponents: {
    engine: EngineComponent;
    gyro: GyroComponent;
  };
  equipment: EquipmentComponent[];
  availableSlots: number;
  utilization: {
    used: number;
    percentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

/**
 * Side Torso location breakdown (12 slots each)
 */
export interface SideTorsoLocationBreakdown {
  location: 'leftTorso' | 'rightTorso';
  totalSlots: 12;
  systemComponents: {
    engine?: EngineComponent; // Only for XL/XXL engines
  };
  equipment: EquipmentComponent[];
  availableSlots: number;
  utilization: {
    used: number;
    percentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

/**
 * Arm location breakdown (12 slots each)
 */
export interface ArmLocationBreakdown {
  location: 'leftArm' | 'rightArm';
  totalSlots: 12;
  systemComponents: {
    actuators: ActuatorComponent[];
  };
  equipment: EquipmentComponent[];
  availableSlots: number;
  utilization: {
    used: number;
    percentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

/**
 * Leg location breakdown (6 slots each)
 */
export interface LegLocationBreakdown {
  location: 'leftLeg' | 'rightLeg';
  totalSlots: 6;
  systemComponents: {
    actuators: ActuatorComponent[];
  };
  equipment: EquipmentComponent[];
  availableSlots: number;
  utilization: {
    used: number;
    percentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
}

/**
 * Union type for all location breakdowns
 */
export type LocationBreakdown = 
  | HeadLocationBreakdown 
  | CenterTorsoLocationBreakdown 
  | SideTorsoLocationBreakdown 
  | ArmLocationBreakdown 
  | LegLocationBreakdown;

// ===== COMPREHENSIVE BREAKDOWN TYPES =====

/**
 * Complete critical slot breakdown by location
 */
export interface CompleteCriticalSlotBreakdown {
  // Location-specific breakdowns
  locations: {
    head: HeadLocationBreakdown;
    centerTorso: CenterTorsoLocationBreakdown;
    leftTorso: SideTorsoLocationBreakdown;
    rightTorso: SideTorsoLocationBreakdown;
    leftArm: ArmLocationBreakdown;
    rightArm: ArmLocationBreakdown;
    leftLeg: LegLocationBreakdown;
    rightLeg: LegLocationBreakdown;
  };
  
  // Component summaries
  components: {
    system: {
      engine: EngineComponent;
      gyro: GyroComponent;
      cockpit: CockpitComponent;
      lifeSupport: LifeSupportComponent[];
      sensors: SensorsComponent[];
      actuators: ActuatorComponent[];
    };
    equipment: EquipmentComponent[];
  };
  
  // Overall summary
  summary: {
    totalSlots: 78;
    usedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  
  // Analysis and recommendations
  analysis: {
    bottlenecks: string[];
    optimizationPotential: number;
    recommendations: string[];
    violations: string[];
  };
}

/**
 * Simplified breakdown for UI display
 */
export interface SimplifiedCriticalSlotBreakdown {
  summary: {
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
  };
  locations: {
    [location: string]: {
      total: number;
      used: number;
      available: number;
      percentage: number;
      components: {
        system: number;
        equipment: number;
      };
    };
  };
}

// ===== CALCULATION RESULT TYPES =====

/**
 * Slot calculation requirements
 */
export interface SlotRequirements {
  total: number;
  byLocation: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  byComponent: {
    systemComponents: number;
    specialComponents: number;
    equipment: number;
    ammunition: number;
  };
  critical: boolean; // True if requirements exceed capacity
}

/**
 * Available slots calculation
 */
export interface AvailableSlots {
  total: number;
  byLocation: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  reserved: {
    systemComponents: number;
    specialComponents: number;
  };
  usable: number; // Total minus reserved
}

/**
 * Slot utilization analysis
 */
export interface SlotUtilization {
  percentageUsed: number;
  totalUsed: number;
  totalAvailable: number;
  byLocation: {
    [location: string]: {
      used: number;
      available: number;
      percentage: number;
      efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    };
  };
  bottlenecks: string[]; // Locations with >90% utilization
  recommendations: string[];
}

// ===== VALIDATION TYPES =====

/**
 * Critical slot validation result
 */
export interface CriticalSlotValidation {
  isValid: boolean;
  errors: CriticalSlotError[];
  warnings: CriticalSlotWarning[];
  recommendations: string[];
}

/**
 * Critical slot error
 */
export interface CriticalSlotError {
  type: 'overflow' | 'conflict' | 'rule_violation' | 'invalid_placement';
  location: string;
  component: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Critical slot warning
 */
export interface CriticalSlotWarning {
  type: 'inefficient_placement' | 'near_capacity' | 'suboptimal_allocation';
  location: string;
  component: string;
  message: string;
  recommendation: string;
}

// ===== UTILITY TYPES =====

/**
 * Location names as constants
 */
export const CRITICAL_SLOT_LOCATIONS = {
  HEAD: 'head',
  CENTER_TORSO: 'centerTorso',
  LEFT_TORSO: 'leftTorso',
  RIGHT_TORSO: 'rightTorso',
  LEFT_ARM: 'leftArm',
  RIGHT_ARM: 'rightArm',
  LEFT_LEG: 'leftLeg',
  RIGHT_LEG: 'rightLeg'
} as const;

export type CriticalSlotLocation = typeof CRITICAL_SLOT_LOCATIONS[keyof typeof CRITICAL_SLOT_LOCATIONS];

/**
 * Standard slot counts by location
 */
export const STANDARD_SLOT_COUNTS: Record<CriticalSlotLocation, number> = {
  [CRITICAL_SLOT_LOCATIONS.HEAD]: 6,
  [CRITICAL_SLOT_LOCATIONS.CENTER_TORSO]: 12,
  [CRITICAL_SLOT_LOCATIONS.LEFT_TORSO]: 12,
  [CRITICAL_SLOT_LOCATIONS.RIGHT_TORSO]: 12,
  [CRITICAL_SLOT_LOCATIONS.LEFT_ARM]: 12,
  [CRITICAL_SLOT_LOCATIONS.RIGHT_ARM]: 12,
  [CRITICAL_SLOT_LOCATIONS.LEFT_LEG]: 6,
  [CRITICAL_SLOT_LOCATIONS.RIGHT_LEG]: 6
};

/**
 * Total critical slots for standard BattleMech
 */
export const TOTAL_CRITICAL_SLOTS = Object.values(STANDARD_SLOT_COUNTS).reduce((sum, count) => sum + count, 0); // 78 