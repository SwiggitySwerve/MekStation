/**
 * InfantryPlatoonTab
 *
 * Alias / re-export of InfantryBuildTab under the canonical name required by
 * the per-type tab registry.  The `add-per-type-customizer-tabs` spec renames
 * "Build" to "Platoon" to match standard BattleTech infantry terminology
 * (platoon size, motive type, squads × troopers per squad).
 *
 * Future `add-infantry-construction` work should evolve InfantryBuildTab
 * directly; the alias avoids a breaking rename of the existing component.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §6.2
 */

export { InfantryBuildTab as InfantryPlatoonTab } from './InfantryBuildTab';
