/**
 * The failure tables for MASC and Supercharger checks, owned in one place.
 *
 * MegaMek 48fcb2f64: a failed Supercharger check rolls 2d6 on the hits table
 * (`TWRulesEquipment.getMascSuperChargerFailureHits`, L259-L285) and takes that
 * many engine criticals (`Entity.java` L16570-L16580). A failed MASC check puts
 * one slot per leg in the crit list (`TWRulesEquipment.doMascFailureCrits`,
 * L299-L310); the hits roll is not used for MASC.
 */

/** Legs that take one critical slot each when a MASC check fails. */
export const MASC_FAILURE_LEG_CRITICAL_LOCATIONS = [
  'left_leg',
  'right_leg',
] as const;

export type MascFailureLeg =
  (typeof MASC_FAILURE_LEG_CRITICAL_LOCATIONS)[number];

/** Engine criticals for a Supercharger failure's hits roll (2d6 total). */
export function superchargerEngineHitsFromRoll(roll: number): number {
  if (roll <= 7) return 0;
  if (roll <= 9) return 1;
  if (roll <= 11) return 2;
  return 3;
}
