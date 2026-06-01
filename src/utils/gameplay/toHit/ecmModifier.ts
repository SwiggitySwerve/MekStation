/**
 * ECM (Electronic Counter-Measures) to-hit modifier.
 *
 * Per `add-ecm-tohit-modifier` (closes playtest gap #1): a weapon attack
 * whose guidance system is degraded by an active ECM bubble incurs a
 * `+1 to-hit` penalty. The modifier is positional — each guidance type
 * has its own rule for whether the shooter, target, or both must be
 * inside the bubble.
 *
 * The four guidance types covered:
 *
 *   - `'c3'`      — C3 link broken when the SHOOTER is in an ECM bubble.
 *                   The target's coverage is irrelevant: the link breaks
 *                   at the source.
 *   - `'artemis'` — Artemis-IV lock degraded when the TARGET is in an
 *                   ECM bubble. The lock is on the target, so the bubble
 *                   at the target is what matters.
 *   - `'tc'`      — Targeting computer degraded when the SHOOTER is in
 *                   an ECM bubble. TC processing happens on the shooter.
 *   - `'narc'`    — NARC homing degraded when the TARGET (carrying the
 *                   NARC beacon) is in an ECM bubble.
 *   - `'none'`    — A weapon with no electronic guidance is unaffected.
 *
 * The modifier is added to the modifier accumulator and stacks
 * additively with range / movement / terrain / heat / other modifiers
 * (per the spec scenario "Modifier stacks additively").
 *
 * The full `EcmCoverageMap` (per-hex scenario-time resolution of where
 * ECM bubbles cover the map) is OUT of scope for this change — callers
 * provide the resolved per-attack flags as `IEcmCoverageState`. A
 * follow-up change wires the map-level resolution.
 *
 * @spec openspec/changes/add-ecm-tohit-modifier/specs/to-hit-resolution/spec.md
 */

import type { IToHitModifierDetail } from '@/types/gameplay';

/**
 * The four guidance types affected by ECM, plus `'none'` for weapons
 * with no electronic guidance system. The to-hit pipeline reads this
 * tag off the weapon definition (or off the attacker state if the
 * caller resolved it eagerly).
 */
export type WeaponGuidanceType = 'c3' | 'artemis' | 'tc' | 'narc' | 'none';

/**
 * Resolved per-attack ECM coverage state. The caller (combat resolver
 * or scenario engine) computes these flags by intersecting each ECM
 * bubble's hex coverage with the shooter's and target's positions.
 *
 * The full scenario-time EcmCoverageMap lives in a follow-up — this
 * shape is stable and the map producer will populate it.
 */
export interface IEcmCoverageState {
  /** Whether the shooter's hex is inside any active ECM bubble. */
  readonly attackerInBubble: boolean;
  /** Whether the target's hex is inside any active ECM bubble. */
  readonly targetInBubble: boolean;
}

/**
 * The four `reason` codes the modifier carries. The post-resolve UI
 * reads `reason` to label the badge so the operator can see why the
 * to-hit was elevated.
 */
export type EcmModifierReason =
  | 'c3-broken'
  | 'artemis-degraded'
  | 'tc-degraded'
  | 'narc-degraded';

/** The `+1` value the spec mandates. Exported for test parity. */
export const ECM_MODIFIER_VALUE = 1;

/**
 * Per-guidance ECM modifier rule. Each entry encodes which of the two
 * ECM flags must be set for the modifier to fire, and the `reason` the
 * resulting modifier carries.
 *
 * Exported so tests can iterate the table directly rather than coding
 * the rule in two places.
 */
export const ECM_TO_HIT_MODIFIERS: Readonly<
  Record<
    Exclude<WeaponGuidanceType, 'none'>,
    {
      readonly fires: (ecm: IEcmCoverageState) => boolean;
      readonly reason: EcmModifierReason;
      readonly description: string;
    }
  >
> = {
  c3: {
    fires: (ecm) => ecm.attackerInBubble,
    reason: 'c3-broken',
    description: 'C3 link broken by ECM bubble at shooter',
  },
  artemis: {
    fires: (ecm) => ecm.targetInBubble,
    reason: 'artemis-degraded',
    description: 'Artemis-IV lock degraded by ECM bubble at target',
  },
  tc: {
    fires: (ecm) => ecm.attackerInBubble,
    reason: 'tc-degraded',
    description: 'Targeting computer degraded by ECM bubble at shooter',
  },
  narc: {
    fires: (ecm) => ecm.targetInBubble,
    reason: 'narc-degraded',
    description: 'NARC homing degraded by ECM bubble at target',
  },
};

/**
 * Compute the ECM to-hit modifier for a single weapon attack.
 *
 *   - Returns `null` when the guidance is `'none'` or when the per-guidance
 *     ECM rule does NOT fire (no modifier added — the caller leaves the
 *     accumulator unchanged).
 *   - Returns an `IToHitModifierDetail` with `value: +1`, `source: 'equipment'`,
 *     and a `reason`-tagged name when the rule fires.
 *
 * The returned modifier slots into the existing aggregator unchanged —
 * it stacks additively with range / movement / terrain / heat / etc.
 */
export function calculateEcmModifier(
  guidance: WeaponGuidanceType,
  ecm: IEcmCoverageState,
): IToHitModifierDetail | null {
  if (guidance === 'none') return null;

  const rule = ECM_TO_HIT_MODIFIERS[guidance];
  if (!rule.fires(ecm)) return null;

  return {
    name: `ECM (${rule.reason})`,
    value: ECM_MODIFIER_VALUE,
    source: 'equipment',
    description: rule.description,
  };
}
