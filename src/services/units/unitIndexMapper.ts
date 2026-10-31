/**
 * Raw unit index row to IUnitIndexEntry mapper.
 *
 * Shared by the browser (`CanonicalUnitService`) and Node
 * (`NodeCanonicalUnitService`) services so both read an `index.json` row the
 * same way. Pure: no fetch, no fs.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { IUnitIndexEntry } from '../common/types';

import { getUnitIndexWeightClass } from './unitWeightClass';

/**
 * Raw unit entry as written in a family `index.json`.
 *
 * `unitType` is absent in the BattleMech index; an absent value means
 * BattleMech. Other families write it explicitly.
 */
export interface RawUnitIndexEntry {
  id: string;
  chassis: string;
  model: string; // This is 'variant' in our system
  tonnage: number;
  techBase: string;
  year: number;
  unitType?: string;
  role?: string;
  rulesLevel?: string;
  cost?: number;
  bv?: number;
  path: string;
}

/** Directory (under the site root) of the BattleMech catalog. */
export const BATTLEMECH_DATA_DIRECTORY = '/data/units/battlemechs';

const TECH_BASE_BY_RAW_VALUE: Readonly<Record<string, TechBase>> = {
  CLAN: TechBase.CLAN,
  INNER_SPHERE: TechBase.INNER_SPHERE,
  MIXED: TechBase.INNER_SPHERE,
};

const ERA_BY_PATH_SEGMENT = [
  { segment: '1-age-of-war', era: Era.AGE_OF_WAR },
  { segment: '2-star-league', era: Era.STAR_LEAGUE },
  { segment: '3-succession-wars', era: Era.LATE_SUCCESSION_WARS },
  { segment: '4-clan-invasion', era: Era.CLAN_INVASION },
  { segment: '5-civil-war', era: Era.CIVIL_WAR },
  { segment: '6-dark-age', era: Era.DARK_AGE },
  { segment: '7-ilclan', era: Era.IL_CLAN },
] as const;

const UNIT_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(UnitType));

function techBaseFromRawValue(rawTechBase: string): TechBase {
  return TECH_BASE_BY_RAW_VALUE[rawTechBase] ?? TechBase.INNER_SPHERE;
}

function eraFromPath(filePath: string): Era {
  return (
    ERA_BY_PATH_SEGMENT.find(({ segment }) => filePath.includes(segment))
      ?.era ?? Era.LATE_SUCCESSION_WARS
  );
}

function unitTypeFromRaw(raw: RawUnitIndexEntry): UnitType {
  if (raw.unitType === undefined) return UnitType.BATTLEMECH;
  if (!UNIT_TYPE_VALUES.has(raw.unitType)) {
    throw new Error(
      `Unit index entry "${raw.id}" has unknown unitType "${raw.unitType}"`,
    );
  }
  return raw.unitType as UnitType;
}

/**
 * Map a raw index row to IUnitIndexEntry.
 *
 * @param directory Site-root directory the row's `path` is relative to.
 */
export function mapRawIndexEntry(
  raw: RawUnitIndexEntry,
  directory: string = BATTLEMECH_DATA_DIRECTORY,
): IUnitIndexEntry {
  return {
    id: raw.id,
    name: `${raw.chassis} ${raw.model}`,
    chassis: raw.chassis,
    variant: raw.model,
    tonnage: raw.tonnage,
    techBase: techBaseFromRawValue(raw.techBase),
    era: eraFromPath(raw.path),
    weightClass: getUnitIndexWeightClass(raw.tonnage),
    unitType: unitTypeFromRaw(raw),
    filePath: `${directory}/${raw.path}`,
    year: raw.year,
    role: raw.role,
    rulesLevel: raw.rulesLevel,
    cost: raw.cost,
    bv: raw.bv,
  };
}
