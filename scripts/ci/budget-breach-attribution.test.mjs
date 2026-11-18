import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  changedFilesRange,
  checkRepositoryMetrics,
  prChangedFiles,
  reportViolations,
} from './budget-check.mjs';
import { loadBudgets } from './budget-config.mjs';
import { workflowMetrics } from './budget-workflow.mjs';

const root = process.cwd(),
  config = loadBudgets();

/** Census one over the repo-wide limit; the last entry is the newest. */
const breached = () => {
  const count = config.limits.repoWideKeys + 1;
  const files = Array.from({ length: count }, (_, i) => `t/${i}.test.ts`);
  return {
    schema: 'mekstation/ci-budget-metrics/v1',
    budgetConfigHash: 'a'.repeat(64),
    workflow: workflowMetrics(root, config),
    dependencies: structuredClone(config.dependencies),
    cache: {
      files,
      unkeyable: [],
      repoWide: files.map((file) => ({
        file,
        reasons: [`child process in ${file}`],
      })),
    },
  };
};
const violation = (result, code) =>
  result.violations.find((v) => v.code === code);

test('repoWideKeys breach names the PR, the changed repo-wide file and its reason', () => {
  const metrics = breached();
  const limit = config.limits.repoWideKeys;
  const result = checkRepositoryMetrics(config, metrics, [], {
    prNumber: '3401',
    changedFiles: ['README.md', `t/${limit}.test.ts`],
  });
  assert.equal(
    violation(result, 'repoWideKeys').message,
    `${limit + 1} > ${limit} (PR #3401). Changed in this PR and keyed repo-wide: t/${limit}.test.ts (child process in t/${limit}.test.ts).`,
  );
});

test('unkeyableTests breach names the changed unkeyable file and its reason', () => {
  const metrics = breached();
  metrics.cache.repoWide = [];
  metrics.cache.unkeyable = metrics.cache.files
    .slice(0, config.limits.unkeyableTests + 1)
    .map((file) => ({ file, reason: 'whole env' }));
  const result = checkRepositoryMetrics(config, metrics, [], {
    prNumber: '12',
    changedFiles: ['t/3.test.ts'],
  });
  assert.match(
    violation(result, 'unkeyableTests').message,
    /\(PR #12\)\. Changed in this PR and unkeyable: t\/3\.test\.ts \(whole env\)\.$/,
  );
});

test('breach with no changed census file says a shared input changed', () => {
  const result = checkRepositoryMetrics(config, breached(), [], {
    prNumber: '3401',
    changedFiles: ['package.json', 'src/lib/shared.ts'],
  });
  const { message } = violation(result, 'repoWideKeys');
  assert.match(message, /\(PR #3401\): /);
  assert.match(
    message,
    /no changed test is itself repo-wide; a shared input changed, see the census artifact ci-budget-repository\.$/,
  );
});

test('long attribution lists are capped', () => {
  const metrics = breached();
  const result = checkRepositoryMetrics(config, metrics, [], {
    prNumber: '1',
    changedFiles: metrics.cache.files,
  });
  const { message } = violation(result, 'repoWideKeys');
  assert.match(message, /\+\d+ more/);
  assert.ok(message.length < 2000, message.length);
});

test('no breach adds nothing, with or without PR context', () => {
  const metrics = breached();
  metrics.cache.repoWide.length = config.limits.repoWideKeys;
  for (const context of [
    undefined,
    { prNumber: '3401', changedFiles: ['t/1.test.ts'] },
  ])
    assert.equal(
      violation(
        checkRepositoryMetrics(config, metrics, [], context),
        'repoWideKeys',
      ),
      undefined,
    );
});

test('no PR context keeps the plain count message', () => {
  const limit = config.limits.repoWideKeys;
  for (const context of [undefined, {}, { changedFiles: ['t/1.test.ts'] }])
    assert.equal(
      violation(
        checkRepositoryMetrics(config, breached(), [], context),
        'repoWideKeys',
      ).message,
      `${limit + 1} > ${limit}`,
    );
});

test('PR number without a changed-file list names only the PR', () => {
  const limit = config.limits.repoWideKeys;
  assert.equal(
    violation(
      checkRepositoryMetrics(config, breached(), [], { prNumber: '7' }),
      'repoWideKeys',
    ).message,
    `${limit + 1} > ${limit} (PR #7)`,
  );
});

test('reportViolations prints each violation and annotates only on GitHub Actions', () => {
  const violations = [
    { code: 'repoWideKeys', message: '11 > 10 (PR #1)' },
    { code: 'timeout', message: 'a\nb 100%' },
  ];
  const plain = [];
  reportViolations(violations, {}, (line) => plain.push(line));
  assert.deepEqual(plain, [
    'repoWideKeys: 11 > 10 (PR #1)',
    'timeout: a\nb 100%',
  ]);
  const hosted = [];
  reportViolations(violations, { GITHUB_ACTIONS: 'true' }, (line) =>
    hosted.push(line),
  );
  assert.deepEqual(hosted, [
    'repoWideKeys: 11 > 10 (PR #1)',
    '::error title=CI budget::repoWideKeys: 11 > 10 (PR #1)',
    'timeout: a\nb 100%',
    '::error title=CI budget::timeout: a%0Ab 100%25',
  ]);
});

test('changedFilesRange prefers the merge parent and falls back to the base SHA', () => {
  const base = 'a'.repeat(40);
  assert.deepEqual(changedFilesRange(2, base), {
    source: 'merge commit HEAD^1..HEAD',
    args: ['HEAD^1', 'HEAD'],
  });
  assert.deepEqual(changedFilesRange(2, undefined).args, ['HEAD^1', 'HEAD']);
  for (const parents of [1, undefined])
    assert.deepEqual(changedFilesRange(parents, base), {
      source: `BUDGET_BASE_SHA ${base}...HEAD`,
      args: [`${base}...HEAD`],
    });
  for (const bad of [undefined, '', '--output=x', 'main'])
    assert.equal(changedFilesRange(1, bad), undefined);
});

test('prChangedFiles diffs a PR merge commit against its first parent, else the base', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-changed-'));
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=t',
        '-c',
        'user.email=t@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args,
      ],
      { cwd: repo, encoding: 'utf8' },
    ).trim();
  const commit = (file, message) => {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    fs.writeFileSync(path.join(repo, file), message);
    git('add', '.');
    git('commit', '-q', '-m', message);
  };
  try {
    git('init', '-q', '-b', 'main');
    commit('base.txt', 'base');
    const staleBase = git('rev-parse', 'HEAD');
    git('switch', '-q', '-c', 'pr');
    commit('dir/new.test.ts', 'pr');
    git('switch', '-q', 'main');
    commit('main-only.txt', 'main moved after the event base');
    // The PR checkout: main merged with the PR, first parent = main.
    git('merge', '-q', '--no-ff', '-m', 'merge pr', 'pr');
    assert.deepEqual(prChangedFiles(staleBase, repo), {
      source: 'merge commit HEAD^1..HEAD',
      files: ['dir/new.test.ts'],
    });
    assert.deepEqual(prChangedFiles(undefined, repo).files, [
      'dir/new.test.ts',
    ]);
    // What the stale three-dot base alone would have blamed.
    assert.deepEqual(prChangedFiles(staleBase, repo, 1).files, [
      'dir/new.test.ts',
      'main-only.txt',
    ]);
    git('switch', '-q', 'pr');
    assert.deepEqual(prChangedFiles(staleBase, repo), {
      source: `BUDGET_BASE_SHA ${staleBase}...HEAD`,
      files: ['dir/new.test.ts'],
    });
    assert.equal(prChangedFiles('f'.repeat(40), repo).files, undefined);
    assert.deepEqual(prChangedFiles(undefined, repo), {
      source:
        'none (HEAD is not a merge and BUDGET_BASE_SHA is unset or invalid)',
      files: undefined,
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
