import { IAmmunition } from '@/types/equipment/AmmunitionTypes';
import { IElectronics } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';
import { IWeapon } from '@/types/equipment/weapons/interfaces';

import type { IEquipmentLoadResult } from './EquipmentLoaderTypes';

import {
  convertAmmunition,
  convertElectronics,
  convertMiscEquipment,
  convertWeapon,
  type IEquipmentFile,
  type IRawAmmunitionData,
  type IRawElectronicsData,
  type IRawMiscEquipmentData,
  type IRawWeaponData,
} from './EquipmentConverters';

export interface IEquipmentCustomLoadTargets {
  readonly weapons: Map<string, IWeapon>;
  readonly ammunition: Map<string, IAmmunition>;
  readonly electronics: Map<string, IElectronics>;
  readonly miscEquipment: Map<string, IMiscEquipment>;
}

export async function loadCustomEquipmentSource(
  source: string | File | object,
  targets: IEquipmentCustomLoadTargets,
): Promise<IEquipmentLoadResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let itemsLoaded = 0;

  try {
    let data: IEquipmentFile<
      | IRawWeaponData
      | IRawAmmunitionData
      | IRawElectronicsData
      | IRawMiscEquipmentData
    >;

    if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      data = (await response.json()) as typeof data;
    } else if (source instanceof File) {
      const text = await source.text();
      data = JSON.parse(text) as typeof data;
    } else {
      data = source as IEquipmentFile<IRawWeaponData>;
    }

    const schemaPath = data.$schema || '';

    if (schemaPath.includes('weapon')) {
      (data.items as IRawWeaponData[]).forEach((item) => {
        const weapon = convertWeapon(item);
        targets.weapons.set(weapon.id, weapon);
        itemsLoaded++;
      });
    } else if (schemaPath.includes('ammunition')) {
      (data.items as IRawAmmunitionData[]).forEach((item) => {
        const ammo = convertAmmunition(item);
        targets.ammunition.set(ammo.id, ammo);
        itemsLoaded++;
      });
    } else if (schemaPath.includes('electronics')) {
      (data.items as IRawElectronicsData[]).forEach((item) => {
        const electronics = convertElectronics(item);
        targets.electronics.set(electronics.id, electronics);
        itemsLoaded++;
      });
    } else if (schemaPath.includes('misc-equipment')) {
      (data.items as IRawMiscEquipmentData[]).forEach((item) => {
        const equipment = convertMiscEquipment(item);
        targets.miscEquipment.set(equipment.id, equipment);
        itemsLoaded++;
      });
    } else {
      warnings.push('Unknown equipment type, attempting to infer from data');
    }

    return { success: errors.length === 0, itemsLoaded, errors, warnings };
  } catch (e) {
    errors.push(`Failed to load custom equipment: ${e}`);
    return { success: false, itemsLoaded, errors, warnings };
  }
}
