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

// Award types
export * from './award';

// Campaign types - use namespace to avoid ISpecialAbility conflict with pilot
export * as campaign from './campaign';

// Encounter types - use namespace to avoid IScenarioTemplate conflict with gameplay
export * as encounter from './encounter';

// Events types
export * from './events';

// Force types
export * from './force';

// Formats types
export * from './formats';

// Pages types
export * from './pages';

// Persistence types - use namespace to avoid ISerializedUnitEnvelope conflict with unit
export * as persistence from './persistence';

// Printing types
export * from './printing';

// Quick Game types
export * from './quickgame';

// Repair types - use namespace to avoid UnitLocation and ILocationDamage conflicts
export * as repair from './repair';

// Scenario types - use namespace to avoid ITerrainFeature conflict with gameplay
export * as scenario from './scenario';

// Simulation Viewer types
export * from './simulation-viewer';

// Vault types
export * from './vault';
