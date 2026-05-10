import { IAmmunition } from '@/types/equipment/AmmunitionTypes';
import { IElectronics } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';
import { IWeapon } from '@/types/equipment/weapons/interfaces';

import type {
  IEquipmentIndexData,
  IEquipmentLoadResult,
} from './EquipmentLoaderTypes';

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
import { readJsonFile } from './EquipmentFileReader';
import {
  DEFAULT_AMMUNITION_FILES,
  DEFAULT_ELECTRONICS_FILES,
  DEFAULT_MISC_FILES,
  DEFAULT_WEAPON_FILES,
  getIndexedFileList,
} from './EquipmentLoaderConfig';
import {
  AMMUNITION_SHAPE,
  ELECTRONICS_SHAPE,
  MISC_EQUIPMENT_SHAPE,
  validateShapeFromFile,
  WEAPON_SHAPE,
} from './EquipmentShapeValidation';

export interface IEquipmentOfficialLoadTargets {
  readonly weapons: Map<string, IWeapon>;
  readonly ammunition: Map<string, IAmmunition>;
  readonly electronics: Map<string, IElectronics>;
  readonly miscEquipment: Map<string, IMiscEquipment>;
}

export async function loadOfficialEquipmentSource(
  basePath: string,
  targets: IEquipmentOfficialLoadTargets,
): Promise<IEquipmentLoadResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let itemsLoaded = 0;

  try {
    // Load index.json for data-driven file discovery
    const indexData = await readJsonFile<IEquipmentIndexData>(
      'index.json',
      basePath,
    );

    // Load weapon files (data-driven from index.json)
    const weaponFiles = indexData?.files?.weapons
      ? Object.values(indexData.files.weapons)
      : DEFAULT_WEAPON_FILES;
    for (const weaponFile of weaponFiles) {
      const weaponData = await readJsonFile<IEquipmentFile<IRawWeaponData>>(
        weaponFile,
        basePath,
      );
      if (weaponData) {
        // Cross-language schema-bridge gate.
        //
        // In dev/test we round-trip every item through the canonical
        // contract before handing it to the per-shape converter. This
        // is the TypeScript-side mirror of `schema_gate.validate_*` in
        // Python; together they catch silent shape drift between the
        // writer and reader sides at first contact.
        //
        // Production builds skip this cost. The CI `schema-bridge`
        // job already gates merges on corpus conformance via the
        // `--shape all --strict` Python harness, so re-parsing at
        // runtime in production buys nothing but allocations.
        //
        // The weapons/ directory holds two shapes: WeaponContract for
        // ranged weapons (energy-laser.json etc.) and
        // PhysicalWeaponContract for physical.json. The default-
        // validator argument matches the directory's "primary" shape;
        // file-level `$schema` headers re-route per-file when present.
        validateShapeFromFile(
          weaponFile,
          weaponData.$schema,
          weaponData.items,
          WEAPON_SHAPE,
        );
        weaponData.items.forEach((item) => {
          const weapon = convertWeapon(item);
          targets.weapons.set(weapon.id, weapon);
          itemsLoaded++;
        });
      } else {
        warnings.push(`Failed to load weapons from ${weaponFile}`);
      }
    }

    // Load ammunition files (data-driven from index.json)
    const ammoEntry = indexData?.files?.ammunition;
    const ammoFiles = getIndexedFileList(ammoEntry, DEFAULT_AMMUNITION_FILES);
    for (const ammoFile of ammoFiles) {
      const ammoData = await readJsonFile<IEquipmentFile<IRawAmmunitionData>>(
        ammoFile,
        basePath,
      );
      if (ammoData) {
        // Schema-bridge gate. Ammunition files in the corpus today don't
        // carry `$schema` headers, so the default validator
        // (`AmmunitionContract`) handles the entire directory.
        validateShapeFromFile(
          ammoFile,
          ammoData.$schema,
          ammoData.items,
          AMMUNITION_SHAPE,
        );
        ammoData.items.forEach((item) => {
          const ammo = convertAmmunition(item);
          targets.ammunition.set(ammo.id, ammo);
          itemsLoaded++;
        });
      } else {
        warnings.push(`Failed to load ammunition from ${ammoFile}`);
      }
    }

    // Load electronics files (data-driven from index.json)
    const elecEntry = indexData?.files?.electronics;
    const elecFiles = getIndexedFileList(elecEntry, DEFAULT_ELECTRONICS_FILES);
    for (const elecFile of elecFiles) {
      const electronicsData = await readJsonFile<
        IEquipmentFile<IRawElectronicsData>
      >(elecFile, basePath);
      if (electronicsData) {
        // Schema-bridge gate. Electronics files all carry
        // `$schema: ../../_schema/electronics-schema.json` so the
        // default-validator argument is more of a safety net than a
        // primary code path.
        validateShapeFromFile(
          elecFile,
          electronicsData.$schema,
          electronicsData.items,
          ELECTRONICS_SHAPE,
        );
        electronicsData.items.forEach((item) => {
          const electronics = convertElectronics(item);
          targets.electronics.set(electronics.id, electronics);
          itemsLoaded++;
        });
      } else {
        warnings.push(`Failed to load electronics from ${elecFile}`);
      }
    }

    // Load misc equipment files (data-driven from index.json)
    const miscEntry = indexData?.files?.miscellaneous;
    const miscFiles = getIndexedFileList(miscEntry, DEFAULT_MISC_FILES);
    for (const miscFile of miscFiles) {
      const miscData = await readJsonFile<
        IEquipmentFile<IRawMiscEquipmentData>
      >(miscFile, basePath);
      if (miscData) {
        // Schema-bridge gate. Misc files all carry
        // `$schema: ../../_schema/misc-equipment-schema.json`.
        validateShapeFromFile(
          miscFile,
          miscData.$schema,
          miscData.items,
          MISC_EQUIPMENT_SHAPE,
        );
        miscData.items.forEach((item) => {
          const equipment = convertMiscEquipment(item);
          targets.miscEquipment.set(equipment.id, equipment);
          itemsLoaded++;
        });
      } else {
        warnings.push(
          `Failed to load miscellaneous equipment from ${miscFile}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      itemsLoaded,
      errors,
      warnings,
    };
  } catch (e) {
    errors.push(`Failed to load equipment: ${e}`);
    return {
      success: false,
      itemsLoaded,
      errors,
      warnings,
    };
  }
}
