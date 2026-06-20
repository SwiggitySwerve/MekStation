#!/usr/bin/env node
import {
  parseArgs,
  printIssues,
  validationSummary,
} from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const summary = validationSummary();
let issues = summary.issues;

if (options.parameters['logging-only'] === 'true') {
  issues = summary.issues.filter((issue) =>
    issue.message.toLowerCase().includes('logging'),
  );
}

printIssues(issues);
console.log(
  `[qc:journeys:validate] catalog=${summary.catalog.journeys.length} journeys graph=${summary.graph.nodes.length} nodes errors=${summary.errors.length} warnings=${summary.warnings.length}`,
);

process.exit(summary.errors.length > 0 ? 1 : 0);
