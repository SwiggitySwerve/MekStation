import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  CORE_DERIVER_FILE,
  coreDeriverSha,
  familyDeriverFile,
  familyDeriverSha,
  gitBlobSha,
} from '../lib/runtime-parity/fingerprints.mjs';
import {
  CENSUS_WORKFLOW,
  MAX_IN_FLIGHT,
  Refusal,
  censusDispatch,
  checkInFlight,
  deriverPrecheck,
  precheckInputs,
  runIdFromDispatch,
} from './census-dispatch.mjs';
import { readRegistry } from './parity-runtime-families.mjs';

const RUN = 4242;
const HEAD = 'c'.repeat(40);
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
  head = HEAD,
  commitsError = false,
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
    if (group === 'api' && args[1].includes('/commits/')) {
      if (commitsError) throw new Error('HTTP 404 ref');
      return { stdout: JSON.stringify({ sha: head }), stderr: '' };
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
      localHead: () => 'other-checkout',
      changed: () => [],
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
    'api',
    'repos/{owner}/{repo}/commits/lane%2Fbranch',
  ]);
  assert.deepEqual(calls[2], [
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
  for (const call of calls.slice(3))
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
  assert.match(
    text,
    /deriver fingerprint not pre-checked: this checkout is not lane\/branch's head/,
  );
  // The gate's own message verbatim, plus the registry's rebaseline list.
  assert.match(
    text,
    /`FACTS_DERIVER_CHANGED`: facts\.mjs is x but the baseline came from y\n\nderiver fingerprint changed \(shared core\): every enabled family \(battlemechs\) must be rebaselined before its gate can pass\./,
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
  assert.deepEqual(
    calls.filter(([group]) => group === 'api').map((call) => call[1]),
    [
      'repos/owner/repo/commits/lane%2Fbranch',
      'repos/owner/repo/actions/runs/4242/artifacts?per_page=100',
    ],
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

test("deriver pre-check: the checkout's core and family fingerprints against each enabled family's baseline headers", (t) => {
  const registry = readRegistry();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'census-deriver-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const core = coreDeriverSha();
  const mech = familyDeriverSha('battlemechs');
  const write = (family, load, reopen, reg = registry) => {
    for (const [measure, header] of [
      ['load', load],
      ['reopen', reopen],
    ]) {
      const file = path.join(
        root,
        reg.families[family].baselines[measure].main,
      );
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(header));
    }
  };
  const split = (c = core, f = mech) => ({
    coreDeriverSha: c,
    familyDeriverSha: f,
  });
  const fingerprints = `This checkout's fingerprints are core ${core}, battlemechs ${mech}`;
  // Match: the defaults are the owner's (fingerprints.mjs), the values the census writes, not a copy.
  write('battlemechs', split(), split());
  assert.equal(deriverPrecheck({ registry, root }), null);
  // A core mismatch: every enabled family must be rebaselined.
  write('battlemechs', split('a'.repeat(40)), split());
  assert.equal(
    deriverPrecheck({ registry, root }),
    `deriver fingerprint changed (shared core): every enabled family (battlemechs) must be rebaselined before its gate can pass. ${fingerprints}; the baselines were derived with: battlemechs load core ${'a'.repeat(40)}.`,
  );
  // A family-only mismatch names that family only.
  write('battlemechs', split(), split(core, 'b'.repeat(40)));
  assert.equal(
    deriverPrecheck({ registry, root }),
    `deriver fingerprint changed (battlemechs deriver): only battlemechs must be rebaselined before its gate can pass. ${fingerprints}; the baselines were derived with: battlemechs reopen battlemechs deriver ${'b'.repeat(40)}.`,
  );
  // A pre-split header (neither field) is a legacy note, never an error or a mismatch.
  write('battlemechs', { factsDeriverBlob: 'c'.repeat(40) }, split());
  assert.equal(
    deriverPrecheck({ registry, root }),
    'legacy note: battlemechs load has a pre-split baseline header (no coreDeriverSha/familyDeriverSha); a header-only rebaseline records them',
  );
  // A family with no deriver (no facts-<family>.mjs) is logged and skipped; the other families are still checked.
  const withAero = {
    ...registry,
    families: {
      ...registry.families,
      aerospace: {
        ...registry.families.battlemechs,
        baselines: {
          load: {
            main: 'config/parity-runtime/baseline-aerospace-load.json',
            sets: null,
          },
          reopen: {
            main: 'config/parity-runtime/baseline-aerospace-reopen.json',
            sets: null,
          },
        },
      },
    },
  };
  write('aerospace', split(), split(), withAero);
  write('battlemechs', split(), split(core, 'b'.repeat(40)));
  const lines = deriverPrecheck({ registry: withAero, root }).split('\n');
  assert.match(
    lines[0],
    /^deriver fingerprint changed \(battlemechs deriver\): only battlemechs/,
  );
  assert.equal(
    lines[1],
    'aerospace: deriver fingerprint not pre-checked (family aerospace has no deriver (facts-aerospace.mjs)); skipped',
  );
  // An unreadable header is the same: logged for that family, never thrown.
  fs.rmSync(path.join(root, withAero.families.aerospace.baselines.load.main));
  assert.match(
    deriverPrecheck({ registry: withAero, root }),
    /aerospace: deriver fingerprint not pre-checked \(.*\); skipped/,
  );
  // A shared core that cannot be fingerprinted skips the whole pre-check, as a message, not a throw.
  assert.match(
    deriverPrecheck({
      registry,
      root,
      core: () => {
        throw new Error('no core');
      },
    }),
    /^deriver fingerprint not pre-checked: the shared core could not be fingerprinted \(no core\)$/,
  );
});

test('the pre-check runs only at the ref head with unchanged inputs, and only informs', async (t) => {
  const changedMessage =
    'deriver fingerprint changed (shared core): every enabled family (battlemechs) must be rebaselined before its gate can pass.';
  const fail = (message) => () => {
    throw new Error(message);
  };
  for (const [label, extra, expected, runs] of [
    [
      'at head, clean',
      { localHead: () => HEAD },
      /^deriver fingerprint changed \(shared core\): every enabled family \(battlemechs\)/m,
      true,
    ],
    [
      'another checkout',
      { localHead: () => 'other-checkout' },
      /^deriver fingerprint not pre-checked: this checkout is not lane\/branch's head/m,
      false,
    ],
    [
      'inputs changed locally',
      {
        localHead: () => HEAD,
        changed: () => ['scripts/lib/runtime-parity/facts-core.mjs'],
      },
      /^deriver fingerprint not pre-checked: scripts\/lib\/runtime-parity\/facts-core\.mjs changed in this checkout, so it doesn't speak for lane\/branch/m,
      false,
    ],
    [
      'pre-check throws',
      // This case replaces the counting stub, so it counts nothing.
      { localHead: () => HEAD, precheck: fail('baseline unreadable') },
      /^deriver fingerprint pre-check failed \(baseline unreadable\); dispatching anyway/m,
      false,
    ],
    [
      'git status throws',
      { localHead: () => HEAD, changed: fail('git status failed: boom') },
      /^deriver fingerprint pre-check failed \(git status failed: boom\); dispatching anyway/m,
      false,
    ],
    [
      'ref head lookup throws',
      { commitsError: true },
      /^deriver fingerprint pre-check failed \(HTTP 404 ref\); dispatching anyway/m,
      false,
    ],
  ]) {
    const { gh, calls } = fakeGh({
      artifacts: [],
      commitsError: extra.commitsError,
    });
    let checked = 0;
    const { lines, options: opts } = options(t, gh, {
      measures: 'load',
      precheck: () => {
        checked += 1;
        return changedMessage;
      },
      ...extra,
    });
    await censusDispatch(opts);
    assert.equal(checked > 0, runs, label);
    assert.match(lines.join('\n'), expected, label);
    // Dispatched every time: the hosted gate is the judge.
    assert.ok(
      calls.some(([group]) => group === 'workflow'),
      label,
    );
  }
});

test('the pre-check inputs are the deriver files and the enabled baselines, read through real git status', async (t) => {
  const registry = readRegistry();
  // The deriver file names are fingerprints.mjs's own, not a copy.
  const dir = 'scripts/lib/runtime-parity';
  assert.deepEqual(precheckInputs(registry), [
    `${dir}/${CORE_DERIVER_FILE}`,
    `${dir}/${familyDeriverFile('battlemechs')}`,
    'config/parity-runtime/baseline-load.json',
    'config/parity-runtime/baseline-reopen.json',
  ]);
  assert.equal(CORE_DERIVER_FILE, 'facts-core.mjs');
  // The listed files are the ones the owner fingerprints.
  const blobOf = (file) =>
    gitBlobSha(
      Buffer.from(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8'),
    );
  assert.equal(blobOf(`${dir}/${CORE_DERIVER_FILE}`), coreDeriverSha());
  assert.equal(
    blobOf(`${dir}/${familyDeriverFile('battlemechs')}`),
    familyDeriverSha('battlemechs'),
  );
  // A real repository: a clean checkout is pre-checked; a modified input is skipped by name.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'census-precheck-git-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const identity = {
    GIT_AUTHOR_NAME: 'test',
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
  };
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...identity },
    }).trim();
  git('init', '-q');
  for (const file of precheckInputs(registry)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '{}\n');
  }
  git('add', '.');
  git('commit', '-qm', 'fixture');
  const head = git('rev-parse', 'HEAD');
  for (const [modify, expected] of [
    [false, /^checked$/m],
    [
      true,
      /^deriver fingerprint not pre-checked: config\/parity-runtime\/baseline-load\.json changed in this checkout/m,
    ],
  ]) {
    if (modify)
      fs.writeFileSync(
        path.join(root, 'config/parity-runtime/baseline-load.json'),
        '{"x":1}\n',
      );
    const { gh } = fakeGh({ artifacts: [], head });
    const { lines, options: opts } = options(t, gh, {
      measures: 'load',
      root,
      // The real git defaults: HEAD and status of the fixture repository.
      localHead: undefined,
      changed: undefined,
      precheck: () => 'checked',
    });
    await censusDispatch(opts);
    assert.match(lines.join('\n'), expected);
  }
});
