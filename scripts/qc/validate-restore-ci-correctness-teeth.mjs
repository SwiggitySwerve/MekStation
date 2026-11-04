import { readFileSync } from 'node:fs';

const workflowArg = process.argv.find((arg) => arg.startsWith('--workflow='));
const workflowPath = workflowArg
  ? workflowArg.slice('--workflow='.length)
  : '.github/workflows/pr-checks.yml';
const workflow = readFileSync(workflowPath, 'utf8');

const checks = [
  {
    label: 'simulation-checks runs the statistical proof',
    passes:
      /simulation-checks:[\s\S]*Run 100-game statistical combat proofs/.test(
        workflow,
      ),
  },
  {
    label: 'statistical proof runs integration.test.ts',
    passes:
      /Run 100-game statistical combat proofs[\s\S]*src\/simulation\/__tests__\/integration\.test\.ts/.test(
        workflow,
      ),
  },
  {
    label: 'statistical proof uses SIMULATION_COUNT 100',
    passes:
      /Run 100-game statistical combat proofs[\s\S]*SIMULATION_COUNT:\s*'100'/.test(
        workflow,
      ),
  },
  {
    label: 'statistical proof allows contended profiling budget',
    passes:
      /Run 100-game statistical combat proofs[\s\S]*SIMULATION_PROFILE_TIME_BUDGET_MS:\s*'60000'/.test(
        workflow,
      ),
  },
  {
    label: 'simulation-checks job exists',
    passes: /^  simulation-checks:/m.test(workflow),
  },
  {
    label: 'simulation-checks perf budgets enable SIMULATION_PERF_ASSERTIONS',
    passes:
      /simulation-checks:[\s\S]*SIMULATION_PERF_ASSERTIONS:\s*'true'/.test(
        workflow,
      ),
  },
  {
    label: 'simulation-checks runs the coverage floor',
    passes:
      /simulation-checks:[\s\S]*Enforce combat\/simulation coverage floors/.test(
        workflow,
      ),
  },
  {
    label: 'coverage floor uses coverage validator',
    passes:
      /simulation-checks:[\s\S]*validate-combat-simulation-coverage\.mjs/.test(
        workflow,
      ),
  },
  {
    label: 'coverage floor excludes perf-sensitive assertions',
    passes:
      /simulation-checks:[\s\S]*JEST_EXCLUDE_PERF_SENSITIVE:\s*'true'/.test(
        workflow,
      ),
  },
];

const aggregatorMatch = workflow.match(
  /  lint-and-test:[\s\S]*?needs:\s*\[\s*([\s\S]*?)\s*\]\s*$/m,
);
const aggregatorNeeds = aggregatorMatch?.[1] ?? '';

for (const job of ['simulation-checks']) {
  checks.push({
    label: `lint-and-test needs ${job}`,
    passes: aggregatorNeeds.includes(job),
  });
}

const failures = checks.filter((check) => !check.passes);

for (const check of checks) {
  console.log(`${check.passes ? 'OK' : 'FAIL'} ${check.label}`);
}

if (failures.length > 0) {
  console.error(
    `CI correctness-teeth workflow validation failed: ${failures.length} check(s) failed.`,
  );
  process.exitCode = 1;
}
