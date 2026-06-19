/**
 * Discriminated dispatch helpers for RecordSheetService.extractData.
 *
 * The UI still has a few legacy call-sites that pass a single "fat" config
 * object. This module converts those objects into a typed extractor target
 * without scattering casts through the service switch.
 */

import { UnsupportedUnitTypeError } from '@/types/printing';

import type { IAerospaceUnitConfig } from './dataExtractors.aerospace';
import type { IBattleArmorUnitConfig } from './dataExtractors.battleArmor';
import type { IInfantryUnitConfig } from './dataExtractors.infantry';
import type { IProtoMechUnitConfig } from './dataExtractors.protoMech';
import type { IVehicleUnitConfig } from './dataExtractors.vehicle';
import type { IUnitConfig } from './types';

export type IRecordSheetDispatchTarget =
  | { readonly kind: 'mech'; readonly unit: IUnitConfig }
  | { readonly kind: 'vehicle'; readonly unit: IVehicleUnitConfig }
  | { readonly kind: 'aerospace'; readonly unit: IAerospaceUnitConfig }
  | { readonly kind: 'battlearmor'; readonly unit: IBattleArmorUnitConfig }
  | { readonly kind: 'infantry'; readonly unit: IInfantryUnitConfig }
  | { readonly kind: 'protomech'; readonly unit: IProtoMechUnitConfig };

export type RecordSheetDispatchKind = IRecordSheetDispatchTarget['kind'];

type UnitTypeHint = {
  readonly type?: string;
  readonly unitType?: string;
};

type MechTypeHint = 'mech' | 'BattleMech' | 'OmniMech' | 'IndustrialMech';
type VehicleTypeHint = 'vehicle' | 'Vehicle' | 'VTOL' | 'Support Vehicle';
type AerospaceTypeHint = 'aerospace' | 'Aerospace' | 'Conventional Fighter';
type BattleArmorTypeHint = 'battlearmor' | 'Battle Armor';
type InfantryTypeHint = 'infantry' | 'Infantry';
type ProtoMechTypeHint = 'protomech' | 'ProtoMech';

export type IMechRecordSheetUnitInput = IUnitConfig &
  UnitTypeHint & {
    readonly type?: MechTypeHint;
    readonly unitType?: MechTypeHint;
  };

export type IVehicleRecordSheetUnitInput = IVehicleUnitConfig &
  UnitTypeHint & {
    readonly type?: VehicleTypeHint;
    readonly unitType?: VehicleTypeHint;
  };

export type IAerospaceRecordSheetUnitInput = IAerospaceUnitConfig &
  UnitTypeHint & {
    readonly type?: AerospaceTypeHint;
    readonly unitType?: AerospaceTypeHint;
  };

export type IBattleArmorRecordSheetUnitInput = IBattleArmorUnitConfig &
  UnitTypeHint & {
    readonly type?: BattleArmorTypeHint;
    readonly unitType?: BattleArmorTypeHint;
  };

export type IInfantryRecordSheetUnitInput = IInfantryUnitConfig &
  UnitTypeHint & {
    readonly type?: InfantryTypeHint;
    readonly unitType?: InfantryTypeHint;
  };

export type IProtoMechRecordSheetUnitInput = IProtoMechUnitConfig &
  UnitTypeHint & {
    readonly type?: ProtoMechTypeHint;
    readonly unitType?: ProtoMechTypeHint;
  };

export type IUnsupportedRecordSheetUnitInput = IUnitConfig & UnitTypeHint;

export type IRecordSheetUnitInput =
  | IMechRecordSheetUnitInput
  | IVehicleRecordSheetUnitInput
  | IAerospaceRecordSheetUnitInput
  | IBattleArmorRecordSheetUnitInput
  | IInfantryRecordSheetUnitInput
  | IProtoMechRecordSheetUnitInput
  | IUnsupportedRecordSheetUnitInput;

export function isRecordSheetDispatchTarget(
  candidate: unknown,
): candidate is IRecordSheetDispatchTarget {
  if (candidate === null || typeof candidate !== 'object') {
    return false;
  }
  return 'kind' in candidate && 'unit' in candidate;
}

function normalizeTypeHint(rawType: string | undefined): string {
  return (rawType ?? 'mech').trim().toLowerCase().replace(/\s+/g, '');
}

const DISPATCH_KIND_BY_TYPE_HINT: ReadonlyMap<string, RecordSheetDispatchKind> =
  new Map([
    ['mech', 'mech'],
    ['battlemech', 'mech'],
    ['omnimech', 'mech'],
    ['industrialmech', 'mech'],
    ['vehicle', 'vehicle'],
    ['vtol', 'vehicle'],
    ['supportvehicle', 'vehicle'],
    ['aerospace', 'aerospace'],
    ['conventionalfighter', 'aerospace'],
    ['battlearmor', 'battlearmor'],
    ['infantry', 'infantry'],
    ['protomech', 'protomech'],
  ]);

export function getRecordSheetDispatchKind(
  unit: UnitTypeHint,
): RecordSheetDispatchKind | undefined {
  return DISPATCH_KIND_BY_TYPE_HINT.get(
    normalizeTypeHint(unit.type ?? unit.unitType),
  );
}

export function isMechUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IMechRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'mech';
}

export function isVehicleUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IVehicleRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'vehicle';
}

export function isAerospaceUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IAerospaceRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'aerospace';
}

export function isBattleArmorUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IBattleArmorRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'battlearmor';
}

export function isInfantryUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IInfantryRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'infantry';
}

export function isProtoMechUnitInput(
  unit: IRecordSheetUnitInput,
): unit is IProtoMechRecordSheetUnitInput {
  return getRecordSheetDispatchKind(unit) === 'protomech';
}

export function dispatchTargetFromUnit(
  unit: IRecordSheetUnitInput,
): IRecordSheetDispatchTarget {
  if (isMechUnitInput(unit)) return { kind: 'mech', unit };
  if (isVehicleUnitInput(unit)) return { kind: 'vehicle', unit };
  if (isAerospaceUnitInput(unit)) return { kind: 'aerospace', unit };
  if (isBattleArmorUnitInput(unit)) return { kind: 'battlearmor', unit };
  if (isInfantryUnitInput(unit)) return { kind: 'infantry', unit };
  if (isProtoMechUnitInput(unit)) return { kind: 'protomech', unit };

  throw new UnsupportedUnitTypeError(unit.type ?? unit.unitType ?? 'unknown');
}
