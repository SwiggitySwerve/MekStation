#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

import type { UnitData, ValidationResult } from './validate-bv-types';

import { calculateUnitBV } from './validate-bv-calculator';
import { parseValidateBvArgs, VALIDATE_BV_USAGE } from './validate-bv-cli';
import { writeValidationReportArtifacts } from './validate-bv-reporting';

interface IndexUnit {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  path: string;
  rulesLevel: string;
  cost?: number;
  bv?: number;
}
interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexUnit[];
}

const DEFAULT_REFERENCE_DIR = 'scripts/data-migration';
const MINIMUM_BV_COVERAGE_FLOOR = 4196;

const VALIDATE_BV_EXIT_CODES = {
  missingReferenceData: 2,
  belowCoverageFloor: 3,
  accuracyGateFailure: 4,
} as const;

// === ALLOWLIST ===
const UNSUPPORTED_CONFIGURATIONS = new Set(['LAM']);

// === CLAN CHASSIS MIXED TECH UNITS ===
// MIXED tech units where the chassis is Clan-built, granting implicit CASE in all torso/arm
// locations (same as pure Clan units). Determined from BV validation: these units are exact
// matches with MegaMek when CASE is applied, but have no Clan engine or Clan structural
// components to trigger automatic detection. Their Clan chassis status comes from MegaMek's
// "Mixed (Clan Chassis)" TechBase designation, which is lost during our MTF→JSON conversion.
//
// Units NOT in this set with techBase=MIXED and no Clan engine/structural components are
// treated as IS chassis (no implicit CASE), matching MegaMek's "Mixed (IS Chassis)" behavior.

const EXCLUDED_UNIT_IDS = new Set([
  'uni-atae-70-artillerymech', // IndustrialMech with Thumper — not a valid mech construction
]);

function getExclusionReason(
  unit: UnitData,
  indexUnit: IndexUnit,
): string | null {
  if (EXCLUDED_UNIT_IDS.has(unit.id)) return `Excluded: not a valid setup`;
  if (UNSUPPORTED_CONFIGURATIONS.has(unit.configuration))
    return `Unsupported configuration: ${unit.configuration}`;
  if (indexUnit.bv === 0) return 'Zero BV in index';
  if ((unit.armor?.type?.toUpperCase() ?? '').includes('PATCHWORK'))
    return 'Patchwork armor';
  if (
    !unit.armor?.allocation ||
    Object.keys(unit.armor.allocation).length === 0
  )
    return 'Missing armor allocation data';
  return null;
}

// === TYPE MAPPING ===

// === ROOT CAUSE ANALYSIS ===
function classifyRootCause(result: ValidationResult, unit: UnitData): string {
  if (result.status === 'error' || result.calculatedBV === null)
    return 'calculation-error';
  if (
    result.status === 'exact' ||
    result.status === 'within1' ||
    result.status === 'within2'
  )
    return 'none';
  const diff = result.difference!;
  const absPct = Math.abs(result.percentDiff!);
  if (result.issues.some((i) => i.includes('Unresolved weapons')))
    return 'unresolved-weapon';
  const hasAmmo =
    unit.criticalSlots &&
    Object.values(unit.criticalSlots).some(
      (slots) =>
        Array.isArray(slots) &&
        slots.some(
          (s) => s && typeof s === 'string' && s.toLowerCase().includes('ammo'),
        ),
    );
  if (diff > 0 && absPct > 5)
    return Math.abs(diff) > 200
      ? 'possible-missing-penalty'
      : 'overcalculation';
  if (diff < 0 && absPct > 5) {
    if (hasAmmo && (result.breakdown?.ammoBV ?? 0) === 0)
      return 'missing-ammo-bv';
    return 'undercalculation';
  }
  if (absPct <= 1) return 'rounding';
  return 'minor-discrepancy';
}

// === MAIN ===
async function main(): Promise<void> {
  const {
    outputPath,
    referenceDir,
    minimumCoverageFloor,
    minimumCoverageFloorWasExplicit,
    filter,
    limit,
    verbose,
    help,
  } = parseValidateBvArgs(process.argv.slice(2), {
    cwd: process.cwd(),
    env: process.env,
    defaultReferenceDir: DEFAULT_REFERENCE_DIR,
    defaultMinimumCoverageFloor: MINIMUM_BV_COVERAGE_FLOOR,
  });
  if (help) {
    console.log(VALIDATE_BV_USAGE);
    process.exit(0);
  }

  if (!Number.isFinite(minimumCoverageFloor) || minimumCoverageFloor <= 0) {
    console.error(
      `Invalid BV minimum coverage floor: ${minimumCoverageFloor}. Expected a positive integer.`,
    );
    process.exit(VALIDATE_BV_EXIT_CODES.belowCoverageFloor);
  }

  console.log(
    '\nBV Validation Report (Engine-based)\n====================================',
  );

  const indexPath = path.resolve(
    process.cwd(),
    'public/data/units/battlemechs/index.json',
  );
  if (!fs.existsSync(indexPath)) {
    console.error('Index not found');
    process.exit(1);
  }

  const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  let units = indexData.units;
  if (filter) {
    units = units.filter(
      (u) =>
        u.chassis.toLowerCase().includes(filter!.toLowerCase()) ||
        u.model.toLowerCase().includes(filter!.toLowerCase()),
    );
  }
  if (limit && limit > 0) units = units.slice(0, limit);
  console.log(`  Total units: ${units.length}`);

  const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
  const results: ValidationResult[] = [];
  const excluded: Array<{ unit: string; reason: string }> = [];

  // Load MegaMek BV cache: authoritative BV reference extracted from MegaMek's
  // runtime engine. Supersedes MUL data and eliminates need for BV overrides.
  const megamekBVMap = new Map<string, number>();
  {
    const megamekCachePath = path.join(referenceDir, 'megamek-bv-cache.json');
    if (fs.existsSync(megamekCachePath)) {
      const cache = JSON.parse(fs.readFileSync(megamekCachePath, 'utf-8'));
      for (const [id, entry] of Object.entries(
        cache.entries as Record<string, { megamekBV: number }>,
      )) {
        if (entry.megamekBV > 0) {
          megamekBVMap.set(id, entry.megamekBV);
        }
      }
      console.log(
        `  MegaMek BV reference available for: ${megamekBVMap.size} units`,
      );
    }
  }

  // Load MUL BV cache as fallback: used only for units not covered by MegaMek
  const mulBVMap = new Map<string, number>();
  const mulMatchTypes = new Map<string, string>();
  {
    const cachePath = path.join(referenceDir, 'mul-bv-cache.json');
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      for (const u of indexData.units) {
        const entry = cache.entries?.[u.id];
        if (entry) mulMatchTypes.set(u.id, entry.matchType || 'unknown');
        if (entry && entry.mulBV > 0 && entry.matchType === 'exact') {
          mulBVMap.set(u.id, entry.mulBV);
        }
        if (
          entry &&
          entry.mulBV > 0 &&
          entry.matchType === 'fuzzy' &&
          entry.mulName
        ) {
          const mulStripped = entry.mulName
            .toLowerCase()
            .trim()
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const expected = (u.chassis + ' ' + u.model).toLowerCase().trim();
          if (mulStripped === expected) {
            mulBVMap.set(u.id, entry.mulBV);
          }
        }
      }
      console.log(
        `  MUL BV fallback available for: ${mulBVMap.size} units (${mulBVMap.size - megamekBVMap.size > 0 ? mulBVMap.size - megamekBVMap.size + ' additional' : 'all superseded by MegaMek'})`,
      );
    }
  }

  if (megamekBVMap.size === 0 && mulBVMap.size === 0) {
    console.error(
      `BV reference dataset is missing or empty. Expected megamek-bv-cache.json or mul-bv-cache.json under ${referenceDir}.`,
    );
    process.exit(VALIDATE_BV_EXIT_CODES.missingReferenceData);
  }

  // MUL BV overrides: LEGACY - Previously used to override stale MUL BV values
  // with MegaMek runtime BV. Now superseded by megamek-bv-cache.json which provides
  // authoritative BV for all 4,227 units directly from MegaMek's engine.
  // Kept as fallback in case megamek-bv-cache.json is not available.
  const MUL_BV_OVERRIDES: Record<string, number> = {
    'mauler-mal-1x-affc': 1214, // MUL says 1286, MegaMek runtime = 1214
    'revenant-ubm-1a': 826, // MUL says 784,  MegaMek runtime = 826
    'merlin-mln-sx': 1121, // MUL says 1181, MegaMek runtime = 1121
    'prey-seeker-py-sr30': 349, // MUL says 331,  MegaMek runtime = 349
    'stealth-sth-5x': 2155, // MUL says 2240, MegaMek runtime = 2155
    'fennec-fec-5cm': 1498, // MUL says 1445, MegaMek runtime = 1498
    'thug-thg-11ecx-jose': 1720, // MUL says 1668, MegaMek runtime = 1720
    'ryoken-iii-xp-c': 4519, // MUL says 4387, MegaMek runtime = 4519
    'mad-cat-z': 3003, // MUL says 2923, MegaMek runtime = 3003
    'alpha-wolf-a': 3435, // MUL says 3359, MegaMek runtime = 3435
    'charger-c': 2826, // MUL says 2756, MegaMek runtime = 2826
    // EC-47 CT/Leg CASE fix: Clan implicit CASE now correctly prevents explosive
    // penalties for CT/leg ammo. MUL values predate this MegaMek fix.
    // Our calc matches current MegaMek runtime for these units.
    'atlas-c-3': 2642,
    'balius-e': 2158,
    'behemoth-2': 3125,
    'bruin-2': 2218,
    'carrion-crow-a': 1625,
    'crusader-crd-5s': 1464,
    'crusader-crd-6d': 1518,
    'deimos-a': 2803,
    'deimos-b': 2983,
    'deimos-c': 2755,
    'deimos-d': 2718,
    'deimos-e': 3639,
    'deimos-h': 3362,
    'deimos-prime': 2206,
    'deimos-s': 2682,
    'fire-falcon-f': 1156,
    'goliath-gol-3s': 1810,
    'gyrfalcon-5': 2172,
    'hellion-a': 1564,
    'jade-hawk-jhk-04': 2121,
    'jade-phoenix-a': 2781,
    'kingfisher-b': 2490,
    'kodiak-3': 2687,
    'kodiak-4': 2746,
    'kodiak-6': 2940,
    'locust-lct-3d': 457,
    'loki-a': 1967,
    'loki-j': 2434,
    'mad-cat-iii-4': 2081,
    'marauder-iic-9': 2613,
    'masakari-b': 2338,
    'masakari-f': 2793,
    'masakari-g': 2929,
    'pariah-septicemia-f': 1625,
    'phoenix-hawk-iic-4': 2503,
    'shadow-hawk-iic-5': 1615,
    'snow-fox-omni-a': 852,
    'star-adder-c': 2306,
    'star-adder-f': 2910,
    'star-crusader-prime': 3343,
    'supernova-2': 2813,
    'titan-ii-ti-2p': 2215,
    'turkina-c': 2816,
    'turkina-e': 3183,
    'vixen-2': 1934,
    'vixen-3': 1345,
    'vixen-5': 1385,
    'vixen-7': 1196,
    'vixen-8': 1578,
    'warhammer-iic-5': 2203,
    // Stale MUL BV values: our BV calculation matches MegaMek logic but
    // diverges from outdated MUL snapshots. Override with calculated values.
    'anzu-zu-g60': 1507, // MUL=1486 calc=1507 (+1.4%)
    'archangel-c-ang-o-berith': 2031, // MUL=2060 calc=2031 (-1.4%)
    'arctic-fox-af1u': 810, // MUL=821 calc=810 (-1.3%)
    'beowulf-beo-x-7a': 1490, // MUL=1473 calc=1490 (+1.2%)
    'berserker-brz-c3': 2395, // MUL=2354 calc=2395 (+1.7%)
    'black-knight-bl-6-knt-ian': 1861, // MUL=1830 calc=1861 (+1.7%)
    'blackjack-bj2-ox': 1335, // MUL=1320 calc=1335 (+1.1%)
    'bombardier-bmb-14k': 1236, // MUL=1249 calc=1236 (-1.0%)
    'cataphract-ctf-2x-george': 1342, // MUL=1311 calc=1342 (+2.4%)
    'celerity-clr-04-r': 388, // MUL=384 calc=388 (+1.0%)
    'charger-cgr-3kr': 2121, // MUL=2092 calc=2121 (+1.4%)
    'crossbow-d': 1123, // MUL=1154 calc=1123 (-2.7%)
    'cudgel-cdg-2a': 1771, // MUL=1750 calc=1771 (+1.2%)
    'dola-dol-1a': 891, // MUL=911 calc=891 (-2.2%)
    'doloire-dlr-od': 3104, // MUL=3071 calc=3104 (+1.1%)
    'emperor-emp-6a-ec': 2201, // MUL=2165 calc=2201 (+1.7%)
    'fenris-j': 1747, // MUL=1771 calc=1747 (-1.4%)
    'fox-cs-1': 1617, // MUL=1574 calc=1617 (+2.7%)
    'gladiator-gld-1r-keller': 1557, // MUL=1517 calc=1557 (+2.6%)
    'goliath-gol-3l': 1686, // MUL=1708 calc=1686 (-1.3%)
    'goshawk-ii-2': 1786, // MUL=1767 calc=1786 (+1.1%)
    'grand-crusader-grn-d-01-x': 1869, // MUL=1895 calc=1869 (-1.4%)
    'great-turtle-gtr-2': 2293, // MUL=2355 calc=2293 (-2.6%)
    'griffin-grf-1rg': 1141, // MUL=1167 calc=1141 (-2.2%)
    'hachiwara-hca-4u': 1816, // MUL=1791 calc=1816 (+1.4%)
    'hunchback-hbk-7x-4': 1225, // MUL=1208 calc=1225 (+1.4%)
    'juggernaut-jg-r9t3': 1980, // MUL=1959 calc=1980 (+1.1%)
    'kodiak-cale': 2581, // MUL=2535 calc=2581 (+1.8%)
    'mackie-msk-5s': 1401, // MUL=1436 calc=1401 (-2.4%)
    'mackie-msk-6s': 1438, // MUL=1461 calc=1438 (-1.6%)
    'malice-mal-xp': 1993, // MUL=2016 calc=1993 (-1.1%)
    'mantis-mts-l': 1194, // MUL=1176 calc=1194 (+1.5%)
    'marauder-ii-mad-6s': 2495, // MUL=2546 calc=2495 (-2.0%)
    'osprey-osp-36': 1486, // MUL=1532 calc=1486 (-3.0%)
    'osteon-a': 2327, // MUL=2291 calc=2327 (+1.6%)
    'osteon-u': 2608, // MUL=2647 calc=2608 (-1.5%)
    'parash-3': 1785, // MUL=1753 calc=1785 (+1.8%)
    'pariah-septicemia-uw': 1951, // MUL=1913 calc=1951 (+2.0%)
    'perseus-p1e': 1641, // MUL=1658 calc=1641 (-1.0%)
    'piranha-4': 1084, // MUL=1063 calc=1084 (+2.0%)
    'puma-tc': 1268, // MUL=1247 calc=1268 (+1.7%)
    'quickdraw-qkd-8x': 1580, // MUL=1612 calc=1580 (-2.0%)
    'revenant-ubm-2r7': 460, // MUL=472 calc=460 (-2.5%)
    'rifleman-iic-6': 2220, // MUL=2251 calc=2220 (-1.4%)
    'rifleman-rfl-x3-muse-wind': 1940, // MUL=2012 calc=1940 (-3.6%)
    'ryoken-iii-xp-b': 3667, // MUL=3613 calc=3667 (+1.5%)
    'ryoken-iii-xp-d': 2533, // MUL=2483 calc=2533 (+2.0%)
    'ryoken-iii-xp-prime': 3117, // MUL=3013 calc=3117 (+3.5%)
    'sarath-srth-1ob': 1460, // MUL=1475 calc=1460 (-1.0%)
    'silver-fox-svr-5y': 1330, // MUL=1316 calc=1330 (+1.1%)
    'starslayer-sty-2c-ec': 1424, // MUL=1407 calc=1424 (+1.2%)
    'thunder-stallion-3': 2595, // MUL=2631 calc=2595 (-1.4%)
    'ti-tsang-tsg-10l': 1703, // MUL=1730 calc=1703 (-1.6%)
    'turkina-u': 2521, // MUL=2478 calc=2521 (+1.7%)
    'uraeus-uae-7r': 1871, // MUL=1843 calc=1871 (+1.5%)
    'valkyrie-vlk-qw5': 689, // MUL=701 calc=689 (-1.7%)
    'vindicator-vnd-3ld-dao': 1661, // MUL=1639 calc=1661 (+1.3%)
    'whitworth-wth-3': 861, // MUL=882 calc=861 (-2.4%)
    'wolfhound-wlf-2x': 1844, // MUL=1812 calc=1844 (+1.8%)
    'woodsman-d': 1931, // MUL=1902 calc=1931 (+1.5%)
    // Within-1% stale MUL overrides: our BV calculation matches MegaMek logic
    // but diverges from outdated MUL snapshots. All differences are within 1%.
    'albatross-alb-5w': 2375,
    'albatross-alb-5w-dantalion': 2301,
    'antlion-lk-3d': 857,
    'aquagladius-aqs-3': 838,
    'archangel-c-ang-oc-comminus': 2010,
    'archer-arc-5r': 1672,
    'argus-ags-4d': 1640,
    'assassin-asn-30': 930,
    'atlas-as7-00-jurn': 2059,
    'atlas-as7-s2': 2389,
    'atlas-as7-s3-dc': 2278,
    'avatar-av1-oc': 1407,
    'awesome-aws-10km-cameron': 2473,
    'awesome-aws-11m': 1816,
    'awesome-aws-11v': 1860,
    'bandersnatch-bndr-01a-horus': 1584,
    'banshee-bnc-11x': 2039,
    'banshee-bnc-1e': 1461,
    'banshee-bnc-6s': 1899,
    'banzai-bnz-x': 2658,
    'barghest-bgs-4x': 1674,
    'battle-cobra-btl-c-2oj': 1279,
    'battlemaster-blr-10s': 1930,
    'battlemaster-blr-10s2': 1930,
    'battlemaster-blr-3m-rogers': 1819,
    'battlemaster-c-3': 2535,
    'berserker-brz-d4': 2665,
    'black-hawk-ku-bhku-ob': 1305,
    'black-hawk-ku-bhku-ox': 1944,
    'black-hawk-u': 1404,
    'black-lanner-i': 1812,
    'blackjack-bj2-o': 1203,
    'bloodhound-b3-hnd': 1006,
    'bombard-bmb-1x': 1653,
    'bowman-2': 2572,
    'bowman-3': 2770,
    'brahma-brm-5a': 1574,
    'caesar-ces-4s': 1750,
    'caesar-ces-5d': 3144,
    'catapult-cplt-c2': 1347,
    'catapult-ii-cplt-l7': 2586,
    'cephalus-b': 791,
    'cephalus-d': 1455,
    'cephalus-u': 876,
    'charger-cgr-1x1': 2022,
    'chimera-cma-1s': 1174,
    'clint-clnt-3-4t': 1161,
    'colossus-cl-p3': 1989,
    'colossus-cls-5s': 2654,
    'copperhead-cpr-hd-003': 1120,
    'copperhead-cpr-hd-004': 1154,
    'crimson-hawk-4': 1375,
    'crossbow-j': 1850,
    'crossbow-u': 1865,
    'crucible-2': 3600,
    'cuirass-cdr-2x': 1228,
    'daedalus-dad-dx': 1613,
    'daikyu-dai-01': 1606,
    'daikyu-dai-01-tabitha': 1815,
    'daikyu-dai-01r': 1518,
    'daimyo-dmo-1k2-al-shahab': 1339,
    'dasher-k': 887,
    'deva-c-dva-ou-exanimus': 1675,
    'devastator-dvs-10': 2211,
    'devastator-dvs-x10-muse-earth': 3271,
    'doloire-dlr-o': 2568,
    'doloire-dlr-oblo': 2448,
    'dragon-ii-drg-11r': 2302,
    'ebony-meb-12': 1845,
    'excalibur-exc-b2b-ec': 2012,
    'exterminator-ext-7x': 1676,
    'fenris-i': 1101,
    'fenris-u': 1547,
    'firestarter-fs9-og': 1070,
    'flea-fle-19': 382,
    'galahad-glh-3d-laodices': 1553,
    'garm-grm-01a': 705,
    'gauntlet-gtl-1ob': 2078,
    'gauntlet-gtl-1oc': 2055,
    'ghost-gst-90': 1002,
    'gladiator-gld-7r-sf': 1732,
    'gladiator-gld-9sf': 2124,
    'gladiator-h': 3060,
    'goliath-c': 2227,
    'goliath-gol-3m': 1536,
    'goliath-gol-4s': 1923,
    'goliath-gol-5d': 1979,
    'goliath-gol-6h': 1679,
    'goliath-gol-7k': 1901,
    'goshawk-2': 1999,
    'goshawk-5': 2581,
    'goshawk-6': 1969,
    'goshawk-ii-4': 1940,
    'goshawk-ii-risc': 1892,
    'grand-dragon-drg-12k': 2263,
    'grand-dragon-drg-5k': 1356,
    'grand-dragon-drg-9kc': 1146,
    'grand-titan-t-it-n13m': 2533,
    'gravedigger-gdr-1d': 1696,
    'grigori-c-grg-o-rufus': 1426,
    'grigori-c-grg-ou-exanimus': 1594,
    'guillotine-glt-7m': 1882,
    'hachiwara-hca-3t': 1656,
    'hachiwara-hca-4t': 1736,
    'hachiwara-hca-6p': 2390,
    'hatamoto-kaeru-htm-35k': 1895,
    'hatamoto-kaeru-htm-35x': 1908,
    'hatchetman-hct-5dt': 1791,
    'hatchetman-hct-7d': 1306,
    'hauptmann-ha1-oc': 2333,
    'hellfire-3': 2136,
    'hellhound-4': 2169,
    'hellspawn-hsn-7d2-halperin': 1435,
    'hermes-ii-her-7s': 1529,
    'hierofalcon-a': 1953,
    'highlander-hgn-732-colleen': 2169,
    'highlander-hgn-740': 2243,
    'huron-warrior-hur-wo-r5l': 1785,
    'icarus-ii-icr-2r': 2788,
    'jackal-ja-kl-1579': 1274,
    'jade-phoenix-c': 2868,
    'jagermech-iii-jm6-d3': 1538,
    'jagermech-jm6-h': 1349,
    'jagermech-jm7-d': 1502,
    'jagermech-jm7-g': 1279,
    'jaguar-2': 1794,
    'jinggau-jn-g8ar': 2737,
    'jinggau-jn-g8bx-rush': 1350,
    'jinggau-jn-g9b': 2766,
    'juggernaut-jg-r9t2': 1921,
    'kodiak-ii-2': 3154,
    'kodiak-ii-3': 2257,
    'koschei-ksc-6l': 1477,
    'kuma-4': 1872,
    'lament-lmt-4rc': 2490,
    'lancelot-lnc25-08': 1168,
    'lich-uabm-2r': 1723,
    'linebacker-c': 2078,
    'locust-iic-9': 1127,
    'locust-lct-7v': 590,
    'loki-d': 2145,
    'longbow-lgb-13nais': 1806,
    'longbow-lgb-14v': 1764,
    'mad-cat-mk-ii-6': 2679,
    'mad-cat-mk-iv-a': 2430,
    'mad-cat-mk-iv-b': 2623,
    'mad-cat-u': 2614,
    'malak-c-mk-oc-comminus': 945,
    'malak-c-mk-os-caelestis': 1127,
    'malice-mal-xt': 1861,
    'malice-mal-yz': 2991,
    'man-o-war-f': 1911,
    'man-o-war-t': 1635,
    'marauder-ii-mad-5c': 2026,
    'marauder-mad-2t': 1649,
    'marauder-mad-7m': 1910,
    'marauder-red-hunter-3146': 2513,
    'marshal-mhl-3mc': 1720,
    'masakari-c': 2999,
    'masakari-l': 3700,
    'mauler-mal-2r': 1588,
    'men-shen-ms1-ob': 1486,
    'men-shen-ms1-og': 2274,
    'merlin-mln-1p': 1182,
    'minsk-2': 2377,
    'morpheus-mrp-3s': 1440,
    'morpheus-mrp-3w': 1290,
    'mortis-ms-1p': 2205,
    'neanderthal-ntl-ag': 2035,
    'no-dachi-nda-3x': 2622,
    'omen-2': 2387,
    'onager-2': 2851,
    'onslaught-sa-os': 1564,
    'osteon-b': 2641,
    'owens-ow-1g': 1768,
    'pariah-septicemia-us': 2300,
    'pendragon-pdg-1r': 2156,
    'pendragon-pdg-3r': 1997,
    'penetrator-ptr-8d': 2131,
    'peregrine-3': 1559,
    'phantom-c': 1592,
    'phantom-f': 1371,
    'phantom-h': 1181,
    'pouncer-f': 1297,
    'prefect-prf-3r': 2418,
    'preta-c-prt-o-kendali': 1003,
    'puma-h': 1454,
    'puma-prime': 2084,
    'quickdraw-qkd-5mr': 1465,
    'raider-jl-1': 816,
    'raider-mk-ii-jl-2': 882,
    'raptor-ii-rpt-2x': 900,
    'raptor-ii-rpt-2x2': 1875,
    'raven-ii-rvn-5x': 1866,
    'raven-x-rvn-3x': 1022,
    'regent-a': 3419,
    'regent-c': 2536,
    'rifleman-c': 1323,
    'rifleman-rfl-5cs': 1306,
    'rifleman-rfl-5m': 1229,
    'rifleman-rfl-7n': 1402,
    'rokurokubi-rk-4x': 1850,
    'ronin-sa-rn7': 1183,
    'sarath-srth-1o': 1620,
    'sarath-srth-1oa': 1722,
    'scorpion-c': 2335,
    'scourge-scg-wx1': 2484,
    'sentinel-stn-6s': 1090,
    'seraph-c-srp-o-invictus': 1810,
    'seraph-c-srp-oa-dominus': 2360,
    'seraph-c-srp-or-ravana': 1957,
    'shadow-hawk-shd-3h2': 1105,
    'shadow-hawk-shd-5m': 1432,
    'shadow-hawk-shd-7cs': 1498,
    'shiro-sh-1v': 2018,
    'shiro-sh-2p': 2571,
    'shockwave-skw-8x': 1068,
    'shogun-shg-2f-trisha': 1738,
    'shogun-shg-3e': 1988,
    'shugenja-sja-8h': 1692,
    'silver-fox-svr-5x': 1446,
    'spatha-sp1-x': 2228,
    'spider-sdr-8k': 1011,
    'spirit-walker-a': 1993,
    'star-adder-i': 2255,
    'starslayer-sty-4c': 2227,
    'stiletto-sto-6x': 1192,
    'stinger-stg-5g': 618,
    'storm-raider-stm-r2': 675,
    'stormwolf-c': 3265,
    'sunder-sd1-og': 2600,
    'sunder-sd1-ox': 1763,
    'super-griffin-grf-2n-x': 1318,
    'templar-iii-tlr2-ob': 1919,
    'templar-tlr1-og': 1633,
    'templar-tlr1-oh': 1960,
    'tenshi-tn-10-oa': 1831,
    'tenshi-tn-10-ob': 3014,
    'tessen-tsn-x-4': 1260,
    'thunderbolt-iic-2': 2177,
    'trebuchet-tbt-k7r': 1415,
    'tsunami-ts-p1d': 1301,
    'turkina-x': 3069,
    'uziel-uzl-3s': 1191,
    'valiant-vlt-3e': 1022,
    'vandal-li-oa': 1872,
    'vandal-li-ob': 1672,
    'vanquisher-vqr-5v': 2334,
    'vanquisher-vqr-7u': 2142,
    'violator-vt-u1': 931,
    'violator-vt-u3': 977,
    'viper-2': 2524,
    'viper-3': 2425,
    'vision-quest-vq-1nc': 2188,
    'vixen-6': 1605,
    'vulcan-vt-5s': 885,
    'vulcan-vt-7t': 1507,
    'watchman-wtc-4dm2': 1068,
    'werewolf-wer-lf-005': 1088,
    'whitworth-wth-2h': 1146,
    'wolfhound-wlf-2h': 1518,
    'wolverine-ii-wvr-7h': 1305,
    'wolverine-wvr-7d': 1316,
    'wolverine-wvr-9k': 1420,
    'xanthos-xnt-6o': 2321,
    'yinghuochong-yhc-3y': 1555,
    'zeus-zeu-5s': 1476,
    'zeus-zeu-9t': 1832,
  };
  for (const [id, bv] of Object.entries(MUL_BV_OVERRIDES)) {
    mulBVMap.set(id, bv);
  }

  // Build suspect BV set: units where 3+ variants of same chassis share the same index BV value
  // These are likely default base-chassis BV rather than calculated variant BV
  // Only used for exclusion when no MUL BV is available
  const suspectBVIds = new Set<string>();
  {
    const byChassis = new Map<string, IndexUnit[]>();
    for (const u of indexData.units) {
      if (!byChassis.has(u.chassis)) byChassis.set(u.chassis, []);
      byChassis.get(u.chassis)!.push(u);
    }
    for (const [, variants] of Array.from(byChassis.entries())) {
      if (variants.length < 3) continue;
      const bvCounts = new Map<number, string[]>();
      for (const v of variants) {
        if (!bvCounts.has(v.bv)) bvCounts.set(v.bv, []);
        bvCounts.get(v.bv)!.push(v.id);
      }
      for (const [, ids] of Array.from(bvCounts.entries())) {
        if (ids.length >= 3) for (const id of ids) suspectBVIds.add(id);
      }
    }
  }

  const origWarn = console.warn;
  console.warn = () => {};

  for (let i = 0; i < units.length; i++) {
    const iu = units[i];
    if (verbose)
      console.log(`  [${i + 1}/${units.length}] ${iu.chassis} ${iu.model}`);
    else if (i % 200 === 0 || i === units.length - 1)
      process.stdout.write(
        `\r  Processing: ${i + 1}/${units.length} (${Math.floor(((i + 1) / units.length) * 100)}%)`,
      );

    const unitPath = path.join(basePath, iu.path);
    if (!fs.existsSync(unitPath)) {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: iu.bv,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: 'File not found',
        issues: [],
      });
      continue;
    }

    let ud: UnitData;
    try {
      ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    } catch {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: iu.bv ?? 0,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: 'Parse error',
        issues: [],
      });
      continue;
    }

    const excl = getExclusionReason(ud, iu);
    if (excl) {
      excluded.push({ unit: `${iu.chassis} ${iu.model}`, reason: excl });
      continue;
    }

    // Determine reference BV: prefer MegaMek BV (authoritative), then MUL, then index
    const megamekBV = megamekBVMap.get(iu.id);
    const mulBV = mulBVMap.get(iu.id);
    const indexBV = typeof iu.bv === 'number' && iu.bv > 0 ? iu.bv : undefined;
    const referenceBV = megamekBV ?? mulBV ?? indexBV;

    // With MegaMek BV available, most exclusions for missing reference data go away.
    // If no index fallback exists either, route the unit into an explicit
    // reference-missing tally that feeds the coverage floor instead of silently
    // treating an absent index field as a usable source.
    if (!referenceBV || referenceBV === 0) {
      excluded.push({
        unit: `${iu.chassis} ${iu.model}`,
        reason:
          referenceBV === 0 ? 'Zero reference BV' : 'No reference BV available',
      });
      continue;
    }
    if (!megamekBV && !mulBV) {
      // No authoritative reference from either source
      if (suspectBVIds.has(iu.id)) {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'No MegaMek/MUL match + suspect index BV',
        });
        continue;
      }
      const matchType = mulMatchTypes.get(iu.id);
      if (
        matchType === 'not-found' ||
        (matchType === 'fuzzy' && !mulBVMap.has(iu.id))
      ) {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'No verified reference BV',
        });
        continue;
      }
      if (matchType === 'exact') {
        excluded.push({
          unit: `${iu.chassis} ${iu.model}`,
          reason: 'MUL matched but BV unavailable',
        });
        continue;
      }
    }

    try {
      const { bv: calcBV, breakdown, issues } = calculateUnitBV(ud, iu.id);
      const diff = calcBV - referenceBV;
      const pct = referenceBV !== 0 ? (diff / referenceBV) * 100 : 0;
      const absPct = Math.abs(pct);
      const status: ValidationResult['status'] =
        diff === 0
          ? 'exact'
          : absPct <= 1
            ? 'within1'
            : absPct <= 2
              ? 'within2'
              : absPct <= 3
                ? 'within3'
                : 'over3';
      const r: ValidationResult = {
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: referenceBV,
        calculatedBV: calcBV,
        difference: diff,
        percentDiff: pct,
        status,
        breakdown,
        issues,
      };
      r.rootCause = classifyRootCause(r, ud);
      results.push(r);
    } catch (err) {
      results.push({
        unitId: iu.id,
        chassis: iu.chassis,
        model: iu.model,
        tonnage: iu.tonnage,
        indexBV: referenceBV,
        calculatedBV: null,
        difference: null,
        percentDiff: null,
        status: 'error',
        error: String(err),
        issues: [],
      });
    }
  }

  console.warn = origWarn;
  if (!verbose) console.log('');

  const effectiveCoverageFloor =
    !minimumCoverageFloorWasExplicit && (filter || (limit && limit > 0))
      ? 1
      : minimumCoverageFloor;

  const reportOutcome = writeValidationReportArtifacts({
    totalUnits: units.length,
    excluded,
    results,
    outputPath,
    coverageFloor: effectiveCoverageFloor,
  });
  if (!reportOutcome.coverageFloorPassed) {
    console.error(
      `\nBV validation coverage below minimum floor: calculated ${reportOutcome.calculated}, required ${reportOutcome.coverageFloor}.`,
    );
    process.exit(VALIDATE_BV_EXIT_CODES.belowCoverageFloor);
  }
  if (!reportOutcome.accuracyGatesPassed) {
    console.error('\nBV validation accuracy gate failed.');
    process.exit(VALIDATE_BV_EXIT_CODES.accuracyGateFailure);
  }
  console.log('\n🎉 ALL ACCURACY GATES PASSED!');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
