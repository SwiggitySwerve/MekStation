/**
 * Armor.ts
 * Type definitions for armor allocation structures used across the BattleTech editor.
 * Consolidates armor-related types from various files into a single source of truth.
 */

/**
 * Armor allocation for a single location
 */
export interface ILocationArmor {
  readonly front: number;
  readonly rear?: number;
}

/**
 * Armor allocation map - flexible structure for any location
 */
export type IArmorAllocation = Record<string, ILocationArmor>;

/**
 * Standard BattleMech armor locations (short codes)
 */
export type ArmorLocationCode = 'HD' | 'CT' | 'LT' | 'RT' | 'LA' | 'RA' | 'LL' | 'RL';

/**
 * Armor allocation with standard mech locations (using short codes)
 */
export interface IStandardArmorAllocation {
  readonly HD: ILocationArmor;
  readonly CT: ILocationArmor;
  readonly LT: ILocationArmor;
  readonly RT: ILocationArmor;
  readonly LA: ILocationArmor;
  readonly RA: ILocationArmor;
  readonly LL: ILocationArmor;
  readonly RL: ILocationArmor;
}

/**
 * Type guard to check if an object is a valid armor allocation
 */
export function isArmorAllocation(value: unknown): value is IArmorAllocation {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  return Object.values(obj).every(location => {
    if (!location || typeof location !== 'object') {
      return false;
    }
    const loc = location as Record<string, unknown>;
    return typeof loc.front === 'number' && 
           (loc.rear === undefined || typeof loc.rear === 'number');
  });
}

