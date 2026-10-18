/**
 * Swarm Aggregation — Internal accumulator helpers (Phase 6).
 *
 * Extracted into a leaf module so the main `swarmAggregation.ts` entry point
 * stays under the 400-line max-lines lint cap. Functions here are private to
 * the aggregation pipeline (not re-exported from `metrics/index.ts`).
 */

/** Public compatibility facade; implementations are split by responsibility. */
export type {
  MutableChassisMatchup,
  MutableGunneryBracketAcc,
  MutableAIVariantAcc,
  MutablePilotAcc,
  MutableUnitPerformanceAcc,
} from './swarmAccumulatorTypes';
export {
  getGunneryBracket,
  canonicalVariantPairKey,
  isSynthesizedPilot,
  ensureKey,
  winningSideId,
  groupBySide,
  initGunneryBrackets,
} from './swarmAccumulatorHelpers';
export {
  accumulateBaseRollups,
  accumulateChassisMatrix,
} from './swarmCombatRollups';
export {
  accumulateGunneryBracket,
  accumulateAIVariantHeadToHead,
  accumulatePilotPerformance,
} from './swarmParticipantRollups';
