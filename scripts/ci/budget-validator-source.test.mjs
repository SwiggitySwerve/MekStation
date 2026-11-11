import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { loadBudgets } from './budget-config.mjs';
import { readWorkflow } from './budget-workflow.mjs';
import { staticImportClosure } from './test-helpers/import-closure.mjs';

const steps = readWorkflow(process.cwd()).jobs['lint-and-test'].steps;
const approval = steps.find(
  (step) =>
    step.name === 'Enforce budget-raise approval with read-only live inputs',
);
const checkout = steps.find((step) => step.id === 'budget-validator');

function assertNoInstallClosure(entry, root = process.cwd()) {
  return staticImportClosure(entry, {
    root,
    inspectSpecifier: (specifier, file) => {
      assert.equal(
        typeof specifier,
        'string',
        `${file}: no-install workflow cannot resolve a computed module specifier`,
      );
      if (!specifier.startsWith('.'))
        assert.ok(
          specifier.startsWith('node:') && isBuiltin(specifier),
          `${file}: no-install workflow cannot load ${specifier}`,
        );
    },
  });
}

test('reconciliation static closure needs no install: only relative modules and node built-ins', () => {
  const closure = assertNoInstallClosure('scripts/ci/budget-reconcile.mjs');
  for (const file of [
    'scripts/ci/budget-approval.mjs',
    'scripts/ci/budget-config.mjs',
    'scripts/lib/statistics.mjs',
    'scripts/ci/garden-approval.mjs',
  ])
    assert.ok(closure.has(file), file);
});

test('no-install closure rejects package imports, dynamic imports and require calls in transitive files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-no-install-'));
  try {
    fs.writeFileSync(path.join(root, 'entry.mjs'), "import './peer.mjs';");
    for (const source of [
      "import 'zod';",
      "await import('zod');",
      "require('zod');",
    ]) {
      fs.writeFileSync(path.join(root, 'peer.mjs'), source);
      assert.throws(
        () => assertNoInstallClosure('entry.mjs', root),
        /peer.mjs: no-install workflow cannot load zod/,
      );
    }
    for (const source of ['await import(name);', 'require(name);']) {
      fs.writeFileSync(path.join(root, 'peer.mjs'), source);
      assert.throws(
        () => assertNoInstallClosure('entry.mjs', root),
        /computed module specifier/,
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('budget validator comes from a literal main side checkout with no credentials', () => {
  assert.ok(checkout, 'missing main validator checkout');
  assert.equal(checkout.uses, 'actions/checkout@v6');
  assert.equal(checkout.if, approval.if);
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with.path, '.budget-validator');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(checkout.with['fetch-depth'], 1);
  assert.equal(checkout.with['sparse-checkout-cone-mode'], false);
  assert.ok(steps.indexOf(checkout) < steps.indexOf(approval));
  assert.doesNotMatch(JSON.stringify(checkout), /pull_request\.|head_ref/);
  assert.match(approval.with.script, /GITHUB_WORKSPACE\}\/\.budget-validator/);
  assert.ok(
    approval.with.script.includes(
      'await import(pathToFileURL(`${validatorRoot}/scripts/ci/budget-approval.mjs`).href)',
    ),
  );
  assert.match(
    approval.with.script,
    /\$\{\{ steps\.budget-validator\.outputs\.commit \}\}/,
  );
});

test('the sparse set covers every transitive static import and contains no budget config', () => {
  assert.ok(checkout, 'missing main validator checkout');
  const patterns = checkout.with['sparse-checkout'].trim().split(/\s+/);
  assert.deepEqual(patterns, ['scripts/ci', 'scripts/lib/statistics.mjs']);
  const closure = staticImportClosure('scripts/ci/budget-approval.mjs');
  assert.ok(closure.has('scripts/lib/statistics.mjs'));
  for (const file of closure)
    assert.ok(
      patterns.some(
        (pattern) => file === pattern || file.startsWith(`${pattern}/`),
      ),
      `Static import missing from sparse checkout: ${file}`,
    );
});

test('main validator rejects the live PR count raise despite unchanged side-checkout budgets', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-source-'));
  try {
    const validatorRoot = path.join(workspace, '.budget-validator');
    // Copy only the declared sparse set: missing transitive imports must fail.
    assert.ok(checkout, 'missing main validator checkout');
    for (const entry of checkout.with['sparse-checkout'].trim().split(/\s+/)) {
      const destination = path.join(validatorRoot, entry);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.cpSync(path.resolve(entry), destination, { recursive: true });
    }
    const base = structuredClone(loadBudgets());
    base.dependencies = {
      root: { lockEntries: 1, directDependencies: 1 },
      desktop: { lockEntries: 1, directDependencies: 1 },
    };
    const head = structuredClone(base);
    head.limits.unkeyableTests += 1;
    // A mistaken local read would see no raise. PR code must never execute.
    fs.mkdirSync(path.join(validatorRoot, 'config/ci'), { recursive: true });
    fs.writeFileSync(
      path.join(validatorRoot, 'config/ci/budgets.json'),
      JSON.stringify(base),
    );
    fs.mkdirSync(path.join(workspace, 'scripts/ci'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, 'scripts/ci/budget-approval.mjs'),
      "throw new Error('PR validator executed');\n",
    );
    const pull = {
      number: 42,
      user: { id: 2, login: 'contributor' },
      head: { sha: 'a'.repeat(40) },
      base: {
        sha: 'b'.repeat(40),
        ref: 'main',
        repo: { full_name: 'owner/repo' },
      },
      labels: [],
    };
    const reads = [];
    const logs = [];
    const github = {
      rest: {
        pulls: {
          get: async () => ({ data: structuredClone(pull) }),
          listReviews: () => {},
        },
        repos: {
          get: async () => ({
            data: { owner: { id: 1, login: 'owner', type: 'User' } },
          }),
          getContent: async ({ path: file, ref }) => {
            assert.ok([pull.head.sha, pull.base.sha].includes(ref));
            const manifest = { dependencies: { x: '1' } };
            let data;
            if (file === 'config/ci/budgets.json') {
              reads.push(ref);
              data = ref === pull.head.sha ? head : base;
            } else {
              assert.equal(ref, pull.head.sha);
              assert.match(file, /^(desktop\/)?package(-lock)?\.json$/);
              data = file.endsWith('package-lock.json')
                ? {
                    lockfileVersion: 3,
                    packages: { '': manifest, 'node_modules/x': {} },
                  }
                : manifest;
            }
            return {
              data: {
                encoding: 'base64',
                content: Buffer.from(JSON.stringify(data)).toString('base64'),
              },
            };
          },
          createCommitStatus: () => assert.fail('read-only step wrote status'),
        },
      },
      paginate: async () => [],
    };
    const sha = 'c'.repeat(40);
    const script = approval.with.script.replaceAll(
      '${{ steps.budget-validator.outputs.commit }}',
      sha,
    );
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    const execute = new AsyncFunction(
      'github',
      'context',
      'core',
      'process',
      'require',
      script,
    );
    await assert.rejects(
      execute(
        github,
        {
          repo: { owner: 'owner', repo: 'repo' },
          payload: { pull_request: pull },
        },
        { info: (line) => logs.push(line) },
        { env: { GITHUB_WORKSPACE: workspace } },
        createRequire(import.meta.url),
      ),
      /Budget increases require ci-budget-raise/,
    );
    assert.ok(reads.includes(pull.head.sha), 'PR budgets were not read');
    assert.ok(reads.includes(pull.base.sha), 'base budgets were not read');
    assert.ok(logs.includes(`budget-validator: main@${sha}`));
    assert.equal(JSON.parse(logs.at(-1)).code, 'missing-label');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
