#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = process.env.MEKSTATION_PACKAGE_JSON_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_PACKAGE_JSON_PATH)
  : path.join(repoRoot, 'package.json');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const slices = [
  {
    id: 'combat-command',
    title: 'Combat command',
    packageScript: 'qc:command:combat:quick',
    description:
      'Tactical map/dock command preview, invalid reason, GM tactical entry, and commit parity.',
    anchors: [
      'src/components/gameplay/__tests__/GameplayLayout.tacticalProjectionFrame.test.tsx',
      'src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.02.test.tsx',
      'src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts',
    ],
    command: `${npmCommand} test -- --watchAll=false --runTestsByPath src/components/gameplay/__tests__/GameplayLayout.tacticalProjectionFrame.test.tsx src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.02.test.tsx src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts --runInBand`,
  },
  {
    id: 'readiness-stable',
    title: 'Mission readiness and Mek stable',
    packageScript: 'qc:command:readiness-stable:quick',
    description:
      'Roster eligibility, selected launch roster, blocked materialization, and Mek stable blocker-to-fix projection.',
    anchors: [
      'src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts',
      'src/__tests__/pages/gameplay/campaigns/mission-launch.coop.test.tsx',
      'src/components/campaign/bays/__tests__/MechBay.test.tsx',
      'src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts',
    ],
    command: `${npmCommand} test -- --watchAll=false --runTestsByPath src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts src/__tests__/pages/gameplay/campaigns/mission-launch.coop.test.tsx src/components/campaign/bays/__tests__/MechBay.test.tsx src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts --runInBand`,
  },
  {
    id: 'customizer-handoff',
    title: 'Campaign customizer handoff',
    packageScript: 'qc:command:customizer-handoff:quick',
    description:
      'Campaign-origin editor route state, isolated editor unit, save/cancel command bar, and return context.',
    anchors: [
      'src/lib/campaign/customizer/__tests__/campaignCustomizerRoute.test.ts',
      'src/lib/campaign/customizer/__tests__/campaignCustomizerSession.test.ts',
      'src/components/customizer/campaign/__tests__/CampaignRefitCommandBar.test.tsx',
      'src/hooks/__tests__/useCustomizerRouter.test.ts',
    ],
    command: `${npmCommand} test -- --watchAll=false --runTestsByPath src/lib/campaign/customizer/__tests__/campaignCustomizerRoute.test.ts src/lib/campaign/customizer/__tests__/campaignCustomizerSession.test.ts src/components/customizer/campaign/__tests__/CampaignRefitCommandBar.test.tsx src/hooks/__tests__/useCustomizerRouter.test.ts --runInBand`,
  },
  {
    id: 'starmap-logistics',
    title: 'Campaign starmap logistics',
    packageScript: 'qc:command:starmap-logistics:quick',
    description:
      'Route preview, costs, time cascade, activity/finance commit, persistence refs, and blocked travel.',
    anchors: [
      'src/lib/starmap/__tests__/starmapTravelPreview.test.ts',
      'src/stores/campaign/__tests__/useCampaignStore.travelToSystem.test.ts',
    ],
    command: `${npmCommand} test -- --watchAll=false --runTestsByPath src/lib/starmap/__tests__/starmapTravelPreview.test.ts src/stores/campaign/__tests__/useCampaignStore.travelToSystem.test.ts --runInBand`,
  },
  {
    id: 'gm-redaction',
    title: 'GM redaction and authority',
    packageScript: 'qc:command:gm-redaction:quick',
    description:
      'GM cascade preview/commit, action ledger public projection, multiplayer public replay, and private-rationale redaction.',
    anchors: [
      'src/lib/interventions/__tests__/ActionLedger.test.ts',
      'src/lib/interventions/__tests__/GmCascadePreviewPipeline.test.ts',
      'src/lib/multiplayer/server/__tests__/ServerMatchHostCommandResults.test.ts',
      'src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.test.tsx',
      'src/components/multiplayer/__tests__/NetworkedGameSurface.test.tsx',
    ],
    command: `${npmCommand} test -- --watchAll=false --runTestsByPath src/lib/interventions/__tests__/ActionLedger.test.ts src/lib/interventions/__tests__/GmCascadePreviewPipeline.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHostCommandResults.test.ts src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.test.tsx src/components/multiplayer/__tests__/NetworkedGameSurface.test.tsx --runInBand`,
  },
  {
    id: 'long-campaign-drift',
    title: 'Long campaign drift',
    packageScript: 'qc:command:long-campaign-drift:quick',
    description:
      'Long campaign QC manifest plus deterministic two-run artifact drift check.',
    anchors: [
      'scripts/qc/validate-long-campaign-qc.mjs',
      'scripts/qc/validate-long-campaign-stability.mjs',
      'scripts/__tests__/long-campaign-qc.test.ts',
      'scripts/__tests__/journey-qc.test.ts',
    ],
    command: (options) => [
      `${npmCommand} run qc:campaign-long:validate`,
      `${npmCommand} run qc:campaign-long:stability -- --seed=${options.seed} --contracts=${options.contracts} --runs=${options.runs}`,
    ],
  },
];

const requiredAggregateScripts = [
  {
    id: 'qc:command-slices:validate',
    tokens: ['validate-playable-command-screen-slices.mjs'],
  },
  {
    id: 'qc:command-slices',
    tokens: ['validate-playable-command-screen-slices.mjs', '--run'],
  },
];

function parseArgs(argv) {
  const options = {
    contracts: 10,
    dryRun: false,
    json: false,
    list: false,
    run: false,
    runs: 2,
    seed: 42,
    sliceIds: [],
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--list') {
      options.list = true;
      continue;
    }
    if (arg === '--run') {
      options.run = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'slice') {
      options.sliceIds.push(...value.split(',').filter(Boolean));
    }
    if (key === 'contracts') {
      options.contracts = Number.parseInt(value, 10);
    }
    if (key === 'runs') {
      options.runs = Number.parseInt(value, 10);
    }
    if (key === 'seed') {
      options.seed = Number.parseInt(value, 10);
    }
  }

  return options;
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function commandStepsFor(slice, options) {
  const command =
    typeof slice.command === 'function'
      ? slice.command(options)
      : slice.command;
  return Array.isArray(command) ? command : [command];
}

function commandFor(slice, options) {
  return commandStepsFor(slice, options).join(' && ');
}

function loadPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function validateIntegerOption(name, value, minimum, maximum, issues) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    issues.push(
      issue(
        'error',
        'option-out-of-range',
        `--${name} must be an integer between ${minimum} and ${maximum}.`,
        { option: name, value, minimum, maximum },
      ),
    );
  }
}

function validatePackageScripts(packageJson, issues) {
  const scripts = packageJson.scripts ?? {};
  for (const contract of requiredAggregateScripts) {
    const script = scripts[contract.id];
    if (typeof script !== 'string') {
      issues.push(
        issue(
          'error',
          'package-script-missing',
          `package.json must define ${contract.id}.`,
          { scriptId: contract.id },
        ),
      );
      continue;
    }
    for (const token of contract.tokens) {
      if (!script.includes(token)) {
        issues.push(
          issue(
            'error',
            'package-script-token-missing',
            `${contract.id} must include ${token}.`,
            { scriptId: contract.id, token },
          ),
        );
      }
    }
  }

  for (const slice of slices) {
    const script = scripts[slice.packageScript];
    if (typeof script !== 'string') {
      issues.push(
        issue(
          'error',
          'slice-package-script-missing',
          `package.json must define ${slice.packageScript}.`,
          { sliceId: slice.id, scriptId: slice.packageScript },
        ),
      );
      continue;
    }
    for (const token of [
      'validate-playable-command-screen-slices.mjs',
      '--run',
      `--slice=${slice.id}`,
    ]) {
      if (!script.includes(token)) {
        issues.push(
          issue(
            'error',
            'slice-package-script-token-missing',
            `${slice.packageScript} must include ${token}.`,
            { sliceId: slice.id, scriptId: slice.packageScript, token },
          ),
        );
      }
    }
  }
}

function validateAnchors(issues) {
  for (const slice of slices) {
    for (const anchor of slice.anchors) {
      if (!fs.existsSync(path.join(repoRoot, anchor))) {
        issues.push(
          issue(
            'error',
            'slice-anchor-missing',
            `${slice.id} anchor is missing: ${anchor}`,
            { sliceId: slice.id, anchor },
          ),
        );
      }
    }
  }
}

function selectedSlices(options, issues) {
  if (options.sliceIds.length === 0) return slices;
  const byId = new Map(slices.map((slice) => [slice.id, slice]));
  const selected = [];
  for (const sliceId of options.sliceIds) {
    const slice = byId.get(sliceId);
    if (!slice) {
      issues.push(
        issue(
          'error',
          'unknown-slice',
          `Unknown playable command slice ${sliceId}.`,
          {
            sliceId,
          },
        ),
      );
      continue;
    }
    selected.push(slice);
  }
  return selected;
}

function buildManifest(options) {
  const issues = [];
  validateIntegerOption(
    'seed',
    options.seed,
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  validateIntegerOption('contracts', options.contracts, 6, 10, issues);
  validateIntegerOption('runs', options.runs, 2, 10, issues);
  validatePackageScripts(loadPackageJson(), issues);
  validateAnchors(issues);
  const selected = selectedSlices(options, issues);
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    packageJsonPath: path
      .relative(repoRoot, packageJsonPath)
      .replaceAll('\\', '/'),
    selectedSliceIds: selected.map((slice) => slice.id),
    options: {
      contracts: options.contracts,
      dryRun: options.dryRun,
      run: options.run,
      runs: options.runs,
      seed: options.seed,
    },
    slices: selected.map((slice) => ({
      id: slice.id,
      title: slice.title,
      packageScript: slice.packageScript,
      description: slice.description,
      anchors: slice.anchors,
      command: commandFor(slice, options),
      commands: commandStepsFor(slice, options),
    })),
    errors,
    warnings,
    issues,
  };
}

function printSummary(manifest) {
  for (const item of manifest.issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
  console.log(
    `[qc:command-slices] slices=${manifest.slices.length}/${slices.length} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
  if (manifest.errors.length > 0) return;
  for (const slice of manifest.slices) {
    console.log(`- ${slice.id}: ${slice.command}`);
  }
}

function runSliceCommand(slice, options) {
  const commands = commandStepsFor(slice, options);
  console.log(`\n[qc:command-slices] ${slice.id}: ${commands.join(' && ')}`);
  if (options.dryRun) return 0;
  for (const command of commands) {
    const result = spawnSync(command, {
      cwd: repoRoot,
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });
    if (result.error) {
      console.error(result.error.message);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

const options = parseArgs(process.argv.slice(2));
const manifest = buildManifest(options);

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printSummary(manifest);
}

if (manifest.errors.length > 0 || options.list || !options.run) {
  process.exit(manifest.errors.length > 0 ? 1 : 0);
}

let failed = 0;
for (const slice of slices.filter((slice) =>
  manifest.selectedSliceIds.includes(slice.id),
)) {
  const status = runSliceCommand(slice, options);
  if (status !== 0) failed += 1;
}

process.exit(failed === 0 ? 0 : 1);
