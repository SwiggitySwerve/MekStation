/**
 * Core Base Types for BattleTech Editor
 * 
 * Foundational interfaces and types that provide type safety and enable
 * proper SOLID refactoring by eliminating "as any" type casting.
 * 
 * These base types are designed to be:
 * - Minimal and focused (Single Responsibility)
 * - Composable (Open/Closed Principle)
 * - Substitutable (Liskov Substitution)
 * - Segregated (Interface Segregation)
 * - Dependency-injectable (Dependency Inversion)
 */

// ===== CORE FOUNDATION TYPES =====

/**
 * Universal identifier type for all entities
 */
export type EntityId = string;

/**
 * Tech base enum - strongly typed replacement for string literals
 */
export enum TechBase {
  INNER_SPHERE = 'Inner Sphere',
  CLAN = 'Clan',
  MIXED_IS_CHASSIS = 'Mixed (IS Chassis)',
  MIXED_CLAN_CHASSIS = 'Mixed (Clan Chassis)',
  MIXED = 'Mixed',
  BOTH = 'Both'
}

/**
 * Rules level enum - strongly typed replacement for string literals
 */
export enum RulesLevel {
  INTRODUCTORY = 'Introductory',
  STANDARD = 'Standard',
  ADVANCED = 'Advanced',
  EXPERIMENTAL = 'Experimental'
}

/**
 * Technology Level enum - sophistication of the tech
 */
export enum TechLevel {
  INTRODUCTORY = 'Introductory',
  STANDARD = 'Standard',
  ADVANCED = 'Advanced',
  EXPERIMENTAL = 'Experimental'
}

/**
 * Severity levels for violations and recommendations
 */
export enum Severity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  WARNING = 'warning'
}

/**
 * Difficulty levels for operations and recommendations
 */
export enum Difficulty {
  EASY = 'easy',
  MODERATE = 'moderate',
  HARD = 'hard'
}

/**
 * Priority levels for recommendations and actions
 */
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Component Category Enum
 * Represents structural systems that are part of the unit's chassis or core identity.
 */
export enum ComponentCategory {
  CHASSIS = 'chassis',
  ENGINE = 'engine',
  GYRO = 'gyro',
  COCKPIT = 'cockpit',
  STRUCTURE = 'structure',
  ARMOR = 'armor',
  HEAT_SINK = 'heatsink', // System-level heat sink config (type, etc)
  MYOMER = 'myomer',
  TARGETING = 'targeting',
  MOVEMENT = 'movement' // Jump jet config, MASC, etc.
}

/**
 * Equipment Category Enum
 * Represents inventory items that are placed in critical slots.
 */
export enum EquipmentCategory {
  // Weapons
  WEAPON = 'weapon',
  
  // Ammunition
  AMMO = 'ammo',
  
  // Equipment
  EQUIPMENT = 'equipment',
  ELECTRONICS = 'electronics',
  
  // System Components placed as items (e.g. Jump Jets, Heat Sinks)
  HEAT_SINK = 'heat_sink',
  JUMP_JET = 'jump_jet',
  
  // Physical
  PHYSICAL = 'physical', // Hatchet, etc.
  
  // Misc
  MISCELLANEOUS = 'miscellaneous'
}

/**
 * Unit type enum
 */
export enum UnitType {
  BATTLEMECH = 'BattleMech',
  INDUSTRIALMECH = 'IndustrialMech',
  COMBAT_VEHICLE = 'Combat Vehicle',
  SUPPORT_VEHICLE = 'Support Vehicle',
  AEROSPACE = 'Aerospace',
  BATTLE_ARMOR = 'Battle Armor',
  PROTO_MECH = 'ProtoMech',
  INFANTRY = 'Infantry',
  DROPSHIP = 'DropShip',
  JUMPSHIP = 'JumpShip',
  WARSHIP = 'WarShip',
  SPACE_STATION = 'Space Station',
  MOBILE_STRUCTURE = 'Mobile Structure'
}

// ===== BASE ENTITY INTERFACES =====

/**
 * Base interface for all identifiable entities
 */
export interface IIdentifiable {
  readonly id: EntityId;
}

/**
 * Base interface for entities with display names
 */
export interface INamed extends IIdentifiable {
  readonly name: string;
}

/**
 * Base interface for entities with descriptions
 */
export interface IDescribable extends INamed {
  readonly description?: string;
}

/**
 * Base interface for entities with tech base
 */
export interface ITechBased {
  readonly techBase: TechBase;
}

/**
 * Base interface for entities with rules level
 */
export interface IRulesLeveled {
  readonly rulesLevel: RulesLevel;
}

/**
 * Base interface for entities with weight
 */
export interface IWeighted {
  readonly weight: number;
}

/**
 * Base interface for entities with critical slots
 */
export interface ISlotted {
  readonly slots: number;
}

/**
 * Base interface for entities with location restrictions
 */
export interface ILocationRestricted {
  readonly allowedLocations?: string[];
  readonly forbiddenLocations?: string[];
}

// ===== VALIDATION BASE INTERFACES =====

/**
 * Base interface for validation results
 */
export interface IValidationResult {
  readonly isValid: boolean;
  readonly violations: IViolation[];
  readonly warnings: IWarning[];
  readonly timestamp: Date;
}

/**
 * Base interface for violations
 */
export interface IViolation {
  readonly type: string;
  readonly severity: Severity;
  readonly message: string;
  readonly component?: string;
  readonly location?: string;
  readonly suggestedFix?: string;
}

/**
 * Base interface for warnings
 */
export interface IWarning {
  readonly type: string;
  readonly message: string;
  readonly component?: string;
  readonly location?: string;
  readonly recommendation?: string;
}

/**
 * Base interface for recommendations
 */
export interface IRecommendation {
  readonly type: string;
  readonly priority: Priority;
  readonly difficulty: Difficulty;
  readonly description: string;
  readonly benefit: string;
  readonly estimatedImpact: number;
}

// ===== CALCULATION BASE INTERFACES =====

/**
 * Base interface for calculation results
 */
export interface ICalculationResult {
  readonly calculated: number;
  readonly expected?: number;
  readonly difference?: number;
  readonly isWithinTolerance: boolean;
  readonly calculationMethod: string;
  readonly timestamp: Date;
}

/**
 * Base interface for calculation contexts
 */
export interface ICalculationContext {
  readonly strictMode: boolean;
  readonly includeOptimizations: boolean;
  readonly techLevel: RulesLevel;
  readonly metadata?: Record<string, any>;
}

// ===== CONFIGURATION BASE INTERFACES =====

/**
 * Base interface for component configurations
 */
export interface IComponentConfiguration extends ITechBased, INamed {
  readonly type: string;
  readonly restrictions?: string[];
}

/**
 * Base interface for equipment configurations
 */
export interface IEquipmentConfiguration extends IComponentConfiguration, IWeighted, ISlotted, ILocationRestricted {
  readonly category: EquipmentCategory | string;
  readonly requiresAmmo: boolean;
  readonly heatGeneration?: number;
  readonly range?: IRangeProfile;
}

/**
 * Range profile interface
 */
export interface IRangeProfile {
  readonly minimum?: number;
  readonly short?: number;
  readonly medium?: number;
  readonly long?: number;
  readonly extreme?: number;
}

// ===== SERVICE BASE INTERFACES =====

/**
 * Base interface for all services - enables dependency injection
 */
export interface IService {
  readonly serviceName: string;
  readonly version: string;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Base interface for services that can be configured
 */
export interface IConfigurableService extends IService {
  configure(config: IServiceConfiguration): void;
  getConfiguration(): IServiceConfiguration;
}

/**
 * Base service configuration interface
 */
export interface IServiceConfiguration {
  readonly enableDebugLogging?: boolean;
  readonly enableCaching?: boolean;
  readonly enableValidation?: boolean;
  readonly metadata?: Record<string, any>;
}

/**
 * Base interface for observable services
 */
export interface IObservableService extends IService {
  subscribe(listener: (event: IServiceEvent) => void): () => void;
  unsubscribe(listener: (event: IServiceEvent) => void): void;
}

/**
 * Base interface for service events
 */
export interface IServiceEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly data?: any;
}

// ===== FACTORY BASE INTERFACES =====

/**
 * Base interface for all factories
 */
export interface IFactory<T> {
  readonly factoryName: string;
  create(...args: any[]): T;
}

/**
 * Base interface for configurable factories
 */
export interface IConfigurableFactory<T> extends IFactory<T> {
  createWithConfiguration(config: any): T;
}

/**
 * Base interface for strategy factories
 */
export interface IStrategyFactory<T> extends IFactory<T> {
  readonly availableStrategies: string[];
  createStrategy(strategyName: string): T;
}

// ===== OBSERVER BASE INTERFACES =====

/**
 * Base interface for observers
 */
export interface IObserver<T> {
  update(data: T): void;
}

/**
 * Base interface for observable subjects
 */
export interface IObservable<T> {
  subscribe(observer: IObserver<T>): () => void;
  unsubscribe(observer: IObserver<T>): void;
  notify(data: T): void;
}

// ===== COMMAND BASE INTERFACES =====

/**
 * Base interface for commands (Command Pattern)
 */
export interface ICommand<T = any> {
  readonly name: string;
  execute(): Promise<T>;
  undo?(): Promise<void>;
  canUndo?: boolean;
}

/**
 * Base interface for command contexts
 */
export interface ICommandContext {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

// ===== STRATEGY BASE INTERFACES =====

/**
 * Base interface for all strategies
 */
export interface IStrategy {
  readonly strategyName: string;
  readonly description: string;
}

/**
 * Base interface for validation strategies
 */
export interface IValidationStrategy extends IStrategy {
  validate(data: any): Promise<IValidationResult>;
}

/**
 * Base interface for calculation strategies
 */
export interface ICalculationStrategy extends IStrategy {
  calculate(data: any, context: ICalculationContext): Promise<ICalculationResult>;
}

// ===== BUILDER BASE INTERFACES =====

/**
 * Base interface for all builders
 */
export interface IBuilder<T> {
  build(): T;
  reset(): IBuilder<T>;
}

/**
 * Base interface for fluent builders
 */
export interface IFluentBuilder<T> extends IBuilder<T> {
  // Fluent methods return this for chaining
}

// ===== UTILITY TYPE HELPERS =====

/**
 * Helper type for making properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Helper type for making properties required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Helper type for readonly variants
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Helper type for partial deep types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Helper type for extracting method names
 */
export type MethodNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * Helper type for extracting property names
 */
export type PropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

// ===== RESULT TYPES =====

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper function to create success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Helper function to create error result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard for success results
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard for error results
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Type Guards for Runtime Type Checking
 * 
 * These functions provide type-safe alternatives to "as any" casting
 * by performing runtime type checking with proper TypeScript type guards.
 */

/**
 * Type guard for unit state validation
 * 
 * Note: Uses inline type definition to avoid circular dependency
 */
export function isValidUnitState(state: unknown): state is {
  readonly configuration: {
    readonly id: EntityId;
    readonly name: string;
    readonly chassis: string;
    readonly model: string;
    readonly techBase: TechBase;
    readonly rulesLevel: RulesLevel;
    readonly era: string;
    readonly tonnage: number;
    readonly structure: unknown;
    readonly engine: unknown;
    readonly gyro: unknown;
    readonly cockpit: unknown;
    readonly armor: unknown;
    readonly heatSinks: unknown;
    readonly jumpJets: unknown;
    readonly equipment: unknown[];
    readonly fixedAllocations: unknown[];
    readonly groups: unknown[];
    readonly metadata: unknown;
  };
  readonly unallocatedEquipment: unknown[];
  readonly criticalSlots: unknown;
  readonly validation: unknown;
  readonly metadata: unknown;
} {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  
  const s = state as Record<string, unknown>;
  
  return (
    'configuration' in s &&
    'unallocatedEquipment' in s &&
    'criticalSlots' in s &&
    'validation' in s &&
    'metadata' in s &&
    isValidUnitConfiguration(s.configuration) &&
    Array.isArray(s.unallocatedEquipment) &&
    typeof s.criticalSlots === 'object' &&
    isValidationState(s.validation) &&
    isStateMetadata(s.metadata)
  );
}

/**
 * Type guard for validation state
 */
function isValidationState(validation: unknown): boolean {
  if (typeof validation !== 'object' || validation === null) {
    return false;
  }
  
  const v = validation as Record<string, unknown>;
  return (
    typeof v.isValid === 'boolean' &&
    'lastValidation' in v &&
    Array.isArray(v.violations) &&
    Array.isArray(v.warnings) &&
    typeof v.score === 'number'
  );
}

/**
 * Type guard for state metadata
 */
function isStateMetadata(metadata: unknown): boolean {
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }
  
  const m = metadata as Record<string, unknown>;
  return (
    typeof m.version === 'string' &&
    'created' in m &&
    'modified' in m &&
    typeof m.checksum === 'string' &&
    typeof m.size === 'number'
  );
}

/**
 * Type guard for unit configuration validation
 * 
 * Note: Uses inline type definition to avoid circular dependency
 */
export function isValidUnitConfiguration(config: unknown): config is {
  readonly id: EntityId;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era: string;
  readonly tonnage: number;
  readonly structure: unknown;
  readonly engine: unknown;
  readonly gyro: unknown;
  readonly cockpit: unknown;
  readonly armor: unknown;
  readonly heatSinks: unknown;
  readonly jumpJets: unknown;
  readonly equipment: unknown[];
  readonly fixedAllocations: unknown[];
  readonly groups: unknown[];
  readonly metadata: unknown;
} {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const configObj = config as Record<string, unknown>;
  return (
    'id' in config &&
    'name' in config &&
    'chassis' in config &&
    'model' in config &&
    'techBase' in config &&
    'rulesLevel' in config &&
    'era' in config &&
    'tonnage' in config &&
    'structure' in config &&
    'engine' in config &&
    'gyro' in config &&
    'cockpit' in config &&
    'armor' in config &&
    'heatSinks' in config &&
    'jumpJets' in config &&
    'equipment' in config &&
    'fixedAllocations' in config &&
    'groups' in config &&
    'metadata' in config &&
    typeof configObj.id === 'string' &&
    typeof configObj.name === 'string' &&
    typeof configObj.chassis === 'string' &&
    typeof configObj.model === 'string' &&
    typeof configObj.tonnage === 'number'
  );
}

/**
 * Type guard for equipment allocation validation
 * 
 * Note: Uses inline type definition to avoid circular dependency
 */
export function isValidEquipmentAllocation(allocation: unknown): allocation is {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly equipment: unknown;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly status: unknown;
} {
  if (typeof allocation !== 'object' || allocation === null) {
    return false;
  }

  const allocationObj = allocation as Record<string, unknown>;
  return (
    'id' in allocation &&
    'equipmentId' in allocation &&
    'equipment' in allocation &&
    'location' in allocation &&
    'slotIndex' in allocation &&
    'quantity' in allocation &&
    'status' in allocation &&
    typeof allocationObj.id === 'string' &&
    typeof allocationObj.equipmentId === 'string' &&
    typeof allocationObj.location === 'string' &&
    typeof allocationObj.slotIndex === 'number' &&
    typeof allocationObj.quantity === 'number'
  );
}

/**
 * Type guard for validation result validation
 */
export function isValidationResult(result: unknown): result is IValidationResult {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const resultObj = result as Record<string, unknown>;
  return (
    'isValid' in result &&
    'violations' in result &&
    'warnings' in result &&
    'timestamp' in result &&
    typeof resultObj.isValid === 'boolean' &&
    Array.isArray(resultObj.violations) &&
    Array.isArray(resultObj.warnings)
  );
}

/**
 * Type guard for calculation result validation
 */
export function isCalculationResult(result: unknown): result is ICalculationResult {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const resultObj = result as Record<string, unknown>;
  return (
    'calculationMethod' in result &&
    'timestamp' in result &&
    typeof resultObj.calculationMethod === 'string'
  );
}

/**
 * Type guard for service validation
 */
export function isService(service: unknown): service is IService {
  if (typeof service !== 'object' || service === null) {
    return false;
  }

  const serviceObj = service as Record<string, unknown>;
  return (
    'initialize' in service &&
    'cleanup' in service &&
    typeof serviceObj.initialize === 'function' &&
    typeof serviceObj.cleanup === 'function'
  );
}

/**
 * Type guard for Node.js error validation
 */
export function isNodeError(error: unknown): error is Error & { code?: string } {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  const errorObj = error as Record<string, unknown>;
  return typeof errorObj.code === 'string';
}

/**
 * Type guard for tech base validation
 */
export function isValidTechBase(techBase: unknown): techBase is TechBase {
  return (
    typeof techBase === 'string' &&
    Object.values(TechBase).includes(techBase as TechBase)
  );
}

/**
 * Type guard for rules level validation
 */
export function isValidRulesLevel(rulesLevel: unknown): rulesLevel is RulesLevel {
  return (
    typeof rulesLevel === 'string' &&
    Object.values(RulesLevel).includes(rulesLevel as RulesLevel)
  );
}

/**
 * Safe property accessor with type checking
 */
export function safeGet<T>(obj: unknown, key: string, defaultValue: T): T {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const objRecord = obj as Record<string, unknown>;
    const value = objRecord[key];
    return value !== undefined ? (value as T) : defaultValue;
  }
  return defaultValue;
}

/**
 * Safe property accessor for strings
 */
export function safeGetString(obj: unknown, key: string, defaultValue: string = ''): string {
  const value = safeGet(obj, key, defaultValue);
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Safe property accessor for numbers
 */
export function safeGetNumber(obj: unknown, key: string, defaultValue: number = 0): number {
  const value = safeGet(obj, key, defaultValue);
  return typeof value === 'number' ? value : defaultValue;
}

/**
 * Safe property accessor for booleans
 */
export function safeGetBoolean(obj: unknown, key: string, defaultValue: boolean = false): boolean {
  const value = safeGet(obj, key, defaultValue);
  return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * Safe array accessor
 */
export function safeGetArray<T>(obj: unknown, key: string, defaultValue: T[] = []): T[] {
  const value = safeGet(obj, key, defaultValue);
  return Array.isArray(value) ? value : defaultValue;
}
