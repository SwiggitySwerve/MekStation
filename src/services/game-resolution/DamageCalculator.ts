/**
 * Damage Calculator
 * Shared logic for calculating damage percentages and unit status.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { IUnitGameState } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

/**
 * Unit combat status.
 */
export type UnitCombatStatus =
  | 'operational' // Fully functional
  | 'damaged' // Light damage (<25%)
  | 'heavy_damage' // Moderate damage (25-50%)
  | 'critical' // Severe damage (>50%)
  | 'crippled' // Near destruction (>75%)
  | 'destroyed'; // Unit destroyed

/**
 * Damage assessment for a unit.
 */
export interface IDamageAssessment {
  /** Total armor damage percentage (0-100) */
  readonly armorDamagePercent: number;
  /** Total structure damage percentage (0-100) */
  readonly structureDamagePercent: number;
  /** Combined damage percentage */
  readonly overallDamagePercent: number;
  /** Number of destroyed locations */
  readonly destroyedLocations: number;
  /** Number of destroyed components */
  readonly destroyedComponents: number;
  /** Current combat status */
  readonly status: UnitCombatStatus;
  /** Can the unit still fight effectively? */
  readonly combatEffective: boolean;
}

/**
 * Location damage state.
 */
export interface ILocationDamage {
  /** Location name */
  readonly location: string;
  /** Current armor */
  readonly armorCurrent: number;
  /** Maximum armor */
  readonly armorMax: number;
  /** Current structure */
  readonly structureCurrent: number;
  /** Maximum structure */
  readonly structureMax: number;
  /** Is location destroyed? */
  readonly isDestroyed: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Damage thresholds for status determination.
 */
export const DAMAGE_THRESHOLDS = {
  /** Light damage threshold */
  DAMAGED: 0.25,
  /** Heavy damage threshold */
  HEAVY_DAMAGE: 0.5,
  /** Critical damage threshold */
  CRITICAL: 0.75,
  /** Crippled threshold */
  CRIPPLED: 0.9,
} as const;

/**
 * Standard BattleMech locations.
 */
export const MECH_LOCATIONS = [
  'head',
  'center_torso',
  'left_torso',
  'right_torso',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
] as const;

// =============================================================================
// Calculator Functions
// =============================================================================

/**
 * Calculate damage percentage for a unit.
 */
export function calculateDamagePercent(
  current: Record<string, number>,
  max: Record<string, number>
): number {
  let totalCurrent = 0;
  let totalMax = 0;

  for (const location of Object.keys(max)) {
    totalMax += max[location] || 0;
    totalCurrent += current[location] ?? max[location] ?? 0;
  }

  if (totalMax === 0) return 0;

  const damagePercent = ((totalMax - totalCurrent) / totalMax) * 100;
  return Math.min(100, Math.max(0, damagePercent));
}

/**
 * Assess damage for a unit game state.
 */
export function assessUnitDamage(
  unit: IUnitGameState,
  maxArmor: Record<string, number>,
  maxStructure: Record<string, number>
): IDamageAssessment {
  const armorDamagePercent = calculateDamagePercent(unit.armor, maxArmor);
  const structureDamagePercent = calculateDamagePercent(unit.structure, maxStructure);

  // Overall damage weighted: structure damage is more severe
  const overallDamagePercent = armorDamagePercent * 0.3 + structureDamagePercent * 0.7;

  const destroyedLocations = unit.destroyedLocations.length;
  const destroyedComponents = unit.destroyedEquipment.length;

  // Determine status
  let status: UnitCombatStatus;
  if (unit.destroyed) {
    status = 'destroyed';
  } else if (overallDamagePercent >= DAMAGE_THRESHOLDS.CRIPPLED * 100) {
    status = 'crippled';
  } else if (overallDamagePercent >= DAMAGE_THRESHOLDS.CRITICAL * 100) {
    status = 'critical';
  } else if (overallDamagePercent >= DAMAGE_THRESHOLDS.HEAVY_DAMAGE * 100) {
    status = 'heavy_damage';
  } else if (overallDamagePercent >= DAMAGE_THRESHOLDS.DAMAGED * 100) {
    status = 'damaged';
  } else {
    status = 'operational';
  }

  // Combat effectiveness check
  const combatEffective =
    !unit.destroyed &&
    unit.pilotConscious &&
    status !== 'destroyed' &&
    status !== 'crippled';

  return {
    armorDamagePercent,
    structureDamagePercent,
    overallDamagePercent,
    destroyedLocations,
    destroyedComponents,
    status,
    combatEffective,
  };
}

/**
 * Get damage state for each location.
 */
export function getLocationDamage(
  unit: IUnitGameState,
  maxArmor: Record<string, number>,
  maxStructure: Record<string, number>
): readonly ILocationDamage[] {
  const locations: ILocationDamage[] = [];

  for (const location of MECH_LOCATIONS) {
    const armorMax = maxArmor[location] ?? 0;
    const structureMax = maxStructure[location] ?? 0;
    const armorCurrent = unit.armor[location] ?? armorMax;
    const structureCurrent = unit.structure[location] ?? structureMax;
    const isDestroyed = unit.destroyedLocations.includes(location);

    locations.push({
      location,
      armorCurrent,
      armorMax,
      structureCurrent,
      structureMax,
      isDestroyed,
    });
  }

  return locations;
}

/**
 * Calculate repair cost estimate based on damage.
 * Returns cost in C-Bills (simplified calculation).
 */
export function estimateRepairCost(
  assessment: IDamageAssessment,
  unitValue: number
): number {
  // Base repair cost is a percentage of unit value based on damage
  const baseCost = unitValue * (assessment.overallDamagePercent / 100) * 0.5;

  // Additional cost for destroyed locations
  const locationCost = assessment.destroyedLocations * unitValue * 0.1;

  // Additional cost for destroyed components
  const componentCost = assessment.destroyedComponents * unitValue * 0.02;

  return Math.round(baseCost + locationCost + componentCost);
}

/**
 * Check if a unit needs critical repairs (structure damage).
 */
export function needsCriticalRepair(assessment: IDamageAssessment): boolean {
  return assessment.structureDamagePercent > 0 || assessment.destroyedLocations > 0;
}

/**
 * Calculate repair time in days (simplified).
 */
export function estimateRepairTime(assessment: IDamageAssessment): number {
  const baseDays = assessment.overallDamagePercent / 20; // ~5 days per 20% damage
  const locationDays = assessment.destroyedLocations * 3;
  const componentDays = assessment.destroyedComponents * 1;

  return Math.ceil(baseDays + locationDays + componentDays);
}

/**
 * Determine if a unit should be considered salvageable vs scrapped.
 */
export function isSalvageable(assessment: IDamageAssessment): boolean {
  // A unit is salvageable if it's not completely destroyed
  // and doesn't have too many destroyed locations
  if (assessment.status === 'destroyed') {
    // Even destroyed units might be salvageable
    return assessment.destroyedLocations < 4; // Less than half locations destroyed
  }
  return true;
}
