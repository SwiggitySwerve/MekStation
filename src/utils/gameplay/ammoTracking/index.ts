export {
  initializeAmmoState,
  consumeAmmo,
  hasAmmoForWeapon,
  getTotalAmmo,
  getAmmoBinsAtLocation,
  findAvailableAmmoBin,
  selectRandomAmmoBin,
  normalizeAmmoWeaponType,
} from './state';
export {
  resolveAmmoExplosion,
  calculateCASEEffects,
  getCASEProtection,
  resolveGaussExplosion,
  getHeatAmmoExplosionTN,
  checkHeatAmmoExplosion,
} from './explosions';
export {
  applyAmmoExplosionRearArmorBlowout,
  caseProtectionForLocation,
  resolveCaseAdjustedAmmoExplosionDamage,
} from './caseProtection';
export { getFireableWeapons, isEnergyWeapon } from './weapons';
export type {
  CASEProtectionLevel,
  UnitCASEConfig,
  IAmmoConstructionData,
  IAmmoConsumeResult,
  IAmmoExplosionResult,
  IGaussExplosionResult,
} from './types';
