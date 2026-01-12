/**
 * Shared Types for Unit Pages
 * 
 * Common interfaces used across unit-related pages.
 * Extracted to avoid DRY violations.
 */
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';

/**
 * Lightweight unit entry for lists and search results
 */
export interface IUnitEntry {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: Era;
  weightClass: WeightClass;
  unitType: string;
  /** Introduction year */
  year?: number;
  /** Role (e.g., Juggernaut, Scout, Striker) */
  role?: string;
  /** Rules level (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL) */
  rulesLevel?: string;
  /** C-Bill cost */
  cost?: number;
  /** Battle Value 2.0 */
  bv?: number;
}

/**
 * Full unit details for detail pages
 */
export interface IUnitDetails {
  id: string;
  name?: string;
  chassis?: string;
  model?: string;
  variant?: string;
  tonnage: number;
  unitType?: string;
  configuration?: string;
  techBase?: string;
  rulesLevel?: string;
  era?: string;
  year?: number;
  engine?: IEngineConfig;
  gyro?: IGyroConfig;
  cockpit?: string;
  structure?: IStructureConfig;
  armor?: IArmorConfig;
  heatSinks?: IHeatSinkConfig;
  movement?: IMovementConfig;
  equipment?: IMountedEquipmentEntry[];
  quirks?: string[];
  metadata?: IPageUnitMetadata;
}

/**
 * Engine configuration
 */
export interface IEngineConfig {
  type: string;
  rating: number;
}

/**
 * Gyro configuration
 */
export interface IGyroConfig {
  type: string;
}

/**
 * Structure configuration
 */
export interface IStructureConfig {
  type: string;
}

/**
 * Armor configuration with allocation
 */
export interface IArmorConfig {
  type: string;
  allocation: Record<string, number | IArmorFrontRear>;
}

/**
 * Front/rear armor allocation for torso locations
 */
export interface IArmorFrontRear {
  front: number;
  rear: number;
}

/**
 * Heat sink configuration
 */
export interface IHeatSinkConfig {
  type: string;
  count: number;
}

/**
 * Movement configuration
 */
export interface IMovementConfig {
  walk: number;
  jump: number;
  jumpJetType?: string;
  enhancements?: string[];
}

/**
 * Mounted equipment entry
 */
export interface IMountedEquipmentEntry {
  id: string;
  location: string;
  slots?: number[];
  isRearMounted?: boolean;
}

/**
 * Lightweight unit metadata for page display
 *
 * Note: This is a simplified subset of IUnitMetadata from BattleMechInterfaces.
 * Use this for page-level display; use the full IUnitMetadata for unit data.
 */
export interface IPageUnitMetadata {
  chassis?: string;
  model?: string;
  role?: string;
  manufacturer?: string;
  notes?: string;
}

/**
 * Filter state for unit list pages
 */
export interface IUnitFilterState {
  search: string;
  techBase: string;
  weightClass: string;
  era: string;
}

/**
 * Type guard to check if armor value is front/rear object
 */
export function isArmorFrontRear(value: unknown): value is IArmorFrontRear {
  return (
    typeof value === 'object' &&
    value !== null &&
    'front' in value &&
    'rear' in value &&
    typeof (value as IArmorFrontRear).front === 'number' &&
    typeof (value as IArmorFrontRear).rear === 'number'
  );
}

/**
 * Calculate total armor points from allocation
 */
export function calculateTotalArmor(armor: IArmorConfig | undefined): number {
  if (!armor?.allocation) return 0;
  return Object.values(armor.allocation).reduce((sum: number, val) => {
    if (typeof val === 'number') return sum + val;
    if (isArmorFrontRear(val)) {
      return sum + val.front + val.rear;
    }
    return sum;
  }, 0);
}

