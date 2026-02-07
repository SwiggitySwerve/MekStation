/**
 * Equipment BV Resolver
 *
 * Maps equipment IDs from unit JSON files to canonical equipment catalog entries,
 * providing battleValue and heat values from the single source of truth.
 *
 * Eliminates hardcoded weapon BV/heat maps by resolving against the equipment
 * catalog at runtime (filesystem read from public/data/equipment/official/).
 *
 * BV-context heat overrides (per TechManual BV 2.0):
 * - Ultra AC: base heat × 2 (can fire twice)
 * - Rotary AC: base heat × 6 (can fire up to 6 times)
 * - Streak SRM: base heat × 0.5 (only fires on lock)
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface EquipmentBVResult {
  battleValue: number;
  heat: number;
  resolved: boolean;
}

export interface EquipmentCatalogEntry {
  id: string;
  name: string;
  category: string;
  subType?: string;
  techBase: string;
  heat?: number;
  battleValue: number;
  damage?: number | string;
}

interface WeaponCatalogFile {
  items: EquipmentCatalogEntry[];
}

interface MiscCatalogFile {
  items: Array<{
    id: string;
    name: string;
    category: string;
    techBase: string;
    battleValue: number;
    [key: string]: unknown;
  }>;
}

interface AmmoCatalogFile {
  items: Array<{
    id: string;
    name: string;
    category: string;
    techBase: string;
    battleValue: number;
    [key: string]: unknown;
  }>;
}

// ============================================================================
// EQUIPMENT CATALOG CACHE
// ============================================================================

/** Cached equipment catalog: id → entry */
let catalogCache: Map<string, EquipmentCatalogEntry> | null = null;

/** Cached name mappings: normalized name → canonical id */
let nameMappingsCache: Record<string, string> | null = null;

/** Unresolvable IDs logged this session (avoid spam) */
const loggedUnresolvable = new Set<string>();

// ============================================================================
// CATALOG LOADING
// ============================================================================

/**
 * Resolve the base path to the equipment catalog data.
 * Works from project root (where npm scripts run) or from src/ context.
 */
function getEquipmentBasePath(): string {
  // Try common project root patterns
  const candidates = [
    path.resolve(process.cwd(), 'public/data/equipment/official'),
    path.resolve(__dirname, '../../../public/data/equipment/official'),
    path.resolve(__dirname, '../../../../public/data/equipment/official'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to cwd-based path
  return path.resolve(process.cwd(), 'public/data/equipment/official');
}

/**
 * Load a JSON file safely, returning null on failure.
 */
function loadJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Load the name-mappings.json file for MegaMek name → canonical ID resolution.
 */
function loadNameMappings(): Record<string, string> {
  if (nameMappingsCache) return nameMappingsCache;

  const candidates = [
    path.resolve(process.cwd(), 'public/data/equipment/name-mappings.json'),
    path.resolve(
      __dirname,
      '../../../public/data/equipment/name-mappings.json',
    ),
    path.resolve(
      __dirname,
      '../../../../public/data/equipment/name-mappings.json',
    ),
  ];

  for (const candidate of candidates) {
    const data = loadJsonFile<Record<string, string>>(candidate);
    if (data) {
      const { $schema: _, ...mappings } = data;
      nameMappingsCache = mappings;
      return mappings;
    }
  }

  nameMappingsCache = {};
  return {};
}

/**
 * Load the full equipment catalog from all JSON files.
 * Builds a Map<id, entry> for O(1) lookups.
 */
function loadEquipmentCatalog(): Map<string, EquipmentCatalogEntry> {
  if (catalogCache) return catalogCache;

  const catalog = new Map<string, EquipmentCatalogEntry>();
  const basePath = getEquipmentBasePath();

  // Load weapon files from index.json (data-driven)
  const indexData = loadJsonFile<{
    files: {
      weapons: Record<string, string>;
      ammunition: Record<string, string> | string;
      electronics: string;
      miscellaneous: string;
    };
  }>(path.join(basePath, 'index.json'));
  const weaponFiles = indexData?.files?.weapons
    ? Object.values(indexData.files.weapons)
    : ['weapons/energy.json', 'weapons/ballistic.json', 'weapons/missile.json'];
  for (const file of weaponFiles) {
    const data = loadJsonFile<WeaponCatalogFile>(path.join(basePath, file));
    if (data?.items) {
      for (const item of data.items) {
        catalog.set(item.id, item);
      }
    }
  }

  // Load electronics
  const electronics = loadJsonFile<MiscCatalogFile>(
    path.join(basePath, 'electronics.json'),
  );
  if (electronics?.items) {
    for (const item of electronics.items) {
      // Don't overwrite weapons entries (weapons have priority)
      if (!catalog.has(item.id)) {
        catalog.set(item.id, {
          id: item.id,
          name: item.name,
          category: item.category,
          techBase: item.techBase,
          battleValue: item.battleValue,
        });
      }
    }
  }

  // Load miscellaneous
  const misc = loadJsonFile<MiscCatalogFile>(
    path.join(basePath, 'miscellaneous.json'),
  );
  if (misc?.items) {
    for (const item of misc.items) {
      // Don't overwrite weapons entries (weapons have priority)
      if (!catalog.has(item.id)) {
        catalog.set(item.id, {
          id: item.id,
          name: item.name,
          category: item.category,
          techBase: item.techBase,
          battleValue: item.battleValue,
        });
      }
    }
  }

  // Load ammunition (data-driven from index.json)
  const ammoFileEntries = indexData?.files?.ammunition;
  const ammoFiles = ammoFileEntries && typeof ammoFileEntries === 'object' && !Array.isArray(ammoFileEntries)
    ? Object.values(ammoFileEntries) as string[]
    : ['ammunition.json'];
  for (const ammoFile of ammoFiles) {
    const ammo = loadJsonFile<AmmoCatalogFile>(path.join(basePath, ammoFile));
    if (ammo?.items) {
      for (const item of ammo.items) {
        // Don't overwrite weapons entries (weapons have priority)
        if (!catalog.has(item.id)) {
          catalog.set(item.id, {
            id: item.id,
            name: item.name,
            category: item.category,
            techBase: item.techBase,
            battleValue: item.battleValue,
          });
        }
      }
    }
  }

  catalogCache = catalog;
  return catalog;
}

// ============================================================================
// ID NORMALIZATION
// ============================================================================

/**
 * Regex normalization patterns extracted from validate-bv.ts.
 * Maps various ID formats (IS/Clan prefixed, concatenated, etc.) to canonical catalog IDs.
 */
const NORMALIZATION_PATTERNS: Array<[RegExp, string]> = [
  // Standard weapon patterns (strip IS/Clan prefix and normalize)
  [/^(?:is|cl)ac(\d+)$/, 'ac-$1'],
  [/^(?:is|cl)lrm(\d+)$/, 'lrm-$1'],
  [/^(?:is|cl)srm(\d+)$/, 'srm-$1'],
  [/^(?:is|cl)?mrm(\d+)$/, 'mrm-$1'],

  // Ultra AC variants
  [/^(?:is|cl)?uac(\d+)$/, 'uac-$1'],
  [/^(?:is|cl)?ultraac(\d+)$/, 'uac-$1'],
  [/^(?:is|cl)?ultra-ac-(\d+)$/, 'uac-$1'],

  // LB-X AC variants
  [/^(?:is|cl)?lbxac(\d+)$/, 'lb-$1-x-ac'],
  [/^(?:is|cl)?lb(\d+)xac$/, 'lb-$1-x-ac'],
  [/^(?:is|cl)?lb-(\d+)-x-ac$/, 'lb-$1-x-ac'],

  // Rotary AC
  [/^(?:is|cl)?rac(\d+)$/, 'rac-$1'],
  [/^(?:is|cl)?rotaryac(\d+)$/, 'rac-$1'],

  // Light AC
  [/^(?:is|cl)?lac(\d+)$/, 'lac-$1'],
  [/^(?:is|cl)?lightac(\d+)$/, 'lac-$1'],

  // Streak SRM
  [/^(?:is|cl)?streaksrm(\d+)$/, 'streak-srm-$1'],
  [/^(?:is|cl)?streak-srm-(\d+)$/, 'streak-srm-$1'],

  // Clan Streak SRM (separate IDs in catalog)
  [/^cl-?streaksrm(\d+)$/, 'clan-streak-srm-$1'],
  [/^cl-?streak-srm-(\d+)$/, 'clan-streak-srm-$1'],

  // ATM
  [/^(?:cl)?atm(\d+)$/, 'atm-$1'],

  // MML
  [/^(?:is)?mml(\d+)$/, 'mml-$1'],

  // Energy weapon patterns - laser variants
  [/^(?:is|cl)?smalllaser$/, 'small-laser'],
  [/^(?:is|cl)?mediumlaser$/, 'medium-laser'],
  [/^(?:is|cl)?largelaser$/, 'large-laser'],

  // ER laser variants (IS)
  [/^(?:is)?ersmall(?:laser)?$/, 'er-small-laser'],
  [/^(?:is)?ermedium(?:laser)?$/, 'er-medium-laser'],
  [/^(?:is)?erlarge(?:laser)?$/, 'er-large-laser'],
  [/^(?:is)?er-small-laser$/, 'er-small-laser'],
  [/^(?:is)?er-medium-laser$/, 'er-medium-laser'],
  [/^(?:is)?er-large-laser$/, 'er-large-laser'],

  // ER laser variants (Clan)
  [/^cl-?ersmall(?:laser)?$/, 'clan-er-small-laser'],
  [/^cl-?ermedium(?:laser)?$/, 'clan-er-medium-laser'],
  [/^cl-?erlarge(?:laser)?$/, 'clan-er-large-laser'],
  [/^cl-?er-small-laser$/, 'clan-er-small-laser'],
  [/^cl-?er-medium-laser$/, 'clan-er-medium-laser'],
  [/^cl-?er-large-laser$/, 'clan-er-large-laser'],

  // Pulse laser variants (IS)
  [/^(?:is)?smallpulse(?:laser)?$/, 'small-pulse-laser'],
  [/^(?:is)?mediumpulse(?:laser)?$/, 'medium-pulse-laser'],
  [/^(?:is)?largepulse(?:laser)?$/, 'large-pulse-laser'],

  // Pulse laser variants (Clan)
  [/^cl-?smallpulse(?:laser)?$/, 'clan-small-pulse-laser'],
  [/^cl-?mediumpulse(?:laser)?$/, 'clan-medium-pulse-laser'],
  [/^cl-?largepulse(?:laser)?$/, 'clan-large-pulse-laser'],

  // PPC variants
  [/^(?:is)?ppc$/, 'ppc'],
  [/^(?:is)?erppc$/, 'er-ppc'],
  [/^(?:is)?er-ppc$/, 'er-ppc'],
  [/^cl-?ppc$/, 'ppc'], // Clan PPC uses clan-er-ppc in catalog
  [/^cl-?erppc$/, 'clan-er-ppc'],
  [/^cl-?er-ppc$/, 'clan-er-ppc'],

  // Gauss variants
  [/^(?:is|cl)?gaussrifle$/, 'gauss-rifle'],
  [/^(?:is)?lightgaussrifle$/, 'light-gauss-rifle'],
  [/^(?:is)?heavygaussrifle$/, 'heavy-gauss-rifle'],
  [/^cl-?gaussrifle$/, 'clan-gauss-rifle'],

  // Machine gun variants
  [/^(?:is|cl)?machinegun$/, 'machine-gun'],
  [/^cl-?machinegun$/, 'clan-machine-gun'],

  // Flamer variants
  [/^(?:is)?flamer$/, 'flamer'],
  [/^cl-?flamer$/, 'clan-flamer'],

  // Clan LRM/SRM (separate catalog IDs)
  [/^cl-?lrm(\d+)$/, 'clan-lrm-$1'],
  [/^cl-?srm(\d+)$/, 'clan-srm-$1'],

  // Clan UAC (separate catalog IDs)
  [/^cl-?uac(\d+)$/, 'clan-uac-$1'],
  [/^cl-?ultraac(\d+)$/, 'clan-uac-$1'],

  // Clan LB-X (separate catalog IDs)
  [/^cl-?lbxac(\d+)$/, 'clan-lb-$1-x-ac'],
  [/^cl-?lb(\d+)xac$/, 'clan-lb-$1-x-ac'],

  // Generic AC pattern (without prefix)
  [/^ac(\d+)$/, 'ac-$1'],
  [/^lrm(\d+)$/, 'lrm-$1'],
  [/^srm(\d+)$/, 'srm-$1'],
];

/**
 * Abbreviation aliases for common equipment names.
 */
const ABBREVIATION_MAP: Record<string, string> = {
  slas: 'small-laser',
  mlas: 'medium-laser',
  llas: 'large-laser',
  'er-slas': 'er-small-laser',
  'er-mlas': 'er-medium-laser',
  'er-llas': 'er-large-laser',
  spl: 'small-pulse-laser',
  mpl: 'medium-pulse-laser',
  lpl: 'large-pulse-laser',
};

/**
 * Direct alias map for unit JSON equipment IDs that don't match catalog IDs.
 * These are the most common mismatches found across 4,217 units.
 *
 * Format: unit-json-id → catalog-id
 */
const DIRECT_ALIAS_MAP: Record<string, string> = {
  // Ultra AC (unit JSON uses "ultra-ac-N", catalog uses "uac-N")
  'ultra-ac-2': 'uac-2',
  'ultra-ac-5': 'uac-5',
  'ultra-ac-10': 'uac-10',
  'ultra-ac-20': 'uac-20',
  'clan-ultra-ac-2': 'clan-uac-2',
  'clan-ultra-ac-5': 'clan-uac-5',
  'clan-ultra-ac-10': 'clan-uac-10',
  'clan-ultra-ac-20': 'clan-uac-20',

  // Rotary AC (unit JSON uses "rotary-ac-N", catalog uses "rac-N")
  'rotary-ac-2': 'rac-2',
  'rotary-ac-5': 'rac-5',
  'rotary-ac-10': 'rac-10',
  'clan-rotary-ac-2': 'clan-rac-2',
  'clan-rotary-ac-5': 'clan-rac-5',

  // HAG (unit JSON uses "hag-N", catalog uses "hagN")
  'hag-20': 'hag20',
  'hag-30': 'hag30',
  'hag-40': 'hag40',

  // Heavy lasers (unit JSON uses "heavy-X-laser", catalog uses "X-heavy-laser")
  'heavy-medium-laser': 'medium-heavy-laser',
  'heavy-large-laser': 'large-heavy-laser',
  'heavy-small-laser': 'small-heavy-laser',
  // Clan-prefixed heavy lasers (IS-only weapons used on mixed-tech units)
  'clan-heavy-medium-laser': 'medium-heavy-laser',
  'clan-heavy-large-laser': 'large-heavy-laser',
  'clan-heavy-small-laser': 'small-heavy-laser',

  // Improved heavy lasers now have their own catalog entries with correct BV

  // Autocannon (unit JSON uses "autocannon-N", catalog uses "ac-N")
  'autocannon-2': 'ac-2',
  'autocannon-5': 'ac-5',
  'autocannon-10': 'ac-10',
  'autocannon-20': 'ac-20',

  // Light AC (unit JSON uses "light-ac-N" or "light-auto-cannon-N", catalog uses "lac-N")
  'light-ac-2': 'lac-2',
  'light-ac-5': 'lac-5',
  'light-auto-cannon-2': 'lac-2',
  'light-auto-cannon-5': 'lac-5',

  // Rocket launchers (unit JSON uses "rocket-launcher-N", catalog uses "rlN")
  'rocket-launcher-1': 'rl1',
  'rocket-launcher-2': 'rl2',
  'rocket-launcher-3': 'rl3',
  'rocket-launcher-4': 'rl4',
  'rocket-launcher-5': 'rl-5',
  'rocket-launcher-10': 'rl10',
  'rocket-launcher-15': 'rl15',
  'rocket-launcher-20': 'rl20',

  // Streak LRM (unit JSON uses "streak-lrm-N", catalog uses "streaklrmN" or "clan-streak-lrm-N")
  'streak-lrm-1': 'streaklrm1',
  'streak-lrm-2': 'streaklrm2',
  'streak-lrm-3': 'streaklrm3',
  'streak-lrm-4': 'streaklrm4',
  'streak-lrm-5': 'streaklrm5',
  'streak-lrm-6': 'streaklrm6',
  'streak-lrm-7': 'streaklrm7',
  'streak-lrm-8': 'streaklrm8',
  'streak-lrm-9': 'streaklrm9',
  'streak-lrm-10': 'streaklrm10',
  'streak-lrm-11': 'streaklrm11',
  'streak-lrm-12': 'streaklrm12',
  'streak-lrm-13': 'streaklrm13',
  'streak-lrm-14': 'streaklrm14',
  'streak-lrm-15': 'streaklrm15',
  'streak-lrm-16': 'streaklrm16',
  'streak-lrm-17': 'streaklrm17',
  'streak-lrm-18': 'streaklrm18',
  'streak-lrm-19': 'streaklrm19',
  'streak-lrm-20': 'streaklrm20',

  // Anti-Missile System (unit JSON uses "anti-missile-system", catalog uses "ams")
  'anti-missile-system': 'ams',
  'clan-anti-missile-system': 'clan-ams',

  // Machine gun arrays (unit JSON uses "machine-gun-array", catalog uses "mga")
  'machine-gun-array': 'mga',
  'light-machine-gun-array': 'lmga',
  'heavy-machine-gun-array': 'hmga',
  'clan-machine-gun-array': 'mga',
  'clan-light-machine-gun-array': 'lmga',
  'clan-heavy-machine-gun-array': 'hmga',

  // Arrow IV (unit JSON uses "arrow-iv", catalog uses "arrow-iv-launcher")
  'arrow-iv': 'arrow-iv-launcher',
  'clan-arrow-iv': 'clan-arrow-iv-launcher',

  // Snub-nose PPC variants
  snppc: 'snub-nose-ppc',
  'sn-ppc': 'snub-nose-ppc',

  // ER Micro Laser (unit JSON uses "er-micro-laser", catalog uses "clan-er-micro-laser")
  'er-micro-laser': 'clan-er-micro-laser',

  // Micro Pulse Laser (unit JSON uses "micro-pulse-laser", catalog uses "clan-micro-pulse-laser")
  'micro-pulse-laser': 'clan-micro-pulse-laser',

  // ER Flamer (not in catalog as weapon — map to flamer)
  'er-flamer': 'flamer',
  'clan-er-flamer': 'clan-flamer',

  // C3 variants
  'c3-master-with-tag': 'c3-master',
  'c3-computer-master': 'c3-master',
  'c3-computer-slave': 'c3-slave',
  'improved-c3-computer': 'c3i',

  // X-Pulse lasers (IS-only, in catalog)
  'small-x-pulse-laser': 'small-x-pulse-laser',
  'medium-x-pulse-laser': 'medium-x-pulse-laser',
  'large-x-pulse-laser': 'large-x-pulse-laser',
  'issmallxpulselaser': 'small-x-pulse-laser',
  'ismediumxpulselaser': 'medium-x-pulse-laser',
  'islargexpulselaser': 'large-x-pulse-laser',

  // ER pulse lasers (Clan-exclusive, in catalog as clan-er-*-pulse-laser)
  'er-small-pulse-laser': 'clan-er-small-pulse-laser',
  'er-medium-pulse-laser': 'clan-er-medium-pulse-laser',
  'er-large-pulse-laser': 'clan-er-large-pulse-laser',

  // Chemical lasers (Clan-exclusive, appears without clan- prefix)
  'small-chem-laser': 'clan-small-chemical-laser',
  'medium-chem-laser': 'clan-medium-chemical-laser',
  'large-chem-laser': 'clan-large-chemical-laser',

  // Particle Cannon (alternate name for PPC)
  'particle-cannon': 'ppc',

  // Enhanced ER PPC
  'enhanced-ppc': 'enhanced-er-ppc',
  'enhanced-er-ppc': 'enhanced-er-ppc',

  // Binary Laser / Blazer Cannon aliases
  'binary-laser-blazer-cannon': 'blazer-cannon',
  'binary-laser-cannon': 'blazer-cannon',

  // VSP lasers (Variable Speed Pulse, in catalog)
  'small-vsp-laser': 'small-vsp-laser',
  'medium-vsp-laser': 'medium-vsp-laser',
  'large-vsp-laser': 'large-vsp-laser',
  'small-vsp': 'small-vsp-laser',
  'medium-vsp': 'medium-vsp-laser',
  'large-vsp': 'large-vsp-laser',
  'issmallvsplaser': 'small-vsp-laser',
  'ismediumvsplaser': 'medium-vsp-laser',
  'islargevsplaser': 'large-vsp-laser',

  // RE-Engineered lasers (not in catalog — map to standard equivalents)
  'medium-re-engineered-laser': 'medium-laser',
  'large-re-engineered-laser': 'large-laser',
  'small-re-engineered-laser': 'small-laser',

  // I-OS variants — map to BASE weapon (validate-bv.ts applies ÷5 BV penalty)
  'srm-2-i-os': 'srm-2',
  'srm-4-i-os': 'srm-4',
  'srm-6-i-os': 'srm-6',
  'lrm-5-i-os': 'lrm-5',
  'lrm-10-i-os': 'lrm-10',
  'lrm-15-i-os': 'lrm-15',
  'lrm-20-i-os': 'lrm-20',

  // Heavy PPC
  'heavy-ppc': 'heavy-ppc',

  // Light PPC
  'light-ppc': 'light-ppc',

  // Hyper-velocity AC
  'hyper-velocity-ac-2': 'hyper-velocity-auto-cannon-2',
  'hyper-velocity-ac-5': 'hyper-velocity-auto-cannon-5',
  'hyper-velocity-ac-10': 'hyper-velocity-auto-cannon-10',
  'hvac-2': 'hyper-velocity-auto-cannon-2',
  'hvac-5': 'hyper-velocity-auto-cannon-5',
  'hvac-10': 'hyper-velocity-auto-cannon-10',

  // Truncated MegaMek internal IDs (from numeric-prefixed unit equipment)
  isguardianecm: 'guardian-ecm',
  isimprovedc3cpu: 'c3i',
  isantimissilesystem: 'ams',
  issnppc: 'snub-nose-ppc',
  clheavymediumlaser: 'medium-heavy-laser',
  'ismachine-gun': 'machine-gun',
  isrotaryac5: 'rac-5',
  isrotaryac2: 'rac-2',
  clheavylargelaser: 'large-heavy-laser',

  // ProtoMech AC (unit JSON uses "protomech-ac-N", catalog uses "protomechacN")
  'protomech-ac-2': 'protomechac2',
  'protomech-ac-4': 'protomechac4',
  'protomech-ac-8': 'protomechac8',

  // Improved heavy gauss (unit JSON uses hyphenated, catalog uses concatenated)
  'improved-heavy-gauss-rifle': 'improvedheavygaussrifle',

  // TAG variants
  'tag-clan': 'clan-tag',
  'light-tag-[clan]': 'clan-light-tag',

  // LRT/SRT torpedoes (map to LRM/SRM equivalents for BV)
  'lrt-5': 'lrm-5',
  'lrt-10': 'lrm-10',
  'lrt-15': 'lrm-15',
  'lrt-20': 'lrm-20',
  'srt-2': 'srm-2',
  'srt-4': 'srm-4',
  'srt-6': 'srm-6',
  // Clan torpedo variants (map to Clan LRM/SRM for correct BV)
  'clan-lrt-5': 'clan-lrm-5',
  'clan-lrt-10': 'clan-lrm-10',
  'clan-lrt-15': 'clan-lrm-15',
  'clan-lrt-20': 'clan-lrm-20',
  'clan-srt-2': 'clan-srm-2',
  'clan-srt-4': 'clan-srm-4',
  'clan-srt-6': 'clan-srm-6',

  // Anti-BA pods
  'anti-battlearmor-pods-b-pods': 'b-pod',
  isbpod: 'b-pod',
  clbpod: 'b-pod',

  // C3 boosted with TAG
  'c3-master-boosted-with-tag': 'c3-boosted-master',

  // MegaMek internal IDs (numeric-prefixed, stripped to these forms)
  islaserantimissilesystem: 'laser-ams',
  cllaserantimissilesystem: 'clan-laser-ams',
  isplasmarifle: 'plasma-rifle',
  islppc: 'light-ppc',
  isblazer: 'blazer-cannon',
  iseherppc: 'er-ppc', // Enhanced ER PPC → ER PPC for BV purposes
  clplasmacannon: 'clan-plasma-cannon',
  clheavysmalllaser: 'small-heavy-laser',
  clmicropulselaser: 'clan-micro-pulse-laser',
  ismg: 'machine-gun',
  clmg: 'clan-machine-gun',
  islightmg: 'light-machine-gun',
  issrm4os: 'srm-4',
  isangelecm: 'angel-ecm',
  clangelecmsuite: 'angel-ecm',
  angelecmsuite: 'angel-ecm',
  novacews: 'watchdog-cews',         // Nova CEWS: defBV=68 (same as Watchdog CEWS per Sarna/MegaMek)
  watchdogecmsuite: 'watchdog-cews',
  clantimissilesystem: 'clan-ams',
  clactiveprobe: 'clan-active-probe',
  cllightactiveprobe: 'light-active-probe',
  clerflamer: 'clan-flamer',
  iserflamer: 'flamer',
  isc3mastercomputer: 'c3-master',
  isc3slaveunit: 'c3-slave',
  issniperartcannon: 'sniper-cannon',
  sniper: 'sniper-cannon',                // Unit JSON uses "sniper" for Sniper Cannon (BV=85)
  isarrowivsystem: 'arrow-iv-launcher',    // MegaMek ISArrowIVSystem (BV=240)
  clarrowivsystem: 'clan-arrow-iv-launcher',
  isfluidgun: 'fluid-gun',
  ismediumpulselaserprototype: 'medium-pulse-laser',
  islbxac10prototype: 'lb-10-x-ac',
  clrocketlauncher15prototype: 'rocket-launcher-15',

  // One-shot (OS) variants — map to BASE weapon (validate-bv.ts applies ÷5 BV penalty)
  'streak-srm-2-os': 'streak-srm-2',
  'streak-srm-4-os': 'streak-srm-4',
  'streak-srm-2-i-os': 'streak-srm-2',
  'streak-srm-4-i-os': 'streak-srm-4',
  'srm-2-os': 'srm-2',
  'srm-6-os': 'srm-6',
  'narc-i-os': 'narc',

  // Primitive weapons — map to production equivalents for BV (same BV per MegaMek)
  'primitive-prototype-ppc': 'ppc',
  ppcp: 'ppc',

  // Rifle Cannon (experimental ballistic weapon)
  'rifle-cannon': 'rifle-cannon-heavy',  // Phoenix PX-1KR uses Heavy Rifle Cannon

  // TSEMP (one-shot variant maps to base cannon; IOS penalty applied in validate-bv.ts)
  'tsemp-one-shot': 'tsemp-cannon',

  // Electronic Warfare (EW) Equipment (defensive BV=39)
  iselectronicwarfareequipment: 'electronic-warfare-ew-equipment',

  // Prototype weapons — map to production equivalents for BV
  'prototype-er-medium-laser': 'er-medium-laser',
  'prototype-er-small-laser': 'er-small-laser',
  'er-large-laser-prototype': 'er-large-laser',
  'prototype-streak-srm-4': 'streak-srm-4',
  'prototype-streak-srm-6': 'streak-srm-6',
  'prototype-ultra-autocannon-10': 'uac-10',
  'prototype-lb-10-x-autocannon': 'lb-10-x-ac',
  'prototype-rocket-launcher-20': 'rocket-launcher-20',
  'rocket-launcher-10-pp': 'rocket-launcher-10',
  'ac-10p': 'ac-10',

  // C3 variants
  'c3-boosted-system-master': 'c3-boosted-master',
  'c3-computer-[master]': 'c3-master',
  'c3-remote-sensor-launcher': 'c3-master',
  isc3remotesensorlauncher: 'c3-master',

  // Plasma Cannon (Clan-exclusive, appears without clan- prefix)
  'plasma-cannon': 'clan-plasma-cannon',

  // Silver Bullet Gauss (unit JSON uses "silver-bullet-gauss-rifle", catalog uses "sbgr")
  'silver-bullet-gauss-rifle': 'sbgr',

  // Taser (unit JSON uses "taser", catalog uses "battlemech-taser")
  'taser': 'battlemech-taser',
  'mech-taser': 'battlemech-taser',
  'ismektaser': 'battlemech-taser',

  // Vehicle flamer
  'flamer-vehicle': 'flamer',
};

/**
 * Normalize an equipment ID to its canonical catalog form.
 *
 * Resolution order:
 * 1. Direct catalog lookup (already canonical)
 * 2. Strip numeric suffix (e.g., "medium-laser-1" → "medium-laser")
 * 3. Name mappings (MegaMek names → canonical IDs)
 * 4. Abbreviation map
 * 5. Regex normalization patterns
 * 6. Strip IS/Clan prefix and retry
 */
export function normalizeEquipmentId(equipmentId: string): string {
  const catalog = loadEquipmentCatalog();
  const lower = equipmentId.toLowerCase().trim();

  if (catalog.has(lower)) return lower;

  // Strip numeric instance prefix (e.g., "1-ismrm40" → "ismrm40") and suffix ("medium-laser-1" → "medium-laser")
  const stripped = lower.replace(/^\d+-/, '').replace(/-\d+$/, '');
  if (catalog.has(stripped)) return stripped;

  // Direct alias map (highest priority after direct/stripped lookup)
  if (DIRECT_ALIAS_MAP[stripped]) {
    const alias = DIRECT_ALIAS_MAP[stripped];
    if (catalog.has(alias)) return alias;
  }
  if (DIRECT_ALIAS_MAP[lower]) {
    const alias = DIRECT_ALIAS_MAP[lower];
    if (catalog.has(alias)) return alias;
  }

  // Name mappings (MegaMek style names like "ISMediumLaser" → canonical ID)
  const nameMappings = loadNameMappings();
  if (nameMappings[equipmentId]) {
    const mapped = nameMappings[equipmentId];
    if (catalog.has(mapped)) return mapped;
  }

  // Build a lowercase name-mappings index for case-insensitive lookup
  const lowerMappings = getOrBuildLowerMappings(nameMappings);
  const mappedFromLower =
    lowerMappings.get(stripped) ?? lowerMappings.get(lower);
  if (mappedFromLower && catalog.has(mappedFromLower)) return mappedFromLower;

  if (ABBREVIATION_MAP[stripped]) {
    const abbrev = ABBREVIATION_MAP[stripped];
    if (catalog.has(abbrev)) return abbrev;
  }

  const noSpaces = stripped.replace(/\s+/g, '');
  if (catalog.has(noSpaces)) return noSpaces;

  // Hyphenate between alpha and numeric (e.g., "ac20" → "ac-20")
  const hyphenated = noSpaces.replace(/([a-z])(\d)/g, '$1-$2');
  if (catalog.has(hyphenated)) return hyphenated;

  // Regex normalization patterns
  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    if (noSpaces.match(pattern)) {
      const result = noSpaces.replace(pattern, replacement);
      if (catalog.has(result)) return result;
    }
  }

  // Strip IS/Clan prefix and try bare form
  const withoutPrefix = noSpaces.replace(/^(is|cl)-?/, '');
  if (catalog.has(withoutPrefix)) return withoutPrefix;

  const withoutPrefixHyphenated = withoutPrefix.replace(
    /([a-z])(\d)/g,
    '$1-$2',
  );
  if (catalog.has(withoutPrefixHyphenated)) return withoutPrefixHyphenated;

  // Try adding "clan-" prefix for Clan equipment
  if (noSpaces.startsWith('cl')) {
    const clanId = 'clan-' + withoutPrefix;
    if (catalog.has(clanId)) return clanId;
    const clanIdHyphenated = 'clan-' + withoutPrefixHyphenated;
    if (catalog.has(clanIdHyphenated)) return clanIdHyphenated;
  }

  // Run regex patterns against the prefix-stripped form
  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    if (withoutPrefix.match(pattern)) {
      const result = withoutPrefix.replace(pattern, replacement);
      if (catalog.has(result)) return result;
    }
  }

  // Name-mappings lookup on stripped form (catches "1-ISMediumLaser" → strip to "ISMediumLaser")
  const strippedOriginal = equipmentId
    .replace(/^\d+-/, '')
    .replace(/-\d+$/, '');
  if (strippedOriginal !== equipmentId) {
    if (nameMappings[strippedOriginal]) {
      const mapped = nameMappings[strippedOriginal];
      if (catalog.has(mapped)) return mapped;
    }
    const mappedStripped = lowerMappings.get(strippedOriginal.toLowerCase());
    if (mappedStripped && catalog.has(mappedStripped)) return mappedStripped;
  }

  return stripped || lower;
}

let lowerMappingsCache: Map<string, string> | null = null;
function getOrBuildLowerMappings(
  nameMappings: Record<string, string>,
): Map<string, string> {
  if (lowerMappingsCache) return lowerMappingsCache;
  lowerMappingsCache = new Map();
  for (const [key, value] of Object.entries(nameMappings)) {
    lowerMappingsCache.set(key.toLowerCase(), value);
  }
  return lowerMappingsCache;
}

// ============================================================================
// BV-CONTEXT HEAT OVERRIDES
// ============================================================================

/**
 * Apply BV-context heat overrides based on weapon subType.
 *
 * In BV 2.0 calculations, certain weapon types use modified heat values:
 * - Ultra AC: base heat × 2 (fires twice per turn for BV purposes)
 * - Rotary AC: base heat × 6 (fires 6 times for BV purposes)
 * - Streak SRM: base heat × 0.5 (guaranteed hit means less waste)
 *
 * These are NOT stat-card heat values — they are BV calculation-specific.
 */
function applyBVHeatOverride(
  baseHeat: number,
  entry: EquipmentCatalogEntry,
): number {
  const subType = (entry.subType ?? '').toLowerCase();
  const name = entry.name.toLowerCase();

  if (subType.includes('ultra ac') || subType === 'ultra ac') {
    return baseHeat * 2;
  }

  if (subType.includes('rotary ac') || subType === 'rotary ac') {
    return baseHeat * 6;
  }

  if (subType.includes('streak srm') || subType === 'streak srm') {
    // Streak SRM heat is halved for BV purposes (only fires on lock)
    return baseHeat * 0.5;
  }

  // Also check name for cases where subType might not be set
  if (name.includes('ultra ac') || name.includes('ultra ac/')) {
    return baseHeat * 2;
  }
  if (name.includes('rotary ac') || name.includes('rotary ac/')) {
    return baseHeat * 6;
  }
  if (name.includes('streak srm')) {
    return baseHeat * 0.5;
  }

  // Streak LRM: half heat for BV (MegaMek: LRM_STREAK → weaponHeat *= 0.5)
  if (name.includes('streak lrm')) {
    return baseHeat * 0.5;
  }

  // iATM (Improved ATM): half heat for BV (MegaMek: IATM → weaponHeat *= 0.5)
  if (name.includes('improved atm') || name.includes('iatm')) {
    return baseHeat * 0.5;
  }

  return baseHeat;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Resolve an equipment ID to its BV and heat values from the equipment catalog.
 *
 * Resolution process:
 * 1. Normalize the equipment ID (strip prefixes, apply patterns, lookup name-mappings)
 * 2. Find the canonical entry in the equipment catalog
 * 3. Apply BV-context heat overrides for Ultra AC, Rotary AC, Streak SRM
 * 4. Return { battleValue, heat, resolved }
 *
 * For unresolvable IDs: returns { battleValue: 0, heat: 0, resolved: false }
 * and logs a warning (once per unique ID per session).
 *
 * @param equipmentId - Equipment ID as found in unit JSON files
 * @returns BV resolution result
 */
export function resolveEquipmentBV(equipmentId: string): EquipmentBVResult {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  const entry = catalog.get(normalizedId);

  if (!entry) {
    // Log unresolvable ID once per session
    if (!loggedUnresolvable.has(equipmentId)) {
      loggedUnresolvable.add(equipmentId);
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'test') {
        console.warn(
          `[equipmentBVResolver] Unresolvable equipment ID: "${equipmentId}" (normalized: "${normalizedId}")`,
        );
      }
    }
    return { battleValue: 0, heat: 0, resolved: false };
  }

  const baseHeat = typeof entry.heat === 'number' ? entry.heat : 0;
  const bvHeat = applyBVHeatOverride(baseHeat, entry);

  return {
    battleValue: entry.battleValue ?? 0,
    heat: bvHeat,
    resolved: true,
  };
}

/**
 * Get the raw catalog entry for an equipment ID (no BV-context heat override).
 * Useful for non-BV lookups (e.g., display, stat cards).
 */
export function getEquipmentEntry(
  equipmentId: string,
): EquipmentCatalogEntry | undefined {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  return catalog.get(normalizedId);
}

/**
 * Check if an equipment ID can be resolved to a catalog entry.
 */
export function isResolvable(equipmentId: string): boolean {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(equipmentId);
  return catalog.has(normalizedId);
}

export interface AmmoBVResult {
  battleValue: number;
  weaponType: string;
  resolved: boolean;
}

/**
 * Resolve an ammo ID/name to its BV and associated weapon type.
 * Uses the ammunition catalog and name-mappings for resolution.
 */
export function resolveAmmoBV(ammoId: string): AmmoBVResult {
  const catalog = loadEquipmentCatalog();
  const normalizedId = normalizeEquipmentId(ammoId);
  const entry = catalog.get(normalizedId);

  if (!entry) {
    return { battleValue: 0, weaponType: '', resolved: false };
  }

  return {
    battleValue: entry.battleValue ?? 0,
    weaponType: normalizedId.replace(/-ammo$/, '').replace(/^ammo-/, ''),
    resolved: true,
  };
}

/**
 * Get the total number of items in the equipment catalog.
 */
export function getCatalogSize(): number {
  return loadEquipmentCatalog().size;
}

/**
 * Reset the catalog cache (useful for testing).
 */
export function resetCatalogCache(): void {
  catalogCache = null;
  nameMappingsCache = null;
  lowerMappingsCache = null;
  loggedUnresolvable.clear();
}

/**
 * Initialize the catalog with pre-loaded data (useful for browser/test contexts
 * where filesystem access may not be available).
 */
export function initializeCatalog(
  entries: EquipmentCatalogEntry[],
  nameMappings?: Record<string, string>,
): void {
  catalogCache = new Map();
  for (const entry of entries) {
    catalogCache.set(entry.id, entry);
  }
  if (nameMappings) {
    nameMappingsCache = nameMappings;
  }
}
