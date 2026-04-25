/**
 * Discriminated dispatch types for `RecordSheetService.extractDataByType`.
 *
 * Each unit-type extractor (mech, vehicle, aerospace, battlearmor,
 * infantry, protomech) accepts a different config shape. Instead of
 * dispatching with `as unknown as IFooUnitConfig` casts inside the
 * switch in `RecordSheetService`, callers now hand the service an
 * `IRecordSheetDispatchTarget` whose `kind` discriminator tells
 * TypeScript which extractor to invoke and exactly which `unit`
 * shape is required.
 *
 * Co-located with the per-type extractors that own each `unit` shape so
 * that this file stays inside `src/services/printing/` and does not pull
 * runtime extractor code into the type layer.
 */

import type { IAerospaceUnitConfig } from './dataExtractors.aerospace';
import type { IBattleArmorUnitConfig } from './dataExtractors.battleArmor';
import type { IInfantryUnitConfig } from './dataExtractors.infantry';
import type { IProtoMechUnitConfig } from './dataExtractors.protoMech';
import type { IVehicleUnitConfig } from './dataExtractors.vehicle';
import type { IUnitConfig } from './types';

/**
 * Discriminated dispatch target for `extractDataByType`.
 *
 * Each variant carries:
 *   - `kind`: the discriminator string (matches the legacy `unit.type`
 *     values that `extractDataByType` previously read at runtime).
 *   - `unit`: the unit config shape required by that path's extractor.
 */
export type IRecordSheetDispatchTarget =
  | { kind: 'mech'; unit: IUnitConfig }
  | { kind: 'vehicle'; unit: IVehicleUnitConfig }
  | { kind: 'aerospace'; unit: IAerospaceUnitConfig }
  | { kind: 'battlearmor'; unit: IBattleArmorUnitConfig }
  | { kind: 'infantry'; unit: IInfantryUnitConfig }
  | { kind: 'protomech'; unit: IProtoMechUnitConfig };

/**
 * Discriminator values accepted by `extractDataByType`.
 */
export type RecordSheetDispatchKind = IRecordSheetDispatchTarget['kind'];

/**
 * Type-guard: is this argument already a discriminated dispatch target?
 *
 * Used by the back-compat overload in `RecordSheetService` to decide
 * whether the caller passed an already-typed dispatch target or the
 * legacy fat unit config. A genuine target has both a string `kind`
 * and a nested `unit` object.
 */
export function isRecordSheetDispatchTarget(
  candidate: unknown,
): candidate is IRecordSheetDispatchTarget {
  if (candidate === null || typeof candidate !== 'object') {
    return false;
  }
  const maybe = candidate as { kind?: unknown; unit?: unknown };
  return typeof maybe.kind === 'string' && typeof maybe.unit === 'object';
}

/**
 * Build a dispatch target from the legacy fat-config shape.
 *
 * The legacy callers of `extractDataByType` pass a single object that
 * carries fields for every unit type, with a `type` property selecting
 * which set is meaningful. To keep those callers working without
 * scattering casts across the dispatch switch, this helper centralises
 * the (single) cast required to map the fat config into the
 * discriminated union.
 *
 * Throws if the `type` field carries an unsupported discriminant — the
 * same failure mode as the original switch's `default` case, but
 * surfaced before the dispatch runs so the error message is consistent.
 */
export function dispatchTargetFromLegacyConfig(
  unit: IUnitConfig & { type?: string },
): IRecordSheetDispatchTarget {
  const kind = (unit.type ?? 'mech') as RecordSheetDispatchKind;
  switch (kind) {
    case 'mech':
      return { kind, unit };
    case 'vehicle':
      return { kind, unit: unit as unknown as IVehicleUnitConfig };
    case 'aerospace':
      return { kind, unit: unit as unknown as IAerospaceUnitConfig };
    case 'battlearmor':
      return { kind, unit: unit as unknown as IBattleArmorUnitConfig };
    case 'infantry':
      return { kind, unit: unit as unknown as IInfantryUnitConfig };
    case 'protomech':
      return { kind, unit: unit as unknown as IProtoMechUnitConfig };
    default: {
      const exhaustive: never = kind;
      throw new Error(
        `Unsupported record-sheet dispatch kind: ${String(exhaustive)}`,
      );
    }
  }
}
