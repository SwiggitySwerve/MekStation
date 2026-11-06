/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';

interface Step {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
  if?: string;
}
interface Job {
  needs?: string | string[];
  strategy?: unknown;
  if?: string;
  steps: Step[];
}
const root = path.resolve(__dirname, '../..');
const jobs = (
  parse(
    fs.readFileSync(path.join(root, '.github/workflows/pr-checks.yml'), 'utf8'),
  ) as { jobs: Record<string, Job> }
).jobs;
const producer = jobs['simulation-checks'];
const consumer = jobs.e2e;
const step = (job: Job, name: string): Step => {
  const found = job?.steps.find((entry) => entry.name === name);
  if (!found) throw new Error(`Missing ${name}`);
  return found;
};

describe('shared E2E production artifact', () => {
  it('builds the harness exactly once and keeps packaging on its own build', () => {
    expect(producer).toBeDefined();
    expect(producer.strategy).toBeUndefined();
    expect(step(producer, 'Build production app').env).toEqual({
      NEXT_PUBLIC_E2E_MODE: 'true',
      NEXT_PUBLIC_E2E_TEST: 'true',
    });
    const builds = Object.entries(jobs).flatMap(([id, job]) =>
      job.steps
        .filter(
          (entry) =>
            entry.run === 'npm run build' &&
            entry.env?.NEXT_PUBLIC_E2E_MODE === 'true',
        )
        .map(() => id),
    );
    expect(builds).toEqual(['simulation-checks']);
    expect(jobs['e2e-build']).toBeUndefined();
    expect(
      jobs['simulation-checks'].steps.find(
        (entry) => entry.run === 'npm run build' && entry.env === undefined,
      ),
    ).toBeDefined();
    expect(
      step(jobs['build-test'], 'Download build artifacts').with?.name,
    ).toBe('web-build');
    expect(step(producer, 'Upload E2E production build').with?.name).toBe(
      'e2e-build',
    );
    expect(step(consumer, 'Download E2E production build').with?.name).toBe(
      'e2e-build',
    );
    expect(consumer.needs).toEqual(['detect-changes', 'simulation-checks']);
    expect(jobs['lint-and-test'].needs).toContain('simulation-checks');
    expect(producer.if).toBeUndefined();
    expect(
      producer.steps.indexOf(step(producer, 'Upload E2E production build')),
    ).toBeLessThan(
      producer.steps.indexOf(
        step(producer, 'Run CI-sized perf-sensitive simulation tests'),
      ),
    );
    expect(
      step(producer, 'Run CI-sized perf-sensitive simulation tests').if,
    ).toBe("needs.detect-changes.outputs.code == 'true'");
    expect(step(producer, 'Build Next.js application').env).toBeUndefined();
    expect(step(producer, 'Build Next.js application').if).toBe(
      "${{ !cancelled() && needs.detect-changes.outputs.code == 'true' }}",
    );
  });

  it.each(['intact', 'corrupt', 'mismatched', 'missing'] as const)(
    'transports every runtime byte and hidden file; %s archive',
    (mode) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-artifact-'));
      try {
        const before = path.join(dir, 'producer');
        const after = path.join(dir, 'consumer');
        const fixture: Record<string, string> = {
          'server.js': 'server bytes\n',
          '.next/BUILD_ID': 'same-build-id',
          '.next/static/chunks/harness.js': 'harness bytes\n',
          'public/record-sheets/template.svg': '<svg/>',
          'public/data/units.json': '[{"id":"unit"}]',
          'node_modules/runtime/index.js': 'runtime bytes\n',
        };
        fs.mkdirSync(after, { recursive: true });
        for (const [name, bytes] of Object.entries(fixture)) {
          const target = path.join(before, '.next/standalone', name);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, bytes);
        }
        const bash =
          process.platform === 'win32'
            ? 'C:/Program Files/Git/bin/bash.exe'
            : 'bash';
        const run = (command: string, cwd: string) =>
          spawnSync(bash, ['-e', '-o', 'pipefail', '-c', command], {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 30_000,
          });
        const packed = run(
          step(producer, 'Archive E2E production build').run ?? '',
          before,
        );
        expect({ code: packed.status, stderr: packed.stderr }).toEqual({
          code: 0,
          stderr: '',
        });
        for (const file of ['e2e-build.tar', 'e2e-build.sha256'])
          fs.copyFileSync(path.join(before, file), path.join(after, file));
        if (mode === 'missing')
          fs.unlinkSync(path.join(after, 'e2e-build.tar'));
        if (mode === 'corrupt')
          fs.appendFileSync(path.join(after, 'e2e-build.tar'), 'corruption');
        if (mode === 'mismatched')
          fs.writeFileSync(
            path.join(after, 'e2e-build.sha256'),
            `${'0'.repeat(64)}  e2e-build.tar\n`,
          );
        const unpacked = run(
          step(consumer, 'Verify and extract E2E production build').run ?? '',
          after,
        );
        if (mode !== 'intact') {
          expect(unpacked.status).not.toBe(0);
          expect(
            fs.existsSync(path.join(after, '.next/standalone/server.js')),
          ).toBe(false);
          return;
        }
        expect({ code: unpacked.status, stderr: unpacked.stderr }).toEqual({
          code: 0,
          stderr: '',
        });
        for (const [name, bytes] of Object.entries(fixture))
          expect(
            fs.readFileSync(path.join(after, '.next/standalone', name), 'utf8'),
          ).toBe(bytes);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
