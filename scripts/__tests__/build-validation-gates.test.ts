/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

interface Step {
  id?: string;
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
  name?: string;
  needs?: string | string[];
  if?: string;
  'continue-on-error'?: boolean;
  env?: Record<string, string>;
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
    (entry) =>
      entry['working-directory'] === directory &&
      (entry.run === run ||
        entry.run
          ?.split('\n')
          .some((line) => line.trim() === `if ${run}; then`)),
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

describe('Electron download caches', () => {
  const pr = workflow('pr-checks.yml');

  it('rejects runner context in job-level environments', () => {
    for (const job of Object.values(pr.jobs))
      expect(JSON.stringify(job.env ?? {})).not.toMatch(/\brunner\s*\./);
  });

  it.each(['simulation-checks', 'build-test'])(
    '%s restores before installation and saves each download before later checks',
    (id) => {
      const job = pr.jobs[id];
      const setupIndex = job.steps.findIndex(
        (step) => step.uses === './.github/actions/setup-node-and-install',
      );
      expect(setupIndex).toBeGreaterThan(0);
      expect(job.env).toMatchObject({
        electron_config_cache: '${{ github.workspace }}/.cache/electron',
        ELECTRON_BUILDER_CACHE:
          '${{ github.workspace }}/.cache/electron-builder',
      });

      for (const [cacheId, cacheEnv, download] of [
        [
          'electron-cache',
          'electron_config_cache',
          'npm run rebuild:next-standalone',
        ],
        [
          'electron-builder-cache',
          'ELECTRON_BUILDER_CACHE',
          id === 'simulation-checks'
            ? 'npx electron-builder --linux tar.gz --publish never'
            : 'npx electron-builder --dir --publish never',
        ],
      ]) {
        const restoreIndex = job.steps.findIndex((step) => step.id === cacheId);
        expect(restoreIndex).toBeGreaterThan(0);
        expect(restoreIndex).toBeLessThan(setupIndex);
        const restore = job.steps[restoreIndex];
        const cachePath = '${{ env.' + cacheEnv + ' }}';
        expect(restore.uses).toBe('actions/cache/restore@v5');
        expect(restore.with).toEqual({
          path: cachePath,
          // The lock pins both Electron and electron-builder exactly.
          key:
            '${{ runner.os }}-' +
            cacheId +
            "-v1-${{ hashFiles('desktop/package-lock.json') }}",
        });

        const downloadStep = command(job, download, 'desktop');
        expect(downloadStep.env?.[cacheEnv]).toBeUndefined();
        const save = job.steps[job.steps.indexOf(downloadStep) + 1];
        expect(save.uses).toBe('actions/cache/save@v5');
        expect(save.if).toBe(
          '${{ !cancelled() && steps.' +
            cacheId +
            ".outputs.cache-hit != 'true' }}",
        );
        expect(save.with).toEqual({
          path: cachePath,
          key: '${{ steps.' + cacheId + '.outputs.cache-primary-key }}',
        });
      }
    },
  );
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

  it('accepts a skip only when every gate the job names was off', () => {
    // docs-only PR: the code gate is off, so the simulation/Linux-pack job
    // may skip.
    expect(
      status({
        ...detect({ code: 'false', combat: 'false' }),
        'simulation-checks': { result: 'skipped' },
      }),
    ).toBe(0);
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
