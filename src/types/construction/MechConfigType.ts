/**
 * Mech Configuration Type
 *
 * Defines the structural configuration types for BattleMechs.
 * Extracted from components to support domain logic in utils layer.
 */

/**
 * Mech configuration types for layout selection
 */
export type MechConfigType = 'biped' | 'quad' | 'tripod' | 'lam' | 'quadvee';

/**
 * Display names for mech configurations
 */
export const MECH_CONFIG_DISPLAY_NAMES: Record<MechConfigType, string> = {
  biped: 'Biped',
  quad: 'Quad',
  tripod: 'Tripod',
  lam: 'LAM',
  quadvee: 'QuadVee',
};
