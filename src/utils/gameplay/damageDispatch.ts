/**
 * Damage-Resolution Dispatcher
 *
 * Routes a damage-application call to the correct per-unit-type pipeline.
 * Mech targets go through the existing `resolveDamage` mech pipeline; vehicle
 * targets go through `vehicleResolveDamage` (motive-damage, no adjacent
 * transfer, etc.). This is the entry point the combat engine should call
 * once multiple unit types are present on the battlefield.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-combat-dispatch
 */

import {
  IVehicleCombatState,
  IVehicleHitLocationResult,
  IVehicleResolveDamageResult,
} from '@/types/gameplay';

import type { IResolveDamageResult, IUnitDamageState } from './damage/types';

import { resolveDamage } from './damage/resolve';
import {
  IVehicleResolveDamageOptions,
  vehicleResolveDamage,
} from './vehicleDamage';

// =============================================================================
// Target discriminator
// =============================================================================

/**
 * Discriminator for dispatch: the caller flags the target so we don't have to
 * inspect state shape. Values match the `UnitType` taxonomy where practical
 * but stay as string literals to keep this module low-dependency.
 */
export type DamageDispatchKind = 'mech' | 'vehicle';

export interface IDamageDispatchMechInput {
  readonly kind: 'mech';
  readonly state: IUnitDamageState;
  readonly location: Parameters<typeof resolveDamage>[1];
  readonly damage: number;
}

export interface IDamageDispatchVehicleInput {
  readonly kind: 'vehicle';
  readonly state: IVehicleCombatState;
  readonly hit: IVehicleHitLocationResult;
  readonly damage: number;
  readonly options?: IVehicleResolveDamageOptions;
}

export type DamageDispatchInput =
  | IDamageDispatchMechInput
  | IDamageDispatchVehicleInput;

export interface IDamageDispatchMechResult {
  readonly kind: 'mech';
  readonly state: IUnitDamageState;
  readonly result: IResolveDamageResult['result'];
}

export interface IDamageDispatchVehicleResult {
  readonly kind: 'vehicle';
  readonly state: IVehicleCombatState;
  readonly result: IVehicleResolveDamageResult;
}

export type DamageDispatchResult =
  | IDamageDispatchMechResult
  | IDamageDispatchVehicleResult;

// =============================================================================
// Dispatch
// =============================================================================

/**
 * Route a damage application to the appropriate resolver and return a
 * discriminated result. Callers switch on `result.kind` to unwrap the
 * unit-type-specific state + result.
 */
export function dispatchDamage(
  input: DamageDispatchInput,
): DamageDispatchResult {
  if (input.kind === 'mech') {
    const resolved = resolveDamage(input.state, input.location, input.damage);
    return {
      kind: 'mech',
      state: resolved.state,
      result: resolved.result,
    };
  }

  const resolved = vehicleResolveDamage(
    input.state,
    input.hit,
    input.damage,
    input.options,
  );
  return {
    kind: 'vehicle',
    state: resolved.state,
    result: resolved,
  };
}
