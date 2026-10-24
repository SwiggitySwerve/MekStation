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

test('future proof is explicit; cannot complete without closure, gates and evidence', (t) => {
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
  for (const step of [1, 9, 0])
    assert.throws(
      () =>
        validate(f.plan, f.ledger, f.root, {
          steps: { [step]: { state: 'complete', doneTest: 'PASS' } },
        }),
      /Complete without/,
    );
});

test('hash-bound evidence cannot be stale', (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.dir, 'v220-step-evidence.json'),
    JSON.stringify({ inputSha256: sha256('wrong') }),
  );
  assert.throws(() => main(['--write'], f.root), /Stale evidence/);
});
