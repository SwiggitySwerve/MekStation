import type { TechBase, RulesLevel } from '../TechBase';
import type { UnitType } from '../Unit';
import type { IEquipment } from '../Equipment';
import type { ArmorAllocation as CriticalArmorAllocation, UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';

export type IArmorAllocation = CriticalArmorAllocation;
export type IUnitConfiguration = UnitConfiguration;

export interface IEquipmentInstance {
  readonly id: string | number;
  readonly equipmentId: string | number;
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly status?: string;
}

export interface IFixedAllocation {
  readonly id: string | number;
  readonly name: string;
  readonly location: string;
  readonly slotIndex: number;
  readonly slots: number;
  readonly type: 'engine' | 'gyro' | 'cockpit' | 'structure' | 'armor' | 'heatsink' | 'other';
}

export interface IEquipmentGroup {
  readonly id: string | number;
  readonly name: string;
  readonly type: 'weapon_group' | 'linked_systems' | 'ammunition_feed';
  readonly equipment: Array<string | number>;
}

export type QuadVeeMode = 'Mech' | 'Vehicle';
export type LAMMode = 'BattleMech' | 'AirMech' | 'Fighter';

export interface MountedBattleArmor {
  readonly id: string | number;
  readonly name: string;
  readonly squad: string;
  readonly troopers: number;
  readonly location: string;
  readonly isOmniMount: boolean;
}

export interface ICompleteUnitConfiguration {
  readonly id: string | number;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly unitType?: UnitType | string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era?: string;
  readonly tonnage: number;
  readonly structure?: Record<string, unknown>;
  readonly engine?: Record<string, unknown>;
  readonly gyro?: Record<string, unknown>;
  readonly cockpit?: Record<string, unknown>;
  readonly armor?: Record<string, unknown>;
  readonly heatSinks?: Record<string, unknown>;
  readonly jumpJets?: Record<string, unknown>;
  readonly equipment: IEquipmentInstance[];
  readonly fixedAllocations?: IFixedAllocation[];
  readonly groups?: IEquipmentGroup[];
  readonly metadata: {
    readonly source?: string;
    readonly mulId?: string | number;
    readonly role?: string | { readonly name: string };
  };
  readonly mountedBattleArmor?: MountedBattleArmor[];
  readonly quadVeeConfiguration?: {
    readonly currentMode: QuadVeeMode;
  };
  readonly lamConfiguration?: {
    readonly currentMode: LAMMode;
  };
}


