/**
 * System Components Data Model
 * Unified structure for tracking mech system components and their critical slot allocations
 * 
 * @deprecated
 * This file contains legacy type definitions and constants.
 * Please use 'src/types/core/ComponentInterfaces.ts' and 'src/constants/BattleTechConstructionRules.ts' for new development.
 * 
 * Key replacements:
 * - EngineType -> EngineType (from BattleTechConstructionRules) + TechBase
 * - ENGINE_SLOT_REQUIREMENTS -> IEngineDef.criticalSlots
 */

import { calculateInternalHeatSinks } from '../utils/heatSinkCalculations';
import { TechBase as BaseTechBase } from './core/BaseTypes';

// Define component type unions locally (migrated from deleted types/components.ts)
export type EngineType = 'Standard' | 'XL' | 'Light' | 'XXL' | 'Compact' | 'ICE' | 'Fuel Cell' | 'XL (IS)' | 'XL (Clan)';
export type GyroType = 'Standard' | 'XL' | 'Compact' | 'Heavy-Duty';
export type CockpitType = 'Standard' | 'Small' | 'Command Console' | 'Torso-Mounted Cockpit' | 'Primitive Cockpit';
export type StructureType = 'Standard' | 'Endo Steel' | 'Endo Steel (Clan)' | 'Composite' | 'Reinforced' | 'Industrial' | 'Endo Steel (IS)';
export type ArmorType = 'Standard' | 'Ferro-Fibrous' | 'Ferro-Fibrous (Clan)' | 'Light Ferro-Fibrous' | 'Heavy Ferro-Fibrous' | 'Stealth' | 'Reactive' | 'Reflective' | 'Hardened';
export type HeatSinkType = 'Single' | 'Double' | 'Double (Clan)' | 'Double (IS)' | 'Compact' | 'Compact (Clan)' | 'Laser' | 'Laser (Clan)';

// Re-export TechBase from BaseTypes for convenience
export type TechBase = BaseTechBase;

export interface EngineComponent {
  type: EngineType;
  rating: number;
  manufacturer?: string;
}

export interface GyroComponent {
  type: GyroType;
}

export interface CockpitComponent {
  type: CockpitType;
}

export interface StructureComponent {
  type: StructureType;
}

export interface ArmorComponent {
  type: ArmorType;
  manufacturer?: string;
}

export interface HeatSinkComponent {
  type: HeatSinkType;
  total: number;
  engineIntegrated: number;  // Auto-calculated based on engine rating
  externalRequired: number;   // total - engineIntegrated
}

// Track actuator states for arms
export interface ActuatorState {
  hasLowerArm: boolean;
  hasHand: boolean;
}

export interface SystemComponents {
  engine: EngineComponent;
  gyro: GyroComponent;
  cockpit: CockpitComponent;
  structure: StructureComponent;
  armor: ArmorComponent;
  heatSinks: HeatSinkComponent;
  leftArmActuators?: ActuatorState;
  rightArmActuators?: ActuatorState;
}

// Critical slot allocation types
export type SlotContentType = 'system' | 'equipment' | 'heat-sink' | 'endo-steel' | 'ferro-fibrous' | 'empty';

// Context menu options for critical slots
export interface ContextMenuOption {
  label: string;
  action: 'add' | 'remove';
  component: string;
  isEnabled: () => boolean;
}

export interface CriticalSlot {
  index: number;
  name: string;               // Equipment name or system component name (NOT NULL - use "-Empty-" for empty)
  type: SlotContentType;      // Renamed from contentType for consistency
  isFixed: boolean;           // Cannot be manually removed
  isConditionallyRemovable?: boolean; // Can be removed via context menu
  isManuallyPlaced: boolean;  // User placed vs auto-allocated
  linkedSlots?: number[];     // For multi-slot items (e.g., AC/20 uses 10 slots)
  equipmentId?: string;       // Reference to equipment item
  contextMenuOptions?: ContextMenuOption[]; // Right-click options
}

export interface LocationCriticalSlots {
  location: string;
  slots: CriticalSlot[];
}

export type CriticalAllocationMap = Record<string, CriticalSlot[]>;

// Fixed system components that cannot be removed
export const FIXED_SYSTEM_COMPONENTS = [
  // Head components
  'Life Support',
  'Sensors',
  'Cockpit',
  'Command Console',
  'Primitive Cockpit',
  'Torso-Mounted Cockpit',
  
  // Arm components (except hand/lower arm)
  'Shoulder',
  'Upper Arm Actuator',
  
  // Leg components  
  'Hip',
  'Upper Leg Actuator',
  'Lower Leg Actuator',
  'Foot Actuator',
  
  // Torso components
  'Engine',
  'Gyro',
];

// Conditionally removable components
export const CONDITIONALLY_REMOVABLE_COMPONENTS = [
  'Lower Arm Actuator',
  'Hand Actuator',
];

// Special components that take slots but aren't equipment
export const SPECIAL_COMPONENTS = [
  'Endo Steel',
  'Endo Steel (Clan)',
  'Ferro-Fibrous',
  'Ferro-Fibrous (Clan)',
  'Light Ferro-Fibrous',
  'Heavy Ferro-Fibrous',
  'Stealth',
  'Reactive',
  'Reflective',
];

// Actuator dependency rules
export const ARM_ACTUATOR_RULES = {
  'Lower Arm Actuator': {
    canRemove: true,
    removesAlso: ['Hand Actuator'],
    slot: 2,
  },
  'Hand Actuator': {
    canRemove: true,
    requires: ['Lower Arm Actuator'],
    slot: 3,
  },
};

// Re-export slot requirements from centralized utilities for backward compatibility
export { COCKPIT_SLOT_REQUIREMENTS } from '../utils/cockpitCalculations';

export const ENGINE_SLOT_REQUIREMENTS: Record<string, { centerTorso: number; leftTorso: number; rightTorso: number }> = {
  'Standard': { centerTorso: 6, leftTorso: 0, rightTorso: 0 },
  'XL': { centerTorso: 6, leftTorso: 3, rightTorso: 3 },
  'XL (IS)': { centerTorso: 6, leftTorso: 3, rightTorso: 3 },
  'XL (Clan)': { centerTorso: 6, leftTorso: 2, rightTorso: 2 },
  'Light': { centerTorso: 6, leftTorso: 2, rightTorso: 2 },
  'XXL': { centerTorso: 6, leftTorso: 6, rightTorso: 6 },
  'Compact': { centerTorso: 3, leftTorso: 0, rightTorso: 0 },
  'ICE': { centerTorso: 6, leftTorso: 0, rightTorso: 0 },
  'Fuel Cell': { centerTorso: 6, leftTorso: 0, rightTorso: 0 }
};

export const GYRO_SLOT_REQUIREMENTS: Record<string, number> = {
  'Standard': 4,
  'Compact': 2,
  'Heavy-Duty': 4,
  'XL': 6
};

export const STRUCTURE_SLOT_REQUIREMENTS: Record<string, number> = {
  'Standard': 0,
  'Endo Steel': 14,
  'Endo Steel (Clan)': 7,
  'Composite': 0,
  'Reinforced': 0,
  'Industrial': 0
};

export function getStructureSlots(type: StructureType): number {
  return STRUCTURE_SLOT_REQUIREMENTS[type as string] || 0;
}

export function getGyroSlots(type: GyroType): number {
  return GYRO_SLOT_REQUIREMENTS[type as string] || 0;
}


// Heat sink calculations - use centralized functions
export function calculateIntegratedHeatSinks(engineRating: number): number {
  const { calculateInternalHeatSinksForEngine } = require('../utils/heatSinkCalculations');
  return calculateInternalHeatSinksForEngine(engineRating);
}

export function calculateExternalHeatSinks(total: number, engineRating: number): number {
  const integrated = calculateIntegratedHeatSinks(engineRating);
  return Math.max(0, total - integrated);
}

// Re-export weight calculation functions from centralized utilities for backward compatibility
// Re-export weight calculation functions via Gateway
export function calculateStructureWeight(tonnage: number, type: StructureType): number {
  const { SystemComponentsGateway } = require('../services/systemComponents/SystemComponentsGateway');
  return SystemComponentsGateway.calculateStructureWeightByType(type, tonnage);
}

export { calculateArmorWeight } from '../utils/armorCalculations';

export function calculateGyroWeight(rating: number, type: GyroType): number {
  const { SystemComponentsGateway } = require('../services/systemComponents/SystemComponentsGateway');
  return SystemComponentsGateway.calculateGyroWeightByType(type, rating);
}

// Note: Engine weight calculation has different parameters in the utility
// So we need a wrapper for backward compatibility
export function calculateEngineWeight(rating: number, type: EngineType, _tonnage?: number): number {
  const { SystemComponentsGateway } = require('../services/systemComponents/SystemComponentsGateway');
  return SystemComponentsGateway.calculateEngineWeightByType(type, rating, _tonnage || 100);
}

// Helper to check if a component is fixed
export function isFixedComponent(componentName: string): boolean {
  if (!componentName) return false;
  return FIXED_SYSTEM_COMPONENTS.some(comp => componentName.includes(comp));
}

// Helper to check if a component is conditionally removable
export function isConditionallyRemovable(componentName: string): boolean {
  if (!componentName) return false;
  return CONDITIONALLY_REMOVABLE_COMPONENTS.some(comp => componentName.includes(comp));
}

// Helper to check if a component is a special component
export function isSpecialComponent(componentName: string): boolean {
  if (!componentName) return false;
  return SPECIAL_COMPONENTS.some(comp => componentName.includes(comp));
}

// Helper to determine slot content type
export function getSlotContentType(name: string): SlotContentType {
  if (!name || name === '-Empty-') return 'empty';
  
  if (name.includes('Heat Sink')) return 'heat-sink';
  
  if (isSpecialComponent(name)) {
    if (name.includes('Endo Steel')) return 'endo-steel';
    if (name.includes('Ferro') || name.includes('Stealth') || 
        name.includes('Reactive') || name.includes('Reflective')) {
      return 'ferro-fibrous';
    }
  }
  
  if (isFixedComponent(name) || isConditionallyRemovable(name)) {
    return 'system';
  }
  
  return 'equipment';
}
