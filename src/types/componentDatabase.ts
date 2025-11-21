/**
 * Component Database TypeScript Interfaces
 * Defines the schema for the Rich Component Database system
 */

import {
  ComponentCategory,
  TechBase,
  RulesLevel,
  TechLevel
} from './core/BaseTypes';

import { IEquipmentConfiguration } from './core/BaseTypes';

// ===== COMPONENT SPECIFICATION INTERFACE =====

/**
 * Complete specification for a single component variant
 * Contains all metadata needed for display, calculations, and validation
 */
export interface ComponentSpec extends IEquipmentConfiguration {
  // Basic identification
  // name: string; (Inherited)
  // id: string;   (Inherited)
  
  // Weight properties (mutually exclusive based on component type)
  // weight: number; (Inherited)
  weightMultiplier?: number;       // For structure/armor: 0.05 = 5% of tonnage
  weightMod?: number;              // For engine/gyro: 0.5 = half weight
  
  // Game mechanics
  criticalSlots: number;           // Required critical slots
  dissipation?: number;            // Heat dissipation for heat sinks
  // heatGeneration?: number;      (Inherited)
  
  // Tech classification
  techLevel: TechLevel;            // Technology sophistication level
  rulesLevel: RulesLevel;          // Tournament/campaign legality
  introductionYear: number;       // Year introduced for era games
  
  // Behavioral flags
  isDefault?: boolean;             // Default choice for this tech base
  isAdvanced?: boolean;            // Requires advanced rules
  isExperimental?: boolean;        // Experimental technology
  
  // Display and documentation
  // description?: string;         (Inherited)
  gameEffect?: string;             // Mechanical game effect description
  specialRules?: string[];         // Special rules or restrictions
  
  // Validation constraints
  minTonnage?: number;             // Minimum unit tonnage for this component
  maxTonnage?: number;             // Maximum unit tonnage for this component
  requiredTech?: string[];         // Other tech that must be present
  incompatibleTech?: string[];     // Tech that cannot be used together
}

// ===== DROPDOWN GENERATION INTERFACES =====

/**
 * Formatted option for dropdown components
 */
export interface DropdownOption {
  id: string;                      // For <option value="">
  name: string;                    // Display name
  description?: string;            // Metadata display
  weight?: string;                 // "0.5x weight" or "3.0 tons"
  criticalSlots?: string;          // "14 slots"
  isDisabled?: boolean;            // Rules/tech level restrictions
  isDefault?: boolean;             // Default selection
  techLevel?: string;              // Tech level indicator
  introYear?: number;              // Introduction year
}

/**
 * Options for dropdown generation
 */
export interface DropdownGenerationOptions {
  techBase: TechBase;
  rulesLevel?: RulesLevel;
  currentYear?: number;            // For era filtering
  currentSelection?: string;       // Current selection to preserve
  showMetadata?: boolean;          // Include weight/slots in display
  showTechLevels?: boolean;        // Show tech level indicators
  groupByTechLevel?: boolean;      // Group options by tech level
}

// ===== VALIDATION INTERFACES =====

/**
 * Result of component validation
 */
export interface ValidationResult {
  isValid: boolean;
  resolvedComponent?: ComponentSpec;
  errors: string[];
  warnings: string[];
  autoResolved: boolean;
  resolutionReason?: string;
}

/**
 * Component compatibility check result
 */
export interface CompatibilityResult {
  isCompatible: boolean;
  conflicts: string[];
  requirements: string[];
  warnings: string[];
}

// ===== DATABASE STRUCTURE INTERFACES =====

/**
 * Components for a single tech base
 */
export interface ComponentCategory_TechBase {
  [techBase: string]: ComponentSpec[];
}

/**
 * Complete component database structure
 */
export interface ComponentDatabase {
  chassis: ComponentCategory_TechBase;     // Internal structure types
  engine: ComponentCategory_TechBase;      // Engine types
  gyro: ComponentCategory_TechBase;        // Gyroscope types
  heatsink: ComponentCategory_TechBase;    // Heat sink types
  armor: ComponentCategory_TechBase;       // Armor types
  myomer: ComponentCategory_TechBase;      // Enhancement/myomer systems
  targeting: ComponentCategory_TechBase;   // Targeting systems
  movement: ComponentCategory_TechBase;    // Jump jets and movement systems
}

// ===== TECH PROGRESSION INTEGRATION =====

/**
 * Tech progression state for all subsystems
 */
export interface TechProgression {
  chassis: TechBase;
  engine: TechBase;
  gyro: TechBase;
  heatsink: TechBase;
  armor: TechBase;
  myomer: TechBase;
  targeting: TechBase;
  movement: TechBase;
}

/**
 * Component configuration with tech base
 */
export interface ComponentConfiguration {
  type: string;                    // Component name
  techBase: TechBase;              // Which tech base this component belongs to
}

// ===== TECH BASE MEMORY SYSTEM =====

/**
 * Memory system to remember component selections per tech base
 * Enables seamless switching between Inner Sphere and Clan configurations
 */
export interface TechBaseMemory {
  chassis: { [K in TechBase]: string };
  engine: { [K in TechBase]: string };
  gyro: { [K in TechBase]: string };
  heatsink: { [K in TechBase]: string };
  armor: { [K in TechBase]: string };
  myomer: { [K in TechBase]: string };
  targeting: { [K in TechBase]: string };
  movement: { [K in TechBase]: string };
}

/**
 * Complete memory state with metadata
 */
export interface ComponentMemoryState {
  techBaseMemory: TechBaseMemory;
  lastUpdated: number;             // Timestamp of last update
  version: string;                 // Schema version for migration support
}

/**
 * Result of component resolution with memory
 */
export interface ComponentResolutionWithMemory {
  resolvedComponent: string;       // The component name that was resolved
  updatedMemory: TechBaseMemory;   // Updated memory state
  wasRestored: boolean;            // True if component was restored from memory
  resolutionReason: string;        // Explanation of what happened
}

/**
 * Memory update operation result
 */
export interface MemoryUpdateResult {
  updatedMemory: TechBaseMemory;
  changed: boolean;                // True if memory actually changed
  previousValue?: string;          // Previous value if it changed
}

// ===== COMPONENT CHANGE TRACKING =====

/**
 * Notification for component changes
 */
export interface ComponentChangeNotification {
  component: string;
  category: ComponentCategory;
  oldValue: string;
  newValue: string;
  reason: ComponentChangeReason;
  action: ComponentChangeAction;
  timestamp: number;
}

export type ComponentChangeReason = 
  | 'tech_progression_change'
  | 'rules_level_change'
  | 'invalid_selection'
  | 'user_selection'
  | 'configuration_migration';

export type ComponentChangeAction =
  | 'auto_resolved'
  | 'user_required'
  | 'validation_failed';

// ===== QUERY AND FILTER INTERFACES =====

/**
 * Query parameters for component database
 */
export interface ComponentQuery {
  category: ComponentCategory;
  techBase?: TechBase;
  rulesLevel?: RulesLevel;
  techLevel?: TechLevel;
  minYear?: number;
  maxYear?: number;
  includeTonnageRange?: [number, number];
  excludeExperimental?: boolean;
}

/**
 * Filter function type for component queries
 */
export type ComponentFilter = (component: ComponentSpec) => boolean;

/**
 * Sort function type for component results
 */
export type ComponentSorter = (a: ComponentSpec, b: ComponentSpec) => number;

// ===== LEGACY COMPATIBILITY INTERFACES =====

/**
 * Legacy structure type for backward compatibility
 */
export interface LegacyStructureType {
  id: string;
  name: string;
  weightMultiplier: number;
  critSlots: number;
  techLevel: number;
}

/**
 * Legacy engine type for backward compatibility
 */
export interface LegacyEngineType {
  id: string;
  name: string;
  weightMod: number;
  critSlots: number;
}

/**
 * Legacy gyro type for backward compatibility
 */
export interface LegacyGyroType {
  id: string;
  name: string;
  weightMod: number;
  critSlots: number;
}

/**
 * Legacy armor type for backward compatibility
 */
export interface LegacyArmorType {
  id: string;
  name: string;
  pointsPerTon: number;
  criticalSlots: number;
  techLevel: string;
  techBase: string;
}

// ===== UTILITY TYPE HELPERS =====

/**
 * Extract component names from database for a specific category and tech base
 */
export type ComponentNames<T extends ComponentCategory> = string;

/**
 * Type guard for component category
 */
export function isComponentCategory(value: string): value is ComponentCategory {
  return Object.values(ComponentCategory).includes(value as ComponentCategory);
}

/**
 * Type guard for tech base
 */
export function isTechBase(value: string): value is TechBase {
  return Object.values(TechBase).includes(value as TechBase);
}

/**
 * Type guard for tech level
 */
export function isTechLevel(value: string): value is TechLevel {
  return Object.values(TechLevel).includes(value as TechLevel);
}

/**
 * Type guard for rules level
 */
export function isRulesLevel(value: string): value is RulesLevel {
  return Object.values(RulesLevel).includes(value as RulesLevel);
}

// ===== DATABASE INTEGRITY INTERFACES =====

/**
 * Database validation result
 */
export interface DatabaseValidationResult {
  isValid: boolean;
  errors: DatabaseValidationError[];
  warnings: string[];
  stats: DatabaseStats;
}

/**
 * Database validation error
 */
export interface DatabaseValidationError {
  category: ComponentCategory;
  techBase: TechBase;
  componentId: string;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  totalComponents: number;
  componentsByCategory: Record<ComponentCategory, number>;
  componentsByTechBase: Record<TechBase, number>;
  componentsByTechLevel: Record<TechLevel, number>;
  defaultComponents: number;
  experimentalComponents: number;
}

// ===== COMPONENT METADATA EXTENSIONS =====

/**
 * Extended metadata for future features
 */
export interface ExtendedComponentSpec extends ComponentSpec {
  // Economic properties (for future C-Bills system)
  baseCost?: number;
  costMultiplier?: number;
  
  // Availability properties (for campaign rules)
  availabilityRating?: string;
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Ultra-Rare';
  
  // Manufacturing properties
  manufacturer?: string[];
  productionYears?: [number, number?];
  
  // Game balance properties
  balancePoints?: number;
  powerLevel?: number;
}

/**
 * Component database with extended metadata
 */
export interface ExtendedComponentDatabase {
  chassis: { [techBase: string]: ExtendedComponentSpec[] };
  engine: { [techBase: string]: ExtendedComponentSpec[] };
  gyro: { [techBase: string]: ExtendedComponentSpec[] };
  heatsink: { [techBase: string]: ExtendedComponentSpec[] };
  armor: { [techBase: string]: ExtendedComponentSpec[] };
  myomer: { [techBase: string]: ExtendedComponentSpec[] };
  targeting: { [techBase: string]: ExtendedComponentSpec[] };
  movement: { [techBase: string]: ExtendedComponentSpec[] };
}

// ===== ERROR HANDLING =====

/**
 * Component database errors
 */
export class ComponentDatabaseError extends Error {
  constructor(
    message: string,
    public category?: ComponentCategory,
    public techBase?: TechBase,
    public componentName?: string
  ) {
    super(message);
    this.name = 'ComponentDatabaseError';
  }
}

/**
 * Component not found error
 */
export class ComponentNotFoundError extends ComponentDatabaseError {
  constructor(componentName: string, category: ComponentCategory, techBase: TechBase) {
    super(
      `Component "${componentName}" not found in category "${category}" for tech base "${techBase}"`,
      category,
      techBase,
      componentName
    );
    this.name = 'ComponentNotFoundError';
  }
}

/**
 * Invalid tech progression error
 */
export class InvalidTechProgressionError extends ComponentDatabaseError {
  constructor(category: ComponentCategory, techBase: TechBase) {
    super(
      `Invalid tech progression: ${category} cannot use ${techBase} tech base`,
      category,
      techBase
    );
    this.name = 'InvalidTechProgressionError';
  }
}

// ===== EXPORT UTILITIES =====

/**
 * All component categories as a constant array
 */
export const COMPONENT_CATEGORIES: readonly ComponentCategory[] = [
  ComponentCategory.CHASSIS,
  ComponentCategory.ENGINE,
  ComponentCategory.GYRO,
  ComponentCategory.HEAT_SINK,
  ComponentCategory.ARMOR,
  ComponentCategory.MYOMER,
  ComponentCategory.TARGETING,
  ComponentCategory.MOVEMENT
] as const;

/**
 * All tech bases as a constant array
 */
export const TECH_BASES: readonly TechBase[] = [
  TechBase.INNER_SPHERE,
  TechBase.CLAN
] as const;

/**
 * All tech levels as a constant array
 */
export const TECH_LEVELS: readonly TechLevel[] = [
  TechLevel.INTRODUCTORY,
  TechLevel.STANDARD,
  TechLevel.ADVANCED,
  TechLevel.EXPERIMENTAL
] as const;

/**
 * All rules levels as a constant array
 */
export const RULES_LEVELS: readonly RulesLevel[] = [
  RulesLevel.INTRODUCTORY,
  RulesLevel.STANDARD,
  RulesLevel.ADVANCED,
  RulesLevel.EXPERIMENTAL
] as const;
