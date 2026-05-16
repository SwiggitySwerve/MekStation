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
 * Each entry carries `infantryDamage` — the canonical damage-per-trooper
 * value consumed by MegaMek's `Infantry.getDamagePerTrooper()` formula
 * (`InfantryWeapon.getInfantryDamage()`). Values are sourced from the
 * representative MegaMek infantry-weapon classes for each generic
 * category (e.g. Auto-Rifle = `InfantryRifleAutoRifleWeapon` 0.52,
 * Support Laser = `InfantrySupportLaserWeapon` 0.84). This is the
 * OUTGOING per-trooper damage figure — distinct from `damageDivisor`,
 * which governs INCOMING-damage division.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/infantry-unit-system/spec.md
 *   (Requirement: Primary Weapon Types — infantryDamage field)
 */

import { IInfantryWeaponEntry } from '@/types/unit/InfantryInterfaces';

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
    id: 'inf-rifle',
    name: 'Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.28,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: '',
    special: [],
    secondaryRatio: 4,
  },
  {
    id: 'inf-auto-rifle',
    name: 'Auto-Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.52,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'auto-rifle',
    special: ['ballistic'],
    secondaryRatio: 3,
  },
  {
    id: 'inf-laser-rifle',
    name: 'Laser Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.28,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: '',
    special: ['energy'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-needler',
    name: 'Needler',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.11,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'needler',
    special: ['anti-infantry'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-gyrojet',
    name: 'Gyrojet Rifle',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.14,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'gyrojet',
    special: ['vacuum-capable'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-flamer',
    name: 'Flamer',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.35,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 0,
    heat: 1,
    ammoType: 'flamer',
    special: ['heat', 'incendiary'],
    secondaryRatio: 4,
  },
  // --- Missile launchers (secondary-typical) ---
  {
    id: 'inf-srm2',
    name: 'SRM Launcher',
    isHeavy: false,
    damageDivisor: 6,
    infantryDamage: 0.57,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 9,
    heat: 0,
    ammoType: 'srm',
    special: ['missile'],
    secondaryRatio: 4,
  },
  {
    id: 'inf-lrm5',
    name: 'LRM Launcher',
    isHeavy: false,
    damageDivisor: 6,
    infantryDamage: 0.19,
    rangeShort: 6,
    rangeMedium: 12,
    rangeLong: 21,
    heat: 0,
    ammoType: 'lrm',
    special: ['missile', 'indirect'],
    secondaryRatio: 4,
  },
  // --- Heavy support weapons (Mechanized / Motorized only) ---
  {
    id: 'inf-mg',
    name: 'Machine Gun',
    isHeavy: false,
    damageDivisor: 10,
    infantryDamage: 0.49,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'mg',
    special: ['ballistic'],
    secondaryRatio: 2,
  },
  {
    id: 'inf-support-heavy-mg',
    name: 'Support Heavy MG',
    isHeavy: true,
    damageDivisor: 5,
    infantryDamage: 0.65,
    rangeShort: 1,
    rangeMedium: 2,
    rangeLong: 3,
    heat: 0,
    ammoType: 'mg-heavy',
    special: ['ballistic', 'support'],
    secondaryRatio: 2,
  },
  {
    id: 'inf-support-laser',
    name: 'Support Laser',
    isHeavy: true,
    damageDivisor: 5,
    infantryDamage: 0.84,
    rangeShort: 1,
    rangeMedium: 3,
    rangeLong: 5,
    heat: 2,
    ammoType: '',
    special: ['energy', 'support'],
    secondaryRatio: 3,
  },
  {
    id: 'inf-support-ppc',
    name: 'Support PPC',
    isHeavy: true,
    damageDivisor: 3,
    infantryDamage: 1.58,
    rangeShort: 3,
    rangeMedium: 6,
    rangeLong: 12,
    heat: 5,
    ammoType: '',
    special: ['energy', 'support'],
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
