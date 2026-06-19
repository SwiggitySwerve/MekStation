/**
 * Combat Interfaces
 * Compatibility barrel for combat type modules.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

export { MechLocation } from '../construction/CriticalSlotAllocation';
export { WeaponCategory } from '../equipment/weapons/interfaces';
export type { CombatLocation } from './CombatLocationTypes';
export * from './CombatAttackTypes';
export * from './CombatDamageTypes';
export * from './CombatContextTypes';
