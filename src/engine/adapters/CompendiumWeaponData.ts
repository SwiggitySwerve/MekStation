import type { IWeaponData } from '../types';

// =============================================================================
// Static Weapon Database
// =============================================================================

export const WEAPON_DATABASE: Readonly<Record<string, IWeaponData>> = {
  'small-laser': {
    id: 'small-laser',
    name: 'Small Laser',
    shortRange: 1,
    mediumRange: 2,
    longRange: 3,
    damage: 3,
    heat: 1,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  'medium-laser': {
    id: 'medium-laser',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  'large-laser': {
    id: 'large-laser',
    name: 'Large Laser',
    shortRange: 5,
    mediumRange: 10,
    longRange: 15,
    damage: 8,
    heat: 8,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  },
  ppc: {
    id: 'ppc',
    name: 'PPC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 10,
    minRange: 3,
    ammoPerTon: -1,
    destroyed: false,
  },
  'ac-2': {
    id: 'ac-2',
    name: 'AC/2',
    shortRange: 8,
    mediumRange: 16,
    longRange: 24,
    damage: 2,
    heat: 1,
    minRange: 4,
    ammoPerTon: 45,
    destroyed: false,
  },
  'ac-5': {
    id: 'ac-5',
    name: 'AC/5',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 5,
    heat: 1,
    minRange: 3,
    ammoPerTon: 20,
    destroyed: false,
  },
  'ac-10': {
    id: 'ac-10',
    name: 'AC/10',
    shortRange: 5,
    mediumRange: 10,
    longRange: 15,
    damage: 10,
    heat: 3,
    minRange: 0,
    ammoPerTon: 10,
    destroyed: false,
  },
  'ac-20': {
    id: 'ac-20',
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
  },
  'lrm-5': {
    id: 'lrm-5',
    name: 'LRM 5',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 5,
    heat: 2,
    minRange: 6,
    ammoPerTon: 24,
    destroyed: false,
  },
  'lrm-10': {
    id: 'lrm-10',
    name: 'LRM 10',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 10,
    heat: 4,
    minRange: 6,
    ammoPerTon: 12,
    destroyed: false,
  },
  'lrm-15': {
    id: 'lrm-15',
    name: 'LRM 15',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 15,
    heat: 5,
    minRange: 6,
    ammoPerTon: 8,
    destroyed: false,
  },
  'lrm-20': {
    id: 'lrm-20',
    name: 'LRM 20',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 20,
    heat: 6,
    minRange: 6,
    ammoPerTon: 6,
    destroyed: false,
  },
  'srm-2': {
    id: 'srm-2',
    name: 'SRM 2',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 4,
    heat: 2,
    minRange: 0,
    ammoPerTon: 50,
    destroyed: false,
  },
  'srm-4': {
    id: 'srm-4',
    name: 'SRM 4',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 8,
    heat: 3,
    minRange: 0,
    ammoPerTon: 25,
    destroyed: false,
  },
  'srm-6': {
    id: 'srm-6',
    name: 'SRM 6',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 12,
    heat: 4,
    minRange: 0,
    ammoPerTon: 15,
    destroyed: false,
  },
  'machine-gun': {
    id: 'machine-gun',
    name: 'Machine Gun',
    shortRange: 1,
    mediumRange: 2,
    longRange: 3,
    damage: 2,
    heat: 0,
    minRange: 0,
    ammoPerTon: 200,
    destroyed: false,
  },
};

/**
 * IS/Clan weapon ID canonicalization.
 *
 * Weapon ids arrive from several upstream sources (unit JSON, MTF parser,
 * compendium catalog, ad-hoc test fixtures) in inconsistent shapes. Per
 * `wire-real-weapon-data` task 2.3, `getWeaponData` SHALL resolve both IS
 * and Clan variants against the static engine weapon database without the
 * caller having to know which casing / prefix / separator a given producer
 * uses.
 *
 * Normalization rules:
 * - Lowercase + trim
 * - Replace whitespace and slashes with hyphens (`AC/20` → `ac-20`,
 *   `Medium Laser` → `medium-laser`)
 * - Strip `clan-`, `clan `, `cl-`, and `c-` prefixes BEFORE lookup when the
 *   clan variant is not present in the static DB — the engine DB only ships
 *   IS stats today, so Clan weapons fall back to the IS equivalent. When
 *   proper Clan stats land (follow-up change), add the Clan rows to the DB
 *   and this prefix strip becomes a no-op for those ids (direct hit wins).
 * - Strip common abbreviations' ambiguity (`ML` → `medium-laser`,
 *   `SL` → `small-laser`, `LL` → `large-laser`, `MG` → `machine-gun`,
 *   `PPC` stays `ppc`).
 *
 * The returned record is the IS entry from `WEAPON_DATABASE`. Callers that
 * need tech-base awareness SHALL read it elsewhere; this helper is
 * stat-resolution only.
 */
export const WEAPON_ID_ALIASES: Readonly<Record<string, string>> = {
  // Common abbreviations
  ml: 'medium-laser',
  sl: 'small-laser',
  ll: 'large-laser',
  mg: 'machine-gun',
  // Slash-style canonical (from MegaMek-ish sources)
  'ac-2': 'ac-2',
  'ac-5': 'ac-5',
  'ac-10': 'ac-10',
  'ac-20': 'ac-20',
  // LRM / SRM "LRM-N" vs "lrm-N"
  'lrm-5': 'lrm-5',
  'lrm-10': 'lrm-10',
  'lrm-15': 'lrm-15',
  'lrm-20': 'lrm-20',
  'srm-2': 'srm-2',
  'srm-4': 'srm-4',
  'srm-6': 'srm-6',
  // Explicit "Inner Sphere" prefixes
  'is-medium-laser': 'medium-laser',
  'is-small-laser': 'small-laser',
  'is-large-laser': 'large-laser',
  'is-ppc': 'ppc',
  'is-ac-2': 'ac-2',
  'is-ac-5': 'ac-5',
  'is-ac-10': 'ac-10',
  'is-ac-20': 'ac-20',
};

export const CLAN_PREFIX_PATTERNS: readonly RegExp[] = [
  /^clan-/,
  /^cl-/,
  /^c-/,
];
