/**
 * Constants and configuration for SVG Record Sheet Renderer
 * Contains MegaMek template element IDs and pip group mappings
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';

// Base path for pip SVG files
export const PIPS_BASE_PATH = '/record-sheets/biped_pips';

// MegaMek template element IDs
export const ELEMENT_IDS = {
  // 'MECH DATA section
  TYPE: 'type',
  TONNAGE: 'tonnage',
  TECH_BASE: 'techBase',
  RULES_LEVEL: 'rulesLevel',
  ROLE: 'role',
  ENGINE_TYPE: 'engineType',

  // Movement section
  WALK_MP: 'mpWalk',
  RUN_MP: 'mpRun',
  JUMP_MP: 'mpJump',

  // Equipment/Inventory area
  INVENTORY: 'inventory',

  // Battle value
  BV: 'bv',

  // Armor
  ARMOR_TYPE: 'armorType',
  STRUCTURE_TYPE: 'structureType',
  CANON_ARMOR_PIPS: 'canonArmorPips',
  ARMOR_PIPS: 'armorPips',

  // Structure (Internal Structure)
  CANON_STRUCTURE_PIPS: 'canonStructurePips',
  STRUCTURE_PIPS: 'structurePips',

  // Warrior data
  PILOT_NAME: 'pilotName0',
  GUNNERY_SKILL: 'gunnerySkill0',
  PILOTING_SKILL: 'pilotingSkill0',

  // Heat
  HEAT_SINK_TYPE: 'hsType',
  HEAT_SINK_COUNT: 'hsCount',
} as const;

// Armor text label IDs (for displaying armor point values around the diagram)
export const ARMOR_TEXT_IDS: Record<string, string> = {
  HD: 'textArmor_HD',
  CT: 'textArmor_CT',
  CTR: 'textArmor_CTR', // Center Torso Rear
  LT: 'textArmor_LT',
  LTR: 'textArmor_LTR', // Left Torso Rear
  RT: 'textArmor_RT',
  RTR: 'textArmor_RTR', // Right Torso Rear
  LA: 'textArmor_LA',
  RA: 'textArmor_RA',
  LL: 'textArmor_LL',
  RL: 'textArmor_RL',
  // Quad leg locations
  FLL: 'textArmor_FLL',
  FRL: 'textArmor_FRL',
  RLL: 'textArmor_RLL',
  RRL: 'textArmor_RRL',
  // Tripod center leg
  CL: 'textArmor_CL',
};

// Structure text label IDs (for displaying IS point values)
// Note: Head (HD) doesn't have a text element in the template - it's always 3 IS points
export const STRUCTURE_TEXT_IDS: Record<string, string> = {
  CT: 'textIS_CT',
  LT: 'textIS_LT',
  RT: 'textIS_RT',
  LA: 'textIS_LA',
  RA: 'textIS_RA',
  LL: 'textIS_LL',
  RL: 'textIS_RL',
  // Quad leg locations
  FLL: 'textIS_FLL',
  FRL: 'textIS_FRL',
  RLL: 'textIS_RLL',
  RRL: 'textIS_RRL',
  // Tripod center leg
  CL: 'textIS_CL',
};

// Structure pip group IDs (embedded pip templates in SVG) - Biped
export const BIPED_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'isPipsHD',
  CT: 'isPipsCT',
  LT: 'isPipsLT',
  RT: 'isPipsRT',
  LA: 'isPipsLA',
  RA: 'isPipsRA',
  LL: 'isPipsLL',
  RL: 'isPipsRL',
};

// Structure pip group IDs for Quad mechs
export const QUAD_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'isPipsHD',
  CT: 'isPipsCT',
  LT: 'isPipsLT',
  RT: 'isPipsRT',
  FLL: 'isPipsFLL',
  FRL: 'isPipsFRL',
  RLL: 'isPipsRLL',
  RRL: 'isPipsRRL',
};

// Structure pip group IDs for Tripod mechs
export const TRIPOD_STRUCTURE_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'isPipsHD',
  CT: 'isPipsCT',
  LT: 'isPipsLT',
  RT: 'isPipsRT',
  LA: 'isPipsLA',
  RA: 'isPipsRA',
  LL: 'isPipsLL',
  RL: 'isPipsRL',
  CL: 'isPipsCL', // Center Leg (tripod-specific)
};

// Legacy alias for backward compatibility
export const STRUCTURE_PIP_GROUP_IDS = BIPED_STRUCTURE_PIP_GROUP_IDS;

// Map from our location abbreviations to MegaMek pip file location names (for biped)
export const LOCATION_TO_PIP_NAME: Record<string, string> = {
  HD: 'Head',
  CT: 'CT',
  LT: 'LT',
  RT: 'RT',
  LA: 'LArm',
  RA: 'RArm',
  LL: 'LLeg',
  RL: 'RLeg',
};

// Map from location abbreviations to template group IDs for armor pips

// Biped armor pip group IDs
export const BIPED_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'armorPipsHD',
  CT: 'armorPipsCT',
  LT: 'armorPipsLT',
  RT: 'armorPipsRT',
  LA: 'armorPipsLA',
  RA: 'armorPipsRA',
  LL: 'armorPipsLL',
  RL: 'armorPipsRL',
  // Rear
  CTR: 'armorPipsCTR',
  LTR: 'armorPipsLTR',
  RTR: 'armorPipsRTR',
};

// Quad armor pip group IDs
export const QUAD_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'armorPipsHD',
  CT: 'armorPipsCT',
  LT: 'armorPipsLT',
  RT: 'armorPipsRT',
  FLL: 'armorPipsFLL',
  FRL: 'armorPipsFRL',
  RLL: 'armorPipsRLL',
  RRL: 'armorPipsRRL',
  // Rear
  CTR: 'armorPipsCTR',
  LTR: 'armorPipsLTR',
  RTR: 'armorPipsRTR',
};

// Tripod armor pip group IDs
export const TRIPOD_PIP_GROUP_IDS: Record<string, string> = {
  HD: 'armorPipsHD',
  CT: 'armorPipsCT',
  LT: 'armorPipsLT',
  RT: 'armorPipsRT',
  LA: 'armorPipsLA',
  RA: 'armorPipsRA',
  LL: 'armorPipsLL',
  RL: 'armorPipsRL',
  CL: 'armorPipsCL', // Center Leg (tripod-specific)
  // Rear
  CTR: 'armorPipsCTR',
  LTR: 'armorPipsLTR',
  RTR: 'armorPipsRTR',
};

// Rear armor locations
export const REAR_LOCATIONS = ['CT', 'LT', 'RT'];

// Mech types that use pre-made pip files (DEPRECATED - all now use ArmorPipLayout)
// Keeping for backward compatibility but now using dynamic generation for all types
// Mech types that use pre-made pip SVG files from mm-data
// These have pip layouts already computed in SVG form
export const PREMADE_PIP_TYPES: string[] = ['biped'];
