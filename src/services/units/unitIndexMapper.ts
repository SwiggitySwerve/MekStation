/**
 * Raw unit index row to IUnitIndexEntry mapper.
 *
 * Shared by the browser (`CanonicalUnitService`) and Node
 * (`NodeCanonicalUnitService`) services so both read an `index.json` row the
 * same way. No fetch, no fs; rows that fail to map are logged and skipped.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { UnitFamily } from '@/types/unit/UnitIndex';

import { Era, getEraForYear } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';
import { isValidUnitType } from '@/utils/validation/UnitCategoryMapper';

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

function techBaseFromRawValue(rawTechBase: string): TechBase {
  return Object.hasOwn(TECH_BASE_BY_RAW_VALUE, rawTechBase)
    ? TECH_BASE_BY_RAW_VALUE[rawTechBase]
    : TechBase.INNER_SPHERE;
}

function eraFromPath(filePath: string): Era {
  return (
    ERA_BY_PATH_SEGMENT.find(({ segment }) => filePath.includes(segment))
      ?.era ?? Era.LATE_SUCCESSION_WARS
  );
}

function unitTypeFromRaw(raw: RawUnitIndexEntry): UnitType {
  if (raw.unitType === undefined) return UnitType.BATTLEMECH;
  if (!isValidUnitType(raw.unitType)) {
    throw new Error(
      `Unit index entry "${raw.id}" has unknown unitType "${raw.unitType}"`,
    );
  }
  return raw.unitType;
}

/**
 * Map a raw index row to IUnitIndexEntry. Throws on an unknown `unitType`
 * rather than defaulting to BattleMech. Mech output retains its legacy shape.
 */
export function mapRawIndexEntry(
  raw: RawUnitIndexEntry,
  family: UnitFamily = 'battlemechs',
): IUnitIndexEntry {
  if (!raw || typeof raw.id !== 'string' || typeof raw.path !== 'string') {
    throw new Error('Invalid unit index row');
  }
  return {
    ...(family !== 'battlemechs' && { family }),
    id: raw.id,
    name: `${raw.chassis} ${raw.model}`,
    chassis: raw.chassis,
    variant: raw.model,
    tonnage: raw.tonnage,
    techBase: techBaseFromRawValue(raw.techBase),
    era:
      family === 'battlemechs'
        ? eraFromPath(raw.path)
        : getEraForYear(raw.year),
    weightClass: getUnitIndexWeightClass(raw.tonnage),
    unitType: unitTypeFromRaw(raw),
    filePath: `/data/units/${family}/${raw.path}`,
    year: raw.year,
    role: raw.role,
    rulesLevel: raw.rulesLevel,
    cost: raw.cost,
    bv: raw.bv,
  };
}

/**
 * Map every row of an index. A row that fails to map (an unknown `unitType`, a
 * missing `path`, a non-object row) is skipped and logged once with its
 * position and id, so one bad row never empties the catalog.
 */
export function mapRawIndexRows(
  rows: readonly RawUnitIndexEntry[],
  family: UnitFamily = 'battlemechs',
): IUnitIndexEntry[] {
  const entries: IUnitIndexEntry[] = [];
  rows.forEach((raw, position) => {
    try {
      entries.push(mapRawIndexEntry(raw, family));
    } catch (error) {
      const id = (raw as Partial<RawUnitIndexEntry> | null)?.id ?? '?';
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`Skipping unit index row ${position} "${id}": ${reason}`);
    }
  });
  if (rows.length > 0 && entries.length === 0)
    throw new Error(`Canonical ${family} index has no usable rows`);
  return entries;
}
