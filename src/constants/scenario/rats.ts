/**
 * Random Assignment Tables (RATs)
 * Unit selection tables for OpFor generation by faction and era.
 *
 * RATs provide weighted lists of units appropriate for a faction during a specific era.
 * This is a simplified implementation - full RATs would have hundreds of entries per table.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import { Era } from '../../types/temporal/Era';
import { UnitTypeCategory } from '../../types/scenario';

// =============================================================================
// RAT Entry Interfaces
// =============================================================================

/**
 * Single entry in a Random Assignment Table.
 */
export interface IRATEntry {
  /** Unit chassis name */
  readonly chassis: string;
  /** Unit variant */
  readonly variant: string;
  /** Combined designation (e.g., "Atlas AS7-D") */
  readonly designation: string;
  /** Battle Value */
  readonly bv: number;
  /** Tonnage */
  readonly tonnage: number;
  /** Unit type */
  readonly unitType: UnitTypeCategory;
  /** Selection weight (higher = more common) */
  readonly weight: number;
  /** Year unit was introduced (optional for temporal filtering) */
  readonly introductionYear?: number;
  /** Year unit became extinct (optional for temporal filtering) */
  readonly extinctionYear?: number;
}

/**
 * Random Assignment Table for a faction/era combination.
 */
export interface IRandomAssignmentTable {
  /** Faction code */
  readonly faction: string;
  /** Faction display name */
  readonly factionName: string;
  /** Era this table applies to */
  readonly era: Era;
  /** Available units */
  readonly entries: readonly IRATEntry[];
  /** Total weight for probability calculations */
  readonly totalWeight: number;
}

// =============================================================================
// Faction Definitions
// =============================================================================

/**
 * Known factions for RAT lookup.
 */
export enum Faction {
  // Great Houses
  LYRAN_COMMONWEALTH = 'LC',
  FEDERATED_SUNS = 'FS',
  DRACONIS_COMBINE = 'DC',
  FREE_WORLDS_LEAGUE = 'FWL',
  CAPELLAN_CONFEDERATION = 'CC',
  // Clans
  CLAN_WOLF = 'CW',
  CLAN_JADE_FALCON = 'CJF',
  CLAN_GHOST_BEAR = 'CGB',
  CLAN_SMOKE_JAGUAR = 'CSJ',
  // Periphery
  PIRATES = 'PIR',
  MERCENARY = 'MERC',
  // ComStar
  COMSTAR = 'CS',
  WORD_OF_BLAKE = 'WOB',
}

/**
 * Faction display names.
 */
const FACTION_NAMES: Readonly<Record<Faction, string>> = {
  [Faction.LYRAN_COMMONWEALTH]: 'Lyran Commonwealth',
  [Faction.FEDERATED_SUNS]: 'Federated Suns',
  [Faction.DRACONIS_COMBINE]: 'Draconis Combine',
  [Faction.FREE_WORLDS_LEAGUE]: 'Free Worlds League',
  [Faction.CAPELLAN_CONFEDERATION]: 'Capellan Confederation',
  [Faction.CLAN_WOLF]: 'Clan Wolf',
  [Faction.CLAN_JADE_FALCON]: 'Clan Jade Falcon',
  [Faction.CLAN_GHOST_BEAR]: 'Clan Ghost Bear',
  [Faction.CLAN_SMOKE_JAGUAR]: 'Clan Smoke Jaguar',
  [Faction.PIRATES]: 'Pirates',
  [Faction.MERCENARY]: 'Mercenary',
  [Faction.COMSTAR]: 'ComStar',
  [Faction.WORD_OF_BLAKE]: 'Word of Blake',
};

// =============================================================================
// Sample RAT Data - Succession Wars Era
// =============================================================================

/**
 * Succession Wars era Lyran Commonwealth RAT.
 * Heavy and assault mechs favored.
 */
const LC_SUCCESSION_WARS_RAT: IRandomAssignmentTable = {
  faction: Faction.LYRAN_COMMONWEALTH,
  factionName: FACTION_NAMES[Faction.LYRAN_COMMONWEALTH],
  era: Era.LATE_SUCCESSION_WARS,
  entries: [
    // Assault
    { chassis: 'Atlas', variant: 'AS7-D', designation: 'Atlas AS7-D', bv: 1897, tonnage: 100, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Banshee', variant: 'BNC-3E', designation: 'Banshee BNC-3E', bv: 1114, tonnage: 95, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    { chassis: 'Zeus', variant: 'ZEU-6S', designation: 'Zeus ZEU-6S', bv: 1348, tonnage: 80, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    // Heavy
    { chassis: 'Commando', variant: 'COM-2D', designation: 'Commando COM-2D', bv: 558, tonnage: 25, unitType: UnitTypeCategory.BattleMech, weight: 10 },
    { chassis: 'Griffin', variant: 'GRF-1N', designation: 'Griffin GRF-1N', bv: 1272, tonnage: 55, unitType: UnitTypeCategory.BattleMech, weight: 20 },
    { chassis: 'Hunchback', variant: 'HBK-4G', designation: 'Hunchback HBK-4G', bv: 1067, tonnage: 50, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Orion', variant: 'ON1-K', designation: 'Orion ON1-K', bv: 1429, tonnage: 75, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    // Medium
    { chassis: 'Wolverine', variant: 'WVR-6R', designation: 'Wolverine WVR-6R', bv: 1101, tonnage: 55, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Enforcer', variant: 'ENF-4R', designation: 'Enforcer ENF-4R', bv: 1031, tonnage: 50, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    // Light
    { chassis: 'Commando', variant: 'COM-2D', designation: 'Commando COM-2D', bv: 558, tonnage: 25, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    { chassis: 'Jenner', variant: 'JR7-D', designation: 'Jenner JR7-D', bv: 875, tonnage: 35, unitType: UnitTypeCategory.BattleMech, weight: 10 },
  ],
  totalWeight: 163,
};

/**
 * Succession Wars era Draconis Combine RAT.
 * Fast, hard-hitting units.
 */
const DC_SUCCESSION_WARS_RAT: IRandomAssignmentTable = {
  faction: Faction.DRACONIS_COMBINE,
  factionName: FACTION_NAMES[Faction.DRACONIS_COMBINE],
  era: Era.LATE_SUCCESSION_WARS,
  entries: [
    // Assault
    { chassis: 'Atlas', variant: 'AS7-D', designation: 'Atlas AS7-D', bv: 1897, tonnage: 100, unitType: UnitTypeCategory.BattleMech, weight: 10 },
    { chassis: 'Stalker', variant: 'STK-3F', designation: 'Stalker STK-3F', bv: 1559, tonnage: 85, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    // Heavy
    { chassis: 'Dragon', variant: 'DRG-1N', designation: 'Dragon DRG-1N', bv: 1125, tonnage: 60, unitType: UnitTypeCategory.BattleMech, weight: 25 },
    { chassis: 'Quickdraw', variant: 'QKD-4G', designation: 'Quickdraw QKD-4G', bv: 1192, tonnage: 60, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Grand Dragon', variant: 'DRG-1G', designation: 'Grand Dragon DRG-1G', bv: 1305, tonnage: 60, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    // Medium
    { chassis: 'Panther', variant: 'PNT-9R', designation: 'Panther PNT-9R', bv: 769, tonnage: 35, unitType: UnitTypeCategory.BattleMech, weight: 20 },
    { chassis: 'Jenner', variant: 'JR7-D', designation: 'Jenner JR7-D', bv: 875, tonnage: 35, unitType: UnitTypeCategory.BattleMech, weight: 22 },
    // Light
    { chassis: 'Locust', variant: 'LCT-1V', designation: 'Locust LCT-1V', bv: 432, tonnage: 20, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Wasp', variant: 'WSP-1A', designation: 'Wasp WSP-1A', bv: 384, tonnage: 20, unitType: UnitTypeCategory.BattleMech, weight: 12 },
  ],
  totalWeight: 149,
};

// =============================================================================
// Sample RAT Data - Clan Invasion Era
// =============================================================================

/**
 * Clan Invasion era Clan Wolf RAT.
 * OmniMechs and advanced technology.
 */
const CW_CLAN_INVASION_RAT: IRandomAssignmentTable = {
  faction: Faction.CLAN_WOLF,
  factionName: FACTION_NAMES[Faction.CLAN_WOLF],
  era: Era.CLAN_INVASION,
  entries: [
    // Assault
    { chassis: 'Dire Wolf', variant: 'Prime', designation: 'Dire Wolf Prime', bv: 2871, tonnage: 100, unitType: UnitTypeCategory.BattleMech, weight: 8 },
    { chassis: 'Gargoyle', variant: 'Prime', designation: 'Gargoyle Prime', bv: 1682, tonnage: 80, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    // Heavy
    { chassis: 'Timber Wolf', variant: 'Prime', designation: 'Timber Wolf Prime', bv: 2737, tonnage: 75, unitType: UnitTypeCategory.BattleMech, weight: 20 },
    { chassis: 'Hellbringer', variant: 'Prime', designation: 'Hellbringer Prime', bv: 2414, tonnage: 65, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    // Medium
    { chassis: 'Stormcrow', variant: 'Prime', designation: 'Stormcrow Prime', bv: 2031, tonnage: 55, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Nova', variant: 'Prime', designation: 'Nova Prime', bv: 1841, tonnage: 50, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    // Light
    { chassis: 'Kit Fox', variant: 'Prime', designation: 'Kit Fox Prime', bv: 1085, tonnage: 30, unitType: UnitTypeCategory.BattleMech, weight: 14 },
    { chassis: 'Mist Lynx', variant: 'Prime', designation: 'Mist Lynx Prime', bv: 888, tonnage: 25, unitType: UnitTypeCategory.BattleMech, weight: 12 },
  ],
  totalWeight: 114,
};

/**
 * Clan Invasion era Federated Suns RAT.
 * Balanced force with some advanced tech.
 */
const FS_CLAN_INVASION_RAT: IRandomAssignmentTable = {
  faction: Faction.FEDERATED_SUNS,
  factionName: FACTION_NAMES[Faction.FEDERATED_SUNS],
  era: Era.CLAN_INVASION,
  entries: [
    // Assault
    { chassis: 'Victor', variant: 'VTR-9B', designation: 'Victor VTR-9B', bv: 1296, tonnage: 80, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Battlemaster', variant: 'BLR-1G', designation: 'Battlemaster BLR-1G', bv: 1519, tonnage: 85, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    // Heavy
    { chassis: 'JagerMech', variant: 'JM6-S', designation: 'JagerMech JM6-S', bv: 930, tonnage: 65, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Axman', variant: 'AXM-1N', designation: 'Axman AXM-1N', bv: 1075, tonnage: 65, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Hatchetman', variant: 'HCT-3F', designation: 'Hatchetman HCT-3F', bv: 851, tonnage: 45, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    // Medium
    { chassis: 'Centurion', variant: 'CN9-A', designation: 'Centurion CN9-A', bv: 945, tonnage: 50, unitType: UnitTypeCategory.BattleMech, weight: 20 },
    { chassis: 'Wolfhound', variant: 'WLF-1', designation: 'Wolfhound WLF-1', bv: 954, tonnage: 35, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    // Light
    { chassis: 'Valkyrie', variant: 'VLK-QA', designation: 'Valkyrie VLK-QA', bv: 723, tonnage: 30, unitType: UnitTypeCategory.BattleMech, weight: 16 },
    { chassis: 'Mongoose', variant: 'MON-67', designation: 'Mongoose MON-67', bv: 568, tonnage: 25, unitType: UnitTypeCategory.BattleMech, weight: 12 },
  ],
  totalWeight: 138,
};

// =============================================================================
// Pirate/Generic RAT (Available all eras)
// =============================================================================

/**
 * Generic pirate/mercenary RAT.
 * Mix of older designs.
 */
const PIRATES_GENERIC_RAT: IRandomAssignmentTable = {
  faction: Faction.PIRATES,
  factionName: FACTION_NAMES[Faction.PIRATES],
  era: Era.LATE_SUCCESSION_WARS, // Used as template for all eras
  entries: [
    // Assault
    { chassis: 'Awesome', variant: 'AWS-8Q', designation: 'Awesome AWS-8Q', bv: 1605, tonnage: 80, unitType: UnitTypeCategory.BattleMech, weight: 8 },
    // Heavy
    { chassis: 'Marauder', variant: 'MAD-3R', designation: 'Marauder MAD-3R', bv: 1220, tonnage: 75, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Warhammer', variant: 'WHM-6R', designation: 'Warhammer WHM-6R', bv: 1299, tonnage: 70, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    { chassis: 'Thunderbolt', variant: 'TDR-5S', designation: 'Thunderbolt TDR-5S', bv: 1335, tonnage: 65, unitType: UnitTypeCategory.BattleMech, weight: 12 },
    // Medium
    { chassis: 'Wolverine', variant: 'WVR-6R', designation: 'Wolverine WVR-6R', bv: 1101, tonnage: 55, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Shadow Hawk', variant: 'SHD-2H', designation: 'Shadow Hawk SHD-2H', bv: 1064, tonnage: 55, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Phoenix Hawk', variant: 'PXH-1', designation: 'Phoenix Hawk PXH-1', bv: 1041, tonnage: 45, unitType: UnitTypeCategory.BattleMech, weight: 15 },
    // Light
    { chassis: 'Stinger', variant: 'STG-3R', designation: 'Stinger STG-3R', bv: 359, tonnage: 20, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Wasp', variant: 'WSP-1A', designation: 'Wasp WSP-1A', bv: 384, tonnage: 20, unitType: UnitTypeCategory.BattleMech, weight: 18 },
    { chassis: 'Locust', variant: 'LCT-1V', designation: 'Locust LCT-1V', bv: 432, tonnage: 20, unitType: UnitTypeCategory.BattleMech, weight: 15 },
  ],
  totalWeight: 152,
};

// =============================================================================
// RAT Registry
// =============================================================================

/**
 * All available RATs indexed by faction and era.
 */
const RAT_REGISTRY: Map<string, IRandomAssignmentTable> = new Map();

// Register all RATs
function registerRAT(rat: IRandomAssignmentTable): void {
  const key = `${rat.faction}:${rat.era}`;
  RAT_REGISTRY.set(key, rat);
}

// Initialize registry
registerRAT(LC_SUCCESSION_WARS_RAT);
registerRAT(DC_SUCCESSION_WARS_RAT);
registerRAT(CW_CLAN_INVASION_RAT);
registerRAT(FS_CLAN_INVASION_RAT);
registerRAT(PIRATES_GENERIC_RAT);

// =============================================================================
// RAT Lookup Functions
// =============================================================================

/**
 * Get a RAT for a specific faction and era.
 * Falls back to pirates/mercenary table if not found.
 */
export function getRAT(faction: string, era: Era): IRandomAssignmentTable {
  const key = `${faction}:${era}`;
  const rat = RAT_REGISTRY.get(key);
  
  if (rat) {
    return rat;
  }
  
  // Try same faction, different era (closest match)
  for (const entry of Array.from(RAT_REGISTRY.entries())) {
    if (entry[0].startsWith(`${faction}:`)) {
      return entry[1];
    }
  }
  
  // Fallback to pirates table
  return PIRATES_GENERIC_RAT;
}

/**
 * Get all available factions.
 */
export function getAvailableFactions(): readonly string[] {
  const factions = new Set<string>();
  for (const key of Array.from(RAT_REGISTRY.keys())) {
    factions.add(key.split(':')[0]);
  }
  return Array.from(factions);
}

/**
 * Get all available eras for a faction.
 */
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

/**
 * Select a random unit from a RAT based on weights.
 * @param rat - The random assignment table to select from
 * @param unitTypeFilter - Optional filter for unit type
 * @param randomFn - Optional random function for seeded PRNG (defaults to Math.random)
 */
export function selectUnitFromRAT(
  rat: IRandomAssignmentTable,
  unitTypeFilter?: UnitTypeCategory,
  randomFn: () => number = Math.random
): IRATEntry {
  // Filter entries if type specified
  const entries = unitTypeFilter
    ? rat.entries.filter((e) => e.unitType === unitTypeFilter)
    : rat.entries;

  if (entries.length === 0) {
    // Fallback to first entry if filter too restrictive
    return rat.entries[0];
  }

  // Calculate total weight for filtered entries
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  // Random roll
  let roll = randomFn() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }

  // Fallback
  return entries[entries.length - 1];
}

/**
 * Select multiple units from a RAT targeting a BV budget.
 * @param rat - The random assignment table to select from
 * @param targetBV - Target battle value budget
 * @param options - Selection options including randomFn for seeded PRNG
 */
export function selectUnitsFromRAT(
  rat: IRandomAssignmentTable,
  targetBV: number,
  options: {
    unitTypeFilter?: UnitTypeCategory;
    minUnits?: number;
    maxUnits?: number;
    bvTolerance?: number; // Percentage tolerance (default 10%)
    randomFn?: () => number; // Optional random function for seeded PRNG
  } = {}
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

  // Keep selecting until we hit the target or max units
  while (selected.length < maxUnits) {
    const remainingBV = targetBV - currentBV;

    // Filter to units that fit within remaining budget (with some tolerance)
    const availableEntries = (unitTypeFilter
      ? rat.entries.filter((e) => e.unitType === unitTypeFilter)
      : rat.entries
    ).filter((e) => e.bv <= remainingBV * 1.2); // Allow slight overage

    if (availableEntries.length === 0) break;

    const unit = selectUnitFromRAT(
      { ...rat, entries: availableEntries, totalWeight: availableEntries.reduce((s, e) => s + e.weight, 0) },
      unitTypeFilter,
      randomFn
    );
    
    selected.push(unit);
    currentBV += unit.bv;

    // Check if we're in the target range
    if (currentBV >= bvFloor && selected.length >= minUnits) {
      break;
    }

    // Don't exceed ceiling by too much
    if (currentBV > bvCeiling) {
      break;
    }
  }

  return selected;
}

// =============================================================================
// Exports
// =============================================================================

export { FACTION_NAMES };
