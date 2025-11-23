/**
 * SystemComponents.ts
 * Interfaces for structural components (Engine, Gyro, Structure, Armor, Cockpit).
 */

import { TechBase, RulesLevel } from './TechBase';
import { ComponentType } from './ComponentType';

export interface ISystemComponent {
  readonly name: string;
  readonly type: ComponentType;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weightMultiplier?: number; // Some components weight is a factor of tonnage or engine rating
}

// =============================================================================
// ENGINE
// =============================================================================

export enum EngineType {
  STANDARD = 'Standard',
  XL = 'XL',
  LIGHT = 'Light',
  XXL = 'XXL',
  COMPACT = 'Compact',
  ICE = 'ICE',
  FUEL_CELL = 'Fuel Cell',
}

export interface IEngine extends ISystemComponent {
  readonly type: ComponentType.ENGINE;
  readonly engineType: EngineType;
  readonly rating: number;
  readonly weight: number;
  readonly criticalSlots: {
    readonly ct: number;
    readonly sideTorso: number;
  };
  readonly heatSinks: number; // Integral heat sinks
}

// =============================================================================
// GYRO
// =============================================================================

export enum GyroType {
  STANDARD = 'Standard',
  XL = 'XL',
  COMPACT = 'Compact',
  HEAVY_DUTY = 'Heavy-Duty',
}

export interface IGyro extends ISystemComponent {
  readonly type: ComponentType.GYRO;
  readonly gyroType: GyroType;
  readonly weight: number;
  readonly criticalSlots: number;
}

// =============================================================================
// COCKPIT
// =============================================================================

export enum CockpitType {
  STANDARD = 'Standard',
  SMALL = 'Small',
  COMMAND_CONSOLE = 'Command Console',
  TORSO_MOUNTED = 'Torso-Mounted',
  PRIMITIVE = 'Primitive',
}

export interface ICockpit extends ISystemComponent {
  readonly type: ComponentType.COCKPIT;
  readonly cockpitType: CockpitType;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly sensors: {
    readonly range: number;
    readonly resolution: number;
  };
}

// =============================================================================
// STRUCTURE
// =============================================================================

export enum StructureType {
  STANDARD = 'Standard',
  ENDO_STEEL = 'Endo Steel',
  ENDO_STEEL_CLAN = 'Endo Steel (Clan)',
  COMPOSITE = 'Composite',
  REINFORCED = 'Reinforced',
  INDUSTRIAL = 'Industrial',
}

export interface IStructure extends ISystemComponent {
  readonly type: ComponentType.STRUCTURE;
  readonly structureType: StructureType;
  readonly totalPoints: number;
  readonly pointsByLocation: Record<string, number>;
  readonly criticalSlots: number; // Slots required (e.g. 14 for Endo Steel)
}

// =============================================================================
// ARMOR
// =============================================================================

export enum ArmorType {
  STANDARD = 'Standard',
  FERRO_FIBROUS = 'Ferro-Fibrous',
  FERRO_FIBROUS_CLAN = 'Ferro-Fibrous (Clan)',
  LIGHT_FERRO = 'Light Ferro-Fibrous',
  HEAVY_FERRO = 'Heavy Ferro-Fibrous',
  STEALTH = 'Stealth',
  REACTIVE = 'Reactive',
  REFLECTIVE = 'Reflective',
  HARDENED = 'Hardened',
}

export interface IArmor extends ISystemComponent {
  readonly type: ComponentType.ARMOR;
  readonly armorType: ArmorType;
  readonly pointsPerTon: number;
  readonly totalPoints: number;
  readonly maxPoints: number;
  readonly criticalSlots: number; // Slots required (e.g. 14 for Ferro)
}

// =============================================================================
// HEAT SINKS
// =============================================================================

export enum HeatSinkType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  COMPACT = 'Compact',
  LASER = 'Laser',
}

export interface IHeatSinkSystem extends ISystemComponent {
  readonly type: ComponentType.HEAT_SINK;
  readonly heatSinkType: HeatSinkType;
  readonly count: number;
  readonly engineHeatSinks: number; // Number integral to engine
  readonly dissipation: number; // Total dissipation
}


// =============================================================================
// JUMP JETS
// =============================================================================

export enum JumpJetType {
  STANDARD = 'Standard',
  IMPROVED = 'Improved',
  MECHANICAL = 'Mechanical',
}

export interface IJumpJetSystem extends ISystemComponent {
  readonly type: ComponentType.JUMP_JET;
  readonly jumpJetType: JumpJetType;
  readonly count: number;
  readonly weight: number;
}
