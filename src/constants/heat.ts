/**
 * Heat Constants
 *
 * BattleTech heat scale thresholds and effects.
 * Based on TechManual heat effects table.
 */

// =============================================================================
// Heat Thresholds
// =============================================================================

/**
 * Heat thresholds that trigger negative effects on a BattleMech.
 * Values represent cumulative heat points.
 */
export const HEAT_THRESHOLDS = {
  /** +1 to-hit penalty threshold */
  PENALTY_1: 8,
  /** +2 to-hit penalty threshold */
  PENALTY_2: 13,
  /** +3 to-hit penalty threshold */
  PENALTY_3: 17,
  /** +4 to-hit penalty threshold */
  PENALTY_4: 18,
  /** Movement penalty begins */
  MOVEMENT_PENALTY: 5,
  /** Ammo explosion risk begins */
  AMMO_EXPLOSION_RISK: 24,
  /** +5 to-hit penalty threshold */
  PENALTY_5: 26,
  /** Automatic shutdown threshold */
  SHUTDOWN: 30,
} as const;

/**
 * Maximum heat a 'Mech can accumulate before automatic shutdown.
 */
export const MAX_HEAT = 30;

// =============================================================================
// Heat Display Thresholds
// =============================================================================

/**
 * Thresholds for heat bar color display in UI components.
 * Maps heat levels to severity colors.
 */
export const HEAT_DISPLAY_THRESHOLDS = {
  /** Green zone - safe */
  SAFE: 0,
  /** Yellow-400 zone - caution */
  CAUTION: 8,
  /** Yellow-500 zone - warning */
  WARNING: 13,
  /** Orange zone - danger */
  DANGER: 17,
  /** Red-500 zone - critical */
  CRITICAL: 23,
  /** Red-600 zone - shutdown imminent */
  SHUTDOWN: 30,
} as const;

// =============================================================================
// Heat Effect Descriptions
// =============================================================================

/**
 * Human-readable descriptions of heat effects at various thresholds.
 */
export const HEAT_EFFECTS = {
  [HEAT_THRESHOLDS.PENALTY_1]: '+1 to-hit penalty',
  [HEAT_THRESHOLDS.PENALTY_2]: '+2 to-hit penalty',
  [HEAT_THRESHOLDS.PENALTY_3]: '+3 to-hit penalty',
  [HEAT_THRESHOLDS.PENALTY_4]: '+4 to-hit penalty',
  [HEAT_THRESHOLDS.AMMO_EXPLOSION_RISK]: 'Ammo explosion risk',
  [HEAT_THRESHOLDS.PENALTY_5]: '+5 to-hit penalty',
  [HEAT_THRESHOLDS.SHUTDOWN]: 'SHUTDOWN',
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the appropriate Tailwind background color class for a heat level.
 * @param heat - Current heat level
 * @returns Tailwind background color class
 */
export function getHeatColorClass(heat: number): string {
  if (heat >= HEAT_DISPLAY_THRESHOLDS.SHUTDOWN) return 'bg-red-600';
  if (heat >= HEAT_DISPLAY_THRESHOLDS.CRITICAL) return 'bg-red-500';
  if (heat >= HEAT_DISPLAY_THRESHOLDS.DANGER) return 'bg-orange-500';
  if (heat >= HEAT_DISPLAY_THRESHOLDS.WARNING) return 'bg-yellow-500';
  if (heat >= HEAT_DISPLAY_THRESHOLDS.CAUTION) return 'bg-yellow-400';
  return 'bg-green-500';
}

/**
 * Get all active heat effects for a given heat level.
 * @param heat - Current heat level
 * @returns Array of effect descriptions
 */
export function getActiveHeatEffects(heat: number): string[] {
  const effects: string[] = [];
  if (heat >= HEAT_THRESHOLDS.SHUTDOWN) effects.push('SHUTDOWN');
  if (heat >= HEAT_THRESHOLDS.PENALTY_5) effects.push('+5 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.AMMO_EXPLOSION_RISK)
    effects.push('Ammo explosion risk');
  if (heat >= HEAT_THRESHOLDS.PENALTY_4) effects.push('+4 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.PENALTY_3) effects.push('+3 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.PENALTY_2) effects.push('+2 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.PENALTY_1) effects.push('+1 to-hit penalty');
  return effects;
}
