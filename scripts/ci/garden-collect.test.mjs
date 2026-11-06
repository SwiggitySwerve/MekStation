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

function fixture({ guard = false } = {}) {
  const metadata = { id: 1, full_name: 'owner/repo', default_branch: 'main' };
  const run = {
    id: 123,
    run_attempt: 1,
    workflow_id: 12,
    event: 'push',
    head_branch: 'main',
    head_sha: 'a'.repeat(40),
    repository: { id: 1, full_name: 'owner/repo' },
    head_repository: { id: 1, full_name: 'owner/repo' },
    path: '.github/workflows/pr-checks.yml',
    conclusion: 'success',
    status: 'completed',
    created_at: '2026-11-02T00:00:00Z',
    run_started_at: '2026-11-02T00:00:01Z',
  };
  const artifact = {
    id: 7,
    name: filename,
    workflow_run: {
      id: 123,
      head_sha: run.head_sha,
      head_branch: 'main',
      repository_id: 1,
      head_repository_id: 1,
    },
    created_at: '2026-11-02T00:00:05Z',
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
  const producer = {
    ...run,
    id: 456,
    run_attempt: 2,
    workflow_id: 88,
    event: 'workflow_run',
    head_sha: 'c'.repeat(40),
    path: '.github/workflows/lint-and-test-guard.yml',
    created_at: '2026-11-02T00:01:00Z',
    run_started_at: '2026-11-02T00:01:01Z',
  };
  const producerObservation = {
    complete: true,
    identity: {
      ...envelope.observation.identity,
      runId: producer.id,
      attempt: producer.run_attempt,
      workflowId: producer.workflow_id,
      headSha: producer.head_sha,
      event: producer.event,
      createdAt: producer.created_at,
      startedAt: producer.run_started_at,
      completedAt: '2026-11-02T00:01:10.000Z',
    },
  };
  const branch = { commit: { sha: 'd'.repeat(40) } };
  const comparison = {
    status: 'ahead',
    base_commit: { sha: producer.head_sha },
    merge_base_commit: { sha: producer.head_sha },
  };
  if (guard) {
    envelope.producer = {
      schema: 'mekstation/ci-observation-producer/v1',
      repository: 'owner/repo',
      runId: producer.id,
      attempt: producer.run_attempt,
      headSha: producer.head_sha,
      sourceRunId: run.id,
      sourceAttempt: run.run_attempt,
    };
    artifact.workflow_run = {
      ...artifact.workflow_run,
      id: producer.id,
      head_sha: producer.head_sha,
    };
    artifact.created_at = '2026-11-02T00:01:05Z';
  }
  const github = {
    rest: {
      repos: {
        getContent: async (args) => {
          const source = args.path === '.github/workflows/pr-checks.yml';
          assert.equal(args.ref, source ? run.head_sha : producer.head_sha);
          return {
            data: {
              encoding: 'base64',
              content: Buffer.from(
                source ? 'source workflow' : 'guard workflow',
              ).toString('base64'),
              sha: source ? 'source-blob' : 'guard-blob',
            },
          };
        },
        get: async () => ({
          data: metadata,
        }),
        getBranch: async () => ({ data: branch }),
        compareCommitsWithBasehead: async (args) => {
          assert.equal(
            args.basehead,
            `${producer.head_sha}...${branch.commit.sha}`,
          );
          return { data: comparison };
        },
      },
      actions: {
        listArtifactsForRepo: 'artifacts',
        getWorkflowRunAttempt: async ({ run_id }) => {
          if (![run.id, producer.id].includes(run_id))
            throw new Error('Unknown live run');
          return { data: run_id === run.id ? run : producer };
        },
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
        assert.ok(['source workflow', 'guard workflow'].includes(source));
        return { jobGraph: { test: [] }, matrixGroups: {} };
      },
      collectRun: async (_transport, target) => {
        assert.deepEqual(Object.keys(target.graphs.graphs), [
          target.runId === run.id ? run.head_sha : producer.head_sha,
        ]);
        return {
          observation: structuredClone(
            target.runId === run.id
              ? envelope.observation
              : producerObservation,
          ),
        };
      },
      decode: () => envelope,
    },
    run,
    artifact,
    envelope,
    metadata,
    producer,
    producerObservation,
    branch,
    comparison,
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

test('G2 receives the immutable-head graph and a read-only fresh API transport', async () => {
  const f = fixture();
  const routes = [];
  f.input.github.request = async (route) => {
    routes.push(route);
    return { data: f.run };
  };
  f.input.collectRun = async (transport, target) => {
    assert.deepEqual(
      await transport(
        'GET',
        `repos/owner/repo/actions/runs/${target.runId}/attempts/${target.attempt}`,
      ),
      f.run,
    );
    await assert.rejects(transport('POST', 'anything'), /read-only/);
    return { observation: structuredClone(f.envelope.observation) };
  };
  const result = await collectGardenObservations(f.input);
  assert.equal(result.envelopes.length, 1);
  assert.deepEqual(routes, [
    'GET /repos/owner/repo/actions/runs/123/attempts/1',
  ]);
  assert.equal(
    result.sources[0].completedAt,
    f.envelope.observation.identity.completedAt,
  );
  assert.equal(result.sources[0].workflowBlobSha, 'source-blob');
});

test('a verified Guard producer may upload a distinct completed PR Checks observation', async () => {
  const f = fixture({ guard: true });
  const result = await collectGardenObservations(f.input);
  assert.equal(result.envelopes.length, 1);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.sources[0].runId, f.run.id);
  assert.equal(result.sources[0].producer.runId, f.producer.id);
  assert.equal(result.sources[0].producer.kind, 'trusted-guard');
  assert.equal(result.sources[0].producer.workflowBlobSha, 'guard-blob');
  assert.equal(result.sources[0].producer.defaultHeadSha, f.branch.commit.sha);
});

test('wrong producer stamps or live metadata cannot authorize a source observation', async () => {
  const mutations = {
    'unstamped distinct producer': (f) => {
      delete f.envelope.producer;
    },
    'stamp run': (f) => {
      f.envelope.producer.runId = 999;
    },
    'stamp attempt': (f) => {
      f.envelope.producer.attempt = 3;
    },
    'stamp head': (f) => {
      f.envelope.producer.headSha = 'b'.repeat(40);
    },
    'stamp repository': (f) => {
      f.envelope.producer.repository = 'other/repo';
    },
    'stamp source run': (f) => {
      f.envelope.producer.sourceRunId = 999;
    },
    'stamp source attempt': (f) => {
      f.envelope.producer.sourceAttempt = 2;
    },
    'artifact run': (f) => {
      f.artifact.workflow_run.id = 999;
    },
    'artifact head': (f) => {
      f.artifact.workflow_run.head_sha = 'b'.repeat(40);
    },
    'artifact repository': (f) => {
      f.artifact.workflow_run.repository_id = 9;
    },
    'artifact head repository': (f) => {
      f.artifact.workflow_run.head_repository_id = 9;
    },
    'artifact branch': (f) => {
      f.artifact.workflow_run.head_branch = 'feature';
    },
    'live producer id': (f) => {
      f.producer.id = 999;
    },
    'live producer attempt': (f) => {
      f.producer.run_attempt = 3;
    },
    'live producer head': (f) => {
      f.producer.head_sha = 'b'.repeat(40);
    },
    'live producer repository': (f) => {
      f.producer.repository = { id: 9, full_name: 'owner/repo' };
    },
    'live producer fork': (f) => {
      f.producer.head_repository = { id: 9, full_name: 'owner/repo' };
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const f = fixture({ guard: true });
    mutate(f);
    const result = await collectGardenObservations(f.input);
    assert.equal(result.envelopes.length, 0, name);
    assert.equal(result.diagnostics.length, 1, name);
  }
});

test('a main branch string is insufficient: verify Guard path, event, status and default-head ancestry', async () => {
  const mutations = {
    'wrong event': (f) => {
      f.producer.event = 'workflow_dispatch';
    },
    'wrong path': (f) => {
      f.producer.path = '.github/workflows/untrusted.yml';
    },
    'wrong branch': (f) => {
      f.producer.head_branch = 'feature';
      f.artifact.workflow_run.head_branch = 'feature';
    },
    'running producer': (f) => {
      f.producer.status = 'in_progress';
    },
    'failed producer': (f) => {
      f.producer.conclusion = 'failure';
    },
    'diverged commit': (f) => {
      f.comparison.status = 'diverged';
    },
    'wrong comparison base': (f) => {
      f.comparison.base_commit.sha = 'b'.repeat(40);
    },
    'wrong merge base': (f) => {
      f.comparison.merge_base_commit.sha = 'b'.repeat(40);
    },
    'unavailable default history': (f) => {
      f.input.github.rest.repos.compareCommitsWithBasehead = async () => {
        throw new Error('API unavailable');
      };
    },
    'unavailable immutable Guard source': (f) => {
      f.input.github.rest.repos.getContent = async (args) => {
        if (args.path.includes('guard')) throw new Error('Guard blob missing');
        return {
          data: {
            encoding: 'base64',
            content: Buffer.from('source workflow').toString('base64'),
          },
        };
      };
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const f = fixture({ guard: true });
    mutate(f);
    const result = await collectGardenObservations(f.input);
    assert.equal(result.envelopes.length, 0, name);
    assert.equal(result.diagnostics.length, 1, name);
  }
});

test('artifact creation and fresh completion bind producer attempts rather than trusting a claimed attempt', async () => {
  for (const created of [
    '2026-11-02T00:00:05Z',
    '2026-11-02T00:01:11Z',
    'invalid',
  ]) {
    const f = fixture({ guard: true });
    f.artifact.created_at = created;
    const result = await collectGardenObservations(f.input);
    assert.equal(result.envelopes.length, 0, created);
    assert.equal(result.diagnostics.length, 1, created);
  }
  const f = fixture({ guard: true });
  f.producerObservation.identity.attempt = 3;
  assert.equal((await collectGardenObservations(f.input)).envelopes.length, 0);
});

test('Guard publication never relaxes source tuple, main-push policy, or fresh source timing equality', async () => {
  const mutations = {
    'source id': (f) => {
      f.envelope.observation.identity.runId = 999;
    },
    'source attempt': (f) => {
      f.envelope.observation.identity.attempt = 2;
    },
    'source head': (f) => {
      f.envelope.observation.identity.headSha = 'b'.repeat(40);
    },
    'source repository': (f) => {
      f.run.repository = { id: 9, full_name: 'owner/repo' };
    },
    'source fork': (f) => {
      f.run.head_repository = { id: 9, full_name: 'owner/repo' };
    },
    'source PR event': (f) => {
      f.run.event = 'pull_request';
    },
    'source feature branch': (f) => {
      f.run.head_branch = 'feature';
    },
    'source running': (f) => {
      f.run.status = 'in_progress';
    },
    'source graph/timing mismatch': (f) => {
      f.input.collectRun = async () => ({ observation: {} });
    },
    'source completed after producer started': (f) => {
      f.envelope.observation.identity.completedAt = '2026-11-02T00:02:00Z';
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const f = fixture({ guard: true });
    mutate(f);
    assert.equal(
      (await collectGardenObservations(f.input)).envelopes.length,
      0,
      name,
    );
  }
});

test('legacy direct-source acceptance still requires actual artifact metadata, repository and attempt time', async () => {
  const valid = fixture();
  const accepted = await collectGardenObservations(valid.input);
  assert.equal(accepted.sources[0].producer.kind, 'direct-source');
  for (const mode of [
    'repository',
    'head',
    'before-attempt',
    'after-attempt',
  ]) {
    const f = fixture();
    if (mode === 'repository') f.artifact.workflow_run.repository_id = 9;
    if (mode === 'head') f.artifact.workflow_run.head_sha = 'b'.repeat(40);
    if (mode === 'before-attempt') f.artifact.created_at = f.run.created_at;
    if (mode === 'after-attempt')
      f.artifact.created_at = '2026-11-02T00:00:11Z';
    assert.equal(
      (await collectGardenObservations(f.input)).envelopes.length,
      0,
      mode,
    );
  }
});
