/**
 * Force Components
 *
 * Components for force management and building.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

export { ForceBuilder } from './ForceBuilder';
export type { ForceBuilderProps } from './ForceBuilder';

export { AssignmentSlot } from './AssignmentSlot';
export type { AssignmentSlotProps } from './AssignmentSlot';

export { PilotSelector } from './PilotSelector';
export type { PilotSelectorProps } from './PilotSelector';

export { UnitSelector } from './UnitSelector';
export type { UnitSelectorProps, UnitInfo } from './UnitSelector';

export { ForceCard } from './ForceCard';
export type { ForceCardProps } from './ForceCard';

// Re-export PilotMechCard components for force roster integration
export {
  PilotMechCard,
  PilotMechCardCompact,
} from '@/components/pilot-mech-card';
