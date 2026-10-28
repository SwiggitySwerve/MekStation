/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
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

  it.each(['lint', 'typecheck', 'desktop-typecheck'])(
    'requires %s through the unconditional PR aggregator',
    (id) => {
      const aggregator = pr.jobs['lint-and-test'];
      expect(aggregator.name).toBe('Lint and Test');
      expect(aggregator.if).toBe('always()');
      expect(dependencies(aggregator)).toContain(id);
      expect(pr.jobs[id].if).toBeUndefined();
      expect(pr.jobs[id]['continue-on-error']).toBeUndefined();
      const assertion = aggregator.steps[0];
      expect(assertion.run).toContain('select(.value.result != "success")');
      expect(assertion.run).toContain('exit 1');
      expect(assertion.if).toBeUndefined();
      expect(assertion['continue-on-error']).toBeUndefined();
    },
  );

  it('runs real PR validation commands and generates route types first', () => {
    command(pr.jobs.lint, 'npm run lint');
    command(pr.jobs['desktop-typecheck'], 'npm run type-check', 'desktop');
    const job = pr.jobs.typecheck;
    const generate = command(job, 'npx next typegen');
    const check = command(job, 'npm run typecheck');
    expect(job.steps.indexOf(generate)).toBeLessThan(job.steps.indexOf(check));
  });

  it.each<[string, Job]>([
    ['PR lint', pr.jobs.lint],
    ['PR typecheck', pr.jobs.typecheck],
    ['PR desktop typecheck', pr.jobs['desktop-typecheck']],
    ['release validate-source', release.jobs['validate-source']],
  ])('runs every %s step unconditionally and fails on errors', (_name, job) => {
    for (const step of job.steps) {
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
