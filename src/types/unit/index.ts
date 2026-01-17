/**
 * Unit Types Barrel Export
 * 
 * @spec openspec/specs/unit-entity-model/spec.md
 */

// Core unit interfaces
export * from './BattleMechInterfaces';

// Base unit hierarchy
export * from './BaseUnitInterfaces';

// Unit type-specific interfaces
export * from './VehicleInterfaces';
export * from './AerospaceInterfaces';
export * from './CapitalShipInterfaces';
export * from './PersonnelInterfaces';

// Unit type handler interface
export * from './UnitTypeHandler';

// Serialization and persistence
export * from './UnitSerialization';
export * from './DatabaseSchema';
export * from './DataIntegrity';

