// Import all physical weapons from separate files
export * from './melee-weapons';
export * from './specialized-weapons';

// Import all physical weapon constants
import {
  SWORD,
  MACE,
  HATCHET,
  LANCE,
  CHAIN_WHIP,
  FLAIL,
  RETRACTABLE_BLADE,
  VIBROBLADE,
  TALON,
  SPIKES,
  CLUB,
  CHAINSAW
} from './melee-weapons';

import {
  PROTOMECH_QUAD_MELEE,
  CLAWS,
  COMBINE_HARVESTER
} from './specialized-weapons';

// Re-export all physical weapons in a single array
export const PHYSICAL_WEAPONS = [
  // Melee Weapons
  SWORD,
  MACE,
  HATCHET,
  LANCE,
  CHAIN_WHIP,
  FLAIL,
  RETRACTABLE_BLADE,
  VIBROBLADE,
  TALON,
  SPIKES,
  CLUB,
  CHAINSAW,
  // Specialized Weapons
  PROTOMECH_QUAD_MELEE,
  CLAWS,
  COMBINE_HARVESTER
]; 