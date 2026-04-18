/**
 * Aerospace Customizer Components
 *
 * Exports all aerospace customizer tab components and utilities.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4
 */

// Main customizer
export { AerospaceCustomizer } from './AerospaceCustomizer';
export type { AerospaceTabId } from './AerospaceCustomizer';

// Individual tabs (existing)
export { AerospaceStructureTab } from './AerospaceStructureTab';
export { AerospaceArmorTab } from './AerospaceArmorTab';
export { AerospaceEquipmentTab } from './AerospaceEquipmentTab';

// Placeholder tabs (wired by add-aerospace-construction)
export { AerospaceVelocityTab } from './AerospaceVelocityTab';
export { AerospaceBombTab } from './AerospaceBombTab';

// Utility components
export { AerospaceDiagram } from './AerospaceDiagram';
export { AerospaceStatusBar } from './AerospaceStatusBar';
