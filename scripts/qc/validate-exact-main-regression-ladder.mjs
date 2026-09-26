#!/usr/bin/env node
/**
 * Exact-main regression ladder contract (U9 - R6.loop-harness).
 *
 * E2E-80 says that when a major authority, delivery, projection, rewind,
 * campaign or harness PR merges, the applicable staged three-context subset
 * SHALL rerun against exact main before the next dependent PR and SHALL
 * archive its result with the milestone. PK-e2e-80-ci-wiring ruled that
 * obligation into this qc contract rather than a workflow job, so
 * enforcement is procedural: the loop runs `npm run qc:exact-main-ladder`
 * and this module answers whether the archived evidence actually covers the
 * exact commit.
 *
 * The milestone ladder names its groups by their REGISTERED_GROUPS names and
 * never lists spec files. SPEC_BY_GROUP is not exported from
 * gm-two-player-campaign-core.cjs (it is a const inside buildRunPlan), and
 * that is deliberate here as well as unavoidable: the evolving `smoke`
 * subset grows one line per landed group INSIDE buildRunPlan, so a contract
 * that repeated the spec list would go stale the day the subset grows.
 *
 * Everything here fails closed. A receipt line this parser cannot read
 * yields no groups rather than a pass, and a group counts as covered only
 * on the exact sha, from a receipt whose verdict is the passing word its
 * shape requires, with nothing failed and something passed.
 *
 * U9b narrows one thing only: what `--rerun` reads back from the runner it
 * just spawned. Receipts are still read by parseReceiptGroups; the runner's
 * own stdout is read by parseRunnerOutput, which reads Playwright's bare
 * summary, because the runner inherits Playwright's stdio and prints no
 * `<group>:` label (FN-u9-rerun-parser-expects-labeled-line). U39 makes that
 * reader fail closed: output with two or more summary blocks, or with any
 * column-0 `<group>:` line, is rejected and can never become coverage.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { waitForIdle } from './machine-idle.mjs';

const moduleRequire = createRequire(import.meta.url);
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const DEFAULT_EVIDENCE_DIR = path.join(
  repoRoot,
  'openspec/planning/2026-09-12-roadmap-completion/evidence',
);
const DEFAULT_ARCHIVE_DIR = path.join(
  repoRoot,
  '.sisyphus/roadmap-completion-20260912/exact-main-ladder',
);
const LADDER_RUNNER = path.join(
  repoRoot,
  'scripts/qc/run-gm-two-player-campaign.mjs',
);

/** The three E2E-80 milestones, lowest rung first. */
export const MILESTONE_LADDER = Object.freeze([
  Object.freeze({
    milestone: 'fixture-isolation',
    groups: Object.freeze(['fixture-smoke']),
  }),
  Object.freeze({
    milestone: 'membership',
    groups: Object.freeze(['membership-smoke']),
  }),
  Object.freeze({
    milestone: 'strict-smoke',
    groups: Object.freeze(['smoke']),
  }),
]);

const SHA = /^[0-9a-f]{40}$/;
const GROUP_NAME = /^[a-z0-9][a-z0-9-]*$/;
/** `<group>:` must open the line; the counts may sit anywhere after it. */
const GROUP_LINE = /^([a-z0-9][a-z0-9-]*):\s+(.*)$/;

const invalid = (detail) => new Error(`INVALID_ARGUMENT: ${detail}`);
const isCount = (value) => Number.isInteger(value) && value >= 0;

/**
 * The highest milestone every one of whose groups the runner registers.
 * Null when even the lowest rung's group is absent, which is a registry a
 * three-context ladder cannot run at all.
 */
export function resolveMilestone({ registeredGroups } = {}) {
  const names = new Set(
    Array.isArray(registeredGroups)
      ? registeredGroups
      : Object.keys(registeredGroups ?? {}),
  );
  for (let rung = MILESTONE_LADDER.length - 1; rung >= 0; rung--)
    if (MILESTONE_LADDER[rung].groups.every((group) => names.has(group)))
      return MILESTONE_LADDER[rung].milestone;
  return null;
}

/**
 * Group results from a loop main-proof receipt's `runtime.playwright` text,
 * or straight from this contract's own archive receipt's `groups` array.
 * Both observed receipt spellings are covered: "conflict-pack:   2 passed
 * (7.6s)" (U7) and "authority: 3 failed / 17 passed" (U3). A line with no
 * `N passed` count, or a prefix that is not a single group token, yields
 * nothing - an unreadable receipt is never a pass.
 */
export function parseReceiptGroups(receipt) {
  if (!receipt || typeof receipt !== 'object') return [];
  if (Array.isArray(receipt.groups))
    return receipt.groups.flatMap((row) =>
      typeof row?.group === 'string' &&
      GROUP_NAME.test(row.group) &&
      isCount(row.passed) &&
      isCount(row.failed)
        ? [{ group: row.group, passed: row.passed, failed: row.failed }]
        : [],
    );
  const text = receipt.runtime?.playwright;
  if (typeof text !== 'string') return [];
  return text.split(/\r?\n/).flatMap((line) => {
    const named = GROUP_LINE.exec(line);
    const passed = named && /(\d+) passed/.exec(named[2]);
    if (!passed) return [];
    const failed = /(\d+) failed/.exec(named[2]);
    return [
      {
        group: named[1],
        passed: Number(passed[1]),
        failed: failed ? Number(failed[1]) : 0,
      },
    ];
  });
}

/**
 * Playwright's own end-of-run summary, as its list and line reporters print
 * it: leading spaces, a count, one of six outcome words, and - for `passed`
 * only - a parenthesised duration. Nothing may follow but that duration, so
 * a line that merely contains a number and a word ("Running 3 tests using 1
 * worker") is not a summary.
 *
 * The six words are every count-of-tests token generateSummaryMessage can
 * push (playwright/lib/reporters/base.js, 1.57.0). `interrupted` was missing
 * here until U9b's revision 2: a run with some interrupted tests, some
 * passes and no explicit `failed` line printed a word this pattern rejected,
 * so the row was dropped and the run read as clean coverage - a false
 * SATISFIED, the one direction this contract must never fail in.
 */
const PLAYWRIGHT_SUMMARY =
  /^ *(\d+) (passed|failed|flaky|skipped|did not run|interrupted)(?: \([^)]*\))? *$/;

/**
 * The one summary token generateSummaryMessage prints that counts ERRORS
 * rather than tests: a fatal error raised outside any test, spelled "1 error
 * was not a part of any test, see above for details" for one and "N errors
 * were not ..." for more. Playwright pushes it only when at least one test
 * ran, so it rides directly behind a clean `N passed` line - the same
 * false-coverage shape as an interruption, and counted the same way.
 */
const PLAYWRIGHT_FATAL_ERRORS =
  /^ *(\d+) errors? (?:was|were) not a part of any test, see above for details *$/;

/**
 * The order generateSummaryMessage pushes its tokens in (base.js, 1.57.0),
 * each at most once per summary; `errors` stands for the fatal-error token.
 */
const SUMMARY_ORDER = Object.freeze([
  'failed',
  'interrupted',
  'flaky',
  'skipped',
  'did not run',
  'passed',
  'errors',
]);

/**
 * What the runner just proved about the ONE group it was asked to run, read
 * from Playwright's bare summary. Attributing that summary to the group is
 * sound only because runGroup spawns the runner once per group, so the
 * output holds exactly one run - which is why it fails closed (U39) on
 * anything that says otherwise, returning 0/0 plus a `rejected` reason:
 *
 * - `two-summary-blocks`: a token whose word does not come strictly after
 *   the previous token's word in SUMMARY_ORDER can only open a second block
 *   (a second run, or a runner that retried the group); adding the blocks
 *   together once turned two runs into one clean-looking row.
 * - `column-0-group-line`: a line opening with `<group>:`. The real runner
 *   prints no label (it inherits Playwright's stdio; U9's finding
 *   FN-u9-rerun-parser-expects-labeled-line), so such a line is a runner
 *   stating its own verdict, which is not read as one.
 *
 * `flaky`, `did not run`, `interrupted` and a fatal error outside any test
 * all count as FAILED. A row that went green only on retry, a row an aborted
 * run never executed, a test a worker crash cut short, and an error no test
 * owns are each short of "ran clean against this exact commit", which is the
 * only thing E2E-80 accepts. `skipped` counts as neither: a declared skip is
 * not a failure and must not zero out a real pass. Output with no summary
 * line at all stays 0/0 and can never become coverage.
 */
export function parseRunnerOutput({ group, output } = {}) {
  const rejected = (reason) => ({
    group,
    passed: 0,
    failed: 0,
    rejected: reason,
  });
  let passed = 0;
  let failed = 0;
  let lastRank = -1;
  for (const line of String(output ?? '').split(/\r?\n/)) {
    if (GROUP_LINE.test(line)) return rejected('column-0-group-line');
    // The fatal-error token is checked first because it is not an outcome
    // word at all: the summary pattern could not read it, and leaving it to
    // fall through would silently discard it the way `interrupted` was.
    const fatal = PLAYWRIGHT_FATAL_ERRORS.exec(line);
    const summary = fatal ? null : PLAYWRIGHT_SUMMARY.exec(line);
    if (!fatal && !summary) continue;
    const word = fatal ? 'errors' : summary[2];
    const rank = SUMMARY_ORDER.indexOf(word);
    if (rank <= lastRank) return rejected('two-summary-blocks');
    lastRank = rank;
    const count = Number((fatal ?? summary)[1]);
    if (word === 'passed') passed += count;
    else if (word !== 'skipped') failed += count;
  }
  return { group, passed, failed };
}

/**
 * Whether the archived evidence covers the milestone's groups on this exact
 * commit. A group is covered only by a receipt whose mergeCommit (or, for an
 * archive receipt, sha) equals the sha character for character, whose
 * verdict is PASS, with failed === 0 and passed > 0 for that group.
 */
export function evaluateExactMain({ sha, milestone, receipts } = {}) {
  const rung = MILESTONE_LADDER.find((row) => row.milestone === milestone);
  if (!rung) throw invalid(`milestone=${String(milestone)}`);
  if (typeof sha !== 'string' || !SHA.test(sha))
    throw invalid(`sha=${String(sha)}`);
  const required = [...rung.groups];
  const covered = [];
  for (const receipt of Array.isArray(receipts) ? receipts : []) {
    // A loop main-proof receipt must say PASS; this contract's own archive
    // receipt must say SATISFIED. Each shape is held to its own word, so a
    // main proof marked SATISFIED and an archive marked PASS both fall out.
    if (
      receipt?.verdict !==
      (Array.isArray(receipt?.groups) ? 'SATISFIED' : 'PASS')
    )
      continue;
    if ((receipt.mergeCommit ?? receipt.sha) !== sha) continue;
    for (const row of parseReceiptGroups(receipt))
      if (
        required.includes(row.group) &&
        row.failed === 0 &&
        row.passed > 0 &&
        !covered.includes(row.group)
      )
        covered.push(row.group);
  }
  const missing = required.filter((group) => !covered.includes(group));
  return {
    verdict: missing.length === 0 ? 'SATISFIED' : 'MISSING',
    sha,
    milestone,
    required,
    covered,
    missing,
  };
}

/** A file that is not readable JSON is not a receipt, and never coverage. */
function readJsonOrNull(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function readReceipts(directories) {
  return directories.flatMap((directory) =>
    (fs.existsSync(directory) ? fs.readdirSync(directory) : [])
      .filter((name) => name.endsWith('.json'))
      .map((name) => readJsonOrNull(path.join(directory, name)))
      .filter((receipt) => receipt !== null),
  );
}

function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`GIT_FAILED: git ${args.join(' ')}`);
  return result.stdout.trim();
}

/** The default runner: the ladder runner this unit consumes, unchanged. */
const defaultRunnerCommand = (group) => ({
  command: process.execPath,
  args: [LADDER_RUNNER, `--group=${group}`],
});

/**
 * One ladder group, its combined stdout and stderr teed into a log file
 * under the archive dir. The output is read by parseRunnerOutput, which
 * reads Playwright's bare summary - the only thing the real ladder runner
 * ever prints - and rejects two summary blocks or a column-0 `<group>:`
 * line; a rejected row is archived as 0/0 with its `rejected` reason.
 */
function runGroup({ group, archiveDir, runnerCommand }) {
  const { command, args } = runnerCommand(group);
  const logFile = path.join(archiveDir, `${group}.log`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        output += chunk;
      });
    }
    child.once('error', reject);
    child.once('close', () => {
      fs.writeFileSync(logFile, output);
      const row = parseRunnerOutput({ group, output });
      resolve({
        // A run whose output carried no readable summary is recorded as
        // nothing passed, so it cannot become coverage.
        group,
        passed: row.passed,
        failed: row.failed,
        ...(row.rejected ? { rejected: row.rejected } : {}),
        logSha256: createHash('sha256').update(output).digest('hex'),
      });
    });
  });
}

const verdictLine = (outcome) =>
  outcome.verdict === 'SATISFIED'
    ? `EXACT_MAIN_LADDER_SATISFIED ${outcome.sha} milestone=${outcome.milestone} groups=${outcome.covered.join(',')}`
    : `EXACT_MAIN_LADDER_MISSING ${outcome.sha} milestone=${outcome.milestone} missing=${outcome.missing.join(',')}`;

/**
 * The CLI body. `runnerCommand` and `idleWait` are injectable so the pin can
 * exercise the rerun branch without launching Playwright; their defaults are
 * the real ladder runner and the real U11 machine-idle wait, and there is no
 * flag that skips either.
 */
export async function runExactMainLadder({
  sha,
  evidenceDir = DEFAULT_EVIDENCE_DIR,
  archiveDir = DEFAULT_ARCHIVE_DIR,
  rerun = false,
  head,
  registeredGroups,
  runnerCommand = defaultRunnerCommand,
  idleWait = waitForIdle,
  now = () => new Date(),
} = {}) {
  if (rerun) {
    const current = head ?? git(['rev-parse', 'HEAD']);
    if (current !== sha)
      return {
        exitCode: 2,
        lines: [`EXACT_MAIN_LADDER_REFUSED head-mismatch ${current}`],
      };
  }
  const registry =
    registeredGroups ??
    moduleRequire('./gm-two-player-campaign-core.cjs').REGISTERED_GROUPS;
  const milestone = resolveMilestone({ registeredGroups: registry });
  if (!milestone) throw invalid('registry carries no ladder milestone');
  const receipts = readReceipts([evidenceDir, archiveDir]);
  const before = evaluateExactMain({ sha, milestone, receipts });
  if (!rerun || before.verdict === 'SATISFIED')
    return {
      exitCode: before.verdict === 'SATISFIED' ? 0 : 1,
      lines: [verdictLine(before)],
    };

  fs.mkdirSync(archiveDir, { recursive: true });
  await idleWait();
  const groups = [];
  for (const group of before.missing)
    groups.push(await runGroup({ group, archiveDir, runnerCommand }));
  const at = now().toISOString();
  // The candidate carries the SATISFIED word its shape requires so that the
  // evaluation reads its rows at all; whether it covers anything is still
  // decided by those rows (failed === 0 and passed > 0 on the exact sha).
  const candidate = { sha, milestone, at, groups, verdict: 'SATISFIED' };
  const after = evaluateExactMain({
    sha,
    milestone,
    receipts: [...receipts, candidate],
  });
  const archived = { ...candidate, verdict: after.verdict };
  fs.writeFileSync(
    path.join(
      archiveDir,
      `exact-main-ladder-${sha.slice(0, 12)}-${at.slice(0, 10)}.json`,
    ),
    `${JSON.stringify(archived, null, 2)}\n`,
  );
  return {
    exitCode: after.verdict === 'SATISFIED' ? 0 : 1,
    lines: [verdictLine(after)],
  };
}

function parseArguments(args) {
  const options = { rerun: false };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--rerun') {
      options.rerun = true;
      continue;
    }
    const value = args[++index];
    if (value === undefined) throw invalid(flag);
    if (flag === '--sha') {
      if (!SHA.test(value)) throw invalid(`--sha ${value}`);
      options.sha = value;
    } else if (flag === '--evidence-dir')
      options.evidenceDir = path.resolve(value);
    else if (flag === '--archive-dir') options.archiveDir = path.resolve(value);
    else throw invalid(flag);
  }
  return options;
}

async function main(args) {
  try {
    const options = parseArguments(args);
    if (!options.sha) {
      git(['fetch', '--quiet']);
      options.sha = git(['rev-parse', 'origin/main']);
    }
    const { exitCode, lines } = await runExactMainLadder(options);
    for (const line of lines) console.log(line);
    process.exitCode = exitCode;
  } catch (error) {
    console.log(`EXACT_MAIN_LADDER_ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main(process.argv.slice(2));
