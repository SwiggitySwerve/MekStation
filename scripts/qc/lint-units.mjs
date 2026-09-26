#!/usr/bin/env node
/**
 * Unit lint target (U14, widened by U40 — R6.loop-harness). The root oxlint
 * config ignores `e2e/**`, `**\/scripts/**`, `src/pages/api/**` and the test
 * files, so `npm run lint` is silent about those trees and every unit receipt
 * that cited it was citing a vacuous gate for them. This wrapper lints those
 * paths against the root rule set (carried verbatim by
 * scripts/qc/oxlint-units.json) and ratchets each path's finding count and
 * the total against scripts/qc/lint-units.ceiling.json; a path that lints
 * zero files fails. It fixes nothing: it stops the counts from growing.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const UNITS_CONFIG = path.join(moduleDirectory, 'oxlint-units.json');
const CEILING_FILE = path.join(moduleDirectory, 'lint-units.ceiling.json');
/**
 * The paths linted by default, each hidden from `npm run lint` by the root
 * config's ignorePatterns. The perPath ceilings in lint-units.ceiling.json
 * are the counts measured on 2026-09-26 at 738e5466f: e2e 50 findings
 * (194 files), scripts 50 (186), src/pages/api 16 (97), src-tests 17782
 * (3203).
 */
const DEFAULT_PATHS = ['e2e', 'scripts', 'src/pages/api', 'src-tests'];

/**
 * Paths that are labels rather than directories. 'src-tests' is the src
 * files the root config ignores as tests: it lints src through
 * lint-units-src-tests.ignore. The ignore file is passed cwd-relative
 * because, measured on oxlint 1.43.0, the relative path lints all 3203
 * test files while the absolute path lints 2670 (its `**\/__tests__/**`
 * negation stops matching); `--ignore-pattern` negation lints none.
 */
const LINT_ARGS_BY_PATH = {
  'src-tests': [
    '--ignore-path',
    path.relative(
      process.cwd(),
      path.join(moduleDirectory, 'lint-units-src-tests.ignore'),
    ),
    'src',
  ],
};

/**
 * The single rule difference from the root set. scripts/ is a tree of CLIs
 * that print by design, so a ceiling dominated by no-console there measures
 * nothing (302 of the 352 raw scripts findings at the baseline). The
 * allowance lives here rather than in an `overrides` entry because oxlint
 * 1.43.0 matches override `files` globs relative to the config file's own
 * directory: from scripts/qc/oxlint-units.json a `**\/scripts/**` override
 * misses every file in scripts/qc itself (measured: 277 of 302 no-console
 * findings survived it), and a glob wide enough to reach them also silences
 * e2e. e2e keeps no-console exactly as the root config sets it.
 */
const ALLOWED_RULES_BY_PATH = { scripts: ['no-console'] };

const assert = (condition, name) => {
  if (!condition) throw new Error(`INVALID_ARGUMENT: ${name}`);
};
const isCount = (value) => Number.isInteger(value) && value >= 0;

/**
 * One oxlint argv per path. The charter sketched a single argv over both
 * paths; measured on oxlint 1.43.0, passing two paths to one invocation is
 * non-deterministic (three runs of `e2e scripts` walked 858, 170 and 170
 * files — the 170-file runs dropped e2e entirely, which is how the first
 * admission probe recorded e2e = 0). One path per invocation is stable.
 */
export function buildLintUnitsArgs({ paths, config, ceiling }) {
  assert(
    Array.isArray(paths) &&
      paths.length > 0 &&
      paths.every((target) => typeof target === 'string' && target !== ''),
    'paths',
  );
  assert(typeof config === 'string' && config !== '', 'config');
  assert(isCount(ceiling), 'ceiling');
  return paths.map((target) => [
    '--config',
    config,
    '--format',
    'json',
    ...(ALLOWED_RULES_BY_PATH[target] ?? []).flatMap((rule) => [
      '--allow',
      rule,
    ]),
    ...(LINT_ARGS_BY_PATH[target] ?? [target]),
  ]);
}

/**
 * A path row fails when it linted zero files or its findings exceed its own
 * perPath ceiling; a row with no ceiling of its own has no per-path limit.
 */
const pathFails = (row) =>
  row.files === 0 || (row.ceiling !== undefined && row.findings > row.ceiling);

/**
 * The ratchet itself: FAIL when the total findings exceed the total ceiling
 * or any path row fails (pathFails); `failures` names each broken gate.
 */
export function evaluateLintUnits({ findings, ceiling, paths = [] }) {
  assert(isCount(findings), 'findings');
  assert(isCount(ceiling), 'ceiling');
  const failures = paths
    .filter(pathFails)
    .map((row) => `${row.path} files=${row.files} findings=${row.findings}`);
  if (findings > ceiling) failures.push(`total ${findings}/${ceiling}`);
  return {
    verdict: failures.length ? 'FAIL' : 'PASS',
    findings,
    ceiling,
    failures,
  };
}

/** The recorded ceiling, refusing a file whose total contradicts its parts. */
export function readCeilingFile(file = CEILING_FILE) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const perPath = parsed.perPath ?? {};
  const counts = Object.values(perPath);
  assert(counts.length > 0 && counts.every(isCount), 'perPath');
  assert(
    parsed.ceiling === counts.reduce((sum, count) => sum + count, 0),
    'ceiling does not equal the sum of perPath',
  );
  return parsed;
}

/** Resolve the installed oxlint binary without going through npx. */
function oxlintBinary() {
  const entry = createRequire(import.meta.url).resolve('oxlint');
  return path.join(path.dirname(entry), '..', 'bin', 'oxlint');
}

/**
 * Run one oxlint invocation and return { files, diagnostics } from its JSON
 * report. oxlint exits 1 merely because findings exist, so the exit code is
 * not the signal; unparseable output is, and it fails closed rather than
 * counting zero.
 */
function runOxlint(argv) {
  const result = spawnSync(process.execPath, [oxlintBinary(), ...argv], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `oxlint produced no JSON report (exit ${result.status}): ${(result.stderr || result.stdout).trim().split('\n')[0] ?? ''}`,
    );
  }
  if (!Array.isArray(report.diagnostics) || !isCount(report.number_of_files))
    throw new Error('oxlint report carried no diagnostics or file count');
  return { files: report.number_of_files, diagnostics: report.diagnostics };
}

/** `--path` is repeatable; `--ceiling` overrides the recorded ceiling. */
function parseArgs(args) {
  const paths = [];
  let ceiling;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    assert(flag === '--path' || flag === '--ceiling', flag);
    const value = args[++index];
    assert(value !== undefined, `${flag} value`);
    if (flag === '--path') paths.push(value);
    else {
      assert(/^\d+$/.test(value), '--ceiling value');
      ceiling = Number(value);
    }
  }
  return { paths: paths.length ? paths : DEFAULT_PATHS, ceiling };
}

/**
 * Lint each path, print one LINT_UNITS_PATH line per path (files, findings,
 * its perPath ceiling or `none`, PASS|FAIL), then the verdict. On FAIL the
 * finding rows of the failing paths are printed, or of every path when only
 * the total failed.
 */
function main(args) {
  try {
    const options = parseArgs(args);
    const recorded = readCeilingFile();
    const ceiling = options.ceiling ?? recorded.ceiling;
    const argvs = buildLintUnitsArgs({
      paths: options.paths,
      config: UNITS_CONFIG,
      ceiling,
    });
    const rows = argvs.map((argv, index) => {
      const target = options.paths[index];
      const { files, diagnostics } = runOxlint(argv);
      const row = {
        path: target,
        files,
        findings: diagnostics.length,
        ceiling: recorded.perPath[target],
        diagnostics,
      };
      console.log(
        `LINT_UNITS_PATH ${target} files=${files} findings=${row.findings} ceiling=${row.ceiling ?? 'none'} ${pathFails(row) ? 'FAIL' : 'PASS'}`,
      );
      return row;
    });
    const outcome = evaluateLintUnits({
      findings: rows.reduce((sum, row) => sum + row.findings, 0),
      ceiling,
      paths: rows,
    });
    const failing = rows.filter(pathFails);
    if (outcome.verdict === 'FAIL')
      for (const row of (failing.length ? failing : rows).flatMap(
        (entry) => entry.diagnostics,
      )) {
        const span = row.labels?.[0]?.span;
        console.log(
          `LINT_UNITS_ROW ${row.code} ${row.filename}:${span?.line ?? 0}:${span?.column ?? 0}`,
        );
      }
    console.log(
      `LINT_UNITS_${outcome.verdict} ${outcome.findings}/${outcome.ceiling}`,
    );
    process.exitCode = outcome.verdict === 'PASS' ? 0 : 1;
  } catch (error) {
    console.log(`LINT_UNITS_ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
