export {
  UNIT_QUIRK_IDS,
  WEAPON_QUIRK_IDS,
  QUIRK_CATALOG,
  getQuirkCatalogSize,
  getQuirksForPipeline,
  getQuirksByCategory,
} from './catalog';
export type { QuirkCategory, QuirkPipeline, IQuirkCatalogEntry } from './types';
export {
  calculateTargetingQuirkModifier,
  calculateDistractingModifier,
  hasLowProfile,
  calculateLowProfileModifier,
  isLowProfileGlancingBlow,
  applyLowProfileGlancingDamage,
  getLowProfileGlancingCriticalHitModifier,
} from './targetingQuirks';
export { calculatePilotingQuirkPSRModifier } from './pilotingQuirks';
export {
  calculateAccurateWeaponModifier,
  calculateInaccurateWeaponModifier,
  calculateStableWeaponModifier,
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
  parseWeaponQuirksFromMTF,
  parseWeaponQuirksFromBLK,
} from './weaponQuirks';
export {
  getBattleFistPunchToHitModifier,
  hasNoArms,
  isLowArmsRestricted,
  calculateInitiativeQuirkModifier,
  calculateSensorGhostsModifier,
  calculateMultiTracModifier,
  getRuggedMaintenanceMultiplier,
  getAntiMekActuatorTargetModifier,
} from './defensiveQuirks';
export { calculateAttackerQuirkModifiers, hasQuirk } from './aggregation';
