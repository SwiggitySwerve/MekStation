/**
 * Gameplay-specific hooks barrel export.
 *
 * These hooks project session state into typed surfaces consumed by the
 * tactical command shell and its slot owners (TacticalTurnRail, etc.).
 *
 * @see src/hooks/gameplay/usePhaseQueueProjection.ts
 * @see src/hooks/gameplay/useActivationFocusRequest.ts
 */

export { usePhaseQueueProjection } from './usePhaseQueueProjection';
export type {
  IPhaseBlocker,
  IPhaseQueueProjection,
} from './usePhaseQueueProjection';

export { useActivationFocusRequest } from './useActivationFocusRequest';
export type { IFocusRequest } from './useActivationFocusRequest';
