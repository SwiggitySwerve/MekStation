/** Pure Mech running arithmetic; callers supply already-adjusted walk MP. */

const BASE_RUN_MULTIPLIER = 1.5;

export interface IMechRunModifiers {
  readonly masc?: boolean;
  readonly supercharger?: boolean;
  readonly hardenedArmor?: boolean;
}

/**
 * MegaMek 48fcb2f64: Entity.getRunMP:4015-4016;
 * MPBoosters.calculateRunMP:79-86; Mek.getRunMP:1748-1761.
 * Preserve each caller's walk adjustment and nonpositive-input policy.
 */
export function calculateMechRunMP(
  walkMP: number,
  {
    masc = false,
    supercharger = false,
    hardenedArmor = false,
  }: IMechRunModifiers = {},
): number {
  const runMP =
    masc && supercharger
      ? Math.ceil(walkMP * 2.5)
      : masc || supercharger
        ? walkMP * 2
        : Math.ceil(walkMP * BASE_RUN_MULTIPLIER);
  return hardenedArmor ? Math.max(0, runMP - 1) : runMP;
}

export interface MovementModifiers {
  /** Bonus added to the base run multiplier. */
  runMultiplierBonus: number;
  /** Flat MP added after multiplication in the legacy preview. */
  flatMPBonus: number;
}

/** Legacy enhancement preview policy, retained unchanged during extraction. */
export function calculateMaxRunMPWithModifiers(
  walkMP: number,
  modifiers: MovementModifiers,
): number | undefined {
  if (walkMP <= 0) return 0;
  if (modifiers.runMultiplierBonus === 0 && modifiers.flatMPBonus === 0) {
    return undefined;
  }
  const totalMultiplier = BASE_RUN_MULTIPLIER + modifiers.runMultiplierBonus;
  return Math.floor(walkMP * totalMultiplier) + modifiers.flatMPBonus;
}
