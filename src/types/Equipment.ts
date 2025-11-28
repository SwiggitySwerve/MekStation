/**
 * Equipment.ts
 * Interfaces for inventory equipment (Weapons, Ammo, etc.).
 */

import { TechBase, RulesLevel } from './TechBase';
import { ComponentType } from './ComponentType';

export interface IEquipment {
  readonly id: string;
  readonly name: string;
  readonly type: ComponentType;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly cost: number;
  readonly battleValue: number;
  readonly requiresAmmo?: boolean;
}

export interface IWeapon extends IEquipment {
  readonly type: ComponentType.WEAPON;
  readonly heat: number;
  readonly damage: number;
  readonly range: {
    readonly min: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly extreme?: number;
  };
  readonly ammoType?: string; // Links to ammo definition
  readonly shots?: number; // For One-Shot weapons
}

export interface IAmmo extends IEquipment {
  readonly type: ComponentType.AMMO;
  readonly ammoType: string;
  readonly shotsPerTon: number;
  readonly damagePerShot?: number; // For explosive ammo
}

export interface IActuator extends IEquipment {
  readonly type: ComponentType.ACTUATOR;
  readonly location: string;
}

// =============================================================================
// API Equipment Types (Compendium + Editor Integrations)
// =============================================================================

export interface IEquipmentRangeProfile {
  readonly minimum?: number;
  readonly short?: number;
  readonly medium?: number;
  readonly long?: number;
  readonly extreme?: number;
}

export interface IEquipmentData {
  readonly id?: string | number;
  readonly name?: string;
  readonly type?: string;
  readonly tons?: number;
  readonly slots?: number;
  readonly cost?: number;
  readonly battle_value?: number;
  readonly battlevalue?: number;
  readonly weapon_type?: string;
  readonly damage?: string | number;
  readonly heatmap?: number;
  readonly range?: IEquipmentRangeProfile;
  readonly ammo_per_shot?: number;
  readonly ammo_per_ton?: number;
  readonly shots?: number;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly tech_rating?: string;
  readonly legality?: {
    readonly all?: string;
    readonly factions?: Record<string, string>;
  };
  readonly introduced?: number;
  readonly specials?: string[] | Record<string, unknown>;
  readonly rules_level?: RulesLevel | string;
  readonly description?: string;
  readonly [key: string]: unknown;
}

export interface IBasicEquipment {
  readonly id: string | number;
  readonly name: string;
  readonly type: string;
  readonly tech_base: TechBase | 'Both' | string;
  readonly era?: string;
  readonly source?: string;
  readonly weight?: number;
  readonly space?: number;
  readonly heat?: number;
  readonly damage?: number | string;
  readonly range?: string;
  readonly cost_cbills?: number;
  readonly battle_value?: number;
  readonly rules_level?: RulesLevel | string;
  readonly data?: Partial<IEquipmentData>;
}

export interface IFullEquipment extends IBasicEquipment {
  readonly slug?: string;
  readonly category?: string;
  readonly description?: string;
  readonly weapon_class?: string;
  readonly related_ammo?: string[];
  readonly is_clan?: boolean;
  readonly reference?: string;
  readonly image_url?: string;
  readonly data?: IEquipmentData;
}

export type EquipmentData = IEquipmentData;
export type BasicEquipment = IBasicEquipment;
export type FullEquipment = IFullEquipment;

