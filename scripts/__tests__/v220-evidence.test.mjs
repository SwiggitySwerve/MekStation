import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { validate } from '../qc/generate-v220-steps.mjs';
import {
  checkReleaseEvidence,
  checkEvidenceRecord,
  directory,
  sha256,
  stepInputSha,
  verifyReference,
} from '../qc/v220-evidence.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v220-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const rcSha = '1'.repeat(40),
    bundle = path.join(root, 'qualification'),
    artifacts = path.join(bundle, 'artifacts');
  fs.mkdirSync(artifacts, { recursive: true });
  const write = (base, name, value) => {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    fs.mkdirSync(path.dirname(path.join(base, name)), { recursive: true });
    fs.writeFileSync(path.join(base, name), bytes);
    return { path: name, sha256: sha256(bytes) };
  };
  const ref = (name, value) => write(bundle, name, value);
  const raw = ref('rewind.txt', 'persisted broadcast replay observed');
  const checklist = write(
    root,
    'playtest/checklists/coop-uat.md',
    'three-seat script',
  );
  const closure = write(root, `${directory}/evidence/a.json`, {
    unit: 'A',
    verdict: 'PASS',
    mergeCommit: rcSha,
  });
  const gateIds = [
    'closures',
    'built-server-spectator-smoke',
    'automated-rc',
    'three-context-entry',
    'installer-rehearsal',
    'human-session',
    'release-notes',
    'live-gm-rewind-dice',
  ];
  const ledger = {
    l1ReleaseChecklist20261018: {
      closures: ['A'],
      checklist: gateIds.map((id) => ({ id })),
    },
    units: [
      {
        id: 'A',
        state: 'main-verified',
        mergeSha: rcSha,
        stageReceipts: {
          mainProof: {
            path: 'evidence/a.json',
            verdict: 'PASS',
            mergeCommit: rcSha,
          },
        },
      },
    ],
  };
  const commands = [
    ['node', 'spectator.mjs'],
    ['npm', 'run', 'journey'],
    ['npm', 'run', 'ownership'],
    ['node', 'terminal.mjs'],
  ];
  const plan = {
    steps: Array.from({ length: 10 }, (_, id) => ({
      id,
      doneTests: [{ argv: ['node', 'proof.mjs'] }],
    })),
  };
  plan.steps[3].doneTests = [{ argv: commands[0] }];
  plan.steps[5].doneTests = commands.slice(1, 3).map((argv) => ({ argv }));
  plan.steps[6].doneTests = [{ argv: commands[3] }];
  const observations = [
    {
      timestamp: '2026-10-24T03:00:00Z',
      status: 'PASS',
      description: 'Observed the specified ordinary-UI action',
    },
  ];
  const hashes = { 'installer.exe': sha256('exact rehearsed bytes') };
  write(artifacts, 'installer.exe', 'exact rehearsed bytes');
  const notes = ref(
    'release-notes.md',
    "The server enforces loopback binding. Do not expose the port through a reverse proxy or tunnel. Remote play is not a supported configuration in this release.\nCurrent Docker configurations fail the server's HOSTNAME admission check. Docker hosting is unsupported.\nfog-of-war is unavailable in multiplayer in this release\nco-op sessions are currently listed in the lobby browser to other users of the same server (fixed by B15-PRIV)\n",
  );
  const records = {
    'closure-rewind': {
      kind: 'closure-rewind',
      rcSha,
      closures: [{ unit: 'A', reference: closure }],
      reruns: commands.map((argv, i) =>
        ref(`rerun-${i}.json`, {
          rcSha,
          verdict: 'PASS',
          argv,
          inputSha256: stepInputSha(plan, ledger, [3, 5, 5, 6][i]),
        }),
      ),
      rewind: {
        command: 'real post-rewind dice command',
        observations,
        persisted: raw,
        broadcast: raw,
        replay: raw,
      },
    },
    'installer-rehearsal': {
      kind: 'installer-rehearsal',
      rcSha,
      operator: {
        identity: 'test agent',
        kind: 'agent',
        attestation: 'Rehearsed the specified artifact',
      },
      checklist,
      artifacts: hashes,
      observations,
      defects: [],
    },
    'human-session': {
      kind: 'human-session',
      rcSha,
      operator: {
        identity: 'test human',
        kind: 'human',
        attestation: 'One person drove three seats',
      },
      humanAttestation: 'I personally completed these actions',
      checklist,
      artifacts: { ...hashes },
      observations,
      defects: [],
    },
    publication: {
      kind: 'publication',
      rcSha,
      acceptedGates: gateIds,
      artifacts: { ...hashes },
      releaseNotes: notes,
    },
  };
  const manifest = {
    rcSha,
    records: {},
    gates: Object.fromEntries(
      gateIds.map((id) => [id, { status: 'accepted', reference: raw }]),
    ),
  };
  for (const [kind, record] of Object.entries(records))
    record.inputSha256 = stepInputSha(
      plan,
      ledger,
      kind === 'closure-rewind' ? 7 : kind === 'publication' ? 9 : 8,
    );
  const save = () => {
    records.publication.rehearsal = ref(
      'installer-rehearsal.json',
      records['installer-rehearsal'],
    );
    for (const [kind, record] of Object.entries(records))
      manifest.records[kind] = ref(`${kind}.json`, record);
    ref('evidence.json', manifest);
  };
  save();
  const context = {
    root,
    bundle,
    artifacts,
    rcSha,
    plan,
    ledger,
    git: () => '',
  };
  return { ...context, context, manifest, records, save, ref };
}

test('qualified fixture promotes the exact rehearsed bytes', (t) => {
  const f = fixture(t);
  assert.doesNotThrow(() => checkReleaseEvidence(f.manifest, f.context));
});

test('record bindings ignore unrelated ledger, step and package edits', (t) => {
  const f = fixture(t);
  f.ledger.units.push({
    id: 'OTHER',
    state: 'implementing',
    mergeSha: '2'.repeat(40),
  });
  f.ledger.unrelatedDecision = { status: 'new' };
  f.plan.steps[1].scope = 'Other step';
  fs.writeFileSync(path.join(f.root, 'package.json'), '{"version":"changed"}');
  f.save();
  assert.doesNotThrow(() => checkReleaseEvidence(f.manifest, f.context));
  f.plan.steps[8].scope = 'Changed acceptance';
  assert.throws(
    () => checkReleaseEvidence(f.manifest, f.context),
    /Stale evidence inputs/,
  );
});

for (const [name, proof] of [
  [
    'baseline-only',
    {
      argv: ['node', 'proof.mjs'],
      baseline: 'baseline, not completion signal',
    },
  ],
  ['unknown status', { argv: ['node', 'proof.mjs'], status: 'MAYBE' }],
])
  test(`publication refuses ${name} proof`, (t) => {
    const f = fixture(t);
    f.plan.steps[2].doneTests = [proof];
    assert.throws(
      () => checkReleaseEvidence(f.manifest, f.context),
      /Release proof not implemented/,
    );
  });

for (const [name, mutate, error] of [
  [
    'missing input binding',
    (f) => delete f.records['human-session'].inputSha256,
    /Stale evidence inputs/,
  ],
  [
    'wrong input binding',
    (f) => (f.records['closure-rewind'].inputSha256 = '0'.repeat(64)),
    /Stale evidence inputs/,
  ],
  [
    'changed relevant merge',
    (f) => (f.ledger.units[0].mergeSha = '2'.repeat(40)),
    /Stale evidence inputs/,
  ],
  [
    'missing artifact hashes',
    (f) => delete f.records['installer-rehearsal'].artifacts,
    /Missing artifact SHA256/,
  ],
  [
    'invalid artifact SHA256',
    (f) =>
      (f.records['installer-rehearsal'].artifacts = {
        'installer.exe': 'wrong',
      }),
    /Missing artifact SHA256/,
  ],
  [
    'missing operator identity',
    (f) => delete f.records['human-session'].operator.identity,
    /operator attestation or checklist/,
  ],
  [
    'missing operator attestation',
    (f) => delete f.records['installer-rehearsal'].operator.attestation,
    /operator attestation or checklist/,
  ],
  [
    'wrong checklist',
    (f) => (f.records['human-session'].checklist = 'obsolete.md'),
    /operator attestation or checklist/,
  ],
  [
    'missing observations',
    (f) => (f.records['human-session'].observations = []),
    /timestamped PASS/,
  ],
  [
    'invalid observation timestamp',
    (f) =>
      (f.records['installer-rehearsal'].observations = [
        { timestamp: 'invalid', status: 'PASS', description: 'x' },
      ]),
    /timestamped PASS/,
  ],
  [
    'missing defects ledger',
    (f) => delete f.records['human-session'].defects,
    /Open or un-retested/,
  ],
  [
    'missing defect retest',
    (f) =>
      (f.records['installer-rehearsal'].defects = [
        { id: 'bug', status: 'closed' },
      ]),
    /Open or un-retested/,
  ],
  [
    'extra unknown record',
    (f) => (f.manifest.records.unknown = f.manifest.records.publication),
    /Records must be separate/,
  ],
  [
    'merged record paths',
    (f) =>
      (f.manifest.records['human-session'] =
        f.manifest.records['installer-rehearsal']),
    /Records must be separate/,
  ],
  [
    'wrong rehearsal candidate',
    (f) => (f.records['installer-rehearsal'].rcSha = '2'.repeat(40)),
    /Wrong candidate/,
  ],
])
  test(`record refuses ${name}`, (t) => {
    const f = fixture(t);
    mutate(f);
    f.save();
    // save() rewrites the four canonical records; apply manifest-only mutations afterward.
    if (name === 'extra unknown record' || name === 'merged record paths')
      mutate(f);
    assert.throws(() => checkReleaseEvidence(f.manifest, f.context), error);
  });

test('unknown record schemas and traversal or absolute references are refused', (t) => {
  const f = fixture(t);
  assert.throws(
    () => checkEvidenceRecord('unknown', {}, f.context),
    /Unknown evidence schema/,
  );
  const good = f.ref('reference.txt', 'bytes');
  verifyReference(f.bundle, good);
  for (const value of [
    path.join(f.bundle, 'reference.txt'),
    '/etc/reference.txt',
    'C:\\reference.txt',
    'C:reference.txt',
    '\\\\server\\share\\reference.txt',
    '../reference.txt',
    'nested/../reference.txt',
    'nested\\..\\reference.txt',
  ]) {
    assert.throws(
      () => verifyReference(f.bundle, { ...good, path: value }),
      /Unsafe evidence reference path/,
    );
  }
  assert.throws(
    () => verifyReference(f.bundle, good, directory + '/'),
    /Unsafe evidence reference path/,
  );
});

test('reruns bind their own step inputs and argv', (t) => {
  const f = fixture(t);
  f.plan.steps[3].scope = 'Changed spectator proof';
  assert.throws(
    () => checkReleaseEvidence(f.manifest, f.context),
    /Missing exact RC rerun/,
  );
});

for (const [name, mutate, error] of [
  [
    'missing gate',
    (f) => delete f.manifest.gates['human-session'],
    /Missing accepted gate/,
  ],
  [
    'wrong candidate SHA',
    (f) => (f.manifest.rcSha = '2'.repeat(40)),
    /Wrong candidate SHA/,
  ],
  [
    'wrong session SHA',
    (f) => (f.records['human-session'].rcSha = '2'.repeat(40)),
    /Wrong candidate/,
  ],
  [
    'mismatched hashes',
    (f) => (f.records.publication.artifacts['installer.exe'] = '2'.repeat(64)),
    /Mismatched artifact hashes|Publication differs from rehearsal/,
  ],
  [
    'absent human attestation',
    (f) => delete f.records['human-session'].humanAttestation,
    /Absent human attestation/,
  ],
  [
    'agent posed as human',
    (f) => (f.records['human-session'].operator.kind = 'agent'),
    /agent rehearsal cannot qualify/,
  ],
  [
    'missing closure',
    (f) => (f.records['closure-rewind'].closures = []),
    /Missing closure references/,
  ],
  [
    'unclosed ledger unit',
    (f) => {
      f.ledger.units[0].state = 'planned';
      f.records['closure-rewind'].inputSha256 = stepInputSha(
        f.plan,
        f.ledger,
        7,
      );
    },
    /Missing closure A/,
  ],
  [
    'wrong proof argv',
    (f) => f.records['closure-rewind'].reruns.pop(),
    /Missing exact RC rerun/,
  ],
  [
    'missing proof',
    (f) => (f.plan.steps[2].doneTests = [{ status: 'PROOF NOT IMPLEMENTED' }]),
    /Release proof not implemented/,
  ],
  [
    'absent rewind',
    (f) => delete f.records['closure-rewind'].rewind.command,
    /Missing rewind command/,
  ],
  [
    'missing timestamp',
    (f) => delete f.records['installer-rehearsal'].observations[0].timestamp,
    /timestamped PASS/,
  ],
  [
    'open defect',
    (f) =>
      f.records['human-session'].defects.push({ id: 'bug', status: 'open' }),
    /Open or un-retested/,
  ],
  [
    'actual bytes differ',
    (f) => fs.writeFileSync(path.join(f.artifacts, 'installer.exe'), 'rebuilt'),
    /Published bytes differ/,
  ],
  [
    'extra publication file',
    (f) => fs.writeFileSync(path.join(f.artifacts, 'extra.exe'), 'unrehearsed'),
    /Published bytes differ/,
  ],
  [
    'notes omit limits',
    (f) =>
      (f.records.publication.releaseNotes = f.ref(
        'release-notes.md',
        'Missing disclosures',
      )),
    /Missing release-note limit/,
  ],
  [
    'publication gates differ',
    (f) => (f.records.publication.acceptedGates = []),
    /Publication gates differ/,
  ],
  [
    'closure not ancestor',
    (f) =>
      (f.context.git = () => {
        throw Error('not ancestor');
      }),
    /not ancestor/,
  ],
])
  test(`publication refuses ${name}`, (t) => {
    const f = fixture(t);
    mutate(f);
    f.save();
    assert.throws(() => checkReleaseEvidence(f.manifest, f.context), error);
  });

test('reference hashes and record separation are enforced', (t) => {
  const f = fixture(t);
  f.manifest.records['human-session'].sha256 = '0'.repeat(64);
  assert.throws(
    () => checkReleaseEvidence(f.manifest, f.context),
    /stale evidence/,
  );
});

test('Step 0 observation requires both deliveries', (t) => {
  const f = fixture(t);
  assert.throws(
    () =>
      checkEvidenceRecord(
        'step0-observation',
        {
          kind: 'step0-observation',
          inputSha256: stepInputSha(f.plan, f.ledger, 0),
        },
        f.context,
      ),
    /Incomplete Step 0/,
  );
});

test('workflow gates tagged commit before publication and permits private builds', () => {
  const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
  const releaseJob = workflow.match(
    /^  release:\r?\n[\s\S]*?(?=^  \S|$(?![\s\S]))/m,
  )?.[0];
  assert.ok(releaseJob, 'release job must exist');
  assert.match(releaseJob, /^    needs: \[release-context, build\]$/m);
  assert.match(releaseJob, /^    environment: release$/m);
  const dockerPushJob = workflow.match(
    /^  docker-push:\r?\n[\s\S]*?(?=^  \S|$(?![\s\S]))/m,
  )?.[0];
  assert.ok(dockerPushJob, 'docker-push job must exist');
  assert.match(dockerPushJob, /^    environment: release$/m);
  assert.doesNotMatch(workflow, /^  workflow_run:/m);
  assert.match(workflow, /candidate_only/);
  assert.match(workflow, /RC="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /grep -Fx "V2\.2 GATE PASSED \$RC"/);
  assert.match(workflow, /head_repository\.full_name/);
  assert.match(workflow, /qualification\/artifacts\/\*/);
  assert.match(workflow, /actions: read/);
  assert.ok(
    workflow.indexOf('generate-v220-steps.mjs --gate-check') <
      workflow.indexOf('uses: softprops/action-gh-release'),
  );
  assert.match(
    workflow,
    /!startsWith\(needs.release-context.outputs.tag, 'v2\.2\.'\)/,
  );
});

for (const [event, input, expected] of [
  ['push', '', 'v2.2.0'],
  ['workflow_dispatch', 'v2.2.0', 'v2.2.0'],
  ['workflow_dispatch', '', 'v2.2.0-rc.1'],
]) {
  test(`release resolves ${event} with tag input ${input || '(empty)'}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-tags-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const output = path.join(root, 'output');
    const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
    const script = workflow.match(
      /id: resolve_tag[\s\S]*?        run: \|\r?\n([\s\S]*?)(?=\r?\n      - name:)/,
    )?.[1];
    assert.ok(script, 'tag resolution step must exist');
    const result = spawnSync(
      process.platform === 'win32'
        ? 'C:/Program Files/Git/bin/bash.exe'
        : 'bash',
      [
        '-c',
        `set -e
git init -q
git -c user.name=Fixture -c user.email=fixture@example.invalid -c commit.gpgsign=false commit --allow-empty -qm fixture
git config tag.gpgsign false
git tag v2.1.9
git tag v2.2.0
git tag v2.2.0-rc.1
git remote add origin "$PWD"
` + script,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          TAG_INPUT: input,
          GITHUB_EVENT_NAME: event,
          GITHUB_REF_NAME: 'v2.2.0',
          GITHUB_OUTPUT: output.replaceAll('\\', '/'),
        },
      },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.ok(
      fs
        .readFileSync(output, 'utf8')
        .includes(`tag=${expected}\nref=refs/tags/${expected}\n`),
    );
  });
}

test('auto-version reports admin-only manual tagging without creating tags', () => {
  const workflow = fs.readFileSync(
    '.github/workflows/auto-version.yml',
    'utf8',
  );
  assert.doesNotMatch(workflow, /git\s+(?:push\b|tag\s+-a\b)/);
  assert.doesNotMatch(
    workflow,
    /contents: write|Created and pushed tag|✅ Yes/,
  );
  assert.match(workflow, /v\* tags are admin-only and must be pushed manually/);
  assert.match(workflow, /Tag Created \| No/);
  assert.doesNotMatch(workflow, /Generate release notes|release_notes\.md/);
  assert.ok(
    workflow.indexOf('- name: Summary') <
      workflow.indexOf('- name: Report manual tagging requirement'),
  );
  assert.match(
    workflow,
    /if: steps\.bump_type\.outputs\.bump_type != 'none' && steps\.check_tag\.outputs\.exists == 'false'/,
  );
});

for (const [event, subject, input, expected] of [
  ['push', 'chore(ci): require approval for publication', 'patch', 'none'],
  [
    'workflow_dispatch',
    'chore(ci): require approval for publication',
    'minor',
    'minor',
  ],
  ['push', '[patch] approved version computation', 'patch', 'patch'],
]) {
  test(`auto-version computes ${expected} for ${event}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-tags-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const output = path.join(root, 'output');
    const workflow = fs.readFileSync(
      '.github/workflows/auto-version.yml',
      'utf8',
    );
    const script = workflow.match(
      /id: bump_type\r?\n        run: \|\r?\n([\s\S]*?)(?=\r?\n      - name:)/,
    )?.[1];
    assert.ok(script, 'version computation step must exist');
    const result = spawnSync(
      process.platform === 'win32'
        ? 'C:/Program Files/Git/bin/bash.exe'
        : 'bash',
      [
        '-c',
        'git() { printf "%s\\n" "$SUBJECT"; };\n' +
          script
            .replaceAll('${{ github.event_name }}', event)
            .replaceAll('${{ inputs.bump_type }}', input),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SUBJECT: subject,
          GITHUB_OUTPUT: output.replaceAll('\\', '/'),
        },
      },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(
      fs.readFileSync(output, 'utf8'),
      new RegExp(`bump_type=${expected}\\b`),
    );
  });
}

// Review regression fixtures (PR #2322 review).

const H = 'human-session',
  R = 'installer-rehearsal',
  C = 'closure-rewind',
  P = 'publication';
const rerun = (f, i) =>
  JSON.parse(fs.readFileSync(path.join(f.bundle, `rerun-${i}.json`)));
const notesText = (f) =>
  fs.readFileSync(path.join(f.bundle, 'release-notes.md'), 'utf8');
for (const [name, mutate, error, after] of [
  [
    'relevant unit state changed',
    (f) => (f.ledger.units[0].state = 'archived'),
    /Stale evidence inputs/,
  ],
  [
    'gate pending',
    () => {},
    /Missing accepted gate/,
    (f) => (f.manifest.gates.closures.status = 'pending'),
  ],
  [
    'gate reference stale',
    () => {},
    /stale evidence/,
    (f) =>
      (f.manifest.gates.closures.reference = {
        ...f.manifest.gates.closures.reference,
        sha256: '0'.repeat(64),
      }),
  ],
  [
    'human-session hashes differ',
    (f) => (f.records[H].artifacts = { 'installer.exe': '3'.repeat(64) }),
    /Mismatched artifact hashes/,
  ],
  [
    'rehearsed file absent',
    (f) => fs.rmSync(path.join(f.artifacts, 'installer.exe')),
    /Published bytes differ/,
  ],
  [
    'human file holds rehearsal kind',
    (f) => (f.records[H].kind = R),
    /Wrong evidence schema/,
  ],
  [
    'empty artifacts',
    (f) => {
      for (const k of [R, H, P]) f.records[k].artifacts = {};
    },
    /Missing artifact SHA256/,
  ],
  [
    'non-ISO timestamp',
    (f) =>
      (f.records[R].observations = [
        { timestamp: '1', status: 'PASS', description: 'x' },
      ]),
    /timestamped PASS/,
  ],
  [
    'impossible timestamp',
    (f) =>
      (f.records[R].observations = [
        { timestamp: '2026-13-45T00:00:00Z', status: 'PASS', description: 'x' },
      ]),
    /timestamped PASS/,
  ],
  [
    'FAIL observation',
    (f) =>
      (f.records[H].observations = [
        { ...f.records[H].observations[0], status: 'FAIL' },
      ]),
    /timestamped PASS/,
  ],
  [
    'blank observation',
    (f) =>
      (f.records[H].observations = [
        { ...f.records[H].observations[0], description: ' ' },
      ]),
    /timestamped PASS/,
  ],
  [
    'closure reference to another file',
    (f) => (f.records[C].closures[0].reference = f.ref('other.json', '{}')),
    /Missing closure A/,
  ],
  [
    'closure reference stale',
    (f) =>
      (f.records[C].closures[0].reference = {
        ...f.records[C].closures[0].reference,
        sha256: '0'.repeat(64),
      }),
    /stale evidence/,
  ],
  [
    'rerun on another candidate',
    (f) =>
      (f.records[C].reruns[0] = f.ref('rerun-0.json', {
        ...rerun(f, 0),
        rcSha: '2'.repeat(40),
      })),
    /Missing exact RC rerun/,
  ],
  [
    'failed rerun',
    (f) =>
      (f.records[C].reruns[0] = f.ref('rerun-0.json', {
        ...rerun(f, 0),
        verdict: 'FAIL',
      })),
    /Missing exact RC rerun/,
  ],
  [
    'rerun repeats one argv',
    (f) => (f.records[C].reruns[2] = f.ref('rerun-2.json', rerun(f, 1))),
    /Missing exact RC rerun/,
  ],
  [
    'rewind without observations',
    (f) => (f.records[C].rewind.observations = []),
    /timestamped PASS/,
  ],
  [
    'rewind without replay',
    (f) => delete f.records[C].rewind.replay,
    /Unsafe evidence reference path/,
  ],
  [
    'unknown operator kind',
    (f) => (f.records[R].operator.kind = 'robot'),
    /Missing operator kind/,
  ],
  [
    'open defect with retest',
    (f) =>
      (f.records[R].defects = [
        {
          id: 'd',
          status: 'open',
          retest: {
            timestamp: '2026-10-24T00:00:00Z',
            reference: f.ref('retest.txt', 'r'),
          },
        },
      ]),
    /Open or un-retested/,
  ],
  [
    'closed defect without retest time',
    (f) =>
      (f.records[R].defects = [
        {
          id: 'd',
          status: 'closed',
          retest: { reference: f.ref('retest.txt', 'r') },
        },
      ]),
    /Open or un-retested/,
  ],
  [
    'retest reference stale',
    (f) =>
      (f.records[R].defects = [
        {
          id: 'd',
          status: 'closed',
          retest: {
            timestamp: '2026-10-24T00:00:00Z',
            reference: { ...f.ref('retest.txt', 'r'), sha256: '0'.repeat(64) },
          },
        },
      ]),
    /stale evidence/,
  ],
  [
    'notes checked from another file',
    (f) => (f.records[P].releaseNotes = f.ref('notes.md', notesText(f))),
    /Wrong release-note file/,
  ],
  [
    'duplicate accepted gate',
    (f) =>
      (f.records[P].acceptedGates = [
        ...f.records[P].acceptedGates.slice(0, 7),
        'closures',
      ]),
    /Publication gates differ/,
  ],
  [
    'notes reference stale',
    (f) =>
      (f.records[P].releaseNotes = {
        path: 'release-notes.md',
        sha256: '0'.repeat(64),
      }),
    /stale evidence/,
  ],
  [
    'affirmative contradiction of the limits',
    (f) =>
      (f.records[P].releaseNotes = f.ref(
        'release-notes.md',
        'Now supports remote proxy and tunnel hosting; same-host loopback optional. Docker HOSTNAME refusal removed; unsupported hosts: none.\nfog-of-war is unavailable in multiplayer in this release\nco-op sessions are currently listed in the lobby browser to other users of the same server (fixed by B15-PRIV)\n',
      )),
    /Missing release-note limit/,
  ],
  ...[
    'loopback binding',
    'reverse proxy or tunnel',
    'Remote play',
    'HOSTNAME admission',
    'Docker hosting',
    'fog-of-war',
    'B15-PRIV',
  ].map((word) => [
    `notes omit "${word}"`,
    (f) =>
      (f.records[P].releaseNotes = f.ref(
        'release-notes.md',
        notesText(f).split(word).join('XX'),
      )),
    /Missing release-note limit/,
  ]),
  [
    'session against changed checklist bytes',
    () => {},
    /stale evidence/,
    (f) =>
      fs.writeFileSync(
        path.join(f.root, 'playtest/checklists/coop-uat.md'),
        'stale two-window script',
      ),
  ],
])
  test(`review refuses ${name}`, (t) => {
    const f = fixture(t);
    mutate(f);
    f.save();
    after?.(f);
    assert.throws(() => checkReleaseEvidence(f.manifest, f.context), error);
  });

test('review: references cannot traverse a junction or symlink out of the bundle', (t) => {
  const f = fixture(t);
  const outside = path.join(f.root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'outside bytes');
  fs.symlinkSync(outside, path.join(f.bundle, 'jdir'), 'junction');
  assert.throws(
    () =>
      verifyReference(f.bundle, {
        path: 'jdir/secret.txt',
        sha256: sha256('outside bytes'),
      }),
    /Missing or stale evidence reference/,
  );
});

test('review: gate-check CLI refuses a missing bundle without the pass sentinel', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/qc/generate-v220-steps.mjs',
      '--gate-check',
      '--candidate-sha',
      '1'.repeat(40),
      '--evidence',
      path.join(os.tmpdir(), 'v220-missing', 'evidence.json'),
      '--artifacts',
      os.tmpdir(),
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /GATE PASSED/);
});

test('review: owner-page records must share the page candidate', (t) => {
  const f = fixture(t);
  const plan = {
    steps: Array.from({ length: 10 }, (_, id) => ({
      id,
      name: 's',
      scope: 's',
      prBudget: 1,
      userVisible: false,
      units: [],
      witnesses: [],
      gates: [],
      doneTests: [{ argv: ['node', 'proof.mjs'] }],
    })),
  };
  plan.steps[1].units = ['A'];
  plan.steps[9].gates = f.ledger.l1ReleaseChecklist20261018.checklist.map(
    (g) => g.id,
  );
  plan.steps[8].doneTests = [
    { kind: 'evidence', schema: R },
    { kind: 'evidence', schema: H },
  ];
  fs.writeFileSync(path.join(f.root, 'proof.mjs'), '');
  const dir = path.join(f.root, directory, 'evidence');
  const put = (name, value) => {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    fs.writeFileSync(path.join(dir, name), bytes);
    return { path: `${directory}/evidence/${name}`, sha256: sha256(bytes) };
  };
  const record = (kind, rcSha) => ({
    ...f.records[kind],
    rcSha,
    inputSha256: stepInputSha(plan, f.ledger, 8),
  });
  const evidence = (humanSha) => ({
    rcSha: '1'.repeat(40),
    steps: {
      8: {
        state: 'complete',
        doneTest: 'PASS',
        inputSha256: stepInputSha(plan, f.ledger, 8),
        reference: put('s8.txt', 'ok'),
        records: {
          [R]: put('r.json', record(R, '1'.repeat(40))),
          [H]: put('h.json', record(H, humanSha)),
        },
      },
    },
  });
  validate(plan, f.ledger, f.root, evidence('1'.repeat(40)));
  assert.throws(
    () => validate(plan, f.ledger, f.root, evidence('2'.repeat(40))),
    /Wrong candidate SHA/,
  );
});
