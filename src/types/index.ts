/**
 * Root barrel file that exposes the unified BattleTech type system.
 * UI code should import exclusively from this module to avoid reaching
 * into legacy directories.
 */

export * from './TechBase';
export * from './ComponentType';
export * from './Equipment';
export * from './SystemComponents';
export * from './BattleMech';
export * from './Unit';
export * from './Editor';
export * from './Validation';
export * from './Display';
export * from './adapters';
export * from './ComponentConfiguration';
export * from './CriticalSlots';
export * from './ComponentDatabase';
export * from './Armor';


