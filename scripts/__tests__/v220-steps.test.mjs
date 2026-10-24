import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  directory,
  main,
  render,
  sha256,
  validate,
} from '../qc/generate-v220-steps.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v220-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plan = {
    steps: Array.from({ length: 10 }, (_, id) => ({
      id,
      name: `Step ${id}`,
      scope: 'Bounded',
      prBudget: 1,
      userVisible: false,
      units: [],
      witnesses: [],
      gates: [],
      doneTests: [{ argv: ['node', 'proof.mjs'] }],
    })),
  };
  plan.steps[1].units = ['A'];
  plan.steps[2].units = ['B'];
  plan.steps[9].gates = ['gate'];
  const ledger = {
    units: [
      { id: 'A', state: 'planned', predecessors: [] },
      { id: 'B', state: 'blocked', predecessors: ['A'] },
    ],
    l1ReleaseChecklist20261018: {
      closures: ['A', 'B'],
      checklist: [{ id: 'gate' }],
    },
  };
  const dir = path.join(root, directory);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, 'proof.mjs'), '');
  fs.writeFileSync(
    path.join(root, 'package.json'),
    '{"scripts":{"test":"node proof.mjs"}}',
  );
  const save = () => {
    fs.writeFileSync(path.join(dir, 'v220-steps.json'), JSON.stringify(plan));
    fs.writeFileSync(path.join(dir, 'units.json'), JSON.stringify(ledger));
  };
  save();
  return { root, plan, ledger, dir, save };
}

test('generated page stays fresh with LF or CRLF inputs and output', (t) => {
  const f = fixture(t);
  const files = [
    `${directory}/v220-steps.json`,
    `${directory}/units.json`,
    'package.json',
  ];
  for (const name of files) {
    const file = path.join(f.root, name);
    fs.writeFileSync(
      file,
      JSON.stringify(JSON.parse(fs.readFileSync(file)), null, 2) + '\n',
    );
  }
  main(['--write'], f.root);
  main(['--check'], f.root);
  for (const name of [...files, `${directory}/V2.2.0-STEPS.md`]) {
    const file = path.join(f.root, name);
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'),
    );
  }
  main(['--check'], f.root);
});

test('valid map; deterministic page; stale page is refused by --check', (t) => {
  const f = fixture(t);
  validate(f.plan, f.ledger, f.root);
  main(['--write'], f.root);
  main(['--check'], f.root);
  const output = path.join(f.dir, 'V2.2.0-STEPS.md');
  const bytes = fs.readFileSync(output);
  main(['--write'], f.root);
  assert.deepEqual(fs.readFileSync(output), bytes);
  fs.appendFileSync(output, 'stale');
  assert.throws(() => main(['--check'], f.root), /Stale committed page/);
});

for (const [name, mutate, error] of [
  ['missing unit', (p) => p.steps[1].units.pop(), /Missing unit/],
  ['duplicate unit', (p) => p.steps[2].units.push('A'), /Duplicate unit/],
  ['unknown unit', (p) => p.steps[2].units.push('Z'), /Unknown unit/],
  ['missing gate', (p) => p.steps[9].gates.pop(), /Unmapped or unknown gates/],
  [
    'unknown gate',
    (p) => (p.steps[9].gates[0] = 'bad'),
    /Unmapped or unknown gates/,
  ],
  [
    'duplicate gate',
    (p) => p.steps[8].gates.push('gate'),
    /Unmapped or unknown gates/,
  ],
  [
    'wrong order',
    (p) => {
      p.steps[1].units = ['B'];
      p.steps[2].units = ['A'];
    },
    /Predecessor order/,
  ],
  ['cycle', (_p, l) => l.units[0].predecessors.push('B'), /Dependency cycle/],
  [
    'missing node target',
    (p) => (p.steps[0].doneTests[0].argv[1] = 'absent.mjs'),
    /Missing command target/,
  ],
  [
    'missing npm target',
    (p) => (p.steps[0].doneTests[0].argv = ['npm', 'run', 'absent']),
    /Missing npm script/,
  ],
  [
    'missing test file',
    (p) =>
      (p.steps[0].doneTests[0].argv = [
        'npm',
        'run',
        'test',
        '--',
        'absent.test.ts',
      ]),
    /Missing command target/,
  ],
  ['copied state', (p) => (p.steps[0].state = 'complete'), /Lifecycle state/],
])
  test(`reject ${name}`, (t) => {
    const f = fixture(t);
    mutate(f.plan, f.ledger);
    assert.throws(() => validate(f.plan, f.ledger, f.root), error);
  });

test('future proof stays explicitly unimplemented', (t) => {
  const f = fixture(t);
  f.plan.steps[1].doneTests = [
    {
      status: 'PROOF NOT IMPLEMENTED',
      plannedIn: 'A',
      description: 'Implement actual proof',
    },
  ];
  validate(f.plan, f.ledger, f.root);
  assert.match(render(f.plan, f.ledger, 'hash'), /NOT IMPLEMENTED/);
});

function completeFixture(t) {
  const f = fixture(t);
  f.plan.steps[9].gates = [];
  f.plan.steps[2].gates = ['gate'];
  fs.mkdirSync(path.join(f.dir, 'evidence'), { recursive: true });
  for (const u of f.ledger.units) {
    u.state = 'main-verified';
    u.mergeSha = 'a'.repeat(40);
    u.stageReceipts = {
      mainProof: {
        verdict: 'PASS',
        mergeCommit: u.mergeSha,
        path: `evidence/${u.id}.json`,
      },
    };
    fs.writeFileSync(
      path.join(f.dir, 'evidence', `${u.id}.json`),
      JSON.stringify({ verdict: 'PASS', mergeCommit: u.mergeSha }),
    );
  }
  fs.writeFileSync(path.join(f.root, 'ref.txt'), 'proof');
  f.evidence = {
    gates: { gate: { status: 'accepted' } },
    steps: {
      2: {
        state: 'complete',
        doneTest: 'PASS',
        reference: { path: 'ref.txt', sha256: sha256('proof') },
      },
    },
  };
  return f;
}

test('a fully proven step may complete', (t) => {
  const f = completeFixture(t);
  validate(f.plan, f.ledger, f.root, f.evidence);
});

for (const [name, mutate, error] of [
  [
    'unclosed unit',
    (f) => (f.ledger.units[1].state = 'blocked'),
    /Complete without/,
  ],
  [
    'main proof for another merge',
    (f) =>
      (f.ledger.units[1].stageReceipts.mainProof.mergeCommit = 'b'.repeat(40)),
    /Complete without/,
  ],
  [
    'ledger merge changed',
    (f) => (f.ledger.units[1].mergeSha = 'b'.repeat(40)),
    /Complete without/,
  ],
  [
    'receipt file names another merge',
    (f) =>
      fs.writeFileSync(
        path.join(f.dir, 'evidence/B.json'),
        JSON.stringify({ verdict: 'PASS', mergeCommit: 'b'.repeat(40) }),
      ),
    /Complete without/,
  ],
  [
    'gate not accepted',
    (f) => (f.evidence.gates.gate.status = 'pending'),
    /Complete without/,
  ],
  [
    'done-test not PASS',
    (f) => (f.evidence.steps[2].doneTest = 'FAIL'),
    /Complete without/,
  ],
  [
    'proof not implemented',
    (f) =>
      f.plan.steps[2].doneTests.push({
        status: 'PROOF NOT IMPLEMENTED',
        plannedIn: 'B',
        description: 'x',
      }),
    /Complete without/,
  ],
  [
    'baseline only',
    (f) =>
      (f.plan.steps[2].doneTests = [
        {
          argv: ['node', 'proof.mjs'],
          baseline: 'baseline, not completion signal',
        },
      ]),
    /Complete without/,
  ],
  [
    'missing reference',
    (f) => delete f.evidence.steps[2].reference,
    /Complete without/,
  ],
  [
    'stale reference',
    (f) => (f.evidence.steps[2].reference.sha256 = sha256('other')),
    /stale evidence reference/,
  ],
])
  test(`complete refused: ${name}`, (t) => {
    const f = completeFixture(t);
    mutate(f);
    assert.throws(() => validate(f.plan, f.ledger, f.root, f.evidence), error);
  });

test('hash-bound evidence cannot be stale', (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.dir, 'v220-step-evidence.json'),
    JSON.stringify({ inputSha256: sha256('wrong') }),
  );
  assert.throws(() => main(['--write'], f.root), /Stale evidence/);
});

test('reject open witness', (t) => {
  const f = fixture(t);
  f.plan.steps[1].units = [];
  f.plan.steps[1].witnesses = ['A'];
  assert.throws(() => validate(f.plan, f.ledger, f.root), /Open witness A/);
});

test('package.json edits alone do not stale the page', (t) => {
  const f = fixture(t);
  main(['--write'], f.root);
  fs.writeFileSync(
    path.join(f.root, 'package.json'),
    '{"scripts":{"test":"node proof.mjs","other":"x"}}',
  );
  main(['--check'], f.root);
});

test('adopted budgets and gate placement stay fixed', () => {
  const plan = JSON.parse(
    fs.readFileSync(path.join(directory, 'v220-steps.json')),
  );
  assert.deepEqual(
    plan.steps.map((s) => [s.prBudget, s.gates]),
    [
      [2, []],
      [2, []],
      [8, []],
      [10, ['built-server-spectator-smoke']],
      [16, []],
      [4, []],
      [2, ['three-context-entry']],
      [1, ['closures', 'automated-rc', 'live-gm-rewind-dice']],
      [1, ['installer-rehearsal', 'human-session']],
      [1, ['release-notes']],
    ],
  );
});

test('duplicate gate cannot replace an omitted gate', (t) => {
  const f = fixture(t);
  f.ledger.l1ReleaseChecklist20261018.checklist.push({ id: 'other' });
  f.plan.steps[9].gates = ['gate', 'gate'];
  assert.throws(
    () => validate(f.plan, f.ledger, f.root),
    /Unmapped or unknown gates/,
  );
});

test('closed predecessors can appear in later historical display groups', (t) => {
  const f = completeFixture(t);
  f.plan.steps[1].units = ['B'];
  f.plan.steps[2].units = ['A'];
  validate(f.plan, f.ledger, f.root, f.evidence);
});

test('registration20261016 predecessors constrain execution order', (t) => {
  const f = fixture(t);
  f.ledger.units[1].predecessors = [];
  f.ledger.units[1].registration20261016 = { predecessors: ['A'] };
  f.plan.steps[1].units = ['B'];
  f.plan.steps[2].units = ['A'];
  assert.throws(() => validate(f.plan, f.ledger, f.root), /Predecessor order/);
});

for (const [name, mutate, error] of [
  ['step count', (p) => p.steps.pop(), /Expected steps/],
  ['step budget', (p) => (p.steps[0].prBudget = 0), /Invalid step/],
  [
    'proof owner',
    (p) =>
      (p.steps[0].doneTests = [
        { status: 'PROOF NOT IMPLEMENTED', description: 'x' },
      ]),
    /Missing proof owner/,
  ],
  [
    'evidence schema',
    (p) => (p.steps[0].doneTests = [{ kind: 'evidence' }]),
    /Missing evidence schema/,
  ],
  [
    'command interpreter',
    (p) => (p.steps[0].doneTests = [{ argv: ['python', 'proof.mjs'] }]),
    /Unsupported command/,
  ],
])
  test(`reject malformed ${name}`, (t) => {
    const f = fixture(t);
    mutate(f.plan);
    assert.throws(() => validate(f.plan, f.ledger, f.root), error);
  });
