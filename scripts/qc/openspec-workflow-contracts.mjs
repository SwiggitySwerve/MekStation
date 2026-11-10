import { parse as parseYaml } from 'yaml';

function issue(code, message, details = {}) {
  return { code, message, ...details };
}

/** Current Linux contract is ubuntu-latest + default/literal bash. */
const ALLOWED_RUN_SHELL = 'bash';

function isUnsafeRunShell(shell) {
  return shell !== undefined && shell !== ALLOWED_RUN_SHELL;
}

function runShellFromDefaults(defaults) {
  if (!defaults || typeof defaults !== 'object') return undefined;
  const run = defaults.run;
  if (run == null) return undefined;
  if (typeof run !== 'object') return run;
  return run.shell;
}

function validateExecutionSafety(entry, label, invalidSteps) {
  if (
    entry?.['continue-on-error'] !== undefined &&
    entry['continue-on-error'] !== false
  )
    invalidSteps.push(label + ' must not continue-on-error');
  if (
    isUnsafeRunShell(entry?.shell) ||
    isUnsafeRunShell(runShellFromDefaults(entry?.defaults))
  )
    invalidSteps.push(label + ' must use default/literal bash');
}

/** OpenSpec validation must run even on docs-only PRs and after earlier failures. */
export function validateOpenSpecStaticChecks(workflowJobs, contract, errors) {
  const job = workflowJobs[contract.jobId];
  const invalidSteps = [];
  if (!job || typeof job !== 'object') {
    invalidSteps.push('required job is missing');
  } else {
    if (job.if !== undefined)
      invalidSteps.push('job must not have a change gate');
    validateExecutionSafety(job, contract.jobId, invalidSteps);
    const steps = Array.isArray(job.steps) ? job.steps : [];
    let previous = -1;
    for (const required of contract.steps) {
      const positions = steps.flatMap((step, index) =>
        step?.name === required.name ? [index] : [],
      );
      if (positions.length !== 1) {
        invalidSteps.push(required.name + ' must occur exactly once');
        continue;
      }
      const position = positions[0];
      const step = steps[position];
      if (typeof step.run !== 'string' || step.run.trim() !== required.run)
        invalidSteps.push(required.name + ' must run ' + required.run);
      if (step.if !== contract.stepIf)
        invalidSteps.push(required.name + ' must use ' + contract.stepIf);
      validateExecutionSafety(step, required.name, invalidSteps);
      if (position <= previous)
        invalidSteps.push(
          'strict validation must precede delta-header regression tests',
        );
      previous = position;
    }
  }
  if (invalidSteps.length > 0)
    errors.push(
      issue(
        'workflow-job-condition-invalid',
        contract.id + ': ' + invalidSteps.join(', '),
        {
          id: contract.id,
          jobId: contract.jobId,
          invalidSteps,
        },
      ),
    );
}

/**
 * Validate executable fields in ONE parsed job instead of the whole
 * workflow. The same token present in a different job, or in a comment,
 * does not satisfy a job-scoped contract — that is the entire point:
 * the gate has to live in the job that is wired into the aggregator.
 */
export function parseWorkflowJobs(workflow, errors) {
  try {
    const document = parseYaml(workflow);
    if (
      !document ||
      typeof document !== 'object' ||
      !document.jobs ||
      typeof document.jobs !== 'object'
    ) {
      throw new Error('workflow has no jobs mapping');
    }
    const workflowShell = runShellFromDefaults(document.defaults);
    if (isUnsafeRunShell(workflowShell)) {
      errors.push(
        issue(
          'workflow-run-shell-unsafe',
          'workflow defaults.run.shell must be absent or literal bash; ' +
            JSON.stringify(workflowShell) +
            ' would not execute required run scripts.',
          { shell: workflowShell },
        ),
      );
    }
    return document.jobs;
  } catch (error) {
    errors.push(
      issue(
        'workflow-yaml-invalid',
        'Pull-request workflow could not be parsed: ' +
          (error instanceof Error ? error.message : String(error)),
      ),
    );
    return {};
  }
}

export function validateJobTokens(workflowJobs, contract, errors) {
  const job = workflowJobs?.[contract.jobId];
  if (!job || typeof job !== 'object') {
    errors.push(
      issue(
        'workflow-job-missing',
        contract.id +
          ' requires job ' +
          contract.jobId +
          ', which the workflow does not define.',
        { id: contract.id, jobId: contract.jobId },
      ),
    );
    return {
      id: contract.id,
      jobId: contract.jobId,
      tokenCount: contract.requiredRuns.length + 2,
      present: false,
    };
  }
  const missing = [];
  const invalidSteps = [];
  const needs = Array.isArray(job.needs)
    ? job.needs
    : job.needs
      ? [job.needs]
      : [];
  if (job.name !== contract.jobName) missing.push('name: ' + contract.jobName);
  for (const requiredNeed of contract.requiredNeeds) {
    if (!needs.includes(requiredNeed)) missing.push('needs: ' + requiredNeed);
  }
  if (job.if !== undefined)
    invalidSteps.push(
      'job-level if is forbidden: the aggregator requires this job to run',
    );
  validateExecutionSafety(job, 'job-level', invalidSteps);
  const timeoutMinutes = contract.timeoutMinutes ?? 20;
  if (job['timeout-minutes'] !== timeoutMinutes)
    invalidSteps.push('job timeout must be ' + timeoutMinutes + ' minutes');
  if (contract.matrixShards) {
    // Dropping a shard from the matrix would silently skip that shard's
    // slice of every spec, so the shard list is part of the contract. An
    // include/exclude override (or any other key) could drop or add legs.
    const matrix = job.strategy?.matrix;
    if (
      JSON.stringify(Object.keys(matrix ?? {})) !== '["shard"]' ||
      JSON.stringify(matrix.shard) !== JSON.stringify(contract.matrixShards)
    )
      invalidSteps.push(
        'matrix shards must be ' + JSON.stringify(contract.matrixShards),
      );
  }
  const steps = Array.isArray(job.steps) ? job.steps : [];
  const skipStep = steps.find(
    (step) => step?.name === 'Skip (no code or e2e changes)',
  );
  if (!skipStep || skipStep.if !== contract.skipIf)
    invalidSteps.push('skip step must use the no-change condition');

  const setupStep = steps.find(
    (step) => step?.uses === contract.setupAction.uses,
  );
  if (!setupStep) missing.push('uses: ' + contract.setupAction.uses);
  const requiredFetchAssets = contract.setupAction.with?.['fetch-assets'];
  if (
    requiredFetchAssets !== undefined &&
    setupStep?.with?.['fetch-assets'] !== requiredFetchAssets
  )
    missing.push("fetch-assets: 'true'");

  for (const requiredRun of contract.requiredRuns) {
    const matching = steps.filter((step) => step?.run === requiredRun.run);
    if (matching.length === 0) {
      missing.push('run: ' + requiredRun.run);
      continue;
    }
    const step = matching[0];
    if (step.if !== contract.changeGateIf)
      invalidSteps.push(
        requiredRun.id + ' must use the code/e2e change condition',
      );
    for (const [key, expected] of Object.entries(requiredRun.env ?? {})) {
      if (step.env?.[key] !== expected)
        invalidSteps.push(requiredRun.id + ' must set ' + key + '=' + expected);
    }
    validateExecutionSafety(step, requiredRun.id, invalidSteps);
  }

  // A job without uploadFailureIf (the E2E build) carries no failure report.
  const requiresUpload = contract.uploadFailureIf !== undefined;
  const uploadStep = requiresUpload
    ? steps.find((step) => step?.name === 'Upload Playwright report')
    : undefined;
  if (
    requiresUpload &&
    (!uploadStep || uploadStep.if !== contract.uploadFailureIf)
  )
    invalidSteps.push(
      'upload step must use failure() and the code/e2e condition',
    );

  // Named steps that run under a wider condition than the change gate (a
  // second suite that still runs after the first fails, an always-upload).
  const extraStepIfs = contract.extraStepIfs ?? {};
  for (const step of steps) {
    const name = step?.name ?? 'unnamed step';
    validateExecutionSafety(step, name, invalidSteps);
    let expectedCondition = contract.changeGateIf;
    if (step === skipStep) expectedCondition = contract.skipIf;
    else if (step === uploadStep) expectedCondition = contract.uploadFailureIf;
    else if (Object.hasOwn(extraStepIfs, name))
      expectedCondition = extraStepIfs[name];
    else if (step?.run === 'npx playwright install --with-deps chromium')
      expectedCondition =
        '(' +
        contract.changeGateIf +
        ") && steps.playwright-cache.outputs.cache-hit != 'true'";
    else if (step?.run === 'npx playwright install-deps chromium')
      expectedCondition =
        '(' +
        contract.changeGateIf +
        ") && steps.playwright-cache.outputs.cache-hit == 'true'";
    if (step?.if !== expectedCondition)
      invalidSteps.push(name + ' must use its exact code/e2e condition');
  }
  const runPositions = contract.requiredRuns.map((required) =>
    steps.findIndex((step) => step?.run === required.run),
  );
  const setupPosition = steps.indexOf(setupStep);
  if (
    setupPosition < 0 ||
    runPositions.some(
      (position, index) =>
        position <= (index === 0 ? setupPosition : runPositions[index - 1]),
    )
  ) {
    invalidSteps.push(
      'asset setup, strict validation, production build, and browser run must execute in order',
    );
  }
  const uploadPaths = String(uploadStep?.with?.path ?? '').split(/\s+/);
  if (
    requiresUpload &&
    (uploadStep?.uses !== 'actions/upload-artifact@v7' ||
      uploadStep?.with?.['retention-days'] !== 7 ||
      (contract.uploadPaths ?? ['test-results', 'playwright-report']).some(
        (required) => !uploadPaths.includes(required),
      ))
  ) {
    invalidSteps.push(
      'failure artifact upload must retain report and test-results for 7 days',
    );
  }

  if (missing.length > 0)
    errors.push(
      issue(
        'workflow-job-token-missing',
        contract.id +
          ' job ' +
          contract.jobId +
          ' is missing ' +
          missing.join(', '),
        { id: contract.id, jobId: contract.jobId, missing },
      ),
    );
  if (invalidSteps.length > 0)
    errors.push(
      issue(
        'workflow-job-condition-invalid',
        contract.id +
          ' job ' +
          contract.jobId +
          ' has invalid step or failure-propagation conditions: ' +
          invalidSteps.join(', '),
        { id: contract.id, jobId: contract.jobId, invalidSteps },
      ),
    );

  return {
    id: contract.id,
    jobId: contract.jobId,
    tokenCount: contract.requiredRuns.length + 2,
    present: true,
  };
}
