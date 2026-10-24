import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  checkReleaseEvidence,
  checkEvidenceRecord,
  directory,
  sha256,
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
    steps: Array.from({ length: 10 }, (_, id) => ({ id, doneTests: [] })),
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
    'same-host loopback; no remote proxy or tunnel support\nDocker HOSTNAME admission refusal; unsupported hosting\nfog-of-war is unavailable in multiplayer in this release\nco-op sessions are currently listed in the lobby browser to other users of the same server (fixed by B15-PRIV)\n',
  );
  const records = {
    'closure-rewind': {
      kind: 'closure-rewind',
      rcSha,
      closures: [{ unit: 'A', reference: closure }],
      reruns: commands.map((argv, i) =>
        ref(`rerun-${i}.json`, { rcSha, verdict: 'PASS', argv }),
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
      checklist: 'playtest/checklists/coop-uat.md',
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
      checklist: 'playtest/checklists/coop-uat.md',
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
    (f) => (f.ledger.units[0].state = 'planned'),
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

test('Step 0 observation requires both recorded in-flight deliveries', () => {
  assert.throws(
    () =>
      checkEvidenceRecord(
        'step0-observation',
        { kind: 'step0-observation' },
        {},
      ),
    /Incomplete Step 0/,
  );
});

test('workflow gates tagged commit before publication and permits private builds', () => {
  const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /candidate_only/);
  assert.match(workflow, /--candidate-sha "\$\(git rev-parse HEAD\)"/);
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
