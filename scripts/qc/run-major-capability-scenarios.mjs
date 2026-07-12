#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const catalogPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-major-capability-scenarios.json',
);
const registryPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-qc-registry.json',
);

const tierRank = {
  core: 0,
  standard: 1,
  extended: 2,
  diagnostic: 3,
};

function parseArgs(argv) {
  const options = {
    continueOnError: false,
    dryRun: false,
    evidence: true,
    evidenceDir: null,
    lens: null,
    maxOutputChars: 12000,
    scenarioIds: [],
    surface: null,
    tier: 'standard',
    validateOnly: false,
  };
  const booleanFlagHandlers = new Map([
    ['--continue-on-error', () => { options.continueOnError = true; }],
    ['--dry-run', () => { options.dryRun = true; }],
    ['--list', () => { options.dryRun = true; }],
    ['--no-evidence', () => { options.evidence = false; }],
    ['--validate-only', () => { options.validateOnly = true; }],
  ]);
  const valueHandlers = new Map([
    ['scenario', (value) => {
      options.scenarioIds.push(
        ...value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }],
    ['surface', (value) => { options.surface = value.toLowerCase(); }],
    ['lens', (value) => { options.lens = value.toLowerCase(); }],
    ['tier', (value) => { options.tier = value.toLowerCase(); }],
    ['evidence-dir', (value) => { options.evidenceDir = value; }],
    ['max-output-chars', (value) => {
      options.maxOutputChars = Number.parseInt(value, 10);
    }],
  ]);

  for (const arg of argv) {
    const booleanHandler = booleanFlagHandlers.get(arg);
    if (booleanHandler) {
      booleanHandler();
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim();
    valueHandlers.get(key)?.(value);
  }

  return options;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function pathLike(value) {
  return /^(docs|src|scripts|e2e|openspec|desktop|package\.json)(\/|\\|$)/.test(
    value,
  );
}

function repoReferenceExists(reference) {
  return fs.existsSync(path.resolve(repoRoot, reference));
}

function includesTier(checkTier, selectedTier) {
  if (selectedTier === 'all') return true;
  if (selectedTier === 'diagnostic') return checkTier === 'diagnostic';
  if (!Object.hasOwn(tierRank, selectedTier)) return false;
  if (checkTier === 'diagnostic') return false;
  return tierRank[checkTier] <= tierRank[selectedTier];
}

function addCatalogIssue(issues, errors, severity, message) {
  const issue = { severity, message };
  issues.push(issue);
  if (severity === 'error') errors.push(issue);
}

function validateScenarioCheck(check, checkIndex, label, issues, errors) {
  const checkLabel = `${label}.checks[${checkIndex}]`;
  if (typeof check.id !== 'string' || check.id.trim() === '') {
    addCatalogIssue(issues, errors, 'error', `${checkLabel}: id must be a non-empty string.`);
  }
  if (!Object.hasOwn(tierRank, check.tier)) {
    addCatalogIssue(
      issues,
      errors,
      'error',
      `${checkLabel}: tier must be one of ${Object.keys(tierRank).join(', ')}.`,
    );
  }
  if (typeof check.command !== 'string' || check.command.trim() === '') {
    addCatalogIssue(issues, errors, 'error', `${checkLabel}: command must be a non-empty string.`);
  }
  if (!Array.isArray(check.evidence) || check.evidence.length === 0) {
    addCatalogIssue(
      issues,
      errors,
      'warning',
      `${checkLabel}: evidence should contain at least one repo reference.`,
    );
    return;
  }
  for (const [evidenceIndex, reference] of check.evidence.entries()) {
    if (typeof reference !== 'string' || reference.trim() === '') {
      addCatalogIssue(
        issues,
        errors,
        'error',
        `${checkLabel}: evidence[${evidenceIndex}] must be a non-empty string.`,
      );
    } else if (pathLike(reference) && !repoReferenceExists(reference)) {
      addCatalogIssue(
        issues,
        errors,
        'error',
        `${checkLabel}: evidence[${evidenceIndex}] does not resolve in repo: ${reference}`,
      );
    }
  }
}

function validateScenarioChecks(scenario, label, defaultTier, issues, errors) {
  if (!Array.isArray(scenario.checks) || scenario.checks.length === 0) {
    addCatalogIssue(issues, errors, 'error', `${label}: checks must contain at least one item.`);
    return;
  }
  const requiredChecks = scenario.checks.filter((check) => check.required !== false);
  if (requiredChecks.length === 0) {
    addCatalogIssue(issues, errors, 'error', `${label}: at least one check must be required.`);
  }
  if (!scenario.checks.some((check) => check.tier === 'core')) {
    addCatalogIssue(issues, errors, 'error', `${label}: at least one check must use the core tier.`);
  }
  if (!scenario.checks.some((check) => includesTier(check.tier, defaultTier))) {
    addCatalogIssue(issues, errors, 'error', `${label}: at least one check must run in the default tier.`);
  }
  const checkIds = new Set();
  for (const [checkIndex, check] of scenario.checks.entries()) {
    const checkLabel = `${label}.checks[${checkIndex}]`;
    if (typeof check.id === 'string' && checkIds.has(check.id)) {
      addCatalogIssue(issues, errors, 'error', `${checkLabel}: duplicate check id ${check.id}.`);
    }
    checkIds.add(check.id);
    validateScenarioCheck(check, checkIndex, label, issues, errors);
  }
}

function validateScenarioDefinition(scenario, index, context, issues, errors) {
  const label = scenario.id || `scenario[${index}]`;
  if (typeof scenario.id !== 'string' || scenario.id.trim() === '') {
    addCatalogIssue(issues, errors, 'error', `${label}: id must be a non-empty string.`);
  } else if (context.scenarioIds.has(scenario.id)) {
    addCatalogIssue(issues, errors, 'error', `${label}: duplicate scenario id.`);
  }
  context.scenarioIds.add(scenario.id);
  if (typeof scenario.surfaceId !== 'string' || scenario.surfaceId.trim() === '') {
    addCatalogIssue(issues, errors, 'error', `${label}: surfaceId must be a non-empty string.`);
  } else if (!context.registrySurfaces.has(scenario.surfaceId)) {
    addCatalogIssue(issues, errors, 'error', `${label}: surfaceId ${scenario.surfaceId} is not in QC registry.`);
  }
  context.scenarioSurfaceIds.add(scenario.surfaceId);
  if (!context.topSurfaceIds.includes(scenario.surfaceId)) {
    addCatalogIssue(issues, errors, 'error', `${label}: surfaceId ${scenario.surfaceId} is not a top-level QC surface.`);
  }
  for (const field of ['title', 'realisticFlow']) {
    if (typeof scenario[field] !== 'string' || scenario[field].trim() === '') {
      addCatalogIssue(issues, errors, 'error', `${label}: ${field} must be a non-empty string.`);
    }
  }
  if (!Array.isArray(scenario.successCriteria) || scenario.successCriteria.length === 0) {
    addCatalogIssue(issues, errors, 'error', `${label}: successCriteria must contain at least one item.`);
  }
  validateScenarioChecks(scenario, label, context.defaultTier, issues, errors);
}

function validateCatalog(catalog, registry) {
  const issues = [];
  const errors = [];

  if (catalog.version !== 1) {
    addCatalogIssue(issues, errors, 'error', 'Scenario catalog version must be 1.');
  }
  if (!Array.isArray(catalog.scenarios) || catalog.scenarios.length === 0) {
    addCatalogIssue(issues, errors, 'error', 'Scenario catalog must contain at least one scenario.');
    return { issues, errors };
  }
  if (!catalog.evaluationMethod?.result) {
    addCatalogIssue(issues, errors, 'error', 'Scenario catalog must declare evaluationMethod.result.');
  }
  if (!Array.isArray(catalog.evaluationMethod?.passCriteria)) {
    addCatalogIssue(issues, errors, 'error', 'Scenario catalog must declare evaluationMethod.passCriteria.');
  }
  if (!Array.isArray(catalog.evaluationMethod?.sameConditions)) {
    addCatalogIssue(issues, errors, 'error', 'Scenario catalog must declare evaluationMethod.sameConditions.');
  }

  const registrySurfaces = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const selectedLevel = catalog.majorCapabilitySelector?.level ?? 'top';
  const topSurfaceIds = registry.surfaces
    .filter((surface) => surface.level === selectedLevel)
    .map((surface) => surface.surfaceId);
  const scenarioIds = new Set();
  const scenarioSurfaceIds = new Set();

  if (catalog.scenarioCount !== catalog.scenarios.length) {
    addCatalogIssue(issues, errors, 'error',
      `scenarioCount ${catalog.scenarioCount} does not match ${catalog.scenarios.length} scenarios.`,
    );
  }
  if (catalog.scenarios.length !== topSurfaceIds.length) {
    addCatalogIssue(issues, errors, 'error',
      `Scenario count ${catalog.scenarios.length} does not match ${selectedLevel} registry surface count ${topSurfaceIds.length}.`,
    );
  }

  for (const [index, scenario] of catalog.scenarios.entries()) {
    validateScenarioDefinition(
      scenario,
      index,
      {
        defaultTier: catalog.evaluationMethod?.defaultTier ?? 'standard',
        registrySurfaces,
        scenarioIds,
        scenarioSurfaceIds,
        topSurfaceIds,
      },
      issues,
      errors,
    );
  }

  for (const surfaceId of topSurfaceIds) {
    if (!scenarioSurfaceIds.has(surfaceId)) {
      addCatalogIssue(issues, errors, 'error', `Missing scenario for top-level QC surface ${surfaceId}.`);
    }
  }

  return { issues, errors };
}

function selectScenarios(catalog, options) {
  return catalog.scenarios.filter((scenario) => {
    if (
      options.scenarioIds.length > 0 &&
      !options.scenarioIds.includes(scenario.id)
    ) {
      return false;
    }
    if (
      options.surface &&
      !scenario.surfaceId.toLowerCase().includes(options.surface)
    ) {
      return false;
    }
    if (
      options.lens &&
      !scenario.qualityLenses.some((lens) =>
        String(lens).toLowerCase().includes(options.lens),
      )
    ) {
      return false;
    }
    return true;
  });
}

function truncateOutput(text, maxChars) {
  if (!text || text.length <= maxChars) return text ?? '';

  const headLength = Math.floor(maxChars / 2);
  const tailLength = maxChars - headLength;
  const omitted = text.length - maxChars;
  return [
    text.slice(0, headLength),
    `\n[truncated ${omitted} chars]\n`,
    text.slice(text.length - tailLength),
  ].join('');
}

function runCommand(check, options) {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  if (options.dryRun) {
    return {
      checkId: check.id,
      command: check.command,
      durationMs: 0,
      exitCode: 0,
      required: check.required !== false,
      startedAt,
      status: 'dry-run',
      stderr: '',
      stdout: '',
      tier: check.tier,
    };
  }

  const result = spawnSync(check.command, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });
  const exitCode = result.error ? 1 : (result.status ?? 1);

  return {
    checkId: check.id,
    command: check.command,
    durationMs: Date.now() - start,
    error: result.error?.message,
    exitCode,
    required: check.required !== false,
    startedAt,
    status: exitCode === 0 ? 'pass' : 'fail',
    stderr: truncateOutput(result.stderr, options.maxOutputChars),
    stdout: truncateOutput(result.stdout, options.maxOutputChars),
    tier: check.tier,
  };
}

function writeEvidence(evidence, evidenceDirOption) {
  const evidenceDir = path.resolve(
    repoRoot,
    evidenceDirOption ?? evidence.evaluationMethod.evidenceDir,
  );
  const timestamp = evidence.startedAt
    .replaceAll(':', '-')
    .replaceAll('.', '-');
  const evidencePath = path.join(
    evidenceDir,
    `major-capability-scenarios-${timestamp}.json`,
  );
  const latestPath = path.join(evidenceDir, 'latest.json');

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(evidence, null, 2)}\n`);

  return {
    evidencePath: toRepoRelative(evidencePath),
    latestPath: toRepoRelative(latestPath),
  };
}

function printValidationIssues(issues) {
  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${issue.message}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const catalog = loadJson(catalogPath);
const registry = loadJson(registryPath);
const validation = validateCatalog(catalog, registry);

printValidationIssues(validation.issues);
console.log(
  `[qc:scenarios] catalog: ${catalog.scenarios.length} scenarios, ${validation.errors.length} error(s)`,
);

if (validation.errors.length > 0 || options.validateOnly) {
  process.exit(validation.errors.length > 0 ? 1 : 0);
}

if (options.maxOutputChars < 1000 || Number.isNaN(options.maxOutputChars)) {
  console.error('[qc:scenarios] --max-output-chars must be at least 1000.');
  process.exit(1);
}
if (options.tier !== 'all' && !Object.hasOwn(tierRank, options.tier)) {
  console.error(
    `[qc:scenarios] --tier must be one of all, ${Object.keys(tierRank).join(', ')}`,
  );
  process.exit(1);
}

const selectedScenarios = selectScenarios(catalog, options);
if (selectedScenarios.length === 0) {
  console.error('[qc:scenarios] no scenarios matched the provided filters.');
  process.exit(1);
}

const evidence = {
  version: 1,
  catalog: toRepoRelative(catalogPath),
  dryRun: options.dryRun,
  evaluationMethod: catalog.evaluationMethod,
  filters: {
    lens: options.lens,
    scenarioIds: options.scenarioIds,
    surface: options.surface,
    tier: options.tier,
  },
  registry: toRepoRelative(registryPath),
  scenarios: [],
  startedAt: new Date().toISOString(),
  status: 'pass',
};

let failedRequiredChecks = 0;
let executedChecks = 0;
let stopAfterScenario = false;

for (const scenario of selectedScenarios) {
  const selectedChecks = scenario.checks.filter((check) =>
    includesTier(check.tier, options.tier),
  );

  console.log(`\n[qc:scenarios] ${scenario.id}: ${scenario.title}`);
  console.log(`[qc:scenarios] surface: ${scenario.surfaceId}`);
  console.log(
    `[qc:scenarios] criteria: ${scenario.successCriteria.length}; checks: ${selectedChecks.length}`,
  );

  if (selectedChecks.length === 0) {
    console.error(`[qc:scenarios] no checks selected for ${scenario.id}.`);
    failedRequiredChecks += 1;
    evidence.scenarios.push({
      checks: [],
      id: scenario.id,
      selectedCheckCount: 0,
      status: 'fail',
      surfaceId: scenario.surfaceId,
      title: scenario.title,
    });
    if (!options.continueOnError) {
      stopAfterScenario = true;
      break;
    }
    continue;
  }

  const scenarioEvidence = {
    checks: [],
    id: scenario.id,
    realisticFlow: scenario.realisticFlow,
    selectedCheckCount: selectedChecks.length,
    status: 'pass',
    successCriteria: scenario.successCriteria,
    surfaceId: scenario.surfaceId,
    title: scenario.title,
  };

  for (const check of selectedChecks) {
    console.log(`[qc:scenarios] ${check.id}: ${check.command}`);
    const result = runCommand(check, options);
    executedChecks += 1;
    scenarioEvidence.checks.push(result);

    console.log(
      `[qc:scenarios] ${check.id}: ${result.status} (${result.durationMs}ms, exit ${result.exitCode})`,
    );

    if (result.exitCode !== 0 && result.required) {
      failedRequiredChecks += 1;
      scenarioEvidence.status = 'fail';
      evidence.status = 'fail';
      if (!options.continueOnError) {
        stopAfterScenario = true;
        break;
      }
    }
  }

  evidence.scenarios.push(scenarioEvidence);
  if (stopAfterScenario) break;
}

evidence.completedAt = new Date().toISOString();
evidence.executedChecks = executedChecks;
evidence.failedRequiredChecks = failedRequiredChecks;
evidence.status = failedRequiredChecks > 0 ? 'fail' : 'pass';

if (options.evidence) {
  const paths = writeEvidence(evidence, options.evidenceDir);
  console.log(`\n[qc:scenarios] evidence: ${paths.latestPath}`);
}

console.log(
  `[qc:scenarios] complete: ${evidence.scenarios.length} scenario(s), ${executedChecks} check(s), ${failedRequiredChecks} required failure(s)`,
);

process.exit(failedRequiredChecks > 0 ? 1 : 0);
