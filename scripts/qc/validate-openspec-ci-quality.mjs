#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  requiredAggregatorNeeds,
  requiredPackageScripts,
  requiredProtectedContexts,
  requiredWorkflowJobContracts,
  requiredWorkflowTokens,
} from './openspec-ci-contracts.mjs';
import {
  parseWorkflowJobs,
  validateJobTokens,
} from './openspec-workflow-contracts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const workflowPath =
  process.env.MEKSTATION_PR_WORKFLOW_PATH ??
  path.join(repoRoot, '.github', 'workflows', 'pr-checks.yml');
const branchProtectionPath =
  process.env.MEKSTATION_BRANCH_PROTECTION_PATH ??
  path.join(repoRoot, '.github', 'scripts', 'setup-branch-protection.sh');
const packageJsonPath =
  process.env.MEKSTATION_PACKAGE_JSON_PATH ??
  path.join(repoRoot, 'package.json');
const openspecChangesPath =
  process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
  path.join(repoRoot, 'openspec', 'changes');
const activeOpenSpecLedgerPath =
  process.env.MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH ??
  path.join(repoRoot, 'openspec', 'active-change-ledger.json');

function parseArgs(argv) {
  return { json: argv.includes('--json') };
}

function issue(code, message, details = {}) {
  return { code, message, ...details };
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function activeOpenSpecChanges(changesDir) {
  if (!fs.existsSync(changesDir)) return [];
  return fs
    .readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort();
}

function accountedActiveOpenSpecChanges(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return [];
  const ledger = readJson(ledgerPath);
  const entries = Array.isArray(ledger.allowedActiveChanges)
    ? ledger.allowedActiveChanges
    : [];
  return entries
    .filter((entry) => typeof entry?.name === 'string')
    .map((entry) => ({
      name: entry.name,
      status: typeof entry.status === 'string' ? entry.status : 'unknown',
      reason: typeof entry.reason === 'string' ? entry.reason : '',
      lastReviewed:
        typeof entry.lastReviewed === 'string' ? entry.lastReviewed : '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function validateTokens(text, contract, errors, kind) {
  const missing = contract.tokens.filter((token) => !text.includes(token));
  if (missing.length > 0) {
    errors.push(
      issue(
        `${kind}-token-missing`,
        `${contract.id} is missing ${missing.join(', ')}`,
        { id: contract.id, missing },
      ),
    );
  }
  return { id: contract.id, tokenCount: contract.tokens.length };
}

function validatePackageScript(contract, scripts, errors) {
  const command = scripts[contract.id];
  if (!command) {
    errors.push(
      issue(
        'package-script-missing',
        `Required package script ${contract.id} is missing.`,
        { scriptId: contract.id },
      ),
    );
    return { scriptId: contract.id, tokenCount: contract.tokens.length };
  }

  for (const token of contract.tokens) {
    if (!command.includes(token)) {
      errors.push(
        issue(
          'package-script-token-missing',
          `${contract.id} must include ${token}.`,
          { scriptId: contract.id, token },
        ),
      );
    }
  }

  return { scriptId: contract.id, tokenCount: contract.tokens.length };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workflow = readText(workflowPath);
  const branchProtection = readText(branchProtectionPath);
  const packageJson = readJson(packageJsonPath);
  const errors = [];
  const workflowJobs = parseWorkflowJobs(workflow, errors);

  const workflowContracts = requiredWorkflowTokens.map((contract) =>
    validateTokens(workflow, contract, errors, 'workflow'),
  );
  const workflowJobContracts = requiredWorkflowJobContracts.map((contract) =>
    validateJobTokens(workflowJobs, contract, errors),
  );

  const rawAggregatorNeeds = workflowJobs['lint-and-test']?.needs;
  const aggregatorNeeds = Array.isArray(rawAggregatorNeeds)
    ? rawAggregatorNeeds
    : typeof rawAggregatorNeeds === 'string'
      ? [rawAggregatorNeeds]
      : [];
  for (const jobId of requiredAggregatorNeeds) {
    if (!aggregatorNeeds.includes(jobId)) {
      errors.push(
        issue(
          'aggregator-need-missing',
          `Lint and Test aggregator must require ${jobId}.`,
          { jobId },
        ),
      );
    }
  }

  for (const context of requiredProtectedContexts) {
    if (!branchProtection.includes(`"${context}"`)) {
      errors.push(
        issue(
          'branch-protection-context-missing',
          `Branch protection script must require ${context}.`,
          { context },
        ),
      );
    }
  }

  const packageScripts = requiredPackageScripts.map((contract) =>
    validatePackageScript(contract, packageJson.scripts ?? {}, errors),
  );

  const activeChanges = activeOpenSpecChanges(openspecChangesPath);
  const accountedActiveChanges = accountedActiveOpenSpecChanges(
    activeOpenSpecLedgerPath,
  );
  const accountedActiveChangeNames = new Set(
    accountedActiveChanges.map((entry) => entry.name),
  );
  const unaccountedActiveChanges = activeChanges.filter(
    (change) => !accountedActiveChangeNames.has(change),
  );
  const staleAccountedActiveChanges = accountedActiveChanges
    .map((entry) => entry.name)
    .filter((change) => !activeChanges.includes(change));

  if (unaccountedActiveChanges.length > 0) {
    errors.push(
      issue(
        'active-openspec-changes-present',
        `OpenSpec changes must be archived or explicitly accounted before release signoff: ${unaccountedActiveChanges.join(', ')}`,
        { activeChanges, unaccountedActiveChanges },
      ),
    );
  }
  if (staleAccountedActiveChanges.length > 0) {
    errors.push(
      issue(
        'stale-active-openspec-ledger-entry',
        `OpenSpec active-change ledger contains archived or missing changes: ${staleAccountedActiveChanges.join(', ')}`,
        { staleAccountedActiveChanges },
      ),
    );
  }

  const manifest = {
    status: errors.length === 0 ? 'pass' : 'fail',
    workflowPath: path.relative(repoRoot, workflowPath),
    branchProtectionPath: path.relative(repoRoot, branchProtectionPath),
    activeOpenSpecLedgerPath: path.relative(repoRoot, activeOpenSpecLedgerPath),
    workflowContracts,
    workflowJobContracts,
    aggregatorNeeds: {
      expected: requiredAggregatorNeeds,
      actual: aggregatorNeeds,
    },
    protectedContexts: requiredProtectedContexts,
    packageScripts,
    activeOpenSpecChanges: activeChanges,
    accountedActiveOpenSpecChanges: accountedActiveChanges,
    unaccountedActiveOpenSpecChanges: unaccountedActiveChanges,
    errors,
  };

  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(
      `[qc:openspec-ci] workflowContracts=${workflowContracts.length}/${requiredWorkflowTokens.length} workflowJobContracts=${workflowJobContracts.length}/${requiredWorkflowJobContracts.length} aggregatorNeeds=${aggregatorNeeds.length}/${requiredAggregatorNeeds.length} protectedContexts=${requiredProtectedContexts.length} packageScripts=${packageScripts.length}/${requiredPackageScripts.length} activeOpenSpecChanges=${activeChanges.length} accountedActiveOpenSpecChanges=${accountedActiveChanges.length} errors=${errors.length}`,
    );
    for (const entry of errors) {
      console.log(`ERROR ${entry.code}: ${entry.message}`);
    }
  }

  process.exit(errors.length === 0 ? 0 : 1);
}

main();
