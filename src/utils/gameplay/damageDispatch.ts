/**
 * Damage-Resolution Dispatcher
 *
 * Routes a damage-application call to the correct per-unit-type pipeline.
 * Mech targets go through the existing `resolveDamage` mech pipeline; vehicle
 * targets go through `vehicleResolveDamage` (motive-damage, no adjacent
 * transfer, etc.); battle-armor targets go through `battleArmorResolveDamage`
 * (per-trooper armor pool, one-hit-at-a-time distribution, no crits).
 * This is the entry point the combat engine should call once multiple unit
 * types are present on the battlefield.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-combat-dispatch
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement battlearmor-combat-dispatch
 */

import {
  IBattleArmorCombatState,
  IBattleArmorResolveDamageResult,
  IVehicleCombatState,
  IVehicleHitLocationResult,
  IVehicleResolveDamageResult,
} from '@/types/gameplay';

import type { IResolveDamageResult, IUnitDamageState } from './damage/types';

import {
  battleArmorResolveDamage,
  IBattleArmorResolveDamageOptions,
} from './battlearmor/damage';
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
export type DamageDispatchKind = 'mech' | 'vehicle' | 'battlearmor';

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

/**
 * Battle-armor dispatch input. Unlike mechs/vehicles, BA damage is a LIST of
 * atomic hits (cluster weapons pre-resolve to N 1-damage missiles, etc.) —
 * each hit picks its own random surviving trooper.
 */
export interface IDamageDispatchBattleArmorInput {
  readonly kind: 'battlearmor';
  readonly state: IBattleArmorCombatState;
  /** Per-hit damage list. A single 5-damage shot passes `[5]`. */
  readonly perHitDamage: readonly number[];
  readonly options?: IBattleArmorResolveDamageOptions;
}

export type DamageDispatchInput =
  | IDamageDispatchMechInput
  | IDamageDispatchVehicleInput
  | IDamageDispatchBattleArmorInput;

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

export interface IDamageDispatchBattleArmorResult {
  readonly kind: 'battlearmor';
  readonly state: IBattleArmorCombatState;
  readonly result: IBattleArmorResolveDamageResult;
}

export type DamageDispatchResult =
  | IDamageDispatchMechResult
  | IDamageDispatchVehicleResult
  | IDamageDispatchBattleArmorResult;

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

  if (input.kind === 'vehicle') {
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

  // BA path — per-trooper one-hit-at-a-time distribution (no mech-style crits).
  const resolved = battleArmorResolveDamage(
    input.state,
    input.perHitDamage,
    input.options,
  );
  return {
    kind: 'battlearmor',
    state: resolved.state,
    result: resolved,
  };
}
