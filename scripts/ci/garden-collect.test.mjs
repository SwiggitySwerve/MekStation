import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

import {
  collectGardenObservations,
  decodeObservationArtifact,
} from './garden-collect.mjs';

const python = process.platform === 'win32' ? 'python' : 'python3';
const filename = 'ci-observation-123-1.json';
function archive(members) {
  return execFileSync(
    python,
    [
      '-B',
      '-c',
      'import io,json,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED); [(z.writestr(name,data)) for name,data in json.load(sys.stdin)]; z.close(); sys.stdout.buffer.write(b.getvalue())',
    ],
    {
      input: JSON.stringify(members),
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
}

test('bounded ZIP decoder reads one exact JSON member without extraction', () => {
  assert.deepEqual(
    decodeObservationArtifact(
      archive([[filename, '{"valid":true}']]),
      filename,
    ),
    { valid: true },
  );
  for (const members of [
    [['../' + filename, '{}']],
    [
      [filename, '{}'],
      ['extra', 'x'],
    ],
    [[filename, 'bad json']],
    [[filename, 'x'.repeat(8 * 1024 * 1024 + 1)]],
  ])
    assert.throws(() => decodeObservationArtifact(archive(members), filename));
});

function fixture() {
  const run = {
    id: 123,
    run_attempt: 1,
    workflow_id: 12,
    event: 'push',
    head_branch: 'main',
    head_sha: 'a'.repeat(40),
    head_repository: { full_name: 'owner/repo' },
    path: '.github/workflows/pr-checks.yml',
    conclusion: 'success',
    created_at: '2026-11-02T00:00:00Z',
    run_started_at: '2026-11-02T00:00:01Z',
  };
  const artifact = {
    id: 7,
    name: filename,
    workflow_run: { id: 123, head_sha: run.head_sha },
    created_at: run.created_at,
    size_in_bytes: 100,
    expired: false,
  };
  const envelope = {
    observation: {
      identity: {
        repository: 'owner/repo',
        runId: 123,
        attempt: 1,
        workflowId: run.workflow_id,
        event: run.event,
        branch: run.head_branch,
        headSha: run.head_sha,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        startedAt: run.run_started_at,
        completedAt: '2026-11-02T00:00:10.000Z',
      },
    },
  };
  const github = {
    rest: {
      repos: {
        getContent: async (args) => {
          assert.equal(args.ref, run.head_sha);
          return {
            data: {
              encoding: 'base64',
              content: Buffer.from('source workflow').toString('base64'),
              sha: 'source-blob',
            },
          };
        },
        get: async () => ({
          data: { full_name: 'owner/repo', default_branch: 'main' },
        }),
      },
      actions: {
        listArtifactsForRepo: 'artifacts',
        getWorkflowRunAttempt: async () => ({ data: run }),
        downloadArtifact: async () => ({ data: Buffer.from('archive') }),
      },
    },
    paginate: async () => [artifact],
  };
  return {
    input: {
      github,
      owner: 'owner',
      repo: 'repo',
      now: '2026-11-05T12:00:00Z',
      validateObservation: (e) => e,
      workflowGraphFromSource: (source) => {
        assert.equal(source, 'source workflow');
        return { jobGraph: { test: [] }, matrixGroups: {} };
      },
      collectRun: async (_transport, target) => {
        assert.deepEqual(Object.keys(target.graphs.graphs), [run.head_sha]);
        return { observation: structuredClone(envelope.observation) };
      },
      decode: () => envelope,
    },
    run,
    artifact,
    envelope,
  };
}

test('collector independently binds artifact/envelope to the live trusted main attempt', async () => {
  const f = fixture();
  assert.equal((await collectGardenObservations(f.input)).envelopes.length, 1);
  f.envelope.observation.identity.headSha = 'b'.repeat(40);
  const bad = await collectGardenObservations(f.input);
  assert.equal(bad.envelopes.length, 0);
  assert.match(bad.diagnostics[0], /provenance/);
});

test('untrusted PR/wrong-workflow producers are excluded, malformed/expired evidence stays visible', async () => {
  for (const mode of ['pr', 'workflow', 'expired', 'invalid']) {
    const f = fixture();
    if (mode === 'pr') f.run.event = 'pull_request';
    if (mode === 'workflow') f.run.path = '.github/workflows/other.yml';
    if (mode === 'expired') f.artifact.expired = true;
    if (mode === 'invalid')
      f.input.validateObservation = () => {
        throw new Error('G2 invalid');
      };
    const report = await collectGardenObservations(f.input);
    assert.equal(report.envelopes.length, 0, mode);
    assert.equal(
      report.diagnostics.length,
      ['pr', 'workflow'].includes(mode) ? 0 : 1,
      mode,
    );
  }
});

test('empty live inventory produces no fictitious observations', async () => {
  const f = fixture();
  f.input.github.paginate = async () => [];
  assert.deepEqual((await collectGardenObservations(f.input)).envelopes, []);
});

test('fresh canonical API mismatch or unavailable source graph blocks stale artifact timing', async () => {
  for (const mode of ['timing', 'completedAt', 'source']) {
    const f = fixture();
    if (mode === 'source')
      f.input.workflowGraphFromSource = () => {
        throw new Error('Missing immutable workflow graph');
      };
    else
      f.input.collectRun = async () => ({
        observation: {
          ...f.envelope.observation,
          ...(mode === 'timing'
            ? { metrics: { elapsedMs: 999 } }
            : {
                identity: {
                  ...f.envelope.observation.identity,
                  completedAt: '2026-11-02T00:00:11Z',
                },
              }),
        },
      });
    const report = await collectGardenObservations(f.input);
    assert.equal(report.envelopes.length, 0, mode);
    assert.equal(report.diagnostics.length, 1, mode);
  }
});
