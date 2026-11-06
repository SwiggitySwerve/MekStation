import { execFileSync } from 'node:child_process';
// Read-only preparation entry point; publishing uses only garden-publish + JSON.
import fs from 'node:fs';

import * as budgetConfig from './budget-config.mjs';
import * as budgetMetrics from './budget-metrics.mjs';
import * as budgetWorkflow from './budget-workflow.mjs';
import * as ciMetrics from './ci-metrics.mjs';
import * as ciObservation from './ci-observation.mjs';
import * as ciGithub from './ci-report-github.mjs';
import * as ciTest from './ci-test-metrics.mjs';
import { prepareGarden, projectGardenEvidence } from './garden-prepare.mjs';

export async function prepareWeekly(
  github,
  { owner, repo },
  output = 'budget-output/weekly.json',
) {
  const api = {
    ...budgetConfig,
    ...budgetMetrics,
    ...budgetWorkflow,
    ...ciMetrics,
    ...ciObservation,
    ...ciTest,
    ...ciGithub,
  };
  const config = budgetConfig.loadBudgets();
  const prepared = await prepareGarden({
    github,
    owner,
    repo,
    now: new Date().toISOString(),
    config,
    budgetConfigHash: budgetConfig.budgetConfigHash(),
    expectedBaseSha: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim(),
    api,
    projectEvidence: (envelope, budgets) =>
      projectGardenEvidence(envelope, budgets, api),
  });
  fs.mkdirSync('budget-output', { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(prepared, null, 2)}\n`);
  return prepared;
}
