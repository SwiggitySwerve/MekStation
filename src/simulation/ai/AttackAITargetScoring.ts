import { hexDistance } from '@/utils/gameplay/hexMath';

import type { IAIStructureState, IAIUnitState } from './types';

import { type IAITierResourceParameters } from './AITierRegistry';

/**
 * Per `improve-bot-basic-combat-competence` task 2: score a target
 * for the attacker. Higher = more attractive to fire on.
 *
 * Formula (per `specs/simulation-system/spec.md` Requirement "Bot Target
 * Prioritization by Threat and Kill Probability"):
 *
 *   threat = totalWeaponDamagePerTurn * remainingHpFraction / max(gunnery, 1)
 *   killProbability = clamp(1 - (toHitTN / 12), 0, 1)
 *   score = threat * killProbability + critSeekingTerm
 *
 * `toHitTN` is estimated from the attacker's gunnery + a range modifier.
 * Firing-arc TN contribution is deferred to the weapon-selection step
 * (which EXCLUDES out-of-arc weapons entirely rather than taxing them).
 *
 * `remainingHpFraction` defaults to 1.0 when the AI surface does not
 * yet supply per-unit HP totals — that preserves the legacy scoring
 * for test fixtures while letting real wiring opt in.
 *
 * Per `add-ai-resource-planning` (A2) design D3: when `resource` carries a
 * non-zero `critSeekingWeight`, an ADDITIVE crit-seeking term is added —
 * proportional to the target's structural exposure (stripped armour, prior
 * internal damage). When `resource` is omitted or its `critSeekingWeight`
 * is `0` (the `Green`/`Regular` inert path, and every legacy caller),
 * the crit-seeking term is exactly `0` and `scoreTarget` returns the
 * pre-change `threat * killProbability` value byte-for-byte.
 *
 * Pure function — no state mutation, no `SeededRandom` consumption.
 */
export function scoreTarget(
  attacker: IAIUnitState,
  target: IAIUnitState,
  resource?: IAITierResourceParameters,
): number {
  if (target.destroyed || target.unitId === attacker.unitId) return 0;

  // Threat component — sum of living weapon damage scaled by the
  // target's remaining HP fraction (crippled units are less
  // threatening) and inverted gunnery (better shooters are bigger
  // threats). `Math.max(1, gunnery)` guards against divide-by-zero
  // for 0-gunnery edge cases.
  const livingWeapons = target.weapons.filter((w) => !w.destroyed);
  const totalWeaponDamagePerTurn = livingWeapons.reduce(
    (sum, w) => sum + w.damage,
    0,
  );
  const gunneryMod = Math.max(1, target.gunnery);
  const remainingHpFraction = clamp01(target.remainingHpFraction ?? 1);
  const threat = (totalWeaponDamagePerTurn * remainingHpFraction) / gunneryMod;

  // Kill probability — basic TN estimate using attacker gunnery +
  // range modifier only. Clamped so TN >= 12 yields 0 probability.
  const distance = hexDistance(attacker.position, target.position);
  const rangeMod = rangeModifierForDistance(distance);
  const tn = attacker.gunnery + rangeMod;
  const killProbability = clamp01(1 - tn / 12);

  const baseScore = threat * killProbability;

  // A2 crit-seeking term — additive, gated on `critSeekingWeight`. The
  // exposure fraction is `0` for a fully-armoured target (or a target with
  // no structure-state data), so a zero weight OR no exposure yields a zero
  // term and the legacy score is reproduced exactly.
  const critWeight = resource?.critSeekingWeight ?? 0;
  if (critWeight <= 0) return baseScore;
  const exposure = structuralExposure(target.structureState);
  return baseScore + critWeight * exposure;
}

/**
 * Per `add-ai-resource-planning` (A2) design D3: a target's structural
 * exposure in `[0, 1]` — a measure of how reachable a crippling critical
 * hit is.
 *
 * Two signals contribute:
 *
 *   - **Stripped armour** — the fraction of locations whose armour is at
 *     zero. A stripped location takes every hit straight to internal
 *     structure / the critical table.
 *   - **Prior internal damage** — `1 - (internalRemaining / internalMax)`
 *     summed across locations. An already-damaged internal structure is
 *     close to a destroyed location.
 *
 * The two are averaged and clamped to `[0, 1]`. A fresh, fully-armoured
 * target scores `0`; a target with an opened side torso scores high. A
 * target with no `structureState` scores `0` — the crit-seeking term then
 * contributes nothing, preserving legacy behavior.
 *
 * Pure function.
 */
export function structuralExposure(
  structure: IAIStructureState | undefined,
): number {
  if (!structure) return 0;

  const armorLocations = Object.entries(structure.armorMaxByLocation);
  const internalLocations = Object.entries(structure.internalMaxByLocation);

  // Stripped-armour signal — fraction of armoured locations now at zero.
  let strippedCount = 0;
  let armorLocationCount = 0;
  for (const [loc, armorMax] of armorLocations) {
    if (armorMax <= 0) continue;
    armorLocationCount++;
    const remaining = structure.armorByLocation[loc] ?? armorMax;
    if (remaining <= 0) strippedCount++;
  }
  const strippedFraction =
    armorLocationCount > 0 ? strippedCount / armorLocationCount : 0;

  // Internal-damage signal — average fraction of internal structure lost.
  let internalDamageSum = 0;
  let internalLocationCount = 0;
  for (const [loc, internalMax] of internalLocations) {
    if (internalMax <= 0) continue;
    internalLocationCount++;
    const remaining = structure.internalByLocation[loc] ?? internalMax;
    internalDamageSum += clamp01(1 - remaining / internalMax);
  }
  const internalDamageFraction =
    internalLocationCount > 0 ? internalDamageSum / internalLocationCount : 0;

  // Average the two signals — a target that is both stripped and internally
  // damaged is maximally exposed.
  return clamp01((strippedFraction + internalDamageFraction) / 2);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rangeModifierForDistance(distance: number): number {
  if (distance <= 3) return 0;
  if (distance <= 6) return 2;
  if (distance <= 9) return 4;
  return 6;
}
