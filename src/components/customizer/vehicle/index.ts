/**
 * Vehicle Customizer Components
 *
 * Exports all vehicle customizer tab components and utilities.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3
 */

// Main customizer
export { VehicleCustomizer } from './VehicleCustomizer';
export type { VehicleTabId } from './VehicleCustomizer';

// Individual tabs
export { VehicleStructureTab } from './VehicleStructureTab';
export { VehicleArmorTab } from './VehicleArmorTab';
export { VehicleEquipmentTab } from './VehicleEquipmentTab';
export { VehicleTurretTab } from './VehicleTurretTab';

// Utility components
export { VehicleDiagram } from './VehicleDiagram';
export { VehicleStatusBar } from './VehicleStatusBar';
