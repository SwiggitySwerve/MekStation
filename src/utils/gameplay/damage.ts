/**
 * Damage Application Module
 * Implements BattleTech damage application including armor, structure,
 * damage transfer, and unit destruction.
 *
 * All functions follow immutable patterns - they return new state objects
 * instead of mutating the input state.
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
  IHexTerrain,
  TerrainType,
} from '@/types/gameplay';

import { roll2d6, isHeadHit } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

/**
 * Unit damage state for tracking armor and structure.
 * All properties are treated as immutable - functions return new state objects.
 */
export interface IUnitDamageState {
  /** Armor values by location */
  readonly armor: Readonly<Record<CombatLocation, number>>;
  /** Rear armor values (for torso locations) */
  readonly rearArmor: Readonly<
    Record<'center_torso' | 'left_torso' | 'right_torso', number>
  >;
  /** Internal structure values by location */
  readonly structure: Readonly<Record<CombatLocation, number>>;
  /** Destroyed locations */
  readonly destroyedLocations: readonly CombatLocation[];
  /** Pilot wounds */
  readonly pilotWounds: number;
  /** Is pilot conscious? */
  readonly pilotConscious: boolean;
  /** Is unit destroyed? */
  readonly destroyed: boolean;
  /** Destruction cause */
  readonly destructionCause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed';
}

/**
 * Result of applying damage to a location, including the updated state.
 */
export interface ILocationDamageResult {
  /** Updated state after applying damage */
  state: IUnitDamageState;
  /** Damage details for this location */
  result: ILocationDamage;
}

/**
 * Result of applying damage with transfer chain.
 */
export interface IDamageWithTransferResult {
  /** Updated state after all damage applied */
  state: IUnitDamageState;
  /** Damage details for each location in the transfer chain */
  results: ILocationDamage[];
}

/**
 * Result of applying pilot damage.
 */
export interface IPilotDamageResultWithState {
  /** Updated state after pilot damage */
  state: IUnitDamageState;
  /** Pilot damage details */
  result: IPilotDamageResult;
}

/**
 * Result of checking unit destruction.
 */
export interface IDestructionCheckResult {
  /** Updated state (may have destruction flags set) */
  state: IUnitDamageState;
  /** Whether unit is destroyed */
  destroyed: boolean;
  /** Cause of destruction if destroyed */
  cause?: 'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed';
}

/**
 * Result of complete damage resolution.
 */
export interface IResolveDamageResult {
  /** Updated state after all damage resolved */
  state: IUnitDamageState;
  /** Full damage result details */
  result: IDamageResult;
}

/**
 * Result of terrain-enhanced damage resolution.
 */
export interface ITerrainDamageResult extends IResolveDamageResult {
  /** Terrain effects that were applied */
  terrainEffects?: {
    /** Whether drowning check was triggered */
    drowningCheckTriggered: boolean;
    /** PSR roll for drowning if triggered */
    drowningRoll?: ReturnType<typeof roll2d6>;
    /** Whether drowning check was passed */
    drowningCheckPassed?: boolean;
    /** Additional damage from failed drowning check */
    drowningDamage?: number;
  };
}

// =============================================================================
// Standard Structure Values
// =============================================================================

/**
 * Standard internal structure values by tonnage.
 * Key is tonnage, value is structure points for each location.
 */
export const STANDARD_STRUCTURE_TABLE: Readonly<
  Record<
    number,
    {
      head: number;
      centerTorso: number;
      sideTorso: number;
      arm: number;
      leg: number;
    }
  >
> = {
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
// Helper Functions
// =============================================================================

/**
 * Check if a location is in the destroyed locations array.
 */
function isLocationDestroyed(
  state: IUnitDamageState,
  location: CombatLocation,
): boolean {
  return state.destroyedLocations.includes(location);
}

/**
 * Add a location to the destroyed locations array (immutably).
 */
function addDestroyedLocation(
  destroyedLocations: readonly CombatLocation[],
  location: CombatLocation,
): readonly CombatLocation[] {
  if (destroyedLocations.includes(location)) {
    return destroyedLocations;
  }
  return [...destroyedLocations, location];
}

// =============================================================================
// Damage Application
// =============================================================================

/**
 * Apply damage to a single location.
 * Returns new state and the damage result (immutable).
 */
export function applyDamageToLocation(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): ILocationDamageResult {
  // Check if location is already destroyed
  if (isLocationDestroyed(state, location)) {
    // Damage transfers to next location
    const transferTo = getTransferCombatLocation(location);
    if (transferTo) {
      return {
        state,
        result: {
          location,
          damage,
          armorDamage: 0,
          structureDamage: 0,
          armorRemaining: 0,
          structureRemaining: 0,
          destroyed: true,
          transferredDamage: damage,
          transferLocation: transferTo,
        },
      };
    }
    // No transfer location (head, CT) - unit destroyed
    return {
      state,
      result: {
        location,
        damage,
        armorDamage: 0,
        structureDamage: 0,
        armorRemaining: 0,
        structureRemaining: 0,
        destroyed: true,
        transferredDamage: 0,
      },
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

  // Build new state incrementally
  let newArmor = { ...state.armor };
  let newRearArmor = { ...state.rearArmor };
  let newStructure = { ...state.structure };
  let newDestroyedLocations = state.destroyedLocations;

  // Apply to armor first
  if (currentArmor > 0) {
    armorDamage = Math.min(currentArmor, remainingDamage);
    remainingDamage -= armorDamage;

    // Update armor (immutably)
    if (isRear) {
      const rearKey = armorKey as 'center_torso' | 'left_torso' | 'right_torso';
      newRearArmor = { ...newRearArmor, [rearKey]: currentArmor - armorDamage };
    } else {
      newArmor = { ...newArmor, [location]: currentArmor - armorDamage };
    }
  }

  // Apply remaining to structure
  if (remainingDamage > 0 && currentStructure > 0) {
    structureDamage = Math.min(currentStructure, remainingDamage);
    remainingDamage -= structureDamage;

    // Update structure (immutably)
    newStructure = {
      ...newStructure,
      [armorKey]: currentStructure - structureDamage,
    };

    // Check for destruction
    if (newStructure[armorKey] <= 0) {
      destroyed = true;
      newDestroyedLocations = addDestroyedLocation(
        newDestroyedLocations,
        location,
      );
      if (isRear) {
        // Also mark front as destroyed
        newDestroyedLocations = addDestroyedLocation(
          newDestroyedLocations,
          armorKey,
        );
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
    ? newRearArmor[armorKey as 'center_torso' | 'left_torso' | 'right_torso']
    : newArmor[location];
  const structureRemaining = newStructure[armorKey];

  const newState: IUnitDamageState = {
    ...state,
    armor: newArmor,
    rearArmor: newRearArmor,
    structure: newStructure,
    destroyedLocations: newDestroyedLocations,
  };

  return {
    state: newState,
    result: {
      location,
      damage,
      armorDamage,
      structureDamage,
      armorRemaining,
      structureRemaining,
      destroyed,
      transferredDamage,
      transferLocation:
        transferredDamage > 0
          ? (getTransferCombatLocation(location) ?? undefined)
          : undefined,
    },
  };
}

/**
 * Apply damage with full transfer chain.
 * Handles damage transfer when locations are destroyed (immutable).
 */
export function applyDamageWithTransfer(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): IDamageWithTransferResult {
  const results: ILocationDamage[] = [];
  let currentState = state;
  let currentLocation: CombatLocation | null = location;
  let currentDamage = damage;

  while (currentLocation && currentDamage > 0) {
    const { state: newState, result } = applyDamageToLocation(
      currentState,
      currentLocation,
      currentDamage,
    );
    currentState = newState;
    results.push(result);

    if (result.transferredDamage > 0 && result.transferLocation) {
      currentLocation = result.transferLocation;
      currentDamage = result.transferredDamage;
    } else {
      break;
    }
  }

  return {
    state: currentState,
    results,
  };
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
    return {
      triggered: false,
      roll: { dice: [0, 0], total: 0, isSnakeEyes: false, isBoxcars: false },
    };
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
 * Apply pilot damage from various sources (immutable).
 */
export function applyPilotDamage(
  state: IUnitDamageState,
  wounds: number,
  source:
    | 'head_hit'
    | 'ammo_explosion'
    | 'mech_destruction'
    | 'fall'
    | 'physical_attack'
    | 'heat',
): IPilotDamageResultWithState {
  const newPilotWounds = state.pilotWounds + wounds;
  const dead = newPilotWounds >= 6;

  // Consciousness check required if wounded
  const consciousnessCheckRequired = wounds > 0 && !dead;
  let consciousnessRoll: ReturnType<typeof roll2d6> | undefined;
  let consciousnessTarget: number | undefined;
  let conscious: boolean | undefined;
  let newPilotConscious = state.pilotConscious;
  let newDestroyed = state.destroyed;
  let newDestructionCause = state.destructionCause;

  if (consciousnessCheckRequired) {
    // Target number: 3 + total wounds
    consciousnessTarget = 3 + newPilotWounds;
    consciousnessRoll = roll2d6();
    conscious = consciousnessRoll.total > consciousnessTarget;

    if (!conscious) {
      newPilotConscious = false;
    }
  }

  if (dead) {
    newPilotConscious = false;
    newDestroyed = true;
    newDestructionCause = 'pilot_death';
  }

  const newState: IUnitDamageState = {
    ...state,
    pilotWounds: newPilotWounds,
    pilotConscious: newPilotConscious,
    destroyed: newDestroyed,
    destructionCause: newDestructionCause,
  };

  return {
    state: newState,
    result: {
      source,
      woundsInflicted: wounds,
      totalWounds: newPilotWounds,
      consciousnessCheckRequired,
      consciousnessRoll,
      consciousnessTarget,
      conscious,
      dead,
    },
  };
}

// =============================================================================
// Unit Destruction Checks
// =============================================================================

/**
 * Check if unit is destroyed based on current state (immutable).
 */
export function checkUnitDestruction(
  state: IUnitDamageState,
): IDestructionCheckResult {
  // Already destroyed
  if (state.destroyed) {
    return {
      state,
      destroyed: true,
      cause: state.destructionCause ?? 'damage',
    };
  }

  // Head destroyed
  if (isLocationDestroyed(state, 'head')) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'damage',
    };
    return { state: newState, destroyed: true, cause: 'damage' };
  }

  // Center torso destroyed
  if (isLocationDestroyed(state, 'center_torso')) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'damage',
    };
    return { state: newState, destroyed: true, cause: 'damage' };
  }

  // Pilot dead
  if (state.pilotWounds >= 6) {
    const newState: IUnitDamageState = {
      ...state,
      destroyed: true,
      destructionCause: 'pilot_death',
    };
    return { state: newState, destroyed: true, cause: 'pilot_death' };
  }

  return { state, destroyed: false };
}

// =============================================================================
// Complete Damage Resolution
// =============================================================================

/**
 * Apply complete damage from an attack (immutable).
 * Handles armor, structure, transfer, criticals, and pilot damage.
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): IResolveDamageResult {
  let currentState = state;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(currentState, location, damage);
  currentState = stateAfterDamage;

  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  // Check for pilot damage from head hit
  if (isHeadHit(location) && damage > 0) {
    const { state: stateAfterPilot, result } = applyPilotDamage(
      currentState,
      1,
      'head_hit',
    );
    currentState = stateAfterPilot;
    pilotDamage = result;
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
  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(currentState);
  currentState = stateAfterDestruction;

  return {
    state: currentState,
    result: {
      locationDamages,
      criticalHits,
      pilotDamage,
      unitDestroyed: destroyed,
      destructionCause: cause,
    },
  };
}

// =============================================================================
// Terrain-Enhanced Damage Resolution
// =============================================================================

/**
 * Check if terrain has water at depth 2 or greater.
 */
function hasDeepWater(terrain: IHexTerrain | null): number {
  if (!terrain) return 0;

  const waterFeature = terrain.features.find(
    (f) => f.type === TerrainType.Water,
  );
  return waterFeature && waterFeature.level >= 2 ? waterFeature.level : 0;
}

/**
 * Check if damage result indicates a fall (location destroyed).
 */
function indicatesFall(damageResult: IDamageResult): boolean {
  return damageResult.locationDamages.some((ld) => ld.destroyed);
}

/**
 * Apply damage with terrain effects consideration.
 * Extends resolveDamage with terrain-specific mechanics like drowning checks.
 */
export function applyDamageWithTerrainEffects(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  terrain: IHexTerrain | null,
): ITerrainDamageResult {
  const baseResult = resolveDamage(state, location, damage);

  if (!terrain) {
    return baseResult;
  }

  const waterDepth = hasDeepWater(terrain);
  const unitFell = indicatesFall(baseResult.result);

  if (waterDepth >= 2 && unitFell) {
    const drowningRoll = roll2d6();
    const psrTarget = 5;
    const drowningCheckPassed = drowningRoll.total >= psrTarget;

    if (!drowningCheckPassed) {
      const drowningDamage = 1;
      const drowningResult = resolveDamage(
        baseResult.state,
        'center_torso',
        drowningDamage,
      );

      return {
        state: drowningResult.state,
        result: {
          ...drowningResult.result,
          locationDamages: [
            ...baseResult.result.locationDamages,
            ...drowningResult.result.locationDamages,
          ],
        },
        terrainEffects: {
          drowningCheckTriggered: true,
          drowningRoll,
          drowningCheckPassed: false,
          drowningDamage,
        },
      };
    }

    return {
      ...baseResult,
      terrainEffects: {
        drowningCheckTriggered: true,
        drowningRoll,
        drowningCheckPassed: true,
      },
    };
  }

  return baseResult;
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
  rearArmorValues: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  >,
): IUnitDamageState {
  const structureTable =
    STANDARD_STRUCTURE_TABLE[tonnage] ?? STANDARD_STRUCTURE_TABLE[50];

  const structure: Record<CombatLocation, number> = {
    head: structureTable.head,
    center_torso: structureTable.centerTorso,
    center_torso_rear: structureTable.centerTorso, // Shares with front
    left_torso: structureTable.sideTorso,
    left_torso_rear: structureTable.sideTorso,
    right_torso: structureTable.sideTorso,
    right_torso_rear: structureTable.sideTorso,
    left_arm: structureTable.arm,
    right_arm: structureTable.arm,
    left_leg: structureTable.leg,
    right_leg: structureTable.leg,
  };

  return {
    armor: { ...armorValues },
    rearArmor: { ...rearArmorValues },
    structure,
    destroyedLocations: [],
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
  location: CombatLocation,
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;

  const armor = isRear
    ? (state.rearArmor[
        armorKey as 'center_torso' | 'left_torso' | 'right_torso'
      ] ?? 0)
    : (state.armor[location] ?? 0);
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
  maxStructure: number,
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;

  const currentArmor = isRear
    ? (state.rearArmor[
        armorKey as 'center_torso' | 'left_torso' | 'right_torso'
      ] ?? 0)
    : (state.armor[location] ?? 0);
  const currentStructure = state.structure[armorKey] ?? 0;

  const maxTotal = maxArmor + maxStructure;
  const currentTotal = currentArmor + currentStructure;

  return maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
}
