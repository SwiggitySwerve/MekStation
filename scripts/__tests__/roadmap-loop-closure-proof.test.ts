/**
 * Pins for the loop's closure and main-proof generators (U17b - R6.loop-harness).
 *
 * U17 was split when its five product modules measured 1121 lines against a
 * 500-line cap: the fold, the park and the shared library shipped there (with
 * scripts/__tests__/roadmap-loop-scripts.test.ts), and
 * scripts/qc/roadmap-unit-closure.mjs and scripts/qc/roadmap-main-proof.mjs
 * were staged for this narrower successor with the cases that hold them.
 *
 * What it holds: the closure accepting a review that names a head other than
 * the PR head, or a review whose verdict is not a plain APPROVE, or a review
 * that does not say which model reviewed it, or writing verdict PASS when the
 * runtime line reports failures; the U13 log preservation call on both
 * verdicts; the refusal of --skip-blob-check against the repository's own
 * ledger; the --expected-reds, --extra-runtime and --reproof-commit switches;
 * and the main proof running anything at all when the checkout is not at the
 * merge commit or the tree is dirty.
 *
 * Everything runs against a temporary COPY of the ledger directory, placed
 * under openspec/planning/ so that the copied validate-roadmap.mjs still
 * resolves the real repository root three levels up, and against a fabricated
 * planned unit. The real ledger is never written by this file.
 *
 * gh and git: the closure's gh calls go to a fake `gh` on PATH that prints the
 * JSON the real gh prints for a merged PR, and its blob-equality check is
 * skipped through --skip-blob-check, which exists ONLY for this pin and which
 * the closure now refuses outright whenever the ledger it is acting on is the
 * repository's own. git itself is real: the closure runs with `--repo-root`
 * pointed at a throwaway repository this file builds, and the fake gh reports
 * that repository's HEAD as the merge commit, so parent counting is measured
 * rather than stubbed and no assertion depends on how the checkout under test
 * was made. An earlier revision used this checkout's own HEAD instead, which a
 * `pull_request` run of actions/checkout leaves at the two-parent
 * refs/pull/N/merge commit: the closure then correctly refused every case that
 * wants a PASS, because a squash merge has one parent. The main-proof cases
 * build their own repository for the same reason.
 *
 * The fold is used here only to seed a unit to local-verified; its own cases
 * live in U17's pin.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const qc = (name: string): string => path.join(repoRoot, 'scripts/qc', name);
const FOLD = qc('roadmap-unit-fold.mjs');
const CLOSURE = qc('roadmap-unit-closure.mjs');
const MAIN_PROOF = qc('roadmap-main-proof.mjs');

const LEDGER_NAME = '2026-09-12-roadmap-completion';
const SOURCE_LEDGER = path.join(repoRoot, 'openspec/planning', LEDGER_NAME);
const UNIT = 'U91';
const DATE = '20260917';
const BASELINE = 'a'.repeat(40);
const PR_HEAD = 'b'.repeat(40);
/**
 * Deliberately not the model the closure used to carry as a literal: a receipt
 * that still said 'claude-sonnet (Agent model: sonnet)' would fail the
 * reviewer-model case rather than pass it by coincidence.
 */
const REVIEWER = 'gpt-5.6-luna (Agent model: luna)';
const OLD_LITERAL = 'claude-sonnet (Agent model: sonnet)';

interface IRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface IStageReceipt {
  [key: string]: unknown;
}

interface IUnit {
  id: string;
  state: string;
  baseline: string | null;
  prHead: string | null;
  mergeSha: string | null;
  taskKeys: string[];
  stageReceipts: Record<string, IStageReceipt | null>;
  [key: string]: unknown;
}

interface ILedger {
  units: IUnit[];
  findings?: Record<string, unknown>[];
  [key: string]: unknown;
}

let tempLedger = '';
let pristineUnits = '';
let fakeBin = '';
/** The throwaway repository the closure cases treat as the merged checkout. */
let proofRepo = '';
let headSha = '';
let earlierSha = '';

/** One identity for every commit this file makes, so no machine's git config leaks in. */
const PIN_GIT_ENV = {
  GIT_AUTHOR_NAME: 'pin',
  GIT_AUTHOR_EMAIL: 'pin@example.invalid',
  GIT_COMMITTER_NAME: 'pin',
  GIT_COMMITTER_EMAIL: 'pin@example.invalid',
};

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const ledgerUnits = (): ILedger =>
  readJson<ILedger>(path.join(tempLedger, 'units.json'));
const unitOf = (id: string): IUnit => {
  const found = ledgerUnits().units.find((unit) => unit.id === id);
  if (!found) throw new Error(`no unit ${id}`);
  return found;
};

/** Run one of the generators with a PATH that puts the fake gh first. */
function run(
  script: string,
  args: string[],
  cwd = repoRoot,
  extraEnv: Record<string, string> = {},
): IRun {
  const separator = process.platform === 'win32' ? ';' : ':';
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${fakeBin}${separator}${process.env.PATH}`,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const git = (args: string[], cwd: string): string =>
  spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim();

/** Commit everything in `repo` under the pin's identity. */
function commitAll(repo: string, message: string): void {
  spawnSync('git', ['add', '-A'], { cwd: repo });
  spawnSync('git', ['commit', '-q', '-m', message], {
    cwd: repo,
    env: { ...process.env, ...PIN_GIT_ENV },
  });
}

/**
 * The exit code alone says nothing about WHY a closure refused, so a CI failure
 * on a machine nobody can reach names the refusal instead of printing `1`.
 */
function expectClosureOk(result: IRun): void {
  if (result.status !== 0)
    throw new Error(
      `closure exited ${result.status}, expected 0\n--- stderr ---\n${result.stderr}\n--- stdout ---\n${result.stdout}`,
    );
}

/** The fabricated planned unit the generators are pointed at. */
function seedPlannedUnit(): void {
  const ledger = readJson<ILedger>(path.join(tempLedger, 'units.json'));
  ledger.units = ledger.units.filter((unit) => unit.id !== UNIT);
  ledger.units.push({
    id: UNIT,
    node: 'R6.loop-harness',
    taskKeys: [],
    behavior: 'Fabricated unit used only by the U17 pin.',
    ownershipPaths: ['scripts/qc'],
    ciClass: 'product',
    reviewClasses: ['routine'],
    caps: { maxFiles: 15, maxNonGeneratedLines: 500 },
    state: 'planned',
    baseline: null,
    prHead: null,
    mergeSha: null,
    stageReceipts: {
      admission: null,
      red: null,
      local: null,
      review: null,
      merge: null,
      mainProof: null,
      tick: null,
    },
    ownerGate: null,
  });
  writeJson(path.join(tempLedger, 'units.json'), ledger);
}

/** The three lane receipts the fold reads, in the shapes the lanes write. */
function seedLaneReceipts(localStatus = 'ready'): string {
  const evidence = path.join(tempLedger, 'evidence');
  writeJson(path.join(evidence, `u91-admission-${DATE}.json`), {
    unit: UNIT,
    stage: 'admission',
    at: '2026-09-17T10:00:00Z',
    baseline: BASELINE,
  });
  writeJson(path.join(evidence, `u91-red-${DATE}.json`), {
    unit: UNIT,
    stage: 'red',
    at: '2026-09-17T10:10:00Z',
    baseline: BASELINE,
  });
  writeJson(path.join(evidence, `u91-local-${DATE}.json`), {
    unit: UNIT,
    stage: 'local',
    at: '2026-09-17T10:20:00Z',
    baseline: BASELINE,
    status: localStatus,
  });
  return evidence;
}

function foldArgs(evidence: string): string[] {
  return [
    '--unit',
    UNIT,
    '--date',
    DATE,
    '--receipts-dir',
    evidence,
    '--red-summary',
    'pin written first: 3 failed with the module missing',
    '--local-summary',
    'implementation green; gates recorded',
    '--ledger-dir',
    tempLedger,
  ];
}

/** A proof log directory shaped like the ones the shell ladders produced. */
function seedProofDir(playwrightLine: string): string {
  const dir = path.join(tempLedger, 'proof-run');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const logs: Record<string, string> = {
    'build.log': 'Compiled successfully\nexit 0\n',
    'playwright.log': `${playwrightLine}\nexit 0\n`,
    'tsc.log': 'exit 0\n',
    'validator.log': 'ROADMAP VALIDATION PASSED: 75 nodes\nexit 0\n',
    'git-check.log': 'ROADMAP VALIDATION PASSED: 75 nodes\nexit 0\n',
    'next.log': 'NONE-ADMISSIBLE: 0 owner-gated, 0 blocked\nexit 3\n',
    'openspec-strict.log': 'Totals: 229 passed, 0 failed (229 items)\nexit 0\n',
    'qc-openspec-ci.log': '[qc:openspec-ci] errors=0\nexit 0\n',
    'qc-pin.log': 'Tests:       24 passed, 24 total\nexit 0\n',
  };
  const lines: string[] = [];
  for (const [name, body] of Object.entries(logs)) {
    fs.writeFileSync(path.join(dir, name), body);
    lines.push(`${createHash('sha256').update(body).digest('hex')} *${name}`);
  }
  fs.writeFileSync(path.join(dir, 'sha256.txt'), `${lines.join('\n')}\n`);
  return dir;
}

function seedReview(
  verdictLine = 'Verdict: APPROVE',
  head = PR_HEAD,
  reviewerModel: string | null = REVIEWER,
): string {
  const file = path.join(tempLedger, 'lane-a-review.md');
  // `null` writes the header line the earliest reviews on main were missing.
  const reviewerLine =
    reviewerModel === null ? '' : `reviewerModel: ${reviewerModel}\n`;
  fs.writeFileSync(
    file,
    `# Lane A review - ${UNIT}\n\nreviewedHead: ${head}\n${reviewerLine}\n${verdictLine}\n`,
  );
  return file;
}

/** The same arguments without `flag` and its value, so the closure falls back to its own. */
function without(args: string[], flag: string): string[] {
  const index = args.indexOf(flag);
  return [...args.slice(0, index), ...args.slice(index + 2)];
}

/**
 * A throwaway repository root holding a copy of the closure and the two modules
 * it imports, plus a stub ledger at the path the shared library derives from
 * the script's own location. Inside that root the stub IS the repository's own
 * ledger, so the --skip-blob-check guard runs its real comparison without the
 * repository's real ledger ever being the subject of a closure run.
 */
function mirrorRepo(): {
  root: string;
  closure: string;
  units: string;
  evidence: string;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'u17b-mirror-'));
  const qcDir = path.join(root, 'scripts', 'qc');
  fs.mkdirSync(qcDir, { recursive: true });
  for (const name of [
    'roadmap-unit-closure.mjs',
    'roadmap-ledger-lib.mjs',
    'preserve-run-logs.mjs',
  ])
    fs.copyFileSync(qc(name), path.join(qcDir, name));
  const evidence = path.join(
    root,
    'openspec',
    'planning',
    LEDGER_NAME,
    'evidence',
  );
  fs.mkdirSync(evidence, { recursive: true });
  const units = path.join(path.dirname(evidence), 'units.json');
  writeJson(units, { units: [] });
  return {
    root,
    closure: path.join(qcDir, 'roadmap-unit-closure.mjs'),
    units,
    evidence,
  };
}

function closureArgs(review: string, proofDir: string): string[] {
  return [
    '--unit',
    UNIT,
    '--pr',
    '1836',
    '--date',
    DATE,
    '--review',
    review,
    '--proof-dir',
    proofDir,
    '--runtime-label',
    'u91 pin (jest)',
    '--implementer',
    'claude-opus (Agent lane)',
    '--ledger-dir',
    tempLedger,
    '--preserved-root',
    path.join(tempLedger, 'preserved'),
    '--repo-root',
    proofRepo,
    '--skip-blob-check',
  ];
}

beforeAll(() => {
  // The temp- prefix puts the copy under .gitignore's temp-* rule, so a run
  // that crashes before afterAll leaves no untracked ledger copy behind.
  tempLedger = fs.mkdtempSync(
    path.join(repoRoot, 'openspec/planning', 'temp-u17-pin-'),
  );
  fs.cpSync(SOURCE_LEDGER, tempLedger, { recursive: true });
  pristineUnits = fs.readFileSync(path.join(tempLedger, 'units.json'), 'utf8');

  // Three commits, so HEAD and HEAD~1 both have exactly one parent: a squash
  // merge has one, and the closure refuses anything else.
  proofRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'u17-merge-'));
  spawnSync('git', ['init', '-q'], { cwd: proofRepo });
  for (const name of ['seed.txt', 'one.txt', 'two.txt']) {
    fs.writeFileSync(path.join(proofRepo, name), `${name}\n`);
    commitAll(proofRepo, name);
  }
  headSha = git(['rev-parse', 'HEAD'], proofRepo);
  earlierSha = git(['rev-parse', 'HEAD~1'], proofRepo);

  fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'u17-gh-'));
  const ghJs = path.join(fakeBin, 'fake-gh.js');
  fs.writeFileSync(
    ghJs,
    [
      'const args = process.argv.slice(2);',
      'const has = (value) => args.includes(value);',
      'if (has("checks")) {',
      '  process.stdout.write(JSON.stringify([{ bucket: "pass" }, { bucket: "pass" }]));',
      '} else if (args.join(" ").includes("files")) {',
      '  process.stdout.write(JSON.stringify(["scripts/qc/roadmap-unit-fold.mjs"]));',
      '} else {',
      '  process.stdout.write(JSON.stringify({',
      '    state: "MERGED",',
      `    mergeCommit: { oid: process.env.U17_FAKE_GH_MERGE ?? ${JSON.stringify(headSha)} },`,
      '    mergedAt: "2026-09-17T19:00:00Z",',
      `    headRefOid: ${JSON.stringify(PR_HEAD)},`,
      '    mergedBy: { login: "SwiggitySwerve" },',
      '    title: "chore(qc): loop scripts",',
      '  }));',
      '}',
    ].join('\n'),
  );
  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(fakeBin, 'gh.cmd'),
      `@echo off\r\n"${process.execPath}" "${ghJs}" %*\r\n`,
    );
  } else {
    const shim = path.join(fakeBin, 'gh');
    fs.writeFileSync(
      shim,
      `#!/bin/sh\nexec "${process.execPath}" "${ghJs}" "$@"\n`,
    );
    fs.chmodSync(shim, 0o755);
  }
});

afterAll(() => {
  if (tempLedger) fs.rmSync(tempLedger, { recursive: true, force: true });
  if (fakeBin) fs.rmSync(fakeBin, { recursive: true, force: true });
  if (proofRepo) fs.rmSync(proofRepo, { recursive: true, force: true });
});

beforeEach(() => {
  fs.writeFileSync(path.join(tempLedger, 'units.json'), pristineUnits);
  // Every u91 artefact goes too: a receipt left behind by the previous case
  // would let a "this file was not written" assertion pass on someone else's
  // output.
  const evidence = path.join(tempLedger, 'evidence');
  for (const name of fs.readdirSync(evidence)) {
    if (name.startsWith('u91-')) fs.rmSync(path.join(evidence, name));
  }
  seedPlannedUnit();
});

describe('the pin temp ledger', () => {
  it('sits under a name git ignores', () => {
    const ignored = spawnSync('git', ['check-ignore', '-q', tempLedger], {
      cwd: repoRoot,
    });
    expect(ignored.status).toBe(0);
  });
});

describe('roadmap-unit-closure', () => {
  // Seeds the unit to local-verified; a failing fold throws with its exit
  // status, stderr and stdout, so the refusal it printed is in the report.
  const fold = (): void => {
    const result = run(FOLD, foldArgs(seedLaneReceipts()));
    if (result.status !== 0)
      throw new Error(
        `fold exited ${result.status}\nstderr:\n${result.stderr}\nstdout:\n${result.stdout}`,
      );
  };

  it('writes the four closure receipts and completes the unit', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const review = seedReview();
    const result = run(CLOSURE, closureArgs(review, proofDir));
    expectClosureOk(result);

    const evidence = path.join(tempLedger, 'evidence');
    const reviewReceipt = readJson<Record<string, unknown>>(
      path.join(evidence, `u91-review-${DATE}.json`),
    );
    expect(reviewReceipt.head).toBe(PR_HEAD);
    expect(reviewReceipt.reviewedHead).toBe(PR_HEAD);
    expect(reviewReceipt.verdict).toBe('APPROVE');
    expect(reviewReceipt.outputSha256).toBe(
      createHash('sha256').update(fs.readFileSync(review)).digest('hex'),
    );
    expect(
      fs.existsSync(path.join(evidence, `u91-lane-a-review-${DATE}.md`)),
    ).toBe(true);

    const merge = readJson<Record<string, unknown>>(
      path.join(evidence, `u91-merge-${DATE}.json`),
    );
    expect(merge.head).toBe(PR_HEAD);
    expect(merge.mergeSha).toBe(headSha);
    expect(merge.parentCount).toBe(1);
    expect(merge.checksAtMerge).toBe('2 pass, 0 other');

    const mainProof = readJson<Record<string, unknown>>(
      path.join(evidence, `u91-mainproof-${DATE}.json`),
    );
    expect(mainProof.verdict).toBe('PASS');
    expect(mainProof.mergeCommit).toBe(headSha);
    expect((mainProof.runtime as Record<string, string>).playwright).toBe(
      'u91 pin (jest): Tests:       12 passed, 12 total',
    );
    expect(mainProof.logHashes).toHaveLength(9);

    const tick = readJson<Record<string, unknown>>(
      path.join(evidence, `u91-tick-${DATE}.json`),
    );
    expect(tick.taskKeys).toEqual([]);
    expect(String(tick.note)).toContain('no task row');
    expect(tick.tickedOnMain).toBeNull();

    const unit = unitOf(UNIT);
    expect(unit.state).toBe('complete');
    expect(unit.prHead).toBe(PR_HEAD);
    expect(unit.mergeSha).toBe(headSha);
    expect(result.stdout).toContain('ROADMAP VALIDATION PASSED');
    expect(result.stdout).toContain('--next:');
  });

  it('preserves the proof logs through the U13 helper', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    expectClosureOk(run(CLOSURE, closureArgs(seedReview(), proofDir)));
    const manifest = readJson<{ files: { file: string }[]; bytes: number }>(
      path.join(tempLedger, 'evidence', `u91-logs-${DATE}.json`),
    );
    expect(manifest.files).toHaveLength(10);
    expect(manifest.bytes).toBeGreaterThan(0);
    // The manifest must list the proof directory's OWN files, not a count that
    // happens to match: 9 step logs plus sha256.txt.
    expect(manifest.files.map((entry) => entry.file).sort()).toEqual(
      fs.readdirSync(proofDir).sort(),
    );
  });

  it('preserves the proof logs even when the verdict is FAIL', () => {
    fold();
    const proofDir = seedProofDir('authority-recovery: 2 failed / 6 passed');
    const result = run(CLOSURE, closureArgs(seedReview(), proofDir));
    expect(result.status).not.toBe(0);
    // The FAIL run is the one whose logs are wanted, so preservation happens
    // with the mainProof receipt, before the verdict is acted on.
    const manifest = readJson<{ files: { file: string }[] }>(
      path.join(tempLedger, 'evidence', `u91-logs-${DATE}.json`),
    );
    expect(manifest.files.map((entry) => entry.file).sort()).toEqual(
      fs.readdirSync(proofDir).sort(),
    );
  });

  it('records the reviewer model the Lane A review names', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    expectClosureOk(run(CLOSURE, closureArgs(seedReview(), proofDir)));
    const receipt = readJson<Record<string, unknown>>(
      path.join(tempLedger, 'evidence', `u91-review-${DATE}.json`),
    );
    expect(receipt.reviewerModel).toBe(REVIEWER);
    expect(receipt.reviewerModel).not.toBe(OLD_LITERAL);
    expect(unitOf(UNIT).stageReceipts.review?.reviewerModel).toBe(REVIEWER);
  });

  it('refuses a review that does not name the reviewer model', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const review = seedReview('Verdict: APPROVE', PR_HEAD, null);
    const result = run(CLOSURE, closureArgs(review, proofDir));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reviewerModel');
    expect(unitOf(UNIT).state).toBe('local-verified');
    expect(
      fs.existsSync(
        path.join(tempLedger, 'evidence', `u91-review-${DATE}.json`),
      ),
    ).toBe(false);
  });

  it("refuses --skip-blob-check against the repository's own ledger", () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const mirror = mirrorRepo();
    const before = fs.readFileSync(mirror.units, 'utf8');
    const result = run(
      mirror.closure,
      without(closureArgs(seedReview(), proofDir), '--ledger-dir'),
    );
    const after = fs.readFileSync(mirror.units, 'utf8');
    const written = fs.readdirSync(mirror.evidence);
    fs.rmSync(mirror.root, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--skip-blob-check');
    // The refusal lands before anything is written or copied.
    expect(after).toBe(before);
    expect(written).toEqual([]);
  });

  it('refuses a review whose reviewedHead is not the PR head', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const review = seedReview('Verdict: APPROVE', 'c'.repeat(40));
    const result = run(CLOSURE, closureArgs(review, proofDir));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reviewedHead');
    expect(unitOf(UNIT).state).toBe('local-verified');
    expect(
      fs.existsSync(
        path.join(tempLedger, 'evidence', `u91-review-${DATE}.json`),
      ),
    ).toBe(false);
  });

  it('refuses a review whose verdict is not a plain APPROVE', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const review = seedReview('Verdict: APPROVE-WITH-REQUIRED-EDITS');
    const result = run(CLOSURE, closureArgs(review, proofDir));
    expect(result.status).not.toBe(0);
    expect(unitOf(UNIT).state).toBe('local-verified');
  });

  it('writes verdict FAIL and refuses when the runtime line reports failures', () => {
    fold();
    const proofDir = seedProofDir('authority-recovery: 2 failed / 6 passed');
    const result = run(CLOSURE, closureArgs(seedReview(), proofDir));
    expect(result.status).not.toBe(0);
    const mainProof = readJson<Record<string, unknown>>(
      path.join(tempLedger, 'evidence', `u91-mainproof-${DATE}.json`),
    );
    expect(mainProof.verdict).toBe('FAIL');
    expect(unitOf(UNIT).state).toBe('local-verified');
  });

  it('accepts the stated reds when --expected-reds names each one', () => {
    fold();
    const proofDir = seedProofDir('authority-recovery: 2 failed / 6 passed');
    const expected = path.join(tempLedger, 'expected-reds.json');
    writeJson(expected, ['genesis snapshot row', 'genesis replay row']);
    const result = run(CLOSURE, [
      ...closureArgs(seedReview(), proofDir),
      '--expected-reds',
      expected,
    ]);
    expectClosureOk(result);
    const mainProof = readJson<Record<string, unknown>>(
      path.join(tempLedger, 'evidence', `u91-mainproof-${DATE}.json`),
    );
    expect(mainProof.verdict).toBe('PASS');
    expect(mainProof.expectedReds).toEqual([
      'genesis snapshot row',
      'genesis replay row',
    ]);
    expect(unitOf(UNIT).state).toBe('complete');
  });

  it('merges extra runtime fields from --extra-runtime', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const extra = path.join(tempLedger, 'extra-runtime.json');
    writeJson(extra, { exactMainCheck: 'EXACT_MAIN_LADDER_SATISFIED' });
    expectClosureOk(
      run(CLOSURE, [
        ...closureArgs(seedReview(), proofDir),
        '--extra-runtime',
        extra,
      ]),
    );
    const mainProof = readJson<{ runtime: Record<string, string> }>(
      path.join(tempLedger, 'evidence', `u91-mainproof-${DATE}.json`),
    );
    expect(mainProof.runtime.exactMainCheck).toBe(
      'EXACT_MAIN_LADDER_SATISFIED',
    );
    expect(mainProof.runtime.tsc).toBe('exit 0');
  });

  it('accepts the checkout as a named --reproof-commit and records it', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const result = run(
      CLOSURE,
      [...closureArgs(seedReview(), proofDir), '--reproof-commit', headSha],
      repoRoot,
      { U17_FAKE_GH_MERGE: earlierSha },
    );
    expectClosureOk(result);
    expect(result.stdout).toContain('re-proof commit');
    const mainProof = readJson<Record<string, unknown>>(
      path.join(tempLedger, 'evidence', `u91-mainproof-${DATE}.json`),
    );
    expect(mainProof.mergeCommit).toBe(earlierSha);
    expect(mainProof.reproofCommit).toBe(headSha);
    expect(unitOf(UNIT).mergeSha).toBe(earlierSha);
  });

  it('refuses when the checkout is not at the merge commit and no re-proof commit is named', () => {
    fold();
    const proofDir = seedProofDir('Tests:       12 passed, 12 total');
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'u17-head-'));
    spawnSync('git', ['init', '-q'], { cwd: elsewhere });
    spawnSync('git', ['commit', '-q', '--allow-empty', '-m', 'seed'], {
      cwd: elsewhere,
      env: { ...process.env, ...PIN_GIT_ENV },
    });
    const result = run(
      CLOSURE,
      [
        ...without(closureArgs(seedReview(), proofDir), '--repo-root'),
        '--repo-root',
        elsewhere,
      ],
      elsewhere,
    );
    fs.rmSync(elsewhere, { recursive: true, force: true });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('merge commit');
    expect(unitOf(UNIT).state).toBe('local-verified');
  });
});

describe('roadmap-main-proof --dry-run', () => {
  let repo = '';
  let sha = '';

  const commit = (message: string): void => commitAll(repo, message);

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'u17-proof-'));
    spawnSync('git', ['init', '-q'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
    commit('seed');
    sha = git(['rev-parse', 'HEAD'], repo);
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  const dryRun = (extra: string[]): IRun =>
    run(
      MAIN_PROOF,
      [
        '--merge',
        sha,
        '--unit',
        UNIT,
        '--date',
        DATE,
        '--repo-root',
        repo,
        '--dry-run',
        ...extra,
      ],
      repo,
    );

  it('prints the jest ladder without running anything', () => {
    const result = dryRun([
      '--runtime-jest',
      'scripts/__tests__/roadmap-loop-scripts.test.ts',
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('scripts/qc/machine-idle.mjs --wait');
    expect(result.stdout).toContain('run build');
    expect(result.stdout).toContain('NEXT_PUBLIC_E2E_MODE=true');
    expect(result.stdout).toContain('__E2E_MODE__');
    expect(result.stdout).toContain(
      'DRY-RUN playwright: node node_modules/jest/bin/jest.js scripts/__tests__/roadmap-loop-scripts.test.ts',
    );
    // No step names a .cmd launcher any more: npm and npx are npm's own
    // JavaScript entry points run by node (see the fake-step pin below).
    expect(result.stdout).not.toContain('.cmd');
    expect(result.stdout).toContain('tsc --noEmit');
    expect(result.stdout).toContain(
      `openspec/planning/${LEDGER_NAME}/validate-roadmap.mjs --git`,
    );
    expect(result.stdout).toContain('openspec validate --all --strict');
    expect(result.stdout).toContain('qc:openspec-ci:validate');
    expect(result.stdout).toContain('sha256');
    expect(result.stdout).toContain(`u91-main-proof-${DATE}`);
    // Two idle waits: one before the build, one before the runtime proof.
    expect(
      result.stdout.split(/\r?\n/).filter((line) => line.includes('--wait')),
    ).toHaveLength(2);
    expect(
      fs.existsSync(path.join(repo, '.sisyphus/roadmap-completion-20260912')),
    ).toBe(false);
  });

  it('prints the ladder-group runtime when --runtime-group is given', () => {
    const result = dryRun(['--runtime-group', 'authority-recovery']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'scripts/qc/run-gm-two-player-campaign.mjs --group=authority-recovery',
    );
    expect(result.stdout).toContain('NODE_ENV=production');
  });

  it('refuses when HEAD is not the merge commit', () => {
    const result = run(
      MAIN_PROOF,
      [
        '--merge',
        'd'.repeat(40),
        '--unit',
        UNIT,
        '--date',
        DATE,
        '--repo-root',
        repo,
        '--dry-run',
        '--runtime-jest',
        'scripts/__tests__/roadmap-loop-scripts.test.ts',
      ],
      repo,
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('HEAD');
  });

  it('refuses a dirty tree', () => {
    fs.writeFileSync(path.join(repo, 'dirty.txt'), 'uncommitted\n');
    const result = dryRun([
      '--runtime-jest',
      'scripts/__tests__/roadmap-loop-scripts.test.ts',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('dirty');
  });

  it('refuses when no runtime proof is named', () => {
    const result = dryRun([]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('runtime');
  });

  // FN-u17b: npx.cmd went through cmd.exe, which read | ( ) & as shell
  // syntax. jest.js is now spawned by node, so the regex is one argv element.
  it('hands a --runtime-jest regex to jest.js verbatim', () => {
    const result = dryRun(['--runtime-jest', 'a|(b)&c']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'DRY-RUN playwright: node node_modules/jest/bin/jest.js a|(b)&c',
    );
  });

  it('reruns the highest registered rung on the merge commit after the runtime proof', () => {
    const result = dryRun([
      '--runtime-jest',
      'scripts/__tests__/roadmap-loop-scripts.test.ts',
    ]);
    expect(result.status).toBe(0);
    const lines = result.stdout.split(/\r?\n/);
    const at = (prefix: string): number =>
      lines.findIndex((line) => line.startsWith(prefix));
    expect(lines).toContain(
      `DRY-RUN exact-main-ladder: NODE_ENV=production node scripts/qc/validate-exact-main-regression-ladder.mjs --sha ${sha} --rerun`,
    );
    expect(at('DRY-RUN exact-main-ladder:')).toBeGreaterThan(
      at('DRY-RUN playwright:'),
    );
    expect(at('DRY-RUN exact-main-ladder:')).toBeLessThan(
      at('DRY-RUN sha256:'),
    );
  });

  it('splits --runtime-command into an argv instead of handing it to a shell', () => {
    const result = dryRun([
      '--runtime-command',
      'node .sisyphus/u91-runtime.mjs  --pattern a(b)',
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'DRY-RUN playwright: node .sisyphus/u91-runtime.mjs --pattern a(b)',
    );
  });

  it.each([
    ['an && chain', 'node a.mjs && node b.mjs'],
    ['a pipe', 'node a.mjs | tee out.log'],
    ['a redirect', 'node a.mjs > out.log'],
    ['a quoted path', 'node "a b.mjs"'],
    ['no program at all', '   '],
  ])(
    'refuses %s in --runtime-command before running anything',
    (_case, value) => {
      const result = dryRun(['--runtime-command', value]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('RUNTIME_COMMAND_NOT_ARGV');
      expect(result.stdout).not.toContain('DRY-RUN');
    },
  );
});

/**
 * The execution branch, end to end, with every spawned step faked (U39).
 *
 * The step table is the REAL one from ladder(); only each argv step's argv is
 * swapped for `node <fake-step.mjs> <step name> <original argv...>`, so a
 * step dropped from the table, or one whose argv changes, shows up here. The
 * in-process steps (the marker scan, sha256.txt, the dirty count) run for
 * real against a throwaway git repository, and every spawn goes through the
 * module's own spawn seam.
 */
describe('roadmap-main-proof execution branch with fake steps', () => {
  const REGEX = 'a|(b)&c';
  const LOG_DIR_RELATIVE = `.sisyphus/roadmap-completion-20260912/u91-main-proof-${DATE}`;
  let repo = '';
  let sha = '';
  let fakes = '';

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'u39-proof-'));
    spawnSync('git', ['init', '-q'], { cwd: repo });
    // The real checkout ignores .sisyphus/*; so must this one, or the proof's
    // own log directory would count as a dirty line.
    fs.writeFileSync(path.join(repo, '.gitignore'), '.sisyphus/\n');
    commitAll(repo, 'seed');
    sha = git(['rev-parse', 'HEAD'], repo);
    fakes = fs.mkdtempSync(path.join(os.tmpdir(), 'u39-fake-steps-'));
    // The fake build leaves an E2E _app chunk (the marker scan's input, and
    // the one untracked path the dirty count should see); every fake step
    // echoes the argv and NODE_ENV it was given.
    fs.writeFileSync(
      path.join(fakes, 'fake-step.mjs'),
      [
        "import fs from 'node:fs';",
        'const [name, ...argv] = process.argv.slice(2);',
        "if (name === 'build') {",
        "  fs.mkdirSync('.next/static/chunks/pages', { recursive: true });",
        "  fs.writeFileSync('.next/static/chunks/pages/_app-fake.js', 'self.__E2E_MODE__ = true;\\n');",
        '}',
        'process.stdout.write(JSON.stringify({ name, argv, nodeEnv: process.env.NODE_ENV ?? null }) + "\\n");',
      ].join('\n'),
    );
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(fakes, { recursive: true, force: true });
  });

  /** Import the tool in a real ESM context and run one request against it. */
  const harness = (request: Record<string, unknown>): IRun => {
    const source = `
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const tool = await import(request.moduleUrl);
if (request.mode === 'resolve') {
  process.stdout.write(JSON.stringify(request.argvs.map((argv) => tool.resolveArgv(argv))));
} else {
  const steps = tool
    .ladder({ merge: request.merge, runtimeJest: request.regex }, request.logDirRelative)
    .map((step) =>
      step.argv ? { ...step, argv: ['node', request.fakeStep, step.name, ...step.argv] } : step,
    );
  tool.runLadder({ steps, repoRoot: request.repo, logDir: request.logDir });
}`;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', source],
      {
        cwd: repo,
        encoding: 'utf8',
        input: JSON.stringify({
          moduleUrl: pathToFileURL(MAIN_PROOF).href,
          ...request,
        }),
      },
    );
    return {
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  it('writes a log per step, scans the marker, hashes the logs and counts the dirty tree', () => {
    const logDir = path.join(repo, LOG_DIR_RELATIVE);
    const result = harness({
      mode: 'run',
      merge: sha,
      regex: REGEX,
      logDirRelative: LOG_DIR_RELATIVE,
      logDir,
      repo,
      fakeStep: path.join(fakes, 'fake-step.mjs'),
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);

    const read = (name: string): string =>
      fs.readFileSync(path.join(logDir, name), 'utf8');
    const echoed = (
      name: string,
    ): { name: string; argv: string[]; nodeEnv: string | null } =>
      JSON.parse(read(`${name}.log`).split(/\r?\n/)[0]) as {
        name: string;
        argv: string[];
        nodeEnv: string | null;
      };

    const logs = fs
      .readdirSync(logDir)
      .filter((name) => name.endsWith('.log'))
      .sort();
    expect(logs).toEqual([
      'build.log',
      'exact-main-ladder.log',
      'git-check.log',
      'idle-before-build.log',
      'idle-before-runtime.log',
      'next.log',
      'openspec-strict.log',
      'playwright.log',
      'qc-openspec-ci.log',
      'qc-pin.log',
      'restore-next-env.log',
      'tsc.log',
      'validator.log',
    ]);
    for (const log of logs) {
      const name = log.replace(/\.log$/, '');
      expect(echoed(name).name).toBe(name);
      expect(read(log)).toContain('\nexit 0\n');
      // Every original program is node, npm, npx or git: no .cmd launcher.
      expect(['node', 'npm', 'npx', 'git']).toContain(echoed(name).argv[0]);
    }
    expect(echoed('playwright').argv).toEqual([
      'node',
      'node_modules/jest/bin/jest.js',
      REGEX,
    ]);
    expect(echoed('exact-main-ladder')).toEqual({
      name: 'exact-main-ladder',
      argv: [
        'node',
        'scripts/qc/validate-exact-main-regression-ladder.mjs',
        '--sha',
        sha,
        '--rerun',
      ],
      nodeEnv: 'production',
    });

    expect(read('build.log')).toContain('__E2E_MODE__ present in _app chunk');
    expect(result.stdout).toContain(
      'e2e-marker: __E2E_MODE__ present in _app chunk',
    );

    const hashed = read('sha256.txt')
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const match = /^([0-9a-f]{64}) \*(.+\.log)$/.exec(line);
        expect(match).not.toBeNull();
        return { digest: match?.[1] ?? '', name: match?.[2] ?? '' };
      });
    for (const { digest, name } of hashed)
      expect(
        createHash('sha256')
          .update(fs.readFileSync(path.join(logDir, name)))
          .digest('hex'),
      ).toBe(digest);
    expect(hashed.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'build.log',
        'playwright.log',
        'exact-main-ladder.log',
        'qc-pin.log',
      ]),
    );
    expect(result.stdout).toContain(`sha256: ${hashed.length} logs hashed`);

    expect(result.stdout).toContain('exact-main-ladder exit 0:');
    // The fake build's .next/ is the one untracked path; the log dir is ignored.
    expect(result.stdout).toContain('status: 1 dirty lines');
  });

  it('resolves node, npm and npx to the running node and never to a .cmd file', () => {
    const result = harness({
      mode: 'resolve',
      argvs: [
        ['node', 'x.mjs', REGEX],
        ['npm', 'run', 'build'],
        ['npx', 'openspec', 'validate'],
        ['git', 'status'],
      ],
    });
    expect(result.stderr).toBe('');
    const [node, npm, npx, gitArgv] = JSON.parse(result.stdout) as string[][];
    expect(node).toEqual([process.execPath, 'x.mjs', REGEX]);
    expect(npm[0]).toBe(process.execPath);
    expect(path.basename(npm[1])).toBe('npm-cli.js');
    expect(fs.existsSync(npm[1])).toBe(true);
    expect(npm.slice(2)).toEqual(['run', 'build']);
    expect(npx[0]).toBe(process.execPath);
    expect(path.basename(npx[1])).toBe('npx-cli.js');
    expect(fs.existsSync(npx[1])).toBe(true);
    expect(gitArgv).toEqual(['git', 'status']);
  });
});
