/**
 * Weapons Barrel Export
 *
 * Central export for all weapon types and utilities.
 *
 * @spec openspec/specs/weapon-system/spec.md
 */

// Interfaces and Enums
export * from './interfaces';

// Energy Weapons
export * from './EnergyWeapons';

// Ballistic Weapons
export * from './BallisticWeapons';

// Missile Weapons
export * from './MissileWeapons';

// Utilities (relocated to src/utils/equipment/weapons/utilities.ts because
// they pull a runtime import — getEquipmentLoader — that does not belong in
// the type layer. Re-exported here for backward compatibility with existing
// importers that still use `@/types/equipment/weapons` as the import root.)
export * from '@/utils/equipment/weapons/utilities';
