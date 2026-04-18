/**
 * Shared Customizer Components
 *
 * Common components used across the customizer.
 *
 * @spec openspec/specs/color-system/spec.md
 * @spec openspec/specs/unit-info-banner/spec.md
 */

export { ColorLegend } from './ColorLegend';
export { ValidationBadge } from './ValidationBadge';
export { UnitInfoBanner } from './UnitInfoBanner';
export type { UnitStats } from './UnitInfoBanner';
export { StatCell } from './StatCell';
export { TechBaseBadge } from './TechBaseBadge';
export {
  TechBaseConfiguration,
  DEFAULT_COMPONENT_VALUES,
} from './TechBaseConfiguration';
export type { IComponentValues } from './TechBaseConfiguration';
export { GlobalStatusBar } from './GlobalStatusBar';
export type { StatusBarStats } from './GlobalStatusBar';

// Tab registry infrastructure (add-per-type-customizer-tabs)
export type { TabSpec, TabPanelBaseProps } from './TabSpec';
export { filterVisibleTabs, toCustomizerTabConfigs } from './TabSpec';
export {
  MECH_TABS,
  VEHICLE_TABS,
  AEROSPACE_TABS,
  BATTLE_ARMOR_TABS,
  INFANTRY_TABS,
  PROTOMECH_TABS,
  getTabSpecsForUnitType,
} from './tabRegistry';
