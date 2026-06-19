import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { GameSide, IHexCoordinate } from '@/types/gameplay';
import type { IC3EquipmentMountState } from '@/utils/gameplay/c3Network';
import type {
  ECMMode,
  ECMType,
  IActiveProbe,
} from '@/utils/gameplay/electronicWarfare';

import type { IWeapon } from '../ai/types';

export interface ICatalogWeaponStats {
  readonly id: string;
  readonly name: string;
  readonly subType?: string;
  readonly damage: number | string;
  readonly heat: number;
  readonly ranges: {
    readonly minimum: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly extreme?: number;
  };
  readonly ammoPerTon?: number;
  readonly special?: readonly string[];
}

export type WeaponLookup = (id: string) => ICatalogWeaponStats | null;

export interface ICatalogAmmoStats {
  readonly id: string;
  readonly name: string;
  readonly shotsPerTon: number;
  readonly isExplosive: boolean;
  readonly compatibleWeaponIds: readonly string[];
}

export type AmmoLookup = (idOrName: string) => ICatalogAmmoStats | null;

export interface IHydratedAIWeaponsReport {
  readonly weapons: readonly IWeapon[];
  readonly resolvedEquipmentIds: readonly string[];
  readonly unresolvedEquipmentIds: readonly string[];
}

export interface IHydratedECMSuiteData {
  readonly type: ECMType;
  readonly sourceEquipmentId: string;
  readonly sourceLocation?: string;
  readonly mode?: ECMMode;
}

export interface IHydratedActiveProbeData {
  readonly type: IActiveProbe['type'];
  readonly sourceEquipmentId: string;
  readonly sourceLocation?: string;
}

export type IHydratedC3EquipmentData = IC3EquipmentMountState;

export interface IUnitEquipmentEntry {
  readonly id: string;
  readonly location: string;
  readonly isRearMounted?: boolean;
  readonly linkedEquipment?: readonly string[];
  readonly mode?: string;
  readonly currentMode?: string;
  readonly explosionDamage?: number;
}

export interface IHydratableEquipmentSignal {
  readonly id: string;
  readonly sourceLocation?: string;
  readonly currentMode?: string;
}

export type CriticalSlotMap = Readonly<
  Record<string, readonly (string | null)[]>
>;

export type HeatSinkKind = 'single' | 'double';

export interface IHydratedTalonState {
  readonly leftLegHasTalons: boolean;
  readonly rightLegHasTalons: boolean;
  readonly leftArmHasTalons: boolean;
  readonly rightArmHasTalons: boolean;
}

export interface IHydratedClawState {
  readonly leftArmHasClaw: boolean;
  readonly rightArmHasClaw: boolean;
}

export interface IHydratedUnitData {
  readonly runnerUnitId: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
  readonly fullUnit: IFullUnit;
  readonly aiWeapons: readonly IWeapon[];
  readonly gunnery?: number;
  readonly piloting?: number;
}
