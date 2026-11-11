import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, posix, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const official = 'public/data/equipment/official';

function git(args, cwd = root) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
}

function checkedGit(args, cwd) {
  const result = git(args, cwd);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

const trackedFiles = checkedGit(['ls-files', '-z', '--', 'public/data'])
  .split('\0')
  .filter(Boolean);
const catalogDirectories = new Set();
for (const file of trackedFiles) {
  for (
    let dir = posix.dirname(file);
    dir.startsWith('public/data');
    dir = posix.dirname(dir)
  ) {
    catalogDirectories.add(dir);
  }
}
const representatives = [
  ...new Map(trackedFiles.map((file) => [posix.dirname(file), file])).values(),
];

function fixture(files = representatives, stageBeforePolicy = false, policy) {
  const cwd = mkdtempSync(join(tmpdir(), 'catalog-gitignore-'));
  checkedGit(['init', '--quiet'], cwd);
  for (const file of files) {
    mkdirSync(dirname(resolve(cwd, file)), { recursive: true });
    writeFileSync(resolve(cwd, file), 'before\n');
  }
  // Seed tracked paths before applying the real ignore policy; no force-add,
  // commit identity, hooks or shared checkout/index changes are needed.
  checkedGit(['add', '--', 'public/data'], cwd);
  const baseline = checkedGit(['write-tree'], cwd).trim();
  for (const file of files) writeFileSync(resolve(cwd, file), 'after\n');
  if (stageBeforePolicy) checkedGit(['add', '--', 'public/data'], cwd);
  writeFileSync(
    join(cwd, '.gitignore'),
    policy ?? readFileSync(join(root, '.gitignore')),
  );
  return { cwd, files, baseline };
}

function lintFixture(file, policy) {
  const isolated = fixture([file], true, policy);
  const formatter = join(isolated.cwd, 'formatter.cjs');
  writeFileSync(
    formatter,
    `for (const file of process.argv.slice(2)) require('node:fs').writeFileSync(file, '{"formatted":true}\\n');\n`,
  );
  const command = `"${process.execPath.replaceAll('\\', '/')}" "${formatter.replaceAll('\\', '/')}"`;
  writeFileSync(
    join(isolated.cwd, 'package.json'),
    JSON.stringify({ 'lint-staged': { '*': command } }),
  );
  return isolated;
}

const lintStagedCli = resolve(
  root,
  'node_modules/lint-staged/bin/lint-staged.js',
);
const previouslyBlockedRoots = [
  'public/data/custom-units',
  'public/data/equipment/custom',
  ...['battlearmor', 'battlemechs', 'infantry', 'protomechs'].map(
    (family) => `public/data/units/${family}`,
  ),
];
for (const dir of [...catalogDirectories].sort()) {
  if (
    !previouslyBlockedRoots.some(
      (base) => dir === base || dir.startsWith(`${base}/`),
    )
  )
    continue;
  test(`lint-staged restages a tracked file under ${dir}`, () => {
    const file = trackedFiles.find((candidate) =>
      candidate.startsWith(`${dir}/`),
    );
    const isolated = lintFixture(file);
    const result = runHook(isolated);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const indexed = checkedGit(['show', `:${file}`], isolated.cwd);
    assert.equal(indexed, readFileSync(resolve(isolated.cwd, file), 'utf8'));
    assert.match(indexed, /"formatted":true/);
  });
}

function runHook(isolated, childExit = 0) {
  const bin = join(isolated.cwd, 'bin');
  mkdirSync(bin);
  // Only the npx launcher is local: it runs the actual installed lint-staged
  // CLI, so this fixture never downloads or changes dependencies.
  writeFileSync(
    join(bin, 'npx'),
    childExit
      ? `#!/bin/sh\nexit ${childExit}\n`
      : `#!/bin/sh\nshift\nexec "${process.execPath.replaceAll('\\', '/')}" "${lintStagedCli.replaceAll('\\', '/')}" "$@"\n`,
    { mode: 0o755 },
  );
  // The hook runs its scripts (scripts/lib/hook-scripts.json) from the fixture's own tree.
  mkdirSync(resolve(isolated.cwd, 'scripts/lib'), { recursive: true });
  const hookScripts = JSON.parse(
    readFileSync(resolve(root, 'scripts/lib/hook-scripts.json'), 'utf8'),
  ).scripts;
  for (const guard of hookScripts.map((script) => `scripts/lib/${script}`))
    writeFileSync(
      resolve(isolated.cwd, guard),
      readFileSync(resolve(root, guard)),
    );
  return spawnSync('sh', ['-e', resolve(root, '.husky/pre-commit')], {
    cwd: isolated.cwd,
    env: { ...process.env, PATH: bin + delimiter + process.env.PATH },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

for (const childExit of [0, 7]) {
  test(`normal hook rejects ${childExit ? 'child failure' : 'masked ignored-parent failure'}`, () => {
    const isolated = lintFixture(
      'public/data/blocked/probe.json',
      'public/data/blocked/\n',
    );
    const result = runHook(isolated, childExit);
    assert.equal(result.status, childExit || 1, result.stdout + result.stderr);
  });
}

function assertIgnored(path, expected, cwd = root) {
  const result = git(['check-ignore', '--no-index', '-q', '--', path], cwd);
  assert.equal(result.status, expected ? 0 : 1, `${path}: ${result.stderr}`);
}

test('tracked electronics catalogs support ordinary Git restaging', () => {
  const paths = ['active-probe', 'c3', 'ecm', 'other'].map((name) =>
    resolve(root, official, 'electronics', `${name}.json`),
  );
  const result = spawnSync('git', ['add', '--dry-run', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('BattleMech staging must not fail after staging tracked changes', () => {
  const isolated = fixture(
    trackedFiles
      .filter((file) => file.startsWith('public/data/units/battlemechs/'))
      .slice(0, 2),
  );
  const result = git(
    ['add', '--', 'public/data/units/battlemechs'],
    isolated.cwd,
  );
  const staged = checkedGit(
    ['diff', '--cached', '--name-only', '-z', isolated.baseline],
    isolated.cwd,
  )
    .split('\0')
    .filter(Boolean);
  assert.deepEqual(staged.sort(), [...isolated.files].sort());
  assert.equal(
    result.status,
    0,
    `${staged.length} changes staged; ${result.stderr}`,
  );
});

test('every tracked public/data parent is traversable', () => {
  assert.ok(trackedFiles.length > 0);
  const isolated = fixture();
  for (const dir of [...catalogDirectories].sort()) {
    assertIgnored(dir, false, isolated.cwd);
  }
});

test('new unreviewed catalog contents and artifacts remain ignored', () => {
  const isolated = fixture();
  for (const dir of catalogDirectories) {
    // These three pre-existing generator scopes intentionally accept new output.
    if (/^public\/data\/units\/(aerospace|capital|vehicles)(\/|$)/.test(dir))
      continue;
    for (const name of [
      'g4-unreviewed.json',
      'g4-unreviewed-cache/output.json',
    ]) {
      assertIgnored(`${dir}/${name}`, true, isolated.cwd);
    }
  }
});

test('electronics is traversable while unreviewed contents remain ignored', () => {
  assertIgnored(`${official}/electronics`, false);
  for (const path of [
    'arbitrary-unreviewed.json',
    'nested/output.json',
    'java-registry.json',
    'c3.json',
  ]) {
    assertIgnored(`${official}/electronics/${path}`, true);
  }
});

test('existing generator exceptions and artifact exclusions remain narrow', () => {
  for (const category of ['ammunition', 'miscellaneous', 'weapons']) {
    assertIgnored(`${official}/${category}/java-registry.json`, false);
    assertIgnored(`${official}/${category}/arbitrary-unreviewed.json`, true);
  }
  for (const family of ['vehicles', 'aerospace', 'capital']) {
    assertIgnored(`public/data/units/${family}/new-converted.json`, false);
  }
  for (const path of [
    'public/data/equipment/registry-routing.json',
    'public/data/equipment/_schema/unit-schema.json',
    'docs/data/portable-source-provenance.md',
  ]) {
    assertIgnored(path, false);
  }
  for (const path of [
    `${official}/arbitrary-unreviewed.json`,
    `${official}/unreviewed/output.json`,
    'public/data/equipment/_schema/arbitrary-unreviewed.json',
    '.next/ignore-hygiene-probe.json',
    'node_modules/ignore-hygiene-probe.json',
    'coverage/output.json',
    'test-results/output.json',
    'public/data/units/battlemechs/__pycache__/output.pyc',
  ]) {
    assertIgnored(path, true);
  }
});
