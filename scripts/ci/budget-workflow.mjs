import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import { parseDocument } from 'yaml';

import { reportingLimits } from './budget-config.mjs';
import { decide } from './ci-changes.mjs';

function parseWorkflowSource(text) {
  if (typeof text !== 'string')
    throw new TypeError('Workflow source must be text');
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length) throw document.errors[0];
  const workflow = document.toJS();
  if (!workflow?.jobs || !Object.keys(workflow.jobs).length)
    throw new Error('Workflow jobs missing');
  return workflow;
}

export function readWorkflow(root) {
  return parseWorkflowSource(
    fs.readFileSync(path.join(root, '.github/workflows/pr-checks.yml'), 'utf8'),
  );
}

/** Parse immutable source JSON/base64 payloads without executing workflow code. */
export function workflowGraphFromSource(text) {
  return workflowGraphContract(parseWorkflowSource(text));
}

function readAllWorkflows(root) {
  return fs
    .readdirSync(path.join(root, '.github/workflows'))
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((file) => {
      const value = parseWorkflowSource(
        fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'),
      );
      if (
        typeof value.name !== 'string' ||
        !value.on ||
        typeof value.on !== 'object' ||
        Array.isArray(value.on) ||
        !value.jobs
      )
        throw new Error(`Unknown workflow shape: ${file}`);
      return { file, ...value };
    });
}

function matchesPaths(trigger, paths) {
  if (trigger === null || trigger === undefined) return true;
  if (typeof trigger !== 'object' || Array.isArray(trigger))
    throw new Error('Unknown PR trigger');
  if (trigger.paths && trigger['paths-ignore'])
    throw new Error('Mixed path filters unsupported');
  if (trigger.paths) {
    if (
      !Array.isArray(trigger.paths) ||
      trigger.paths.some((p) => typeof p !== 'string' || p.startsWith('!'))
    )
      throw new Error('Unknown paths filter');
    return paths.some((p) =>
      trigger.paths.some((pattern) =>
        picomatch.isMatch(p, pattern, { dot: true }),
      ),
    );
  }
  if (trigger['paths-ignore'])
    return paths.some(
      (p) =>
        !trigger['paths-ignore'].some((pattern) =>
          picomatch.isMatch(p, pattern, { dot: true }),
        ),
    );
  return true;
}

// Draft-to-ready is part of the ordinary PR lifecycle in this repository.
const TYPICAL_PR_TYPES = [
  'opened',
  'synchronize',
  'reopened',
  'ready_for_review',
];

function hasTypicalPrEvent(trigger) {
  if (trigger?.types === undefined) return true;
  if (
    !Array.isArray(trigger.types) ||
    !trigger.types.length ||
    trigger.types.some((type) => typeof type !== 'string')
  )
    throw new Error('Unknown PR event types');
  return trigger.types.some((type) => TYPICAL_PR_TYPES.includes(type));
}

/** Includes ALL induced workflow_run jobs. Unknown job conditions count active. */
export function inducedWorkflowCensus(root, paths) {
  const workflows = readAllWorkflows(root),
    included = new Set(),
    active = [];
  function include(workflow, chain) {
    if (chain.includes(workflow.name))
      throw new Error('Cyclic workflow_run graph');
    if (included.has(workflow.file)) return;
    included.add(workflow.file);
    if (workflow.file !== 'pr-checks.yml') {
      for (const [id, job] of Object.entries(workflow.jobs))
        active.push(
          ...expandJob(id, job).map((entry) => ({
            workflow: workflow.name,
            file: workflow.file,
            ...entry,
            condition: job.if ?? null,
            active: true,
          })),
        );
    }
    for (const candidate of workflows) {
      const trigger = candidate.on.workflow_run;
      if (!trigger) continue;
      if (!Array.isArray(trigger.workflows) || !Array.isArray(trigger.types))
        throw new Error(`Unknown workflow_run: ${candidate.file}`);
      if (trigger.workflows.includes(workflow.name))
        include(candidate, [...chain, workflow.name]);
    }
  }
  for (const workflow of workflows) {
    for (const event of ['pull_request', 'pull_request_target']) {
      if (
        Object.hasOwn(workflow.on, event) &&
        matchesPaths(workflow.on[event], paths) &&
        hasTypicalPrEvent(workflow.on[event])
      )
        include(workflow, []);
    }
  }
  return {
    jobs: active,
    files: [...included].sort(),
    otherEvents: workflows
      .filter((w) => !included.has(w.file))
      .map((w) => ({
        file: w.file,
        name: w.name,
        events: Object.keys(w.on),
        types: Object.fromEntries(
          Object.entries(w.on).map(([event, trigger]) => [
            event,
            trigger?.types ?? null,
          ]),
        ),
      })),
  };
}

function expandedJobNames(id, job) {
  return expandJob(id, job).map((entry) => {
    const name = (job.name ?? id).replace(
      /\$\{\{\s*matrix\.(\w+)\s*\}\}/g,
      (_, key) => {
        if (!(key in entry.matrix))
          throw new Error(`Missing matrix name ${key}`);
        return String(entry.matrix[key]);
      },
    );
    if (name.includes('${{')) throw new Error(`Dynamic job name: ${name}`);
    return name;
  });
}

export function expandedJobGraph(workflow) {
  const names = Object.fromEntries(
    Object.entries(workflow.jobs).map(([id, job]) => [
      id,
      expandedJobNames(id, job),
    ]),
  );
  const graph = {};
  for (const [id, job] of Object.entries(workflow.jobs)) {
    const needs =
      job.needs === undefined
        ? []
        : Array.isArray(job.needs)
          ? job.needs
          : [job.needs];
    if (needs.some((dep) => !names[dep]))
      throw new Error(`Unknown dependency: ${id}`);
    for (const name of names[id]) {
      if (Object.hasOwn(graph, name))
        throw new Error(`Duplicate expanded job name ${name}`);
      graph[name] = needs.flatMap((dep) => names[dep]);
    }
  }
  return graph;
}

export function workflowGraphContract(workflow) {
  const jobGraph = expandedJobGraph(workflow),
    matrixGroups = {};
  for (const [id, job] of Object.entries(workflow.jobs)) {
    if (!job.strategy) continue;
    const template = job.name ?? id;
    matrixGroups[template] = expandedJobNames(id, job);
  }
  return { schema: 'mekstation/ci-workflow-graph/v1', jobGraph, matrixGroups };
}

/** G2 consumes this optional soft projection; unknown aggregate limits stay absent. */
export function projectTimingLimits(config, workflow) {
  const jobsMs = {};
  for (const [id, job] of Object.entries(workflow.jobs)) {
    const minutes = config.timeouts[id]?.minutes;
    if (!Number.isSafeInteger(minutes) || minutes <= 0)
      throw new Error(`Missing timing budget: ${id}`);
    for (const name of expandedJobNames(id, job))
      jobsMs[name] = minutes * 60000;
  }
  return { jobsMs, ...reportingLimits(config) };
}

export function jobGate(job) {
  if (job.if === undefined || job.if === 'always()') return null;
  const match = /^needs\.detect-changes\.outputs\.([\w-]+) == 'true'$/.exec(
    job.if,
  );
  if (!match) throw new Error(`Unknown job condition: ${job.if}`);
  return match[1];
}

export function expandJob(id, job) {
  if (!job || typeof job !== 'object' || job.uses)
    throw new Error(`${id}: unknown job shape`);
  if (!job.strategy) return [{ id, matrix: {} }];
  const matrix = job.strategy.matrix;
  if (
    !matrix ||
    typeof matrix !== 'object' ||
    Array.isArray(matrix) ||
    matrix.exclude
  )
    throw new Error(`${id}: unsupported matrix`);
  const axes = Object.keys(matrix).filter((key) => key !== 'include');
  if (matrix.include && axes.length)
    throw new Error(`${id}: mixed include matrix is unsupported`);
  if (matrix.include) {
    if (!Array.isArray(matrix.include) || !matrix.include.length)
      throw new Error(`${id}: empty include matrix`);
    return matrix.include.map((values) => ({ id, matrix: values }));
  }
  let rows = [{}];
  for (const axis of axes) {
    if (!Array.isArray(matrix[axis]) || !matrix[axis].length)
      throw new Error(`${id}: dynamic/empty matrix`);
    rows = rows.flatMap((row) =>
      matrix[axis].map((value) => ({ ...row, [axis]: value })),
    );
  }
  if (!axes.length) throw new Error(`${id}: empty matrix`);
  return rows.map((values) => ({ id, matrix: values }));
}

export function workflowMetrics(root, config, workflow = readWorkflow(root)) {
  const jobs = workflow.jobs,
    aggregator = jobs['lint-and-test'];
  if (Object.values(jobs).some((job) => job['continue-on-error']))
    throw new Error('Job failure cannot be ignored by the aggregator');
  if (aggregator?.name !== 'Lint and Test' || aggregator.if !== 'always()')
    throw new Error('Unconditional Lint and Test aggregator missing');
  const expected = Object.keys(jobs)
    .filter((id) => id !== 'lint-and-test')
    .sort();
  if (
    !Array.isArray(aggregator.needs) ||
    JSON.stringify([...aggregator.needs].sort()) !== JSON.stringify(expected)
  )
    throw new Error('Every job must be accounted for by Lint and Test');
  const check = jobs['static-checks']?.steps?.find((s) =>
    s.run?.includes('node scripts/ci/budget-check.mjs'),
  );
  if (
    check?.run?.trim() !==
      'node --test scripts/ci/*.test.mjs\nnode scripts/ci/budget-check.mjs --report "$RUNNER_TEMP/budget-output/repository.json"' ||
    check.if !== '${{ !cancelled() }}' ||
    check['continue-on-error'] ||
    jobs['static-checks']['continue-on-error'] ||
    check.env?.PR_LABELS_JSON !==
      '${{ toJSON(github.event.pull_request.labels.*.name) }}'
  )
    throw new Error('Deterministic budget gate disabled or bypassed');
  for (const command of [
    'node scripts/ci/budget-artifacts.mjs --kind web --report "$RUNNER_TEMP/budget-output/web.json"',
    'node scripts/ci/budget-artifacts.mjs --kind installers --report "$RUNNER_TEMP/budget-output/installers.json"',
  ]) {
    const packageCheck = jobs['simulation-checks']?.steps?.find(
      (step) => step.run?.trim() === command,
    );
    if (
      !packageCheck ||
      packageCheck.if !== '${{ !cancelled() }}' ||
      packageCheck['continue-on-error']
    )
      throw new Error('Complete package census disabled or bypassed');
  }
  const step = aggregator.steps?.find(
    (s) => s.run === 'node scripts/ci/budget-aggregate.mjs',
  );
  const gates = Object.fromEntries(
    Object.entries(jobs).flatMap(([id, job]) => {
      const gate = jobGate(job);
      return gate === null ? [] : [[id, gate]];
    }),
  );
  if (
    !step ||
    step.if ||
    step['continue-on-error'] ||
    aggregator['continue-on-error'] ||
    step.env?.NEEDS_JSON !== '${{ toJSON(needs) }}' ||
    JSON.stringify(JSON.parse(step.env?.GATES_JSON ?? 'null')) !==
      JSON.stringify(gates)
  )
    throw new Error('Aggregator command or gate inputs bypassed');
  const approval = aggregator.steps?.find(
    (s) =>
      s.name === 'Enforce budget-raise approval with read-only live inputs',
  );
  if (
    approval?.uses !== 'actions/github-script@v8' ||
    approval.if !== "github.event_name == 'pull_request'" ||
    approval['continue-on-error'] ||
    !approval.with?.script.includes('checkBudgetPolicy') ||
    !approval.with.script.includes('if (!result.allowed) throw')
  )
    throw new Error('Budget approval gate disabled or bypassed');
  const expanded = Object.entries(jobs).flatMap(([id, job]) =>
    expandJob(id, job),
  );
  const profiles = config.profiles.map((profile) => {
    const gates = decide(root, profile.paths).gates;
    gates['pr-desktop'] = gates.desktop;
    const census = expanded.map((entry) => {
      const gate = jobGate(jobs[entry.id]);
      if (gate && typeof gates[gate] !== 'boolean')
        throw new Error(`Unknown gate ${gate}`);
      return { ...entry, gate, active: gate === null || gates[gate] };
    });
    const induced = inducedWorkflowCensus(root, profile.paths);
    return {
      ...profile,
      expanded: census.length + induced.jobs.length,
      active: census.filter((j) => j.active).length + induced.jobs.length,
      census: [
        ...census.map((job) => ({
          workflow: workflow.name,
          file: 'pr-checks.yml',
          ...job,
        })),
        ...induced.jobs,
      ],
      workflowFiles: induced.files,
      otherEvents: induced.otherEvents,
    };
  });
  const timeouts = Object.fromEntries(
    Object.entries(jobs).map(([id, job]) => [id, job['timeout-minutes']]),
  );
  if (
    Object.keys(timeouts).sort().join('|') !==
    Object.keys(config.timeouts).sort().join('|')
  )
    throw new Error('Every job needs a static timeout budget');
  return { profiles, timeouts, jobGraph: expandedJobGraph(workflow) };
}
