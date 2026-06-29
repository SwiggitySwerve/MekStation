#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultRegistryPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-qc-registry.json',
);

const retiredEvidencePattern = /^Archived OpenSpec change /i;
const browserProofPattern =
  /app-shell|browser|chromium|e2e|electron:test|headed|packaged|playwright|pwa|screenshot|visual/i;
const canonicalProofPattern =
  /catalog|command-backed|determinism|domain|engine|gap|graph|journey|ledger|matrix|parity|projection|qc:|reload|schema|state|strict|validate|verify/i;

function parseArgs(argv) {
  const options = {
    json: false,
    registry: process.env.MEKSTATION_QC_REGISTRY_PATH ?? defaultRegistryPath,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, value] = match;
    if (key === 'registry') options.registry = value;
  }

  return options;
}

function resolveInputPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function loadJson(filePath) {
  return JSON.parse(
    stripBom(fs.readFileSync(resolveInputPath(filePath), 'utf8')),
  );
}

function currentEvidence(surface) {
  return (surface.evidence ?? []).filter(
    (entry) => !retiredEvidencePattern.test(String(entry)),
  );
}

function surfaceText(surface) {
  return [
    ...(surface.commands ?? []),
    ...(surface.tests ?? []),
    ...currentEvidence(surface),
  ]
    .map(String)
    .join('\n');
}

function proofKindFor(surface) {
  const text = surfaceText(surface);
  const hasBrowserProof = browserProofPattern.test(text);
  const hasCanonicalProof = canonicalProofPattern.test(text);

  if (hasBrowserProof && hasCanonicalProof) return 'browser+canonical';
  if (hasBrowserProof) return 'browser';
  if (hasCanonicalProof) return 'canonical';
  return null;
}

function classifySurface(surface) {
  const manualChecks = surface.manualChecks ?? [];
  const evidence = currentEvidence(surface);
  const proofKind = proofKindFor(surface);
  const blockers = [];

  if (manualChecks.length === 0) {
    return {
      surfaceId: surface.surfaceId,
      manualCheckCount: 0,
      currentEvidenceCount: evidence.length,
      commandCount: (surface.commands ?? []).length,
      proofKind,
      blockers,
      status: 'not-applicable',
    };
  }

  if ((surface.commands ?? []).length === 0) {
    blockers.push('manual-checks-without-command');
  }

  if (evidence.length === 0) {
    blockers.push('manual-checks-without-current-evidence');
  }

  if (!proofKind) {
    blockers.push('manual-checks-without-machine-proof-token');
  }

  return {
    surfaceId: surface.surfaceId,
    manualCheckCount: manualChecks.length,
    currentEvidenceCount: evidence.length,
    commandCount: (surface.commands ?? []).length,
    proofKind,
    blockers,
    status: blockers.length > 0 ? 'blocked' : 'machine-backed',
  };
}

function buildReport(options) {
  const registry = loadJson(options.registry);
  const surfaces = Array.isArray(registry.surfaces) ? registry.surfaces : [];
  const classified = surfaces.map(classifySurface);
  const manualSurfaces = classified.filter(
    (surface) => surface.manualCheckCount > 0,
  );
  const blocked = manualSurfaces.filter(
    (surface) => surface.blockers.length > 0,
  );

  return {
    registry: path.relative(repoRoot, resolveInputPath(options.registry)),
    surfaceCount: surfaces.length,
    manualSurfaceCount: manualSurfaces.length,
    manualCheckCount: manualSurfaces.reduce(
      (total, surface) => total + surface.manualCheckCount,
      0,
    ),
    machineBackedManualSurfaces: manualSurfaces.length - blocked.length,
    unbackedManualSurfaceCount: blocked.length,
    surfaces: manualSurfaces,
  };
}

function printText(report) {
  console.log('# Manual automation coverage');
  console.log(`Registry: ${report.registry}`);
  console.log(
    `Manual surfaces: ${report.manualSurfaceCount}; manual checks: ${report.manualCheckCount}; machine-backed: ${report.machineBackedManualSurfaces}; unbacked: ${report.unbackedManualSurfaceCount}`,
  );

  for (const surface of report.surfaces) {
    const proof = surface.proofKind ?? 'none';
    const suffix =
      surface.blockers.length > 0
        ? ` blockers=${surface.blockers.join(',')}`
        : '';
    console.log(
      `- ${surface.surfaceId}: ${surface.status} proof=${proof} commands=${surface.commandCount} evidence=${surface.currentEvidenceCount} manualChecks=${surface.manualCheckCount}${suffix}`,
    );
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }

  if (report.unbackedManualSurfaceCount > 0) {
    console.error(
      `ERROR: manual surfaces without machine-backed proof: ${report.unbackedManualSurfaceCount}`,
    );
    process.exit(1);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
