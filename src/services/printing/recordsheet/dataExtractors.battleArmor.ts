/**
 * BattleArmor Record Sheet Data Extractor
 *
 * Produces `IBattleArmorRecordSheetData` from a BattleArmor unit configuration.
 */

import {
  IBattleArmorRecordSheetData,
  IBattleArmorTrooper,
} from '@/types/printing';

import { extractHeader } from './dataExtractors';

/** BattleArmor-specific unit config fields. */
export interface IBattleArmorUnitConfig {
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
  /** Number of troopers in the squad (2–6 IS, 2–5 Clan). */
  squadSize?: number;
  /** Per-trooper armor pip data. Length should equal squadSize. */
  troopers?: Array<{
    index: number;
    armorPips: number;
    maximumArmorPips: number;
    modularWeapon?: string;
    apWeapon?: string;
    gunnery?: number;
    antiMech?: number;
  }>;
  manipulators?: { left: string; right: string };
  walkMP?: number;
  jumpMP?: number;
  umuMP?: number;
  vtolMP?: number;
}

/**
 * Extract BattleArmor record sheet data.
 *
 * Generates synthetic trooper entries when `troopers` is absent so the
 * renderer always has something to display.
 */
export function extractBattleArmorData(
  unit: IBattleArmorUnitConfig,
): IBattleArmorRecordSheetData {
  const squadSize = unit.squadSize ?? 4;

  // Build trooper list — fill missing entries with defaults
  const rawTroopers = unit.troopers ?? [];
  const troopers: IBattleArmorTrooper[] = Array.from(
    { length: squadSize },
    (_, i) => {
      const raw = rawTroopers[i];
      return {
        index: i + 1,
        armorPips: raw?.armorPips ?? 4,
        maximumArmorPips: raw?.maximumArmorPips ?? 4,
        modularWeapon: raw?.modularWeapon,
        apWeapon: raw?.apWeapon,
        gunnery: raw?.gunnery ?? 4,
        antiMech: raw?.antiMech ?? 5,
      };
    },
  );

  return {
    unitType: 'battlearmor',
    header: extractHeader(unit as Parameters<typeof extractHeader>[0]),
    squadSize,
    troopers,
    manipulators: unit.manipulators ?? { left: 'None', right: 'None' },
    walkMP: unit.walkMP ?? 0,
    jumpMP: unit.jumpMP ?? 0,
    umuMP: unit.umuMP ?? 0,
    vtolMP: unit.vtolMP ?? 0,
  };
}
