/**
 * Infantry Weapon Table
 *
 * Canonical list of infantry personal weapons per TechManual.
 * Each entry captures the stats needed for construction validation
 * and combat damage calculation (handled in add-infantry-combat-behavior).
 *
 * Heavy weapons may only be the primary weapon for Mechanized or Motorized
 * motive platoons (VAL-INF-WEAPON).
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import { IInfantryWeaponEntry } from "@/types/unit/InfantryInterfaces";

// ============================================================================
// Weapon Table
// ============================================================================

/**
 * All infantry weapons available for primary and secondary selection.
 * Sorted: light/common first, heavy support last.
 */
export const INFANTRY_WEAPON_TABLE: readonly IInfantryWeaponEntry[] = [
  // --- Standard personal weapons ---
  {
    id: "inf-rifle",
    name: "Rifle",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "",
    secondaryRatio: 4,
  },
  {
    id: "inf-auto-rifle",
    name: "Auto-Rifle",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "auto-rifle",
    secondaryRatio: 3,
  },
  {
    id: "inf-laser-rifle",
    name: "Laser Rifle",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "",
    secondaryRatio: 4,
  },
  {
    id: "inf-needler",
    name: "Needler",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "needler",
    secondaryRatio: 4,
  },
  {
    id: "inf-gyrojet",
    name: "Gyrojet Rifle",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "gyrojet",
    secondaryRatio: 4,
  },
  {
    id: "inf-flamer",
    name: "Flamer",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 0,
    heat: 1,
    ammoType: "flamer",
    secondaryRatio: 4,
  },
  // --- Missile launchers (secondary-typical) ---
  {
    id: "inf-srm2",
    name: "SRM Launcher",
    isHeavy: false,
    damageDivisor: 6,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 9,
    heat: 0,
    ammoType: "srm",
    secondaryRatio: 4,
  },
  {
    id: "inf-lrm5",
    name: "LRM Launcher",
    isHeavy: false,
    damageDivisor: 6,
    rangeShort: 6,
    rangeMedium: 12,
    rangeLong: 21,
    heat: 0,
    ammoType: "lrm",
    secondaryRatio: 4,
  },
  // --- Heavy support weapons (Mechanized / Motorized only) ---
  {
    id: "inf-mg",
    name: "Machine Gun",
    isHeavy: false,
    damageDivisor: 10,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "mg",
    secondaryRatio: 2,
  },
  {
    id: "inf-support-heavy-mg",
    name: "Support Heavy MG",
    isHeavy: true,
    damageDivisor: 5,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: "mg-heavy",
    secondaryRatio: 2,
  },
  {
    id: "inf-support-laser",
    name: "Support Laser",
    isHeavy: true,
    damageDivisor: 5,
    rangeShort: 1,
    rangeMedium: 3,
    rangeLong: 5,
    heat: 2,
    ammoType: "",
    secondaryRatio: 3,
  },
  {
    id: "inf-support-ppc",
    name: "Support PPC",
    isHeavy: true,
    damageDivisor: 3,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 12,
    heat: 5,
    ammoType: "",
    secondaryRatio: 3,
  },
] as const;

// ============================================================================
// Lookup helpers
// ============================================================================

/**
 * Fast lookup by weapon ID.
 * Returns undefined if the ID is not in the table.
 */
export function findWeaponById(id: string): IInfantryWeaponEntry | undefined {
  return INFANTRY_WEAPON_TABLE.find((w) => w.id === id);
}

/**
 * Return all weapons that are legal as a primary weapon for a given
 * isHeavy constraint. Foot/Jump platoons may not use heavy primaries.
 */
export function getPrimaryWeaponOptions(
  allowHeavy: boolean,
): readonly IInfantryWeaponEntry[] {
  return allowHeavy
    ? INFANTRY_WEAPON_TABLE
    : INFANTRY_WEAPON_TABLE.filter((w) => !w.isHeavy);
}
