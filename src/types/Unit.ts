/**
 * Unit.ts
 * Core data contracts for BattleTech units used across the web experience.
 * These interfaces model both the canonical construction entities and the
 * compendium API payloads so UI components can rely on a single source of truth.
 */

import { TechBase, RulesLevel } from './TechBase';
import { IInstalledEquipment } from './BattleMech';

export enum UnitType {
  BATTLEMECH = 'BattleMech',
  INDUSTRIALMECH = 'IndustrialMech',
  COMBAT_VEHICLE = 'Combat Vehicle',
  SUPPORT_VEHICLE = 'Support Vehicle',
  AEROSPACE = 'Aerospace',
  BATTLE_ARMOR = 'Battle Armor',
  INFANTRY = 'Infantry',
  DROPSHIP = 'DropShip',
  JUMPSHIP = 'JumpShip',
  WARSHIP = 'WarShip',
  SPACE_STATION = 'Space Station',
  MOBILE_STRUCTURE = 'Mobile Structure',
}

export type UnitConfig =
  | 'Biped'
  | 'Biped Omnimech'
  | 'Quad'
  | 'Quad Omnimech'
  | 'Tripod'
  | 'Tripod Omnimech'
  | 'Industrial'
  | 'Vehicle';

export type UnitRole =
  | 'Ambusher'
  | 'Brawler'
  | 'Command'
  | 'Fire Support'
  | 'Juggernaut'
  | 'Missile Boat'
  | 'Scout'
  | 'Skirmisher'
  | 'Sniper'
  | 'Striker'
  | 'Assault'
  | 'Support'
  | 'Anti-Aircraft'
  | 'Custom';

export interface IPaginatedResponse<T> {
  readonly items: T[];
  readonly totalItems: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface IUnitQuirk {
  readonly name: string;
  readonly description?: string;
  readonly type?: 'positive' | 'negative';
  readonly effect?: string;
}

export type UnitQuirk = IUnitQuirk;

export interface IUnitMovementStats {
  readonly walk: number;
  readonly run: number;
  readonly jump?: number;
}

export interface IUnitEngineData {
  readonly type: string;
  readonly rating: number;
  readonly manufacturer?: string;
}

export interface IUnitMyomerData {
  readonly type: string;
  readonly manufacturer?: string;
}

export interface IUnitStructureData {
  readonly type: string;
  readonly manufacturer?: string;
}

export interface IUnitHeatSinkData {
  readonly type: string;
  readonly count: number;
  readonly dissipation_per_sink?: number;
}

export interface IUnitCockpitData {
  readonly type: string;
  readonly manufacturer?: string;
}

export interface IUnitGyroData {
  readonly type: string;
  readonly manufacturer?: string;
}

export interface IArmorLocation {
  readonly location: string;
  readonly armor_points: number;
  readonly rear_armor_points?: number;
  readonly max_armor_points?: number;
  readonly max_rear_armor_points?: number;
}

export type ArmorLocation = IArmorLocation;

export interface IArmorAllocationSummary {
  readonly type?: string;
  readonly total_armor_points?: number;
  readonly locations?: IArmorLocation[];
}

export interface ICriticalSlotEntry {
  readonly index: number;
  readonly name: string;
  readonly type: string;
  readonly isFixed?: boolean;
  readonly isOmniPod?: boolean;
  readonly rearMounted?: boolean;
  readonly [key: string]: unknown;
}

export interface ICriticalSlotLocation {
  readonly location: string;
  readonly slots: ICriticalSlotEntry[];
}

export type CriticalSlotLocation = ICriticalSlotLocation;

export type WeaponClass = 'Energy' | 'Ballistic' | 'Missile' | 'Physical' | 'Artillery' | 'Equipment';

export interface IWeaponRangeProfile {
  readonly minimum?: number;
  readonly short?: number;
  readonly medium?: number;
  readonly long?: number;
  readonly extreme?: number;
}

export interface IWeaponOrEquipmentItem {
  readonly id?: string | number;
  readonly item_name: string;
  readonly item_type: string;
  readonly location: string;
  readonly tons?: number;
  readonly weight?: number;
  readonly heat?: number;
  readonly damage?: string | number;
  readonly crits?: number;
  readonly weapon_class?: WeaponClass;
  readonly range?: IWeaponRangeProfile;
  readonly ammo_per_ton?: number;
  readonly ammo_per_shot?: number;
  readonly related_ammo?: string;
  readonly tech_base: TechBase | 'Both' | string;
  readonly rear_facing?: boolean;
  readonly turret_mounted?: boolean;
  readonly is_omnipod?: boolean;
  readonly manufacturer?: string;
  readonly special_abilities?: string[];
  readonly [key: string]: unknown;
}

export type WeaponOrEquipmentItem = IWeaponOrEquipmentItem;

export interface IUnitFluffContent {
  readonly overview?: string;
  readonly capabilities?: string;
  readonly deployment?: string;
  readonly history?: string;
  readonly variants?: string;
  readonly notable_pilots?: string;
  readonly manufacturer?: string;
  readonly primaryFactory?: string;
  readonly communicationsSystem?: string;
  readonly targetingTracking?: string;
  readonly notes?: string;
}

export interface IUnitData {
  readonly chassis?: string;
  readonly model?: string;
  readonly mass?: number;
  readonly tech_base?: TechBase | 'Both' | string;
  readonly era?: string;
  readonly rules_level?: RulesLevel | string;
  readonly role?: UnitRole | string | { readonly name: string };
  readonly config?: UnitConfig | string;
  readonly source?: string;
  readonly mul_id?: number | string;
  readonly icon?: string;
  readonly is_omnimech?: boolean;
  readonly movement?: {
    readonly walk_mp?: number;
    readonly run_mp?: number;
    readonly jump_mp?: number;
  };
  readonly engine?: IUnitEngineData;
  readonly structure?: IUnitStructureData;
  readonly armor?: IArmorAllocationSummary;
  readonly heat_sinks?: IUnitHeatSinkData;
  readonly cockpit?: IUnitCockpitData;
  readonly gyro?: IUnitGyroData;
  readonly myomer?: IUnitMyomerData;
  readonly weapons_and_equipment?: IWeaponOrEquipmentItem[];
  readonly criticals?: ICriticalSlotLocation[];
  readonly quirks?: Array<IUnitQuirk | string> | {
    readonly positive?: string[];
    readonly negative?: string[];
  };
  readonly fluff?: IUnitFluffContent;
  readonly battle_value?: number;
  readonly cost_cbills?: number;
  readonly tech_rating?: string;
  readonly manufacturer?: string;
  readonly introduction_year?: number;
  readonly [key: string]: unknown;
}

export interface IUnitIdentity {
  readonly id: string | number;
  readonly chassis?: string;
  readonly model?: string;
  readonly tech_base?: TechBase | 'Both' | string;
  readonly rules_level?: RulesLevel | string;
  readonly tonnage?: number;
  readonly unit_type?: UnitType | string;
  readonly config?: UnitConfig | string;
  readonly era?: string;
  readonly source?: string;
  readonly role?: UnitRole | string | { readonly name: string };
  readonly mass?: number;
  readonly icon?: string;
  readonly is_omnimech?: boolean;
}

export interface IBasicUnit extends IUnitIdentity {
  readonly name?: string;
  readonly variant_name?: string;
  readonly slug?: string;
  readonly data?: Partial<IUnitData>;
  readonly summary?: string;
  readonly updated_at?: string;
}

export type BasicUnit = IBasicUnit;

export interface IFullUnit extends IBasicUnit {
  readonly data?: IUnitData;
  readonly equipment?: IInstalledEquipment[];
  readonly fixed_allocations?: unknown[];
  readonly heat_stats?: {
    readonly sinks?: number;
    readonly generation?: number;
  };
  readonly quirks?: Array<IUnitQuirk | string> | {
    readonly positive?: string[];
    readonly negative?: string[];
  };
  readonly documents?: string[];
  readonly created_at?: string;
  readonly updated_at?: string;
}

export type FullUnit = IFullUnit;

export interface IUnitMovementInfo {
  readonly walkSpeed: number;
  readonly runSpeed: number;
  readonly jumpSpeed?: number;
}

export interface IUnitSummary {
  readonly unit: FullUnit;
  readonly movement: IUnitMovementInfo;
  readonly armor: IArmorAllocationSummary;
  readonly quirks?: UnitQuirk[];
}


