#!/usr/bin/env npx tsx
/**
 * Vehicle BV Parity Harness
 *
 * Emits `validation-output/vehicle-bv-validation-report.json` per the
 * add-vehicle-battle-value spec delta. The harness loads every vehicle unit
 * JSON under `public/data/units/vehicles/` (and its subdirectories), runs the
 * unified `calculateBattleValueForUnit` dispatcher, and captures the returned
 * `IVehicleBVBreakdown` alongside any MUL BV present on the fixture.
 *
 * MegaMekLab parity is deferred until a vehicle MUL extract is seeded — the
 * decision is captured in `openspec/changes/add-vehicle-battle-value/notepad/decisions.md`
 * ("Parity harness emits `mulBV: null` when no reference exists"). When a
 * fixture carries a `mulBV` field, the harness computes `delta = computedBV -
 * mulBV` and `deltaPct`; otherwise both are emitted as `null` so the report
 * shape stays stable for downstream tooling.
 *
 * The vehicle data directory may not exist yet (no canonical fixtures shipped
 * at the time the BV change landed). In that case the harness emits a
 * well-formed report with `totalUnits: 0`, `coverage: "no_mul_data"`, and an
 * empty `units[]` array — sufficient to satisfy the spec requirement that the
 * report be produced and contain the called-out keys.
 *
 * Usage:
 *   npm run validate:vehicle
 *   # or
 *   npx tsx scripts/validate-vehicle-bv.ts
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 *       — Requirement: BV Parity Harness for Vehicles
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Vehicle BV Dispatch
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  IVehicleUnit,
  IVehicle,
} from '../src/types/unit/VehicleInterfaces';
import type { IVehicleBVBreakdown } from '../src/utils/construction/vehicle/vehicleBV';

import { calculateBattleValueForUnit } from '../src/utils/construction/battleValueCalculations';

// =============================================================================
// Report types
// =============================================================================

/**
 * One vehicle entry in the parity report.
 *
 * `mulBV`, `delta`, and `deltaPct` are nullable. When a fixture carries a
 * `mulBV` field, the harness populates `delta` (= computed − MUL) and
 * `deltaPct` (= delta / mulBV × 100, guarded against division-by-zero).
 *
 * Spec ADDED Requirement (vehicle-unit-system §"Vehicle validation report")
 * calls these keys out by name: `unitName`, `computedBV`, `mulBV`, `delta`,
 * `deltaPct`. The trailing `breakdown` mirrors the infantry/proto harness so
 * downstream gap-analysis scripts can drill into the calculator outputs.
 */
interface VehicleReportEntry {
  /** Stable id pulled from the fixture JSON. */
  readonly id: string;
  /** Human-readable name surfaced by the spec scenario. */
  readonly unitName: string;
  /** Workspace-relative source file path for traceability. */
  readonly source: string;
  /** BV produced by the calculator. */
  readonly computedBV: number;
  /** MUL/MegaMek BV reference (null when no cache exists). */
  readonly mulBV: number | null;
  /** computedBV − mulBV (null when mulBV is null). */
  readonly delta: number | null;
  /** delta / mulBV × 100 (null when mulBV is null or 0). */
  readonly deltaPct: number | null;
  /** Full breakdown dict — defensive/offensive/turretModifier/final/etc. */
  readonly breakdown: IVehicleBVBreakdown;
}

/**
 * Aggregate parity report. `coverage: "no_mul_data"` is the deferred-status
 * marker requested in the change notepad; downstream tools check this before
 * keying off `parityCoverage` percentages.
 */
interface VehicleBVReport {
  readonly version: string;
  readonly generatedAt: string;
  readonly totalUnits: number;
  /** Number of units the calculator produced an exact MUL match on. */
  readonly exact: number;
  /** Number of units within 1% of MUL BV. */
  readonly within1pct: number;
  /** Number of units within 5% of MUL BV. */
  readonly within5pct: number;
  /**
   * Status marker — `"ok"` when at least one MUL reference is present, else
   * `"no_mul_data"` so consumers can short-circuit on the deferral.
   */
  readonly coverage: 'ok' | 'no_mul_data';
  readonly parityCoverage: {
    readonly withMulBV: number;
    readonly withinOnePercent: number;
    readonly withinFivePercent: number;
  };
  readonly deferral: {
    readonly reason: string;
    readonly trackedBy: string;
  };
  /** Failures (file load / dispatch errors) — preserved for triage. */
  readonly errors: ReadonlyArray<{
    readonly source: string;
    readonly message: string;
  }>;
  /** Same data as `units` — kept for spec wording consistency. */
  readonly outliers: ReadonlyArray<VehicleReportEntry>;
  readonly units: ReadonlyArray<VehicleReportEntry>;
}

// =============================================================================
// Fixture loading
// =============================================================================

const VEHICLE_DATA_DIR = path.resolve(
  process.cwd(),
  'public',
  'data',
  'units',
  'vehicles',
);

/**
 * Recursively gather every `*.json` under `public/data/units/vehicles/`.
 *
 * Mirrors the proto/infantry harness — ignores hidden files, recurses into
 * subdirectories, and tolerates the directory being absent. Returns a sorted
 * list so report ordering is stable across runs.
 */
function gatherVehicleFixtureFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gatherVehicleFixtureFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Tolerant fixture shape — every vehicle unit subtype shares enough surface
 * area for the BV dispatcher to read what it needs. Fixtures may also embed
 * a `mulBV` parity reference; missing means "no MUL data for this unit yet".
 */
interface VehicleFixtureFile extends Partial<IVehicle> {
  readonly mulBV?: number | null;
}

/**
 * Load and minimally normalize a fixture JSON into an `IVehicleUnit` shape.
 *
 * The BV dispatcher narrows on `unitType`; all the calculator reads beyond
 * that is `tonnage`, `motionType`, `movement.{cruise,flank,jump}MP`,
 * `armor*`, `equipment[]`, and the turret slots. Anything else is preserved
 * but not consulted, so the structural cast is safe.
 */
function loadFixture(filePath: string): {
  unit: IVehicleUnit;
  mulBV: number | null;
  source: string;
} {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as VehicleFixtureFile;

  if (!data.id || !data.unitType) {
    throw new Error(
      `Fixture ${filePath} is missing required id/unitType fields`,
    );
  }

  // Cast through unknown — the calculator tolerates partial fixtures and the
  // adapter's IVehicleUnit narrowing only requires unitType + the BV fields.
  const unit = data as unknown as IVehicleUnit;

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
 * Compute a parity entry for one fixture. Throws if the dispatcher does not
 * return a `vehicle`-tagged result — fixtures under
 * `public/data/units/vehicles/` are always expected to be vehicle-class.
 */
function computeEntry(filePath: string): {
  entry?: VehicleReportEntry;
  error?: { source: string; message: string };
} {
  let loaded: ReturnType<typeof loadFixture>;
  try {
    loaded = loadFixture(filePath);
  } catch (err) {
    return {
      error: {
        source: path.relative(process.cwd(), filePath),
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const { unit, mulBV, source } = loaded;

  let breakdown: IVehicleBVBreakdown;
  try {
    const result = calculateBattleValueForUnit(unit);
    if (!result || result.kind !== 'vehicle') {
      return {
        error: {
          source,
          message:
            `Dispatcher did not return a vehicle breakdown — ` +
            `unitType="${(unit as { unitType?: string }).unitType ?? 'unknown'}".`,
        },
      };
    }
    breakdown = result.breakdown;
  } catch (err) {
    return {
      error: {
        source,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const computedBV = breakdown.final;
  const delta = mulBV !== null ? computedBV - mulBV : null;
  // Guard against div-by-zero. When mulBV is exactly 0, deltaPct is 0 if the
  // calculator also produced 0 (otherwise undefined parity — emit null).
  const deltaPct =
    mulBV !== null && mulBV !== 0 && delta !== null
      ? (delta / mulBV) * 100
      : mulBV === 0 && computedBV === 0
        ? 0
        : null;

  return {
    entry: {
      id: String(unit.id ?? path.basename(filePath, '.json')),
      unitName: String(
        (unit as { name?: string; chassis?: string; model?: string }).name ??
          [
            (unit as { chassis?: string }).chassis,
            (unit as { model?: string }).model,
          ]
            .filter(Boolean)
            .join(' ') ??
          path.basename(filePath, '.json'),
      ),
      source,
      computedBV,
      mulBV,
      delta,
      deltaPct,
      breakdown,
    },
  };
}

const NO_MUL_DATA_REASON =
  'No vehicle MUL/MegaMek BV cache has been seeded yet. Per the change ' +
  'notepad ("Parity harness emits mulBV: null when no reference exists"), ' +
  'every fixture without a mulBV field reports null delta/deltaPct. Once a ' +
  'reference cache lands under public/data/units/vehicles/, fixtures should ' +
  'gain mulBV values and parity metrics will populate automatically.';

const TRACKED_BY =
  'openspec/changes/add-vehicle-battle-value/tasks.md task 10.4 (deferred)';

/**
 * Build the parity report object from every fixture on disk.
 */
function buildReport(): VehicleBVReport {
  const files = gatherVehicleFixtureFiles(VEHICLE_DATA_DIR);

  const units: VehicleReportEntry[] = [];
  const errors: Array<{ source: string; message: string }> = [];
  for (const file of files) {
    const result = computeEntry(file);
    if (result.entry) units.push(result.entry);
    if (result.error) errors.push(result.error);
  }

  const withMulBV = units.filter((u) => u.mulBV !== null).length;
  const exact = units.filter(
    (u) => u.delta !== null && Math.abs(u.delta) === 0,
  ).length;
  const withinOne = units.filter(
    (u) => u.deltaPct !== null && Math.abs(u.deltaPct) <= 1,
  ).length;
  const withinFive = units.filter(
    (u) => u.deltaPct !== null && Math.abs(u.deltaPct) <= 5,
  ).length;

  // Outliers: units beyond the 5% band — empty when no MUL data exists.
  const outliers = units.filter(
    (u) => u.deltaPct !== null && Math.abs(u.deltaPct) > 5,
  );

  return {
    version: '1',
    generatedAt: new Date().toISOString(),
    totalUnits: units.length,
    exact,
    within1pct: withinOne,
    within5pct: withinFive,
    coverage: withMulBV > 0 ? 'ok' : 'no_mul_data',
    parityCoverage: {
      withMulBV,
      withinOnePercent: withinOne,
      withinFivePercent: withinFive,
    },
    deferral: {
      reason: NO_MUL_DATA_REASON,
      trackedBy: TRACKED_BY,
    },
    errors,
    outliers,
    units,
  };
}

/**
 * Entry point — writes the report to
 * `validation-output/vehicle-bv-validation-report.json`.
 */
function main(): void {
  const report = buildReport();
  const outDir = path.resolve(process.cwd(), 'validation-output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'vehicle-bv-validation-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  // Minimal summary on stdout — mirrors existing BV harness ergonomics.
  console.log('[validate-vehicle-bv] Report written: ' + outPath);
  console.log('[validate-vehicle-bv] Units: ' + report.totalUnits);
  console.log('[validate-vehicle-bv] Coverage: ' + report.coverage);
  console.log(
    '[validate-vehicle-bv] With MUL BV: ' +
      report.parityCoverage.withMulBV +
      ' / ' +
      report.totalUnits,
  );
  if (report.parityCoverage.withMulBV > 0) {
    console.log(
      '[validate-vehicle-bv] Within 1%: ' +
        report.parityCoverage.withinOnePercent +
        ' (of ' +
        report.parityCoverage.withMulBV +
        ' MUL-referenced)',
    );
    console.log(
      '[validate-vehicle-bv] Within 5%: ' +
        report.parityCoverage.withinFivePercent +
        ' (of ' +
        report.parityCoverage.withMulBV +
        ' MUL-referenced)',
    );
  }
  if (report.errors.length > 0) {
    console.log(
      '[validate-vehicle-bv] Errors: ' + report.errors.length + ' fixture(s)',
    );
  }
}

if (require.main === module) {
  main();
}
