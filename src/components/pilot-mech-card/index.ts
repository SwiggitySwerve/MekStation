/**
 * Pilot-Mech Card Components
 *
 * Unified character sheet view combining pilot and mech information.
 *
 * Components:
 * - PilotMechCard: Main component with variant selection
 * - PilotMechCardCompact: Single-row list view
 * - PilotMechCardStandard: Two-column detail view
 * - PilotMechCardGameplay: Active game variant
 * - PilotSection: Pilot information display
 * - MechSection: Mech information display
 * - EffectiveStatsSection: Combat stats display
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

export {
  PilotMechCard,
  PilotMechCardCompact,
  PilotMechCardStandard,
  PilotMechCardGameplay,
} from './PilotMechCard';
export type { PilotMechCardProps } from './PilotMechCard';

export { PilotSection } from './PilotSection';
export type { PilotSectionProps } from './PilotSection';

export { MechSection } from './MechSection';
export type { MechSectionProps } from './MechSection';

export { EffectiveStatsSection } from './EffectiveStatsSection';
export type { EffectiveStatsSectionProps } from './EffectiveStatsSection';
