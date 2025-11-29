/**
 * Heat Management System Types
 * 
 * Defines heat tracking and management types.
 * 
 * @spec openspec/changes/implement-phase4-validation/specs/heat-management-system/spec.md
 */

/**
 * Heat scale effects thresholds
 */
export enum HeatLevel {
  COOL = 0,
  WARM = 5,
  HOT = 10,
  DANGEROUS = 15,
  CRITICAL = 20,
  SHUTDOWN = 25,
  MELTDOWN = 30,
}

/**
 * Heat scale effect
 */
export interface HeatScaleEffect {
  readonly threshold: number;
  readonly movementPenalty: number;
  readonly toHitPenalty: number;
  readonly shutdownRoll?: number; // Target number to avoid shutdown
  readonly ammoExplosionRoll?: number; // Target number to avoid explosion
}

/**
 * Standard heat scale effects
 */
export const HEAT_SCALE_EFFECTS: readonly HeatScaleEffect[] = [
  { threshold: 0, movementPenalty: 0, toHitPenalty: 0 },
  { threshold: 5, movementPenalty: -1, toHitPenalty: 0 },
  { threshold: 10, movementPenalty: -2, toHitPenalty: 1 },
  { threshold: 15, movementPenalty: -3, toHitPenalty: 2 },
  { threshold: 20, movementPenalty: -4, toHitPenalty: 3, shutdownRoll: 8 },
  { threshold: 25, movementPenalty: -5, toHitPenalty: 4, shutdownRoll: 6, ammoExplosionRoll: 8 },
  { threshold: 30, movementPenalty: -6, toHitPenalty: 4, shutdownRoll: 4, ammoExplosionRoll: 6 },
] as const;

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
 * Get heat scale effect for current heat level
 */
export function getHeatScaleEffect(currentHeat: number): HeatScaleEffect {
  // Find highest threshold that applies
  for (let i = HEAT_SCALE_EFFECTS.length - 1; i >= 0; i--) {
    if (currentHeat >= HEAT_SCALE_EFFECTS[i].threshold) {
      return HEAT_SCALE_EFFECTS[i];
    }
  }
  return HEAT_SCALE_EFFECTS[0];
}

/**
 * Calculate movement heat
 */
export function calculateMovementHeat(
  walkMP: number,
  runMP: number,
  jumpMP: number,
  movementMode: 'walk' | 'run' | 'jump'
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

