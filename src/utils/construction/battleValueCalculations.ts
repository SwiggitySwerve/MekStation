/**
 * Battle Value public barrel + unified dispatch entry point.
 *
 * Mech BV paths are re-exported from the dedicated battleValue* modules.
 * Non-mech unit paths (ProtoMech, future Vehicle/Aerospace) are dispatched
 * via {@link calculateBattleValueForUnit}, which selects the per-type
 * calculator based on the unit shape.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 */

export * from './battleValueExplosivePenalties';
export * from './battleValueMovement';
export * from './battleValueDefensive';
export * from './battleValueOffensive';
export * from './battleValueTotals';
export * from './battleValuePilot';

// ProtoMech BV — re-exported so callers can import the proto breakdown type
// and public calculators from the same barrel as the mech BV utilities.
export {
  calculateProtoMechBV,
  calculateProtoPointBV,
  calculateProtoSpeedFactor,
  getProtoChassisMultiplier,
} from './protomech/protoMechBV';
export type {
  IProtoMechBVBreakdown,
  IProtoMechBVOptions,
} from './protomech/protoMechBV';

import type { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  calculateProtoMechBV as _calculateProtoMechBV,
  type IProtoMechBVBreakdown,
  type IProtoMechBVOptions,
} from './protomech/protoMechBV';

/**
 * Unified per-unit BV dispatcher result.
 *
 * `kind` identifies which calculator produced the breakdown so callers can
 * narrow on the payload (currently only `protomech` is implemented here;
 * mech units continue to go through the existing `CalculationService` path).
 */
export type UnitBVResult = {
  readonly kind: 'protomech';
  readonly breakdown: IProtoMechBVBreakdown;
};

/**
 * Route a unit to its per-type BV calculator. Currently implemented for
 * ProtoMech; other unit types fall through with `undefined` so the caller
 * can keep using its existing mech path unchanged.
 *
 * @param unit  A discriminated unit value (currently `IProtoMechUnit`).
 * @param options Optional per-type overrides (skill, etc.).
 */
export function calculateBattleValueForUnit(
  unit: IProtoMechUnit,
  options?: IProtoMechBVOptions,
): UnitBVResult;
export function calculateBattleValueForUnit(
  unit: { readonly unitType?: UnitType | string } | IProtoMechUnit,
  options?: IProtoMechBVOptions,
): UnitBVResult | undefined;
export function calculateBattleValueForUnit(
  unit: { readonly unitType?: UnitType | string } | IProtoMechUnit,
  options?: IProtoMechBVOptions,
): UnitBVResult | undefined {
  if (unit && (unit as IProtoMechUnit).unitType === UnitType.PROTOMECH) {
    const breakdown = _calculateProtoMechBV(
      unit as IProtoMechUnit,
      options ?? {},
    );
    return { kind: 'protomech', breakdown };
  }
  return undefined;
}
