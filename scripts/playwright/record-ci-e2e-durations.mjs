import fs from 'node:fs';

import { recordDurations } from './ci-e2e-plan.mjs';

const [runIds, ...files] = process.argv.slice(2);
if (!runIds || !files.length)
  throw new Error(
    'Usage: record-ci-e2e-durations.mjs <runId[,runId]> <report.json>...',
  );
const result = recordDurations(
  files.map((file) => JSON.parse(fs.readFileSync(file, 'utf8'))),
  runIds.split(','),
);
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
