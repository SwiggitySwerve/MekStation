/**
 * Ammo Tracking Module (Facade)
 * Re-exports from focused subdirectory modules.
 *
 * @spec openspec/changes/full-combat-parity/specs/ammo-tracking/spec.md
 * @spec openspec/changes/full-combat-parity/specs/ammo-explosion-system/spec.md
 */

export {
  initializeAmmoState,
  consumeAmmo,
  hasAmmoForWeapon,
  getTotalAmmo,
  getAmmoBinsAtLocation,
  findAvailableAmmoBin,
  selectRandomAmmoBin,
  normalizeAmmoWeaponType,
} from './ammoTracking/state';
export {
  resolveAmmoExplosion,
  calculateCASEEffects,
  getCASEProtection,
  resolveGaussExplosion,
  getHeatAmmoExplosionTN,
  checkHeatAmmoExplosion,
} from './ammoTracking/explosions';
export {
  applyAmmoExplosionRearArmorBlowout,
  caseProtectionForLocation,
  resolveCaseAdjustedAmmoExplosionDamage,
} from './ammoTracking/caseProtection';
export { getFireableWeapons, isEnergyWeapon } from './ammoTracking/weapons';
export type {
  CASEProtectionLevel,
  UnitCASEConfig,
  IAmmoConstructionData,
  IAmmoConsumeResult,
  IAmmoExplosionResult,
  IGaussExplosionResult,
} from './ammoTracking/types';
