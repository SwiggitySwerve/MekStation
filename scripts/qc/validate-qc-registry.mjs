#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = process.env.MEKSTATION_QC_REGISTRY_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_QC_REGISTRY_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
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

function collectRepoEntries(dir = repoRoot, prefix = '') {
  const entries = [];

  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredIndexDirs.has(dirent.name)) continue;

    const absolutePath = path.join(dir, dirent.name);
    const relativePath = prefix ? `${prefix}/${dirent.name}` : dirent.name;

    entries.push(toRepoRelativePath(relativePath));

    if (dirent.isDirectory()) {
      entries.push(...collectRepoEntries(absolutePath, relativePath));
    }
  }

  return entries;
}

const repoEntries = collectRepoEntries();
const repoEntrySet = new Set(repoEntries);
const pageRoutePatterns = collectPageRoutePatterns();

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
