/**
 * Battle Armor Customizer Components
 *
 * Exports all Battle Armor customizer components.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1
 */

// Main customizer
export { BattleArmorCustomizer } from "./BattleArmorCustomizer";
export type { BattleArmorTabId } from "./BattleArmorCustomizer";

// Individual tabs (existing)
export { BattleArmorStructureTab } from "./BattleArmorStructureTab";
export { BattleArmorSquadTab } from "./BattleArmorSquadTab";

// Canonical alias (Structure → Chassis rename per per-type-customizer-tabs spec)
export { BattleArmorChassisTab } from "./BattleArmorChassisTab";

// Placeholder tabs (wired by add-battlearmor-construction)
export { BattleArmorManipulatorsTab } from "./BattleArmorManipulatorsTab";
export { BattleArmorModularWeaponsTab } from "./BattleArmorModularWeaponsTab";
export { BattleArmorAPWeaponsTab } from "./BattleArmorAPWeaponsTab";
export { BattleArmorJumpUMUTab } from "./BattleArmorJumpUMUTab";

// Utility components
export { BattleArmorDiagram } from "./BattleArmorDiagram";
