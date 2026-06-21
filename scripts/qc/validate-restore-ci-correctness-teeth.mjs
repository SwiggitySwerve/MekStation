import { readFileSync } from 'node:fs';

const workflowArg = process.argv.find((arg) => arg.startsWith('--workflow='));
const workflowPath = workflowArg
  ? workflowArg.slice('--workflow='.length)
  : '.github/workflows/pr-checks.yml';
const workflow = readFileSync(workflowPath, 'utf8');

const checks = [
  {
    label: 'statistical-proof-pr job exists',
    passes: /^  statistical-proof-pr:/m.test(workflow),
  },
  {
    label: 'statistical-proof-pr runs integration.test.ts',
    passes:
      /statistical-proof-pr:[\s\S]*src\/simulation\/__tests__\/integration\.test\.ts/.test(
        workflow,
      ),
  },
  {
    label: 'statistical-proof-pr uses SIMULATION_COUNT 100',
    passes: /statistical-proof-pr:[\s\S]*SIMULATION_COUNT:\s*'100'/.test(
      workflow,
    ),
  },
  {
    label: 'statistical-proof-pr allows contended profiling budget',
    passes:
      /statistical-proof-pr:[\s\S]*SIMULATION_PROFILE_TIME_BUDGET_MS:\s*'60000'/.test(
        workflow,
      ),
  },
  {
    label: 'perf-budget-pr job exists',
    passes: /^  perf-budget-pr:/m.test(workflow),
  },
  {
    label: 'perf-budget-pr enables SIMULATION_PERF_ASSERTIONS',
    passes: /perf-budget-pr:[\s\S]*SIMULATION_PERF_ASSERTIONS:\s*'true'/.test(
      workflow,
    ),
  },
  {
    label: 'coverage-floor job exists',
    passes: /^  coverage-floor:/m.test(workflow),
  },
  {
    label: 'coverage-floor uses coverage validator',
    passes:
      /coverage-floor:[\s\S]*validate-combat-simulation-coverage\.mjs/.test(
        workflow,
      ),
  },
];

const aggregatorMatch = workflow.match(
  /  lint-and-test:[\s\S]*?needs:\s*\[\s*([\s\S]*?)\s*\]\s*$/m,
);
const aggregatorNeeds = aggregatorMatch?.[1] ?? '';

for (const job of [
  'statistical-proof-pr',
  'perf-budget-pr',
  'coverage-floor',
]) {
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
