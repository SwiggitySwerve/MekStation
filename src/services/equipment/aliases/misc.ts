/**
 * Miscellaneous Equipment Alias Utilities
 *
 * Provides alias generation for miscellaneous equipment.
 * Handles heat sinks, jump jets, and other misc equipment variations.
 *
 * @module services/equipment/aliases/misc
 */

import { TechBase } from '@/types/enums/TechBase';
import { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';

/**
 * Add aliases for miscellaneous equipment
 */
export function addMiscEquipmentAliases(
  equipment: IMiscEquipment,
  nameToIdMap: Map<string, string>,
): void {
  const name = equipment.name;

  // MiscType.java:2248-2305 (48fcb2f64): each factory owns its native aliases.
  if (equipment.variableEquipmentId === 'partial-wing') {
    const aliases =
      equipment.techBase === TechBase.CLAN
        ? ['CLPartialWing', 'Clan Partial Wing', 'Partial Wing (Clan)']
        : ['ISPartialWing', 'IS Partial Wing', 'PartialWing'];
    for (const alias of aliases) nameToIdMap.set(alias, equipment.id);
  }

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
