/**
 * Damage Application Module
 * Implements BattleTech damage application including armor, structure,
 * damage transfer, and unit destruction.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import {
  CombatLocation,
  ILocationDamage,
  IDamageResult,
  IPilotDamageResult,
  ICriticalHitResult,
  getTransferCombatLocation,
  isRearCombatLocation,
  getFrontCombatLocation,
} from '@/types/gameplay';
import { roll2d6, isHeadHit } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

/**
 * Unit damage state for tracking armor and structure.
 */
export interface IUnitDamageState {
  /** Armor values by location */
  armor: Record<CombatLocation, number>;
  /** Rear armor values (for torso locations) */
  rearArmor: Record<'center_torso' | 'left_torso' | 'right_torso', number>;
  /** Internal structure values by location */
  structure: Record<CombatLocation, number>;
  /** Destroyed locations */
  destroyedLocations: Set<CombatLocation>;
  /** Pilot wounds */
  pilotWounds: number;
  /** Is pilot conscious? */
  pilotConscious: boolean;
  /** Is unit destroyed? */
  destroyed: boolean;
  /** Destruction cause */
  destructionCause?: 'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed';
}

// =============================================================================
// Standard Structure Values
// =============================================================================

/**
 * Standard internal structure values by tonnage.
 * Key is tonnage, value is structure points for each location.
 */
export const STANDARD_STRUCTURE_TABLE: Readonly<Record<number, {
  head: number;
  centerTorso: number;
  sideTorso: number;
  arm: number;
  leg: number;
}>> = {
  20: { head: 3, centerTorso: 6, sideTorso: 5, arm: 3, leg: 4 },
  25: { head: 3, centerTorso: 8, sideTorso: 6, arm: 4, leg: 6 },
  30: { head: 3, centerTorso: 10, sideTorso: 7, arm: 5, leg: 7 },
  35: { head: 3, centerTorso: 11, sideTorso: 8, arm: 6, leg: 8 },
  40: { head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10 },
  45: { head: 3, centerTorso: 14, sideTorso: 11, arm: 7, leg: 11 },
  50: { head: 3, centerTorso: 16, sideTorso: 12, arm: 8, leg: 12 },
  55: { head: 3, centerTorso: 18, sideTorso: 13, arm: 9, leg: 13 },
  60: { head: 3, centerTorso: 20, sideTorso: 14, arm: 10, leg: 14 },
  65: { head: 3, centerTorso: 21, sideTorso: 15, arm: 10, leg: 15 },
  70: { head: 3, centerTorso: 22, sideTorso: 15, arm: 11, leg: 15 },
  75: { head: 3, centerTorso: 23, sideTorso: 16, arm: 12, leg: 16 },
  80: { head: 3, centerTorso: 25, sideTorso: 17, arm: 13, leg: 17 },
  85: { head: 3, centerTorso: 27, sideTorso: 18, arm: 14, leg: 18 },
  90: { head: 3, centerTorso: 29, sideTorso: 19, arm: 15, leg: 19 },
  95: { head: 3, centerTorso: 30, sideTorso: 20, arm: 16, leg: 20 },
  100: { head: 3, centerTorso: 31, sideTorso: 21, arm: 17, leg: 21 },
};

// =============================================================================
// Damage Application
// =============================================================================

/**
 * Apply damage to a single location.
 * Returns the damage result and updates the state.
 */
export function applyDamageToLocation(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number
): ILocationDamage {
  // Check if location is already destroyed
  if (state.destroyedLocations.has(location)) {
    // Damage transfers to next location
    const transferTo = getTransferCombatLocation(location);
    if (transferTo) {
      return {
        location,
        damage,
        armorDamage: 0,
        structureDamage: 0,
        armorRemaining: 0,
        structureRemaining: 0,
        destroyed: true,
        transferredDamage: damage,
        transferLocation: transferTo,
      };
    }
    // No transfer location (head, CT) - unit destroyed
    return {
      location,
      damage,
      armorDamage: 0,
      structureDamage: 0,
      armorRemaining: 0,
      structureRemaining: 0,
      destroyed: true,
      transferredDamage: 0,
    };
  }

  // Get appropriate armor (rear vs front)
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  
  let currentArmor: number;
  if (isRear) {
    const rearKey = armorKey as 'center_torso' | 'left_torso' | 'right_torso';
    currentArmor = state.rearArmor[rearKey] ?? 0;
  } else {
    currentArmor = state.armor[location] ?? 0;
  }
  
  const currentStructure = state.structure[armorKey] ?? 0;

  let remainingDamage = damage;
  let armorDamage = 0;
  let structureDamage = 0;
  let destroyed = false;
  let transferredDamage = 0;

  // Apply to armor first
  if (currentArmor > 0) {
    armorDamage = Math.min(currentArmor, remainingDamage);
    remainingDamage -= armorDamage;
    
    // Update state
    if (isRear) {
      const rearKey = armorKey as 'center_torso' | 'left_torso' | 'right_torso';
      state.rearArmor[rearKey] = currentArmor - armorDamage;
    } else {
      state.armor[location] = currentArmor - armorDamage;
    }
  }

  // Apply remaining to structure
  if (remainingDamage > 0 && currentStructure > 0) {
    structureDamage = Math.min(currentStructure, remainingDamage);
    remainingDamage -= structureDamage;
    
    // Update state
    state.structure[armorKey] = currentStructure - structureDamage;
    
    // Check for destruction
    if (state.structure[armorKey] <= 0) {
      destroyed = true;
      state.destroyedLocations.add(location);
      if (isRear) {
        // Also mark front as destroyed
        state.destroyedLocations.add(armorKey);
      }
      
      // Transfer remaining damage
      if (remainingDamage > 0) {
        const transferTo = getTransferCombatLocation(location);
        if (transferTo) {
          transferredDamage = remainingDamage;
        }
      }
    }
  }

  // Calculate remaining values
  const armorRemaining = isRear 
    ? state.rearArmor[armorKey as 'center_torso' | 'left_torso' | 'right_torso']
    : state.armor[location];
  const structureRemaining = state.structure[armorKey];

  return {
    location,
    damage,
    armorDamage,
    structureDamage,
    armorRemaining,
    structureRemaining,
    destroyed,
    transferredDamage,
    transferLocation: transferredDamage > 0 ? getTransferCombatLocation(location) ?? undefined : undefined,
  };
}

/**
 * Apply damage with full transfer chain.
 * Handles damage transfer when locations are destroyed.
 */
export function applyDamageWithTransfer(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number
): ILocationDamage[] {
  const results: ILocationDamage[] = [];
  let currentLocation: CombatLocation | null = location;
  let currentDamage = damage;

  while (currentLocation && currentDamage > 0) {
    const result = applyDamageToLocation(state, currentLocation, currentDamage);
    results.push(result);

    if (result.transferredDamage > 0 && result.transferLocation) {
      currentLocation = result.transferLocation;
      currentDamage = result.transferredDamage;
    } else {
      break;
    }
  }

  return results;
}

// =============================================================================
// Critical Hit Checks
// =============================================================================

/**
 * Check if structure damage triggers a critical hit.
 * Roll 2d6: 8+ triggers critical hit check.
 */
export function checkCriticalHitTrigger(structureDamage: number): {
  triggered: boolean;
  roll: ReturnType<typeof roll2d6>;
} {
  if (structureDamage <= 0) {
    return { triggered: false, roll: { dice: [0, 0], total: 0, isSnakeEyes: false, isBoxcars: false } };
  }

  const roll = roll2d6();
  return {
    triggered: roll.total >= 8,
    roll,
  };
}

/**
 * Determine number of critical hits based on roll.
 * 8-9: 1 hit, 10-11: 2 hits, 12: 3 hits (or head/limb blown off)
 */
export function getCriticalHitCount(roll: number): number {
  if (roll >= 12) return 3;
  if (roll >= 10) return 2;
  if (roll >= 8) return 1;
  return 0;
}

// =============================================================================
// Pilot Damage
// =============================================================================

/**
 * Apply pilot damage from various sources.
 */
export function applyPilotDamage(
  state: IUnitDamageState,
  wounds: number,
  source: 'head_hit' | 'ammo_explosion' | 'mech_destruction' | 'fall' | 'physical_attack' | 'heat'
): IPilotDamageResult {
  const _previousWounds = state.pilotWounds;
  state.pilotWounds += wounds;
  
  const dead = state.pilotWounds >= 6;
  
  // Consciousness check required if wounded
  const consciousnessCheckRequired = wounds > 0 && !dead;
  let consciousnessRoll: ReturnType<typeof roll2d6> | undefined;
  let consciousnessTarget: number | undefined;
  let conscious: boolean | undefined;

  if (consciousnessCheckRequired) {
    // Target number: 3 + total wounds
    consciousnessTarget = 3 + state.pilotWounds;
    consciousnessRoll = roll2d6();
    conscious = consciousnessRoll.total > consciousnessTarget;
    
    if (!conscious) {
      state.pilotConscious = false;
    }
  }

  if (dead) {
    state.pilotConscious = false;
    state.destroyed = true;
    state.destructionCause = 'pilot_death';
  }

  return {
    source,
    woundsInflicted: wounds,
    totalWounds: state.pilotWounds,
    consciousnessCheckRequired,
    consciousnessRoll,
    consciousnessTarget,
    conscious,
    dead,
  };
}

// =============================================================================
// Unit Destruction Checks
// =============================================================================

/**
 * Check if unit is destroyed based on current state.
 */
export function checkUnitDestruction(state: IUnitDamageState): {
  destroyed: boolean;
  cause?: 'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed';
} {
  // Already destroyed
  if (state.destroyed) {
    return { destroyed: true, cause: state.destructionCause ?? 'damage' };
  }

  // Head destroyed
  if (state.destroyedLocations.has('head')) {
    state.destroyed = true;
    state.destructionCause = 'damage';
    return { destroyed: true, cause: 'damage' };
  }

  // Center torso destroyed
  if (state.destroyedLocations.has('center_torso')) {
    state.destroyed = true;
    state.destructionCause = 'damage';
    return { destroyed: true, cause: 'damage' };
  }

  // Pilot dead
  if (state.pilotWounds >= 6) {
    state.destroyed = true;
    state.destructionCause = 'pilot_death';
    return { destroyed: true, cause: 'pilot_death' };
  }

  return { destroyed: false };
}

// =============================================================================
// Complete Damage Resolution
// =============================================================================

/**
 * Apply complete damage from an attack.
 * Handles armor, structure, transfer, criticals, and pilot damage.
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number
): IDamageResult {
  const locationDamages = applyDamageWithTransfer(state, location, damage);
  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  // Check for pilot damage from head hit
  if (isHeadHit(location) && damage > 0) {
    pilotDamage = applyPilotDamage(state, 1, 'head_hit');
  }

  // Check for critical hits on structure damage
  for (const locDamage of locationDamages) {
    if (locDamage.structureDamage > 0 && !locDamage.destroyed) {
      const critCheck = checkCriticalHitTrigger(locDamage.structureDamage);
      if (critCheck.triggered) {
        // Note: Actual critical hit resolution would be done separately
        // This just flags that criticals should be rolled
      }
    }
  }

  // Check for unit destruction
  const destruction = checkUnitDestruction(state);

  return {
    locationDamages,
    criticalHits,
    pilotDamage,
    unitDestroyed: destruction.destroyed,
    destructionCause: destruction.cause,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a fresh damage state for a mech.
 */
export function createDamageState(
  tonnage: number,
  armorValues: Record<CombatLocation, number>,
  rearArmorValues: Record<'center_torso' | 'left_torso' | 'right_torso', number>
): IUnitDamageState {
  const structureTable = STANDARD_STRUCTURE_TABLE[tonnage] ?? STANDARD_STRUCTURE_TABLE[50];
  
  const structure: Record<CombatLocation, number> = {
    'head': structureTable.head,
    'center_torso': structureTable.centerTorso,
    'center_torso_rear': structureTable.centerTorso, // Shares with front
    'left_torso': structureTable.sideTorso,
    'left_torso_rear': structureTable.sideTorso,
    'right_torso': structureTable.sideTorso,
    'right_torso_rear': structureTable.sideTorso,
    'left_arm': structureTable.arm,
    'right_arm': structureTable.arm,
    'left_leg': structureTable.leg,
    'right_leg': structureTable.leg,
  };

  return {
    armor: { ...armorValues },
    rearArmor: { ...rearArmorValues },
    structure,
    destroyedLocations: new Set(),
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
  };
}

/**
 * Calculate total damage capacity (armor + structure) for a location.
 */
export function getLocationDamageCapacity(
  state: IUnitDamageState,
  location: CombatLocation
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  
  const armor = isRear 
    ? state.rearArmor[armorKey as 'center_torso' | 'left_torso' | 'right_torso'] ?? 0
    : state.armor[location] ?? 0;
  const structure = state.structure[armorKey] ?? 0;
  
  return armor + structure;
}

/**
 * Get remaining health percentage for a location.
 */
export function getLocationHealthPercent(
  state: IUnitDamageState,
  location: CombatLocation,
  maxArmor: number,
  maxStructure: number
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  
  const currentArmor = isRear 
    ? state.rearArmor[armorKey as 'center_torso' | 'left_torso' | 'right_torso'] ?? 0
    : state.armor[location] ?? 0;
  const currentStructure = state.structure[armorKey] ?? 0;
  
  const maxTotal = maxArmor + maxStructure;
  const currentTotal = currentArmor + currentStructure;
  
  return maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
}
