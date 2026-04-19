/**
 * Infantry Combat Dispatch
 *
 * Polymorphic entry points mirroring `aerospace/dispatch.ts`. The combat
 * engine calls these without needing to know whether the target is a mech,
 * vehicle, aerospace, or infantry unit. Infantry targets short-circuit into
 * `infantryResolveDamage`; non-infantry targets fall through to the caller's
 * supplied `onGround` resolver.
 *
 * Crucially, dispatching to infantry also SKIPS mech-style critical hits —
 * infantry have no slots, so crits are never rolled against them.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Combat Dispatch
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import {
  infantryResolveDamage,
  type IInfantryDamageResult,
  type IInfantryResolveDamageParams,
} from './damage';

// ============================================================================
// Target predicate
// ============================================================================

/**
 * True when the supplied unit / unit-like is an infantry platoon.
 * Accepts any object carrying a `unitType` field (bare descriptor OR full
 * `IBaseUnit` — `isInfantry` from PersonnelInterfaces is a superset; we use
 * a simple equality check here to keep the dispatch module zero-dependency
 * on interface shape).
 */
export function isInfantryTarget(unit: {
  readonly unitType: UnitType;
}): boolean {
  return unit.unitType === UnitType.INFANTRY;
}

// ============================================================================
// Dispatch: damage
// ============================================================================

/**
 * Generic damage shim. When the target is an infantry unit, route to the
 * infantry damage resolver. Otherwise the caller's `onGround` fallback is
 * invoked (mech, vehicle, aerospace, etc.).
 */
export function dispatchResolveInfantryDamage<TGroundResult>(
  target: { readonly unitType: UnitType },
  infParams: IInfantryResolveDamageParams,
  onGround: () => TGroundResult,
): IInfantryDamageResult | TGroundResult {
  if (isInfantryTarget(target)) {
    return infantryResolveDamage(infParams);
  }
  return onGround();
}

// ============================================================================
// Dispatch: critical hits (always skipped for infantry)
// ============================================================================

/**
 * Infantry targets never receive mech-style critical-hit resolution. The
 * caller should invoke this wrapper with its normal mech/vehicle crit
 * resolver as `onGround` — when the target is infantry, we short-circuit to
 * `null` without rolling.
 *
 * Returns `null` for infantry (explicit skip) so callers can log the
 * short-circuit if desired; returns `onGround()`'s result otherwise.
 */
export function dispatchResolveCriticalHitsForInfantry<TGroundResult>(
  target: { readonly unitType: UnitType },
  onGround: () => TGroundResult,
): TGroundResult | null {
  if (isInfantryTarget(target)) {
    return null;
  }
  return onGround();
}
