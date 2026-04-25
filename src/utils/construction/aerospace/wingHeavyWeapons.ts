/**
 * Aerospace Wing-Mounted Heavy Weapon Caps
 *
 * Aerospace Fighters and Conventional Fighters mount weapons in NOSE,
 * LEFT_WING, RIGHT_WING, AFT, or FUSELAGE arcs. The total tonnage of
 * "heavy" weapons (PPC family, Gauss family, AC/20, Heavy Gauss, etc.)
 * mounted in a single wing arc is capped to keep wing structures from
 * being overstressed.
 *
 * Cap rule (per MegaMekLab convention):
 *   maxHeavyTonsPerWing = floor(unitTonnage / 10)
 *
 * Heavy classification covers BattleTech weapons that ground-side rules
 * already treat as "explosive" or "heavy mass" mounts: PPC variants,
 * all Gauss flavors, AC/20, and improved-heavy weapons. The caller
 * provides the weapon set; this module encodes the rule and the
 * canonical heavy-weapon name list, and exposes a validator.
 *
 * Small Craft use LEFT_SIDE / RIGHT_SIDE arcs with their own broad-side
 * mounting rules; this cap rule does NOT apply to small craft.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Equipment Mounting per Arc
 */

import type { AerospaceValidationError } from './validationRules';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Heavy Weapon Classification
// ============================================================================

/**
 * Canonical list of "heavy" weapon name fragments that count against the
 * wing tonnage cap. Matched case-insensitively against either the equipment
 * id or the display name. Keep this list minimal and explicit — adding a
 * new family requires reviewing the cap value too.
 */
const HEAVY_WEAPON_FRAGMENTS: readonly string[] = [
  'ppc',
  'gauss',
  'ac/20',
  'ac20',
  'autocannon/20',
];

/**
 * Return true if the equipment id or name identifies a heavy weapon for
 * wing-mount cap purposes.
 *
 * @param idOrName - equipment id (e.g. "isppc") or display name ("PPC")
 */
export function isWingHeavyWeapon(idOrName: string): boolean {
  const lowered = idOrName.toLowerCase();
  return HEAVY_WEAPON_FRAGMENTS.some((fragment) => lowered.includes(fragment));
}

// ============================================================================
// Cap Calculation
// ============================================================================

/**
 * Wing arcs that are subject to the heavy-weapon cap. Small craft side arcs
 * are intentionally excluded — they follow capital-ship-style broad-side
 * rules tracked separately by the bay system.
 */
const CAPPED_WING_ARCS: ReadonlySet<AerospaceArc> = new Set([
  AerospaceArc.LEFT_WING,
  AerospaceArc.RIGHT_WING,
]);

/**
 * Maximum tons of heavy weapons mountable in a single wing arc.
 * Returns 0 for sub-types or arcs where the rule does not apply.
 *
 * @param tonnage - chassis tonnage
 * @param subType - aerospace sub-type (small craft has no per-wing cap)
 */
export function maxHeavyWeaponTonsPerWing(
  tonnage: number,
  subType: AerospaceSubType,
): number {
  if (subType === AerospaceSubType.SMALL_CRAFT) return 0;
  return Math.floor(tonnage / 10);
}

/**
 * Return true if a wing arc has room for an additional `addedTons` of heavy
 * weaponry given an existing load already on that wing.
 */
export function canMountHeavyOnWing(
  arc: AerospaceArc,
  existingHeavyTonsOnArc: number,
  addedTons: number,
  tonnage: number,
  subType: AerospaceSubType,
): boolean {
  if (!CAPPED_WING_ARCS.has(arc)) return true;
  const cap = maxHeavyWeaponTonsPerWing(tonnage, subType);
  return existingHeavyTonsOnArc + addedTons <= cap;
}

// ============================================================================
// Aggregation
// ============================================================================

/** Minimal shape needed from a mounted equipment item for cap accounting. */
export interface WingMountInput {
  readonly arc: AerospaceArc;
  readonly idOrName: string;
  readonly tons: number;
}

/**
 * Sum heavy-weapon tonnage on each capped wing arc. Non-heavy items and
 * non-wing arcs are ignored. The returned map only contains entries for
 * the LEFT_WING / RIGHT_WING arcs (zero if no heavy weapons are present).
 */
export function heavyTonsByWing(
  items: ReadonlyArray<WingMountInput>,
): Map<AerospaceArc, number> {
  const result = new Map<AerospaceArc, number>([
    [AerospaceArc.LEFT_WING, 0],
    [AerospaceArc.RIGHT_WING, 0],
  ]);
  for (const item of items) {
    if (!CAPPED_WING_ARCS.has(item.arc)) continue;
    if (!isWingHeavyWeapon(item.idOrName)) continue;
    result.set(item.arc, (result.get(item.arc) ?? 0) + item.tons);
  }
  return result;
}

// ============================================================================
// Validation Rule (VAL-AERO-WING-HEAVY)
// ============================================================================

/**
 * VAL-AERO-WING-HEAVY: per-wing heavy-weapon tonnage must not exceed
 * floor(tonnage / 10) for ASF / CF. Small craft are exempt.
 */
export function validateWingHeavyWeapons(
  items: ReadonlyArray<WingMountInput>,
  tonnage: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  if (subType === AerospaceSubType.SMALL_CRAFT) return [];
  const cap = maxHeavyWeaponTonsPerWing(tonnage, subType);
  const errors: AerospaceValidationError[] = [];
  const tons = heavyTonsByWing(items);
  tons.forEach((sum, arc) => {
    if (sum > cap) {
      errors.push({
        ruleId: 'VAL-AERO-WING-HEAVY',
        message: `Wing "${arc}" carries ${sum}t of heavy weapons; cap for ${tonnage}t ${subType} is ${cap}t`,
      });
    }
  });
  return errors;
}
