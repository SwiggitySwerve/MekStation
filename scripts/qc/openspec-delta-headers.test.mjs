import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

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
  const strict = job.steps.find(
    (entry) => entry.name === 'Validate OpenSpec specs (strict)',
  );
  assert.ok(
    strict,
    'static checks must contain the separate strict OpenSpec step',
  );
  assert.equal(strict.run, 'npm run openspec:validate');
  assert.equal(strict.if, '${{ !cancelled() }}');
  assert.equal(strict['continue-on-error'], undefined);
  assert.ok(job.steps.indexOf(strict) < job.steps.indexOf(step));
  assert.ok(workflow.jobs['lint-and-test'].needs.includes('static-checks'));
});

for (const [label, mutate] of [
  [
    'deleted strict step',
    (_workflow, job, strict) => {
      job.steps.splice(job.steps.indexOf(strict), 1);
    },
  ],
  [
    'strict step without !cancelled()',
    (_workflow, _job, strict) => {
      delete strict.if;
    },
  ],
  [
    'deleted strict command',
    (_workflow, _job, strict) => {
      delete strict.run;
    },
  ],
  [
    'strict command only in another job',
    (workflow, _job, strict) => {
      delete strict.run;
      workflow.jobs['detect-changes'].steps.push({
        run: 'npm run openspec:validate',
      });
    },
  ],
  [
    'renamed strict step',
    (_workflow, _job, strict) => {
      strict.name = 'Other';
    },
  ],
  [
    'code-gated strict step',
    (_workflow, _job, strict) => {
      strict.if =
        "${{ !cancelled() && needs.detect-changes.outputs.code == 'true' }}";
    },
  ],
  [
    'strict step continuing on error',
    (_workflow, _job, strict) => {
      strict['continue-on-error'] = true;
    },
  ],
  [
    'strict step using an unsafe shell',
    (_workflow, _job, strict) => {
      strict.shell = 'python';
    },
  ],
  [
    'code-gated static job',
    (_workflow, job) => {
      job.if = "needs.detect-changes.outputs.code == 'true'";
    },
  ],
  [
    'static job continuing on error',
    (_workflow, job) => {
      job['continue-on-error'] = true;
    },
  ],
  [
    'strict step after regression tests',
    (_workflow, job, strict) => {
      job.steps.splice(job.steps.indexOf(strict), 1);
      job.steps.push(strict);
    },
  ],
  [
    'static job dropped from aggregator',
    (workflow) => {
      workflow.jobs['lint-and-test'].needs = workflow.jobs[
        'lint-and-test'
      ].needs.filter((id) => id !== 'static-checks');
    },
  ],
]) {
  test(`CI validator rejects ${label}`, (t) => {
    const env = fixture(t, {});
    const workflow = parse(
      fs.readFileSync(
        path.join(repoRoot, '.github/workflows/pr-checks.yml'),
        'utf8',
      ),
    );
    const job = workflow.jobs['static-checks'];
    const strict = job.steps.find(
      (step) => step.name === 'Validate OpenSpec specs (strict)',
    );
    assert.ok(strict, 'mutation requires the strict step');
    mutate(workflow, job, strict);
    const file = path.join(
      path.dirname(env.MEKSTATION_OPENSPEC_CHANGES_DIR),
      'workflow.yml',
    );
    write(file, stringify(workflow));
    const { status, manifest } = run({
      ...env,
      MEKSTATION_PR_WORKFLOW_PATH: file,
    });
    assert.equal(
      status,
      1,
      'weakened strict validation must fail the CI contract',
    );
    assert.ok(
      manifest.errors.some((error) => error.jobId === 'static-checks'),
      JSON.stringify(manifest.errors),
    );
  });
}

test(
  'pinned strict CLI rejects a requirement without SHALL/MUST and accepts either modal',
  { timeout: 400_000 },
  (t) => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'openspec-strict-modal-'),
    );
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const change = path.join(root, 'openspec/changes/seeded-modal');
    write(
      path.join(change, 'proposal.md'),
      '# Change: Seeded modal\n\n## Why\nProve strict validation.\n\n## What Changes\n- Add a requirement.\n\n## Impact\n- Specs: seeded\n',
    );
    write(
      path.join(change, 'tasks.md'),
      '## Implementation\n- [ ] Validate the fixture.\n',
    );
    for (const modal of ['', 'SHALL ', 'MUST ']) {
      write(
        path.join(change, 'specs/seeded/spec.md'),
        `## ADDED Requirements\n\n### Requirement: Seeded behavior\nThe system ${modal}rejects invalid input.\n\n#### Scenario: Invalid input\n- **WHEN** input is invalid\n- **THEN** an error is returned\n`,
      );
      const result = spawnSync(
        'npx --yes @fission-ai/openspec@1.5.0 validate seeded-modal --strict --json',
        {
          cwd: root,
          encoding: 'utf8',
          shell: true,
          timeout: 120_000,
        },
      );
      assert.ifError(result.error);
      const output = result.stdout + result.stderr;
      assert.equal(result.status, modal ? 0 : 1, output);
      if (!modal) assert.match(output, /SHALL or MUST/);
    }
  },
);

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
