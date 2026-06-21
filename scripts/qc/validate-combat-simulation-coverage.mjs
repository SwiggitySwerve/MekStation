import { readFileSync } from 'node:fs';

const DEFAULT_SUMMARY_PATH = 'coverage/combat-simulation/coverage-summary.json';

const FLOORS = {
  'src/simulation/': {
    lines: 25,
    statements: 26,
    functions: 16,
    branches: 20,
  },
  'src/utils/gameplay/': {
    lines: 12,
    statements: 12,
    functions: 8,
    branches: 9,
  },
};

const summaryArg = process.argv.find((arg) => arg.startsWith('--summary='));
const summaryPath = summaryArg
  ? summaryArg.slice('--summary='.length)
  : DEFAULT_SUMMARY_PATH;

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const failures = [];

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function emptyMetric() {
  return {
    total: 0,
    covered: 0,
  };
}

function createAggregate() {
  return {
    lines: emptyMetric(),
    statements: emptyMetric(),
    functions: emptyMetric(),
    branches: emptyMetric(),
  };
}

function pct(metric) {
  if (metric.total === 0) return 0;
  return Number(((metric.covered / metric.total) * 100).toFixed(2));
}

for (const [prefix, floors] of Object.entries(FLOORS)) {
  const aggregate = createAggregate();

  for (const [rawPath, fileCoverage] of Object.entries(summary)) {
    const path = normalizePath(rawPath);
    if (path === 'total' || !path.includes(prefix)) continue;

    for (const metricName of Object.keys(floors)) {
      aggregate[metricName].total += fileCoverage[metricName]?.total ?? 0;
      aggregate[metricName].covered += fileCoverage[metricName]?.covered ?? 0;
    }
  }

  for (const [metricName, floor] of Object.entries(floors)) {
    const metric = aggregate[metricName];
    const actual = pct(metric);

    if (metric.total === 0) {
      failures.push(`${prefix} ${metricName}: no coverage entries found`);
      continue;
    }

    if (actual < floor) {
      failures.push(
        `${prefix} ${metricName}: ${actual}% is below floor ${floor}%`,
      );
      continue;
    }

    console.log(
      `Coverage OK: ${prefix} ${metricName} ${actual}% >= ${floor}% (${metric.covered}/${metric.total})`,
    );
  }
}

if (failures.length > 0) {
  console.error('Combat/simulation coverage floor failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
