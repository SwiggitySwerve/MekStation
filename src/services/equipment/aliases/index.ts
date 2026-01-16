/**
 * Alias Utilities
 *
 * Barrel export for all alias utility modules.
 * Provides alias generation for equipment name resolution.
 *
 * @module services/equipment/aliases
 */

export { addAmmunitionAliases, addAmmunitionSlugAliases } from './ammunition';
export { parseLegacyMegaMekId, convertMegaMekNameToSlug } from './legacy';
export { addMiscEquipmentAliases } from './misc';
export { addStaticAliasMappings } from './static';
export { addCommonWeaponAliases, addWeaponSlugAliases } from './weapon';
