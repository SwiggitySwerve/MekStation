#!/usr/bin/env node
import {
  filterLogs,
  loadRunEvidence,
  logIntentLabel,
  parseArgs,
} from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const evidence = loadRunEvidence({
  evidenceDir: options.evidenceDir,
  runId: options.runId ?? 'latest',
});
const logs = filterLogs(evidence.logs, options);

if (options.json) {
  console.log(JSON.stringify(logs, null, 2));
} else {
  console.log(`# Journey logs (${logs.length})`);
  for (const entry of logs) {
    console.log(
      `- [${logIntentLabel(entry)}] ${entry.runId} ${entry.journeyId ?? '-'} ${entry.service}.${entry.event}: ${entry.message ?? ''}`,
    );
  }
}

process.exit(0);
