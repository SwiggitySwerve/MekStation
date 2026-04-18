/**
 * ProtoMech Customizer Components
 *
 * Exports all ProtoMech customizer components.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

// Main customizer
export { ProtoMechCustomizer } from './ProtoMechCustomizer';
export type { ProtoMechTabId } from './ProtoMechCustomizer';

// Individual tabs (existing)
export { ProtoMechStructureTab } from './ProtoMechStructureTab';

// Placeholder tabs (wired by add-protomech-construction)
export { ProtoMechArmorTab } from './ProtoMechArmorTab';
export { ProtoMechMainGunTab } from './ProtoMechMainGunTab';
export { ProtoMechEquipmentTab } from './ProtoMechEquipmentTab';
export { ProtoMechGliderTab } from './ProtoMechGliderTab';
