// NEVER MERGE: inherit all production policies. Browser argv remains unchanged.
const { defineConfig } = require('@playwright/test');
const path = require('node:path');
const { default: base } = require('./playwright.config.ts');
const root = process.env.MEKSTATION_G6_042_ROOT;
if (!root || !path.isAbsolute(root))
  throw new Error('Absolute G6-042 output required');
module.exports = defineConfig({
  ...base,
  reporter: [...base.reporter, ['./scripts/playwright/g6-042-reporter.mjs']],
  use: {
    ...base.use,
    launchOptions: {
      ...base.use?.launchOptions,
      executablePath: path.join(root, 'browser-wrapper.sh'),
    },
  },
});
