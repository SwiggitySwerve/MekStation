export {
  isHardenedArmor,
  isFerroLamellorArmor,
  halveCritCount,
} from './criticalHitResolutionArmor';
export {
  rollCriticalHits,
  selectCriticalSlot,
} from './criticalHitResolutionSelection';
export {
  buildDefaultCriticalSlotManifest,
  buildCriticalSlotManifest,
} from './criticalHitResolutionManifest';
export {
  applyCriticalHitEffect,
  getActuatorToHitModifier,
  actuatorPreventsAttack,
  actuatorHalvesDamage,
} from './criticalHitResolutionEffects';
export {
  resolveCriticalHits,
  checkTACTrigger,
  processTAC,
} from './criticalHitResolutionResolver';

export type {
  CriticalSlotComponentType,
  ICriticalSlotEntry,
  CriticalSlotManifest,
  ICriticalHitDeterminationResult,
  ICriticalHitApplicationResult,
  ICriticalResolutionResult,
  CriticalHitEvent,
} from './criticalHitResolutionTypes';
