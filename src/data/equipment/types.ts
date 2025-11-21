/**
 * Equipment Type Definitions for BattleTech Equipment Database
 */

export type TechBase = 'IS' | 'Clan';
export type RulesLevel = 'Introductory' | 'Standard' | 'Advanced' | 'Experimental';
export type EquipmentCategory = 
  | 'Energy Weapons' 
  | 'Ballistic Weapons' 
  | 'Missile Weapons' 
  | 'Artillery Weapons'
  | 'Capital Weapons'
  | 'Physical Weapons'
  | 'Anti-Personnel Weapons'
  | 'One-Shot Weapons'
  | 'Torpedoes'
  | 'Equipment' 
  | 'Industrial Equipment'
  | 'Heat Management' 
  | 'Movement Equipment'
  | 'Electronic Warfare'
  | 'Prototype Equipment'
  | 'Ammunition';

// Categories that appear in equipment browser by default (weapons and ammo)
export const BROWSABLE_CATEGORIES: EquipmentCategory[] = [
  'Energy Weapons',
  'Ballistic Weapons', 
  'Missile Weapons',
  'Artillery Weapons',
  'Capital Weapons',
  'Physical Weapons',
  'One-Shot Weapons',
  'Torpedoes',
  'Ammunition'
];

// Categories that are excluded by default (special equipment)
export const SPECIAL_CATEGORIES: EquipmentCategory[] = [
  'Anti-Personnel Weapons',
  'Heat Management',
  'Movement Equipment',
  'Equipment',
  'Industrial Equipment', 
  'Electronic Warfare',
  'Prototype Equipment'
];

// All categories for filter dropdown
export const ALL_CATEGORIES: EquipmentCategory[] = [
  'Energy Weapons',
  'Ballistic Weapons',
  'Missile Weapons',
  'Artillery Weapons',
  'Capital Weapons',
  'Physical Weapons',
  'Anti-Personnel Weapons',
  'One-Shot Weapons',
  'Torpedoes',
  'Ammunition',
  'Heat Management',
  'Movement Equipment',
  'Equipment',
  'Industrial Equipment',
  'Electronic Warfare',
  'Prototype Equipment'
];

export interface EquipmentVariant {
  weight: number;         // Weight in tons
  crits: number;         // Critical slots required
  damage?: number | null; // Damage value (null for non-weapons)
  heat?: number | null;   // Heat generated/dissipated (null if not applicable)
  minRange?: number | null; // Minimum range
  rangeShort?: number | null; // Short range
  rangeMedium?: number | null; // Medium range
  rangeLong?: number | null; // Long range
  rangeExtreme?: number | null; // Extreme range
  ammoPerTon?: number | null; // Shots per ton for ammo
  cost?: number | null;   // Cost in C-Bills
  battleValue?: number | null; // Battle Value
}

export interface LocationRestrictions {
  type: 'static' | 'engine_slots' | 'custom'
  validator?: (unit: any, location: string) => boolean
}

export interface Equipment {
  id: string;            // Unique identifier
  name: string;          // Display name
  category: EquipmentCategory;
  baseType?: string;     // Base equipment type
  description?: string;  // Equipment description
  requiresAmmo: boolean; // Whether this equipment needs ammunition
  introductionYear: number; // Year introduced
  rulesLevel: RulesLevel; // Rules complexity level
  techRating?: string;   // Technology rating (A-F, X)
  sourceBook?: string;   // Source book abbreviation (e.g., "TM", "TO")
  pageReference?: string; // Page number in source book
  variants: {
    IS?: EquipmentVariant;   // Inner Sphere variant
    Clan?: EquipmentVariant; // Clan variant
  };
  special?: string[];    // Special rules or abilities
  
  // Location restrictions
  allowedLocations?: string[] // Static restrictions - simple whitelist
  locationRestrictions?: LocationRestrictions // Dynamic restrictions - complex validation
}

export interface EquipmentDatabase {
  energyWeapons: Equipment[];
  ballisticWeapons: Equipment[];
  missileWeapons: Equipment[];
  artilleryWeapons: Equipment[];
  capitalWeapons: Equipment[];
  physicalWeapons: Equipment[];
  antiPersonnelWeapons: Equipment[];
  oneShotWeapons: Equipment[];
  torpedoes: Equipment[];
  equipment: Equipment[];
  industrialEquipment: Equipment[];
  heatManagement: Equipment[];
  movementEquipment: Equipment[];
  electronicWarfare: Equipment[];
  prototypeEquipment: Equipment[];
  ammunition: Equipment[];
}

// Helper type for flattened equipment list with tech base
export interface EquipmentVariantFlat {
  id: string;
  name: string;
  category: EquipmentCategory;
  techBase: TechBase;
  weight: number;
  crits: number;
  damage?: number | null;
  heat?: number | null;
  minRange?: number | null;
  rangeShort?: number | null;
  rangeMedium?: number | null;
  rangeLong?: number | null;
  rangeExtreme?: number | null;
  ammoPerTon?: number | null;
  cost?: number | null;
  battleValue?: number | null;
  requiresAmmo: boolean;
  introductionYear: number;
  rulesLevel: RulesLevel;
  baseType?: string;
  description?: string;
  special?: string[];
  sourceBook?: string;
  pageReference?: string;
}
