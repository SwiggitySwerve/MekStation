/**
 * Miscellaneous Equipment Alias Utilities
 * 
 * Provides alias generation for miscellaneous equipment.
 * Handles heat sinks, jump jets, and other misc equipment variations.
 * 
 * @module services/equipment/aliasUtils.misc
 */

import { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';

/**
 * Add aliases for miscellaneous equipment
 */
export function addMiscEquipmentAliases(
  equipment: IMiscEquipment,
  nameToIdMap: Map<string, string>
): void {
  const name = equipment.name;
  
  // Handle heat sink variations
  if (name === 'Heat Sink' || name === 'Double Heat Sink') {
    nameToIdMap.set('Single Heat Sink', 'single-heat-sink');
    nameToIdMap.set('Single', 'single-heat-sink');
    nameToIdMap.set('Double', 'double-heat-sink');
    nameToIdMap.set('DHS', 'double-heat-sink');
  }
  
  // Handle jump jet variations
  if (name.includes('Jump Jet')) {
    nameToIdMap.set('Jump Jet', 'jump-jet-medium');
    nameToIdMap.set('Jump Jets', 'jump-jet-medium');
  }
}
