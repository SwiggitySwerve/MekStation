/**
 * `applyDesignation` — combat-side gate that decides whether a
 * designation-dependent SPA's modifier applies to the current attack.
 *
 * The combat layer (`@/utils/gameplay/spaModifiers/...`) used to receive
 * `designatedWeaponType`, `designatedTargetId`, etc. as flat fields on
 * `IAttackerState`. Wave 2b moves the source of truth onto the pilot
 * record — `pilot.abilities[i].designation` — and routes every read
 * through this helper so the combat code doesn't reach into the pilot
 * structure directly.
 *
 * The helper is a pure predicate. Returns `true` when the SPA's effect
 * should fire for the current attack context, `false` otherwise. The
 * caller still owns the modifier math; this only answers "does the SPA
 * apply right now?".
 */

import type { RangeBracket } from '@/types/gameplay';
import type {
  ISPADesignation,
  SPAWeaponCategory,
} from '@/types/pilot/SPADesignation';

// =============================================================================
// Attack context
// =============================================================================

/**
 * Slice of attack state the designation gate consults. Kept narrow so
 * the helper composes cleanly into existing modifier functions without
 * pulling in the full `IAttackerState`.
 */
export interface IDesignationAttackContext {
  /** Canonical weapon id of the firing weapon (e.g. "medium_laser"). */
  readonly weaponTypeId?: string;
  /** Weapon category of the firing weapon. */
  readonly weaponCategory?: SPAWeaponCategory | string;
  /** Range bracket of the current attack. */
  readonly rangeBracket?: RangeBracket | string;
  /** Canonical id of the target unit. */
  readonly targetUnitId?: string;
  /** Terrain hex tag for the attack/movement. */
  readonly terrainTypeId?: string;
}

// =============================================================================
// Predicate
// =============================================================================

/**
 * Return `true` when the SPA carrying `designation` should apply to the
 * current attack context.
 *
 * Rules:
 *   - `null`/`undefined` designation → false (SPA needs a designation
 *     and the pilot didn't bind one — combat code should skip the SPA)
 *   - `weapon_type` → matches when `context.weaponTypeId` equals the
 *     designation's `weaponTypeId` (case-insensitive, slug-tolerant)
 *   - `weapon_category` → matches when `context.weaponCategory` equals
 *     the designation's `category`
 *   - `range_bracket` → matches when the bracket strings agree
 *   - `target` → matches when target unit ids agree AND the designation
 *     has a non-empty `targetUnitId` (deferred bindings don't fire)
 *   - `terrain` → matches when terrain ids agree
 *   - `skill` → always returns false in Phase 5; no canonical SPA uses
 *     this kind today
 */
export function applyDesignation(
  designation: ISPADesignation | null | undefined,
  context: IDesignationAttackContext,
): boolean {
  if (!designation) return false;

  switch (designation.kind) {
    case 'weapon_type': {
      if (!context.weaponTypeId) return false;
      return (
        normalizeId(designation.weaponTypeId) ===
        normalizeId(context.weaponTypeId)
      );
    }
    case 'weapon_category': {
      if (!context.weaponCategory) return false;
      return (
        designation.category ===
        (String(context.weaponCategory).toLowerCase() as SPAWeaponCategory)
      );
    }
    case 'range_bracket': {
      if (!context.rangeBracket) return false;
      return designation.bracket === String(context.rangeBracket).toLowerCase();
    }
    case 'target': {
      // Deferred bindings (empty unit id) intentionally don't fire.
      if (!designation.targetUnitId) return false;
      if (!context.targetUnitId) return false;
      return designation.targetUnitId === context.targetUnitId;
    }
    case 'terrain': {
      if (!context.terrainTypeId) return false;
      return (
        designation.terrainTypeId.toLowerCase() ===
        context.terrainTypeId.toLowerCase()
      );
    }
    case 'skill': {
      // Reserved for future ATOW SPAs. Not consumed by combat today.
      return false;
    }
    default: {
      // Exhaustiveness guard — adding a new variant without updating the
      // switch produces a compile error.
      const _exhaustive: never = designation;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * Inverse predicate — used by Blood-Stalker-style SPAs that buff the
 * designated target AND penalise non-designated targets. Returns `true`
 * when the SPA applies a "non-designated" effect to the current context
 * (i.e. the pilot has a real target binding but the current target id
 * doesn't match it). Empty/deferred bindings return `false`.
 */
export function isNonDesignatedTarget(
  designation: ISPADesignation | null | undefined,
  context: IDesignationAttackContext,
): boolean {
  if (!designation || designation.kind !== 'target') return false;
  if (!designation.targetUnitId) return false;
  if (!context.targetUnitId) return false;
  return designation.targetUnitId !== context.targetUnitId;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Lowercase + collapse whitespace + spaces-to-underscores so callers can
 * pass either "Medium Laser" or "medium_laser" and still match. We
 * stripe punctuation conservatively — the catalog ids are already slugs.
 */
function normalizeId(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
}
