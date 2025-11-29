/**
 * Unit Serialization Types
 * 
 * Defines JSON save/load formats and serialization interfaces.
 * 
 * @spec openspec/changes/implement-phase5-data-models/specs/serialization-formats/spec.md
 */

import { IBattleMech } from './BattleMechInterfaces';

/**
 * File format version for backwards compatibility
 */
export const CURRENT_FORMAT_VERSION = '1.0.0';

/**
 * Serialized unit envelope (wrapper for saved units)
 */
export interface ISerializedUnitEnvelope {
  readonly formatVersion: string;
  readonly savedAt: string;
  readonly application: string;
  readonly applicationVersion: string;
  readonly unit: ISerializedUnit;
}

/**
 * Serialized unit data
 */
export interface ISerializedUnit {
  // Identity
  readonly id: string;
  readonly chassis: string;
  readonly model: string;
  readonly variant?: string;
  
  // Classification
  readonly unitType: string;
  readonly configuration: string;
  readonly techBase: string;
  readonly rulesLevel: string;
  readonly era: string;
  readonly year: number;
  readonly tonnage: number;
  
  // Structural components
  readonly engine: ISerializedEngine;
  readonly gyro: ISerializedGyro;
  readonly cockpit: string;
  readonly structure: ISerializedStructure;
  
  // Armor
  readonly armor: ISerializedArmor;
  
  // Heat sinks
  readonly heatSinks: ISerializedHeatSinks;
  
  // Movement
  readonly movement: ISerializedMovement;
  
  // Equipment
  readonly equipment: ISerializedEquipment[];
  
  // Critical slots
  readonly criticalSlots: ISerializedCriticalSlots;
  
  // Optional
  readonly quirks?: string[];
  readonly fluff?: ISerializedFluff;
}

/**
 * Serialized engine data
 */
export interface ISerializedEngine {
  readonly type: string;
  readonly rating: number;
}

/**
 * Serialized gyro data
 */
export interface ISerializedGyro {
  readonly type: string;
}

/**
 * Serialized structure data
 */
export interface ISerializedStructure {
  readonly type: string;
}

/**
 * Serialized armor data
 */
export interface ISerializedArmor {
  readonly type: string;
  readonly allocation: Record<string, number | { front: number; rear: number }>;
}

/**
 * Serialized heat sinks data
 */
export interface ISerializedHeatSinks {
  readonly type: string;
  readonly count: number;
}

/**
 * Serialized movement data
 */
export interface ISerializedMovement {
  readonly walk: number;
  readonly jump: number;
  readonly jumpJetType?: string;
  readonly enhancements?: string[];
}

/**
 * Serialized equipment item
 */
export interface ISerializedEquipment {
  readonly id: string;
  readonly location: string;
  readonly slots?: number[];
  readonly isRearMounted?: boolean;
  readonly linkedAmmo?: string;
}

/**
 * Serialized critical slots
 */
export interface ISerializedCriticalSlots {
  readonly [location: string]: (string | null)[];
}

/**
 * Fluff/flavor text
 */
export interface ISerializedFluff {
  readonly overview?: string;
  readonly capabilities?: string;
  readonly history?: string;
  readonly deployment?: string;
  readonly variants?: string;
  readonly notableUnits?: string;
  readonly manufacturer?: string;
  readonly primaryFactory?: string;
  readonly systemManufacturer?: Record<string, string>;
}

/**
 * Serialization result
 */
export interface ISerializationResult {
  readonly success: boolean;
  readonly data?: string;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Deserialization result
 */
export interface IDeserializationResult {
  readonly success: boolean;
  readonly unit?: IBattleMech;
  readonly errors: string[];
  readonly warnings: string[];
  readonly migrations: string[];
}

/**
 * Unit serializer interface
 */
export interface IUnitSerializer {
  serialize(unit: IBattleMech): ISerializationResult;
  deserialize(data: string): IDeserializationResult;
  validateFormat(data: string): { isValid: boolean; errors: string[] };
  getFormatVersion(data: string): string | null;
}

/**
 * MTF (MegaMekLab Text Format) specific types
 */
export interface IMTFData {
  readonly version: string;
  readonly chassis: string;
  readonly model: string;
  readonly config: string;
  readonly techBase: string;
  readonly era: string;
  readonly source: string;
  readonly rules: string;
  readonly mass: number;
  readonly engine: string;
  readonly structure: string;
  readonly myomer: string;
  readonly heatSinks: string;
  readonly walkMP: number;
  readonly jumpMP: number;
  readonly armor: string;
  readonly armorValues: Record<string, number>;
  readonly weapons: string[];
  readonly criticals: Record<string, string[]>;
  readonly fluff?: Record<string, string>;
}

/**
 * MTF importer interface
 */
export interface IMTFImporter {
  import(mtfContent: string): IDeserializationResult;
  validate(mtfContent: string): { isValid: boolean; errors: string[] };
}

/**
 * MTF exporter interface
 */
export interface IMTFExporter {
  export(unit: IBattleMech): ISerializationResult;
}

