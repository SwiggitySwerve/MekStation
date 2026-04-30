/**
 * Infantry Record Sheet Data Extractor
 *
 * Produces IInfantryRecordSheetData from the Wave 1 infantry construction
 * shape while preserving support for the smaller test fixture shape.
 */

import {
  IInfantryFieldGunSheet,
  IInfantryPlatoonCompositionSheet,
  IInfantryRecordSheetData,
  IInfantrySecondaryWeaponSheet,
  IInfantryWeaponSheet,
  IRecordSheetSPAEntry,
  InfantryRecordSheetMotiveType,
} from '@/types/printing';
import {
  IFieldGun,
  IInfantryFieldGun,
  IPlatoonComposition,
} from '@/types/unit/InfantryInterfaces';
import { findFieldGunById } from '@/utils/construction/infantry/fieldGuns';
import {
  findWeaponById,
  INFANTRY_WEAPON_TABLE,
} from '@/utils/construction/infantry/weaponTable';

import { extractHeader } from './dataExtractors';

type InfantryWeaponInput =
  | string
  | (Partial<IInfantryWeaponSheet> & {
      readonly id?: string;
      readonly weaponId?: string;
    });

type InfantrySecondaryWeaponInput = Partial<IInfantrySecondaryWeaponSheet> & {
  readonly id?: string;
  readonly weaponId?: string;
};

type InfantryFieldGunInput =
  | (Partial<IInfantryFieldGunSheet> &
      Partial<IFieldGun> &
      Partial<IInfantryFieldGun> & {
        readonly equipmentId?: string;
      })
  | undefined;

/** Infantry-specific unit config fields. */
export interface IInfantryUnitConfig {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
  battleValue?: number;
  cost?: number;
  /** Total troopers in the platoon. */
  platoonSize?: number;
  /** Wave 1 construction composition. */
  platoonComposition?: IPlatoonComposition;
  /** Movement mode. */
  motiveType?: string;
  /** Store-facing Wave 1 motive field. */
  infantryMotive?: string;
  /** Wave 1 armor kit field. */
  armorKit?: string;
  /** Primary weapon name, catalog id, or sheet-ready payload. */
  primaryWeapon?: InfantryWeaponInput;
  primaryWeaponId?: string;
  /** Secondary weapon name/catalog id from the Wave 1 store. */
  secondaryWeapon?: string;
  secondaryWeaponId?: string;
  secondaryWeaponCount?: number;
  /** Sheet-ready secondary weapon payloads. */
  secondaryWeapons?: readonly InfantrySecondaryWeaponInput[];
  /** Single field gun block. */
  fieldGun?: InfantryFieldGunInput;
  /** Wave 1 store keeps mounted field guns as an array. */
  fieldGuns?: readonly InfantryFieldGunInput[];
  /** Specialization badge string (anti-mech, marine, scuba, mountain, xct). */
  specialization?: string;
  antiMechTraining?: boolean;
  hasAntiMechTraining?: boolean;
  /** Gunnery skill (default 5). */
  gunnery?: number;
  /** Anti-mech skill (default 6). */
  antiMech?: number;
}

function normalizeMotive(
  raw: string | undefined,
): InfantryRecordSheetMotiveType {
  switch ((raw ?? 'Foot').trim().toLowerCase()) {
    case 'motorized':
      return 'Motorized';
    case 'jump':
      return 'Jump';
    case 'beast':
      return 'Beast';
    case 'mechanized':
    case 'mechanizedtracked':
    case 'mechanizedwheeled':
    case 'mechanizedhover':
    case 'mechanizedvtol':
      return 'Mechanized';
    default:
      return 'Foot';
  }
}

function buildComposition(
  unit: IInfantryUnitConfig,
): IInfantryPlatoonCompositionSheet {
  if (unit.platoonComposition) {
    return {
      squads: unit.platoonComposition.squads,
      troopersPerSquad: unit.platoonComposition.troopersPerSquad,
    };
  }

  return {
    squads: 1,
    troopersPerSquad: unit.platoonSize ?? 28,
  };
}

function platoonSizeFromComposition(
  composition: IInfantryPlatoonCompositionSheet,
  fallback: number | undefined,
): number {
  return fallback ?? composition.squads * composition.troopersPerSquad;
}

function findWeapon(raw: InfantryWeaponInput | undefined, id?: string) {
  const explicitId =
    id ??
    (typeof raw === 'object' && raw !== null
      ? (raw.id ?? raw.weaponId)
      : undefined);
  if (explicitId) return findWeaponById(explicitId);

  const name = typeof raw === 'string' ? raw : raw?.name;
  return INFANTRY_WEAPON_TABLE.find((w) => w.name === name);
}

function buildWeaponSheet(
  raw: InfantryWeaponInput | undefined,
  id: string | undefined,
  fallbackName: string,
): IInfantryWeaponSheet {
  const catalog = findWeapon(raw, id);
  const objectRaw = typeof raw === 'object' && raw !== null ? raw : undefined;
  const rawName = typeof raw === 'string' ? raw : undefined;
  const name = objectRaw?.name ?? catalog?.name ?? rawName ?? fallbackName;

  return {
    name,
    damage: objectRaw?.damage ?? (catalog ? `1/${catalog.damageDivisor}` : '-'),
    minimumRange: objectRaw?.minimumRange ?? 0,
    shortRange: objectRaw?.shortRange ?? catalog?.rangeShort ?? 0,
    mediumRange: objectRaw?.mediumRange ?? catalog?.rangeMedium ?? 0,
    longRange: objectRaw?.longRange ?? catalog?.rangeLong ?? 0,
    ammoType: objectRaw?.ammoType ?? catalog?.ammoType,
    heat: objectRaw?.heat ?? catalog?.heat,
    special: objectRaw?.special ?? catalog?.special,
  };
}

function buildSecondaryWeapons(
  unit: IInfantryUnitConfig,
): readonly IInfantrySecondaryWeaponSheet[] {
  if (unit.secondaryWeapons && unit.secondaryWeapons.length > 0) {
    return unit.secondaryWeapons.map((raw) => {
      const weapon = buildWeaponSheet(raw, raw.id ?? raw.weaponId, 'Secondary');
      const catalog = findWeapon(raw, raw.id ?? raw.weaponId);
      return {
        ...weapon,
        perTrooperRatio: raw.perTrooperRatio ?? catalog?.secondaryRatio ?? 4,
        count: raw.count,
      };
    });
  }

  if (!unit.secondaryWeapon && !unit.secondaryWeaponId) return [];

  const weapon = buildWeaponSheet(
    unit.secondaryWeapon,
    unit.secondaryWeaponId,
    'Secondary',
  );
  const catalog = findWeapon(unit.secondaryWeapon, unit.secondaryWeaponId);

  return [
    {
      ...weapon,
      perTrooperRatio: catalog?.secondaryRatio ?? 4,
      count: unit.secondaryWeaponCount,
    },
  ];
}

function resolveFieldGun(
  unit: IInfantryUnitConfig,
  platoonSize: number,
): IInfantryFieldGunSheet | undefined {
  const firstGun = unit.fieldGun ?? unit.fieldGuns?.[0];
  if (!firstGun) return undefined;

  const weaponId = firstGun.weaponId ?? firstGun.equipmentId;
  const catalog = weaponId ? findFieldGunById(weaponId) : undefined;
  const fieldGunCount =
    firstGun.count ??
    (unit.fieldGuns && unit.fieldGuns.length > 0
      ? unit.fieldGuns.length
      : Math.max(1, Math.floor(platoonSize / 7)));

  return {
    name: firstGun.name ?? catalog?.name ?? weaponId ?? 'Field Gun',
    count: fieldGunCount,
    damage: firstGun.damage ?? '-',
    minimumRange: firstGun.minimumRange ?? 0,
    shortRange: firstGun.shortRange ?? 0,
    mediumRange: firstGun.mediumRange ?? 0,
    longRange: firstGun.longRange ?? 0,
    ammoRounds: firstGun.ammoRounds ?? catalog?.defaultAmmoRounds,
  };
}

/**
 * Extract infantry record sheet data.
 */
export function extractInfantryData(
  unit: IInfantryUnitConfig,
  specialAbilities?: readonly IRecordSheetSPAEntry[],
): IInfantryRecordSheetData {
  const platoonComposition = buildComposition(unit);
  const platoonSize = platoonSizeFromComposition(
    platoonComposition,
    unit.platoonSize,
  );
  const antiMechTraining =
    unit.antiMechTraining ?? unit.hasAntiMechTraining ?? false;
  const specialization =
    unit.specialization ?? (antiMechTraining ? 'anti-mech' : undefined);

  return {
    unitType: 'infantry',
    header: extractHeader(unit),
    platoonSize,
    platoonComposition,
    motiveType: normalizeMotive(unit.motiveType ?? unit.infantryMotive),
    armorKit: unit.armorKit ?? 'None',
    primaryWeapon: buildWeaponSheet(
      unit.primaryWeapon,
      unit.primaryWeaponId,
      'Rifle',
    ),
    secondaryWeapons: buildSecondaryWeapons(unit),
    fieldGun: resolveFieldGun(unit, platoonSize),
    specialization,
    antiMechTraining,
    gunnery: unit.gunnery ?? 5,
    antiMech: unit.antiMech ?? 6,
    specialAbilities,
  };
}
