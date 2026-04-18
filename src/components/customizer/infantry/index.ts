/**
 * Infantry Customizer Components
 *
 * Exports all Infantry customizer components.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

// Main customizer
export { InfantryCustomizer } from './InfantryCustomizer';
export type { InfantryTabId } from './InfantryCustomizer';

// Individual tabs (existing)
export { InfantryBuildTab } from './InfantryBuildTab';

// Canonical alias (Build → Platoon rename per per-type-customizer-tabs spec)
export { InfantryPlatoonTab } from './InfantryPlatoonTab';

// Placeholder tabs (wired by add-infantry-construction)
export { InfantryPrimaryWeaponTab } from './InfantryPrimaryWeaponTab';
export { InfantrySecondaryWeaponsTab } from './InfantrySecondaryWeaponsTab';
export { InfantryFieldGunsTab } from './InfantryFieldGunsTab';
export { InfantrySpecializationTab } from './InfantrySpecializationTab';
