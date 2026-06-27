import * as fs from 'fs';
import * as path from 'path';

export interface BattleMechIndexEntry {
  id: string;
  path?: string;
  bv?: number;
  mulBV?: number;
  chassis?: string;
  model?: string;
}

export interface BattleMechIndex {
  units: BattleMechIndexEntry[];
}

export interface BattleMechUnit {
  techBase?: string;
  configuration?: string;
  tonnage?: number;
  cockpit?: string;
  equipment?: Array<{ id: string; [key: string]: unknown }>;
  criticalSlots?: Record<string, unknown[]>;
  [key: string]: unknown;
}

export interface BvBreakdown {
  ammoBV?: number;
  armoredComponentBV?: number;
  cockpitModifier?: number;
  defensiveBV?: number;
  defensiveFactor?: number;
  defensiveEquipBV?: number;
  explosivePenalty?: number;
  halvedWeaponBV?: number;
  halvedWeaponCount?: number;
  heatEfficiency?: number;
  indexBV?: number;
  jumpMP?: number;
  issues?: string[];
  offensiveBV?: number;
  offEquipBV?: number;
  offensiveEquipBV?: number;
  physicalWeaponBV?: number;
  rawWeaponBV?: number;
  speedFactor?: number;
  techBase?: string;
  unresolvedWeapons?: string[];
  weightBonus?: number;
  weaponBV?: number;
  weaponCount?: number;
  [key: string]: unknown;
}

export interface BvValidationResult {
  unitId: string;
  status?: string;
  percentDiff: number | null;
  difference: number;
  indexBV: number;
  calculatedBV: number;
  breakdown?: BvBreakdown;
  issues?: string[];
  [key: string]: unknown;
}

export interface BvValidationReport {
  allResults: BvValidationResult[];
  [key: string]: unknown;
}

export interface AmmoCatalogItem {
  id: string;
  name?: string;
  battleValue?: number;
  techBase?: string;
  shotsPerTon?: number;
  compatibleWeaponIds?: string[];
  [key: string]: unknown;
}

export type BvResultWithPercentDiff = BvValidationResult & {
  percentDiff: number;
};

export type BvResultWithBreakdown = BvResultWithPercentDiff & {
  breakdown: BvBreakdown;
};

const battleMechUnitsDir = 'public/data/units/battlemechs';
const officialEquipmentDir = 'public/data/equipment/official';

export function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function loadBvValidationReport(): BvValidationReport {
  return readJson('validation-output/bv-validation-report.json');
}

export function hasBvPercentDiff(
  result: BvValidationResult,
): result is BvResultWithPercentDiff {
  return result.status !== 'error' && result.percentDiff !== null;
}

export function hasBvBreakdown(
  result: BvValidationResult,
): result is BvResultWithBreakdown {
  return hasBvPercentDiff(result) && result.breakdown !== undefined;
}

export function loadBattleMechIndex(): BattleMechIndex {
  return readJson(path.join(battleMechUnitsDir, 'index.json'));
}

export function loadBattleMechUnitByEntry(
  entry: BattleMechIndexEntry | undefined,
): BattleMechUnit | null {
  if (!entry?.path) return null;
  try {
    return readJson<BattleMechUnit>(path.join(battleMechUnitsDir, entry.path));
  } catch {
    return null;
  }
}

export function createBattleMechUnitLoader(
  index: BattleMechIndex = loadBattleMechIndex(),
): (unitId: string) => BattleMechUnit | null {
  return (unitId: string) =>
    loadBattleMechUnitByEntry(index.units.find((entry) => entry.id === unitId));
}

function catalogItemsFrom(data: unknown): AmmoCatalogItem[] {
  if (Array.isArray(data)) return data as AmmoCatalogItem[];
  if (data && typeof data === 'object') {
    const record = data as { items?: unknown; [key: string]: unknown };
    if (Array.isArray(record.items)) return record.items as AmmoCatalogItem[];
    return Object.values(record).flatMap((value) =>
      Array.isArray(value) ? (value as AmmoCatalogItem[]) : [],
    );
  }
  return [];
}

export function loadOfficialAmmoItems(): AmmoCatalogItem[] {
  const basePath = path.resolve(process.cwd(), officialEquipmentDir);
  const index = readJson<{
    files?: { ammunition?: Record<string, string> | string[] };
  }>(path.join(basePath, 'index.json'));
  const ammoFilesSource = index.files?.ammunition;
  const ammoFiles = Array.isArray(ammoFilesSource)
    ? ammoFilesSource
    : ammoFilesSource && typeof ammoFilesSource === 'object'
      ? Object.values(ammoFilesSource)
      : ['ammunition.json'];

  const items = ammoFiles.flatMap((ammoFile) =>
    catalogItemsFrom(readJson(path.join(basePath, ammoFile))),
  );
  if (items.length === 0) {
    throw new Error(
      `No ammunition catalog items loaded from ${path.join(basePath, 'index.json')}`,
    );
  }
  return items;
}
