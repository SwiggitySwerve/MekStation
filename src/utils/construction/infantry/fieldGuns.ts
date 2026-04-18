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
  IFieldGunCatalogEntry,
  IInfantryFieldGun,
} from "@/types/unit/InfantryInterfaces";

// ============================================================================
// Approved field gun catalog
// ============================================================================

/**
 * Weapons approved for field gun deployment.
 * crewRequired follows TW table (heavier weapons need more crew).
 */
export const FIELD_GUN_CATALOG: readonly IFieldGunCatalogEntry[] = [
  {
    id: "mg",
    name: "Machine Gun",
    crewRequired: 2,
    defaultAmmoRounds: 200,
  },
  {
    id: "flamer",
    name: "Flamer",
    crewRequired: 2,
    defaultAmmoRounds: 0,
  },
  {
    id: "ac2",
    name: "Autocannon/2",
    crewRequired: 2,
    defaultAmmoRounds: 45,
  },
  {
    id: "ac5",
    name: "Autocannon/5",
    crewRequired: 3,
    defaultAmmoRounds: 20,
  },
  {
    id: "ac10",
    name: "Autocannon/10",
    crewRequired: 4,
    defaultAmmoRounds: 10,
  },
  {
    id: "ac20",
    name: "Autocannon/20",
    crewRequired: 5,
    defaultAmmoRounds: 5,
  },
  {
    id: "lrm5",
    name: "LRM 5",
    crewRequired: 2,
    defaultAmmoRounds: 24,
  },
  {
    id: "lrm10",
    name: "LRM 10",
    crewRequired: 3,
    defaultAmmoRounds: 12,
  },
  {
    id: "lrm15",
    name: "LRM 15",
    crewRequired: 3,
    defaultAmmoRounds: 8,
  },
  {
    id: "lrm20",
    name: "LRM 20",
    crewRequired: 4,
    defaultAmmoRounds: 6,
  },
  {
    id: "srm2",
    name: "SRM 2",
    crewRequired: 2,
    defaultAmmoRounds: 50,
  },
  {
    id: "srm4",
    name: "SRM 4",
    crewRequired: 2,
    defaultAmmoRounds: 25,
  },
  {
    id: "srm6",
    name: "SRM 6",
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
  return {
    equipmentId: entry.id,
    name: entry.name,
    crew: entry.crewRequired,
    ammoRounds: ammoOverride ?? entry.defaultAmmoRounds,
  };
}

/**
 * Sum all crew slots used by a list of field guns.
 * A platoon may carry multiple guns but crew counts accumulate.
 */
export function totalFieldGunCrew(guns: readonly IInfantryFieldGun[]): number {
  return guns.reduce((sum, g) => sum + g.crew, 0);
}
