#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = process.env.MEKSTATION_PACKAGE_JSON_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_PACKAGE_JSON_PATH)
  : path.join(repoRoot, 'package.json');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const evidenceManifestNames = [
  'command-screen-evidence.json',
  'evidence-manifest.json',
];

const evidenceBuildModes = new Set(['development', 'production']);
const evidenceProofModes = new Set(['dev-only', 'production-signoff']);
const evidenceRouteKinds = new Set(['product', 'harness']);

const evidenceScreens = [
  {
    file: '01-starmap-logistics-preview.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '02-starmap-logistics-after-commit.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '03-mission-readiness-roster.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '04-campaign-refit-customizer.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '05-readiness-return-after-refit-save.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '06-gm-ledger-preview.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '07-gm-ledger-approved-public-private.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '08-gm-ledger-guest-redacted.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '09-tactical-command-map-movement.png',
    minBytes: 30_000,
    routeKind: 'product',
  },
  {
    file: '10-networked-host-gm-authority.png',
    minBytes: 30_000,
    routeKind: 'harness',
  },
  {
    file: '11-networked-guest-public-result.png',
    minBytes: 30_000,
    routeKind: 'harness',
  },
];

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
  {
    id: 'qc:command-evidence:validate',
    tokens: [
      'validate-playable-command-screen-slices.mjs',
      '--require-evidence',
      '--evidence-dir=',
    ],
  },
  {
    id: 'qc:command-evidence:capture',
    tokens: [
      'run-playwright.mjs',
      'playable-command-feature-screens.spec.ts',
      '--workers=1',
    ],
  },
  {
    id: 'qc:command-evidence',
    tokens: ['qc:command-evidence:capture', 'qc:command-evidence:validate'],
  },
];

function parseArgs(argv) {
  const options = {
    contracts: 10,
    dryRun: false,
    evidenceDir: process.env.MEKSTATION_COMMAND_SCREEN_EVIDENCE_DIR ?? null,
    json: false,
    list: false,
    requireEvidence:
      process.env.MEKSTATION_COMMAND_SCREEN_REQUIRE_EVIDENCE === 'true',
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
    if (arg === '--require-evidence') {
      options.requireEvidence = true;
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
    if (key === 'evidence-dir') {
      options.evidenceDir = value;
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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
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

function resolveEvidenceDir(value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function findEvidenceManifest(evidenceDir) {
  return evidenceManifestNames
    .map((name) => path.join(evidenceDir, name))
    .find((candidate) => fs.existsSync(candidate));
}

function validateEvidenceManifest(evidenceDir, manifest, manifestPath, issues) {
  if (!Number.isInteger(manifest.schemaVersion)) {
    issues.push(
      issue(
        'error',
        'evidence-manifest-version-missing',
        'Evidence manifest must declare an integer schemaVersion.',
        { manifestPath },
      ),
    );
  }

  if (!evidenceBuildModes.has(manifest.buildMode)) {
    issues.push(
      issue(
        'error',
        'evidence-build-mode-invalid',
        'Evidence manifest buildMode must be development or production.',
        { buildMode: manifest.buildMode, manifestPath },
      ),
    );
  }

  if (!evidenceProofModes.has(manifest.proofMode)) {
    issues.push(
      issue(
        'error',
        'evidence-proof-mode-invalid',
        'Evidence manifest proofMode must be dev-only or production-signoff.',
        { manifestPath, proofMode: manifest.proofMode },
      ),
    );
  }

  if (
    manifest.buildMode === 'development' &&
    manifest.proofMode !== 'dev-only'
  ) {
    issues.push(
      issue(
        'error',
        'evidence-dev-build-not-labeled',
        'Development evidence must be explicitly labeled proofMode=dev-only.',
        { buildMode: manifest.buildMode, manifestPath },
      ),
    );
  }

  const screens = Array.isArray(manifest.screens) ? manifest.screens : [];
  if (!Array.isArray(manifest.screens)) {
    issues.push(
      issue(
        'error',
        'evidence-screens-missing',
        'Evidence manifest must list screens.',
        { manifestPath },
      ),
    );
  }

  const byFile = new Map(
    screens
      .filter((screen) => typeof screen?.file === 'string')
      .map((screen) => [screen.file, screen]),
  );

  for (const expected of evidenceScreens) {
    const entry = byFile.get(expected.file);
    if (!entry) {
      issues.push(
        issue(
          'error',
          'evidence-screen-manifest-entry-missing',
          `Evidence manifest must include ${expected.file}.`,
          { file: expected.file, manifestPath },
        ),
      );
      continue;
    }

    if (!evidenceRouteKinds.has(entry.routeKind)) {
      issues.push(
        issue(
          'error',
          'evidence-route-kind-invalid',
          `${expected.file} routeKind must be product or harness.`,
          { file: expected.file, routeKind: entry.routeKind },
        ),
      );
    }

    if (entry.routeKind !== expected.routeKind) {
      issues.push(
        issue(
          'error',
          'evidence-route-kind-mismatch',
          `${expected.file} must be captured from a ${expected.routeKind} route.`,
          {
            expectedRouteKind: expected.routeKind,
            file: expected.file,
            routeKind: entry.routeKind,
          },
        ),
      );
    }

    if (typeof entry.readyMarker !== 'string' || entry.readyMarker.length < 3) {
      issues.push(
        issue(
          'error',
          'evidence-ready-marker-missing',
          `${expected.file} must declare the hydrated DOM ready marker used before capture.`,
          { file: expected.file },
        ),
      );
    }
  }

  for (const entry of screens) {
    if (typeof entry?.file !== 'string') continue;
    const resolved = path.resolve(evidenceDir, entry.file);
    if (!resolved.startsWith(evidenceDir + path.sep)) {
      issues.push(
        issue(
          'error',
          'evidence-screen-path-escapes-dir',
          `Evidence screen path must stay inside the evidence directory: ${entry.file}`,
          { file: entry.file },
        ),
      );
    }
  }

  validateEvidenceProvenanceReadme(evidenceDir, manifest, screens, issues);
}

/**
 * Human-visible provenance beside the PNGs (re-audit H2/H3): the capture
 * spec generates README.md from the same values the manifest records. A
 * reviewer browsing screenshots must see the dev-build banner and the
 * harness labels without opening JSON — so the README must exist, name
 * the manifest's buildMode, and label every harness frame.
 */
function validateEvidenceProvenanceReadme(
  evidenceDir,
  manifest,
  screens,
  issues,
) {
  const readmePath = path.join(evidenceDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    issues.push(
      issue(
        'error',
        'evidence-provenance-readme-missing',
        'Evidence folder must carry the generated provenance README.md (re-audit H2/H3).',
        { readmePath },
      ),
    );
    return;
  }

  const readme = fs.readFileSync(readmePath, 'utf8');
  if (
    typeof manifest.buildMode === 'string' &&
    !readme.includes(`\`${manifest.buildMode}\``)
  ) {
    issues.push(
      issue(
        'error',
        'evidence-provenance-readme-build-mode-drift',
        `Provenance README must name the manifest buildMode (${manifest.buildMode}).`,
        { buildMode: manifest.buildMode, readmePath },
      ),
    );
  }

  for (const entry of screens) {
    if (typeof entry?.file !== 'string' || entry.routeKind !== 'harness') {
      continue;
    }
    const row = readme
      .split('\n')
      .find((line) => line.includes(`| ${entry.file} |`));
    if (!row || !/harness/i.test(row)) {
      issues.push(
        issue(
          'error',
          'evidence-provenance-readme-harness-unlabeled',
          `Provenance README must label ${entry.file} as an E2E harness frame.`,
          { file: entry.file, readmePath },
        ),
      );
    }
  }
}

async function imageFingerprint(filePath) {
  const raw = await sharp(filePath).ensureAlpha().raw().toBuffer();
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function validateEvidenceImages(evidenceDir, issues) {
  const entries = fs.readdirSync(evidenceDir, { withFileTypes: true });
  const failureFiles = entries
    .filter((entry) => entry.isFile() && /^failure-.*\.png$/i.test(entry.name))
    .map((entry) => entry.name);

  for (const file of failureFiles) {
    issues.push(
      issue(
        'error',
        'evidence-failure-screenshot-present',
        `Failure screenshot must not be kept in passing evidence: ${file}`,
        { file },
      ),
    );
  }

  const fingerprints = new Map();
  for (const expected of evidenceScreens) {
    const filePath = path.join(evidenceDir, expected.file);
    if (!fs.existsSync(filePath)) {
      issues.push(
        issue(
          'error',
          'evidence-screen-missing',
          `Expected evidence screenshot is missing: ${expected.file}`,
          { file: expected.file },
        ),
      );
      continue;
    }

    const size = fs.statSync(filePath).size;
    if (size < expected.minBytes) {
      issues.push(
        issue(
          'error',
          'evidence-screen-too-small',
          `${expected.file} is too small to prove hydrated product UI (${size} bytes).`,
          { file: expected.file, minimumBytes: expected.minBytes, size },
        ),
      );
    }

    try {
      const metadata = await sharp(filePath).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      if (width < 1000 || height < 700) {
        issues.push(
          issue(
            'error',
            'evidence-screen-dimensions-too-small',
            `${expected.file} must be at least 1000x700.`,
            { file: expected.file, height, width },
          ),
        );
      }

      const fingerprint = await imageFingerprint(filePath);
      const duplicate = fingerprints.get(fingerprint);
      if (duplicate) {
        issues.push(
          issue(
            'error',
            'evidence-screen-duplicate-frame',
            `${expected.file} is pixel-identical to ${duplicate}.`,
            { duplicateOf: duplicate, file: expected.file },
          ),
        );
      } else {
        fingerprints.set(fingerprint, expected.file);
      }
    } catch (error) {
      issues.push(
        issue(
          'error',
          'evidence-screen-unreadable',
          `${expected.file} could not be read as a PNG: ${error.message}`,
          { file: expected.file },
        ),
      );
    }
  }
}

async function validateEvidenceContract(options, issues) {
  const evidenceDir = resolveEvidenceDir(options.evidenceDir);
  if (!evidenceDir) {
    if (options.requireEvidence) {
      issues.push(
        issue(
          'error',
          'evidence-dir-not-configured',
          'Evidence validation requires --evidence-dir when --require-evidence is set.',
        ),
      );
    }
    return {
      status: 'not-configured',
      required: options.requireEvidence,
    };
  }

  const relativeEvidenceDir = path
    .relative(repoRoot, evidenceDir)
    .replaceAll('\\', '/');
  const evidence = {
    directory: relativeEvidenceDir,
    expectedScreens: evidenceScreens.map((screen) => screen.file),
    manifestPath: null,
    required: options.requireEvidence,
    status: 'pass',
  };

  if (!fs.existsSync(evidenceDir)) {
    issues.push(
      issue(
        'error',
        'evidence-dir-missing',
        `Evidence directory is missing: ${relativeEvidenceDir}`,
        { evidenceDir: relativeEvidenceDir },
      ),
    );
    evidence.status = 'fail';
    return evidence;
  }

  const manifestPath = findEvidenceManifest(evidenceDir);
  if (!manifestPath) {
    issues.push(
      issue(
        'error',
        'evidence-manifest-missing',
        `Evidence directory must include ${evidenceManifestNames.join(' or ')}.`,
        { evidenceDir: relativeEvidenceDir },
      ),
    );
  } else {
    evidence.manifestPath = path
      .relative(repoRoot, manifestPath)
      .replaceAll('\\', '/');
    try {
      validateEvidenceManifest(
        evidenceDir,
        loadJson(manifestPath),
        evidence.manifestPath,
        issues,
      );
    } catch (error) {
      issues.push(
        issue(
          'error',
          'evidence-manifest-unreadable',
          `Evidence manifest could not be read: ${error.message}`,
          { manifestPath: evidence.manifestPath },
        ),
      );
    }
  }

  await validateEvidenceImages(evidenceDir, issues);
  evidence.status = issues.some((item) => item.severity === 'error')
    ? 'fail'
    : 'pass';
  return evidence;
}

async function buildManifest(options) {
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
  const evidence = await validateEvidenceContract(options, issues);
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
      evidenceDir: options.evidenceDir,
      requireEvidence: options.requireEvidence,
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
    evidence,
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await buildManifest(options);

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
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
