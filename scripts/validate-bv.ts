#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

import type { UnitData, ValidationResult } from './validate-bv-types';

import { calculateUnitBV } from './validate-bv-calculator';
import { parseValidateBvArgs, VALIDATE_BV_USAGE } from './validate-bv-cli';
import { MUL_BV_OVERRIDES } from './validate-bv-mul-overrides';
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

  // Legacy MUL fallback values live outside the CLI orchestrator.
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
