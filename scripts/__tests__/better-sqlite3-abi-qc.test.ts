import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const preflightPath = path.join(
  repoRoot,
  'scripts/qc/check-better-sqlite3-abi.mjs',
);

function runPreflight(...args: string[]) {
  return spawnSync(process.execPath, [preflightPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

describe('better-sqlite3 ABI preflight', () => {
  it('records the native runtime and SQLite manifest', () => {
    const result = runPreflight();

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout);
    expect(manifest).toMatchObject({
      node: process.version,
      modules: process.versions.modules,
      napi: process.versions.napi,
      platform: process.platform,
      arch: process.arch,
    });
    expect(manifest.betterSqlite3).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.sqlite).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('fails with a typed blocker before loading the native module', () => {
    const result = runPreflight('--expect-modules=0');

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim()).toBe(
      `[qc:better-sqlite3-abi] ABI_MISMATCH expected=0 actual=${process.versions.modules}`,
    );
  });
});
