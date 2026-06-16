import type { D6Roller } from '../diceTypes';

import { roll2d6 } from '../hitLocation';

/**
 * Check whether a structure-damage hit triggers a critical.
 *
 * Per Total Warfare p. 41, any damage that penetrates internal
 * structure triggers a 2d6 critical-hit roll: 8+ → 1 crit, 10+ → 2,
 * 12 → 3 (or limb-blown-off per location).
 *
 * The optional `roller` parameter threads a deterministic `D6Roller`
 * (typically a `SeededD6Roller` adapter via `.asD6Roller()`) through
 * the dice path so unit / scenario / Monte Carlo tests can reproduce
 * exact crit sequences. When omitted, the function falls back to
 * `defaultD6Roller` (= `Math.random`) so existing production callsites
 * keep their current behaviour.
 *
 * @spec openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *       (Requirement: Deterministic D6 Roller Adapter for Test Pyramid)
 */
export function checkCriticalHitTrigger(
  structureDamage: number,
  roller?: D6Roller,
  modifier = 0,
): {
  triggered: boolean;
  roll: ReturnType<typeof roll2d6>;
} {
  if (structureDamage <= 0) {
    return {
      triggered: false,
      roll: { dice: [0, 0], total: 0, isSnakeEyes: false, isBoxcars: false },
    };
  }

  const roll = roll2d6(roller);
  const modifiedTotal = roll.total + modifier;
  return {
    triggered: modifiedTotal >= 8,
    roll,
  };
}

export function getCriticalHitCount(roll: number): number {
  if (roll >= 12) return 3;
  if (roll >= 10) return 2;
  if (roll >= 8) return 1;
  return 0;
}
