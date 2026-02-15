import type { IRandomAssignmentTable, IRATEntry } from './ratTypes';

import { CW_CLAN_INVASION_RAT, FS_CLAN_INVASION_RAT } from './clanInvasionRats';
import { PIRATES_GENERIC_RAT } from './piratesRat';
import { Era, UnitTypeCategory } from './ratTypes';
import {
  DC_SUCCESSION_WARS_RAT,
  LC_SUCCESSION_WARS_RAT,
} from './successionWarsRats';

const RAT_REGISTRY: Map<string, IRandomAssignmentTable> = new Map();

function registerRAT(rat: IRandomAssignmentTable): void {
  const key = `${rat.faction}:${rat.era}`;
  RAT_REGISTRY.set(key, rat);
}

registerRAT(LC_SUCCESSION_WARS_RAT);
registerRAT(DC_SUCCESSION_WARS_RAT);
registerRAT(CW_CLAN_INVASION_RAT);
registerRAT(FS_CLAN_INVASION_RAT);
registerRAT(PIRATES_GENERIC_RAT);

export function getRAT(faction: string, era: Era): IRandomAssignmentTable {
  const key = `${faction}:${era}`;
  const rat = RAT_REGISTRY.get(key);

  if (rat) {
    return rat;
  }

  for (const entry of Array.from(RAT_REGISTRY.entries())) {
    if (entry[0].startsWith(`${faction}:`)) {
      return entry[1];
    }
  }

  return PIRATES_GENERIC_RAT;
}

export function getAvailableFactions(): readonly string[] {
  const factions = new Set<string>();
  for (const key of Array.from(RAT_REGISTRY.keys())) {
    factions.add(key.split(':')[0]);
  }
  return Array.from(factions);
}

export function getAvailableErasForFaction(faction: string): readonly Era[] {
  const eras: Era[] = [];
  for (const key of Array.from(RAT_REGISTRY.keys())) {
    const [f, e] = key.split(':');
    if (f === faction) {
      eras.push(e as Era);
    }
  }
  return eras;
}

export function selectUnitFromRAT(
  rat: IRandomAssignmentTable,
  unitTypeFilter?: UnitTypeCategory,
  randomFn: () => number = Math.random,
): IRATEntry {
  const entries = unitTypeFilter
    ? rat.entries.filter((e) => e.unitType === unitTypeFilter)
    : rat.entries;

  if (entries.length === 0) {
    return rat.entries[0];
  }

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  let roll = randomFn() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1];
}

export function selectUnitsFromRAT(
  rat: IRandomAssignmentTable,
  targetBV: number,
  options: {
    unitTypeFilter?: UnitTypeCategory;
    minUnits?: number;
    maxUnits?: number;
    bvTolerance?: number;
    randomFn?: () => number;
  } = {},
): readonly IRATEntry[] {
  const {
    unitTypeFilter,
    minUnits = 1,
    maxUnits = 12,
    bvTolerance = 0.1,
    randomFn = Math.random,
  } = options;

  const selected: IRATEntry[] = [];
  let currentBV = 0;
  const bvFloor = targetBV * (1 - bvTolerance);
  const bvCeiling = targetBV * (1 + bvTolerance);

  while (selected.length < maxUnits) {
    const remainingBV = targetBV - currentBV;

    const availableEntries = (
      unitTypeFilter
        ? rat.entries.filter((e) => e.unitType === unitTypeFilter)
        : rat.entries
    ).filter((e) => e.bv <= remainingBV * 1.2);

    if (availableEntries.length === 0) break;

    const unit = selectUnitFromRAT(
      {
        ...rat,
        entries: availableEntries,
        totalWeight: availableEntries.reduce((s, e) => s + e.weight, 0),
      },
      unitTypeFilter,
      randomFn,
    );

    selected.push(unit);
    currentBV += unit.bv;

    if (currentBV >= bvFloor && selected.length >= minUnits) {
      break;
    }

    if (currentBV > bvCeiling) {
      break;
    }
  }

  return selected;
}
