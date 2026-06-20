#!/usr/bin/env node
import { filterBugs, loadRunEvidence, parseArgs } from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const evidence = loadRunEvidence({
  evidenceDir: options.evidenceDir,
  runId: options.since ?? options.runId ?? 'latest',
});
const bugs = filterBugs(evidence.bugs, options);

if (options.json) {
  console.log(JSON.stringify(bugs, null, 2));
} else {
  console.log(`# Journey bugs (${bugs.length})`);
  for (const bug of bugs) {
    console.log(`- [${bug.severity}] ${bug.journeyId}: ${bug.summary}`);
    console.log(`  fingerprint: ${bug.fingerprint}`);
    console.log(`  evidence: ${(bug.evidenceRefs ?? []).join(', ') || 'none'}`);
  }
}

process.exit(0);
