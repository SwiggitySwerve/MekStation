import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeRun } from './ci-metrics.mjs';
import {
  evaluateReport,
  REPORT_MARKER,
  REVIEW_LABEL,
  renderReport,
} from './ci-report-evaluate.mjs';
import { collectRun, paginate, publishReport } from './ci-report-github.mjs';

function setup() {
  const repository = 'owner/repo';
  const head = 'a'.repeat(40);
  const run = {
    id: 100,
    run_attempt: 1,
    workflow_id: 10,
    head_sha: head,
    event: 'pull_request',
    head_branch: 'feature',
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-11-02T00:00:00Z',
    run_started_at: '2026-11-02T00:00:00Z',
    pull_requests: [{ number: 1, head: { sha: head } }],
  };
  const jobs = [
    {
      id: 1,
      name: 'tests',
      run_id: 100,
      run_attempt: 1,
      head_sha: head,
      status: 'completed',
      conclusion: 'success',
      runner_id: 1,
      labels: ['ubuntu-latest'],
      started_at: '2026-11-02T00:00:10Z',
      completed_at: '2026-11-02T00:01:10Z',
    },
  ];
  const observation = normalizeRun({
    repository,
    run,
    jobs,
    jobGraph: { tests: [] },
  });
  const report = evaluateReport({
    observation,
    limits: { jobsMs: { tests: 59999 } },
  });
  const pr = {
    state: 'open',
    head: { sha: head },
    base: { repo: { full_name: repository } },
  };
  const comments = [];
  const labels = [];
  const calls = [];
  let fail;
  async function api(method, route, body) {
    calls.push({ method, route, body });
    if (fail?.(method, route)) throw new Error('Transient HTTP 503');
    if (method === 'GET') {
      if (route.endsWith('/actions/runs/100') || route.endsWith('/attempts/1'))
        return run;
      if (route.includes('/attempts/1/jobs?')) return { jobs };
      if (route.endsWith('/pulls/1')) return pr;
      if (route.includes('/comments?')) return comments;
      if (route.includes('/labels?')) return labels;
    }
    if (method === 'POST' && route.endsWith('/comments')) {
      const comment = {
        id: 11,
        body: body.body,
        user: { type: 'Bot', login: 'github-actions[bot]' },
      };
      comments.push(comment);
      return comment;
    }
    if (method === 'PATCH' && route.includes('/issues/comments/')) {
      comments.find((comment) => route.endsWith(`/${comment.id}`)).body =
        body.body;
      return {};
    }
    if (method === 'DELETE' && route.includes('/issues/comments/')) {
      const i = comments.findIndex((comment) =>
        route.endsWith(`/${comment.id}`),
      );
      comments.splice(i, 1);
      return null;
    }
    if (method === 'POST' && route.endsWith('/labels')) {
      labels.push({ name: body.labels[0] });
      return labels;
    }
    if (method === 'DELETE' && route.endsWith(`/labels/${REVIEW_LABEL}`)) {
      labels.splice(0);
      return null;
    }
    throw new Error(`Unexpected API call ${method} ${route}`);
  }
  const publish = (extra = {}) =>
    publishReport({
      api,
      repository,
      pullNumber: 1,
      expectedWorkflowId: 10,
      report,
      ...extra,
    });
  return {
    run,
    pr,
    jobs,
    comments,
    labels,
    calls,
    report,
    api,
    publish,
    setFailure: (value) => {
      fail = value;
    },
  };
}

test('breach adds one sticky comment and label; repeated delivery performs no writes', async () => {
  const s = setup();
  assert.equal((await s.publish()).status, 'published');
  assert.equal(s.comments.length, 1);
  assert.equal(s.labels[0].name, REVIEW_LABEL);
  assert.equal((await s.publish()).actions.length, 0);
  assert.equal(s.comments.length, 1);
});

test('duplicate owned comments collapse; human marker and other bot comments survive', async () => {
  const s = setup();
  const comment = {
    body: `${REPORT_MARKER}\nold`,
    user: { type: 'Bot', login: 'github-actions[bot]' },
  };
  s.comments.push(
    { ...comment, id: 1 },
    { ...comment, id: 2 },
    { ...comment, id: 3, user: { type: 'User', login: 'owner' } },
    { ...comment, id: 4, user: { type: 'Bot', login: 'other[bot]' } },
  );
  const result = await s.publish();
  assert.equal(result.status, 'published');
  assert.deepEqual(
    s.comments.map((c) => c.id),
    [1, 3, 4],
  );
  assert.equal(s.comments[0].body, renderReport(s.report));
});

test('complete no-breach clears only the review label; missing data retains it', async () => {
  const s = setup();
  s.labels.push({ name: REVIEW_LABEL });
  const within = {
    ...s.report,
    breach: false,
    complete: true,
    status: 'within',
  };
  await s.publish({ report: within });
  assert.equal(s.labels.length, 0);
  s.labels.push({ name: REVIEW_LABEL });
  await s.publish({
    report: { ...within, complete: false, status: 'missing' },
  });
  assert.equal(s.labels.length, 1);
});

test('cross-head, changed attempt, unrelated PR, wrong workflow and closed PR never write', async () => {
  for (const change of [
    (s) => (s.pr.head.sha = 'b'.repeat(40)),
    (s) => s.run.run_attempt++,
    (s) => s.run.workflow_id++,
    (s) => (s.run.pull_requests = []),
    (s) => (s.run.pull_requests[0].head.sha = 'b'.repeat(40)),
    (s) => (s.pr.state = 'closed'),
  ]) {
    const s = setup();
    change(s);
    assert.equal((await s.publish()).status, 'stale');
    assert.ok(s.calls.every(({ method }) => method === 'GET'));
  }
});

test('newer same-head sticky source cannot be overwritten by an older run', async () => {
  const s = setup();
  s.comments.push({
    id: 1,
    user: { type: 'Bot', login: 'github-actions[bot]' },
    body: `${REPORT_MARKER}\n<!-- source:101:1:${s.pr.head.sha} -->`,
  });
  assert.equal((await s.publish()).status, 'stale');
  assert.ok(s.calls.every(({ method }) => method === 'GET'));
});

test('head change between read and write aborts mutation', async () => {
  const s = setup();
  s.setFailure((method, route) => {
    if (route.includes('/comments?')) s.pr.head.sha = 'b'.repeat(40);
    return false;
  });
  const result = await s.publish();
  assert.equal(result.status, 'error');
  assert.equal(result.actions.length, 0);
  assert.match(result.diagnostics.join(), /changed before write/);
});

test('API read, comment and label failures produce diagnostics without throwing', async () => {
  for (const routePart of ['/actions/runs/', '/comments', '/labels']) {
    const s = setup();
    s.setFailure((method, route) => route.includes(routePart));
    const result = await s.publish();
    assert.equal(result.status, 'error');
    assert.match(result.diagnostics.join(), /503/);
  }
});

test('dry run performs real reads and plans both mutations without writing', async () => {
  const s = setup();
  const result = await s.publish({ dryRun: true });
  assert.equal(result.status, 'dry-run');
  assert.equal(result.actions.length, 2);
  assert.ok(s.calls.every(({ method }) => method === 'GET'));
});

test('collector uses attempt-specific endpoints and rejects cross-attempt API data', async () => {
  const s = setup();
  const options = {
    repository: 'owner/repo',
    runId: 100,
    attempt: 1,
    jobGraph: { tests: [] },
  };
  assert.equal((await collectRun(s.api, options)).observation.complete, true);
  assert.ok(s.calls.every(({ route }) => route.includes('/attempts/1')));
  s.jobs[0].run_attempt = 2;
  await assert.rejects(collectRun(s.api, options), /Cross-run/);
});

test('pagination retains every job/comment including later pages', async () => {
  const pages = [];
  const rows = await paginate(async (_method, route) => {
    pages.push(route);
    return route.endsWith('page=1')
      ? Array.from({ length: 100 }, (_, id) => ({ id }))
      : [{ id: 100 }];
  }, 'route?filter=all');
  assert.equal(rows.length, 101);
  assert.equal(pages.length, 2);
});
