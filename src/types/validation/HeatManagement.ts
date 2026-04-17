/**
 * Heat Management System Types
 *
 * Defines heat tracking and management types.
 *
 * IMPORTANT: this module does NOT define its own heat-threshold table.
 * All threshold values are derived from `src/constants/heat.ts` (the single
 * source of truth). A previous revision of this file defined its own
 * divergent table with thresholds 5/10/15/18/20 — which produced wrong
 * to-hit penalties compared to the canonical MegaMek/TechManual values of
 * 8/13/17/24. Rebuilding the shape from the canonical primitives eliminates
 * the drift risk.
 *
 * @spec openspec/specs/heat-management-system/spec.md
 * @spec openspec/specs/heat-overflow-effects/spec.md
 * @spec openspec/changes/fix-combat-rule-accuracy/proposal.md (Bug #3)
 */

import {
  AMMO_EXPLOSION_TN_TABLE,
  HEAT_THRESHOLDS,
  HEAT_TO_HIT_TABLE,
  getAmmoExplosionTN,
  getHeatMovementPenalty as canonicalHeatMovementPenalty,
  getHeatToHitModifier,
  getShutdownTN,
} from '@/constants/heat';

/**
 * Heat scale category labels used by UI.
 * Numeric values align with the canonical to-hit and shutdown thresholds.
 */
export enum HeatLevel {
  COOL = 0,
  WARM = HEAT_THRESHOLDS.TO_HIT_1, // 8 — first to-hit penalty
  HOT = HEAT_THRESHOLDS.TO_HIT_2, // 13 — second to-hit penalty
  SHUTDOWN_RISK = HEAT_THRESHOLDS.SHUTDOWN_CHECK, // 14 — shutdown checks begin
  DANGEROUS = HEAT_THRESHOLDS.TO_HIT_3, // 17 — third to-hit penalty
  CRITICAL = HEAT_THRESHOLDS.TO_HIT_4, // 24 — fourth to-hit penalty
  MELTDOWN = HEAT_THRESHOLDS.AUTO_SHUTDOWN, // 30 — automatic shutdown
}

/**
 * TSM (Triple Strength Myomer) activation threshold
 * At 9+ heat, TSM activates providing +2 Walk MP
 * Note: at 9 heat, there is also a -1 movement penalty from heat scale.
 */
export const TSM_ACTIVATION_THRESHOLD = 9;

/**
 * Heat scale effect shape — a snapshot of every effect that applies at a
 * given heat level.
 */
export interface HeatScaleEffect {
  readonly threshold: number;
  /** MP to subtract (positive integer, per canonical floor(heat/5)). */
  readonly movementPenalty: number;
  /** To-hit modifier to apply (positive integer). */
  readonly toHitPenalty: number;
  /** Shutdown-roll TN if applicable (Infinity means automatic shutdown). */
  readonly shutdownRoll?: number;
  /** Ammo-explosion TN if applicable (Infinity means automatic explosion). */
  readonly ammoExplosionRoll?: number;
}

/**
 * Build a `HeatScaleEffect` for the given heat level by reading from the
 * canonical constants. Returned as a fresh object so callers cannot mutate
 * shared state.
 */
export function getHeatScaleEffect(currentHeat: number): HeatScaleEffect {
  const threshold =
    HEAT_TO_HIT_TABLE.find(
      (t) => currentHeat >= t.minHeat && currentHeat <= t.maxHeat,
    )?.minHeat ?? 0;

  const movementPenalty = canonicalHeatMovementPenalty(currentHeat);
  const toHitPenalty = getHeatToHitModifier(currentHeat);

  const shutdownTN = getShutdownTN(currentHeat);
  const ammoExplosionTN = getAmmoExplosionTN(currentHeat);

  return {
    threshold,
    movementPenalty,
    toHitPenalty,
    ...(shutdownTN > 0 ? { shutdownRoll: shutdownTN } : {}),
    ...(ammoExplosionTN > 0 ? { ammoExplosionRoll: ammoExplosionTN } : {}),
  };
}

/**
 * Check if current heat level poses a shutdown risk.
 * @returns true when the unit must roll to avoid shutdown at this heat level.
 */
export function isShutdownRisk(currentHeat: number): boolean {
  return currentHeat >= HEAT_THRESHOLDS.SHUTDOWN_CHECK;
}

/**
 * Get the target number needed to avoid ammunition explosion.
 * @returns Target number for 2d6 roll, or null if no explosion risk.
 */
export function getAmmoExplosionRisk(currentHeat: number): number | null {
  if (currentHeat < HEAT_THRESHOLDS.AMMO_EXPLOSION_1) return null;
  const entry = AMMO_EXPLOSION_TN_TABLE.find(
    (e) => currentHeat >= e.minHeat && currentHeat <= e.maxHeat,
  );
  if (entry) return entry.tn;
  // Above the table's last entry → automatic explosion
  return Infinity;
}

/**
 * Check if TSM (Triple Strength Myomer) is active at given heat level.
 * @returns true if heat >= 9 (TSM activation threshold).
 */
export function isTSMActive(currentHeat: number): boolean {
  return currentHeat >= TSM_ACTIVATION_THRESHOLD;
}

/**
 * Get the heat-induced movement penalty as a positive integer representing
 * MP to subtract from walk/run. Re-exported from `constants/heat.ts` so
 * callers can import from either module and get the same answer.
 */
export function getHeatMovementPenalty(currentHeat: number): number {
  return canonicalHeatMovementPenalty(currentHeat);
}

/**
 * Heat source types
 */
export enum HeatSourceType {
  WEAPON = 'Weapon',
  MOVEMENT = 'Movement',
  ENVIRONMENT = 'Environment',
  ENGINE = 'Engine',
  OTHER = 'Other',
}

/**
 * Heat source entry
 */
export interface HeatSource {
  readonly type: HeatSourceType;
  readonly name: string;
  readonly heatGenerated: number;
}

/**
 * Heat sink entry
 */
export interface HeatDissipation {
  readonly type: 'single' | 'double';
  readonly count: number;
  readonly dissipationPerSink: number;
  readonly totalDissipation: number;
}

/**
 * Heat balance for a turn
 */
export interface TurnHeatBalance {
  readonly turn: number;
  readonly startingHeat: number;
  readonly heatGenerated: number;
  readonly heatSources: readonly HeatSource[];
  readonly heatDissipated: number;
  readonly endingHeat: number;
  readonly effects: HeatScaleEffect;
}

/**
 * Calculate movement heat (per movement mode).
 * Canonical per TechManual p.68: walk = 1, run = 2, jump = max(3, jumpMP).
 */
export function calculateMovementHeat(
  walkMP: number,
  runMP: number,
  jumpMP: number,
  movementMode: 'walk' | 'run' | 'jump',
): number {
  switch (movementMode) {
    case 'walk':
      return 1;
    case 'run':
      return 2;
    case 'jump':
      return Math.max(3, jumpMP);
    default:
      return 0;
  }
}

/**
 * Heat management analysis result
 */
export interface HeatAnalysis {
  readonly maxWeaponHeat: number;
  readonly sustainableWeaponHeat: number;
  readonly dissipationCapacity: number;
  readonly heatNeutralFiring: boolean;
  readonly turnsToOverheat: number; // -1 if never overheats
  readonly alphaStrikeHeat: number;
}
