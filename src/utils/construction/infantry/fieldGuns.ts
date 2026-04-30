/**
 * Infantry Field Gun Catalog and Crew Logic
 *
 * Approved field gun list per TechManual. A field gun is a mech-scale
 * weapon towed on a cart and crewed by platoon members. Crew members
 * do NOT fire personal weapons while operating the gun.
 *
 * Field guns are only available to Foot and Motorized platoons.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import {
  IFieldGun,
  IFieldGunCatalogEntry,
  IInfantryFieldGun,
} from '@/types/unit/InfantryInterfaces';

// ============================================================================
// Approved field gun catalog
// ============================================================================

/**
 * Weapons approved for field gun deployment.
 * crewRequired follows TW table (heavier weapons need more crew).
 */
export const FIELD_GUN_CATALOG: readonly IFieldGunCatalogEntry[] = [
  {
    id: 'mg',
    name: 'Machine Gun',
    tonnage: 0.5,
    crewRequired: 2,
    defaultAmmoRounds: 200,
  },
  {
    id: 'flamer',
    name: 'Flamer',
    tonnage: 1,
    crewRequired: 2,
    defaultAmmoRounds: 0,
  },
  {
    id: 'ac2',
    name: 'Autocannon/2',
    tonnage: 6,
    crewRequired: 2,
    defaultAmmoRounds: 45,
  },
  {
    id: 'ac5',
    name: 'Autocannon/5',
    tonnage: 8,
    crewRequired: 3,
    defaultAmmoRounds: 20,
  },
  {
    id: 'ac10',
    name: 'Autocannon/10',
    tonnage: 12,
    crewRequired: 4,
    defaultAmmoRounds: 10,
  },
  {
    id: 'ac20',
    name: 'Autocannon/20',
    tonnage: 14,
    crewRequired: 5,
    defaultAmmoRounds: 5,
  },
  {
    id: 'lrm5',
    name: 'LRM 5',
    tonnage: 2,
    crewRequired: 2,
    defaultAmmoRounds: 24,
  },
  {
    id: 'lrm10',
    name: 'LRM 10',
    tonnage: 5,
    crewRequired: 3,
    defaultAmmoRounds: 12,
  },
  {
    id: 'lrm15',
    name: 'LRM 15',
    tonnage: 7,
    crewRequired: 3,
    defaultAmmoRounds: 8,
  },
  {
    id: 'lrm20',
    name: 'LRM 20',
    tonnage: 10,
    crewRequired: 4,
    defaultAmmoRounds: 6,
  },
  {
    id: 'srm2',
    name: 'SRM 2',
    tonnage: 1,
    crewRequired: 2,
    defaultAmmoRounds: 50,
  },
  {
    id: 'srm4',
    name: 'SRM 4',
    tonnage: 2,
    crewRequired: 2,
    defaultAmmoRounds: 25,
  },
  {
    id: 'srm6',
    name: 'SRM 6',
    tonnage: 3,
    crewRequired: 3,
    defaultAmmoRounds: 15,
  },
] as const;

// ============================================================================
// Lookup helpers
// ============================================================================

/**
 * Find a field gun catalog entry by equipment ID.
 * Returns undefined if the ID is not in the approved list.
 */
export function findFieldGunById(
  id: string,
): IFieldGunCatalogEntry | undefined {
  return FIELD_GUN_CATALOG.find((g) => g.id === id);
}

/**
 * Build an IInfantryFieldGun instance from a catalog entry with default ammo.
 */
export function buildFieldGun(
  entry: IFieldGunCatalogEntry,
  ammoOverride?: number,
): IInfantryFieldGun {
  const ammoRounds = ammoOverride ?? entry.defaultAmmoRounds;
  return {
    weaponId: entry.id,
    crewCount: entry.crewRequired,
    ammoRounds,
    equipmentId: entry.id,
    name: entry.name,
    crew: entry.crewRequired,
  };
}

/**
 * Return the crew count derived from the approved field-gun catalog.
 */
export function deriveFieldGunCrewCount(weaponId: string): number | undefined {
  return findFieldGunById(weaponId)?.crewRequired;
}

/**
 * Return the deployed weapon tonnage for reference/transport displays.
 */
export function getDeployedFieldGunTonnage(weaponId: string): number {
  return findFieldGunById(weaponId)?.tonnage ?? 0;
}

/**
 * Field guns do not consume unit construction tonnage.
 *
 * The deployed weapon tonnage is still present in FIELD_GUN_CATALOG for
 * reference, but construction weight/BV paths must treat field-gun tonnage as
 * zero because the gun is a deployed/towed weapon.
 */
export function getFieldGunConstructionTonnage(_fieldGun: IFieldGun): number {
  return 0;
}

/**
 * Normalize a legacy store field gun into the current spec-compatible shape.
 */
export function normalizeInfantryFieldGun(
  gun: IInfantryFieldGun,
): IInfantryFieldGun {
  const weaponId = gun.weaponId || gun.equipmentId;
  const crewCount = gun.crewCount || gun.crew;
  const ammoRounds =
    typeof gun.ammoRounds === 'number' ? Math.max(0, gun.ammoRounds) : 0;
  return {
    ...gun,
    weaponId,
    crewCount,
    equipmentId: gun.equipmentId || weaponId,
    crew: gun.crew || crewCount,
    ammoRounds,
  };
}

/**
 * Sum all crew slots used by a list of field guns.
 * A platoon may carry multiple guns but crew counts accumulate.
 */
export function totalFieldGunCrew(guns: readonly IInfantryFieldGun[]): number {
  return guns.reduce((sum, g) => sum + g.crewCount, 0);
}
