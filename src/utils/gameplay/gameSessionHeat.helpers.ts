import type { D6Roller, DiceRoller } from './diceTypes';

export function hasMaxTechHeatScaleRule(
  optionalRules: readonly string[],
): boolean {
  return optionalRules.some((rule) =>
    [
      'maxtech-heat-scale',
      'maxtech_heat_scale',
      'maxtech-heat',
      'tacops-heat-scale',
    ].includes(rule.toLowerCase()),
  );
}

export function createD6RollerFromDiceRoller(diceRoller: DiceRoller): D6Roller {
  let queuedDice: number[] = [];
  return () => {
    if (queuedDice.length === 0) {
      queuedDice = [...diceRoller().dice];
    }
    return queuedDice.shift() ?? 1;
  };
}

/**
 * Per `add-sp-combat-determinism` design D7: derive a critical-location
 * index (0–7) for the MaxTech heat-scale crit table from three draws of
 * an injected `D6Roller` stream, so the roll consumes ONLY that stream
 * — no `Math.random()` — and is reproducible under a seeded session.
 *
 * Uniformity argument: there are 6³ = 216 possible `(a, b, c)` draw
 * triples, and 216 / 8 = 27 exactly, so mapping each triple through
 * `((a-1)*36 + (b-1)*6 + (c-1)) % 8` lands on every one of the 8
 * output values exactly 27 times — an EXACT uniform distribution over
 * [0, 7], matching the distribution of the `Math.random`-based default
 * this helper replaces when a stream is available.
 */
export function createLocationIndexRollerFromD6(d6: D6Roller): () => number {
  return () => {
    const a = d6();
    const b = d6();
    const c = d6();
    return ((a - 1) * 36 + (b - 1) * 6 + (c - 1)) % 8;
  };
}
