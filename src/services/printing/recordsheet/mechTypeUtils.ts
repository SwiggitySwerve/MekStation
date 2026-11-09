/**
 * Mech Type Utilities
 *
 * Helper functions for determining mech configuration types.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getLocationsForMechType } from '@/utils/mech/mechLocationRegistry';

/**
 * Get mech type from configuration
 */
export function getMechType(
  configuration: string,
): 'biped' | 'quad' | 'tripod' | 'lam' | 'quadvee' {
  const config = configuration.toLowerCase();
  // MML PrintMek.java:112-131 tests the QuadVee flag before the Quad flag.
  if (config.includes('quadvee')) return 'quadvee';
  if (config.includes('quad')) return 'quad';
  if (config.includes('tripod')) return 'tripod';
  if (config.includes('lam')) return 'lam';
  return 'biped';
}

/**
 * Get the critical slot locations for a specific mech type
 */
export function getCriticalLocationsForMechType(
  mechType: string,
): MechLocation[] {
  return getLocationsForMechType(mechType);
}
