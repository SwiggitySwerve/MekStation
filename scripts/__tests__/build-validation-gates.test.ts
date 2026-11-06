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
  if?: string | boolean;
  'continue-on-error'?: boolean;
  'working-directory'?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
}
interface Job {
  strategy?: unknown;
  name?: string;
  needs?: string | string[];
  if?: string;
  'continue-on-error'?: boolean;
  steps: Step[];
}
interface Workflow {
  jobs: Record<string, Job>;
}
const root = path.resolve(__dirname, '../..');
const workflow = (file: string): Workflow =>
  parse(fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'));
const dependencies = (job: Job): string[] =>
  typeof job.needs === 'string' ? [job.needs] : (job.needs ?? []);
const command = (job: Job, run: string, directory?: string): Step => {
  const step = job.steps.find(
    (entry) => entry.run === run && entry['working-directory'] === directory,
  );
  expect(step).toBeDefined();
  expect(step?.['continue-on-error']).toBeUndefined();
  if (!step) throw new Error(`Missing validation command: ${run}`);
  return step;
};

describe('artifact validation boundaries', () => {
  const pr = workflow('pr-checks.yml');
  const release = workflow('release.yml');
  // Static Checks runs lint, typecheck and the desktop typecheck on one
  // runner. `!cancelled()` runs each step even after an earlier check
  // failed; it can never disable a step.
  const EVEN_AFTER_FAILURE = '${{ !cancelled() }}';

  it('requires the static checks through the unconditional PR aggregator', () => {
    const aggregator = pr.jobs['lint-and-test'];
    expect(aggregator.name).toBe('Lint and Test');
    expect(aggregator.if).toBe('always()');
    expect(dependencies(aggregator)).toContain('static-checks');
    expect(pr.jobs['static-checks'].if).toBeUndefined();
    expect(pr.jobs['static-checks']['continue-on-error']).toBeUndefined();
    const assertion = command(
      aggregator,
      'node scripts/ci/budget-aggregate.mjs',
    );
    expect(assertion.env?.NEEDS_JSON).toBe('${{ toJSON(needs) }}');
    expect(assertion.env?.GATES_JSON).toBeDefined();
    expect(assertion.if).toBeUndefined();
    expect(assertion['continue-on-error']).toBeUndefined();
  });

  it('runs real PR validation commands and generates route types first', () => {
    const job = pr.jobs['static-checks'];
    command(job, 'npm run lint');
    command(job, 'npm run type-check', 'desktop');
    const generate = command(job, 'npx next typegen');
    const check = command(job, 'npm run typecheck');
    expect(job.steps.indexOf(generate)).toBeLessThan(job.steps.indexOf(check));
  });

  it('runs every PR lint and typecheck step even after another check fails', () => {
    const job = pr.jobs['static-checks'];
    for (const step of [
      command(job, 'npm run lint'),
      command(job, 'npx next typegen'),
      command(job, 'npm run typecheck'),
      command(job, 'npm run type-check', 'desktop'),
    ]) {
      expect({ name: step.name, if: step.if }).toEqual({
        name: step.name,
        if: EVEN_AFTER_FAILURE,
      });
    }
    // Setup failing must fail the job: checkout and setup are unconditional.
    for (const step of job.steps.slice(0, 2)) {
      expect(step.if).toBeUndefined();
      expect(step['continue-on-error']).toBeUndefined();
    }
  });

  it('runs every release validate-source step unconditionally and fails on errors', () => {
    for (const step of release.jobs['validate-source'].steps) {
      expect({ name: step.name, if: step.if }).toEqual({
        name: step.name,
        if: undefined,
      });
      expect(step['continue-on-error']).toBeUndefined();
    }
  });

  it('validates the selected release source before all artifact builds', () => {
    const job = release.jobs['validate-source'];
    expect(dependencies(job)).toContain('release-context');
    expect(job['continue-on-error']).toBeUndefined();
    expect(job.steps[0].with?.ref).toBe(
      '${{ needs.release-context.outputs.ref }}',
    );
    const generate = command(job, 'npx next typegen');
    for (const step of [
      command(job, 'npm run typecheck'),
      command(job, 'npm run lint'),
      command(job, 'npm run type-check', 'desktop'),
    ]) {
      expect(step.if).toBeUndefined();
      expect(job.steps.indexOf(generate)).toBeLessThan(job.steps.indexOf(step));
    }
    for (const id of ['prepare-build', 'docker-build']) {
      expect(dependencies(release.jobs[id])).toContain('validate-source');
      expect(release.jobs[id].steps[0].with?.ref).toBe(job.steps[0].with?.ref);
    }
    expect(dependencies(release.jobs.build)).toContain('prepare-build');
    expect(dependencies(release.jobs.release)).toContain('build');
    expect(dependencies(release.jobs['docker-push'])).toEqual(
      expect.arrayContaining(['build', 'docker-build']),
    );
  });
});

describe('Lint and Test aggregator', () => {
  const pr = workflow('pr-checks.yml');
  const aggregator = pr.jobs['lint-and-test'];
  const assertion = command(aggregator, 'node scripts/ci/budget-aggregate.mjs');
  const gates = JSON.parse(assertion.env?.GATES_JSON ?? 'null') as Record<
    string,
    string
  >;
  const passedNeeds = () =>
    Object.fromEntries(
      dependencies(aggregator).map((id) => [id, { result: 'success' }]),
    );

  const detect = (outputs: Record<string, string>) => ({
    'detect-changes': { result: 'success', outputs },
  });
  // Execute the owning boundary selected by the workflow, including its actual
  // gate map. A complete needs census prevents an omitted job looking green.
  const invoke = (needs: Record<string, unknown>) =>
    spawnSync(process.execPath, [assertion.run!.slice('node '.length)], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        NEEDS_JSON: JSON.stringify(needs),
        GATES_JSON: JSON.stringify(gates),
      },
    });
  const status = (overrides: Record<string, unknown>) =>
    invoke({ ...passedNeeds(), ...overrides }).status;

  it('needs every job, and every gated job declares its gates', () => {
    const needs = dependencies(aggregator);
    expect([...needs].sort()).toEqual(
      Object.keys(pr.jobs)
        .filter((id) => id !== 'lint-and-test')
        .sort(),
    );
    const outputs = Object.keys(
      (pr.jobs['detect-changes'] as Job & { outputs: Record<string, string> })
        .outputs,
    );
    for (const [id, job] of Object.entries(pr.jobs)) {
      if (id === 'lint-and-test') continue;
      expect(needs).toContain(id);
      if (job.if === undefined) {
        expect(gates[id]).toBeUndefined();
        continue;
      }
      // A job-level `if` may only test the gates the aggregator accepts a
      // skip for, and every such gate is a detect-changes output.
      expect(gates[id]).toBeDefined();
      const gate = gates[id];
      expect(outputs).toContain(gate);
      expect(job.if).toBe(`needs.detect-changes.outputs.${gate} == 'true'`);
    }
  });

  it('passes when every needed job succeeded', () => {
    expect(status(detect({ code: 'true', combat: 'true' }))).toBe(0);
  });

  it('fails when the shared E2E producer fails and its consumers skip', () => {
    expect(
      status({
        ...detect({ code: 'true', e2e: 'true' }),
        'simulation-checks': { result: 'failure' },
        e2e: { result: 'skipped' },
      }),
    ).toBe(1);
    expect(
      status({
        ...detect({ code: 'true', e2e: 'true' }),
        'simulation-checks': { result: 'success' },
        e2e: { result: 'failure' },
      }),
    ).toBe(1);
  });

  it('accepts a skip only when every gate the job names was off', () => {
    // The shared producer is step-gated, so even docs-only PRs must report
    // its successful no-op; an unexplained job skip is always a failure.
    expect(
      status({
        ...detect({ code: 'false', combat: 'false' }),
        'simulation-checks': { result: 'skipped' },
      }),
    ).toBe(1);
    expect(
      status({
        ...detect({ code: 'true', combat: 'false' }),
        'simulation-checks': { result: 'skipped' },
      }),
    ).toBe(1);
    // The unit shards carry the step-gated corpus and combat suites, so they
    // can never be skipped, whatever those gates say.
    expect(
      status({
        ...detect({ code: 'false', corpus: 'false', combat: 'false' }),
        'unit-test-shards': { result: 'skipped' },
      }),
    ).toBe(1);
    for (const code of [undefined, 'unknown', 'False'])
      expect(
        status({
          ...detect(code === undefined ? {} : { code }),
          'simulation-checks': { result: 'skipped' },
        }),
      ).toBe(1);
  });

  it('accepts skipped win/mac packs outside a PR, where Desktop Packs runs them', () => {
    // Main push: every gate is on, but pr-desktop is 'false', so build-test
    // skips and Lint and Test does not wait on a macOS runner.
    expect(
      status({
        ...detect({ code: 'true', desktop: 'true', 'pr-desktop': 'false' }),
        'build-test': { result: 'skipped' },
      }),
    ).toBe(0);
    // A PR whose changes reach packaging inputs cannot skip them.
    expect(
      status({
        ...detect({ code: 'true', desktop: 'true', 'pr-desktop': 'true' }),
        'build-test': { result: 'skipped' },
      }),
    ).toBe(1);
  });

  it('fails an ungated skip, a failure, a cancellation and a failed detection', () => {
    for (const [id, result] of [
      ['static-checks', 'skipped'],
      ['unit-test-shards', 'failure'],
      ['build-test', 'cancelled'],
      ['detect-changes', 'failure'],
    ]) {
      const out = invoke({
        ...passedNeeds(),
        ...detect({ code: 'false' }),
        [id]: { result },
      });
      expect(out.status).toBe(1);
      expect(out.stderr).toContain(`${id}=${result}`);
    }
  });

  it('fails a missing, unknown or empty result census instead of accepting omitted checks', () => {
    for (const needs of [
      {},
      { ...passedNeeds(), ghost: { result: 'success' } },
    ]) {
      expect(invoke(needs).status).toBe(1);
    }
    const missing = passedNeeds();
    delete missing['static-checks'];
    expect(invoke(missing).status).toBe(1);
    expect(status({ 'static-checks': {} })).toBe(1);
  });
});

// This file owns workflow and artifact validation, including native archive
// round trips. Keep these cases under its existing conservative repo-wide key.
{
  const jobs = workflow('pr-checks.yml').jobs;
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
              fs.readFileSync(
                path.join(after, '.next/standalone', name),
                'utf8',
              ),
            ).toBe(bytes);
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      },
    );
  });
}
