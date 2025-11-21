/**
 * System Component Interfaces for BattleTech Editor
 * 
 * Defines structural components that are integral to the unit (Engine, Gyro, Structure, Armor).
 * These are distinct from Equipment (Weapons, Ammo) which are placed in inventory.
 */

import {
  ComponentCategory,
  IComponentConfiguration,
  TechBase,
  RulesLevel,
  TechLevel
} from './BaseTypes';

// ===== BASE COMPONENT INTERFACE =====

/**
 * Base interface for all system components
 */
export interface ISystemComponent extends IComponentConfiguration {
  readonly category: ComponentCategory;
  readonly techLevel: TechLevel;
  readonly rulesLevel: RulesLevel;
  readonly introductionYear: number;
  readonly extinctionYear?: number;
  readonly reintroductionYear?: number;
  readonly costMultiplier: number;
}

// ===== ENGINE DEFINITIONS =====

/**
 * Engine definition (The "Concept" of an engine type, e.g. "XL Engine")
 */
export interface IEngineDef extends ISystemComponent {
  readonly category: ComponentCategory.ENGINE;
  readonly weightMultiplier: number; // Multiplier or function based on rating
  readonly criticalSlots: IEngineSlotRequirements;
  readonly heatSinkCapacity: number; // Free heat sinks in engine
  readonly survivability: IEngineSurvivability;
}

export interface IEngineSlotRequirements {
  readonly centerTorso: number;
  readonly sideTorso: number;
}

export interface IEngineSurvivability {
  readonly sideTorsoLoss: 'survives' | 'destroyed' | 'penalty';
  readonly ctLoss: 'destroyed';
}

// ===== GYRO DEFINITIONS =====

/**
 * Gyro definition
 */
export interface IGyroDef extends ISystemComponent {
  readonly category: ComponentCategory.GYRO;
  readonly weightMultiplier: number; // Usually relative to engine rating
  readonly criticalSlots: number;
}

// ===== COCKPIT DEFINITIONS =====

/**
 * Cockpit definition
 */
export interface ICockpitDef extends ISystemComponent {
  readonly category: ComponentCategory.COCKPIT;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly sensors: ISensorDef;
  readonly lifeSupport: ILifeSupportDef;
}

export interface ISensorDef {
  readonly range: number;
  readonly resolution: number;
}

export interface ILifeSupportDef {
  readonly capacity: number;
}

// ===== STRUCTURE DEFINITIONS =====

/**
 * Internal Structure definition
 */
export interface IStructureDef extends ISystemComponent {
  readonly category: ComponentCategory.STRUCTURE;
  readonly weightMultiplier: number; // e.g. 0.1 for Standard, 0.05 for Endo
  readonly criticalSlots: number; // Total slots required to be placed
}

// ===== ARMOR DEFINITIONS =====

/**
 * Armor definition
 */
export interface IArmorDef extends ISystemComponent {
  readonly category: ComponentCategory.ARMOR;
  readonly pointsPerTon: number;
  readonly criticalSlots: number;
  readonly maxPointsPerLocationMultiplier: number;
}

// ===== HEAT SINK DEFINITIONS (SYSTEM LEVEL) =====

/**
 * Heat Sink System definition (The TYPE of heat sink used, e.g. Double, Single)
 */
export interface IHeatSinkDef extends ISystemComponent {
  readonly category: ComponentCategory.HEAT_SINK;
  readonly dissipation: number;
  readonly weightPerSink: number;
  readonly slotsPerSink: number;
}

// ===== JUMP JET DEFINITIONS (SYSTEM LEVEL) =====

/**
 * Jump Jet System definition (The TYPE of jump jet, e.g. Standard, Improved)
 */
export interface IJumpJetDef extends ISystemComponent {
  readonly category: ComponentCategory.MOVEMENT;
  readonly weightPerJetMultiplier: number; // Often based on mech weight
  readonly slotsPerJet: number;
}

