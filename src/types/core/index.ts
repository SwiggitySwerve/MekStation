/**
 * Legacy compatibility barrel that re-exports the new canonical type system.
 * Importing from `../types/core` will continue to work while we migrate
 * call sites to the modern modules.
 */

export * from '../index';
export * from './BaseTypes';
export * from './ApplicationTypes';
export * from './CalculationInterfaces';
export * from './ComponentDatabase';
export * from './ComponentInterfaces';
export * from './ComponentPlacement';
export * from './DynamicDataTypes';
export * from './EquipmentInterfaces';
export * from './TechBase';
export * from './UnitInterfaces';
export * from './ValidationInterfaces';


