/** Public compatibility facade; implementations are split by responsibility. */
export type {
  OffensiveBVConfig,
  OffensiveBVResult,
} from './battleValueOffensiveTypes';
export { calculateAmmoBVWithExcessiveCap } from './battleValueAmmo';
export { calculateOffensiveBVWithHeatTracking } from './battleValueHeatTracking';
export {
  getWeaponBV,
  getWeaponHeat,
  calculateOffensiveBV,
} from './battleValueWeapons';
