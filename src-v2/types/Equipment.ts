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

