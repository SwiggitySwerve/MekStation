#!/usr/bin/env node
import { parseArgs, printIssues, runJourney } from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));

try {
  const output = runJourney(options);
  console.log(`[qc:journeys] run: ${output.runPlan.runId}`);
  console.log(`[qc:journeys] status: ${output.result.status}`);
  console.log(`[qc:journeys] evidence: ${output.paths.runDir}`);
  console.log(`[qc:journeys] bug candidates: ${output.bugs.length}`);
  const successfulStatus =
    output.result.status === 'pass' || output.result.status === 'dry-run';
  process.exit(successfulStatus && output.gatedBugCount === 0 ? 0 : 1);
} catch (error) {
  if (error.issues) printIssues(error.issues);
  console.error(`[qc:journeys] ${error.message}`);
  process.exit(1);
}
