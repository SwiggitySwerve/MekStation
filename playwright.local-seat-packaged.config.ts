import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const runDir = process.env.LSC2P_RUN_DIR;
if (!runDir || !path.isAbsolute(runDir)) {
  throw new Error('LSC2P_RUN_DIR must be an absolute, fresh run directory');
}
// The spec self-skips without this, so the nightly full suite never runs it.
process.env.LSC2P_PACKAGED = '1';

/** Attaches to one operator-installed authority; starts no server. */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'local-seat-credentials.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  outputDir: path.join(runDir, 'test-results'),
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(runDir, 'playwright-report.json') }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'local-seat-packaged', use: { ...devices['Desktop Chrome'] } },
  ],
});
