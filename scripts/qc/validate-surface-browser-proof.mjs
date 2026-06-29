#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultPaths = {
  registry: path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json'),
  scenarios: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-major-capability-scenarios.json',
  ),
};

const retiredEvidencePattern = /^Archived OpenSpec change /i;
const browserProofPattern =
  /app-shell|browser|chromium|e2e|electron:test|headed|packaged|playwright|pwa|screenshot|visual/i;
const browserLensPattern = /accessibility|ui|usability|ux/i;
const browserRiskPattern =
  /accessibility|browser|desktop|electron|playability|user-workflow|visual/i;

function parseArgs(argv) {
  const options = {
    json: false,
    registry: process.env.MEKSTATION_QC_REGISTRY_PATH ?? defaultPaths.registry,
    scenarios:
      process.env.MEKSTATION_MAJOR_SCENARIOS_PATH ?? defaultPaths.scenarios,
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
    if (key === 'scenarios') options.scenarios = value;
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

function textHasBrowserProof(values) {
  return values.map(String).some((value) => browserProofPattern.test(value));
}

function directSurfaceProof(surface) {
  const values = [...(surface.commands ?? []), ...(surface.tests ?? [])];
  if (!textHasBrowserProof(values)) return null;

  return {
    kind: 'surface',
    surfaceId: surface.surfaceId,
  };
}

function scenarioProof(scenario) {
  if (!scenario) return null;

  const browserCheck = (scenario.checks ?? []).find((check) => {
    if (check.required === false) return false;
    return textHasBrowserProof([check.command, ...(check.evidence ?? [])]);
  });
  if (!browserCheck) return null;

  return {
    kind: 'major-scenario',
    scenarioId: scenario.id,
    checkId: browserCheck.id,
    surfaceId: scenario.surfaceId,
  };
}

function requiresBrowserProof(surface) {
  if ((surface.desktopSurfaces ?? []).length > 0) return true;
  if ((surface.routes ?? []).length > 0 && surface.parentId === null) {
    return true;
  }
  if (
    (surface.qualityLenses ?? []).some((lens) => browserLensPattern.test(lens))
  ) {
    return true;
  }
  if ((surface.riskTags ?? []).some((tag) => browserRiskPattern.test(tag))) {
    return true;
  }
  return false;
}

function parentChain(surface, byId) {
  const chain = [];
  const seen = new Set([surface.surfaceId]);
  let parentId = surface.parentId;

  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.push(parent);
    seen.add(parentId);
    parentId = parent.parentId;
  }

  return chain;
}

function proofForSurface(surface, byId, scenariosBySurface) {
  const direct = directSurfaceProof(surface);
  if (direct) return direct;

  const ownScenario = scenarioProof(scenariosBySurface.get(surface.surfaceId));
  if (ownScenario) return ownScenario;

  for (const parent of parentChain(surface, byId)) {
    const parentDirect = directSurfaceProof(parent);
    if (parentDirect) {
      return {
        ...parentDirect,
        kind: 'parent-surface',
        inheritedFrom: parent.surfaceId,
      };
    }

    const parentScenario = scenarioProof(
      scenariosBySurface.get(parent.surfaceId),
    );
    if (parentScenario) {
      return {
        ...parentScenario,
        kind: 'parent-major-scenario',
        inheritedFrom: parent.surfaceId,
      };
    }
  }

  return null;
}

function buildReport(options) {
  const registry = loadJson(options.registry);
  const scenarioCatalog = loadJson(options.scenarios);
  const surfaces = Array.isArray(registry.surfaces) ? registry.surfaces : [];
  const byId = new Map(surfaces.map((surface) => [surface.surfaceId, surface]));
  const scenariosBySurface = new Map(
    (scenarioCatalog.scenarios ?? []).map((scenario) => [
      scenario.surfaceId,
      scenario,
    ]),
  );

  const classified = surfaces
    .map((surface) => {
      const browserRequired = requiresBrowserProof(surface);
      const proof = browserRequired
        ? proofForSurface(surface, byId, scenariosBySurface)
        : null;

      return {
        surfaceId: surface.surfaceId,
        browserRequired,
        proof,
        status: !browserRequired
          ? 'not-applicable'
          : proof
            ? 'browser-backed'
            : 'missing-browser-proof',
      };
    })
    .filter((surface) => surface.browserRequired);

  const missing = classified.filter(
    (surface) => surface.status === 'missing-browser-proof',
  );

  return {
    registry: path.relative(repoRoot, resolveInputPath(options.registry)),
    scenarioCatalog: path.relative(
      repoRoot,
      resolveInputPath(options.scenarios),
    ),
    surfaceCount: surfaces.length,
    browserRequiredSurfaceCount: classified.length,
    browserBackedSurfaceCount: classified.length - missing.length,
    missingBrowserProofCount: missing.length,
    surfaces: classified,
  };
}

function printText(report) {
  console.log('# Surface browser proof coverage');
  console.log(`Registry: ${report.registry}`);
  console.log(`Scenario catalog: ${report.scenarioCatalog}`);
  console.log(
    `Browser-required surfaces: ${report.browserRequiredSurfaceCount}; browser-backed: ${report.browserBackedSurfaceCount}; missing: ${report.missingBrowserProofCount}`,
  );

  for (const surface of report.surfaces) {
    const proof = surface.proof
      ? `${surface.proof.kind}:${surface.proof.surfaceId}${surface.proof.checkId ? `/${surface.proof.checkId}` : ''}`
      : 'none';
    console.log(`- ${surface.surfaceId}: ${surface.status} proof=${proof}`);
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

  if (report.missingBrowserProofCount > 0) {
    console.error(
      `ERROR: browser-required surfaces without resolved browser proof: ${report.missingBrowserProofCount}`,
    );
    process.exit(1);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
