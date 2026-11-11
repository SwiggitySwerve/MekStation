#!/usr/bin/env node
// Trusted entry point. Reads JSON/API data only; never imports producer/PR code.
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { observationEnvelope, validateObservation } from './ci-observation.mjs';
import { evaluateReport, renderReport } from './ci-report-evaluate.mjs';
import { collectRun, githubApi, publishReport } from './ci-report-github.mjs';

export async function buildReport({
  api,
  repository,
  runId,
  attempt,
  jobGraph,
  matrixGroups = {},
  graphs,
  limits = {},
  producer = null,
  baselineProducers = [],
  baselineCount = 10,
}) {
  const diagnostics = [];
  const source = await collectRun(api, {
    repository,
    runId,
    attempt,
    jobGraph,
    matrixGroups,
    graphs,
  });
  let envelope = observationEnvelope(source.observation);
  if (producer) {
    validateObservation(producer);
    if (
      Object.keys(envelope.observation.identity).some(
        (key) =>
          producer.observation.identity[key] !==
          envelope.observation.identity[key],
      ) ||
      producer.observation.comparableKey !== envelope.observation.comparableKey
    )
      throw new Error(
        'Producer artifact does not match fresh API run/head/attempt',
      );
    envelope = { ...producer, observation: source.observation };
  }
  const attempts = [source];
  for (let number = 1; number < attempt; number += 1) {
    try {
      attempts.push(
        await collectRun(api, {
          repository,
          runId,
          attempt: number,
          jobGraph,
          matrixGroups,
          graphs,
        }),
      );
    } catch (error) {
      diagnostics.push(`Prior attempt ${number} unavailable: ${error.message}`);
    }
  }
  const baselines = [];
  try {
    const response = await api(
      'GET',
      `repos/${repository}/actions/workflows/${source.run.workflow_id}/runs?branch=main&event=push&per_page=${baselineCount}`,
    );
    if (!Array.isArray(response.workflow_runs))
      throw new Error('Missing baseline runs array');
    for (const candidate of response.workflow_runs) {
      if (
        !Number.isSafeInteger(candidate.run_attempt) ||
        candidate.run_attempt < 1 ||
        candidate.run_attempt > 20
      ) {
        diagnostics.push(`Invalid baseline attempt count: ${candidate.id}`);
        continue;
      }
      for (let number = 1; number <= candidate.run_attempt; number += 1) {
        try {
          if (!graphs && candidate.head_sha !== source.run.head_sha)
            throw new Error(
              'Source-head workflow graph unavailable for historical baseline',
            );
          baselines.push(
            await collectRun(api, {
              repository,
              runId: candidate.id,
              attempt: number,
              jobGraph,
              matrixGroups,
              graphs,
            }),
          );
        } catch (error) {
          baselines.push({
            run: candidate,
            attempt: number,
            invalid: error.message,
          });
          diagnostics.push(
            `Baseline ${candidate.id}/${number} invalid: ${error.message}`,
          );
        }
      }
    }
  } catch (error) {
    diagnostics.push(`Main baseline API unavailable: ${error.message}`);
  }
  const validProducers = [];
  for (const value of baselineProducers) {
    try {
      validateObservation(value);
      const identity = value.observation.identity;
      const authoritative = baselines.find(
        (entry) =>
          entry.observation &&
          entry.observation.identity.runId === identity.runId &&
          entry.observation.identity.attempt === identity.attempt,
      )?.observation;
      if (
        !authoritative ||
        Object.keys(authoritative.identity).some(
          (key) => authoritative.identity[key] !== identity[key],
        ) ||
        authoritative.comparableKey !== value.observation.comparableKey
      )
        throw new Error(
          'Baseline artifact does not match fresh API run/head/attempt',
        );
      validProducers.push(value);
    } catch (error) {
      diagnostics.push(`Invalid baseline artifact: ${error.message}`);
    }
  }
  const report = evaluateReport({
    observation: source.observation,
    baselines: baselines
      .filter((entry) => entry.observation)
      .map((entry) => entry.observation),
    limits,
    tests: envelope.tests,
    testBaselines: validProducers.map((entry) => entry.tests).filter(Boolean),
    packages: envelope.packages,
    packageBaselines: validProducers,
    workflowProfiles: envelope.repositoryMetrics?.workflow?.profiles ?? [],
  });
  if (diagnostics.length) {
    report.missing.push(...diagnostics);
    report.complete = false;
    if (!report.breach) report.status = 'missing';
  }
  return { source, attempts, baselines, envelope, report, diagnostics };
}

const read = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

function appendSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  } catch {
    process.stderr.write(
      'CI report diagnostic: step summary could not be written\n',
    );
  }
}

export async function main(argv, api = githubApi) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        repo: { type: 'string' },
        run: { type: 'string' },
        attempt: { type: 'string' },
        graph: { type: 'string' },
        limits: { type: 'string' },
        out: { type: 'string' },
        'workflow-id': { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        observation: { type: 'string' },
        'baseline-observations': { type: 'string' },
      },
    });
    if (
      !values.repo ||
      !values.graph ||
      !values.run ||
      !values.attempt ||
      !values['workflow-id']
    )
      throw new Error(
        'Required: --repo --run --attempt --workflow-id --graph [--limits JSON] [--out DIR] [--dry-run]',
      );
    const runId = Number(values.run);
    const attempt = Number(values.attempt);
    const workflowId = Number(values['workflow-id']);
    if (!Number.isSafeInteger(workflowId) || workflowId <= 0 || attempt > 20)
      throw new Error('Invalid expected workflow or attempt count');
    const graphInput = read(values.graph);
    const result = await buildReport({
      api,
      repository: values.repo,
      runId,
      attempt,
      jobGraph: graphInput.jobGraph ?? graphInput,
      matrixGroups: graphInput.matrixGroups ?? {},
      graphs: graphInput.graphs ? graphInput : undefined,
      limits: values.limits ? read(values.limits) : {},
      producer: values.observation ? read(values.observation) : null,
      baselineProducers: values['baseline-observations']
        ? read(values['baseline-observations'])
        : [],
    });
    if (result.source.run.workflow_id !== workflowId)
      throw new Error('Unexpected source workflow');
    const output = path.resolve(
      values.out ??
        path.join(tmpdir(), 'mekstation-ci-report', `${runId}-${attempt}`),
    );
    fs.mkdirSync(output, { recursive: true });
    const save = (file, data) =>
      fs.writeFileSync(
        path.join(output, file),
        `${JSON.stringify(data, null, 2)}\n`,
      );
    save(`ci-observation-${runId}-${attempt}.json`, result.envelope);
    save('source-attempts.json', result.attempts);
    save('baseline-attempts.json', result.baselines);
    save('evaluation.json', result.report);
    const markdown = renderReport(result.report);
    fs.writeFileSync(path.join(output, 'report.md'), markdown);
    appendSummary(markdown);
    const pullRequests = result.source.run.pull_requests ?? [];
    const publications = [];
    for (const pull of pullRequests)
      publications.push(
        await publishReport({
          api,
          repository: values.repo,
          pullNumber: pull.number,
          expectedWorkflowId: workflowId,
          report: result.report,
          dryRun: values['dry-run'],
        }),
      );
    if (!pullRequests.length)
      result.diagnostics.push(
        'No associated PR; report saved without PR writes',
      );
    save('publication.json', { publications, diagnostics: result.diagnostics });
    for (const message of [
      ...result.diagnostics,
      ...publications.flatMap((item) => item.diagnostics),
    ])
      process.stderr.write(`CI report diagnostic: ${message}\n`);
    process.stdout.write(`CI report ${result.report.status}: ${output}\n`);
    return { status: result.report.status, output, publications };
  } catch (error) {
    const diagnostic = `CI reporting unavailable: ${error.message}`;
    process.stderr.write(`${diagnostic}\n`);
    appendSummary(`\n${diagnostic}\n`);
    // Soft reporting never replaces a producer's test/validation exit status.
    return { status: 'error', diagnostic };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main(process.argv.slice(2));
