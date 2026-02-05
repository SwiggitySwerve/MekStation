/**
 * Core Types barrel export
 * Central export point for all core interfaces.
 *
 * @spec core-entity-types/spec.md
 */

// Base entity interfaces
export * from './IIdentifiable';
export * from './IEntity';
export * from './ITechBaseEntity';
export * from './IPlaceableComponent';
export * from './IValuedComponent';
export * from './ITemporalEntity';
export * from './IDocumentedEntity';

// Generic type utilities and interfaces
export * from './typeGuardFactory';
export * from './IStatusTrackable';

// Re-export enums for convenience
export * from '../enums';

// Legacy type aliases for backward compatibility
export type EntityId = string;

// Severity levels
export * from './Severity';

// Component Category (legacy compatibility)
export * from './ComponentCategory';
