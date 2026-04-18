/**
 * Aerospace Combat Dispatch
 *
 * A small set of polymorphic entry points that the combat engine (GameEngine,
 * InteractiveSession) can call without needing to know whether the target is
 * a mech, vehicle, or aerospace unit. Aerospace branches short-circuit to the
 * aerospace-specific resolvers; non-aerospace targets pass through to the
 * caller-supplied ground resolvers.
 *
 * Design note: we do NOT touch the existing mech `resolveDamage` /
 * `hitLocation` / movement code. Instead, callers import this dispatcher and
 * feed in the mech path via a fallback resolver. This keeps mech tests stable.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 1)
 */

import {
  type IBaseUnit,
  isAerospaceUnit,
} from '../../../types/unit/BaseUnitInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import {
  resolveAerospaceCriticalHit,
  type IAerospaceCriticalResult,
  type IResolveAerospaceCriticalHitParams,
} from './criticalHits';
import {
  aerospaceResolveDamage,
  type IAerospaceDamageResult,
  type IAerospaceResolveDamageParams,
} from './damage';
import {
  determineAerospaceHitLocation,
  type IAerospaceHitLocation,
  type IDetermineAerospaceHitLocationOptions,
} from './hitLocation';
import {
  resolveAerospaceMovement,
  type IAerospaceMovementParams,
  type IAerospaceMovementResult,
} from './movement';
import { AerospaceAttackDirection } from './state';

// ============================================================================
// Aerospace target predicate — accepts `{unitType}` or full `IBaseUnit`
// ============================================================================

/**
 * True when the supplied unit / unit-like object is an aerospace unit.
 * Accepts either a bare `{unitType}` descriptor or a full `IBaseUnit` so the
 * dispatcher is usable from any layer.
 */
export function isAerospaceTarget(
  unit: { readonly unitType: UnitType } | IBaseUnit,
): boolean {
  // Prefer the canonical helper when we have a full IBaseUnit.
  if ('id' in unit) {
    return isAerospaceUnit(unit as IBaseUnit);
  }
  return (
    unit.unitType === UnitType.AEROSPACE ||
    unit.unitType === UnitType.CONVENTIONAL_FIGHTER ||
    unit.unitType === UnitType.SMALL_CRAFT
  );
}

/**
 * True when the target should use the Small Craft hit-location override
 * (Wings → Sides).
 */
export function targetIsSmallCraft(unit: {
  readonly unitType: UnitType;
}): boolean {
  return unit.unitType === UnitType.SMALL_CRAFT;
}

// ============================================================================
// Dispatch: damage
// ============================================================================

/**
 * Generic `resolveDamage` shim. When the target is aerospace, route to the
 * aerospace damage chain. Otherwise the caller's `onGround` fallback is
 * invoked (lets the mech / vehicle pipelines stay untouched).
 */
export function dispatchResolveDamage<TGroundResult>(
  target: { readonly unitType: UnitType },
  aeroParams: IAerospaceResolveDamageParams,
  onGround: () => TGroundResult,
): IAerospaceDamageResult | TGroundResult {
  if (isAerospaceTarget(target)) {
    return aerospaceResolveDamage(aeroParams);
  }
  return onGround();
}

// ============================================================================
// Dispatch: critical hits
// ============================================================================

export function dispatchResolveCriticalHits<TGroundResult>(
  target: { readonly unitType: UnitType },
  aeroParams: IResolveAerospaceCriticalHitParams,
  onGround: () => TGroundResult,
): IAerospaceCriticalResult | TGroundResult {
  if (isAerospaceTarget(target)) {
    return resolveAerospaceCriticalHit(aeroParams);
  }
  return onGround();
}

// ============================================================================
// Dispatch: hit location
// ============================================================================

export interface IDispatchHitLocationParams {
  readonly target: { readonly unitType: UnitType };
  readonly direction: AerospaceAttackDirection;
  readonly options?: IDetermineAerospaceHitLocationOptions;
}

/**
 * Return an aerospace hit location for aerospace targets; returns `null` for
 * ground targets so the caller can fall back to `hitLocation.ts`.
 */
export function dispatchHitLocation(
  params: IDispatchHitLocationParams,
): IAerospaceHitLocation | null {
  if (!isAerospaceTarget(params.target)) {
    return null;
  }
  return determineAerospaceHitLocation(params.direction, {
    ...params.options,
    isSmallCraft: targetIsSmallCraft(params.target),
  });
}

// ============================================================================
// Dispatch: movement
// ============================================================================

export function dispatchMovement<TGroundResult>(
  target: { readonly unitType: UnitType },
  aeroParams: IAerospaceMovementParams,
  onGround: () => TGroundResult,
): IAerospaceMovementResult | TGroundResult {
  if (isAerospaceTarget(target)) {
    return resolveAerospaceMovement(aeroParams);
  }
  return onGround();
}
