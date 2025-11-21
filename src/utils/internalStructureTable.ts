/**
 * Official BattleTech Internal Structure Point Allocation Table
 * 
 * This table provides the authoritative internal structure points for each location
 * based on official BattleTech construction rules. All other internal structure
 * calculations in the codebase should reference this table.
 * 
 * Rules:
 * - Head: Always 3 points regardless of tonnage
 * - Other locations scale with tonnage using official formulas:
 *   - Center Torso: ~3.2 × (tonnage ÷ 10)
 *   - Left/Right Torso: ~2.1 × (tonnage ÷ 10) each
 *   - Left/Right Arm: ~1.7 × (tonnage ÷ 10) each  
 *   - Left/Right Leg: ~2.1 × (tonnage ÷ 10) each
 * - Fractional values always round up (Math.ceil)
 */

export interface InternalStructurePoints {
  HD: number;  // Head
  CT: number;  // Center Torso
  LT: number;  // Left Torso
  RT: number;  // Right Torso
  LA: number;  // Left Arm
  RA: number;  // Right Arm
  LL: number;  // Left Leg
  RL: number;  // Right Leg
}

// Official BattleTech Internal Structure Table (from official rules)
function generateInternalStructureTable(): Record<number, InternalStructurePoints> {
  // Use exact values from official BattleTech construction tables
  return {
    20: { HD: 3, CT: 7, LT: 5, RT: 5, LA: 4, RA: 4, LL: 5, RL: 5 },
    25: { HD: 3, CT: 8, LT: 6, RT: 6, LA: 4, RA: 4, LL: 6, RL: 6 },
    30: { HD: 3, CT: 10, LT: 7, RT: 7, LA: 5, RA: 5, LL: 7, RL: 7 },
    35: { HD: 3, CT: 11, LT: 8, RT: 8, LA: 6, RA: 6, LL: 8, RL: 8 },
    40: { HD: 3, CT: 12, LT: 10, RT: 10, LA: 6, RA: 6, LL: 10, RL: 10 },
    45: { HD: 3, CT: 14, LT: 11, RT: 11, LA: 7, RA: 7, LL: 11, RL: 11 },
    50: { HD: 3, CT: 16, LT: 11, RT: 11, LA: 9, RA: 9, LL: 11, RL: 11 },
    55: { HD: 3, CT: 18, LT: 13, RT: 13, LA: 9, RA: 9, LL: 13, RL: 13 },
    60: { HD: 3, CT: 20, LT: 14, RT: 14, LA: 10, RA: 10, LL: 14, RL: 14 },
    65: { HD: 3, CT: 21, LT: 15, RT: 15, LA: 10, RA: 10, LL: 15, RL: 15 },
    70: { HD: 3, CT: 22, LT: 15, RT: 15, LA: 11, RA: 11, LL: 15, RL: 15 },
    75: { HD: 3, CT: 24, LT: 17, RT: 17, LA: 13, RA: 13, LL: 17, RL: 17 },
    80: { HD: 3, CT: 25, LT: 17, RT: 17, LA: 13, RA: 13, LL: 17, RL: 17 },
    85: { HD: 3, CT: 27, LT: 18, RT: 18, LA: 14, RA: 14, LL: 18, RL: 18 },
    90: { HD: 3, CT: 29, LT: 19, RT: 19, LA: 15, RA: 15, LL: 19, RL: 19 },
    95: { HD: 3, CT: 31, LT: 20, RT: 20, LA: 17, RA: 17, LL: 20, RL: 20 },
    100: { HD: 3, CT: 32, LT: 21, RT: 21, LA: 17, RA: 17, LL: 21, RL: 21 }
  };
}

// Official BattleTech Internal Structure Table
export const INTERNAL_STRUCTURE_TABLE = generateInternalStructureTable();

/**
 * Get internal structure points for a specific tonnage
 */
export function getInternalStructurePoints(tonnage: number): InternalStructurePoints {
  // Validate tonnage
  if (tonnage < 20 || tonnage > 100) {
    throw new Error(`Invalid tonnage: ${tonnage}. Must be between 20-100 tons.`);
  }
  
  // Round to nearest 5-ton increment
  const validTonnage = Math.round(tonnage / 5) * 5;
  
  const structure = INTERNAL_STRUCTURE_TABLE[validTonnage];
  if (!structure) {
    throw new Error(`No internal structure data for ${validTonnage} tons`);
  }
  
  return structure;
}

/**
 * Get total internal structure points for a mech
 */
export function getTotalInternalStructure(tonnage: number): number {
  const structure = getInternalStructurePoints(tonnage);
  return structure.HD + structure.CT + structure.LT + structure.RT + 
         structure.LA + structure.RA + structure.LL + structure.RL;
}

/**
 * Get maximum armor points for a specific tonnage
 * Following BattleTech rule: 2x internal structure for all locations except head (max 9)
 */
export function getMaxArmorPoints(tonnage: number): number {
  const structure = getInternalStructurePoints(tonnage);
  
  // Head max is 9, all other locations are 2x internal structure
  const headMax = 9;
  const otherLocationsMax = (structure.CT + structure.LT + structure.RT + 
                            structure.LA + structure.RA + structure.LL + structure.RL) * 2;
  
  return headMax + otherLocationsMax;
}

/**
 * Get maximum armor points for a specific location
 */
export function getMaxArmorPointsForLocation(tonnage: number, location: string): number {
  const structure = getInternalStructurePoints(tonnage);
  
  // Normalize location names
  const loc = location.toUpperCase();
  
  if (loc === 'HEAD' || loc === 'HD') {
    return 9; // Head max is always 9
  }
  
  // Map location names to structure properties
  const locationMap: Record<string, keyof InternalStructurePoints> = {
    'CENTER_TORSO': 'CT', 'CT': 'CT',
    'LEFT_TORSO': 'LT', 'LT': 'LT',
    'RIGHT_TORSO': 'RT', 'RT': 'RT',
    'LEFT_ARM': 'LA', 'LA': 'LA',
    'RIGHT_ARM': 'RA', 'RA': 'RA',
    'LEFT_LEG': 'LL', 'LL': 'LL',
    'RIGHT_LEG': 'RL', 'RL': 'RL'
  };
  
  const structureKey = locationMap[loc];
  if (!structureKey) {
    throw new Error(`Unknown location: ${location}`);
  }
  
  return structure[structureKey] * 2;
}

/**
 * Validate that a tonnage is a valid BattleMech tonnage
 */
export function isValidTonnage(tonnage: number): boolean {
  return tonnage >= 20 && tonnage <= 100 && tonnage % 5 === 0;
}

/**
 * Get all supported tonnages
 */
export function getSupportedTonnages(): number[] {
  return Object.keys(INTERNAL_STRUCTURE_TABLE).map(Number).sort((a, b) => a - b);
}

/**
 * Get internal structure breakdown with totals for debugging/display
 */
export function getInternalStructureBreakdown(tonnage: number): {
  structure: InternalStructurePoints;
  total: number;
  maxArmor: number;
  locationMaxArmor: Record<string, number>;
} {
  const structure = getInternalStructurePoints(tonnage);
  const total = getTotalInternalStructure(tonnage);
  const maxArmor = getMaxArmorPoints(tonnage);
  
  const locationMaxArmor = {
    Head: 9,
    'Center Torso': structure.CT * 2,
    'Left Torso': structure.LT * 2,
    'Right Torso': structure.RT * 2,
    'Left Arm': structure.LA * 2,
    'Right Arm': structure.RA * 2,
    'Left Leg': structure.LL * 2,
    'Right Leg': structure.RL * 2
  };
  
  return {
    structure,
    total,
    maxArmor,
    locationMaxArmor
  };
}
