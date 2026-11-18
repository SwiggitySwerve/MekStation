import fs from 'node:fs';

import {
  collectTests,
  nightlySuites,
  recordDurations,
} from './ci-e2e-plan.mjs';

const usage =
  'Usage: record-ci-e2e-durations.mjs [--suite-set nightly] <runId[,runId]> <report.json>...';
const args = process.argv.slice(2);
const nightly = args[0] === '--suite-set';
if (nightly && args[1] !== 'nightly') throw new Error(usage);
const [runIds, ...files] = nightly ? args.slice(2) : args;
if (!runIds || !files.length) throw new Error(usage);
const reports = files.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
// Nightly weights are the only thing this recorder writes for the Nightly
// suite set (config/playwright/nightly-durations.json); its files come from
// the reports themselves, since the Nightly census is every live spec.
const result = recordDurations(
  reports,
  runIds.split(','),
  nightly ? nightlySuites(reports.flatMap(collectTests)) : undefined,
);
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
