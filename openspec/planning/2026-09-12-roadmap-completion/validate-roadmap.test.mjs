// Fixture-driven pin for validate-roadmap.mjs, runnable with `node --test` (no jest, no package.json script):
//   node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs
// Every case builds a throwaway ledger in a fresh temporary directory (the real roadmap.json with a
// couple of fixture-only node paths added, a units.json cut down to the units the case needs, the real
// admission snapshot and contract files, and generated stub receipts) and then runs the validator as a
// child process against it. The real ledger is never written to.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(here, 'validate-roadmap.mjs');
const HEAD_A = 'a'.repeat(40);
const MERGE_A = 'b'.repeat(40);
// Paths that exist in the repository and that the fixture lends to R0.plan so fixture units can own them.
const FIXTURE_NODE_PATHS = ['src/lib', 'src/lib/multiplayer/server', 'e2e'];

// Build a fixture roadmap directory: the contract files the validator reads by link, the admission
// snapshot it derives every count from, and a units.json holding only the fixture's own units.
const makeFixture = (ledger, receipts = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u16-fixture-'));
  fs.mkdirSync(path.join(dir, 'evidence'));
  for (const file of ['DELIVERY.md', 'WORKERS.md', 'README.md', 'PROGRESS.md']) {
    fs.copyFileSync(path.join(here, file), path.join(dir, file));
  }
  fs.copyFileSync(path.join(here, 'evidence', 'admission-snapshot.json'), path.join(dir, 'evidence', 'admission-snapshot.json'));
  const roadmap = JSON.parse(fs.readFileSync(path.join(here, 'roadmap.json'), 'utf8'));
  const plan = roadmap.nodes.find((node) => node.id === 'R0.plan');
  plan.ownershipPaths = [...plan.ownershipPaths, ...FIXTURE_NODE_PATHS];
  fs.writeFileSync(path.join(dir, 'roadmap.json'), JSON.stringify(roadmap));
  fs.writeFileSync(path.join(dir, 'units.json'), JSON.stringify({
    schemaVersion: 1,
    programSnapshot: 'evidence/admission-snapshot.json',
    holdersRule: 'fixture ledger: no unit holds a task key, so no package is activated.',
    units: [],
    packets: [],
    deferrals: [],
    ...ledger,
  }, null, 2));
  for (const [name, body] of Object.entries(receipts)) {
    fs.writeFileSync(path.join(dir, 'evidence', name), JSON.stringify(body, null, 2));
  }
  return dir;
};

// Run the validator against a fixture and hand back its streams and exit code.
const run = (dir, args = [], env = null) => {
  const result = spawnSync(process.execPath, [validator, '--roadmap', path.join(dir, 'roadmap.json'), ...args], {
    encoding: 'utf8',
    env: env ?? process.env,
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};

// A unit shell with all seven stage keys present, so only the stages a case cares about are non-null.
const unit = (over) => ({
  id: 'F1',
  node: 'R0.plan',
  taskKeys: [],
  ownershipPaths: ['e2e'],
  ciClass: 'product',
  reviewClasses: ['routine'],
  caps: { maxFiles: 5, maxNonGeneratedLines: 100 },
  state: 'admitted',
  prHead: null,
  mergeSha: null,
  stageReceipts: { admission: null, red: null, local: null, review: null, merge: null, mainProof: null, tick: null },
  ownerGate: null,
  ...over,
});

// The five receipts a main-verified unit needs below its mainProof, all pointing at generated stubs.
const ladderBelowMainProof = {
  admission: { path: 'evidence/f1-admission.json' },
  red: { path: 'evidence/f1-red.json' },
  local: { path: 'evidence/f1-local.json' },
  review: { path: 'evidence/f1-review.json', head: HEAD_A, reviewedHead: HEAD_A, reviewerModel: 'model-r', implementerModel: 'model-i' },
  merge: { path: 'evidence/f1-merge.json', pr: 1797, head: HEAD_A, mergeSha: MERGE_A },
};
const stubReceipts = {
  'f1-admission.json': { stage: 'admission' },
  'f1-red.json': { stage: 'red' },
  'f1-local.json': { stage: 'local' },
  'f1-review.json': { stage: 'review' },
  'f1-merge.json': { stage: 'merge', pr: 1797, head: HEAD_A, mergeSha: MERGE_A },
};

// A real squash commit on main (U5e): 62 added lines in src/lib/multiplayer/client/readGmRewindHead.ts
// and 194 in its __tests__ file, so the --git cases need no throwaway repository.
const U5E_MERGE = '66c0ecad61350927294cd547b24062695d9c905e';

// A main-verified product unit whose mainProof receipt file carries the given runtime.playwright line,
// (optionally) an expectedReds array, and what `extra` names: runtime fields merged into the receipt's
// runtime, the receipt's at (default the U41 cutover day), fields merged into the review stage
// receipt, a mergeSha (default MERGE_A) and unit overrides.
const mainVerifiedFixture = (playwright, expectedReds, extra = {}) => {
  const mergeSha = extra.mergeSha ?? MERGE_A;
  const proof = { unit: 'F1', stage: 'mainProof', at: extra.at ?? '2026-09-27T00:00:00.000Z', mergeCommit: mergeSha, runtime: { playwright, ...extra.runtime } };
  if (expectedReds !== undefined) proof.expectedReds = expectedReds;
  return makeFixture(
    {
      units: [unit({
        state: 'main-verified',
        prHead: HEAD_A,
        mergeSha,
        stageReceipts: {
          ...ladderBelowMainProof,
          review: { ...ladderBelowMainProof.review, ...extra.review },
          merge: { ...ladderBelowMainProof.merge, mergeSha },
          mainProof: { path: 'evidence/f1-mainproof.json', mergeCommit: mergeSha },
          tick: null,
        },
        ...extra.unit,
      })],
    },
    { ...stubReceipts, 'f1-mainproof.json': proof },
  );
};

// Assert the validator refused and named the failure. On an unexpected pass the message carries the
// validator's own stdout, so a run against a validator without the check records what it printed.
const assertRejects = ({ code, stdout, stderr }, pattern) => {
  assert.equal(code, 1, `expected a failing exit, got ${code}: ${stdout.trim()}`);
  assert.match(stderr, pattern);
};
const assertPasses = ({ code, stdout, stderr }) => {
  assert.equal(code, 0, `expected a passing exit, got ${code}: ${stderr.trim()}`);
  assert.match(stdout, /ROADMAP VALIDATION PASSED/);
};

test('a stage receipt path that does not exist fails, naming the unit, the stage and the path', () => {
  const dir = makeFixture({
    units: [unit({ state: 'admitted', stageReceipts: { ...unit({}).stageReceipts, admission: { path: 'evidence/f1-does-not-exist.json' } } })],
  });
  const { code, stderr } = run(dir);
  assert.equal(code, 1, `expected a failing exit, got ${code}`);
  assert.match(stderr, /ROADMAP VALIDATION FAILED/);
  assert.match(stderr, /F1\.stageReceipts\.admission path does not exist: evidence\/f1-does-not-exist\.json/);
});

test('a stage receipt path that does exist passes', () => {
  const dir = makeFixture(
    { units: [unit({ state: 'admitted', stageReceipts: { ...unit({}).stageReceipts, admission: { path: 'evidence/f1-admission.json' } } })] },
    stubReceipts,
  );
  const { code, stdout } = run(dir);
  assert.equal(code, 0);
  assert.match(stdout, /ROADMAP VALIDATION PASSED/);
});

test('a mainProof reporting one red without expectedReds fails', () => {
  const dir = mainVerifiedFixture('authority: 1 failed / 17 passed');
  const { code, stderr } = run(dir);
  assert.equal(code, 1, `expected a failing exit, got ${code}`);
  assert.match(stderr, /F1 mainProof receipt reports 1 failed row\(s\) without an expectedReds array/);
});

test('the same mainProof with a one-entry expectedReds passes', () => {
  const dir = mainVerifiedFixture('authority: 1 failed / 17 passed', ['E2E-01 genesis: gated on task 5.7, expected until the cutover'], {
    runtime: { failedRows: ['1) [chromium] › e2e/gm-two-player-authority-recovery.pack.spec.ts:66:5 › E2E-01 genesis branch recovers @E2E-01'] },
  });
  const { code, stdout } = run(dir);
  assert.equal(code, 0, `expected a passing exit, got ${code}`);
  assert.match(stdout, /ROADMAP VALIDATION PASSED/);
});

test('expectedReds shorter than the failed count fails', () => {
  const dir = mainVerifiedFixture('authority: 3 failed / 17 passed', ['only one reason given']);
  const { code, stderr } = run(dir);
  assert.equal(code, 1, `expected a failing exit, got ${code}`);
  assert.match(stderr, /F1 mainProof expectedReds has 1 entr\(y\/ies\) but the run reports 3 failed row\(s\)/);
});

test('every ladder and jest spelling in the real ledger parses, and a free-text line does not', () => {
  for (const line of [
    '  1 passed (30.8s)',
    'evidence-smoke:   1 passed (12.1s)',
    'token-pack:   2 passed (1.7m)',
    'jest machine-idle pin: Tests:       62 passed, 62 total',
    'suites (1279 passing): U40 PROOF RUNTIME PASSED: 1279 passed (jest 1277, 0 failed, exit 0; lifecycle-pack 2, 0 failed, exit 0)',
  ]) {
    const { code, stdout } = run(mainVerifiedFixture(line));
    assert.equal(code, 0, `expected ${JSON.stringify(line)} to parse, got exit ${code}`);
    assert.match(stdout, /ROADMAP VALIDATION PASSED/);
  }
  const { code, stderr } = run(mainVerifiedFixture('ran the pack, looked fine'));
  assert.equal(code, 1, `expected a failing exit, got ${code}`);
  assert.match(stderr, /F1 mainProof receipt runtime\.playwright is not a ladder or jest result: ran the pack, looked fine/);
});

test('--no-evidence prints its notice and skips the evidence checks', () => {
  const dir = makeFixture({
    units: [unit({ state: 'admitted', stageReceipts: { ...unit({}).stageReceipts, admission: { path: 'evidence/f1-does-not-exist.json' } } })],
  });
  const { code, stdout, stderr } = run(dir, ['--no-evidence']);
  assert.equal(code, 0, `expected a passing exit, got ${code}`);
  assert.match(`${stdout}${stderr}`, /evidence mode is off/);
  assert.match(stdout, /ROADMAP VALIDATION PASSED/);
});

test('--next skips a planned unit whose path sits inside an in-flight path and takes the next free unit', () => {
  const dir = makeFixture(
    {
      units: [
        unit({
          id: 'FA',
          state: 'local-verified',
          ownershipPaths: ['src/lib'],
          stageReceipts: {
            admission: { path: 'evidence/f1-admission.json' },
            red: { path: 'evidence/f1-red.json' },
            local: { path: 'evidence/f1-local.json' },
            review: null,
            merge: null,
            mainProof: null,
            tick: null,
          },
        }),
        unit({ id: 'FB', state: 'planned', ownershipPaths: ['src/lib/multiplayer/server'] }),
        unit({ id: 'FC', state: 'planned', ownershipPaths: ['e2e'] }),
      ],
    },
    stubReceipts,
  );
  const { code, stdout } = run(dir, ['--next']);
  assert.equal(code, 0, `expected a chosen unit, got exit ${code} and ${JSON.stringify(stdout)}`);
  assert.equal(stdout.trim(), 'FC');
});

test('--github with gh off the PATH fails with a notice rather than passing silently', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'u16-nopath-'));
  const dir = makeFixture(
    {
      units: [unit({
        id: 'FS',
        reviewClasses: ['authority'],
        state: 'main-verified',
        prHead: HEAD_A,
        mergeSha: MERGE_A,
        stageReceipts: {
          ...ladderBelowMainProof,
          mainProof: { path: 'evidence/f1-mainproof.json', mergeCommit: MERGE_A },
          tick: null,
        },
      })],
      packets: [{
        id: 'PK-fixture',
        blocks: ['FS'],
        nodes: ['R0.plan'],
        taskKeys: [],
        question: 'Fixture packet: rule on the head?',
        options: [
          { label: 'rule', consequence: 'merges', effort: 'none' },
          { label: 'hold', consequence: 'stays open', effort: 'none' },
        ],
        agentRecommendation: 'rule',
        revertCost: 'none',
        decision: 'ruled (fixture)',
        ruling: { ruledHead: HEAD_A },
      }],
    },
    { ...stubReceipts, 'f1-mainproof.json': { unit: 'FS', stage: 'mainProof', mergeCommit: MERGE_A, runtime: { playwright: 'pack:   1 passed (1.0s)' } } },
  );
  const env = { ...process.env, PATH: empty, Path: empty };
  const { code, stdout, stderr } = run(dir, ['--github'], env);
  assert.equal(code, 1, `expected a failing exit, got ${code}`);
  assert.match(`${stdout}${stderr}`, /gh is not available/);
  assert.match(stderr, /FS/);
});

// ---- U41: the validator checks what receipts say. Each case below is accepted by the validator
// before U41 and rejected after it.

test('(1) expectedReds and runtime.failedRows that name different E2E ids fail', () => {
  const dir = mainVerifiedFixture('authority: 1 failed / 17 passed', ['E2E-01 genesis: gated on task 5.7'], {
    runtime: { failedRows: ['1) [chromium] › e2e/gm-two-player-authority-recovery.pack.spec.ts:123:5 › E2E-02 effective branch @E2E-02'] },
  });
  assertRejects(run(dir), /F1 mainProof expectedReds \(E2E-01\) and runtime\.failedRows \(E2E-02\) do not name the same E2E ids one to one/);
});

test('(1) a red mainProof dated from 2026-09-27 without runtime.failedRows fails; an earlier one keeps the count check', () => {
  const reds = ['E2E-01 genesis: gated on task 5.7'];
  assertRejects(run(mainVerifiedFixture('authority: 1 failed / 17 passed', reds)), /F1 mainProof reports 1 failed row\(s\) without a runtime\.failedRows array/);
  assertPasses(run(mainVerifiedFixture('authority: 1 failed / 17 passed', reds, { at: '2026-09-17T16:41:43.408Z' })));
});

test("(2) 'N passed (... K failed)' reads K instead of passing as zero failed", () => {
  const dir = mainVerifiedFixture('U99 PROOF RUNTIME PASSED: 5 passed (jest 4, 1 failed, exit 0; pack 1, 0 failed, exit 0)');
  assertRejects(run(dir), /F1 mainProof receipt reports 1 failed row\(s\) without an expectedReds array/);
});

test('(2) a jest red summary parses and its failed count is held to expectedReds', () => {
  const dir = mainVerifiedFixture('jest pin: Tests:       1 failed, 2 skipped, 11 passed, 14 total');
  assertRejects(run(dir), /F1 mainProof receipt reports 1 failed row\(s\) without an expectedReds array/);
});

test('(3) a sensitive unit at local-verified with no packet naming it in blocks fails', () => {
  const localVerified = { ...unit({}).stageReceipts, admission: ladderBelowMainProof.admission, red: ladderBelowMainProof.red, local: ladderBelowMainProof.local };
  const ledger = { units: [unit({ reviewClasses: ['authority'], state: 'local-verified', stageReceipts: localVerified })] };
  assertRejects(run(makeFixture(ledger, stubReceipts)), /F1 carries sensitive classes \(authority\) and is local-verified with no packet naming it in blocks/);
  const packet = {
    id: 'PK-fixture',
    blocks: ['F1'],
    nodes: ['R0.plan'],
    taskKeys: [],
    question: 'Fixture packet: rule on the head?',
    options: [{ label: 'rule', consequence: 'merges', effort: 'none' }, { label: 'hold', consequence: 'stays open', effort: 'none' }],
    agentRecommendation: 'rule',
    revertCost: 'none',
    decision: null,
    ruling: null,
  };
  assertPasses(run(makeFixture({ ...ledger, packets: [packet] }, stubReceipts)));
});

test('(5) a review receipt whose finisherModel equals its reviewerModel fails', () => {
  const dir = mainVerifiedFixture('pack:   1 passed (1.0s)', undefined, { review: { finisherModel: 'model-r' } });
  assertRejects(run(dir), /F1 review receipt is not cross-model: its finisher model-r is also its reviewer/);
});

test('(4) --git fails a merge touching a file outside ownershipPaths unless ownershipExceptions lists it', () => {
  const owned = (unitOver) => mainVerifiedFixture('pack:   1 passed (1.0s)', undefined, { mergeSha: U5E_MERGE, unit: { ownershipPaths: ['e2e'], ...unitOver } });
  assertRejects(run(owned({}), ['--git']), /F1 merge 66c0ecad6 touches src\/lib\/multiplayer\/client\/readGmRewindHead\.ts outside its ownershipPaths and ownershipExceptions/);
  const ownershipExceptions = ['src/lib/multiplayer/client/readGmRewindHead.ts', 'src/lib/multiplayer/client/__tests__/readGmRewindHead.test.ts'];
  assertPasses(run(owned({ ownershipExceptions }), ['--git']));
});

test('(6) --git fails a merge whose counted lines exceed the cap unless capException records the count', () => {
  const capped = (unitOver) => mainVerifiedFixture('pack:   1 passed (1.0s)', undefined, {
    mergeSha: U5E_MERGE,
    unit: { ownershipPaths: ['src/lib'], caps: { maxFiles: 5, maxNonGeneratedLines: 50 }, ...unitOver },
  });
  assertRejects(run(capped({}), ['--git']), /F1 merge 66c0ecad6 counts 62 added non-generated, non-test lines over its cap of 50/);
  assertPasses(run(capped({ capException: { countedLines: 62 } }), ['--git']));
  // The 194 added lines of the __tests__ file do not count: under a cap of 100 the same merge passes.
  assertPasses(run(capped({ caps: { maxFiles: 5, maxNonGeneratedLines: 100 } }), ['--git']));
});
