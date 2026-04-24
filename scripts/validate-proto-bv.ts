#!/usr/bin/env npx tsx
/**
 * ProtoMech BV Parity Validation CLI
 *
 * Emits a parity report comparing MekStation's proto BV calculator against
 * canonical MegaMekLab / MUL proto BV values.
 *
 * Status: DEFERRED until a proto MUL cache lands under
 *   public/data/units/protomechs/ (or equivalent).
 *
 * When the cache is absent, this script still emits a well-formed
 * `validation-output/protomech-bv-validation-report.json` with
 * `status: "deferred"` so downstream CI and the OpenSpec verifier can
 * confirm the parity-harness task is wired (task 7.3) even though the
 * comparison itself is deferred.
 *
 * Usage:
 *   npx tsx scripts/validate-proto-bv.ts [options]
 *
 * Options:
 *   --proto-cache <path>  Path to proto MUL cache directory
 *                         (default: public/data/units/protomechs)
 *   --output <path>       Output path for the JSON report
 *                         (default: validation-output/protomech-bv-validation-report.json)
 *   --help                Show this help message
 *
 * @spec openspec/changes/add-protomech-battle-value/tasks.md §7 Parity Harness
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CLI arg parsing
// =============================================================================

interface CLIOptions {
  protoCachePath: string;
  outputPath: string;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    protoCachePath: path.resolve(process.cwd(), 'public/data/units/protomechs'),
    outputPath: path.resolve(
      process.cwd(),
      'validation-output/protomech-bv-validation-report.json',
    ),
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--proto-cache':
        options.protoCachePath = path.resolve(
          args[++i] || 'public/data/units/protomechs',
        );
        break;
      case '--output':
        options.outputPath = path.resolve(
          args[++i] || 'validation-output/protomech-bv-validation-report.json',
        );
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        // Ignore unknown args — this is a stub harness.
        break;
    }
  }

  return options;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
ProtoMech BV Parity Validation (stub / deferred)

Usage:
  npx tsx scripts/validate-proto-bv.ts [options]

Options:
  --proto-cache <path>  Path to proto MUL cache directory
                        (default: public/data/units/protomechs)
  --output <path>       Output JSON report path
  --help, -h            Show this help message

Behaviour:
  If the proto MUL cache directory is missing or empty, a deferred-status
  report is written so CI and the OpenSpec verifier can confirm the
  parity harness entry point is wired.

Spec:
  openspec/changes/add-protomech-battle-value/tasks.md §7.3
`);
}

// =============================================================================
// Report shape
// =============================================================================

/**
 * Parity report shape. Downstream tools (analysis scripts, dashboards) should
 * key off `status` to decide whether to surface the `protos` / `stats` arrays.
 */
interface ProtoParityReport {
  /** Report schema version. Bump when the shape changes. */
  readonly schemaVersion: number;
  /** Status marker — `deferred` means no comparison was run. */
  readonly status: 'deferred' | 'ok' | 'error';
  /** Human-readable reason for the current status. */
  readonly reason: string;
  /** ISO timestamp when the report was generated. */
  readonly generatedAt: string;
  /** Individual proto parity rows (empty when status !== 'ok'). */
  readonly protos: ReadonlyArray<ProtoParityRow>;
  /** Optional aggregate stats (populated only when status === 'ok'). */
  readonly stats?: {
    readonly total: number;
    readonly matches: number;
    readonly withinOnePercent: number;
    readonly withinFivePercent: number;
  };
}

interface ProtoParityRow {
  readonly id: string;
  readonly name: string;
  readonly canonicalBV: number;
  readonly calculatedBV: number;
  readonly delta: number;
  readonly deltaPercent: number;
}

// =============================================================================
// Main
// =============================================================================

/**
 * Attempt to read a proto MUL cache. Returns `undefined` when the path
 * doesn't exist or contains no cache file — both of which map onto the
 * "deferred" report path.
 */
function loadProtoCache(cachePath: string): unknown[] | undefined {
  if (!fs.existsSync(cachePath)) return undefined;

  const stat = fs.statSync(cachePath);
  // Directory layout (expected future shape): per-proto JSON files under
  // `public/data/units/protomechs/`. If the directory exists but is empty,
  // we still treat this as "deferred" so the harness doesn't silently
  // report 0 matches as success.
  if (stat.isDirectory()) {
    const entries = fs
      .readdirSync(cachePath)
      .filter((f) => f.toLowerCase().endsWith('.json'));
    if (entries.length === 0) return undefined;
    return entries.map((f) =>
      JSON.parse(fs.readFileSync(path.join(cachePath, f), 'utf8')),
    );
  }

  // Single JSON file pointing at an array of protos.
  if (stat.isFile() && cachePath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : undefined;
  }

  return undefined;
}

function writeReport(outputPath: string, report: ProtoParityReport): void {
  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
}

function main(): void {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const generatedAt = new Date().toISOString();
  const cache = loadProtoCache(options.protoCachePath);

  if (cache === undefined) {
    // Emit the deferred stub. The OpenSpec verifier relies on the presence
    // of this file to confirm task 7.3 is wired; downstream tools read
    // `status` before using `protos` / `stats`.
    const report: ProtoParityReport = {
      schemaVersion: 1,
      status: 'deferred',
      reason: 'proto MUL cache not yet available',
      generatedAt,
      protos: [],
    };
    writeReport(options.outputPath, report);
    // eslint-disable-next-line no-console
    console.log(
      `[validate-proto-bv] Emitted deferred report at ${options.outputPath} ` +
        `(proto MUL cache missing at ${options.protoCachePath}).`,
    );
    return;
  }

  // When the proto MUL cache lands, wire the real comparison in place of
  // this error branch. Until then, having the cache directory present but
  // unexpectedly shaped is a loud failure.
  const report: ProtoParityReport = {
    schemaVersion: 1,
    status: 'error',
    reason:
      'proto MUL cache present but parity comparison not yet implemented — ' +
      'follow-up pending once task 7.1/7.2 are materialised',
    generatedAt,
    protos: [],
  };
  writeReport(options.outputPath, report);
  // eslint-disable-next-line no-console
  console.warn(
    `[validate-proto-bv] Proto cache found but comparison unimplemented — ` +
      `wrote error-status report at ${options.outputPath}.`,
  );
}

main();
