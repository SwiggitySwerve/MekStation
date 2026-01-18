/**
 * Unit Card Components
 * 
 * Three levels of detail for displaying BattleTech unit information:
 * - UnitCardCompact: Minimal info for list views
 * - UnitCardStandard: Full combat details
 * - UnitCardExpanded: Complete equipment and fluff
 */

export { UnitCardCompact } from './UnitCardCompact';
export type { UnitCardCompactProps } from './UnitCardCompact';

export { UnitCardStandard } from './UnitCardStandard';
export type { UnitCardStandardProps, WeaponEntry } from './UnitCardStandard';

export { UnitCardExpanded } from './UnitCardExpanded';
export type { 
  UnitCardExpandedProps, 
  EquipmentEntry, 
  CriticalSlotSummary 
} from './UnitCardExpanded';

export { useUnitCardActions } from './useUnitCardActions';
export type { UseUnitCardActionsOptions, UnitCardActions } from './useUnitCardActions';
