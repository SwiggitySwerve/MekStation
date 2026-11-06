// NEVER-MERGE scratch diagnostic. Reuse every production test/server policy.
// CommonJS keeps the root TS import inside Playwright's registered transform.
const { defineConfig } = require('@playwright/test');
const path = require('node:path');
const { default: base } = require('./playwright.config.ts');

const root = process.env.MEKSTATION_E2E_MEMORY_ROOT;
if (!root || !path.isAbsolute(root))
  throw new Error('Renderer memory output must be absolute');
const reporters =
  typeof base.reporter === 'string'
    ? [[base.reporter]]
    : [...(base.reporter ?? [])];

module.exports = defineConfig({
  ...base,
  reporter: [
    ...reporters,
    ['./scripts/playwright/renderer-memory-reporter.mjs'],
  ],
  use: {
    ...base.use,
    launchOptions: {
      ...base.use?.launchOptions,
      executablePath: path.join(root, 'browser-wrapper.sh'),
    },
  },
});
