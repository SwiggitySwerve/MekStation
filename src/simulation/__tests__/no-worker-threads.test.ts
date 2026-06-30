/**
 * No-worker-threads regression guard — Task 5.8.
 *
 * Per design D10: the swarm runner is sequential-only. This test asserts that
 * `worker_threads` (and related node:worker_threads) is NOT imported anywhere
 * in the simulation runner or batch runner source files. A future accidental
 * import would violate the D10 sequential-execution guarantee.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 * @design D10 — sequential execution, no worker_threads
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively collect all .ts source files under a directory, excluding
 * __tests__ subdirectories so test files themselves are not scanned.
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Patterns that indicate worker_threads usage. We match both the Node stdlib
 * form and any bare require/dynamic import.
 */
const WORKER_THREADS_PATTERNS = [
  /import.*from\s+['"]worker_threads['"]/,
  /import.*from\s+['"]node:worker_threads['"]/,
  /require\s*\(\s*['"]worker_threads['"]\s*\)/,
  /require\s*\(\s*['"]node:worker_threads['"]\s*\)/,
  /new\s+Worker\s*\(/,
];

describe('D10 sequential-execution guard: no worker_threads', () => {
  // Directories to scan — only the simulation runner and batch runner paths.
  const runnerDir = path.resolve(process.cwd(), 'src/simulation/runner');

  it('simulation runner source files do not import worker_threads', () => {
    const files = collectSourceFiles(runnerDir);
    // Must have found at least the runner files so the test is not vacuously true.
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of WORKER_THREADS_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${file}:${idx + 1}: ${line.trim()}`);
          }
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `D10 violation: worker_threads usage found in simulation runner:\n` +
          violations.join('\n'),
      );
    }
  });

  it('scripts/run-simulation modules do not import worker_threads', () => {
    const scriptsDir = path.resolve(process.cwd(), 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      return;
    }

    const files = fs
      .readdirSync(scriptsDir)
      .filter(
        (name) =>
          name === 'run-simulation.ts' || /^run-simulation-.+\.ts$/.test(name),
      )
      .map((name) => path.join(scriptsDir, name));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of WORKER_THREADS_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${file}:${idx + 1}: ${line.trim()}`);
          }
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `D10 violation: worker_threads usage found in run-simulation modules:\n` +
          violations.join('\n'),
      );
    }
  });
});
