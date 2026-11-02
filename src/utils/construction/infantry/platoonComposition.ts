/**
 * Platoon Composition Utilities
 *
 * Derives default compositions, movement points, and effective trooper
 * counts from motive type per TechManual tables.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import type { IInfantry } from '@/types/unit/PersonnelInterfaces';

import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  InfantryMotive,
  IPlatoonComposition,
  IInfantryMP,
  IInfantryMotiveProfile,
  INFANTRY_MOTIVE_PROFILES,
  PLATOON_DEFAULTS,
  MOTIVE_MP,
} from '@/types/unit/InfantryInterfaces';

import { getInfantryBVWeapon } from './weaponTable';

// ============================================================================
// Composition helpers
// ============================================================================

/**
 * Return the TechManual default composition for a given motive type.
 * Callers may override individual fields after calling this.
 */
export function getDefaultComposition(
  motive: InfantryMotive,
): IPlatoonComposition {
  return PLATOON_DEFAULTS[motive];
}

/**
 * Calculate total trooper count from a composition.
 */
export function totalTroopers(composition: IPlatoonComposition): number {
  return composition.squads * composition.troopersPerSquad;
}

/**
 * Return movement points derived from motive type.
 * The store may store these as editable overrides; this is the canonical
 * source of truth before any override.
 */
export function getMotiveMP(motive: InfantryMotive): IInfantryMP {
  return MOTIVE_MP[motive];
}

/**
 * Return the full construction profile for a motive.
 */
export function getMotiveProfile(
  motive: InfantryMotive,
): IInfantryMotiveProfile {
  return INFANTRY_MOTIVE_PROFILES[motive];
}

/**
 * Map construction-layer motive to the legacy squad motion enum.
 */
export function squadMotionTypeForMotive(
  motive: InfantryMotive,
): SquadMotionType {
  switch (motive) {
    case InfantryMotive.FOOT:
      return SquadMotionType.FOOT;
    case InfantryMotive.JUMP:
      return SquadMotionType.JUMP;
    case InfantryMotive.MOTORIZED:
      return SquadMotionType.MOTORIZED;
    case InfantryMotive.MECHANIZED_TRACKED:
      return SquadMotionType.TRACKED;
    case InfantryMotive.MECHANIZED_WHEELED:
      return SquadMotionType.WHEELED;
    case InfantryMotive.MECHANIZED_HOVER:
      return SquadMotionType.HOVER;
    case InfantryMotive.MECHANIZED_VTOL:
      return SquadMotionType.VTOL;
  }
}

// ============================================================================
// Effective trooper helpers
// ============================================================================

/**
 * Calculate how many troopers are available to fire personal weapons,
 * accounting for field gun crew.
 *
 * @param platoonStrength - total troopers in the platoon
 * @param fieldGunCrew - troopers assigned to field gun operation (0 if none)
 */
export function effectiveFiringTroopers(
  platoonStrength: number,
  fieldGunCrew: number,
): number {
  return Math.max(0, platoonStrength - fieldGunCrew);
}

/**
 * Calculate how many secondary weapons the platoon carries.
 * Formula: floor(totalTroopers / ratio)
 *
 * @param platoonStrength - total troopers
 * @param ratio - 1 per N troopers from weapon table entry
 */
export function secondaryWeaponCount(
  platoonStrength: number,
  ratio: number,
): number {
  if (ratio <= 0) return 0;
  return Math.floor(platoonStrength / ratio);
}

// ============================================================================
// Motive compatibility
// ============================================================================

/**
 * Motives that allow field guns (Foot and Motorized).
 * Jump and all Mechanized subtypes may NOT crew field guns per TW rules.
 */
export const FIELD_GUN_ALLOWED_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.FOOT,
  InfantryMotive.MOTORIZED,
]);

/**
 * Motives that allow heavy primary weapons.
 * Mechanized and Motorized platoons can operate support-weight weapons.
 */
export const HEAVY_WEAPON_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.MOTORIZED,
  InfantryMotive.MECHANIZED_TRACKED,
  InfantryMotive.MECHANIZED_WHEELED,
  InfantryMotive.MECHANIZED_HOVER,
  InfantryMotive.MECHANIZED_VTOL,
]);

// Pinned MegaMek 48fcb2f64: ConvInfantry.java:1125-1160, 1739-1765,
// 1980-2017, 2093-2103, 2808-2818. Source defaults differ from editor overrides.
export function resolveInfantryOffenseSource(
  tags: Readonly<Record<string, string | string[]>>,
  encumbering: boolean,
): NonNullable<IInfantry['bvOffense']> {
  const values = (key: string) => [tags[key] ?? []].flat();
  const mode = (values('motion_type')[0] ?? 'Leg').toLowerCase();
  const augmentations = values('augmentation');
  const secondary = values('Secondary')[0];
  const count = secondary ? Number(tags.secondn ?? 0) : 0;
  const support = secondary ? getInfantryBVWeapon(secondary).support : false;
  const mot: Record<string, InfantryMotive> = {
    motorized: InfantryMotive.MOTORIZED,
    tracked: InfantryMotive.MECHANIZED_TRACKED,
    wheeled: InfantryMotive.MECHANIZED_WHEELED,
    hover: InfantryMotive.MECHANIZED_HOVER,
  };
  let walk = getMotiveMP(mot[mode] ?? InfantryMotive.FOOT).groundMP;
  let jump = 0;
  if (mode === 'jump') jump = getMotiveMP(InfantryMotive.JUMP).jumpMP;
  if (mode === 'microcopter' || mode === 'vtol') jump = 5;
  if (mode === 'microlite') jump = 6;
  let umu = 0;
  if (mode === 'scuba') umu = 1;
  if (mode === 'motorized scuba') umu = 2;
  if (mode === 'submarine') {
    walk = 0;
    umu = 3;
  }
  const mounted = mode.startsWith('beast:');
  if (mounted) {
    // InfantryMount.java:263-305, independent of the armor damage divisor.
    const mounts: Record<string, readonly [number, number, number]> = {
      donkey: [2, 0, 0],
      'coventry kangaroo': [3, 0, 0],
      horse: [3, 0, 0],
      camel: [2, 0, 0],
      branth: [0, 6, 0],
      'odessan raxx': [2, 0, 0],
      tabiranth: [2, 0, 0],
      tariq: [5, 0, 0],
      elephant: [2, 0, 0],
      orca: [0, 0, 5],
      hipposaur: [1, 0, 2],
    };
    const mount = mounts[mode.slice(6)];
    if (!mount) throw new Error(`Unsupported infantry source mount: ${mode}`);
    [walk, jump, umu] = mount;
  } else {
    if (encumbering) walk = Math.max(walk - 1, 1);
    const spec = Number(
      tags.specialization ??
        (secondary?.toLowerCase() === 'infantrytag' ? 1024 : 0),
    );
    const burden =
      count > 1 &&
      support &&
      !augmentations.includes('tsm_implant') &&
      !augmentations.includes('dermal_armor') &&
      !(spec & 1024);
    if (burden && mode !== 'tracked' && mode !== 'jump')
      walk = Math.max(walk - 1, 0);
    if (burden && mode !== 'submarine') jump = Math.max(jump - 1, 0);
    else if (['microcopter', 'microlite', 'vtol'].includes(mode) && count > 0)
      jump = Math.max(jump - 1, 0);
    if (
      values('Field Guns Equipment').some((name) =>
        /arrowiv|longtom|sniper|thumper/i.test(name),
      )
    )
      walk = Math.min(walk, 1);
  }
  return {
    secondaryShooters: count * Number(tags.squadn ?? 1),
    mp: Math.max(walk, jump, umu),
    antiMek:
      !(
        !mounted &&
        /^(tracked|wheeled|hover|submarine|vtol|microcopter|microlite)$/.test(
          mode,
        )
      ) &&
      !encumbering &&
      !values('Field Guns Equipment').some(Boolean),
    augmentations,
    prostheticAntiMek: Object.entries(tags).some(
      ([key, name]) =>
        /^(prostheticEnhancement[12]?|extraneousPair[12])$/.test(key) &&
        /grappler|climbing.claws/i.test(String(name)),
    ),
  };
}
