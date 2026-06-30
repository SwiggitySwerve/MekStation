#!/usr/bin/env node
import {
  buildUiFlowShellInspection,
  loadJourneyArtifacts,
  parseArgs,
  printIssues,
} from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const { catalog, graph, uiFlowShell } = loadJourneyArtifacts();
const inspection = buildUiFlowShellInspection(
  uiFlowShell,
  catalog,
  graph,
  options,
);

if (options.json) {
  console.log(JSON.stringify(inspection, null, 2));
} else if (options.validateOnly) {
  printIssues(inspection.issues);
  console.log(
    `[qc:ui-flow-shell] flows=${inspection.flowCount} selected=${inspection.selectedFlowCount} errors=${inspection.errors.length} warnings=${inspection.warnings.length}`,
  );
} else {
  console.log(`# Gameplay UI flow shell`);
  console.log(`Status: ${inspection.status}`);
  console.log(`Flows: ${inspection.selectedFlowCount}/${inspection.flowCount}`);
  for (const flow of inspection.flows) {
    console.log(`\n## ${flow.displayName} (${flow.journeyId})`);
    console.log(`Module: ${flow.module}`);
    console.log(`Roles: ${flow.roleIntent.join(', ')}`);
    console.log(
      `Primary action: ${flow.primaryAction.label} -> ${flow.primaryAction.href}`,
    );
    console.log(`QC command: ${flow.qcCommand}`);
    console.log(`Checkpoints:`);
    for (const [index, checkpoint] of flow.checkpoints.entries()) {
      console.log(
        `- ${index + 1}. ${checkpoint.label} [${checkpoint.visibility}] ${checkpoint.href}`,
      );
    }
    console.log(`Command-screen checkpoints:`);
    for (const checkpoint of flow.commandScreenCheckpoints) {
      console.log(
        `- ${checkpoint.label} [${checkpoint.role}] -> ${checkpoint.uiCheckpointId}`,
      );
      for (const assertion of checkpoint.assertions) {
        console.log(`  - ${assertion}`);
      }
    }
  }
}

process.exit(inspection.errors.length > 0 ? 1 : 0);
