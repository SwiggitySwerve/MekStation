import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readWorkflow } from './budget-workflow.mjs';
import { CLOSURE_GATES, decide, importClosure } from './ci-changes.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('Storybook follows every supported story extension and MDX transitively', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-inputs-'));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  try {
    for (const extension of ['js', 'jsx', 'mjs', 'ts', 'tsx', 'mdx']) {
      const story =
        extension === 'mdx' ? 'Guide.mdx' : `Demo.stories.${extension}`;
      write(`src/${story}`, `import { value } from './${extension}/middle';\n`);
      write(`src/${extension}/middle.ts`, "export { value } from './leaf';\n");
      write(`src/${extension}/leaf.ts`, 'export const value = 1;\n');
    }
    write('.storybook/main.ts', 'export default {};\n');
    write(
      '.storybook/mocks/fixture.ts',
      "export { value } from '../../src/mock-input';\n",
    );
    write('src/mock-input.ts', 'export const value = 2;\n');
    execFileSync('git', ['init', '--quiet', dir], { stdio: 'ignore' });
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });

    const closure = importClosure(dir, CLOSURE_GATES.storybook.entries(dir));
    for (const extension of ['js', 'jsx', 'mjs', 'ts', 'tsx', 'mdx']) {
      assert.ok(closure.has(`src/${extension}/leaf.ts`), extension);
    }
    assert.ok(
      closure.has('src/mock-input.ts'),
      'configured mocks are entry inputs',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Storybook covers all copied public assets and unknown build inputs', () => {
  for (const file of [
    'public/data/units/battlemechs/new-unit.json',
    'public/data/equipment/weapon.json',
    'public/new-image.svg',
    'src/assets/new-image.svg',
    'config/new-build-input.json',
    'new-build-tool.config.mjs',
    'unmapped-build-tool/input.json',
  ]) {
    assert.equal(decide(root, [file]).gates.storybook, true, file);
  }
});

test('Storybook follows JSX directory entry points transitively', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-jsx-'));
  try {
    fs.mkdirSync(path.join(dir, 'component'));
    fs.writeFileSync(
      path.join(dir, 'entry.stories.jsx'),
      "import './component';\n",
    );
    fs.writeFileSync(
      path.join(dir, 'component/index.jsx'),
      "export { value } from './leaf';\n",
    );
    fs.writeFileSync(
      path.join(dir, 'component/leaf.js'),
      'export const value = 1;\n',
    );
    assert.ok(
      importClosure(dir, ['entry.stories.jsx']).has('component/leaf.js'),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('every current transitive Storybook input enables its gate', () => {
  const closure = importClosure(root, CLOSURE_GATES.storybook.entries(root));
  assert.ok(closure.size > 0);
  for (const file of closure) {
    assert.equal(decide(root, [file]).gates.storybook, true, file);
  }
});

test('Storybook retains unrelated PR skips and never skips runtime BV inputs', () => {
  for (const file of [
    'docs/readme.md',
    'e2e/customizer.spec.ts',
    'desktop/src/main.ts',
  ]) {
    assert.equal(decide(root, [file]).gates.storybook, false, file);
  }
  for (const file of [
    'src/utils/construction/battleValueEquipment.ts',
    'src/utils/construction/equipmentBV/normalization.ts',
    'src/styles/globals.css',
    '.storybook/mocks/useDeviceCapabilities.tsx',
  ]) {
    assert.equal(decide(root, [file]).gates.storybook, true, file);
  }
});

test('production Storybook failure fails Static Checks and the required aggregator', () => {
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/pr-checks.yml'),
    'utf8',
  );
  const staticJob = workflow
    .split('\n  static-checks:')[1]
    .split('\n  simulation-checks:')[0];
  const buildStep = staticJob
    .split('- name: Build Storybook')[1]
    .split('\n      - name:')[0];
  assert.match(buildStep, /outputs\.storybook == 'true'/);
  assert.doesNotMatch(buildStep, /continue-on-error/);
  assert.match(
    buildStep,
    /run: node scripts\/ci\/background-step\.mjs wait storybook/,
  );

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-failure-'));
  try {
    fs.writeFileSync(path.join(dir, 'storybook.started'), 'fixture\n');
    fs.writeFileSync(path.join(dir, 'storybook.rc'), '23\n');
    fs.writeFileSync(
      path.join(dir, 'storybook.log'),
      'required Storybook failure\n',
    );
    const storybook = spawnSync(
      process.execPath,
      ['scripts/ci/background-step.mjs', 'wait', 'storybook'],
      {
        cwd: root,
        env: { ...process.env, BACKGROUND_STEP_DIR: dir },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    assert.equal(storybook.status, 23, storybook.stderr);

    const aggregator = readWorkflow(root).jobs['lint-and-test'];
    assert.equal(aggregator.if, 'always()');
    assert.ok(aggregator.needs.includes('static-checks'));
    const step = aggregator.steps.find((entry) =>
      entry.run?.includes('scripts/ci/budget-aggregate.mjs'),
    );
    assert.ok(step, 'execute the current production aggregator entry point');
    const [command, ...args] = step.run.trim().split(/\s+/);
    assert.equal(command, 'node');
    for (const [result, expectedStatus] of [
      ['success', 0],
      ['failure', 1],
      ['skipped', 1],
      ['cancelled', 1],
    ]) {
      const needs = {
        'detect-changes': {
          result: 'success',
          outputs: {
            storybook: 'true',
            code: 'false',
            'pr-desktop': 'false',
          },
        },
        'static-checks': { result },
        'unit-test-shards': { result: 'success' },
        e2e: { result: 'success' },
        'simulation-checks': { result: 'skipped' },
        'build-test': { result: 'skipped' },
      };
      const check = spawnSync(process.execPath, args, {
        cwd: root,
        env: {
          ...process.env,
          ...step.env,
          NEEDS_JSON: JSON.stringify(needs),
        },
        encoding: 'utf8',
        timeout: 10000,
      });
      assert.equal(
        check.status,
        expectedStatus,
        `${result}: ${check.stdout}\n${check.stderr}`,
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
