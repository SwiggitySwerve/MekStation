/**
 * Component Structure Interfaces
 * 
 * Defines the physical structure of units, including components (locations),
 * their types, and constraints. This replaces hardcoded property names
 * with a data-driven approach.
 */

import { TechBase, EntityId, UnitType } from './BaseTypes';

/**
 * Type of component (structural classification)
 */
export enum ComponentType {
  HEAD = 'head',
  TORSO = 'torso',
  ARM = 'arm',
  LEG = 'leg',
  TURRET = 'turret',
  BODY = 'body',      // Main body for vehicles
  SIDE = 'side',      // Side locations for vehicles
  REAR = 'rear',      // Rear locations for vehicles
  WING = 'wing',      // Aerospace
  FUSELAGE = 'fuselage', // Aerospace
  ENGINE = 'engine',  // DropShip/Jumpship engines
  NOSE = 'nose',      // Aerospace nose
  AFT = 'aft'         // Aerospace aft
}

/**
 * Definition of a component/location on a unit
 */
export interface IComponentDefinition {
  readonly id: string;          // Unique ID within the unit (e.g. 'centerTorso', 'front')
  readonly name: string;        // Display name
  readonly type: ComponentType; // Structural type
  readonly shortName: string;   // Abbreviation (e.g. 'CT', 'RT')
  readonly defaultSlots: number; // Standard number of critical slots
  readonly maxSlots?: number;   // Maximum possible slots (if expandable)
  readonly rear?: boolean;      // Is this a rear location? (affects armor/damage)
  readonly transferDamageTo?: string; // ID of component where excess damage goes
  readonly required?: boolean;  // Is this component required for the unit to function?
  
  // Constraints
  readonly allowedCategories?: string[]; // Equipment categories allowed here
  readonly excludedCategories?: string[]; // Equipment categories forbidden here
  readonly maxWeight?: number;  // Max weight capacity (if applicable)
}

/**
 * Definition of a unit's overall structure
 */
export interface IUnitStructureDefinition {
  readonly unitType: UnitType;
  readonly components: IComponentDefinition[];
  readonly totalSlots: number;  // Sum of all component slots
}

/**
 * Helper to get standard BattleMech structure
 */
export const BATTLEMECH_STRUCTURE: IComponentDefinition[] = [
  { id: 'head', name: 'Head', type: ComponentType.HEAD, shortName: 'H', defaultSlots: 6, transferDamageTo: 'centerTorso', required: true },
  { id: 'centerTorso', name: 'Center Torso', type: ComponentType.TORSO, shortName: 'CT', defaultSlots: 12, required: true },
  { id: 'rightTorso', name: 'Right Torso', type: ComponentType.TORSO, shortName: 'RT', defaultSlots: 12, transferDamageTo: 'centerTorso', required: true },
  { id: 'leftTorso', name: 'Left Torso', type: ComponentType.TORSO, shortName: 'LT', defaultSlots: 12, transferDamageTo: 'centerTorso', required: true },
  { id: 'rightArm', name: 'Right Arm', type: ComponentType.ARM, shortName: 'RA', defaultSlots: 12, transferDamageTo: 'rightTorso', required: true },
  { id: 'leftArm', name: 'Left Arm', type: ComponentType.ARM, shortName: 'LA', defaultSlots: 12, transferDamageTo: 'leftTorso', required: true },
  { id: 'rightLeg', name: 'Right Leg', type: ComponentType.LEG, shortName: 'RL', defaultSlots: 6, transferDamageTo: 'rightTorso', required: true },
  { id: 'leftLeg', name: 'Left Leg', type: ComponentType.LEG, shortName: 'LL', defaultSlots: 6, transferDamageTo: 'leftTorso', required: true }
];

/**
 * Helper to get standard Vehicle structure
 */
export const VEHICLE_STRUCTURE: IComponentDefinition[] = [
  { id: 'front', name: 'Front', type: ComponentType.BODY, shortName: 'FR', defaultSlots: 0, required: true }, // Vehicles don't have crit slots like mechs usually
  { id: 'left', name: 'Left Side', type: ComponentType.SIDE, shortName: 'LS', defaultSlots: 0, required: true },
  { id: 'right', name: 'Right Side', type: ComponentType.SIDE, shortName: 'RS', defaultSlots: 0, required: true },
  { id: 'rear', name: 'Rear', type: ComponentType.REAR, shortName: 'RR', defaultSlots: 0, required: true },
  { id: 'turret', name: 'Turret', type: ComponentType.TURRET, shortName: 'TU', defaultSlots: 0, required: false },
  { id: 'body', name: 'Body', type: ComponentType.BODY, shortName: 'BD', defaultSlots: 0, required: true } // Internal/Body for some rules
];
