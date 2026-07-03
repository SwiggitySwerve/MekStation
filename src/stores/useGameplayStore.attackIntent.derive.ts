/**
 * Attack Intent derived-state helpers (change `attack-phase-intent-composer`,
 * ADR 0002 D5/D6/D7) — the pure derivation layer between the stored
 * `IAttackIntentState` and the composer UI.
 *
 * Every value here is DERIVED, never stored, and every rules number is
 * consumed verbatim from existing code paths:
 *   - per-weapon legality → `deriveCombatWeaponRangeOptions`
 *     (`combatProjection.weaponOptions`) with the target arc recomputed
 *     under the composed twist (D7 live recomputation);
 *   - secondary-target penalty → `ISecondaryTarget` context consumed by
 *     `calculateToHit` via `calculateSecondaryTargetModifier`
 *     (`secondary-target-tracking`, consumed as-is);
 *   - ledger totals → weapon impact values (`weaponImpactForStatus`) and
 *     the 2d6 forecast probabilities the caller sources from
 *     `buildToHitForecast`.
 *
 * There is NO UI-local attack math in this module — it composes existing
 * calculators and aggregates their outputs.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import type {
  Facing,
  IAttackIntentState,
  ICombatWeaponRangeOption,
  IHexCoordinate,
  IHexGrid,
  ISecondaryTarget,
  IWeaponStatus,
} from '@/types/gameplay';

import { FiringArc } from '@/types/gameplay';
import { deriveCombatWeaponRangeOptions } from '@/utils/gameplay/combatProjection.weaponOptions';
import { weaponImpactForStatus } from '@/utils/gameplay/combatProjection.weaponOptions';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { hexDistance } from '@/utils/gameplay/hexMath';

import { selectPrimaryTargetId } from './useGameplayStore.attackIntent';

/** Attacker geometry the derivations need — position + base facing. */
export interface IIntentAttackerGeometry {
  readonly position: IHexCoordinate;
  readonly facing: Facing;
}

/**
 * The facing arc math should use while composing: the composed twist when
 * one is set, the unit's base facing otherwise (D7). Because the twist is
 * an ABSOLUTE secondary facing (the same value `torsoTwist` declares),
 * clearing it restores prior gating exactly by construction.
 */
export function effectiveAttackerFacing(
  facing: Facing,
  composedTwist: Facing | null,
): Facing {
  return composedTwist ?? facing;
}

/**
 * Which arc the target sits in relative to the attacker under the composed
 * twist — the input `weaponCanCoverTargetArc` gates palette rows on.
 */
export function deriveTargetArcUnderIntent(
  attacker: IIntentAttackerGeometry,
  composedTwist: Facing | null,
  targetPosition: IHexCoordinate,
): FiringArc {
  return determineArc(
    {
      unitId: '_composer-attacker',
      coord: attacker.position,
      facing: effectiveAttackerFacing(attacker.facing, composedTwist),
      prone: false,
    },
    targetPosition,
  ).arc;
}

/**
 * Per-weapon legality rows for one candidate target, twist-aware (D7):
 * range / arc / environment / readiness gating with rules-backed
 * `blockedReason`s, consumed verbatim from
 * `deriveCombatWeaponRangeOptions`. Changing `composedTwist` recomputes
 * the target arc, so rows made legal only by the twist re-block when the
 * twist is removed (Torso Twist Intent scenarios).
 */
export function deriveWeaponLegalityForTarget({
  weapons,
  attacker,
  composedTwist,
  targetPosition,
  grid,
  minimumRangeApplies,
  weaponRuleBlockedReason,
}: {
  readonly weapons: readonly IWeaponStatus[];
  readonly attacker: IIntentAttackerGeometry;
  readonly composedTwist: Facing | null;
  readonly targetPosition: IHexCoordinate;
  readonly grid: IHexGrid;
  readonly minimumRangeApplies: boolean;
  readonly weaponRuleBlockedReason?: (
    weapon: IWeaponStatus,
  ) => string | undefined;
}): readonly ICombatWeaponRangeOption[] {
  return deriveCombatWeaponRangeOptions({
    weapons,
    distance: hexDistance(attacker.position, targetPosition),
    targetArc: deriveTargetArcUnderIntent(
      attacker,
      composedTwist,
      targetPosition,
    ),
    grid,
    attackerPosition: attacker.position,
    targetPosition,
    minimumRangeApplies,
    weaponRuleBlockedReason,
  });
}

/**
 * The `ISecondaryTarget` context an assignment against `targetId` feeds
 * into `calculateToHit` (via `IAttackerState.secondaryTarget`): the
 * volley's non-primary targets take the secondary-target penalty — +1 in
 * the attacker's (twist-adjusted) front arc, +2 elsewhere — per
 * `secondary-target-tracking`, consumed as-is (D8). `undefined` for the
 * primary target (no modifier row at all).
 */
export function deriveSecondaryTargetContext(
  state: IAttackIntentState,
  targetId: string,
  attacker: IIntentAttackerGeometry,
  targetPosition: IHexCoordinate,
): ISecondaryTarget | undefined {
  const primary = selectPrimaryTargetId(state);
  if (primary === null || targetId === primary) return undefined;
  return {
    isSecondary: true,
    inFrontArc:
      deriveTargetArcUnderIntent(
        attacker,
        state.composedTwist,
        targetPosition,
      ) === FiringArc.Front,
  };
}

/** Live ledger totals for the composed volley (Heat and Effect Ledger). */
export interface IVolleyLedgerTotals {
  /** Heat generated by the assigned weapons alone. */
  readonly weaponHeat: number;
  /** Weapon heat on top of banked movement heat. */
  readonly totalHeat: number;
  /** Total heat minus dissipation — what actually banks this turn. */
  readonly netHeat: number;
  /** Σ (weapon damage × per-weapon hit probability). */
  readonly expectedDamage: number;
  /** P(at least one assigned weapon hits), 0–100. */
  readonly volleyHitProbability: number;
}

/**
 * Total the composed volley live: heat over banked movement heat, expected
 * damage, and the volley-level hit probability. Damage/heat values come
 * from the same `weaponImpactForStatus` numbers the combat projection
 * uses; per-weapon probabilities come from the caller's
 * `buildToHitForecast` rows (0–100) keyed by weapon id — weapons without
 * a forecast row (e.g. blocked) contribute 0 probability but still count
 * their heat, because a fired weapon heats up whether or not it hits.
 */
export function deriveVolleyLedgerTotals({
  state,
  weapons,
  hitProbabilityByWeaponId,
  movementHeat,
  heatDissipation,
}: {
  readonly state: IAttackIntentState;
  readonly weapons: readonly IWeaponStatus[];
  readonly hitProbabilityByWeaponId: Readonly<Record<string, number>>;
  readonly movementHeat: number;
  readonly heatDissipation: number;
}): IVolleyLedgerTotals {
  const byId = new Map(weapons.map((weapon) => [weapon.id, weapon]));
  let weaponHeat = 0;
  let expectedDamage = 0;
  let allMissProbability = 1;
  for (const assignment of state.assignments) {
    const weapon = byId.get(assignment.weaponId);
    if (!weapon) continue;
    const impact = weaponImpactForStatus(weapon);
    const hitProbability =
      (hitProbabilityByWeaponId[assignment.weaponId] ?? 0) / 100;
    weaponHeat += impact.heat;
    expectedDamage += impact.damage * hitProbability;
    allMissProbability *= 1 - hitProbability;
  }
  const totalHeat = weaponHeat + movementHeat;
  return {
    weaponHeat,
    totalHeat,
    netHeat: totalHeat - heatDissipation,
    expectedDamage,
    volleyHitProbability: (1 - allMissProbability) * 100,
  };
}
