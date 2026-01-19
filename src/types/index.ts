/**
 * Types Index
 * Main export barrel for all types
 * 
 * @spec openspec/specs/phase-1-foundation
 */

// Core types (spec-driven implementation)
export * from './core';

// Enums (spec-driven implementation)
export * from './enums';

// Construction types (spec-driven implementation)
export * from './construction';

// Equipment types (spec-driven implementation)
export * from './equipment';

// Validation types (spec-driven implementation)
export * from './validation';

// Unit types (spec-driven implementation)
export * from './unit';

// Temporal types - only export non-conflicting items
// (Era is already exported from enums)
export type { EraDefinition } from './temporal';

// Pilot types (spec-driven implementation)
export * from './pilot';

// Gameplay types (spec-driven implementation)
export * from './gameplay';
