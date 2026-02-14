export { isHardenedArmor, isFerroLamellorArmor, halveCritCount } from './armor';
export { rollCriticalHits, selectCriticalSlot } from './selection';
export {
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
} from './manifest';
export {
  applyCriticalHitEffect,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './effects';
export { resolveCriticalHits, checkTACTrigger, processTAC } from './resolver';

export type {
  CriticalSlotComponentType,
  ICriticalSlotEntry,
  CriticalSlotManifest,
  ICriticalHitDeterminationResult,
  ICriticalHitApplicationResult,
  ICriticalResolutionResult,
  CriticalHitEvent,
} from './types';
