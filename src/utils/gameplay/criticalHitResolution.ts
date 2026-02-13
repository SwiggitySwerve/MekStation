/**
 * Critical Hit Resolution Module
 * Implements BattleTech critical hit determination, slot selection,
 * and all component effect types.
 *
 * Pure function module — no side effects, injectable DiceRoller.
 *
 * @spec openspec/changes/full-combat-parity/specs/critical-hit-resolution/spec.md
 * @spec openspec/changes/full-combat-parity/specs/critical-hit-system/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  CombatLocation,
  CriticalEffectType,
  ICriticalEffect,
} from '@/types/gameplay';
import {
  IComponentDamageState,
  IUnitGameState,
  ICriticalHitResolvedPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
  IPilotHitPayload,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import { D6Roller, roll2d6 } from './hitLocation';

// =============================================================================
// Constants
// =============================================================================

/** Engine is destroyed after this many critical hits */
const ENGINE_DESTRUCTION_THRESHOLD = 3;

/** Heat added per engine critical hit (+5 heat/turn per hit) */
const ENGINE_HEAT_PER_HIT = 5;

/** Gyro PSR modifier per hit (+3 per gyro hit) */
const GYRO_PSR_MODIFIER_PER_HIT = 3;

/** Number of gyro hits that prevent standing */
const GYRO_CANNOT_STAND_THRESHOLD = 2;

/** Sentinel value indicating the unit cannot stand at all */
const CANNOT_STAND_PENALTY = 999;

/** Number of wounds that instantly kill a pilot (lethal) */
const LETHAL_PILOT_WOUNDS = 6;

/** To-hit modifier for destroyed shoulder actuator */
const SHOULDER_TO_HIT_MODIFIER = 4;

/** PSR modifier for destroyed hip actuator */
const HIP_PSR_MODIFIER = 2;

/** PSR modifier for destroyed upper/lower leg actuator */
const LEG_ACTUATOR_PSR_MODIFIER = 1;

/** PSR modifier for destroyed foot actuator */
const FOOT_PSR_MODIFIER = 1;

/** To-hit modifier for destroyed upper arm actuator */
const UPPER_ARM_TO_HIT_MODIFIER = 1;

/** To-hit modifier for destroyed lower arm actuator */
const LOWER_ARM_TO_HIT_MODIFIER = 1;

/** To-hit modifier for destroyed hand actuator */
const HAND_TO_HIT_MODIFIER = 1;

/** To-hit modifier for destroyed upper leg actuator */
const UPPER_LEG_TO_HIT_MODIFIER = 2;

/** To-hit modifier for destroyed lower leg actuator */
const LOWER_LEG_TO_HIT_MODIFIER = 2;

/** To-hit modifier for destroyed foot actuator */
const FOOT_TO_HIT_MODIFIER = 1;

// =============================================================================
// Types
// =============================================================================

/**
 * Component type identifier for critical slot manifest entries.
 */
export type CriticalSlotComponentType =
  | 'engine'
  | 'gyro'
  | 'cockpit'
  | 'sensor'
  | 'life_support'
  | 'actuator'
  | 'weapon'
  | 'ammo'
  | 'heat_sink'
  | 'jump_jet'
  | 'equipment';

/**
 * A single slot in the critical slot manifest.
 */
export interface ICriticalSlotEntry {
  /** Slot index within the location (0-based) */
  readonly slotIndex: number;
  /** Component type */
  readonly componentType: CriticalSlotComponentType;
  /** Component name (e.g., weapon name, actuator type) */
  readonly componentName: string;
  /** Whether this slot is destroyed */
  readonly destroyed: boolean;
  /** For actuators, the specific type */
  readonly actuatorType?: ActuatorType;
  /** For weapons, whether it's already destroyed */
  readonly weaponId?: string;
}

/**
 * Critical slot manifest for an entire unit.
 * Maps location -> array of slot entries.
 */
export type CriticalSlotManifest = Readonly<
  Record<string, readonly ICriticalSlotEntry[]>
>;

/**
 * Result of a critical hit determination roll.
 */
export interface ICriticalHitDeterminationResult {
  /** The 2d6 roll */
  readonly roll: { readonly dice: readonly number[]; readonly total: number };
  /** Number of critical hits (0, 1, 2, 3) */
  readonly criticalHits: number;
  /** If roll was 12, location-dependent effect */
  readonly limbBlownOff: boolean;
  readonly headDestroyed: boolean;
}

/**
 * Result of applying a single critical hit to a slot.
 */
export interface ICriticalHitApplicationResult {
  /** The slot that was hit */
  readonly slot: ICriticalSlotEntry;
  /** The effect applied */
  readonly effect: ICriticalEffect;
  /** Events to emit (CriticalHitResolved, PSRTriggered, UnitDestroyed, etc.) */
  readonly events: readonly CriticalHitEvent[];
  /** Updated component damage state */
  readonly updatedComponentDamage: IComponentDamageState;
}

/**
 * Complete result of resolving all critical hits at a location.
 */
export interface ICriticalResolutionResult {
  /** Individual hit results */
  readonly hits: readonly ICriticalHitApplicationResult[];
  /** All events to emit */
  readonly events: readonly CriticalHitEvent[];
  /** Updated critical slot manifest */
  readonly updatedManifest: CriticalSlotManifest;
  /** Updated component damage state */
  readonly updatedComponentDamage: IComponentDamageState;
  /** Whether location was blown off (roll of 12 on limb) */
  readonly locationBlownOff: boolean;
  /** Whether head was destroyed (roll of 12 on head) */
  readonly headDestroyed: boolean;
  /** Whether unit was destroyed by a critical effect */
  readonly unitDestroyed: boolean;
  /** Destruction cause if applicable */
  readonly destructionCause?: 'engine_destroyed' | 'pilot_death';
}

/**
 * Event union type for critical hit resolution outputs.
 */
export type CriticalHitEvent =
  | { type: 'critical_hit_resolved'; payload: ICriticalHitResolvedPayload }
  | { type: 'psr_triggered'; payload: IPSRTriggeredPayload }
  | {
      type: 'unit_destroyed';
      payload: IUnitDestroyedPayload;
    }
  | { type: 'pilot_hit'; payload: IPilotHitPayload };

// =============================================================================
// Hardened Armor Helpers
// =============================================================================

/**
 * Check if an armor type uses hardened armor rules (double crit roll, TAC prevention).
 *
 * @spec openspec/specs/hardened-armor-combat/spec.md
 */
export function isHardenedArmor(armorType?: ArmorTypeEnum): boolean {
  return armorType === ArmorTypeEnum.HARDENED;
}

// =============================================================================
// Ferro-Lamellor Armor Helpers
// =============================================================================

/**
 * Check if an armor type uses Ferro-Lamellor rules (crit count halving).
 *
 * @spec openspec/specs/ferro-lamellor-armor-combat/spec.md
 */
export function isFerroLamellorArmor(armorType?: ArmorTypeEnum): boolean {
  return armorType === ArmorTypeEnum.FERRO_LAMELLOR;
}

/**
 * Halve a critical hit count for Ferro-Lamellor armor.
 * Returns floor(critCount / 2) with a minimum of 1 (when critCount > 0).
 * A critCount of 0 remains 0.
 *
 * @spec openspec/specs/ferro-lamellor-armor-combat/spec.md
 */
export function halveCritCount(critCount: number): number {
  if (critCount <= 0) return 0;
  return Math.max(Math.floor(critCount / 2), 1);
}

// =============================================================================
// Critical Hit Determination (Task 5.2, 5.3)
// =============================================================================

/**
 * Roll 2d6 on the critical hit determination table.
 * 2-7: 0 crits, 8-9: 1 crit, 10-11: 2 crits, 12: location-dependent
 */
export function rollCriticalHits(
  location: CombatLocation,
  diceRoller: D6Roller,
): ICriticalHitDeterminationResult {
  const roll = roll2d6(diceRoller);

  if (roll.total <= 7) {
    return {
      roll,
      criticalHits: 0,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (roll.total <= 9) {
    return {
      roll,
      criticalHits: 1,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (roll.total <= 11) {
    return {
      roll,
      criticalHits: 2,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  // Roll of 12: location-dependent
  const isLimb =
    location === 'left_arm' ||
    location === 'right_arm' ||
    location === 'left_leg' ||
    location === 'right_leg';

  const isHead = location === 'head';

  if (isLimb) {
    return {
      roll,
      criticalHits: 0, // Limb blown off, no individual crits
      limbBlownOff: true,
      headDestroyed: false,
    };
  }

  if (isHead) {
    return {
      roll,
      criticalHits: 0, // Head destroyed, no individual crits
      limbBlownOff: false,
      headDestroyed: true,
    };
  }

  // Torso: 3 critical hits
  return {
    roll,
    criticalHits: 3,
    limbBlownOff: false,
    headDestroyed: false,
  };
}

// =============================================================================
// Critical Slot Manifest (Task 5.5)
// =============================================================================

/**
 * Default critical slot manifest for a standard biped mech.
 * Maps each location to its standard component slots.
 *
 * In a full implementation, this would be built from unit construction data.
 * This provides the default template for a standard biped mech.
 */
export function buildDefaultCriticalSlotManifest(): CriticalSlotManifest {
  return {
    head: [
      {
        slotIndex: 0,
        componentType: 'life_support',
        componentName: 'Life Support',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'sensor',
        componentName: 'Sensors',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'cockpit',
        componentName: 'Cockpit',
        destroyed: false,
      },
      {
        slotIndex: 3,
        componentType: 'sensor',
        componentName: 'Sensors',
        destroyed: false,
      },
      {
        slotIndex: 4,
        componentType: 'life_support',
        componentName: 'Life Support',
        destroyed: false,
      },
    ],
    center_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 3,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 4,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 5,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 6,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
    ],
    left_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
    ],
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
    ],
    left_arm: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.SHOULDER,
        destroyed: false,
        actuatorType: ActuatorType.SHOULDER,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_ARM,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_ARM,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.HAND,
        destroyed: false,
        actuatorType: ActuatorType.HAND,
      },
    ],
    right_arm: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.SHOULDER,
        destroyed: false,
        actuatorType: ActuatorType.SHOULDER,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_ARM,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_ARM,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.HAND,
        destroyed: false,
        actuatorType: ActuatorType.HAND,
      },
    ],
    left_leg: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.HIP,
        destroyed: false,
        actuatorType: ActuatorType.HIP,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_LEG,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_LEG,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.FOOT,
        destroyed: false,
        actuatorType: ActuatorType.FOOT,
      },
    ],
    right_leg: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.HIP,
        destroyed: false,
        actuatorType: ActuatorType.HIP,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_LEG,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_LEG,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.FOOT,
        destroyed: false,
        actuatorType: ActuatorType.FOOT,
      },
    ],
  };
}

/**
 * Build a critical slot manifest from unit construction data.
 * Accepts an optional override for custom equipment placement.
 * Falls back to default manifest if no construction data provided.
 */
export function buildCriticalSlotManifest(
  customSlots?: Partial<Record<string, readonly ICriticalSlotEntry[]>>,
): CriticalSlotManifest {
  const base = buildDefaultCriticalSlotManifest();
  if (!customSlots) return base;

  const result: Record<string, readonly ICriticalSlotEntry[]> = { ...base };
  for (const [loc, slots] of Object.entries(customSlots)) {
    if (slots) {
      result[loc] = slots;
    }
  }
  return result;
}

// =============================================================================
// Critical Slot Selection (Task 5.4)
// =============================================================================

/**
 * Select a random critical slot from occupied, non-destroyed slots in a location.
 * Returns null if all slots are destroyed or location has no slots.
 */
export function selectCriticalSlot(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
  diceRoller: D6Roller,
): ICriticalSlotEntry | null {
  // Normalize rear locations to front for manifest lookup
  const normalizedLocation = normalizeLocation(location);
  const slots = manifest[normalizedLocation];
  if (!slots || slots.length === 0) return null;

  const availableSlots = slots.filter((s) => !s.destroyed);
  if (availableSlots.length === 0) return null;

  // Use dice roller for random selection
  // Generate a number in range [0, availableSlots.length)
  const roll = diceRoller();
  const index = (roll - 1) % availableSlots.length;
  return availableSlots[index];
}

/**
 * Normalize rear combat locations to front for manifest lookup.
 */
function normalizeLocation(location: CombatLocation): string {
  switch (location) {
    case 'center_torso_rear':
      return 'center_torso';
    case 'left_torso_rear':
      return 'left_torso';
    case 'right_torso_rear':
      return 'right_torso';
    default:
      return location;
  }
}

// =============================================================================
// Component Effect Resolution (Tasks 5.6 – 5.13)
// =============================================================================

/**
 * Apply a critical hit to a specific component and return the effect.
 */
export function applyCriticalHitEffect(
  slot: ICriticalSlotEntry,
  unitId: string,
  location: CombatLocation,
  componentDamage: IComponentDamageState,
): ICriticalHitApplicationResult {
  const events: CriticalHitEvent[] = [];
  let updatedDamage = { ...componentDamage };

  let effect: ICriticalEffect;

  switch (slot.componentType) {
    case 'engine':
      ({ effect, updatedDamage } = applyEngineHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'gyro':
      ({ effect, updatedDamage } = applyGyroHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'cockpit':
      ({ effect, updatedDamage } = applyCockpitHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'sensor':
      ({ effect, updatedDamage } = applySensorHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'life_support':
      ({ effect, updatedDamage } = applyLifeSupportHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'actuator':
      ({ effect, updatedDamage } = applyActuatorHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'weapon':
      ({ effect, updatedDamage } = applyWeaponHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'heat_sink':
      ({ effect, updatedDamage } = applyHeatSinkHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'jump_jet':
      ({ effect, updatedDamage } = applyJumpJetHit(
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    case 'ammo':
      ({ effect, updatedDamage } = applyAmmoHit(
        slot,
        unitId,
        location,
        updatedDamage,
        events,
      ));
      break;
    default:
      effect = {
        type: CriticalEffectType.EquipmentDestroyed,
        equipmentDestroyed: slot.componentName,
      };
      break;
  }

  // Always emit the CriticalHitResolved event
  events.unshift({
    type: 'critical_hit_resolved',
    payload: {
      unitId,
      location,
      slotIndex: slot.slotIndex,
      componentType: slot.componentType,
      componentName: slot.componentName,
      effect: describeEffect(effect),
      destroyed: true,
    },
  });

  return {
    slot,
    effect,
    events,
    updatedComponentDamage: updatedDamage,
  };
}

// =============================================================================
// Individual Component Effects
// =============================================================================

/** Task 5.6: Engine critical — +5 heat/hit, 3rd hit = destruction */
function applyEngineHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.engineHits + 1;
  const updatedDamage = { ...componentDamage, engineHits: newHits };

  if (newHits >= ENGINE_DESTRUCTION_THRESHOLD) {
    events.push({
      type: 'unit_destroyed',
      payload: {
        unitId,
        cause: 'damage',
      },
    });
  }

  return {
    effect: {
      type: CriticalEffectType.EngineHit,
      heatAdded: ENGINE_HEAT_PER_HIT,
    },
    updatedDamage,
  };
}

/** Task 5.7: Gyro critical — +3 PSR/hit, immediate PSR, 2nd hit = fall/destruction */
function applyGyroHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.gyroHits + 1;
  const updatedDamage = { ...componentDamage, gyroHits: newHits };

  // Immediate PSR on any gyro hit
  events.push({
    type: 'psr_triggered',
    payload: {
      unitId,
      reason: 'Gyro hit',
      additionalModifier: GYRO_PSR_MODIFIER_PER_HIT * newHits,
      triggerSource: 'gyro_critical',
    },
  });

  return {
    effect: {
      type: CriticalEffectType.GyroHit,
      movementPenalty:
        newHits >= GYRO_CANNOT_STAND_THRESHOLD ? CANNOT_STAND_PENALTY : 0,
    },
    updatedDamage,
  };
}

/** Task 5.8: Cockpit critical — pilot killed */
function applyCockpitHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = { ...componentDamage, cockpitHit: true };

  events.push({
    type: 'pilot_hit',
    payload: {
      unitId,
      wounds: LETHAL_PILOT_WOUNDS,
      totalWounds: LETHAL_PILOT_WOUNDS,
      source: 'head_hit',
      consciousnessCheckRequired: false,
    },
  });

  events.push({
    type: 'unit_destroyed',
    payload: {
      unitId,
      cause: 'pilot_death',
    },
  });

  return {
    effect: {
      type: CriticalEffectType.CockpitHit,
    },
    updatedDamage,
  };
}

/** Task 5.9: Sensor critical — +1/+2 to-hit penalty */
function applySensorHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.sensorHits + 1;
  const updatedDamage = { ...componentDamage, sensorHits: newHits };

  return {
    effect: {
      type: CriticalEffectType.SensorHit,
    },
    updatedDamage,
  };
}

/** Life support critical */
function applyLifeSupportHit(
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const newHits = componentDamage.lifeSupport + 1;
  const updatedDamage = { ...componentDamage, lifeSupport: newHits };

  return {
    effect: {
      type: CriticalEffectType.LifeSupportHit,
    },
    updatedDamage,
  };
}

/**
 * Task 5.10: Actuator critical effects for all 8 types.
 *
 * Shoulder: cannot punch, +4 weapon to-hit
 * Upper arm: +1 weapon to-hit, halve punch damage
 * Lower arm: +1 weapon to-hit, halve punch damage
 * Hand: +1 weapon to-hit, no melee weapons
 * Hip: cannot kick, PSR per hex, halve MP
 * Upper leg: +2 kick to-hit, halve kick damage
 * Lower leg: +2 kick to-hit, halve kick damage
 * Foot: +1 kick to-hit, +1 PSR for terrain
 */
function applyActuatorHit(
  slot: ICriticalSlotEntry,
  unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const actuatorType = slot.actuatorType;
  const updatedDamage = {
    ...componentDamage,
    actuators: {
      ...componentDamage.actuators,
      ...(actuatorType ? { [actuatorType]: true } : {}),
    },
  };

  // Hip and leg actuators trigger PSR
  if (
    actuatorType === ActuatorType.HIP ||
    actuatorType === ActuatorType.UPPER_LEG ||
    actuatorType === ActuatorType.LOWER_LEG ||
    actuatorType === ActuatorType.FOOT
  ) {
    const modifier =
      actuatorType === ActuatorType.HIP
        ? HIP_PSR_MODIFIER
        : actuatorType === ActuatorType.FOOT
          ? FOOT_PSR_MODIFIER
          : LEG_ACTUATOR_PSR_MODIFIER;

    events.push({
      type: 'psr_triggered',
      payload: {
        unitId,
        reason: `${slot.componentName} destroyed`,
        additionalModifier: modifier,
        triggerSource: 'actuator_critical',
      },
    });
  }

  return {
    effect: {
      type: CriticalEffectType.ActuatorHit,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage,
  };
}

/** Task 5.11: Weapon critical — mark destroyed */
function applyWeaponHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const weaponName = slot.weaponId ?? slot.componentName;
  const updatedDamage = {
    ...componentDamage,
    weaponsDestroyed: [...componentDamage.weaponsDestroyed, weaponName],
  };

  return {
    effect: {
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: slot.componentName,
      weaponDisabled: weaponName,
    },
    updatedDamage,
  };
}

/** Task 5.12: Heat sink critical — reduce dissipation by 1 (single) or 2 (double) */
function applyHeatSinkHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    heatSinksDestroyed: componentDamage.heatSinksDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.HeatSinkDestroyed,
    },
    updatedDamage,
  };
}

/** Task 5.13: Jump jet critical — reduce max jump MP by 1 */
function applyJumpJetHit(
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  const updatedDamage = {
    ...componentDamage,
    jumpJetsDestroyed: componentDamage.jumpJetsDestroyed + 1,
  };

  return {
    effect: {
      type: CriticalEffectType.JumpJetDestroyed,
    },
    updatedDamage,
  };
}

/**
 * Ammo critical — triggers ammo explosion.
 * The explosion result is attached to the effect for the caller to process
 * (apply damage to IS at bin location, handle CASE, etc.).
 */
function applyAmmoHit(
  slot: ICriticalSlotEntry,
  _unitId: string,
  _location: CombatLocation,
  componentDamage: IComponentDamageState,
  _events: CriticalHitEvent[],
): { effect: ICriticalEffect; updatedDamage: IComponentDamageState } {
  return {
    effect: {
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage: componentDamage,
  };
}

// =============================================================================
// Full Critical Hit Resolution
// =============================================================================

/**
 * Resolve all critical hits at a location.
 * This is the main entry point for critical hit resolution.
 *
 * @param unitId - The unit taking critical hits
 * @param location - The combat location being critted
 * @param manifest - The unit's critical slot manifest
 * @param componentDamage - Current component damage state
 * @param diceRoller - Injectable dice roller
 * @param forceCrits - Override the determination roll (for TAC, testing)
 */
export function resolveCriticalHits(
  unitId: string,
  location: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  forceCrits?: number,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult {
  let critCount: number;
  let limbBlownOff = false;
  let headDestroyed = false;

  if (forceCrits !== undefined) {
    critCount = forceCrits;
  } else if (isHardenedArmor(armorType)) {
    // Hardened armor: roll twice, both must indicate crits
    const roll1 = rollCriticalHits(location, diceRoller);
    const roll2 = rollCriticalHits(location, diceRoller);

    if (roll1.criticalHits === 0 || roll2.criticalHits === 0) {
      critCount = 0;
    } else {
      critCount = Math.min(roll1.criticalHits, roll2.criticalHits);
    }

    // Limb blowoff / head destruction only if BOTH rolls produce that result
    limbBlownOff = roll1.limbBlownOff && roll2.limbBlownOff;
    headDestroyed = roll1.headDestroyed && roll2.headDestroyed;
  } else {
    const determination = rollCriticalHits(location, diceRoller);
    critCount = determination.criticalHits;
    limbBlownOff = determination.limbBlownOff;
    headDestroyed = determination.headDestroyed;

    // Ferro-Lamellor armor: halve the crit count (floor, min 1)
    if (isFerroLamellorArmor(armorType) && critCount > 0) {
      critCount = halveCritCount(critCount);
    }
  }

  const allEvents: CriticalHitEvent[] = [];
  const hits: ICriticalHitApplicationResult[] = [];
  let currentDamage = componentDamage;
  let currentManifest = { ...manifest };
  let unitDestroyed = false;
  let destructionCause: 'engine_destroyed' | 'pilot_death' | undefined;

  // Handle limb blown off
  if (limbBlownOff) {
    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];
    // Destroy ALL slots in the location
    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((s) => ({ ...s, destroyed: true })),
    };

    // Apply effects for each destroyed slot
    for (const slot of slots.filter((s) => !s.destroyed)) {
      const result = applyCriticalHitEffect(
        slot,
        unitId,
        location,
        currentDamage,
      );
      hits.push(result);
      allEvents.push(...result.events);
      currentDamage = result.updatedComponentDamage;

      if (
        result.events.some(
          (e) =>
            e.type === 'unit_destroyed' &&
            (e.payload as IUnitDestroyedPayload).cause === 'damage',
        )
      ) {
        unitDestroyed = true;
        destructionCause = 'engine_destroyed';
      }
      if (
        result.events.some(
          (e) =>
            e.type === 'unit_destroyed' &&
            (e.payload as IUnitDestroyedPayload).cause === 'pilot_death',
        )
      ) {
        unitDestroyed = true;
        destructionCause = 'pilot_death';
      }
    }

    return {
      hits,
      events: allEvents,
      updatedManifest: currentManifest,
      updatedComponentDamage: currentDamage,
      locationBlownOff: true,
      headDestroyed: false,
      unitDestroyed,
      destructionCause,
    };
  }

  // Handle head destroyed
  if (headDestroyed) {
    allEvents.push({
      type: 'pilot_hit',
      payload: {
        unitId,
        wounds: LETHAL_PILOT_WOUNDS,
        totalWounds: LETHAL_PILOT_WOUNDS,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      },
    });
    allEvents.push({
      type: 'unit_destroyed',
      payload: {
        unitId,
        cause: 'pilot_death',
      },
    });

    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];
    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((s) => ({ ...s, destroyed: true })),
    };

    return {
      hits: [],
      events: allEvents,
      updatedManifest: currentManifest,
      updatedComponentDamage: currentDamage,
      locationBlownOff: false,
      headDestroyed: true,
      unitDestroyed: true,
      destructionCause: 'pilot_death',
    };
  }

  // Step 2: Apply individual critical hits
  for (let i = 0; i < critCount; i++) {
    const slot = selectCriticalSlot(currentManifest, location, diceRoller);
    if (!slot) break; // All slots destroyed

    // Mark slot as destroyed in manifest
    const normalizedLoc = normalizeLocation(location);
    const slots = currentManifest[normalizedLoc] ?? [];
    currentManifest = {
      ...currentManifest,
      [normalizedLoc]: slots.map((s) =>
        s.slotIndex === slot.slotIndex ? { ...s, destroyed: true } : s,
      ),
    };

    // Apply effect
    const result = applyCriticalHitEffect(
      slot,
      unitId,
      location,
      currentDamage,
    );
    hits.push(result);
    allEvents.push(...result.events);
    currentDamage = result.updatedComponentDamage;

    // Check for unit destruction
    if (
      result.events.some(
        (e) =>
          e.type === 'unit_destroyed' &&
          (e.payload as IUnitDestroyedPayload).cause === 'damage',
      )
    ) {
      unitDestroyed = true;
      destructionCause = 'engine_destroyed';
    }
    if (
      result.events.some(
        (e) =>
          e.type === 'unit_destroyed' &&
          (e.payload as IUnitDestroyedPayload).cause === 'pilot_death',
      )
    ) {
      unitDestroyed = true;
      destructionCause = 'pilot_death';
    }
  }

  return {
    hits,
    events: allEvents,
    updatedManifest: currentManifest,
    updatedComponentDamage: currentDamage,
    locationBlownOff: false,
    headDestroyed: false,
    unitDestroyed,
    destructionCause,
  };
}

// =============================================================================
// Through-Armor Critical (TAC) (Task 5.15)
// =============================================================================

/**
 * Determine if a hit location roll triggers a Through-Armor Critical.
 * TAC occurs on a hit location roll of 2.
 *
 * @param hitLocationRoll - The 2d6 hit location roll total
 * @returns The TAC location if triggered, or null
 */
export function checkTACTrigger(
  hitLocationRoll: number,
  firingArc: 'front' | 'rear' | 'left' | 'right',
): CombatLocation | null {
  if (hitLocationRoll !== 2) return null;

  // TAC location depends on firing arc:
  // Front/Rear → Center Torso
  // Left → Left Torso
  // Right → Right Torso
  switch (firingArc) {
    case 'front':
    case 'rear':
      return 'center_torso';
    case 'left':
      return 'left_torso';
    case 'right':
      return 'right_torso';
  }
}

export function processTAC(
  unitId: string,
  tacLocation: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult {
  // Hardened armor completely prevents TAC
  if (isHardenedArmor(armorType)) {
    return {
      hits: [],
      events: [],
      updatedManifest: manifest,
      updatedComponentDamage: componentDamage,
      locationBlownOff: false,
      headDestroyed: false,
      unitDestroyed: false,
    };
  }

  return resolveCriticalHits(
    unitId,
    tacLocation,
    manifest,
    componentDamage,
    diceRoller,
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get a human-readable description of a critical effect.
 */
function describeEffect(effect: ICriticalEffect): string {
  switch (effect.type) {
    case CriticalEffectType.EngineHit:
      return 'Engine hit — +5 heat/turn';
    case CriticalEffectType.GyroHit:
      return 'Gyro hit — +3 PSR modifier';
    case CriticalEffectType.CockpitHit:
      return 'Cockpit hit — pilot killed';
    case CriticalEffectType.SensorHit:
      return 'Sensor hit — to-hit penalty';
    case CriticalEffectType.LifeSupportHit:
      return 'Life support hit';
    case CriticalEffectType.ActuatorHit:
      return `Actuator destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.WeaponDestroyed:
      return `Weapon destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.HeatSinkDestroyed:
      return 'Heat sink destroyed — -1 dissipation';
    case CriticalEffectType.JumpJetDestroyed:
      return 'Jump jet destroyed — -1 jump MP';
    case CriticalEffectType.AmmoExplosion:
      return `Ammo hit: ${effect.equipmentDestroyed ?? 'unknown'}`;
    case CriticalEffectType.EquipmentDestroyed:
      return `Equipment destroyed: ${effect.equipmentDestroyed ?? 'unknown'}`;
    default:
      return 'Unknown critical effect';
  }
}

/**
 * Get the actuator to-hit modifier for a given actuator type.
 * Used by to-hit calculation in other modules.
 */
export function getActuatorToHitModifier(actuatorType: ActuatorType): number {
  switch (actuatorType) {
    case ActuatorType.SHOULDER:
      return SHOULDER_TO_HIT_MODIFIER;
    case ActuatorType.UPPER_ARM:
      return UPPER_ARM_TO_HIT_MODIFIER;
    case ActuatorType.LOWER_ARM:
      return LOWER_ARM_TO_HIT_MODIFIER;
    case ActuatorType.HAND:
      return HAND_TO_HIT_MODIFIER;
    case ActuatorType.HIP:
      return 0; // Hip doesn't add to-hit, it prevents kicking
    case ActuatorType.UPPER_LEG:
      return UPPER_LEG_TO_HIT_MODIFIER;
    case ActuatorType.LOWER_LEG:
      return LOWER_LEG_TO_HIT_MODIFIER;
    case ActuatorType.FOOT:
      return FOOT_TO_HIT_MODIFIER;
  }
}

/**
 * Check if a destroyed actuator prevents punching.
 */
export function actuatorPreventsAttack(
  actuatorType: ActuatorType,
  attackType: 'punch' | 'kick',
): boolean {
  if (attackType === 'punch') {
    return actuatorType === ActuatorType.SHOULDER;
  }
  if (attackType === 'kick') {
    return actuatorType === ActuatorType.HIP;
  }
  return false;
}

/**
 * Check if a destroyed actuator halves physical attack damage.
 */
export function actuatorHalvesDamage(
  actuatorType: ActuatorType,
  attackType: 'punch' | 'kick',
): boolean {
  if (attackType === 'punch') {
    return (
      actuatorType === ActuatorType.UPPER_ARM ||
      actuatorType === ActuatorType.LOWER_ARM
    );
  }
  if (attackType === 'kick') {
    return (
      actuatorType === ActuatorType.UPPER_LEG ||
      actuatorType === ActuatorType.LOWER_LEG
    );
  }
  return false;
}
