/**
 * Location Mappings for Unit Conversion
 * 
 * Normalizes location names from MegaMekLab format to MechLocation enum.
 * Handles abbreviated formats (LA, RA) and full names (Left Arm, Right Arm).
 * 
 * @spec unit-json.plan.md
 */

import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction/CriticalSlotAllocation';
import { IArmorAllocation } from '@/types/construction/ComponentInterfaces';

// ============================================================================
// LOCATION NAME MAPPINGS
// ============================================================================

/**
 * Map of all possible location name variations to MechLocation enum
 * Supports both biped and quad configurations
 */
const LOCATION_MAP: Record<string, MechLocation> = {
  // Head
  'Head': MechLocation.HEAD,
  'HD': MechLocation.HEAD,
  'H': MechLocation.HEAD,

  // Center Torso
  'Center Torso': MechLocation.CENTER_TORSO,
  'CT': MechLocation.CENTER_TORSO,
  'CenterTorso': MechLocation.CENTER_TORSO,

  // Left Torso
  'Left Torso': MechLocation.LEFT_TORSO,
  'LT': MechLocation.LEFT_TORSO,
  'LeftTorso': MechLocation.LEFT_TORSO,

  // Right Torso
  'Right Torso': MechLocation.RIGHT_TORSO,
  'RT': MechLocation.RIGHT_TORSO,
  'RightTorso': MechLocation.RIGHT_TORSO,

  // Left Arm (Biped)
  'Left Arm': MechLocation.LEFT_ARM,
  'LA': MechLocation.LEFT_ARM,
  'LeftArm': MechLocation.LEFT_ARM,

  // Right Arm (Biped)
  'Right Arm': MechLocation.RIGHT_ARM,
  'RA': MechLocation.RIGHT_ARM,
  'RightArm': MechLocation.RIGHT_ARM,

  // Left Leg (Biped)
  'Left Leg': MechLocation.LEFT_LEG,
  'LL': MechLocation.LEFT_LEG,
  'LeftLeg': MechLocation.LEFT_LEG,

  // Right Leg (Biped)
  'Right Leg': MechLocation.RIGHT_LEG,
  'RL': MechLocation.RIGHT_LEG,
  'RightLeg': MechLocation.RIGHT_LEG,

  // Front Left Leg (Quad)
  'Front Left Leg': MechLocation.FRONT_LEFT_LEG,
  'FLL': MechLocation.FRONT_LEFT_LEG,
  'FrontLeftLeg': MechLocation.FRONT_LEFT_LEG,

  // Front Right Leg (Quad)
  'Front Right Leg': MechLocation.FRONT_RIGHT_LEG,
  'FRL': MechLocation.FRONT_RIGHT_LEG,
  'FrontRightLeg': MechLocation.FRONT_RIGHT_LEG,

  // Rear Left Leg (Quad)
  'Rear Left Leg': MechLocation.REAR_LEFT_LEG,
  'RLL': MechLocation.REAR_LEFT_LEG,
  'RearLeftLeg': MechLocation.REAR_LEFT_LEG,

  // Rear Right Leg (Quad)
  'Rear Right Leg': MechLocation.REAR_RIGHT_LEG,
  'RRL': MechLocation.REAR_RIGHT_LEG,
  'RearRightLeg': MechLocation.REAR_RIGHT_LEG,
};

/**
 * Locations that indicate rear armor (not a separate MechLocation)
 */
const REAR_LOCATION_PATTERNS = [
  'Center Torso (Rear)',
  'Left Torso (Rear)',
  'Right Torso (Rear)',
  'CTR',
  'LTR',
  'RTR',
  'CT (Rear)',
  'LT (Rear)',
  'RT (Rear)',
];

/**
 * Result of parsing a location string
 */
export interface ParsedLocation {
  readonly location: MechLocation;
  readonly isRear: boolean;
}

/**
 * Map a location string to MechLocation enum
 */
export function mapLocation(source: string): MechLocation | undefined {
  const normalized = source.trim();
  return LOCATION_MAP[normalized];
}

/**
 * Parse a location string, detecting if it's a rear-facing location
 */
export function parseLocation(source: string): ParsedLocation | undefined {
  const normalized = source.trim();
  
  // Check if it's a rear location
  const isRear = REAR_LOCATION_PATTERNS.some(pattern => 
    normalized.toLowerCase().includes(pattern.toLowerCase()) ||
    normalized === pattern
  );
  
  if (isRear) {
    // Extract the base location from rear pattern
    if (normalized.toLowerCase().includes('center')) {
      return { location: MechLocation.CENTER_TORSO, isRear: true };
    }
    if (normalized.toLowerCase().includes('left')) {
      return { location: MechLocation.LEFT_TORSO, isRear: true };
    }
    if (normalized.toLowerCase().includes('right')) {
      return { location: MechLocation.RIGHT_TORSO, isRear: true };
    }
    if (normalized.toUpperCase().startsWith('CT')) {
      return { location: MechLocation.CENTER_TORSO, isRear: true };
    }
    if (normalized.toUpperCase().startsWith('LT')) {
      return { location: MechLocation.LEFT_TORSO, isRear: true };
    }
    if (normalized.toUpperCase().startsWith('RT')) {
      return { location: MechLocation.RIGHT_TORSO, isRear: true };
    }
  }
  
  // Standard location lookup
  const location = LOCATION_MAP[normalized];
  if (location) {
    return { location, isRear: false };
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();

  if (lowerSource.includes('head')) {
    return { location: MechLocation.HEAD, isRear: false };
  }

  if (lowerSource.includes('center') && lowerSource.includes('torso')) {
    return { location: MechLocation.CENTER_TORSO, isRear: false };
  }

  if (lowerSource.includes('left') && lowerSource.includes('torso')) {
    return { location: MechLocation.LEFT_TORSO, isRear: false };
  }

  if (lowerSource.includes('right') && lowerSource.includes('torso')) {
    return { location: MechLocation.RIGHT_TORSO, isRear: false };
  }

  if (lowerSource.includes('left') && lowerSource.includes('arm')) {
    return { location: MechLocation.LEFT_ARM, isRear: false };
  }

  if (lowerSource.includes('right') && lowerSource.includes('arm')) {
    return { location: MechLocation.RIGHT_ARM, isRear: false };
  }

  // Quad leg locations (check front/rear before generic legs)
  if (lowerSource.includes('front') && lowerSource.includes('left') && lowerSource.includes('leg')) {
    return { location: MechLocation.FRONT_LEFT_LEG, isRear: false };
  }

  if (lowerSource.includes('front') && lowerSource.includes('right') && lowerSource.includes('leg')) {
    return { location: MechLocation.FRONT_RIGHT_LEG, isRear: false };
  }

  if (lowerSource.includes('rear') && lowerSource.includes('left') && lowerSource.includes('leg')) {
    return { location: MechLocation.REAR_LEFT_LEG, isRear: false };
  }

  if (lowerSource.includes('rear') && lowerSource.includes('right') && lowerSource.includes('leg')) {
    return { location: MechLocation.REAR_RIGHT_LEG, isRear: false };
  }

  // Biped leg locations (generic left/right leg)
  if (lowerSource.includes('left') && lowerSource.includes('leg')) {
    return { location: MechLocation.LEFT_LEG, isRear: false };
  }

  if (lowerSource.includes('right') && lowerSource.includes('leg')) {
    return { location: MechLocation.RIGHT_LEG, isRear: false };
  }

  return undefined;
}

// ============================================================================
// ARMOR LOCATION MAPPINGS
// ============================================================================

/**
 * Armor location format from MegaMekLab
 */
export interface SourceArmorLocation {
  location: string;
  armor_points: number;
  rear_armor_points?: number | null;
}

/**
 * Mutable armor allocation for building
 */
interface MutableArmorAllocation {
  head: number;
  centerTorso: number;
  centerTorsoRear: number;
  leftTorso: number;
  leftTorsoRear: number;
  rightTorso: number;
  rightTorsoRear: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

/**
 * Convert MegaMekLab armor locations array to IArmorAllocation
 */
export function convertArmorLocations(locations: SourceArmorLocation[]): IArmorAllocation {
  const allocation: MutableArmorAllocation = {
    head: 0,
    centerTorso: 0,
    centerTorsoRear: 0,
    leftTorso: 0,
    leftTorsoRear: 0,
    rightTorso: 0,
    rightTorsoRear: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  };
  
  for (const loc of locations) {
    const parsed = parseLocation(loc.location);
    if (!parsed) continue;
    
    const points = loc.armor_points;
    
    if (parsed.isRear) {
      // This is a rear armor entry
      switch (parsed.location) {
        case MechLocation.CENTER_TORSO:
          allocation.centerTorsoRear = points;
          break;
        case MechLocation.LEFT_TORSO:
          allocation.leftTorsoRear = points;
          break;
        case MechLocation.RIGHT_TORSO:
          allocation.rightTorsoRear = points;
          break;
      }
    } else {
      // Front armor
      switch (parsed.location) {
        case MechLocation.HEAD:
          allocation.head = points;
          break;
        case MechLocation.CENTER_TORSO:
          allocation.centerTorso = points;
          // Handle inline rear_armor_points if present
          if (typeof loc.rear_armor_points === 'number') {
            allocation.centerTorsoRear = loc.rear_armor_points;
          }
          break;
        case MechLocation.LEFT_TORSO:
          allocation.leftTorso = points;
          if (typeof loc.rear_armor_points === 'number') {
            allocation.leftTorsoRear = loc.rear_armor_points;
          }
          break;
        case MechLocation.RIGHT_TORSO:
          allocation.rightTorso = points;
          if (typeof loc.rear_armor_points === 'number') {
            allocation.rightTorsoRear = loc.rear_armor_points;
          }
          break;
        case MechLocation.LEFT_ARM:
          allocation.leftArm = points;
          break;
        case MechLocation.RIGHT_ARM:
          allocation.rightArm = points;
          break;
        case MechLocation.LEFT_LEG:
          allocation.leftLeg = points;
          break;
        case MechLocation.RIGHT_LEG:
          allocation.rightLeg = points;
          break;
      }
    }
  }
  
  // Freeze and return as IArmorAllocation
  return allocation as IArmorAllocation;
}

/**
 * Calculate total armor points from allocation
 */
export function calculateTotalArmor(allocation: IArmorAllocation): number {
  return (
    allocation.head +
    allocation.centerTorso +
    allocation.centerTorsoRear +
    allocation.leftTorso +
    allocation.leftTorsoRear +
    allocation.rightTorso +
    allocation.rightTorsoRear +
    allocation.leftArm +
    allocation.rightArm +
    allocation.leftLeg +
    allocation.rightLeg
  );
}

// ============================================================================
// CRITICAL SLOT LOCATION MAPPINGS
// ============================================================================

/**
 * Order of locations in MegaMekLab's combined criticals array
 * 
 * The MegaMekLab Python converter outputs slots in a specific order,
 * with each location padded to 12 slots regardless of actual capacity.
 * 
 * Order: Head, Left Leg, Right Leg, Left Arm, Right Arm, Left Torso, Right Torso, Center Torso
 */
export const LOCATION_SLOT_ORDER: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.CENTER_TORSO,
];

/**
 * Biped mech locations for slot extraction
 */
const BIPED_LOCATIONS = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
] as const;

/**
 * Quad mech locations for slot extraction
 */
const QUAD_LOCATIONS = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
] as const;

/**
 * Slot counts per location for biped mechs
 *
 * @deprecated Use LOCATION_SLOT_COUNTS from CriticalSlotAllocation instead
 */
export const BIPED_SLOT_COUNTS: Partial<Record<MechLocation, number>> = Object.fromEntries(
  BIPED_LOCATIONS.map(loc => [loc, LOCATION_SLOT_COUNTS[loc]])
) as Partial<Record<MechLocation, number>>;

/**
 * Slot counts per location for quad mechs
 *
 * Note: Quad legs have 12 slots each (same as biped arms).
 * @deprecated Use LOCATION_SLOT_COUNTS from CriticalSlotAllocation instead
 */
export const QUAD_SLOT_COUNTS: Partial<Record<MechLocation, number>> = Object.fromEntries(
  QUAD_LOCATIONS.map(loc => [loc, LOCATION_SLOT_COUNTS[loc]])
) as Partial<Record<MechLocation, number>>;

/**
 * Order of locations in MegaMekLab's combined criticals array for quad mechs
 */
export const QUAD_LOCATION_SLOT_ORDER: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.CENTER_TORSO,
];

/**
 * Padded slot counts - MegaMekLab converter pads all locations to 12 slots
 */
const PADDED_SLOT_COUNT = 12;

/**
 * Source critical slot entry from MegaMekLab format
 */
export interface SourceCriticalEntry {
  location: string;
  slots: string[];
}

/**
 * Parsed critical slot allocation per location
 */
export interface ParsedCriticalSlots {
  readonly location: MechLocation;
  readonly slots: string[];
}

/**
 * Parse MegaMekLab critical slots format into per-location arrays
 * 
 * The MegaMekLab Python converter outputs slots in a combined format where:
 * - All slots are concatenated into a single entry labeled "Head"
 * - Each location is padded to 12 slots regardless of actual capacity
 * - Order: Head, LeftLeg, RightLeg, LeftArm, RightArm, LeftTorso, RightTorso, CenterTorso
 * 
 * This function splits the combined array back into per-location arrays.
 */
export function parseCriticalSlots(entries: SourceCriticalEntry[]): ParsedCriticalSlots[] {
  const result: ParsedCriticalSlots[] = [];
  
  // Check if we have properly separated location entries (8 locations for biped)
  if (entries.length >= 8) {
    // Properly formatted - one entry per location
    for (const entry of entries) {
      const location = mapLocation(entry.location);
      if (location) {
        result.push({
          location,
          slots: entry.slots.slice(0, LOCATION_SLOT_COUNTS[location]),
        });
      }
    }
    return result;
  }
  
  // Handle combined format - all slots concatenated into one entry
  // The converter pads each location to 12 slots
  if (entries.length === 1 && entries[0].slots.length > 12) {
    const allSlots = entries[0].slots;
    let offset = 0;
    
    // Split by padded slot count (12 per location)
    for (const location of LOCATION_SLOT_ORDER) {
      const actualSlotCount = LOCATION_SLOT_COUNTS[location] ?? 0;
      // Take only the actual slot count for this location (not the padded amount)
      const locationSlots = allSlots.slice(offset, offset + actualSlotCount);
      
      if (locationSlots.length > 0) {
        result.push({
          location,
          slots: locationSlots,
        });
      }
      
      // Advance by padded amount (12) not actual count
      offset += PADDED_SLOT_COUNT;
    }
    
    return result;
  }
  
  // Handle partially combined format (some locations separate)
  // This catches cases where there might be multiple entries but not all 8
  const processedLocations = new Set<MechLocation>();
  
  for (const entry of entries) {
    const location = mapLocation(entry.location);
    if (location && !processedLocations.has(location)) {
      processedLocations.add(location);
      result.push({
        location,
        slots: entry.slots.slice(0, LOCATION_SLOT_COUNTS[location]),
      });
    }
  }
  
  return result;
}

/**
 * Get all MechLocation values for iteration
 */
export function getAllMechLocations(): MechLocation[] {
  return Object.values(MechLocation);
}

/**
 * Check if a location string represents a valid mech location
 */
export function isValidMechLocation(source: string): boolean {
  return mapLocation(source) !== undefined || parseLocation(source) !== undefined;
}

