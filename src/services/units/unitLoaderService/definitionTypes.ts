import type { IUnitContract } from '@/types/contracts';
import type { IUnitDefinitionReference } from '@/types/unit/UnitDefinition';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
export type {
  UnitSource,
  IUnitDefinitionReference,
} from '@/types/unit/UnitDefinition';

/** Catalog admission and editor capability, keyed by the shared family registry. */
export const UNIT_DEFINITION_FAMILIES = {
  battlemechs: {
    unitTypes: [
      UnitType.BATTLEMECH,
      UnitType.OMNIMECH,
      UnitType.INDUSTRIALMECH,
    ],
    store: 'battlemech',
  },
  vehicles: {
    unitTypes: [
      UnitType.VEHICLE,
      UnitType.VTOL,
      UnitType.SUPPORT_VEHICLE,
      'SupportVehicle',
    ],
    store: null,
  },
  aerospace: {
    unitTypes: [
      UnitType.AEROSPACE,
      UnitType.CONVENTIONAL_FIGHTER,
      UnitType.SMALL_CRAFT,
      'ConventionalFighter',
      'SmallCraft',
    ],
    store: null,
  },
  capital: {
    unitTypes: [
      UnitType.DROPSHIP,
      UnitType.JUMPSHIP,
      UnitType.WARSHIP,
      UnitType.SPACE_STATION,
    ],
    store: null,
  },
  battlearmor: {
    unitTypes: [UnitType.BATTLE_ARMOR, 'BattleArmor', 'BATTLEARMOR'],
    store: null,
  },
  infantry: { unitTypes: [UnitType.INFANTRY], store: null },
} as const satisfies Record<
  UnitFamily,
  {
    readonly unitTypes: readonly IUnitContract['unitType'][];
    readonly store: 'battlemech' | null;
  }
>;

type FamilyUnitType<F extends UnitFamily> =
  `${(typeof UNIT_DEFINITION_FAMILIES)[F]['unitTypes'][number]}`;

/** Narrow each contract branch without making optional non-mech fields required. */
export type UnitDefinitionForFamily<
  F extends UnitFamily,
  D = IUnitContract,
> = D extends IUnitContract
  ? Extract<D['unitType'], FamilyUnitType<F>> extends never
    ? never
    : D & { unitType: Extract<D['unitType'], FamilyUnitType<F>> }
  : never;

export function isDefinitionForFamily<F extends UnitFamily>(
  family: F,
  definition: IUnitContract,
): definition is UnitDefinitionForFamily<F> {
  const types: readonly string[] = UNIT_DEFINITION_FAMILIES[family].unitTypes;
  return types.includes(definition.unitType);
}

export interface IUnitDefinitionReader {
  read(reference: IUnitDefinitionReference): Promise<unknown | null>;
}

export type UnitDefinitionLoadErrorCode =
  | 'unknown-family'
  | 'family-not-found'
  | 'not-found'
  | 'read-failed'
  | 'invalid-definition';

export type UnitDefinitionLoadResult =
  | {
      readonly success: true;
      readonly definition: IUnitContract;
      readonly family?: UnitFamily;
      readonly reference: IUnitDefinitionReference;
    }
  | {
      readonly success: false;
      readonly reference: IUnitDefinitionReference;
      readonly code: UnitDefinitionLoadErrorCode;
      readonly error: string;
      readonly issues?: ReadonlyArray<{
        readonly path: string;
        readonly message: string;
      }>;
    };

export type FamilyUnitDefinitionLoadResult<F extends UnitFamily> =
  | (Extract<UnitDefinitionLoadResult, { success: true }> & {
      readonly family: F;
      readonly definition: UnitDefinitionForFamily<F>;
    })
  | Extract<UnitDefinitionLoadResult, { success: false }>;
