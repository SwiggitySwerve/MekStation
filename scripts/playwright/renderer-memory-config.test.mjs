import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { tsImport } from 'tsx/esm/api';

test('diagnostic config preserves every root test/server policy and existing reporter', async () => {
  process.env.MEKSTATION_E2E_MEMORY_ROOT = path.resolve(
    process.env.TEMP ?? '/tmp',
    'renderer-config-test',
  );
  const unwrap = (value) => value.default?.default ?? value.default;
  const base = unwrap(
    await tsImport('../../playwright.config.ts', import.meta.url),
  );
  const diagnostic = unwrap(
    await tsImport(
      '../../playwright.renderer-memory.config.js',
      import.meta.url,
    ),
  );
  for (const key of [
    'testDir',
    'globalSetup',
    'fullyParallel',
    'forbidOnly',
    'retries',
    'workers',
    'timeout',
    'expect',
    'projects',
    'webServer',
    'outputDir',
    'snapshotDir',
  ])
    assert.deepEqual(diagnostic[key], base[key], key);
  const { launchOptions, ...use } = diagnostic.use;
  const { launchOptions: originalOptions, ...originalUse } = base.use;
  assert.deepEqual(use, originalUse);
  const { executablePath, ...inheritedOptions } = launchOptions;
  assert.deepEqual(inheritedOptions, originalOptions ?? {});
  assert.equal(
    executablePath,
    path.join(process.env.MEKSTATION_E2E_MEMORY_ROOT, 'browser-wrapper.sh'),
  );
  assert.deepEqual(diagnostic.reporter.slice(0, -1), base.reporter);
  assert.deepEqual(diagnostic.reporter.at(-1), [
    './scripts/playwright/renderer-memory-reporter.mjs',
  ]);
});
