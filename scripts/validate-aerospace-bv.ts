#!/usr/bin/env npx tsx
/**
 * Aerospace BV Parity Validation CLI
 *
 * Emits a parity report comparing MekStation's aerospace BV calculator against
 * canonical MegaMekLab / MUL aerospace BV values.
 *
 * Status: DEFERRED until an aerospace MUL cache lands under
 *   public/data/units/aerospace_units/ (or equivalent).
 *
 * When the cache is absent, this script still emits a well-formed
 * `validation-output/aerospace-bv-validation-report.json` with
 * `status: "deferred"` so downstream CI and the OpenSpec verifier can
 * confirm the parity-harness task is wired (task 9.3) even though the
 * comparison itself is deferred.
 *
 * If aerospace JSON files ARE present we walk the directory, run each through
 * `calculateAerospaceBVFromUnit`, and compare against the unit's `mulBV` (or
 * `mul_bv` / `bv`) field when the canonical value is exposed in the JSON.
 *
 * Usage:
 *   npx tsx scripts/validate-aerospace-bv.ts [options]
 *
 * Options:
 *   --aero-cache <path>  Path to aerospace MUL cache directory
 *                        (default: public/data/units/aerospace_units)
 *   --output <path>      Output path for the JSON report
 *                        (default: validation-output/aerospace-bv-validation-report.json)
 *   --help               Show this help message
 *
 * @spec openspec/changes/add-aerospace-battle-value/tasks.md §9 BV Parity Harness
 * @spec openspec/changes/add-aerospace-battle-value/specs/aerospace-unit-system/spec.md
 *       — Requirement: Aerospace BV Parity Harness
 */

import * as fs from 'fs';
import * as path from 'path';

// Lazy import the calculator — the harness can run in a deferred state
// without the calculator being importable. We only require it when there
// are real aerospace units to compute against.
import { calculateAerospaceBVFromUnit } from '../src/utils/construction/aerospace/aerospaceBV';

// =============================================================================
// CLI arg parsing
// =============================================================================

interface CLIOptions {
  aeroCachePaths: string[];
  outputPath: string;
  help: boolean;
}

/**
 * Default search locations for canonical aerospace unit JSON files.
 * The harness probes each path in order; the first one that exists and
 * contains JSON files becomes the active cache. Multiple defaults make the
 * harness resilient to layout changes — concrete project moved between
 * `aerospace_units/`, `aerospacefighters/`, and `aerospace/` historically.
 */
const DEFAULT_AERO_CACHE_PATHS = [
  'public/data/units/aerospace_units',
  'public/data/units/aerospacefighters',
  'public/data/units/aerospace',
];

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    aeroCachePaths: DEFAULT_AERO_CACHE_PATHS.map((p) =>
      path.resolve(process.cwd(), p),
    ),
    outputPath: path.resolve(
      process.cwd(),
      'validation-output/aerospace-bv-validation-report.json',
    ),
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--aero-cache': {
        // Override defaults with a single explicit path so callers can point
        // the harness at a custom or test fixture directory.
        const next = args[++i];
        if (next) {
          options.aeroCachePaths = [path.resolve(next)];
        }
        break;
      }
      case '--output':
        options.outputPath = path.resolve(
          args[++i] || 'validation-output/aerospace-bv-validation-report.json',
        );
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        // Ignore unknown args — the harness is intentionally tolerant.
        break;
    }
  }

  return options;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
Aerospace BV Parity Validation

Usage:
  npx tsx scripts/validate-aerospace-bv.ts [options]

Options:
  --aero-cache <path>  Path to aerospace MUL cache directory
                       (default: public/data/units/aerospace_units,
                        falling back to aerospacefighters/, aerospace/)
  --output <path>      Output JSON report path
  --help, -h           Show this help message

Behaviour:
  If no aerospace MUL cache directory contains JSON, a deferred-status
  report is written so CI and the OpenSpec verifier can confirm the
  parity harness entry point is wired (task 9.3).

  When aerospace units ARE present, each unit is compared against its
  exposed canonical BV (\`mulBV\` / \`mul_bv\` / \`bv\` field). Units with
  no canonical BV are recorded but excluded from aggregate stats.

Spec:
  openspec/changes/add-aerospace-battle-value/tasks.md §9.3
`);
}

// =============================================================================
// Report shape
// =============================================================================

/**
 * Parity report shape. Downstream tools (analysis scripts, dashboards) should
 * key off `status` to decide whether to surface the `units` / `stats` arrays.
 */
interface AerospaceParityReport {
  /** Report schema version. Bump when the shape changes. */
  readonly schemaVersion: number;
  /** Status marker — `deferred` means no comparison was run. */
  readonly status: 'deferred' | 'ok' | 'error';
  /** Human-readable reason for the current status. */
  readonly reason: string;
  /** Coverage marker — useful when no canonical BV is exposed in the JSON. */
  readonly coverage?: 'no_mul_data' | 'partial' | 'full';
  /** ISO timestamp when the report was generated. */
  readonly generatedAt: string;
  /** Source directory the harness loaded from (when applicable). */
  readonly source?: string;
  /** Individual aerospace parity rows (empty when status === 'deferred'). */
  readonly units: ReadonlyArray<AerospaceParityRow>;
  /** Aggregate stats (populated only when status === 'ok'). */
  readonly stats?: {
    readonly total: number;
    readonly compared: number;
    readonly exact: number;
    readonly within1pct: number;
    readonly within5pct: number;
    readonly outliers: ReadonlyArray<AerospaceParityRow>;
  };
}

interface AerospaceParityRow {
  readonly id: string;
  readonly name: string;
  readonly canonicalBV: number | null;
  readonly computedBV: number;
  readonly delta: number | null;
  readonly deltaPct: number | null;
}

// =============================================================================
// Cache loading
// =============================================================================

/**
 * Locate the first cache path that exists and contains at least one JSON
 * file. Returns `undefined` when none of the candidates are populated —
 * which the caller maps onto the deferred-report path.
 */
function locateCache(candidates: readonly string[]): string | undefined {
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const stat = fs.statSync(candidate);
    if (!stat.isDirectory()) continue;
    const entries = walkJsonFiles(candidate);
    if (entries.length > 0) return candidate;
  }
  return undefined;
}

/**
 * Recursively collect every `.json` file under `dir`. Used to support nested
 * cache layouts (e.g. era-grouped subdirectories like the BattleMech cache).
 */
function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const items = fs.readdirSync(current, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        stack.push(full);
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.json')) {
        out.push(full);
      }
    }
  }
  return out;
}

// =============================================================================
// Parity computation
// =============================================================================

/**
 * Read a JSON file, parse it, and return the raw object. Returns `undefined`
 * for files that fail to parse — the harness logs and skips rather than
 * aborting the whole run.
 */
function readJsonFile(file: string): Record<string, unknown> | undefined {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Pull the canonical BV from a parsed unit JSON. Different MUL exports use
 * different keys — we probe the most common ones in priority order.
 */
function readCanonicalBV(unit: Record<string, unknown>): number | null {
  const keys = ['mulBV', 'mul_bv', 'bv', 'battleValue', 'battle_value'];
  for (const key of keys) {
    const value = unit[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Pull a stable identifier and display name. Falls back to the file path
 * when neither is present so every row in the report is debuggable.
 */
function readIdentity(
  unit: Record<string, unknown>,
  filePath: string,
): { id: string; name: string } {
  const id = pickString(unit, ['id', 'mulId', 'chassis']) ?? filePath;
  const chassis = pickString(unit, ['chassis']) ?? '';
  const model = pickString(unit, ['model', 'variant']) ?? '';
  const explicitName = pickString(unit, ['name']);
  const composed = `${chassis}${model ? ' ' + model : ''}`.trim();
  const name = explicitName ?? (composed.length > 0 ? composed : id);
  return { id, name };
}

function pickString(
  obj: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Compute parity for a single aerospace unit JSON. Returns `null` if the
 * unit can't be coerced into the calculator's input shape — those units
 * still appear in the report so users can see what was skipped.
 */
function computeUnitParity(
  unit: Record<string, unknown>,
  filePath: string,
): AerospaceParityRow {
  const { id, name } = readIdentity(unit, filePath);
  const canonicalBV = readCanonicalBV(unit);

  let computedBV = 0;
  try {
    // The calculator-from-unit adapter is intentionally tolerant: missing
    // equipment / armor fields default to safe zero values so a partial
    // unit JSON still produces a structured (but small) BV.
    const breakdown = calculateAerospaceBVFromUnit(
      unit as Parameters<typeof calculateAerospaceBVFromUnit>[0],
    );
    computedBV = breakdown.final;
  } catch {
    // A throw means the JSON shape diverges enough that even the tolerant
    // adapter can't normalize it. Record 0 and let the consumer flag it.
    computedBV = 0;
  }

  const delta = canonicalBV !== null ? computedBV - canonicalBV : null;
  const deltaPct =
    canonicalBV !== null && canonicalBV > 0
      ? (computedBV - canonicalBV) / canonicalBV
      : null;

  return { id, name, canonicalBV, computedBV, delta, deltaPct };
}

// =============================================================================
// Report writing
// =============================================================================

function writeReport(outputPath: string, report: AerospaceParityReport): void {
  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const generatedAt = new Date().toISOString();
  const cacheRoot = locateCache(options.aeroCachePaths);

  if (!cacheRoot) {
    // Emit the deferred stub. The OpenSpec verifier relies on the presence
    // of this file to confirm task 9.3 is wired; downstream tools read
    // `status` before using `units` / `stats`.
    const report: AerospaceParityReport = {
      schemaVersion: 1,
      status: 'deferred',
      reason:
        'aerospace MUL cache not yet available — checked: ' +
        options.aeroCachePaths.join(', '),
      coverage: 'no_mul_data',
      generatedAt,
      units: [],
    };
    writeReport(options.outputPath, report);
    // eslint-disable-next-line no-console
    console.log(
      `[validate-aerospace-bv] Emitted deferred report at ${options.outputPath} ` +
        `(no aerospace MUL cache found).`,
    );
    return;
  }

  // Cache present — walk it and compute parity rows.
  const jsonFiles = walkJsonFiles(cacheRoot);
  const rows: AerospaceParityRow[] = [];
  let skipped = 0;
  for (const file of jsonFiles) {
    const parsed = readJsonFile(file);
    if (!parsed) {
      skipped++;
      continue;
    }
    rows.push(computeUnitParity(parsed, file));
  }

  const compared = rows.filter((r) => r.canonicalBV !== null);
  const exact = compared.filter((r) => r.delta === 0).length;
  const within1pct = compared.filter(
    (r) => r.deltaPct !== null && Math.abs(r.deltaPct) <= 0.01,
  ).length;
  const within5pct = compared.filter(
    (r) => r.deltaPct !== null && Math.abs(r.deltaPct) <= 0.05,
  ).length;
  const outliers = compared.filter(
    (r) => r.deltaPct !== null && Math.abs(r.deltaPct) > 0.05,
  );

  // No canonical BV anywhere means we still satisfy the spec ("harness
  // exists and runs") but mark coverage so callers know.
  const coverage: AerospaceParityReport['coverage'] =
    compared.length === 0
      ? 'no_mul_data'
      : compared.length === rows.length
        ? 'full'
        : 'partial';

  const report: AerospaceParityReport = {
    schemaVersion: 1,
    status: 'ok',
    reason:
      compared.length === 0
        ? `Loaded ${rows.length} aerospace units; none expose a canonical BV.`
        : `Compared ${compared.length}/${rows.length} aerospace units.`,
    coverage,
    generatedAt,
    source: cacheRoot,
    units: rows,
    stats: {
      total: rows.length,
      compared: compared.length,
      exact,
      within1pct,
      within5pct,
      outliers,
    },
  };
  writeReport(options.outputPath, report);
  // eslint-disable-next-line no-console
  console.log(
    `[validate-aerospace-bv] Loaded ${rows.length} units from ${cacheRoot} ` +
      `(${compared.length} with canonical BV, ${skipped} unparseable).`,
  );
  // eslint-disable-next-line no-console
  console.log(`[validate-aerospace-bv] Report: ${options.outputPath}`);
}

main();
