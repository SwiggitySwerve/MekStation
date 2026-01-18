/**
 * Core Types barrel export
 * Central export point for all core interfaces.
 * 
 * @spec core-entity-types/spec.md
 */

// Base entity interfaces
export * from './IEntity';
export * from './ITechBaseEntity';
export * from './IWeightedComponent';
export * from './ISlottedComponent';
export * from './IPlaceableComponent';
export * from './IValuedComponent';
export * from './ITemporalEntity';
export * from './IDocumentedEntity';

// Re-export enums for convenience
export * from '../enums';

// Legacy compatibility - keep old BaseTypes exports working
export { TechBase } from '../enums/TechBase';
export { RulesLevel } from '../enums/RulesLevel';
export { Era } from '../enums/Era';
export { WeightClass } from '../enums/WeightClass';

// Legacy type aliases for backward compatibility
export type EntityId = string;

// Result type for operations
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: Error): Result<T> {
  return { success: false, error };
}

// Severity levels
export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Component Category (legacy compatibility)
export enum ComponentCategory {
  CHASSIS = 'chassis',
  ENGINE = 'engine',
  GYRO = 'gyro',
  COCKPIT = 'cockpit',
  STRUCTURE = 'structure',
  ARMOR = 'armor',
  HEAT_SINK = 'heatsink',
  MYOMER = 'myomer',
  TARGETING = 'targeting',
  MOVEMENT = 'movement',
  WEAPON = 'weapon',
  AMMO = 'ammo',
  EQUIPMENT = 'equipment',
}

// Observable service interface (legacy)
export interface IObservableService {
  subscribe(listener: (event: IServiceEvent) => void): () => void;
  unsubscribe(listener: (event: IServiceEvent) => void): void;
}

export interface IService {
  readonly serviceName: string;
  readonly version: string;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Service event with typed data payload.
 * 
 * @template TData - The type of the event data payload (defaults to object for flexibility)
 * 
 * @example
 * ```typescript
 * interface ValidationCompleteData {
 *   isValid: boolean;
 *   errorCount: number;
 * }
 * const event: IServiceEvent<ValidationCompleteData> = {
 *   type: 'validation:complete',
 *   timestamp: new Date(),
 *   data: { isValid: true, errorCount: 0 }
 * };
 * ```
 */
export interface IServiceEvent<TData extends object = object> {
  type: string;
  timestamp: Date;
  data?: TData;
}
