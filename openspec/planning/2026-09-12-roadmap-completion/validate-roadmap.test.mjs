// Fixture-driven pin for validate-roadmap.mjs, runnable with `node --test` (no jest, no package.json script):
//   node --test openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.test.mjs
// Every case builds a throwaway ledger in a fresh temporary directory (the real roadmap.json with a
// couple of fixture-only node paths added, a units.json cut down to the units the case needs, the real
// admission snapshot and contract files, and generated stub receipts) and then runs the validator as a
// child process against it. The real ledger is never written to.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
// editNodes, when given, is called with the fixture roadmap's nodes by id before it is written.
const makeFixture = (ledger, receipts = {}, editNodes = null) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u16-fixture-'));
  fs.mkdirSync(path.join(dir, 'evidence'));
  for (const file of ['DELIVERY.md', 'WORKERS.md', 'README.md', 'PROGRESS.md']) {
    fs.copyFileSync(path.join(here, file), path.join(dir, file));
  }
  fs.copyFileSync(path.join(here, 'evidence', 'admission-snapshot.json'), path.join(dir, 'evidence', 'admission-snapshot.json'));
  const roadmap = JSON.parse(fs.readFileSync(path.join(here, 'roadmap.json'), 'utf8'));
  const plan = roadmap.nodes.find((node) => node.id === 'R0.plan');
  plan.ownershipPaths = [...plan.ownershipPaths, ...FIXTURE_NODE_PATHS];
  if (editNodes) editNodes(new Map(roadmap.nodes.map((node) => [node.id, node])));
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

// ---- U42: rows the program added to an admitted package after admission are held through a frozen
// supplement snapshot that units.json lists in supplementSnapshots. Each case below fails on the
// validator before U42 (which never reads the field) and passes after it.

const SUPPLEMENT = 'admission-snapshot-supplement-20260922.json';
const OPEN_SUPPLEMENT_KEYS = ['1.6@30', '6.2@106', '6.3@108', '6.4@110'].map((row) => `design-campaign-authority-and-sync#${row}`);
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A decision-free packet that holds the given task keys.
const holdingPacket = (id, taskKeys) => ({
  id,
  blocks: [],
  nodes: ['R2.authority-client'],
  taskKeys,
  question: 'Fixture packet: hold these rows?',
  options: [{ label: 'hold', consequence: 'held', effort: 'none' }, { label: 'drop', consequence: 'unheld', effort: 'none' }],
  agentRecommendation: 'hold',
  revertCost: 'none',
  decision: null,
  ruling: null,
});
// A fixture whose units.json lists one supplement: the real supplement file, or `supplement` written in
// its place. The recorded sha256 is that of the written bytes unless `sha256` overrides it.
const supplementFixture = (ledger = {}, supplement = null, sha256 = null) => {
  const body = supplement ? JSON.stringify(supplement) : fs.readFileSync(path.join(here, 'evidence', SUPPLEMENT), 'utf8');
  const digest = sha256 ?? crypto.createHash('sha256').update(body).digest('hex');
  const dir = makeFixture({ supplementSnapshots: [{ path: `evidence/${SUPPLEMENT}`, sha256: digest }], ...ledger });
  fs.writeFileSync(path.join(dir, 'evidence', SUPPLEMENT), body);
  return dir;
};
const heldLedger = { packets: [holdingPacket('PK-f16', [OPEN_SUPPLEMENT_KEYS[0]]), holdingPacket('PK-f62', OPEN_SUPPLEMENT_KEYS.slice(1))] };

test('a listed supplement with no holders fails, naming each open supplemented row and not the checked 6.1', () => {
  const result = run(supplementFixture());
  assertRejects(result, /ROADMAP VALIDATION FAILED/);
  for (const key of OPEN_SUPPLEMENT_KEYS) {
    assert.match(result.stderr, new RegExp(`activated package design-campaign-authority-and-sync leaves ${escapeRe(key)} open and unheld`));
  }
  assert.doesNotMatch(result.stderr, /#6\.1@104/);
});

test('the same supplement passes once packets hold its open rows, and its occurrences are counted', () => {
  const result = run(supplementFixture(heldLedger));
  assertPasses(result);
  assert.match(result.stdout, / 381 tasks, /);
});

test('a supplement repeating a snapshot occurrence is refused', () => {
  const real = JSON.parse(fs.readFileSync(path.join(here, 'evidence', SUPPLEMENT), 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(path.join(here, 'evidence', 'admission-snapshot.json'), 'utf8'));
  const admitted = snapshot.groups.find((group) => group.name === 'design-campaign-authority-and-sync').tasks[0];
  real.groups[0].tasks.push(admitted);
  const repeated = `design-campaign-authority-and-sync#${admitted.id}@${admitted.line}`;
  assertRejects(run(supplementFixture(heldLedger, real)), new RegExp(`supplement snapshot evidence/${escapeRe(SUPPLEMENT)} repeats task occurrence ${escapeRe(repeated)}`));
});

test('a supplement whose bytes differ from the recorded sha256 is refused', () => {
  assertRejects(run(supplementFixture(heldLedger, null, '0'.repeat(64))), new RegExp(`supplement snapshot evidence/${escapeRe(SUPPLEMENT)} sha256 [0-9a-f]{64} differs from the recorded 0{64}`));
});

// ---- U59: PK-camp-review-gate option (b), a declared solo-maintainer exception on the R2.camp-0..8
// review gates. A solo gate carries soloException true, nonAuthor false, the head it covers and a
// head-bound OWNER-RULING; every other gate keeps the pin.

const SOLO_RULING = { ruledHead: HEAD_A, pr: 1797, commentId: 5710327985, author: 'fixture-owner', bodySha256: 'c'.repeat(64) };
// A fixture whose R2.camp-3 gate (or the named node's) is replaced by the pinned gate with `over` applied.
const gateFixture = (over, nodeId = 'R2.camp-3') => makeFixture({}, {}, (nodes) => {
  nodes.get(nodeId).githubReviewGate = { ...nodes.get('R2.camp-0').githubReviewGate, ...over };
});
const SOLO = { soloException: true, nonAuthor: false, head: HEAD_A };

test('U59 (R1) a solo CAMP gate with a head-bound OWNER-RULING for its head passes', () => {
  assertPasses(run(gateFixture({ ...SOLO, ruling: SOLO_RULING })));
});

test('U59 (R2) a solo CAMP gate without an OWNER-RULING fails, naming the missing ruling', () => {
  assertRejects(run(gateFixture(SOLO)), /R2\.camp-3 CAMP review gate declares soloException without a head-bound OWNER-RULING \(PK-camp-review-gate option b\)/);
});

test('U59 (R3) the pinned CAMP gates pass, and a pinned gate with nonAuthor false or a solo flag with nonAuthor true still fails', () => {
  assertPasses(run(makeFixture({})));
  assertRejects(run(gateFixture({ nonAuthor: false })), /R2\.camp-3 has invalid CAMP GitHub review gate/);
  assertRejects(run(gateFixture({ ...SOLO, nonAuthor: true, ruling: SOLO_RULING })), /R2\.camp-3 has invalid CAMP GitHub review gate/);
});

test('U59 a solo CAMP gate whose OWNER-RULING names another head fails', () => {
  const other = 'd'.repeat(40);
  assertRejects(run(gateFixture({ ...SOLO, ruling: { ...SOLO_RULING, ruledHead: other } })), new RegExp(`R2\.camp-3 CAMP review gate OWNER-RULING is bound to ${other}, not the gate head ${HEAD_A}`));
});

test('U59 a solo CAMP gate whose OWNER-RULING has a short head and no body sha256 fails as malformed', () => {
  const { bodySha256: _dropped, ...noSha } = SOLO_RULING;
  assertRejects(run(gateFixture({ ...SOLO, ruling: { ...noSha, ruledHead: 'a'.repeat(39) } })), /R2\.camp-3 CAMP review gate OWNER-RULING is malformed: ruledHead is not 40-hex, bodySha256 is not 64-hex/);
});

test('U59 a solo gate with a valid OWNER-RULING on a node outside R2.camp-0..8 fails', () => {
  assertRejects(run(gateFixture({ ...SOLO, ruling: SOLO_RULING }, 'R0.plan')), /R0\.plan declares a solo-maintainer exception, which only the R2\.camp-0\.\.8 review gates may carry/);
});

// Mechanistic QA only: distinct historical observed workers, synthetic F1 bindings/output.
const MODERN_MODEL = 'chatgpt-subscription/gpt-6.1-sol';
const identityFixture = (mutate = () => {}, finishers = 1) => {
  const dir = mainVerifiedFixture('pin: 1 passed');
  const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  const actors = [
    ['st_01a0ef0b', '01a0ef0b-71e5-7508-a303-49a952f7476e'],
    ['st_01a0eed3', '01a0eed3-4c10-7359-abc6-f4fb14f3df71'],
    ['st_01a0eee6', '01a0eee6-5cd9-7ff6-adde-359483780e9c'],
    ['st_01a0ef25', '01a0ef25-a176-77db-8467-40bbf5f3ef02'],
  ].map(([task_id, child_session_id]) => ({ task_id, child_session_id, model: MODERN_MODEL, execution_mode: 'in-process', agent_type: null, resolved_model: { provider: 'chatgpt-subscription', model_id: 'gpt-6.1-sol' } }));
  const reviewText = `Verdict: APPROVE\nreviewedHead: ${HEAD_A}\nreviewerModel: ${MODERN_MODEL}\nreviewContractVersion: 2\n\nMechanistic QA fixture.\n`;
  const local = { unit: 'F1', stage: 'local', reviewContractVersion: 2, implementationActors: actors.slice(0, 1 + finishers).map((a, i) => ({ role: i ? 'finisher' : 'author', task_id: a.task_id, child_session_id: a.child_session_id, model: a.model })) };
  const snapshots = [actors[0], ...actors.slice(1, 1 + finishers), actors[3]].map((engine) => ({ schemaVersion: 1, unit: 'F1', sourceHead: HEAD_A, reviewOutputSha256: hash(Buffer.from(reviewText)), observedAt: '2026-09-29T20:00:00.000Z', engine }));
  const manifest = { reviewContractVersion: 2, unit: 'F1', sourceHead: HEAD_A, reviewOutputSha256: hash(Buffer.from(reviewText)), localReceiptSha256: '', author: null, finishers: [], reviewer: null };
  const review = { unit: 'F1', stage: 'review', reviewContractVersion: 2, head: HEAD_A, reviewedHead: HEAD_A, reviewerModel: MODERN_MODEL, implementerModel: MODERN_MODEL, outputPath: 'evidence/f1-review.md', outputSha256: hash(Buffer.from(reviewText)), verdict: 'APPROVE', identityEvidence: null };
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'), 'utf8'));
  const state = { dir, local, snapshots, manifest, review, reviewText, ledger, after: () => {} };
  mutate(state);
  const outputDigest = hash(Buffer.from(state.reviewText));
  manifest.reviewOutputSha256 = outputDigest; review.outputSha256 = outputDigest;
  for (const snapshot of snapshots) snapshot.reviewOutputSha256 = outputDigest;
  const put = (name, bytes) => { fs.writeFileSync(path.join(dir, 'evidence', name), bytes); return { path: `evidence/${name}`, sha256: hash(bytes), bytes: bytes.length }; };
  put('f1-local.json', json(local));
  manifest.localReceiptSha256 = hash(json(local));
  const refs = snapshots.map((s) => { const bytes = json(s); const name = `identity-${hash(bytes)}.json`; return { ...put(name, bytes), path: name }; });
  manifest.author = refs[0]; manifest.finishers = refs.slice(1, -1); manifest.reviewer = refs.at(-1);
  const manifestBytes = json(manifest);
  review.identityEvidence = put(`review-identity-${hash(manifestBytes)}.json`, manifestBytes);
  put('f1-review.md', Buffer.from(state.reviewText));
  put('f1-review.json', json(review));
  ledger.units[0].stageReceipts.local = { ...ledger.units[0].stageReceipts.local, reviewContractVersion: local.reviewContractVersion, implementationActors: local.implementationActors };
  ledger.units[0].stageReceipts.review = { path: 'evidence/f1-review.json', ...Object.fromEntries(['reviewContractVersion', 'head', 'reviewedHead', 'reviewerModel', 'implementerModel', 'outputSha256', 'verdict', 'identityEvidence'].map((k) => [k, review[k]])) };
  fs.writeFileSync(path.join(dir, 'units.json'), json(ledger));
  state.after();
  return dir;
};

for (const finishers of [0, 1, 2]) test(`PRI accepts independent same-model actors with ${finishers} finishers`, () => {
  const dir = identityFixture(() => {}, finishers);
  try { assertPasses(run(dir)); } finally { fs.rmSync(dir, { recursive: true }); }
});

const identityMutations = {
  'reviewer author': (s) => { s.snapshots.at(-1).engine = structuredClone(s.snapshots[0].engine); },
  'reviewer finisher': (s) => { s.snapshots.at(-1).engine = structuredClone(s.snapshots[1].engine); },
  'same task': (s) => { s.snapshots.at(-1).engine.task_id = s.snapshots[0].engine.task_id; },
  'same session': (s) => { s.snapshots.at(-1).engine.child_session_id = s.snapshots[1].engine.child_session_id; },
  'different model same actor': (s) => { const a = s.snapshots.at(-1).engine; a.task_id = s.snapshots[0].engine.task_id; a.model = 'other/model'; a.resolved_model = { provider: 'other', model_id: 'model' }; s.review.reviewerModel = a.model; },
  'omitted finisher': (s) => { s.snapshots.splice(1, 1); },
  'missing census': (s) => { delete s.local.implementationActors; },
  'null version': (s) => { s.review.reviewContractVersion = null; },
  'version one': (s) => { s.review.reviewContractVersion = 1; },
  'unknown version': (s) => { s.review.reviewContractVersion = 3; },
  'downgrade': (s) => { delete s.review.reviewContractVersion; },
  'provider mismatch': (s) => { s.snapshots[0].engine.resolved_model.provider = 'other'; },
  'model_id mismatch': (s) => { s.snapshots[0].engine.resolved_model.model_id = 'other'; },
  'wrong unit': (s) => { s.snapshots[0].unit = 'F2'; },
  'stale head': (s) => { s.manifest.sourceHead = MERGE_A; },
  'unknown field': (s) => { s.snapshots[0].privateData = 'forbidden'; },
  'duplicate verdict': (s) => { s.reviewText = s.reviewText.replace('Mechanistic QA fixture.', 'Verdict: APPROVE'); },
  'conflicting head': (s) => { s.reviewText = s.reviewText.replace('Mechanistic QA fixture.', `reviewedHead: ${MERGE_A}`); },
  'hyphen verdict': (s) => { s.reviewText = s.reviewText.replace('Verdict: APPROVE', 'Verdict: APPROVE-WITH-REQUIRED-EDITS'); },
  'inline disagreement': (s) => { s.after = () => { const f = path.join(s.dir, 'units.json'); const l = JSON.parse(fs.readFileSync(f)); l.units[0].stageReceipts.review.outputSha256 = '0'.repeat(64); fs.writeFileSync(f, JSON.stringify(l)); }; },
  'corrupt snapshot': (s) => { s.after = () => fs.appendFileSync(path.join(s.dir, 'evidence', s.manifest.author.path), ' '); },
  'corrupt manifest': (s) => { s.after = () => fs.appendFileSync(path.join(s.dir, s.review.identityEvidence.path), ' '); },
  'corrupt local': (s) => { s.after = () => fs.appendFileSync(path.join(s.dir, 'evidence/f1-local.json'), ' '); },
  'corrupt output': (s) => { s.after = () => fs.appendFileSync(path.join(s.dir, 'evidence/f1-review.md'), ' '); },
  'unsafe path': (s) => { s.after = () => { const f = path.join(s.dir, 'units.json'); const l = JSON.parse(fs.readFileSync(f)); l.units[0].stageReceipts.review.identityEvidence.path = '../escape.json'; fs.writeFileSync(f, JSON.stringify(l)); }; },
};
for (const [name, mutate] of Object.entries(identityMutations)) test(`PRI rejects ${name} even with --no-evidence`, () => {
  const dir = identityFixture((s) => {
    // Different-model control prevents unchanged legacy inequality masking missing v2 checks.
    s.snapshots.at(-1).engine.model = 'fixture-provider/reviewer';
    s.snapshots.at(-1).engine.resolved_model = { provider: 'fixture-provider', model_id: 'reviewer' };
    s.review.reviewerModel = 'fixture-provider/reviewer';
    s.reviewText = s.reviewText.replace(MODERN_MODEL, s.review.reviewerModel);
    mutate(s);
  });
  try {
    const result = run(dir, ['--no-evidence']);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /review identity:/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  } finally { fs.rmSync(dir, { recursive: true }); }
});

for (const scenario of ['external-only', 'inline-only', 'partial', 'malformed', 'census-disagreement']) test(`PRI local-only rejects ${scenario} with --no-evidence`, () => {
  const actor = { role: 'author', task_id: 'st_01a0ef0b', child_session_id: '01a0ef0b-71e5-7508-a303-49a952f7476e', model: MODERN_MODEL };
  const local = { unit: 'F1', stage: 'local', reviewContractVersion: 2, implementationActors: [actor] };
  const inline = scenario === 'external-only' ? {} : structuredClone(local);
  const external = scenario === 'inline-only' ? {} : structuredClone(local);
  if (scenario === 'partial') delete external.reviewContractVersion;
  if (scenario === 'malformed') external.implementationActors = null;
  if (scenario === 'census-disagreement') external.implementationActors[0].model = 'other/model';
  const dir = makeFixture({ units: [unit({ state: 'local-verified', stageReceipts: { ...unit({}).stageReceipts, admission: ladderBelowMainProof.admission, red: ladderBelowMainProof.red, local: { path: 'evidence/f1-local.json', ...inline } } })] }, { ...stubReceipts, 'f1-local.json': external });
  try {
    const result = run(dir, ['--no-evidence']);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /review identity:/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test('PRI local-only accepts complete matching modern census and preserves legacy opt-out', () => {
  const local = { unit: 'F1', stage: 'local', reviewContractVersion: 2, implementationActors: [{ role: 'author', task_id: 'st_01a0ef0b', child_session_id: '01a0ef0b-71e5-7508-a303-49a952f7476e', model: MODERN_MODEL }] };
  const dir = makeFixture({ units: [unit({ state: 'local-verified', stageReceipts: { ...unit({}).stageReceipts, admission: ladderBelowMainProof.admission, red: ladderBelowMainProof.red, local: { path: 'evidence/f1-local.json', ...local } } })] }, { ...stubReceipts, 'f1-local.json': local });
  try { assertPasses(run(dir, ['--no-evidence'])); } finally { fs.rmSync(dir, { recursive: true }); }
});

test('PRI preserves invalid same-model legacy rejection', () => {
  const dir = mainVerifiedFixture('pin: 1 passed', undefined, { review: { reviewerModel: MODERN_MODEL, implementerModel: MODERN_MODEL } });
  try { assert.equal(run(dir).code, 1); } finally { fs.rmSync(dir, { recursive: true }); }
});
