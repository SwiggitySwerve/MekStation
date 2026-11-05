/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
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
    const assertion = aggregator.steps[0];
    expect(assertion.run).toContain('.value.result != "success"');
    expect(assertion.run).toContain('exit 1');
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
  const assertion = aggregator.steps[0];
  const gates = JSON.parse(assertion.env?.GATES ?? 'null') as Record<
    string,
    string[]
  >;
  // The jq program the step runs, exactly as written in the workflow.
  const filter = /--argjson gates "\$GATES" '([^']*)'/.exec(
    assertion.run ?? '',
  )?.[1];
  const hasJq = spawnSync('jq', ['--version']).status === 0;
  // CI runners always have jq; a local checkout without it skips.
  const itJq = hasJq || process.env.CI ? it : it.skip;

  const detect = (outputs: Record<string, string>) => ({
    'detect-changes': { result: 'success', outputs },
  });
  const blocking = (needs: Record<string, unknown>): string[] => {
    const out = spawnSync(
      'jq',
      ['-r', '--argjson', 'gates', JSON.stringify(gates), filter ?? ''],
      { input: JSON.stringify(needs), encoding: 'utf8' },
    );
    expect(out.status).toBe(0);
    return out.stdout.split(/\r?\n/).filter(Boolean);
  };

  it('needs every job, and every gated job declares its gates', () => {
    expect(filter).toBeDefined();
    const needs = dependencies(aggregator);
    const outputs = Object.keys(
      (pr.jobs['detect-changes'] as Job & { outputs: Record<string, string> })
        .outputs,
    );
    for (const [id, job] of Object.entries(pr.jobs)) {
      if (id === 'lint-and-test') continue;
      expect(needs).toContain(id);
      if (job.if === undefined) {
        // An ungated job may skip only by depending on a gated job.
        if (gates[id] !== undefined) {
          expect(
            dependencies(job).some(
              (dep) => JSON.stringify(gates[dep]) === JSON.stringify(gates[id]),
            ),
          ).toBe(true);
        }
        continue;
      }
      // A job-level `if` may only test the gates the aggregator accepts a
      // skip for, and every such gate is a detect-changes output.
      expect(gates[id]).toBeDefined();
      for (const gate of gates[id]) {
        expect(outputs).toContain(gate);
        expect(job.if).toContain(`needs.detect-changes.outputs.${gate}`);
      }
    }
  });

  itJq('passes when every needed job succeeded', () => {
    expect(
      blocking({
        ...detect({ code: 'true', combat: 'true' }),
        'static-checks': { result: 'success' },
        'simulation-checks': { result: 'success' },
      }),
    ).toEqual([]);
  });

  itJq('accepts a skip only when every gate the job names was off', () => {
    // docs-only PR: the code gate is off, so the simulation/Linux-pack job
    // may skip.
    expect(
      blocking({
        ...detect({ code: 'false', combat: 'false' }),
        'simulation-checks': { result: 'skipped' },
      }),
    ).toEqual([]);
    expect(
      blocking({
        ...detect({ code: 'true', combat: 'false' }),
        'simulation-checks': { result: 'skipped' },
      }),
    ).toEqual(['simulation-checks=skipped']);
    // The unit shards carry the step-gated corpus and combat suites, so they
    // can never be skipped, whatever those gates say.
    expect(
      blocking({
        ...detect({ code: 'false', corpus: 'false', combat: 'false' }),
        'unit-test-shards': { result: 'skipped' },
      }),
    ).toEqual(['unit-test-shards=skipped']);
  });

  itJq(
    'accepts skipped win/mac packs outside a PR, where Desktop Packs runs them',
    () => {
      // Main push: every gate is on, but pr-desktop is 'false', so build-test
      // skips and Lint and Test does not wait on a macOS runner.
      expect(
        blocking({
          ...detect({ code: 'true', desktop: 'true', 'pr-desktop': 'false' }),
          'build-test': { result: 'skipped' },
        }),
      ).toEqual([]);
      // A PR whose changes reach packaging inputs cannot skip them.
      expect(
        blocking({
          ...detect({ code: 'true', desktop: 'true', 'pr-desktop': 'true' }),
          'build-test': { result: 'skipped' },
        }),
      ).toEqual(['build-test=skipped']);
    },
  );

  itJq(
    'fails an ungated skip, a failure, a cancellation and a failed detection',
    () => {
      expect(
        blocking({
          ...detect({ code: 'false' }),
          'static-checks': { result: 'skipped' },
          'unit-test-shards': { result: 'failure' },
          'build-test': { result: 'cancelled' },
        }),
      ).toEqual([
        'static-checks=skipped',
        'unit-test-shards=failure',
        'build-test=cancelled',
      ]);
      expect(
        blocking({
          'detect-changes': { result: 'failure', outputs: {} },
          'simulation-checks': { result: 'skipped' },
        }),
      ).toEqual(['detect-changes=failure', 'simulation-checks=skipped']);
    },
  );
});
