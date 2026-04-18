/**
 * BattleArmorChassisTab
 *
 * Alias / re-export of BattleArmorStructureTab under the canonical name
 * required by the per-type tab registry.  The `add-per-type-customizer-tabs`
 * spec renames the "Structure" concept to "Chassis" for Battle Armor units to
 * match BattleTech terminology (BA chassis ≠ mech structure).
 *
 * Future `add-battlearmor-construction` work should evolve this component
 * directly; the alias approach avoids a breaking rename of the existing tab.
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/tasks.md §5.2
 */

export { BattleArmorStructureTab as BattleArmorChassisTab } from './BattleArmorStructureTab';
