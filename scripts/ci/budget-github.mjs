// Read-only source-head graph preparation. Never used with a write token.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadBudgets } from './budget-config.mjs';
import {
  readWorkflow,
  workflowGraphFromSource,
  projectTimingLimits,
} from './budget-workflow.mjs';
import { githubApi } from './ci-report-github.mjs';
import { buildReport } from './ci-report.mjs';

export async function prepareWorkflowInputs(
  api,
  { repository, runId, attempt, baselineCount = 10 },
  root = process.cwd(),
) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    ![runId, attempt].every((n) => Number.isSafeInteger(n) && n > 0)
  )
    throw new Error('Invalid workflow source identity');
  const run = await api(
    'GET',
    `repos/${repository}/actions/runs/${runId}/attempts/${attempt}`,
  );
  const response = await api(
    'GET',
    `repos/${repository}/actions/workflows/${run.workflow_id}/runs?branch=main&event=push&per_page=${baselineCount}`,
  );
  if (!Array.isArray(response.workflow_runs))
    throw new Error('Main run census unavailable');
  const graphs = {},
    diagnostics = [];
  for (const candidate of [run, ...response.workflow_runs]) {
    if (Object.hasOwn(graphs, candidate.head_sha)) continue;
    try {
      if (
        !/^[a-f\d]{40}$/.test(candidate.head_sha) ||
        candidate.path?.split('@')[0] !== '.github/workflows/pr-checks.yml'
      )
        throw new Error('Unexpected workflow source');
      const blob = await api(
        'GET',
        `repos/${repository}/contents/.github/workflows/pr-checks.yml?ref=${candidate.head_sha}`,
      );
      if (blob.encoding !== 'base64' || typeof blob.content !== 'string')
        throw new Error('Workflow source must be a JSON/base64 blob');
      graphs[candidate.head_sha] = workflowGraphFromSource(
        Buffer.from(blob.content, 'base64').toString('utf8'),
      );
    } catch (error) {
      diagnostics.push(`${candidate.head_sha}: ${error.message}`);
    }
  }
  if (!graphs[run.head_sha])
    throw new Error('Current source-head graph unavailable');
  const configText = fs.readFileSync(
    path.join(root, 'config/ci/budgets.json'),
    'utf8',
  );
  return {
    schema: 'mekstation/ci-producer-inputs/v1',
    source: {
      repository,
      runId,
      attempt,
      headSha: run.head_sha,
      workflowId: run.workflow_id,
    },
    graphs: { repository, graphs },
    baselines: response.workflow_runs.map(({ id, run_attempt }) => ({
      runId: id,
      attempt: run_attempt,
    })),
    configText,
    limits: projectTimingLimits(
      loadBudgets(path.join(root, 'config/ci/budgets.json')),
      readWorkflow(root),
    ),
    diagnostics,
  };
}

export async function proveReportReadOnly(
  api,
  repository,
  root = process.cwd(),
) {
  const readonly = (method, route, body) => {
    if (method !== 'GET')
      throw new Error('Reporting dry-run attempted a write');
    return api(method, route, body);
  };
  const response = await readonly(
    'GET',
    `repos/${repository}/actions/workflows/pr-checks.yml/runs?branch=main&event=push&status=success&per_page=1`,
  );
  const run = response.workflow_runs?.[0];
  if (!run)
    throw new Error('No complete successful main run for reporter proof');
  const inputs = await prepareWorkflowInputs(
    readonly,
    { repository, runId: run.id, attempt: run.run_attempt },
    root,
  );
  const result = await buildReport({
    api: readonly,
    repository,
    runId: run.id,
    attempt: run.run_attempt,
    graphs: inputs.graphs,
    limits: inputs.limits,
  });
  if (!result.source.observation.complete)
    throw new Error(
      `Historical reporter source incomplete: ${result.source.observation.missing.join(', ')}`,
    );
  return {
    schema: 'mekstation/ci-report-proof/v1',
    source: result.source.observation,
    report: result.report,
    diagnostics: result.diagnostics,
    writes: 0,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = 'budget-output/inputs.json';
  const value = await prepareWorkflowInputs(githubApi, {
    repository: process.env.GITHUB_REPOSITORY,
    runId: Number(process.env.GITHUB_RUN_ID),
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`);
  const proof = await proveReportReadOnly(
    githubApi,
    process.env.GITHUB_REPOSITORY,
  );
  fs.writeFileSync(
    'budget-output/report-dry-run.json',
    `${JSON.stringify(proof, null, 2)}\n`,
  );
}
