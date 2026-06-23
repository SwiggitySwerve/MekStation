#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const openSpecChangesDir =
  process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
  path.join(repoRoot, 'openspec', 'changes');
const sourceAnchorsPath =
  process.env.MEKSTATION_TACTICAL_PROJECTION_ANCHORS_PATH ?? null;

const requiredSurfaces = [
  {
    id: 'gameplay-tactical-map-combat',
    claimId: 'ui.tactical',
    commandIncludes: [
      'tactical-map.movement-scenarios.test.ts',
      'tactical-map.combat-scenarios.test.ts',
      'tactical-map-visual-smoke.spec.ts',
    ],
  },
  {
    id: 'tactical-map-rules-explanation',
    claimId: 'ui.tactical.rules-explanation',
    commandIncludes: [
      'tactical-map.movement-scenarios.test.ts',
      'tactical-map.combat-scenarios.test.ts',
    ],
  },
  {
    id: 'topdown-hex-legibility',
    claimId: 'ui.tactical.topdown-legibility',
    commandIncludes: [
      'HexMapDisplay.terrainLabels.01.test.tsx',
      'tactical-map-visual-smoke.spec.ts',
    ],
  },
  {
    id: 'movement-preview-engine-agreement',
    claimId: 'ui.tactical.movement-preview',
    commandIncludes: ['tactical-map.movement-scenarios.test.ts'],
  },
  {
    id: 'combat-preview-engine-agreement',
    claimId: 'ui.tactical.combat-preview',
    commandIncludes: [
      'tactical-map.combat-scenarios.test.ts',
      'InteractiveSession.attackProjectionAgreement.scenario.test.ts',
    ],
  },
  {
    id: 'isometric-rotatable-25d',
    claimId: 'ui.tactical.isometric-25d',
    commandIncludes: [
      'HexMapDisplay.isometric.test.ts',
      'tactical-map-visual-smoke.spec.ts',
    ],
  },
];

const defaultSourceAnchors = [
  {
    id: 'shared-projection-builder',
    path: 'src/utils/gameplay/tacticalMapProjection.ts',
    tokens: [
      'buildTacticalMapHexProjectionLookup',
      'collectBlockedReasons',
      'formatProjectionExplanation',
      'sourceReferences',
    ],
  },
  {
    id: 'projection-source-attributes',
    path: 'src/components/gameplay/HexMapDisplay/HexMapDisplay.tacticalProjectionAttributes.ts',
    tokens: [
      'shared-tactical-map-projection',
      'data-tactical-projection-source',
      'movementProjectionSourceMetadata',
      'combatProjectionSourceMetadata',
    ],
  },
  {
    id: 'overlay-invalid-reason-metadata',
    path: 'src/components/gameplay/HexMapDisplay/HexCell.overlayAttributes.ts',
    tokens: [
      'data-hex-overlay-blocked-reasons',
      'data-hex-overlay-explanation',
      'data-hex-overlay-sources',
      'data-hex-overlay-rule-refs',
    ],
  },
  {
    id: 'non-color-projection-status-badges',
    path: 'src/components/gameplay/HexMapDisplay/HexCell.projectionBadges.tsx',
    tokens: [
      'ProjectionStatusBadge',
      'data-projection-status-badge-reasons',
      'data-projection-status-badge-explanation',
      'formatProjectionStatusTitle',
    ],
  },
  {
    id: 'movement-preview-commit-scenarios',
    path: 'src/testing/__tests__/tactical-map.movement-scenarios.test.ts',
    tokens: [
      'tactical-map.movement-scenarios.01-basic-elevation.cases',
      'tactical-map.movement-scenarios.02-conversion-modes.cases',
      'tactical-map.movement-scenarios.03-airborne-and-water.cases',
      'tactical-map.movement-scenarios.04-terrain-and-standup.cases',
      'tactical-map.movement-scenarios.05-naval.cases',
    ],
  },
  {
    id: 'combat-preview-commit-scenarios',
    path: 'src/testing/__tests__/tactical-map.combat-scenarios.test.ts',
    tokens: [
      'tactical-map.combat-scenarios.01-range-and-c3.cases',
      'tactical-map.combat-scenarios.02-indirect-fire.cases',
      'tactical-map.combat-scenarios.05-los-and-cover.cases',
      'tactical-map.combat-scenarios.07-arcs.cases',
      'tactical-map.combat-scenarios.09-range-rejections.cases',
    ],
  },
  {
    id: 'interactive-attack-projection-agreement',
    path: 'src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test-helpers.ts',
    tokens: [
      'applyInteractiveSessionAttack',
      'deriveCombatRangeHexes',
      'IAttackInvalidPayload',
      'resolveAttack',
    ],
  },
  {
    id: 'isometric-presentation-parity',
    path: 'src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.isometric.test.ts',
    tokens: ['depth', 'rotation', 'occlusion', 'elevated hex extrusion'],
  },
];

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function loadSourceAnchors() {
  if (!sourceAnchorsPath) return defaultSourceAnchors;
  return JSON.parse(fs.readFileSync(sourceAnchorsPath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function activeChangeExists(changeId) {
  return fs.existsSync(path.join(openSpecChangesDir, changeId));
}

function validateSurface(contract, surfaceById, issues) {
  const surface = surfaceById.get(contract.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required tactical surface ${contract.id} is missing.`,
        { surfaceId: contract.id },
      ),
    );
    return null;
  }

  if (!surface.claimIds?.includes(contract.claimId)) {
    issues.push(
      issue(
        'error',
        'claim-missing',
        `${contract.id} must include claim ${contract.claimId}.`,
        { surfaceId: contract.id, claimId: contract.claimId },
      ),
    );
  }

  for (const commandToken of contract.commandIncludes) {
    if (!surface.commands.some((command) => command.includes(commandToken))) {
      issues.push(
        issue(
          'error',
          'command-missing',
          `${contract.id} must expose a command containing ${commandToken}.`,
          { surfaceId: contract.id, commandToken },
        ),
      );
    }
  }

  for (const changeRef of surface.activeChangeRefs ?? []) {
    if (!activeChangeExists(changeRef)) {
      issues.push(
        issue(
          'error',
          'stale-active-change-ref',
          `${contract.id} references stale or inactive OpenSpec change ${changeRef}.`,
          { surfaceId: contract.id, changeRef },
        ),
      );
    }
  }

  return {
    surfaceId: contract.id,
    claimId: contract.claimId,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands.length,
    browserCommandCount: surface.commands.filter((command) =>
      /\b(playwright|test:e2e)\b/i.test(command),
    ).length,
    activeChangeRefs: surface.activeChangeRefs ?? [],
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required tactical source anchor ${anchor.path} is missing.`,
        { anchorId: anchor.id, path: anchor.path },
      ),
    );
    return {
      id: anchor.id,
      path: anchor.path,
      tokenCount: anchor.tokens.length,
      present: false,
    };
  }

  const text = readRepoFile(anchor.path);
  for (const token of anchor.tokens) {
    if (!text.includes(token)) {
      issues.push(
        issue(
          'error',
          'source-anchor-token-missing',
          `${anchor.id} (${anchor.path}) must contain tactical parity token ${token}.`,
          { anchorId: anchor.id, path: anchor.path, token },
        ),
      );
    }
  }

  return {
    id: anchor.id,
    path: anchor.path,
    tokenCount: anchor.tokens.length,
    present: true,
  };
}

function buildManifest() {
  const issues = [];
  const registry = loadRegistry();
  const sourceAnchors = loadSourceAnchors();
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const surfaces = requiredSurfaces
    .map((contract) => validateSurface(contract, surfaceById, issues))
    .filter(Boolean);
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues),
  );
  const browserCommandCount = surfaces.reduce(
    (total, surface) => total + surface.browserCommandCount,
    0,
  );

  if (browserCommandCount === 0) {
    issues.push(
      issue(
        'error',
        'browser-boundary-missing',
        'Tactical projection parity must keep browser visual coverage discoverable.',
      ),
    );
  }

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    registryPath: path.relative(repoRoot, registryPath).replaceAll('\\', '/'),
    requiredSurfaceCount: requiredSurfaces.length,
    validatedSurfaceCount: surfaces.length,
    sourceAnchorCount: sourceAnchors.length,
    browserCommandCount,
    errors,
    warnings,
    issues,
    surfaces,
    anchors,
  };
}

function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const manifest = buildManifest();

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printIssues(manifest.issues);
  console.log(
    `[qc:tactical:projection] surfaces=${manifest.validatedSurfaceCount}/${manifest.requiredSurfaceCount} anchors=${manifest.sourceAnchorCount} browserCommands=${manifest.browserCommandCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
