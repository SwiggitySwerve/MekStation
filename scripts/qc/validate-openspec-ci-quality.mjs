#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const requiredProtectedContexts = [
  'Lint and Test',
  'Build Test / win',
  'Build Test / mac',
  'Build Test / linux',
];

const requiredAggregatorNeeds = [
  'lint',
  'format-check',
  'typecheck',
  'unit-test-shards',
  'perf-smoke-tests',
  'statistical-proof-pr',
  'perf-budget-pr',
  'coverage-floor',
  'a11y-tests',
  'validate-bv',
  'validate-combat',
  'storybook-build',
  'schema-bridge',
  'determinism-audit',
  'e2e-smoke',
  'desktop-typecheck',
  'desktop-tests',
];

const requiredWorkflowTokens = [
  {
    id: 'openspec-targets-main-prs',
    tokens: ['pull_request:', 'branches:', '- main'],
  },
  {
    id: 'lint-runs-package-script',
    tokens: ['name: Lint', 'run: npm run lint'],
  },
  {
    id: 'format-check-runs-package-script',
    tokens: ['name: Format Check', 'run: npm run format:check'],
  },
  {
    id: 'typecheck-runs-typescript',
    tokens: ['name: Type Check', 'run: npx tsc --noEmit'],
  },
  {
    id: 'schema-bridge-is-strict',
    tokens: [
      'name: Schema Bridge',
      'npm run schema:gen-check',
      'run_schema_validation_only.py --shape all --strict',
      'npx jest src/types/contracts --ci --no-coverage',
    ],
  },
  {
    id: 'combat-and-bv-gates-run',
    tokens: [
      'name: Validate BV Parity',
      'run: npm run validate:bv',
      'name: Validate Combat Suite',
      'run: npm run validate:combat',
    ],
  },
  {
    id: 'browser-smoke-runs-playwright',
    tokens: [
      'name: E2E Smoke',
      'npx playwright test e2e/tactical-map-visual-smoke.spec.ts --project=chromium',
    ],
  },
  {
    id: 'desktop-build-required-platforms',
    tokens: [
      'name: Build Test / ${{ matrix.platform }}',
      'platform: linux',
      'platform: win',
      'platform: mac',
      'npx electron-builder --dir --publish never',
    ],
  },
];

const requiredPackageScripts = [
  {
    id: 'qc:openspec-ci:validate',
    tokens: ['validate-openspec-ci-quality.mjs'],
  },
  {
    id: 'verify:qc',
    tokens: ['qc:openspec-ci:validate', 'qc:validate', 'qc:lifecycle:status'],
  },
  {
    id: 'verify:rules',
    tokens: [
      'validate:combat:gaps',
      '--expect-total=0',
      '--expect-total=147',
      'openspec validate --all --strict',
    ],
  },
];

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

function workflowJobBlock(workflow, jobId) {
  const escapedJobId = jobId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `(?:^|\\n)  ${escapedJobId}:[\\s\\S]*?(?=\\n  [a-zA-Z0-9_-]+:\\n|$)`,
  ).exec(workflow);
  return match?.[0] ?? '';
}

function parseAggregatorNeeds(workflow) {
  const block = workflowJobBlock(workflow, 'lint-and-test');
  const match = /needs:\s*\[\s*([\s\S]*?)\s*\]/m.exec(block);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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

  const workflowContracts = requiredWorkflowTokens.map((contract) =>
    validateTokens(workflow, contract, errors, 'workflow'),
  );

  const aggregatorNeeds = parseAggregatorNeeds(workflow);
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
  if (activeChanges.length > 0) {
    errors.push(
      issue(
        'active-openspec-changes-present',
        `OpenSpec changes must be archived or explicitly accounted before release signoff: ${activeChanges.join(', ')}`,
        { activeChanges },
      ),
    );
  }

  const manifest = {
    status: errors.length === 0 ? 'pass' : 'fail',
    workflowPath: path.relative(repoRoot, workflowPath),
    branchProtectionPath: path.relative(repoRoot, branchProtectionPath),
    workflowContracts,
    aggregatorNeeds: {
      expected: requiredAggregatorNeeds,
      actual: aggregatorNeeds,
    },
    protectedContexts: requiredProtectedContexts,
    packageScripts,
    activeOpenSpecChanges: activeChanges,
    errors,
  };

  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(
      `[qc:openspec-ci] workflowContracts=${workflowContracts.length}/${requiredWorkflowTokens.length} aggregatorNeeds=${aggregatorNeeds.length}/${requiredAggregatorNeeds.length} protectedContexts=${requiredProtectedContexts.length} packageScripts=${packageScripts.length}/${requiredPackageScripts.length} activeOpenSpecChanges=${activeChanges.length} errors=${errors.length}`,
    );
    for (const entry of errors) {
      console.log(`ERROR ${entry.code}: ${entry.message}`);
    }
  }

  process.exit(errors.length === 0 ? 0 : 1);
}

main();
