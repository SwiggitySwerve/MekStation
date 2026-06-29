#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = process.env.MEKSTATION_QC_REGISTRY_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_QC_REGISTRY_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const appShellRouteManifestPath = process.env
  .MEKSTATION_APP_SHELL_ROUTE_MANIFEST_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_APP_SHELL_ROUTE_MANIFEST_PATH)
  : path.join(repoRoot, 'e2e', 'app-shell-route-manifest.json');
const openspecChangesDir = process.env.MEKSTATION_OPENSPEC_CHANGES_DIR
  ? path.resolve(repoRoot, process.env.MEKSTATION_OPENSPEC_CHANGES_DIR)
  : path.join(repoRoot, 'openspec', 'changes');

const requiredStringFields = ['surfaceId', 'title', 'level', 'coverageStatus'];
const requiredArrayFields = [
  'riskTags',
  'qualityLenses',
  'routes',
  'apis',
  'desktopSurfaces',
  'modules',
  'submodules',
  'specRefs',
  'activeChangeRefs',
  'tests',
  'commands',
  'manualChecks',
  'evidence',
  'gaps',
];

const optionalArrayFields = ['claimIds'];
const pathCheckedFields = ['modules', 'specRefs'];
const pathLikeEvidenceFields = ['evidence'];
const pathLikeTestSkipValues = new Set([
  'all',
  'maintenance scanner subagents',
  'qc:validate',
]);
const ignoredIndexDirs = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
]);
const ignoredIndexPathPrefixes = [
  'desktop/.electron-cache/',
  'desktop/.tmp/',
  'desktop/release/',
  'desktop/release-test/',
];

function fail(message) {
  return { severity: 'error', message };
}

function warn(message) {
  return { severity: 'warning', message };
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${registryPath}: ${error.message}`);
    process.exit(1);
  }
}

function loadAppShellRouteManifest() {
  try {
    return JSON.parse(fs.readFileSync(appShellRouteManifestPath, 'utf8'));
  } catch (error) {
    console.error(
      `Failed to read ${appShellRouteManifestPath}: ${error.message}`,
    );
    process.exit(1);
  }
}

function toRepoRelativePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(glob) {
  const normalized = toRepoRelativePath(glob);
  let pattern = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '*' && next === '*') {
      const afterNext = normalized[index + 2];
      pattern += afterNext === '/' ? '(?:.*/)?' : '.*';
      index += afterNext === '/' ? 2 : 1;
      continue;
    }

    if (char === '*') {
      pattern += '[^/]*';
      continue;
    }

    pattern += escapeRegExp(char);
  }

  return new RegExp(`${pattern}$`);
}

function hasGlob(value) {
  return value.includes('*');
}

function isCommandLike(value) {
  return /^(npm|npx|node|tsx)\.?(cmd)?\s/.test(value.trim());
}

function isPathLikeEvidence(value) {
  const normalized = value.trim();
  const repoPrefixPattern =
    /^(docs|src|scripts|e2e|openspec|desktop|server\.js|package\.json)(\/|\\|$)/;
  return repoPrefixPattern.test(normalized);
}

function shouldIgnoreIndexEntry(dirent, relativePath) {
  if (dirent.isSymbolicLink()) return true;
  if (ignoredIndexDirs.has(dirent.name)) return true;

  const normalized = toRepoRelativePath(relativePath);
  return ignoredIndexPathPrefixes.some(
    (ignoredPrefix) =>
      normalized === ignoredPrefix.replace(/\/$/, '') ||
      normalized.startsWith(ignoredPrefix),
  );
}

function collectRepoEntries() {
  const entries = [];
  const pendingDirs = [{ absolutePath: repoRoot, prefix: '' }];

  while (pendingDirs.length > 0) {
    const currentDir = pendingDirs.pop();
    const dirents = fs.readdirSync(currentDir.absolutePath, {
      withFileTypes: true,
    });

    for (const dirent of dirents) {
      const absolutePath = path.join(currentDir.absolutePath, dirent.name);
      const relativePath = currentDir.prefix
        ? `${currentDir.prefix}/${dirent.name}`
        : dirent.name;

      if (shouldIgnoreIndexEntry(dirent, relativePath)) continue;

      entries.push(toRepoRelativePath(relativePath));

      if (dirent.isDirectory()) {
        pendingDirs.push({ absolutePath, prefix: relativePath });
      }
    }
  }

  return entries;
}

const repoEntries = collectRepoEntries();
const repoEntrySet = new Set(repoEntries);
const pageRoutePatterns = collectPageRoutePatterns();
const appShellRouteManifest = loadAppShellRouteManifest();

function repoReferenceExists(reference) {
  const normalized = toRepoRelativePath(reference.trim());

  if (hasGlob(normalized)) {
    const matcher = globToRegExp(normalized);
    return repoEntries.some((entry) => matcher.test(entry));
  }

  return repoEntrySet.has(normalized);
}

function pathWithoutExtension(filePath) {
  return filePath.replace(/\.(?:tsx?|jsx?)$/, '');
}

function pageRouteFromFile(filePath) {
  const normalized = toRepoRelativePath(filePath);
  if (!normalized.startsWith('src/pages/')) return null;
  if (normalized.startsWith('src/pages/api/')) return null;
  if (!/\.(?:tsx?|jsx?)$/.test(normalized)) return null;

  const pagePath = pathWithoutExtension(normalized.slice('src/pages/'.length));
  const segments = pagePath.split('/').filter(Boolean);
  const lastSegment = segments.at(-1);

  if (lastSegment === '_app' || lastSegment === '_document') return null;
  if (lastSegment === 'index') {
    segments.pop();
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function routePatternToRegex(routePattern) {
  if (routePattern === '/') return /^\/$/;

  const segments = routePattern.split('/').filter(Boolean);
  let pattern = '^';

  for (const segment of segments) {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) {
      pattern += '(?:/.*)?';
      continue;
    }
    if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
      pattern += '/.+';
      continue;
    }
    if (/^\[[^\]]+\]$/.test(segment)) {
      pattern += '/[^/]+';
      continue;
    }
    pattern += `/${escapeRegExp(segment)}`;
  }

  return new RegExp(`${pattern}$`);
}

function collectPageRoutePatterns() {
  return repoEntries
    .map(pageRouteFromFile)
    .filter(Boolean)
    .map((routePattern) => ({
      routePattern,
      matcher: routePatternToRegex(routePattern),
    }));
}

function normalizeRouteReference(route) {
  return route.split(/[?#]/)[0] || '/';
}

function routeReferenceExists(route) {
  const normalized = normalizeRouteReference(route.trim());
  return pageRoutePatterns.some(({ matcher }) => matcher.test(normalized));
}

function validateRouteReference(label, index, value, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(fail(`${label}: routes[${index}] must be a non-empty string.`));
    return;
  }

  if (!value.startsWith('/')) {
    issues.push(fail(`${label}: routes[${index}] must start with "/".`));
    return;
  }

  if (!routeReferenceExists(value)) {
    issues.push(
      fail(
        `${label}: routes[${index}] does not resolve to a Next.js page route: ${value}`,
      ),
    );
  }
}

function validatePathReference(label, field, index, value, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(
      fail(`${label}: ${field}[${index}] must be a non-empty string.`),
    );
    return;
  }

  if (!repoReferenceExists(value)) {
    issues.push(
      fail(`${label}: ${field}[${index}] does not resolve in repo: ${value}`),
    );
  }
}

function archivedChangeMatches(changeRef) {
  const archiveDir = path.join(openspecChangesDir, 'archive');
  if (!fs.existsSync(archiveDir)) return [];
  return fs
    .readdirSync(archiveDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && entry.name.endsWith(`-${changeRef}`),
    )
    .map((entry) => entry.name);
}

function validateActiveChangeReference(label, index, changeRef, issues) {
  if (typeof changeRef !== 'string' || changeRef.trim() === '') {
    issues.push(
      fail(`${label}: activeChangeRefs[${index}] must be a non-empty string.`),
    );
    return;
  }

  const activePath = path.join(openspecChangesDir, changeRef);
  if (fs.existsSync(activePath)) return;

  const archivedMatches = archivedChangeMatches(changeRef);
  const archiveNote =
    archivedMatches.length > 0
      ? ` Found archived match(es): ${archivedMatches.join(', ')}.`
      : '';
  issues.push(
    fail(
      `${label}: activeChangeRefs[${index}] does not resolve to an active OpenSpec change: ${changeRef}.${archiveNote}`,
    ),
  );
}

function routePathList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim());
}

function requireNonEmptyString(label, value, issues) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(fail(`${label} must be a non-empty string.`));
    return false;
  }
  return true;
}

function pageRoutePatternSet() {
  return new Set(pageRoutePatterns.map(({ routePattern }) => routePattern));
}

function pageRoutePatternForPath(routePath) {
  const normalized = normalizeRouteReference(routePath.trim());
  return (
    pageRoutePatterns.find(({ matcher }) => matcher.test(normalized))
      ?.routePattern ?? null
  );
}

function claimRoutePattern(claims, pattern, owner, issues) {
  const previousOwner = claims.get(pattern);
  if (previousOwner) {
    issues.push(
      fail(
        `app-shell route coverage pattern ${pattern} is claimed by both ${previousOwner} and ${owner}.`,
      ),
    );
    return;
  }
  claims.set(pattern, owner);
}

function appShellManifestRoutePaths(issues) {
  if (appShellRouteManifest.version !== 1) {
    issues.push(fail('app-shell route manifest version must be 1.'));
  }

  if (!Array.isArray(appShellRouteManifest.primaryRoutes)) {
    issues.push(
      fail('app-shell route manifest primaryRoutes must be an array.'),
    );
    return [];
  }

  const routePaths = [];
  const seen = new Set();

  for (const [index, route] of appShellRouteManifest.primaryRoutes.entries()) {
    const pathValue = route?.path;
    const labelValue = route?.label;

    if (typeof pathValue !== 'string' || pathValue.trim() === '') {
      issues.push(
        fail(
          `app-shell route manifest primaryRoutes[${index}].path must be a non-empty string.`,
        ),
      );
      continue;
    }

    if (typeof labelValue !== 'string' || labelValue.trim() === '') {
      issues.push(
        fail(
          `app-shell route manifest primaryRoutes[${index}].label must be a non-empty string.`,
        ),
      );
    }

    const normalizedPath = pathValue.trim();
    if (!routeReferenceExists(normalizedPath)) {
      issues.push(
        fail(
          `app-shell route manifest primaryRoutes[${index}].path does not resolve to a Next.js page route: ${normalizedPath}`,
        ),
      );
    }

    if (seen.has(normalizedPath)) {
      issues.push(
        fail(
          `app-shell route manifest primaryRoutes contains duplicate path: ${normalizedPath}`,
        ),
      );
      continue;
    }

    seen.add(normalizedPath);
    routePaths.push(normalizedPath);
  }

  return routePaths;
}

function appShellRecoveryRoutePatterns(issues) {
  if (!Array.isArray(appShellRouteManifest.recoveryRoutes)) {
    issues.push(
      fail('app-shell route manifest recoveryRoutes must be an array.'),
    );
    return [];
  }

  const patterns = [];
  const seenPaths = new Set();
  const knownPatterns = pageRoutePatternSet();

  for (const [index, route] of appShellRouteManifest.recoveryRoutes.entries()) {
    const label = `app-shell route manifest recoveryRoutes[${index}]`;
    const pathValue = route?.path;
    const patternValue = route?.pattern;

    if (
      !requireNonEmptyString(`${label}.path`, pathValue, issues) ||
      !requireNonEmptyString(`${label}.pattern`, patternValue, issues)
    ) {
      continue;
    }
    requireNonEmptyString(`${label}.label`, route?.label, issues);

    const normalizedPath = pathValue.trim();
    const normalizedPattern = patternValue.trim();
    if (seenPaths.has(normalizedPath)) {
      issues.push(
        fail(
          `app-shell route manifest recoveryRoutes contains duplicate path: ${normalizedPath}`,
        ),
      );
    }
    seenPaths.add(normalizedPath);

    if (!routeReferenceExists(normalizedPath)) {
      issues.push(
        fail(
          `${label}.path does not resolve to a Next.js page route: ${normalizedPath}`,
        ),
      );
    }

    if (!knownPatterns.has(normalizedPattern)) {
      issues.push(
        fail(
          `${label}.pattern does not match a Next.js page route pattern: ${normalizedPattern}`,
        ),
      );
      continue;
    }

    const actualPattern = pageRoutePatternForPath(normalizedPath);
    if (actualPattern !== normalizedPattern) {
      issues.push(
        fail(
          `${label}.path ${normalizedPath} resolves to ${actualPattern ?? 'no route'}, not declared pattern ${normalizedPattern}`,
        ),
      );
    }
    patterns.push(normalizedPattern);
  }

  return patterns;
}

function appShellCoverageGroupPatterns(field, issues) {
  if (!Array.isArray(appShellRouteManifest[field])) {
    issues.push(fail(`app-shell route manifest ${field} must be an array.`));
    return [];
  }

  const patterns = [];
  const knownPatterns = pageRoutePatternSet();

  for (const [groupIndex, group] of appShellRouteManifest[field].entries()) {
    const label = `app-shell route manifest ${field}[${groupIndex}]`;
    requireNonEmptyString(`${label}.label`, group?.label, issues);
    requireNonEmptyString(`${label}.reason`, group?.reason, issues);

    if (field === 'delegatedRoutes' || field === 'testHarnessRoutes') {
      requireNonEmptyString(
        `${label}.proofCommand`,
        group?.proofCommand,
        issues,
      );
      if (!Array.isArray(group?.proofTests) || group.proofTests.length === 0) {
        issues.push(
          fail(`${label}.proofTests must contain at least one path.`),
        );
      } else {
        for (const [testIndex, value] of group.proofTests.entries()) {
          validatePathReference(label, 'proofTests', testIndex, value, issues);
        }
      }
    }

    if (field === 'knownGapRoutes') {
      requireNonEmptyString(`${label}.tracking`, group?.tracking, issues);
    }

    if (!Array.isArray(group?.patterns) || group.patterns.length === 0) {
      issues.push(
        fail(`${label}.patterns must contain at least one route pattern.`),
      );
      continue;
    }

    for (const [patternIndex, rawPattern] of group.patterns.entries()) {
      const patternLabel = `${label}.patterns[${patternIndex}]`;
      if (!requireNonEmptyString(patternLabel, rawPattern, issues)) continue;

      const pattern = rawPattern.trim();
      if (!knownPatterns.has(pattern)) {
        issues.push(
          fail(
            `${patternLabel} does not match a Next.js page route pattern: ${pattern}`,
          ),
        );
        continue;
      }
      patterns.push(pattern);
    }
  }

  return patterns;
}

function validateAppShellPageRouteCoverage(manifestRoutes, issues) {
  const claims = new Map();
  const primaryPatterns = new Set(
    manifestRoutes
      .map((routePath) => pageRoutePatternForPath(routePath))
      .filter(Boolean),
  );
  const recoveryPatterns = appShellRecoveryRoutePatterns(issues);
  const delegatedPatterns = appShellCoverageGroupPatterns(
    'delegatedRoutes',
    issues,
  );
  const knownGapPatterns = appShellCoverageGroupPatterns(
    'knownGapRoutes',
    issues,
  );
  const testHarnessPatterns = appShellCoverageGroupPatterns(
    'testHarnessRoutes',
    issues,
  );

  for (const pattern of primaryPatterns) {
    claimRoutePattern(claims, pattern, 'primaryRoutes', issues);
  }
  for (const pattern of recoveryPatterns) {
    claimRoutePattern(claims, pattern, 'recoveryRoutes', issues);
  }
  for (const pattern of delegatedPatterns) {
    claimRoutePattern(claims, pattern, 'delegatedRoutes', issues);
  }
  for (const pattern of knownGapPatterns) {
    claimRoutePattern(claims, pattern, 'knownGapRoutes', issues);
  }
  for (const pattern of testHarnessPatterns) {
    claimRoutePattern(claims, pattern, 'testHarnessRoutes', issues);
  }

  const missingPatterns = pageRoutePatterns
    .map(({ routePattern }) => routePattern)
    .filter((pattern) => !claims.has(pattern));

  if (missingPatterns.length > 0) {
    issues.push(
      fail(
        `Next.js page routes missing from app-shell coverage manifest: ${missingPatterns.join(', ')}`,
      ),
    );
  }
}

function validateAppShellRouteProofAlignment(byId, issues) {
  const surface = byId.get('app-shell-navigation');
  if (!surface) return;

  const registryRoutes = routePathList(surface.routes);
  const manifestRoutes = appShellManifestRoutePaths(issues);
  const registryRouteSet = new Set(registryRoutes);
  const manifestRouteSet = new Set(manifestRoutes);

  const missingFromManifest = registryRoutes.filter(
    (route) => !manifestRouteSet.has(route),
  );
  const missingFromRegistry = manifestRoutes.filter(
    (route) => !registryRouteSet.has(route),
  );

  if (missingFromManifest.length > 0) {
    issues.push(
      fail(
        `app-shell-navigation routes missing from e2e/app-shell-route-manifest.json: ${missingFromManifest.join(', ')}`,
      ),
    );
  }

  if (missingFromRegistry.length > 0) {
    issues.push(
      fail(
        `e2e/app-shell-route-manifest.json routes missing from app-shell-navigation registry: ${missingFromRegistry.join(', ')}`,
      ),
    );
  }

  validateAppShellPageRouteCoverage(manifestRoutes, issues);
}

function hasParentCycle(surface, byId) {
  const seen = new Set([surface.surfaceId]);
  let cursor = surface.parentId;
  while (cursor) {
    if (seen.has(cursor)) {
      return true;
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

function validate(registry) {
  const issues = [];

  if (registry.version !== 1) {
    issues.push(fail('Registry version must be 1.'));
  }

  if (!Array.isArray(registry.surfaces) || registry.surfaces.length === 0) {
    issues.push(fail('Registry must contain at least one surface.'));
    return issues;
  }

  const ids = new Set();
  const byId = new Map();

  for (const [index, surface] of registry.surfaces.entries()) {
    const label = surface.surfaceId || `surface[${index}]`;

    for (const field of requiredStringFields) {
      if (typeof surface[field] !== 'string' || surface[field].trim() === '') {
        issues.push(fail(`${label}: ${field} must be a non-empty string.`));
      }
    }

    if (!Object.hasOwn(surface, 'parentId')) {
      issues.push(
        fail(`${label}: parentId is required and must be a string or null.`),
      );
    } else if (
      surface.parentId !== null &&
      typeof surface.parentId !== 'string'
    ) {
      issues.push(fail(`${label}: parentId must be a string or null.`));
    }

    for (const field of requiredArrayFields) {
      if (!Array.isArray(surface[field])) {
        issues.push(fail(`${label}: ${field} must be an array.`));
      }
    }

    for (const field of optionalArrayFields) {
      if (Object.hasOwn(surface, field) && !Array.isArray(surface[field])) {
        issues.push(fail(`${label}: ${field} must be an array when present.`));
      }
    }

    for (const field of pathCheckedFields) {
      if (!Array.isArray(surface[field])) continue;

      for (const [pathIndex, value] of surface[field].entries()) {
        validatePathReference(label, field, pathIndex, value, issues);
      }
    }

    if (Array.isArray(surface.routes)) {
      for (const [routeIndex, value] of surface.routes.entries()) {
        validateRouteReference(label, routeIndex, value, issues);
      }
    }

    if (Array.isArray(surface.tests)) {
      for (const [testIndex, value] of surface.tests.entries()) {
        if (typeof value !== 'string' || value.trim() === '') {
          issues.push(
            fail(`${label}: tests[${testIndex}] must be a non-empty string.`),
          );
          continue;
        }

        if (
          pathLikeTestSkipValues.has(value) ||
          isCommandLike(value) ||
          !isPathLikeEvidence(value)
        ) {
          continue;
        }

        validatePathReference(label, 'tests', testIndex, value, issues);
      }
    }

    for (const field of pathLikeEvidenceFields) {
      if (!Array.isArray(surface[field])) continue;

      for (const [evidenceIndex, value] of surface[field].entries()) {
        if (typeof value !== 'string' || value.trim() === '') {
          issues.push(
            fail(
              `${label}: ${field}[${evidenceIndex}] must be a non-empty string.`,
            ),
          );
          continue;
        }

        if (!isPathLikeEvidence(value)) continue;

        validatePathReference(label, field, evidenceIndex, value, issues);
      }
    }

    if (Array.isArray(surface.claimIds)) {
      for (const [claimIndex, claimId] of surface.claimIds.entries()) {
        if (typeof claimId !== 'string' || claimId.trim() === '') {
          issues.push(
            fail(
              `${label}: claimIds[${claimIndex}] must be a non-empty string.`,
            ),
          );
        }
      }
    }

    if (Array.isArray(surface.activeChangeRefs)) {
      for (const [
        changeRefIndex,
        changeRef,
      ] of surface.activeChangeRefs.entries()) {
        validateActiveChangeReference(label, changeRefIndex, changeRef, issues);
      }
    }

    if (ids.has(surface.surfaceId)) {
      issues.push(fail(`${label}: duplicate surfaceId.`));
    }
    ids.add(surface.surfaceId);
    byId.set(surface.surfaceId, surface);
  }

  validateAppShellRouteProofAlignment(byId, issues);

  for (const surface of registry.surfaces) {
    if (surface.parentId && !byId.has(surface.parentId)) {
      issues.push(
        fail(
          `${surface.surfaceId}: parentId "${surface.parentId}" does not exist.`,
        ),
      );
    }

    if (surface.parentId === null && surface.level !== 'top') {
      issues.push(
        warn(`${surface.surfaceId}: root surface should use level "top".`),
      );
    }

    if (surface.parentId !== null && surface.level === 'top') {
      issues.push(
        warn(`${surface.surfaceId}: child surface should not use level "top".`),
      );
    }

    if (hasParentCycle(surface, byId)) {
      issues.push(fail(`${surface.surfaceId}: parent cycle detected.`));
    }

    if (surface.commands.length === 0 && surface.manualChecks.length === 0) {
      issues.push(
        warn(`${surface.surfaceId}: add at least one command or manual check.`),
      );
    }

    if (surface.evidence.length === 0 || surface.gaps.length === 0) {
      issues.push(
        warn(`${surface.surfaceId}: evidence and gaps should stay explicit.`),
      );
    }
  }

  return issues;
}

const registry = loadRegistry();
const issues = validate(registry);
const errors = issues.filter((issue) => issue.severity === 'error');
const warnings = issues.filter((issue) => issue.severity === 'warning');

for (const issue of issues) {
  const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
  console.log(`${prefix}: ${issue.message}`);
}

console.log(
  `QC registry: ${registry.surfaces.length} surfaces, ${errors.length} errors, ${warnings.length} warnings.`,
);

if (errors.length > 0) {
  process.exit(1);
}
