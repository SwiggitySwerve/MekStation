export { KeyMomentDetector } from './KeyMomentDetector';

export type { BattleUnit, BattleState, DetectorTrackingState } from './types';

// Audit 2026-06-09 G (W5.1b): the detector-local payload duplicates were
// removed in favor of the canonical event payload types. Re-exported here so
// existing consumers of this module keep a single import surface.
export type {
  IAttackResolvedPayload,
  IAmmoExplosionPayload,
  ICriticalHitPayload,
  IHeatEffectAppliedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
