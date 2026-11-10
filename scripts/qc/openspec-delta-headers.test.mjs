import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const validator = path.join(
  repoRoot,
  'scripts/qc/validate-openspec-ci-quality.mjs',
);

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fu51-delta-headers-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const changes = path.join(root, 'changes');
  fs.mkdirSync(changes);
  write(path.join(root, 'ledger.json'), '{"allowedActiveChanges":[]}\n');
  for (const [relative, text] of Object.entries(files)) {
    write(path.join(changes, relative), text);
    const name = relative.split('/')[0];
    if (name !== 'archive') {
      write(
        path.join(changes, name, '.ledger.json'),
        JSON.stringify({
          name,
          status: 'proposed',
          reason: 'Duplicate-header regression fixture.',
          lastReviewed: '2026-11-09',
        }),
      );
    }
  }
  return {
    MEKSTATION_OPENSPEC_CHANGES_DIR: changes,
    MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: path.join(root, 'ledger.json'),
  };
}

function run(env = {}) {
  const result = spawnSync(process.execPath, [validator, '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  return { ...result, manifest: JSON.parse(result.stdout) };
}

for (const operation of ['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED']) {
  test(`rejects a seeded duplicate ${operation} header with file and line diagnostics`, (t) => {
    const relative = 'seeded/specs/capability/nested/spec.md';
    const env = fixture(t, {
      [relative]: `## ${operation} Requirements\r\n\r\n### Requirement: First\r\n\r\n## ${operation} Requirements\r\n\r\n### Requirement: Second\r\n`,
    });
    const { status, manifest } = run(env);
    assert.equal(status, 1, 'seeded duplicate must fail the CI validator');
    assert.equal(manifest.errors.length, 1);
    const error = manifest.errors[0];
    assert.equal(error.code, 'duplicate-openspec-operation-header');
    assert.equal(error.operation, operation);
    assert.deepEqual(error.lines, [1, 5]);
    assert.ok(error.source.replaceAll('\\', '/').endsWith(relative));
    assert.match(error.message, /1, 5/);
  });
}

test('accepts one of each operation per file, ignoring archives and non-delta files', (t) => {
  const duplicate = '## ADDED Requirements\n\n## ADDED Requirements\n';
  const clean = [
    '## ADDED Requirements',
    '## MODIFIED Requirements',
    '## REMOVED Requirements',
    '## RENAMED Requirements',
  ].join('\n\n');
  const env = fixture(t, {
    'first/specs/capability/spec.md': clean,
    'first/specs/other/spec.md': clean,
    'second/specs/capability/spec.md': clean,
    'first/proposal.md': duplicate,
    'first/specs/capability/notes.md': duplicate,
    'archive/2026-01-01-old/specs/capability/spec.md': duplicate,
  });
  const { status, manifest } = run(env);
  assert.equal(status, 0, JSON.stringify(manifest.errors));
  assert.deepEqual(manifest.errors, []);
});

test('accepts an active change without deltas', (t) => {
  const { status, manifest } = run(
    fixture(t, { 'empty/tasks.md': '# Tasks\n' }),
  );
  assert.equal(status, 0, JSON.stringify(manifest.errors));
});

test('accepts the current repository deltas through the CI validator', () => {
  const { status, manifest } = run();
  assert.equal(status, 0, JSON.stringify(manifest.errors, null, 2));
  assert.deepEqual(manifest.errors, []);
});

test('CI runs the validator and Node tests without a docs-only change gate', () => {
  const workflow = parse(
    fs.readFileSync(
      path.join(repoRoot, '.github/workflows/pr-checks.yml'),
      'utf8',
    ),
  );
  assert.equal(workflow.on.pull_request.paths, undefined);
  assert.equal(workflow.on.pull_request['paths-ignore'], undefined);
  const job = workflow.jobs['static-checks'];
  assert.equal(job.needs, 'detect-changes');
  assert.equal(job.if, undefined);
  assert.equal(job['continue-on-error'], undefined);
  const step = job.steps.find(
    (entry) =>
      entry.name === 'Validate OpenSpec delta headers and regression tests',
  );
  assert.ok(step, 'static checks must contain the OpenSpec step');
  assert.equal(step.if, '${{ !cancelled() }}');
  assert.equal(step['continue-on-error'], undefined);
  assert.equal(
    step.run.trim(),
    'node --test scripts/qc/openspec-delta-headers.test.mjs\nnpm run qc:openspec-ci:validate',
  );
});

test('rejects a different scoped CLI version in the pinned package script', (t) => {
  const env = fixture(t, {});
  const packageFile = path.join(
    path.dirname(env.MEKSTATION_OPENSPEC_CHANGES_DIR),
    'package.json',
  );
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  packageJson.scripts['openspec:validate'] =
    'npx --yes @fission-ai/openspec@1.5.1 validate --all --strict';
  write(packageFile, JSON.stringify(packageJson));
  const { status, manifest } = run({
    ...env,
    MEKSTATION_PACKAGE_JSON_PATH: packageFile,
  });
  assert.equal(status, 1);
  assert.ok(
    manifest.errors.some((error) => error.scriptId === 'openspec:validate'),
  );
});
