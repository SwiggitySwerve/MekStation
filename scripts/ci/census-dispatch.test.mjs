import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  CENSUS_WORKFLOW,
  MAX_IN_FLIGHT,
  Refusal,
  censusDispatch,
  checkInFlight,
  runIdFromDispatch,
} from './census-dispatch.mjs';
import { readRegistry } from './parity-runtime-families.mjs';

const RUN = 4242;
const URL = `https://github.com/owner/repo/actions/runs/${RUN}`;
const gateReport = (extra = {}) => ({
  measure: 'load',
  runSha: 'b'.repeat(40),
  exitCode: 0,
  population: { overlap: 4263, tonight: 4263 },
  regressions: [],
  failClosed: [],
  unprotectedGains: [],
  unbaselined: [],
  removed: [],
  lastGreen: { status: 'applied', detail: '' },
  ...extra,
});
const summaryJson = {
  'load.equal': 1,
  gates: { 'x.y': { gated: false } },
};

/** A scripted gh: answers by command, records every call. */
function fakeGh({
  runs = [],
  dispatchOutput = { stdout: `${URL}\n`, stderr: '' },
  views = [
    { status: 'queued' },
    { status: 'in_progress' },
    {
      status: 'completed',
      conclusion: 'success',
      jobs: [
        { name: 'Plan', conclusion: 'success' },
        {
          name: 'census (battlemechs, load, 15) / Parity Runtime battlemechs load',
          conclusion: 'success',
          url: 'job-load',
        },
        {
          name: 'census (battlemechs, reopen, 20) / Parity Runtime battlemechs reopen',
          conclusion: 'failure',
          url: 'job-reopen',
        },
      ],
    },
  ],
  artifacts = [
    'parity-runtime-load',
    'parity-runtime-last-green-load',
    'parity-runtime-reopen',
  ],
  reports = {
    'parity-runtime-load': gateReport(),
    'parity-runtime-reopen': gateReport({
      measure: 'reopen',
      exitCode: 2,
      failClosed: [
        {
          reason: 'FACTS_DERIVER_CHANGED',
          message: 'facts.mjs is x but the baseline came from y',
        },
      ],
    }),
  },
} = {}) {
  const calls = [];
  let viewIndex = 0;
  const gh = (args) => {
    calls.push(args);
    const [group, command] = args;
    if (group === 'run' && command === 'list')
      return { stdout: JSON.stringify(runs), stderr: '' };
    if (group === 'workflow' && command === 'run') return dispatchOutput;
    if (group === 'run' && command === 'view') {
      const view = views[Math.min(viewIndex++, views.length - 1)];
      if (view instanceof Error) throw view;
      return {
        stdout: JSON.stringify({ url: URL, jobs: [], ...view }),
        stderr: '',
      };
    }
    if (group === 'api')
      return {
        stdout: JSON.stringify({
          artifacts: artifacts.map((name) => ({ name })),
        }),
        stderr: '',
      };
    if (group === 'run' && command === 'download') {
      const name = args[args.indexOf('--name') + 1];
      const dir = args[args.indexOf('--dir') + 1];
      fs.mkdirSync(path.join(dir, 'gate'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'gate/gate-report.json'),
        JSON.stringify(reports[name]),
      );
      fs.writeFileSync(
        path.join(dir, 'summary.json'),
        JSON.stringify(summaryJson),
      );
      return { stdout: '', stderr: '' };
    }
    throw new Error(`unexpected gh ${args.join(' ')}`);
  };
  return { gh, calls };
}

function options(t, gh, extra = {}) {
  const lines = [];
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'census-dispatch-'));
  t.after(() => fs.rmSync(workDir, { recursive: true, force: true }));
  return {
    lines,
    options: {
      ref: 'lane/branch',
      families: 'battlemechs',
      measures: 'both',
      gh,
      sleep: async () => {},
      log: (...parts) => lines.push(parts.join('\n')),
      registry: readRegistry(),
      workDir,
      ...extra,
    },
  };
}

test('the run id comes from the dispatch URL only', () => {
  assert.equal(runIdFromDispatch(`✓ Created\n${URL}\n`), RUN);
  assert.throws(
    () => runIdFromDispatch('✓ Created workflow_dispatch event'),
    /no run URL[\s\S]*never guessed from gh run list/,
  );
});

test('in-flight rule: the same ref refuses; so does reaching the repo-wide limit', () => {
  const run = (headBranch, status = 'in_progress') => ({
    databaseId: 1,
    status,
    headBranch,
    url: `u-${headBranch}`,
  });
  assert.equal(MAX_IN_FLIGHT, 2);
  checkInFlight([run('lane/branch', 'completed'), run('other')], 'lane/branch');
  assert.throws(
    () => checkInFlight([run('lane/branch', 'queued')], 'lane/branch'),
    /lane\/branch already has a parity-census run in flight \(u-lane\/branch\)/,
  );
  assert.throws(
    () => checkInFlight([run('a'), run('b', 'queued')], 'lane/branch'),
    (error) =>
      error instanceof Refusal &&
      /2 parity-census runs are already in flight repo-wide \(limit 2\)/.test(
        error.message,
      ),
  );
  // Completed runs never count.
  checkInFlight(
    [run('a'), run('b', 'completed'), run('c', 'completed')],
    'lane/branch',
  );
});

test('a refused dispatch never calls gh workflow run', async (t) => {
  for (const runs of [
    [{ databaseId: 1, status: 'queued', headBranch: 'lane/branch' }],
    [
      { databaseId: 1, status: 'in_progress', headBranch: 'a' },
      { databaseId: 2, status: 'waiting', headBranch: 'b' },
    ],
  ]) {
    const { gh, calls } = fakeGh({ runs });
    await assert.rejects(censusDispatch(options(t, gh).options), Refusal);
    assert.ok(!calls.some(([group]) => group === 'workflow'));
  }
  // Unknown and disabled families are refused before any gh call.
  for (const families of ['vehicles', 'aerospace']) {
    const { gh, calls } = fakeGh();
    await assert.rejects(
      censusDispatch(options(t, gh, { families }).options),
      Refusal,
    );
    assert.equal(calls.length, 0);
  }
});

test('dispatch, wait, then each job with its gate summary and the artifact names', async (t) => {
  const { gh, calls } = fakeGh({
    runs: [{ databaseId: 1, status: 'in_progress', headBranch: 'other' }],
  });
  const { lines, options: opts } = options(t, gh);
  const result = await censusDispatch(opts);
  assert.deepEqual(result, { runId: RUN, conclusion: 'success', exitCode: 0 });
  assert.deepEqual(calls[1], [
    'workflow',
    'run',
    CENSUS_WORKFLOW,
    '--ref',
    'lane/branch',
    '-f',
    'families=battlemechs',
    '-f',
    'measures=both',
  ]);
  // Every later call targets the dispatched run id, never a listed one.
  for (const call of calls.slice(2))
    assert.ok(
      call.includes(String(RUN)) ||
        call.some((part) => part.includes(`/runs/${RUN}/`)),
      call.join(' '),
    );
  assert.equal(calls.filter((call) => call[1] === 'view').length, 3);
  const text = lines.join('\n');
  assert.match(
    text,
    /dispatched parity-census\.yml run 4242 on lane\/branch: battlemechs load, battlemechs reopen/,
  );
  assert.match(text, /job Plan: success/);
  assert.match(text, /job battlemechs load: success job-load/);
  assert.match(text, /## Runtime parity: battlemechs load/);
  assert.match(text, /job battlemechs reopen: failure job-reopen/);
  // The gate's own message verbatim, plus the registry's rebaseline list.
  assert.match(
    text,
    /`FACTS_DERIVER_CHANGED`: facts\.mjs is x but the baseline came from y\n\nEnabled families that must be rebaselined[^\n]*: battlemechs\./,
  );
  assert.match(
    text,
    /artifacts: parity-runtime-load, parity-runtime-last-green-load, parity-runtime-reopen/,
  );
  assert.match(
    text,
    /run 4242 success: https:\/\/github\.com\/owner\/repo\/actions\/runs\/4242/,
  );
});

test('a missing artifact, a failed run and --repo are reported, not hidden', async (t) => {
  const { gh, calls } = fakeGh({
    artifacts: [],
    views: [
      {
        status: 'completed',
        conclusion: 'failure',
        jobs: [{ name: 'Plan', conclusion: 'failure' }],
      },
    ],
  });
  const { lines, options: opts } = options(t, gh, {
    repo: 'owner/repo',
    measures: 'load',
  });
  const result = await censusDispatch(opts);
  assert.equal(result.exitCode, 1);
  const text = lines.join('\n');
  assert.match(text, /job Plan: failure/);
  assert.match(text, /job battlemechs load: not run/);
  assert.match(text, /no parity-runtime-load artifact, so no gate summary/);
  assert.match(text, /artifacts: none/);
  for (const call of calls.filter(([group]) => group !== 'api'))
    assert.deepEqual(call.slice(-2), ['--repo', 'owner/repo']);
  assert.ok(
    calls
      .find(([group]) => group === 'api')[1]
      .startsWith('repos/owner/repo/actions/runs/4242/'),
  );
});

test('the wait survives API blips, gives up after five in a row, and stops at the deadline', async (t) => {
  const blip = new Error('HTTP 502');
  const ok = fakeGh({
    views: [
      blip,
      blip,
      { status: 'completed', conclusion: 'success', jobs: [] },
    ],
    artifacts: [],
  });
  assert.equal(
    (await censusDispatch(options(t, ok.gh, { measures: 'load' }).options))
      .exitCode,
    0,
  );
  const down = fakeGh({ views: [blip] });
  await assert.rejects(
    censusDispatch(options(t, down.gh, { measures: 'load' }).options),
    /HTTP 502/,
  );
  const slow = fakeGh({ views: [{ status: 'in_progress' }] });
  const { lines, options: opts } = options(t, slow.gh, {
    measures: 'load',
    waitMinutes: 0,
  });
  assert.deepEqual(await censusDispatch(opts), {
    runId: RUN,
    exitCode: 1,
    conclusion: null,
  });
  assert.match(
    lines.join('\n'),
    /stopped waiting after 0 min; run 4242 is still in_progress/,
  );
});
