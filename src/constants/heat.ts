/**
 * Heat Constants — Single Source of Truth
 *
 * BattleTech canonical heat scale thresholds and effects.
 * All heat-related thresholds across the codebase MUST reference these constants.
 *
 * Based on TotalWarfare / TechManual heat effects table + MegaMek canonical values.
 *
 * @spec openspec/changes/full-combat-parity/specs/heat-overflow-effects/spec.md
 * @spec openspec/changes/full-combat-parity/specs/shutdown-startup-system/spec.md
 * @spec openspec/changes/full-combat-parity/specs/heat-management-system/spec.md
 */

// =============================================================================
// Heat Thresholds — Canonical Values
// =============================================================================

/**
 * Heat thresholds that trigger negative effects on a BattleMech.
 * Values represent cumulative heat points.
 */
export const HEAT_THRESHOLDS = {
  /** Movement penalty applies: floor(heat/5) MP reduction */
  MOVEMENT_PENALTY: 5,
  /** +1 to-hit penalty threshold */
  TO_HIT_1: 8,
  /** +2 to-hit penalty threshold */
  TO_HIT_2: 13,
  /** Shutdown checks begin (TN = 4 + floor((heat-14)/4)*2) */
  SHUTDOWN_CHECK: 14,
  /** Pilot heat damage begins (1 point, requires life support damage) */
  PILOT_DAMAGE_1: 15,
  /** +3 to-hit penalty threshold */
  TO_HIT_3: 17,
  /** Ammo explosion checks begin (TN=4) */
  AMMO_EXPLOSION_1: 19,
  /** Ammo explosion TN=6 */
  AMMO_EXPLOSION_2: 23,
  /** +4 to-hit penalty threshold */
  TO_HIT_4: 24,
  /** Pilot heat damage increases (2 points, requires life support damage) */
  PILOT_DAMAGE_2: 25,
  /** Ammo explosion TN=8 */
  AMMO_EXPLOSION_3: 28,
  /** Automatic shutdown — no roll allowed */
  AUTO_SHUTDOWN: 30,
} as const;

/**
 * Maximum heat a 'Mech can accumulate before automatic shutdown.
 */
export const MAX_HEAT = 30;

/**
 * Engine critical hit heat generation: +5 heat per engine hit per turn.
 */
export const ENGINE_HIT_HEAT = 5;

// =============================================================================
// To-Hit Penalty Table
// =============================================================================

/**
 * Canonical to-hit penalty brackets from heat level.
 * Used by toHit.ts calculateHeatModifier().
 *
 * +1 at heat 8, +2 at heat 13, +3 at heat 17, +4 at heat 24
 */
export const HEAT_TO_HIT_TABLE: readonly {
  minHeat: number;
  maxHeat: number;
  modifier: number;
}[] = [
  { minHeat: 0, maxHeat: 7, modifier: 0 },
  { minHeat: 8, maxHeat: 12, modifier: 1 },
  { minHeat: 13, maxHeat: 16, modifier: 2 },
  { minHeat: 17, maxHeat: 23, modifier: 3 },
  { minHeat: 24, maxHeat: Infinity, modifier: 4 },
];

// =============================================================================
// Shutdown/Startup Formulas
// =============================================================================

/**
 * Calculate shutdown avoidance target number.
 * TN = 4 + floor((heat - threshold) / 4) * 2
 *
 * At heat 30+, shutdown is automatic (returns Infinity).
 *
 * @param heat - Current heat level
 * @param hotDogBonus - Hot Dog SPA bonus (shifts threshold by +3, default 0)
 * @returns Target number for 2d6 roll, or Infinity for auto-shutdown
 */
export function getShutdownTN(heat: number, hotDogBonus: number = 0): number {
  const effectiveThreshold = HEAT_THRESHOLDS.SHUTDOWN_CHECK + hotDogBonus;
  if (heat >= HEAT_THRESHOLDS.AUTO_SHUTDOWN) return Infinity;
  if (heat < effectiveThreshold) return 0; // No check needed
  return 4 + Math.floor((heat - effectiveThreshold) / 4) * 2;
}

/**
 * Calculate startup target number (same formula as shutdown).
 *
 * @param heat - Current heat level
 * @param hotDogBonus - Hot Dog SPA bonus (default 0)
 * @returns Target number for 2d6 roll
 */
export function getStartupTN(heat: number, hotDogBonus: number = 0): number {
  // Startup uses same formula but can always be attempted (even at 30+)
  const effectiveThreshold = HEAT_THRESHOLDS.SHUTDOWN_CHECK + hotDogBonus;
  if (heat < effectiveThreshold) return 4; // Base TN if somehow below threshold
  return 4 + Math.floor((heat - effectiveThreshold) / 4) * 2;
}

// =============================================================================
// Ammo Explosion TN Table
// =============================================================================

/**
 * Ammo explosion avoidance target numbers by heat level.
 * Roll 2d6 >= TN to avoid explosion.
 *
 * Heat 19-22: TN 4
 * Heat 23-27: TN 6
 * Heat 28-29: TN 8
 * Heat 30+: Automatic explosion (no roll)
 */
export const AMMO_EXPLOSION_TN_TABLE: readonly {
  minHeat: number;
  maxHeat: number;
  tn: number;
}[] = [
  { minHeat: 19, maxHeat: 22, tn: 4 },
  { minHeat: 23, maxHeat: 27, tn: 6 },
  { minHeat: 28, maxHeat: 29, tn: 8 },
];

/**
 * Get ammo explosion avoidance TN for a given heat level.
 *
 * @param heat - Current heat level
 * @returns TN for 2d6 roll, Infinity for auto-explosion, or 0 for no check needed
 */
export function getAmmoExplosionTN(heat: number): number {
  if (heat >= HEAT_THRESHOLDS.AUTO_SHUTDOWN) return Infinity; // Auto explode
  for (const entry of AMMO_EXPLOSION_TN_TABLE) {
    if (heat >= entry.minHeat && heat <= entry.maxHeat) return entry.tn;
  }
  return 0; // No check needed
}

// =============================================================================
// Movement Penalty
// =============================================================================

/**
 * Calculate heat-induced movement penalty.
 * MP reduction = floor(heat / 5)
 *
 * @param heat - Current heat level
 * @returns Number of MP to subtract (always >= 0)
 */
export function getHeatMovementPenalty(heat: number): number {
  if (heat < HEAT_THRESHOLDS.MOVEMENT_PENALTY) return 0;
  return Math.floor(heat / 5);
}

// =============================================================================
// To-Hit Penalty
// =============================================================================

/**
 * Get heat-induced to-hit modifier.
 *
 * @param heat - Current heat level
 * @returns To-hit modifier (0 to +4)
 */
export function getHeatToHitModifier(heat: number): number {
  const entry = HEAT_TO_HIT_TABLE.find(
    (t) => heat >= t.minHeat && heat <= t.maxHeat,
  );
  return entry?.modifier ?? 0;
}

// =============================================================================
// Pilot Heat Damage
// =============================================================================

/**
 * Get pilot heat damage for the current heat level.
 * Requires life support to be damaged (>=1 hit).
 *
 * Heat 15-24: 1 point
 * Heat 25+:   2 points
 *
 * @param heat - Current heat level
 * @param lifeSupportHits - Number of life support hits (0-2)
 * @returns Damage points to the pilot (0, 1, or 2)
 */
export function getPilotHeatDamage(
  heat: number,
  lifeSupportHits: number,
): number {
  if (lifeSupportHits <= 0) return 0;
  if (heat >= HEAT_THRESHOLDS.PILOT_DAMAGE_2) return 2;
  if (heat >= HEAT_THRESHOLDS.PILOT_DAMAGE_1) return 1;
  return 0;
}

// =============================================================================
// Heat Display Thresholds (UI)
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
// Heat Effect Descriptions (UI)
// =============================================================================

/**
 * Human-readable descriptions of heat effects at various thresholds.
 */
export const HEAT_EFFECTS: Record<number, string> = {
  [HEAT_THRESHOLDS.TO_HIT_1]: '+1 to-hit penalty',
  [HEAT_THRESHOLDS.TO_HIT_2]: '+2 to-hit penalty',
  [HEAT_THRESHOLDS.SHUTDOWN_CHECK]: 'Shutdown check begins',
  [HEAT_THRESHOLDS.PILOT_DAMAGE_1]: 'Pilot heat damage (1 pt)',
  [HEAT_THRESHOLDS.TO_HIT_3]: '+3 to-hit penalty',
  [HEAT_THRESHOLDS.AMMO_EXPLOSION_1]: 'Ammo explosion risk (TN 4)',
  [HEAT_THRESHOLDS.AMMO_EXPLOSION_2]: 'Ammo explosion risk (TN 6)',
  [HEAT_THRESHOLDS.TO_HIT_4]: '+4 to-hit penalty',
  [HEAT_THRESHOLDS.PILOT_DAMAGE_2]: 'Pilot heat damage (2 pts)',
  [HEAT_THRESHOLDS.AMMO_EXPLOSION_3]: 'Ammo explosion risk (TN 8)',
  [HEAT_THRESHOLDS.AUTO_SHUTDOWN]: 'Automatic shutdown',
};

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
  if (heat >= HEAT_THRESHOLDS.AUTO_SHUTDOWN) effects.push('Automatic shutdown');
  if (heat >= HEAT_THRESHOLDS.AMMO_EXPLOSION_3)
    effects.push('Ammo explosion risk (TN 8)');
  if (heat >= HEAT_THRESHOLDS.PILOT_DAMAGE_2)
    effects.push('Pilot heat damage (2 pts)');
  if (heat >= HEAT_THRESHOLDS.TO_HIT_4) effects.push('+4 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.AMMO_EXPLOSION_2)
    effects.push('Ammo explosion risk (TN 6)');
  if (heat >= HEAT_THRESHOLDS.AMMO_EXPLOSION_1)
    effects.push('Ammo explosion risk (TN 4)');
  if (heat >= HEAT_THRESHOLDS.TO_HIT_3) effects.push('+3 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.SHUTDOWN_CHECK) effects.push('Shutdown check');
  if (heat >= HEAT_THRESHOLDS.TO_HIT_2) effects.push('+2 to-hit penalty');
  if (heat >= HEAT_THRESHOLDS.TO_HIT_1) effects.push('+1 to-hit penalty');
  return effects;
}
