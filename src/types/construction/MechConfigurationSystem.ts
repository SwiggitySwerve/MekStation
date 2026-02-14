/**
 * Mech Configuration System - Barrel Re-export
 *
 * Split into focused modules. All exports maintained for backward compatibility.
 *
 * @spec openspec/specs/mech-configuration-system/spec.md
 */

export * from './MechConfigTypes';
export * from './mechConfigHelpers';
export { BIPED_CONFIGURATION } from './bipedConfig';
export { QUAD_CONFIGURATION } from './quadConfig';
export { TRIPOD_CONFIGURATION } from './tripodConfig';
export { LAM_EQUIPMENT, LAM_CONFIGURATION } from './lamConfig';
export { QUADVEE_EQUIPMENT, QUADVEE_CONFIGURATION } from './quadVeeConfig';
export { configurationRegistry } from './mechConfigRegistry';
export type { MechConfigurationRegistry } from './mechConfigRegistry';
