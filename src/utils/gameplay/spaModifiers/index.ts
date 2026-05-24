export {
  EDGE_TRIGGERS,
  canUseEdge,
  createEdgeState,
  useEdge,
} from './edgeTriggers';
export {
  calculateBloodStalkerModifier,
  calculateDodgeManeuverModifier,
  calculateFrogmanPhysicalToHitModifier,
  calculateJumpingJackModifier,
  calculateMeleeSpecialistModifier,
  calculateMultiTaskerModifier,
  getAnimalMimicryPSRModifier,
  getClusterHitterBonus,
  getCoolUnderFireHeatReduction,
  getEffectiveWounds,
  getHotDogShutdownThresholdBonus,
  getIronManModifier,
  getManeuveringAceSkidModifier,
  getMeleeMasterDamageBonus,
  getSomeLikeItHotHeatPenaltyReduction,
  getTacticalGeniusBonus,
} from './abilityModifiers';
export {
  calculateGunnerySpecialistModifier,
  calculateRangeMasterModifier,
  calculateSniperModifier,
  calculateWeaponSpecialistModifier,
} from './weaponSpecialists';
export {
  SPA_CATALOG,
  getConsciousnessCheckModifier,
  getObliqueAttackerBonus,
  getSharpshooterBonus,
  getSPAsByCategory,
  getSPACatalogSize,
  getSPAsForPipeline,
  hasSPA,
} from './catalog';
export {
  calculateAttackerSPAModifiers,
  populateAttackerDesignations,
} from './integration';
export type {
  EdgeTriggerType,
  IEdgeState,
  IEdgeUsage,
  ISPACatalogEntry,
  ISPAContext,
  SPACategory,
  SPAPipeline,
} from './types';
