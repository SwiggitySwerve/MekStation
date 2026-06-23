import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..', '..');

export function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

export function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

export function buildLedgerQcManifest(config) {
  const issues = [];
  const registryPath =
    process.env.MEKSTATION_QC_REGISTRY_PATH ??
    path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
  const openSpecChangesDir =
    process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
    path.join(repoRoot, 'openspec', 'changes');
  const sourceAnchorsPath = config.sourceAnchorsEnvVar
    ? (process.env[config.sourceAnchorsEnvVar] ?? null)
    : null;
  const registry = loadJson(registryPath);
  const sourceAnchors = sourceAnchorsPath
    ? loadJson(sourceAnchorsPath)
    : config.defaultSourceAnchors;
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const surface = validateSurface(
    surfaceById,
    issues,
    config.requiredSurface,
    config.entityLabel,
    openSpecChangesDir,
  );
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues, config.entityLabel, config.tokenLabel),
  );

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    registryPath: path.relative(repoRoot, registryPath).replaceAll('\\', '/'),
    requiredDomains: config.requiredDomains,
    requiredFamilies: config.requiredFamilies,
    validatedDomainCount: config.requiredDomains.length,
    validatedFamilyCount: config.requiredFamilies.length,
    ...config.extraRequirements,
    requiredSurfaceCount: 1,
    validatedSurfaceCount: surface ? 1 : 0,
    sourceAnchorCount: sourceAnchors.length,
    errors,
    warnings,
    issues,
    surface,
    anchors,
  };
}

export function printLedgerQcResult(manifest, config) {
  printIssues(manifest.issues);
  const counts = [
    `surfaces=${manifest.validatedSurfaceCount}/${manifest.requiredSurfaceCount}`,
    `domains=${manifest.validatedDomainCount}/${manifest.requiredDomains.length}`,
    `families=${manifest.validatedFamilyCount}/${manifest.requiredFamilies.length}`,
    ...buildExtraCountSummaries(manifest, config.extraSummaryFields ?? []),
    `anchors=${manifest.sourceAnchorCount}`,
    `errors=${manifest.errors.length}`,
    `warnings=${manifest.warnings.length}`,
  ];
  console.log(`[${config.label}] ${counts.join(' ')}`);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function activeChangeExists(openSpecChangesDir, changeId) {
  return fs.existsSync(path.join(openSpecChangesDir, changeId));
}

function validateSurface(
  surfaceById,
  issues,
  requiredSurface,
  entityLabel,
  openSpecChangesDir,
) {
  const surface = surfaceById.get(requiredSurface.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required ${entityLabel} surface ${requiredSurface.id} is missing.`,
        { surfaceId: requiredSurface.id },
      ),
    );
    return null;
  }

  if (!surfaceById.has(requiredSurface.parentId)) {
    issues.push(
      issue(
        'error',
        'parent-surface-missing',
        `${requiredSurface.id} parent surface ${requiredSurface.parentId} is missing.`,
        { surfaceId: requiredSurface.id, parentId: requiredSurface.parentId },
      ),
    );
  }

  if (surface.parentId !== requiredSurface.parentId) {
    issues.push(
      issue(
        'error',
        'parent-surface-mismatch',
        `${requiredSurface.id} must be a child of ${requiredSurface.parentId}.`,
        { surfaceId: requiredSurface.id, parentId: surface.parentId },
      ),
    );
  }

  if (!surface.claimIds?.includes(requiredSurface.claimId)) {
    issues.push(
      issue(
        'error',
        'claim-missing',
        `${requiredSurface.id} must include claim ${requiredSurface.claimId}.`,
        { surfaceId: requiredSurface.id, claimId: requiredSurface.claimId },
      ),
    );
  }

  for (const commandToken of requiredSurface.commandIncludes) {
    if (!surface.commands.some((command) => command.includes(commandToken))) {
      issues.push(
        issue(
          'error',
          'command-missing',
          `${requiredSurface.id} must expose a command containing ${commandToken}.`,
          { surfaceId: requiredSurface.id, commandToken },
        ),
      );
    }
  }

  for (const specToken of requiredSurface.specIncludes) {
    if (!surface.specRefs.some((specRef) => specRef.includes(specToken))) {
      issues.push(
        issue(
          'error',
          'spec-ref-missing',
          `${requiredSurface.id} must reference ${specToken}.`,
          { surfaceId: requiredSurface.id, specToken },
        ),
      );
    }
  }

  for (const changeRef of surface.activeChangeRefs ?? []) {
    if (!activeChangeExists(openSpecChangesDir, changeRef)) {
      issues.push(
        issue(
          'error',
          'stale-active-change-ref',
          `${requiredSurface.id} references stale or inactive OpenSpec change ${changeRef}.`,
          { surfaceId: requiredSurface.id, changeRef },
        ),
      );
    }
  }

  return {
    surfaceId: requiredSurface.id,
    parentId: surface.parentId,
    claimId: requiredSurface.claimId,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands.length,
    activeChangeRefs: surface.activeChangeRefs ?? [],
  };
}

function validateSourceAnchor(anchor, issues, entityLabel, tokenLabel) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required ${entityLabel} source anchor ${anchor.path} is missing.`,
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
          `${anchor.id} (${anchor.path}) must contain ${tokenLabel} token ${token}.`,
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

function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

function buildExtraCountSummaries(manifest, extraSummaryFields) {
  return extraSummaryFields.map((field) => {
    const values = manifest[field.manifestKey] ?? [];
    return `${field.label}=${values.length}/${values.length}`;
  });
}
