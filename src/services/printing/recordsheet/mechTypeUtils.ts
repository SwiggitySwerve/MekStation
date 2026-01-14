/**
 * Mech Type Utilities
 * 
 * Helper functions for determining mech configuration types.
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

/**
 * Get mech type from configuration
 */
export function getMechType(configuration: string): 'biped' | 'quad' | 'tripod' | 'lam' | 'quadvee' {
  const config = configuration.toLowerCase();
  if (config.includes('quad')) return 'quad';
  if (config.includes('tripod')) return 'tripod';
  if (config.includes('lam')) return 'lam';
  if (config.includes('quadvee')) return 'quadvee';
  return 'biped';
}

/**
 * Get the critical slot locations for a specific mech type
 */
export function getCriticalLocationsForMechType(mechType: string): MechLocation[] {
  switch (mechType) {
    case 'quad':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case 'tripod':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case 'biped':
    case 'lam':
    case 'quadvee':
    default:
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}
