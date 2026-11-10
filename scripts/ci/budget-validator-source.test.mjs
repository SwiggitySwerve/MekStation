import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

import { loadBudgets } from './budget-config.mjs';
import { readWorkflow } from './budget-workflow.mjs';

const steps = readWorkflow(process.cwd()).jobs['lint-and-test'].steps;
const approval = steps.find(
  (step) =>
    step.name === 'Enforce budget-raise approval with read-only live inputs',
);
const checkout = steps.find((step) => step.id === 'budget-validator');

function staticImportClosure(entry) {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    assert.deepEqual(source.parseDiagnostics, [], `Cannot parse ${file}`);
    function inspect(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) &&
                  node.expression.text === 'require'))
            ? node.arguments[0]
            : undefined;
      if (specifier && ts.isStringLiteralLike(specifier)) {
        if (specifier.text.startsWith('.'))
          visit(path.posix.join(path.posix.dirname(file), specifier.text));
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  visit(entry);
  return visited;
}

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
      base: { sha: 'b'.repeat(40) },
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
