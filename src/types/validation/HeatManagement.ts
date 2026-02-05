/**
 * Heat Management System Types
 *
 * Defines heat tracking and management types.
 *
 * @spec openspec/specs/heat-management-system/spec.md
 * @spec openspec/specs/heat-overflow-effects/spec.md
 */

/**
 * Heat scale effects thresholds
 */
export enum HeatLevel {
  COOL = 0,
  WARM = 5,
  HOT = 10,
  DANGEROUS = 15,
  CRITICAL = 18,
  SHUTDOWN_RISK = 20,
  SHUTDOWN_LIKELY = 25,
  MELTDOWN = 30,
}

/**
 * TSM (Triple Strength Myomer) activation threshold
 * At 9+ heat, TSM activates providing +2 Walk MP
 * Note: At 9 heat, there's also a -1 movement penalty from heat scale
 */
export const TSM_ACTIVATION_THRESHOLD = 9;

/**
 * Heat scale effect
 */
export interface HeatScaleEffect {
  readonly threshold: number;
  readonly movementPenalty: number;
  readonly toHitPenalty: number;
  readonly shutdownRoll?: number; // Target number to avoid shutdown (2d6 roll)
  readonly ammoExplosionRoll?: number; // Target number to avoid explosion (2d6 roll)
}

/**
 * Complete heat scale effects per BattleTech TechManual
 *
 * Heat | Move | To-Hit | Shutdown | Ammo
 * -----|------|--------|----------|-----
 * 0-4  | 0    | 0      | -        | -
 * 5-9  | -1   | 0      | -        | -
 * 10-14| -2   | +1     | -        | -
 * 15-17| -3   | +2     | -        | -
 * 18-19| -4   | +3     | -        | -
 * 20-21| -5   | +4     | 8+       | -
 * 22-23| -6   | +4     | 6+       | -
 * 24   | -7   | +4     | 6+       | 8+
 * 25   | -8   | +4     | 4+       | 8+
 * 26-27| -9   | +4     | 4+       | 6+
 * 28-29| -10  | +4     | 4+       | 4+
 * 30+  | Auto | -      | Auto     | Auto
 */
export const HEAT_SCALE_EFFECTS: readonly HeatScaleEffect[] = [
  { threshold: 0, movementPenalty: 0, toHitPenalty: 0 },
  { threshold: 5, movementPenalty: -1, toHitPenalty: 0 },
  { threshold: 10, movementPenalty: -2, toHitPenalty: 1 },
  { threshold: 15, movementPenalty: -3, toHitPenalty: 2 },
  { threshold: 18, movementPenalty: -4, toHitPenalty: 3 },
  { threshold: 20, movementPenalty: -5, toHitPenalty: 4, shutdownRoll: 8 },
  { threshold: 22, movementPenalty: -6, toHitPenalty: 4, shutdownRoll: 6 },
  {
    threshold: 24,
    movementPenalty: -7,
    toHitPenalty: 4,
    shutdownRoll: 6,
    ammoExplosionRoll: 8,
  },
  {
    threshold: 25,
    movementPenalty: -8,
    toHitPenalty: 4,
    shutdownRoll: 4,
    ammoExplosionRoll: 8,
  },
  {
    threshold: 26,
    movementPenalty: -9,
    toHitPenalty: 4,
    shutdownRoll: 4,
    ammoExplosionRoll: 6,
  },
  {
    threshold: 28,
    movementPenalty: -10,
    toHitPenalty: 4,
    shutdownRoll: 4,
    ammoExplosionRoll: 4,
  },
  {
    threshold: 30,
    movementPenalty: -999,
    toHitPenalty: 0,
    shutdownRoll: 0,
    ammoExplosionRoll: 0,
  }, // Auto shutdown/explosion
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
 * Check if current heat level poses shutdown risk
 * @param currentHeat - Current heat level
 * @returns true if shutdown roll is required
 */
export function isShutdownRisk(currentHeat: number): boolean {
  const effect = getHeatScaleEffect(currentHeat);
  return effect.shutdownRoll !== undefined;
}

/**
 * Get the target number needed to avoid ammunition explosion
 * @param currentHeat - Current heat level
 * @returns Target number for 2d6 roll, or null if no explosion risk
 */
export function getAmmoExplosionRisk(currentHeat: number): number | null {
  const effect = getHeatScaleEffect(currentHeat);
  return effect.ammoExplosionRoll ?? null;
}

/**
 * Check if TSM (Triple Strength Myomer) is active at given heat level
 * @param currentHeat - Current heat level
 * @returns true if heat >= 9 (TSM activation threshold)
 */
export function isTSMActive(currentHeat: number): boolean {
  return currentHeat >= TSM_ACTIVATION_THRESHOLD;
}

/**
 * Get movement penalty from heat including any enhancement effects
 * @param currentHeat - Current heat level
 * @returns Movement penalty (negative number, e.g., -1, -2)
 */
export function getHeatMovementPenalty(currentHeat: number): number {
  const effect = getHeatScaleEffect(currentHeat);
  // At 30+ heat, movement is impossible (shutdown)
  if (effect.threshold >= 30) {
    return -999; // Indicates shutdown/immobile
  }
  return effect.movementPenalty;
}

/**
 * Calculate movement heat
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
