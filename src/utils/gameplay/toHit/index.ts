export {
  ATTACKER_MOVEMENT_MODIFIERS,
  HEAT_THRESHOLDS,
  PROBABILITY_TABLE,
  RANGE_MODIFIERS,
} from './constants';
export {
  aggregateModifiers,
  formatToHitBreakdown,
  getProbability,
  simpleToHit,
} from './aggregation';
export { createBaseModifier } from './baseModifier';
export {
  calculateRangeModifier,
  calculateMinimumRangeModifier,
  getRangeModifierForBracket,
  getRangeBracket,
} from './rangeModifiers';
export {
  calculateAttackerMovementModifier,
  calculateTMM,
} from './movementModifiers';
export {
  calculateHeatModifier,
  calculatePartialCoverModifier,
  calculateHullDownModifier,
  calculateInterveningTerrainModifier,
  calculateTargetTerrainModifier,
  calculateTargetTerrainModifierFromHex,
  getTerrainToHitModifier,
} from './environmentModifiers';
export { calculateTargetingComputerModifier } from './equipmentModifiers';
export {
  calculateProneModifier,
  calculateImmobileModifier,
  calculatePilotWoundModifier,
  calculateSecondaryTargetModifier,
  calculateSensorDamageModifier,
  calculateActuatorDamageModifier,
  calculateAttackerProneModifier,
  calculateIndirectFireModifier,
  calculateCalledShotModifier,
} from './damageModifiers';
export {
  calculateToHit,
  calculateToHitFromContext,
  type IEcmContext,
} from './calculate';
export { calculateToHitWithC3 } from './c3';
export type { IC3ToHitInput } from './c3';

// Per `add-ecm-tohit-modifier` (closes playtest gap #1).
export {
  calculateEcmModifier,
  ECM_TO_HIT_MODIFIERS,
  ECM_MODIFIER_VALUE,
  type EcmModifierReason,
  type IEcmCoverageState,
  type WeaponGuidanceType,
} from './ecmModifier';

export {
  buildToHitForecast,
  expectedHitsTotal,
  getTwoD6HitProbability,
  TWO_D6_HIT_PROBABILITY,
  type IWeaponForecastRow,
  type IForecastInput,
} from './forecast';

export {
  critProbability,
  previewAttackOutcome,
  ZERO_PREVIEW,
  type IAttackPreview,
  type IAttackPreviewInput,
  type ICritProbabilityOptions,
} from './preview';
