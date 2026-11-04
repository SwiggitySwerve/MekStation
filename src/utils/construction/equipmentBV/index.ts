/**
 * Equipment BV Resolver - Barrel Export
 *
 * Public API for equipment BV resolution and catalog access.
 */

export type {
  AmmoBVResult,
  EquipmentBVResult,
  EquipmentCatalogEntry,
} from './types';

export {
  getArtemisBVMultiplier,
  getWeaponLinkBVMultiplier,
  getLargeAerospaceAmmoEntry,
  resolveEquipmentBV,
  getEquipmentEntry,
  getAmmunitionEntry,
  getAmmunitionWeightEntry,
  isResolvable,
  resolveAmmoBV,
  getCatalogSize,
} from './resolution';

export { normalizeEquipmentId } from './normalization';

export { resetCatalogCache, initializeCatalog } from './catalogLoader';
