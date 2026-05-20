#!/usr/bin/env node
/**
 * Phase-1 Smoke Matrix driver
 *
 * Runs every config in this directory (10 seeds each by default), captures
 * the per-config swarm-output.json under playtest/swarm-runs/smoke/, and
 * emits a single aggregate summary at the end:
 *
 *   - runs / wins / draws / incompletes per config
 *   - invariants by name and severity, totaled across the matrix
 *   - anomalies (detector hits) by detector type
 *   - configs with any critical-halt
 *
 * Stays deliberately read-only against the OpenSpec-system code; the only
 * side effect is writing the per-config swarm-output.json files under
 * playtest/swarm-runs/smoke/ (gitignored).
 *
 * Usage:
 *   node scripts/swarm-configs/smoke/run-matrix.js               # full matrix
 *   node scripts/swarm-configs/smoke/run-matrix.js --runs=5      # cheaper sweep
 *   node scripts/swarm-configs/smoke/run-matrix.js --seed=42     # override seed
 *
 * PT-Phase 1 of `~/.claude/plans/snappy-sprouting-giraffe.md`.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SMOKE_DIR = path.join(__dirname);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'playtest', 'swarm-runs', 'smoke');

function parseArgs() {
  const args = process.argv.slice(2);
  let runs = null; // null = let the config decide
  let seed = null;
  for (const arg of args) {
    if (arg.startsWith('--runs=')) runs = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--seed=')) seed = parseInt(arg.split('=')[1], 10);
  }
  return { runs, seed };
}

function listConfigs() {
  return fs
    .readdirSync(SMOKE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function runConfig(cfgName, args) {
  const cfgPath = path.join(SMOKE_DIR, cfgName);
  const outDir = path.join(OUTPUT_ROOT, cfgName.replace(/\.json$/, ''));
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'swarm-output.json');

  const cli = [
    'tsx',
    'scripts/run-simulation.ts',
    `--config=${cfgPath}`,
    `--output=${outFile}`,
  ];
  if (args.runs != null) cli.push(`--runs=${args.runs}`);
  if (args.seed != null) cli.push(`--seed=${args.seed}`);

  const start = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    stdout = execFileSync('npx', cli, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }).toString();
  } catch (err) {
    // The runner exits with code 1 whenever any run records violations.
    // That's a normal outcome for the smoke matrix — anomalies are
    // findings, not run failures. Treat the run as "ok" if the output
    // file was written; the parser below decides for sure.
    exitCode = err.status ?? 1;
    stdout = String(err.stdout ?? '');
    stderr = String(err.stderr ?? '');
  }

  // Parse output JSON for the summary. If the file is absent or unparseable
  // (e.g. BudgetUnsatisfiableError before any runs landed), surface that as
  // a real failure with the stderr+stdout tail so the cause is visible.
  let summary = null;
  if (!fs.existsSync(outFile)) {
    const tail =
      stderr.slice(-400) || stdout.slice(-400) || `exit ${exitCode}, no output`;
    return {
      cfgName,
      ok: false,
      ms: Date.now() - start,
      error: tail.trim(),
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    summary = summarizeRun(raw);
  } catch (err) {
    return {
      cfgName,
      ok: false,
      ms: Date.now() - start,
      error: `output-parse: ${String(err.message)}`,
    };
  }
  return { cfgName, ok: true, ms: Date.now() - start, exitCode, ...summary };
}

function summarizeRun(raw) {
  const runs = raw.runs ?? [];
  const winners = { player: 0, opponent: 0, draw: 0, other: 0 };
  const violationsByInvariant = {};
  const violationsBySeverity = {};
  const anomaliesByType = {};
  let critHalt = 0;
  for (const r of runs) {
    const w = r.winner ?? 'other';
    winners[w] = (winners[w] ?? 0) + 1;
    for (const v of r.violations ?? []) {
      violationsByInvariant[v.invariant] =
        (violationsByInvariant[v.invariant] ?? 0) + 1;
      violationsBySeverity[v.severity] =
        (violationsBySeverity[v.severity] ?? 0) + 1;
    }
    for (const a of r.anomalies ?? []) {
      anomaliesByType[a.type] = (anomaliesByType[a.type] ?? 0) + 1;
    }
    if (r.haltedByCriticalAnomaly) critHalt++;
  }
  return {
    totalRuns: runs.length,
    winners,
    violationsByInvariant,
    violationsBySeverity,
    anomaliesByType,
    critHalt,
    avgTurns: runs.reduce((s, r) => s + (r.turns ?? 0), 0) / (runs.length || 1),
  };
}

function emitAggregate(results, totalMs) {
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE-1 SMOKE MATRIX — aggregate summary');
  console.log('='.repeat(72));
  console.log(
    `  Configs: ${results.length} | OK: ${results.filter((r) => r.ok).length} | failed: ${results.filter((r) => !r.ok).length}`,
  );
  console.log(`  Wall-clock: ${(totalMs / 1000).toFixed(1)}s`);
  console.log('-'.repeat(72));

  // Per-config table
  const colWidths = [42, 6, 6, 6, 6, 6, 7];
  const header = ['config', 'runs', 'p-win', 'o-win', 'draw', 'crit', 'avgT'];
  console.log(header.map((h, i) => h.padEnd(colWidths[i])).join('| '));
  console.log('-'.repeat(72));
  for (const r of results) {
    if (!r.ok) {
      console.log(
        `${r.cfgName.padEnd(colWidths[0])}| FAILED: ${r.error.slice(0, 60)}`,
      );
      continue;
    }
    const row = [
      r.cfgName.padEnd(colWidths[0]),
      String(r.totalRuns).padEnd(colWidths[1]),
      String(r.winners.player).padEnd(colWidths[2]),
      String(r.winners.opponent).padEnd(colWidths[3]),
      String(r.winners.draw).padEnd(colWidths[4]),
      String(r.critHalt).padEnd(colWidths[5]),
      r.avgTurns.toFixed(1).padEnd(colWidths[6]),
    ];
    console.log(row.join('| '));
  }
  console.log('-'.repeat(72));

  // Aggregated violations + anomalies
  const totalViol = {};
  const totalSev = {};
  const totalAnom = {};
  let totalCrit = 0;
  let totalRuns = 0;
  for (const r of results) {
    if (!r.ok) continue;
    totalRuns += r.totalRuns;
    totalCrit += r.critHalt;
    for (const [k, v] of Object.entries(r.violationsByInvariant ?? {})) {
      totalViol[k] = (totalViol[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.violationsBySeverity ?? {})) {
      totalSev[k] = (totalSev[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.anomaliesByType ?? {})) {
      totalAnom[k] = (totalAnom[k] ?? 0) + v;
    }
  }
  console.log('\nAggregate over ' + totalRuns + ' total runs:');
  console.log('  Critical-halt runs:', totalCrit);
  console.log('  Violations by invariant:');
  for (const [k, v] of Object.entries(totalViol).sort((a, b) => b[1] - a[1]))
    console.log('   ', String(v).padStart(5), k);
  console.log('  Violations by severity:');
  for (const [k, v] of Object.entries(totalSev).sort((a, b) => b[1] - a[1]))
    console.log('   ', String(v).padStart(5), k);
  console.log('  Anomalies by type:');
  for (const [k, v] of Object.entries(totalAnom).sort((a, b) => b[1] - a[1]))
    console.log('   ', String(v).padStart(5), k);

  // Write a structured aggregate JSON for later triage
  const aggOut = path.join(OUTPUT_ROOT, 'aggregate.json');
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.writeFileSync(
    aggOut,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        totalMs,
        totalRuns,
        totalCriticalHalt: totalCrit,
        violationsByInvariant: totalViol,
        violationsBySeverity: totalSev,
        anomaliesByType: totalAnom,
        perConfig: results,
      },
      null,
      2,
    ),
  );
  console.log('\nAggregate JSON: ' + aggOut);
}

function main() {
  const args = parseArgs();
  const configs = listConfigs().filter((f) => f !== 'run-matrix.js'); // safety
  // README.md isn't a JSON config but listConfigs filters by .json, so it's
  // already excluded. Same for any non-json artifact.
  console.log(
    `Smoke matrix: ${configs.length} configs, ` +
      `${args.runs ?? 'config-default'} runs each, ` +
      `seed override = ${args.seed ?? 'none'}`,
  );
  const start = Date.now();
  const results = [];
  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    process.stdout.write(`[${i + 1}/${configs.length}] ${cfg} ... `);
    const r = runConfig(cfg, args);
    if (r.ok) {
      console.log(
        `OK (${(r.ms / 1000).toFixed(1)}s, ${r.totalRuns} runs, ` +
          `${Object.values(r.winners).reduce((a, b) => a + b, 0)} resolved)`,
      );
    } else {
      console.log(
        `FAILED (${(r.ms / 1000).toFixed(1)}s): ${r.error.slice(0, 100)}`,
      );
    }
    results.push(r);
  }
  emitAggregate(results, Date.now() - start);
}

main();
