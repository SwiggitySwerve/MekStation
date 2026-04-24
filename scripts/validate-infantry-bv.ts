#!/usr/bin/env npx tsx
/**
 * Infantry BV Parity Harness
 *
 * Emits `validation-output/infantry-bv-validation-report.json` per the
 * add-infantry-battle-value spec delta. The harness loads every conventional
 * infantry unit JSON from `public/data/units/infantry/`, runs the unified
 * `calculateBattleValueForUnit` dispatcher, and captures the returned
 * `IInfantryBVBreakdown` alongside any MUL BV present on the fixture.
 *
 * MegaMekLab parity is deferred until a full infantry MUL extract is seeded
 * (mirrors the Wave 1 deferral used by the vehicle and aerospace harnesses).
 * Fixture JSONs may include a `mulBV` field; when present, the harness
 * computes `delta = computedBV - mulBV` and `deltaPct`. When `mulBV` is
 * absent (or `null`), delta fields are emitted as `null` so the report shape
 * remains stable for downstream tooling.
 *
 * Usage:
 *   npm run validate:infantry
 *   # or
 *   npx tsx scripts/validate-infantry-bv.ts
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IInfantry } from '../src/types/unit/PersonnelInterfaces';
import { calculateBattleValueForUnit } from '../src/utils/construction/battleValueCalculations';
import type { IInfantryBVBreakdown } from '../src/utils/construction/infantry/infantryBV';

// =============================================================================
// Report types
// =============================================================================

/**
 * One platoon entry in the parity report.
 *
 * `mulBV`, `delta`, and `deltaPct` are nullable. When a fixture carries a
 * `mulBV` field, the harness populates `delta` (= computed − MUL) and
 * `deltaPct` (= delta / mulBV × 100, guarded against division-by-zero).
 */
interface PlatoonReportEntry {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly computedBV: number;
  readonly mulBV: number | null;
  readonly delta: number | null;
  readonly deltaPct: number | null;
  readonly breakdown: IInfantryBVBreakdown;
}

interface InfantryBVReport {
  readonly version: string;
  readonly generatedAt: string;
  readonly totalPlatoons: number;
  readonly parityCoverage: {
    readonly withMulBV: number;
    readonly withinOnePercent: number;
    readonly withinFivePercent: number;
  };
  readonly deferral: {
    readonly reason: string;
    readonly trackedBy: string;
  };
  readonly platoons: readonly PlatoonReportEntry[];
}

// =============================================================================
// Fixture loading
// =============================================================================

const INFANTRY_DATA_DIR = path.resolve(
  process.cwd(),
  'public',
  'data',
  'units',
  'infantry',
);

/**
 * Recursively gather every `*.json` under `public/data/units/infantry/`.
 * Ignores non-JSON files and hidden files so the harness tolerates
 * README.md or other auxiliary content alongside the fixtures.
 */
function gatherInfantryFixtureFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gatherInfantryFixtureFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Shape of an infantry fixture file on disk — an `IInfantry`-compatible object
 * with an optional `mulBV` parity reference.
 *
 * The parser is intentionally tolerant: missing optional fields fall back to
 * the defaults used by `InfantryUnitHandler.combineFields`, ensuring fixtures
 * remain compact. Required fields are validated with a clear error.
 */
interface InfantryFixtureFile extends Partial<IInfantry> {
  /** Reference BV from MegaMek Master Unit List — optional. */
  readonly mulBV?: number | null;
}

/**
 * Load and normalize a fixture JSON into a full `IInfantry` shape suitable
 * for `calculateBattleValueForUnit`.
 */
function loadFixture(filePath: string): {
  unit: IInfantry;
  mulBV: number | null;
  source: string;
} {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as InfantryFixtureFile;

  if (!data.id || !data.name) {
    throw new Error(`Fixture ${filePath} is missing required id/name`);
  }

  // Supply structural defaults for any handler-layer fields the fixture
  // omits. The BV calculator only reads the subset enumerated below, so
  // the adapter must still see every field it touches.
  const unit: IInfantry = {
    ...(data as IInfantry),
    fieldGuns: data.fieldGuns ?? [],
    hasAntiMechTraining: data.hasAntiMechTraining ?? false,
    isAugmented: data.isAugmented ?? false,
    canSwarm: data.canSwarm ?? false,
    canLegAttack: data.canLegAttack ?? false,
    secondaryWeaponCount: data.secondaryWeaponCount ?? 0,
    platoonStrength:
      data.platoonStrength ??
      (data.squadSize ?? 7) * (data.numberOfSquads ?? 4),
  } as IInfantry;

  const mulBV =
    typeof data.mulBV === 'number' && Number.isFinite(data.mulBV)
      ? data.mulBV
      : null;

  return {
    unit,
    mulBV,
    source: path.relative(process.cwd(), filePath),
  };
}

// =============================================================================
// Harness
// =============================================================================

/**
 * Compute a parity entry for a single fixture file.
 *
 * Invokes the unified dispatcher `calculateBattleValueForUnit`; if the
 * dispatcher returns `undefined` (non-infantry fall-through), the harness
 * raises — fixtures under `public/data/units/infantry/` are always expected
 * to resolve to the infantry path.
 */
function computeEntry(filePath: string): PlatoonReportEntry {
  const { unit, mulBV, source } = loadFixture(filePath);
  const result = calculateBattleValueForUnit(unit);
  if (!result || result.kind !== 'infantry') {
    throw new Error(
      `Dispatcher did not return an infantry breakdown for ${source}. ` +
        `Check that unitType === 'Infantry' on the fixture.`,
    );
  }

  const computedBV = result.breakdown.final;
  const delta = mulBV !== null ? computedBV - mulBV : null;
  const deltaPct =
    mulBV !== null && mulBV !== 0 && delta !== null
      ? (delta / mulBV) * 100
      : mulBV === 0
        ? 0
        : null;

  return {
    id: unit.id,
    name: unit.name,
    source,
    computedBV,
    mulBV,
    delta,
    deltaPct,
    breakdown: result.breakdown,
  };
}

/**
 * Build the parity report object from every fixture on disk.
 */
function buildReport(): InfantryBVReport {
  const files = gatherInfantryFixtureFiles(INFANTRY_DATA_DIR);
  const platoons = files.map(computeEntry);

  const withMulBV = platoons.filter((p) => p.mulBV !== null).length;
  const withinOne = platoons.filter(
    (p) => p.deltaPct !== null && Math.abs(p.deltaPct) <= 1,
  ).length;
  const withinFive = platoons.filter(
    (p) => p.deltaPct !== null && Math.abs(p.deltaPct) <= 5,
  ).length;

  return {
    version: '1',
    generatedAt: new Date().toISOString(),
    totalPlatoons: platoons.length,
    parityCoverage: {
      withMulBV,
      withinOnePercent: withinOne,
      withinFivePercent: withinFive,
    },
    deferral: {
      reason:
        'MUL BV cache for conventional infantry platoons is partial. Fixtures without a mulBV field emit delta/deltaPct as null; once the MegaMek MUL extract is seeded under public/data/units/infantry/, each fixture should gain a mulBV value and delta coverage will rise automatically.',
      trackedBy:
        'openspec/changes/add-infantry-battle-value/tasks.md (task 7.2 deferred)',
    },
    platoons,
  };
}

/**
 * Entry point — writes the report to `validation-output/infantry-bv-validation-report.json`.
 */
function main(): void {
  const report = buildReport();
  const outDir = path.resolve(process.cwd(), 'validation-output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'infantry-bv-validation-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  // Minimal summary on stdout — mirrors existing BV harness ergonomics.
  console.log('[validate-infantry-bv] Report written: ' + outPath);
  console.log('[validate-infantry-bv] Platoons: ' + report.totalPlatoons);
  console.log(
    '[validate-infantry-bv] With MUL BV: ' +
      report.parityCoverage.withMulBV +
      ' / ' +
      report.totalPlatoons,
  );
  console.log(
    '[validate-infantry-bv] Within 1%: ' +
      report.parityCoverage.withinOnePercent +
      ' (of ' +
      report.parityCoverage.withMulBV +
      ' MUL-referenced)',
  );
  console.log(
    '[validate-infantry-bv] Within 5%: ' +
      report.parityCoverage.withinFivePercent +
      ' (of ' +
      report.parityCoverage.withMulBV +
      ' MUL-referenced)',
  );
}

if (require.main === module) {
  main();
}

export { buildReport, loadFixture, gatherInfantryFixtureFiles };
