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
  calculateGroundObjectLiftCapacity,
  calculateJumpingJackModifier,
  calculateMeleeSpecialistModifier,
  calculateMultiTaskerModifier,
  calculateShakyStickModifier,
  calculateTerrainMasterDefensiveToHitModifier,
  getAnimalMimicryPSRModifier,
  getClusterHitterBonus,
  getCoolUnderFireHeatReduction,
  getEffectiveWounds,
  getFrogmanWaterPSRModifier,
  getHeavyLifterGroundObjectLiftMultiplier,
  getHotDogHeatTargetNumberModifier,
  getIronManModifier,
  getManeuveringAceSkidModifier,
  getMeleeMasterDamageBonus,
  getMeleeSpecialistDamageBonus,
  getMountaineerRubblePSRModifier,
  getSomeLikeItHotHeatPenaltyReduction,
  getSwampBeastBogDownPSRModifier,
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
