#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function resolveRepoPath(value) {
  if (path.isAbsolute(value)) return value;
  return path.join(repoRoot, value);
}

const defaultPaths = {
  packageJson: path.join(repoRoot, 'package.json'),
  registry: path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json'),
  graph: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-qc-validation-graph.json',
  ),
  qcMap: path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-map.md'),
  majorScenarios: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-major-capability-scenarios.json',
  ),
  journeyScenarios: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-journey-scenarios.json',
  ),
  knownLimitations: path.join(
    repoRoot,
    'src',
    'simulation',
    'core',
    'knownLimitations.ts',
  ),
  knownLimitationsDoc: path.join(
    repoRoot,
    'src',
    'simulation',
    'known-limitations.md',
  ),
  combatScopeContract: path.join(
    repoRoot,
    'src',
    'simulation',
    'runner',
    '__tests__',
    'combatValidationScope.contract.test.ts',
  ),
  catalogTrapTest: path.join(
    repoRoot,
    'src',
    'simulation',
    'runner',
    '__tests__',
    'battlemechCombatCatalog.19.audits-known-limitation-traps-without-filtering-combat.fragment.ts',
  ),
  combatSuite: path.join(repoRoot, 'scripts', 'validate-combat-suite.mjs'),
};

function envPath(name, fallback) {
  const value = process.env[name];
  return value ? resolveRepoPath(value) : fallback;
}

function envPathList(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(resolveRepoPath);
}

const paths = {
  packageJson: envPath(
    'MEKSTATION_PACKAGE_JSON_PATH',
    defaultPaths.packageJson,
  ),
  registry: envPath('MEKSTATION_QC_REGISTRY_PATH', defaultPaths.registry),
  graph: envPath('MEKSTATION_QC_GRAPH_PATH', defaultPaths.graph),
  knownLimitations: envPath(
    'MEKSTATION_KNOWN_LIMITATIONS_PATH',
    defaultPaths.knownLimitations,
  ),
  knownLimitationsDoc: envPath(
    'MEKSTATION_KNOWN_LIMITATIONS_DOC_PATH',
    defaultPaths.knownLimitationsDoc,
  ),
  combatScopeContract: envPath(
    'MEKSTATION_COMBAT_SCOPE_CONTRACT_TEST_PATH',
    defaultPaths.combatScopeContract,
  ),
  catalogTrapTest: envPath(
    'MEKSTATION_CATALOG_TRAP_TEST_PATH',
    defaultPaths.catalogTrapTest,
  ),
  combatSuite: envPath(
    'MEKSTATION_COMBAT_SUITE_PATH',
    defaultPaths.combatSuite,
  ),
  releaseDocs: envPathList('MEKSTATION_KNOWN_GAP_RELEASE_DOC_PATHS', [
    defaultPaths.registry,
    defaultPaths.graph,
    defaultPaths.qcMap,
    defaultPaths.majorScenarios,
    defaultPaths.journeyScenarios,
  ]),
};

const requiredPackageScripts = [
  ['qc:known-gaps:validate', 'validate-known-gap-honesty.mjs'],
  ['verify:qc:known-gaps', 'qc:known-gaps:validate'],
];

const knownGapSurfaceCommands = [
  'qc:known-gaps:validate',
  'qc:combat:catalog-rules:validate',
  'validate:combat:gaps -- --format=summary --expect-total=0',
  'validate:combat:gaps -- --level=out-of-scope --format=summary',
  'validate:combat',
];

const requiredAnchors = [
  {
    id: 'legacy-only-suppression-code',
    pathKey: 'knownLimitations',
    tokens: [
      'legacyGeneric === true',
      'legacyGenericDetector === true',
      'LEGACY_GENERIC_DETECTOR_CATEGORIES',
      'getLimitationPatternCategory',
      'filterKnownLimitations',
      'partitionViolations',
    ],
    forbiddenTokens: ['KNOWN_LIMITATION_BYPASS_INVARIANTS'],
  },
  {
    id: 'known-limitations-human-contract',
    pathKey: 'knownLimitationsDoc',
    tokens: [
      'NOT the feature-status source of truth',
      'legacy generic detectors',
      'New validation invariants',
      'visible by default',
      'legacy generic detectors only',
    ],
  },
  {
    id: 'combat-scope-contract-tests',
    pathKey: 'combatScopeContract',
    tokens: [
      'keeps BattleMech validation traps visible despite broad limitation text matches',
      'prevents known-limitation filters from becoming catalog gatekeepers',
      "'filter' + 'KnownLimitations'",
      "'partition' + 'Violations'",
      'known-limitation-bypass',
    ],
  },
  {
    id: 'catalog-trap-tests',
    pathKey: 'catalogTrapTest',
    tokens: [
      'audits known-limitation traps without filtering combat validation failures',
      'prevents known-limitation filtering from gating the catalog validation lane',
      'KNOWN_LIMITATION_VALIDATION_TRAPS',
    ],
  },
  {
    id: 'combat-suite-includes-honesty-tests',
    pathKey: 'combatSuite',
    tokens: [
      'combatValidationScope.contract.test.ts',
      'battlemechCombatCatalog.contract.test.ts',
    ],
  },
];

const staleReleaseClaimPatterns = [
  {
    pattern: /knownLimitations bypass drift/i,
    label: 'knownLimitations bypass drift',
  },
  {
    pattern: /Audit broad regex suppressions/i,
    label: 'manual broad regex suppression audit',
  },
  {
    pattern: /stale gap wording before release notes/i,
    label: 'stale gap wording release-note warning',
  },
  {
    pattern: /older 2026-06-11/i,
    label: 'older 2026-06-11 gap wording',
  },
  {
    pattern: /KNOWN_LIMITATION_BYPASS_INVARIANTS/i,
    label: 'retired KNOWN_LIMITATION_BYPASS_INVARIANTS posture',
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

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function relativeLabel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/') || filePath;
}

function validatePackageScripts(issues) {
  const packageJson = readJson(paths.packageJson);
  const scripts = packageJson.scripts ?? {};
  const found = [];

  for (const [scriptName, expectedNeedle] of requiredPackageScripts) {
    const script = scripts[scriptName];
    if (!script) {
      issues.push(
        issue(
          'error',
          'package-script-missing',
          `missing package script: ${scriptName}`,
          { scriptName },
        ),
      );
      continue;
    }

    if (!script.includes(expectedNeedle)) {
      issues.push(
        issue(
          'error',
          'package-script-wrong-target',
          `${scriptName} must contain ${expectedNeedle}.`,
          { scriptName, expectedNeedle },
        ),
      );
      continue;
    }

    found.push(scriptName);
  }

  return found;
}

function validateKnownGapSurface(issues) {
  const registry = readJson(paths.registry);
  const surface = registry.surfaces?.find(
    (entry) => entry.surfaceId === 'known-gap-honesty-audit',
  );

  if (!surface) {
    issues.push(
      issue(
        'error',
        'known-gap-surface-missing',
        'known-gap-honesty-audit surface is missing from the QC registry.',
      ),
    );
    return null;
  }

  if (surface.coverageStatus !== 'ready-with-scope') {
    issues.push(
      issue(
        'error',
        'known-gap-surface-not-ready',
        'known-gap-honesty-audit must be ready-with-scope before release claims can rely on it.',
        { coverageStatus: surface.coverageStatus },
      ),
    );
  }

  const commands = (surface.commands ?? []).join('\n');
  for (const commandToken of knownGapSurfaceCommands) {
    if (!commands.includes(commandToken)) {
      issues.push(
        issue(
          'error',
          'known-gap-command-missing',
          `known-gap-honesty-audit must expose a command containing ${commandToken}.`,
          { commandToken },
        ),
      );
    }
  }

  if ((surface.manualChecks ?? []).length > 0) {
    issues.push(
      issue(
        'error',
        'known-gap-manual-checks-remain',
        'known-gap-honesty-audit must be automated; manual checks keep it from being release-verifiable.',
        { manualChecks: surface.manualChecks },
      ),
    );
  }

  const evidence = (surface.evidence ?? []).join('\n');
  if (!evidence.includes('qc:known-gaps:validate')) {
    issues.push(
      issue(
        'error',
        'known-gap-evidence-missing',
        'known-gap-honesty-audit evidence must cite qc:known-gaps:validate.',
      ),
    );
  }

  return {
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands?.length ?? 0,
    manualCheckCount: surface.manualChecks?.length ?? 0,
    evidenceCount: surface.evidence?.length ?? 0,
  };
}

function validateAnchors(issues) {
  return requiredAnchors.map((anchor) => {
    const filePath = paths[anchor.pathKey];
    if (!fs.existsSync(filePath)) {
      issues.push(
        issue(
          'error',
          'anchor-file-missing',
          `${anchor.id} source file is missing: ${relativeLabel(filePath)}`,
          { anchorId: anchor.id, path: relativeLabel(filePath) },
        ),
      );
      return {
        id: anchor.id,
        path: relativeLabel(filePath),
        tokenCount: anchor.tokens.length,
        forbiddenTokenCount: anchor.forbiddenTokens?.length ?? 0,
        present: false,
      };
    }

    const text = readText(filePath);
    for (const token of anchor.tokens) {
      if (!text.includes(token)) {
        issues.push(
          issue(
            'error',
            'anchor-token-missing',
            `${anchor.id} must contain ${token}.`,
            { anchorId: anchor.id, path: relativeLabel(filePath), token },
          ),
        );
      }
    }

    for (const token of anchor.forbiddenTokens ?? []) {
      if (text.includes(token)) {
        issues.push(
          issue(
            'error',
            'anchor-forbidden-token',
            `${anchor.id} must not contain retired token ${token}.`,
            { anchorId: anchor.id, path: relativeLabel(filePath), token },
          ),
        );
      }
    }

    return {
      id: anchor.id,
      path: relativeLabel(filePath),
      tokenCount: anchor.tokens.length,
      forbiddenTokenCount: anchor.forbiddenTokens?.length ?? 0,
      present: true,
    };
  });
}

function validateReleaseDocs(issues) {
  return paths.releaseDocs.map((docPath) => {
    if (!fs.existsSync(docPath)) {
      issues.push(
        issue(
          'error',
          'release-doc-missing',
          `known-gap release doc is missing: ${relativeLabel(docPath)}`,
          { path: relativeLabel(docPath) },
        ),
      );
      return {
        path: relativeLabel(docPath),
        present: false,
        staleClaimCount: 0,
      };
    }

    const text = readText(docPath);
    const matches = [];
    for (const { pattern, label } of staleReleaseClaimPatterns) {
      if (!pattern.test(text)) continue;
      matches.push(label);
      issues.push(
        issue(
          'error',
          'stale-release-claim',
          `${relativeLabel(docPath)} contains stale known-gap wording: ${label}.`,
          { path: relativeLabel(docPath), label },
        ),
      );
    }

    return {
      path: relativeLabel(docPath),
      present: true,
      staleClaimCount: matches.length,
    };
  });
}

function buildManifest() {
  const issues = [];
  const packageScripts = validatePackageScripts(issues);
  const surface = validateKnownGapSurface(issues);
  const anchors = validateAnchors(issues);
  const releaseDocs = validateReleaseDocs(issues);
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    packageScripts,
    surface,
    anchorCount: requiredAnchors.length,
    releaseDocCount: paths.releaseDocs.length,
    errors,
    warnings,
    issues,
    anchors,
    releaseDocs,
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
    `[qc:known-gaps] anchors=${manifest.anchorCount} releaseDocs=${manifest.releaseDocCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
