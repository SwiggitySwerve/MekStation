/**
 * Pilot-Mech Card Data Aggregation Service
 *
 * Aggregates pilot and mech data into a unified format for PilotMechCard display.
 * Handles calculation of effective combat statistics.
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import { IPilot, PilotStatus } from '@/types/pilot';
import { IUnitCardData } from '@/services/unit-card';
import { IPilotMechCardData, IPilotMechCardMechData } from '@/types/pilot/pilot-mech-card';

// =============================================================================
// Constants
// =============================================================================

/**
 * Base to-hit number before skill modifier (BattleTech standard).
 */
export const BASE_TO_HIT = 4;

/**
 * Base consciousness roll target before wounds (BattleTech standard).
 */
export const BASE_CONSCIOUSNESS = 3;

/**
 * Maximum wounds before pilot death.
 */
export const MAX_WOUNDS = 6;

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate the base to-hit number from gunnery skill.
 * Lower gunnery = better shooting.
 *
 * @param gunnery - Gunnery skill (1-8)
 * @returns Base to-hit number (4 + gunnery)
 */
export function calculateBaseToHit(gunnery: number): number {
  return BASE_TO_HIT + gunnery;
}

/**
 * Calculate the consciousness roll target from wounds.
 * More wounds = harder to stay conscious.
 *
 * @param wounds - Current wounds (0-6)
 * @returns Consciousness target (3 + wounds)
 */
export function calculateConsciousnessTarget(wounds: number): number {
  return BASE_CONSCIOUSNESS + wounds;
}

/**
 * Get display status string from PilotStatus enum.
 *
 * @param status - Pilot status enum value
 * @returns Human-readable status string
 */
export function getStatusDisplayName(status: PilotStatus): string {
  switch (status) {
    case PilotStatus.Active:
      return 'Active';
    case PilotStatus.Injured:
      return 'Injured';
    case PilotStatus.MIA:
      return 'MIA';
    case PilotStatus.KIA:
      return 'KIA';
    case PilotStatus.Retired:
      return 'Retired';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// Mech Data Extraction
// =============================================================================

/**
 * Extract mech data subset from full unit card data.
 *
 * @param unitData - Full unit card data
 * @returns Mech data for pilot-mech card display
 */
export function extractMechData(unitData: IUnitCardData): IPilotMechCardMechData {
  return {
    unitId: unitData.id,
    name: unitData.name,
    chassis: unitData.chassis,
    tonnage: unitData.tonnage,
    weightClass: unitData.weightClassName,
    techBase: unitData.techBaseName,
    battleValue: unitData.battleValue,
    walkMP: unitData.movement.walkMP,
    runMP: unitData.movement.runMP,
    jumpMP: unitData.movement.jumpMP,
    totalArmor: unitData.armorStructure.totalArmor,
    maxArmor: unitData.armorStructure.maxArmor,
  };
}

// =============================================================================
// Main Data Creation Function
// =============================================================================

/**
 * Create unified pilot-mech card data from pilot and optional mech.
 *
 * @param pilot - Pilot entity
 * @param mech - Optional unit card data for assigned mech
 * @returns Complete pilot-mech card data
 */
export function createPilotMechCardData(
  pilot: IPilot,
  mech: IUnitCardData | null
): IPilotMechCardData {
  // Extract ability names from pilot's ability references
  // Note: In a full implementation, you'd resolve ability IDs to names
  // For now, we use the ability IDs as names (or implement ability lookup)
  const abilityNames = pilot.abilities.map((ref) => ref.abilityId);

  return {
    // Pilot identity
    pilotId: pilot.id,
    pilotName: pilot.name,
    callsign: pilot.callsign,
    affiliation: pilot.affiliation,
    rank: pilot.career?.rank,

    // Pilot skills
    gunnery: pilot.skills.gunnery,
    piloting: pilot.skills.piloting,

    // Career stats (only for persistent pilots with career data)
    missions: pilot.career?.missionsCompleted,
    kills: pilot.career?.totalKills,
    xp: pilot.career?.xp,

    // Status
    wounds: pilot.wounds,
    status: getStatusDisplayName(pilot.status),

    // Abilities
    abilities: abilityNames,

    // Effective stats (calculated)
    baseToHit: calculateBaseToHit(pilot.skills.gunnery),
    consciousnessTarget: calculateConsciousnessTarget(pilot.wounds),

    // Mech data
    mech: mech ? extractMechData(mech) : null,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format pilot skills in standard "G/P" notation.
 *
 * @param gunnery - Gunnery skill
 * @param piloting - Piloting skill
 * @returns Formatted string like "4/5"
 */
export function formatSkills(gunnery: number, piloting: number): string {
  return `${gunnery}/${piloting}`;
}

/**
 * Check if pilot is combat-capable.
 *
 * @param data - Pilot-mech card data
 * @returns True if pilot can participate in combat
 */
export function isPilotCombatReady(data: IPilotMechCardData): boolean {
  return (
    data.status === 'Active' &&
    data.wounds < MAX_WOUNDS &&
    data.mech !== null
  );
}

/**
 * Get wound severity level for display styling.
 *
 * @param wounds - Current wounds (0-6)
 * @returns Severity level: 'none', 'light', 'moderate', 'severe', 'critical'
 */
export function getWoundSeverity(
  wounds: number
): 'none' | 'light' | 'moderate' | 'severe' | 'critical' {
  if (wounds === 0) return 'none';
  if (wounds <= 2) return 'light';
  if (wounds <= 4) return 'moderate';
  if (wounds <= 5) return 'severe';
  return 'critical';
}

/**
 * Calculate armor coverage percentage.
 *
 * @param totalArmor - Current total armor
 * @param maxArmor - Maximum possible armor
 * @returns Percentage (0-100)
 */
export function calculateArmorPercentage(totalArmor: number, maxArmor: number): number {
  if (maxArmor <= 0) return 0;
  return Math.round((totalArmor / maxArmor) * 100);
}
