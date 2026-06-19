#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-qc-registry.json',
);

function parseArgs(argv) {
  const filters = {};
  for (const arg of argv) {
    if (arg === '--json') {
      filters.json = true;
      continue;
    }
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) {
      filters[match[1]] = match[2].toLowerCase();
    }
  }
  return filters;
}

function includesToken(values, token) {
  return values.some((value) => String(value).toLowerCase().includes(token));
}

function matches(surface, filters) {
  if (
    filters.status &&
    !surface.coverageStatus.toLowerCase().includes(filters.status)
  ) {
    return false;
  }
  if (filters.level && surface.level.toLowerCase() !== filters.level) {
    return false;
  }
  if (filters.risk && !includesToken(surface.riskTags, filters.risk)) {
    return false;
  }
  if (filters.lens && !includesToken(surface.qualityLenses, filters.lens)) {
    return false;
  }
  if (
    filters.surface &&
    !surface.surfaceId.toLowerCase().includes(filters.surface)
  ) {
    return false;
  }
  if (filters.module && !includesToken(surface.modules, filters.module)) {
    return false;
  }
  if (
    filters.submodule &&
    !includesToken(surface.submodules, filters.submodule)
  ) {
    return false;
  }
  if (filters.claim && !includesToken(surface.claimIds ?? [], filters.claim)) {
    return false;
  }
  if (filters.text) {
    const haystack = [
      surface.surfaceId,
      surface.title,
      surface.coverageStatus,
      ...(surface.claimIds ?? []),
      ...surface.riskTags,
      ...surface.qualityLenses,
      ...surface.routes,
      ...surface.apis,
      ...surface.desktopSurfaces,
      ...surface.modules,
      ...surface.submodules,
      ...surface.specRefs,
      ...surface.activeChangeRefs,
      ...surface.tests,
      ...surface.commands,
      ...surface.manualChecks,
      ...surface.evidence,
      ...surface.gaps,
    ];
    if (!includesToken(haystack, filters.text)) {
      return false;
    }
  }
  return true;
}

function renderMarkdown(matchesList) {
  if (matchesList.length === 0) {
    console.log('No QC lanes matched.');
    return;
  }

  console.log(`# QC lanes (${matchesList.length})`);
  for (const surface of matchesList) {
    console.log(`\n## ${surface.surfaceId} - ${surface.title}`);
    console.log(`- Level: ${surface.level}`);
    console.log(`- Parent: ${surface.parentId ?? 'none'}`);
    console.log(`- Status: ${surface.coverageStatus}`);
    console.log(`- Risks: ${surface.riskTags.join(', ') || 'none'}`);
    console.log(`- Lenses: ${surface.qualityLenses.join(', ') || 'none'}`);
    console.log(`- Claims: ${(surface.claimIds ?? []).join(', ') || 'none'}`);
    console.log(`- Modules: ${surface.modules.join('; ') || 'none'}`);
    console.log(`- Submodules: ${surface.submodules.join('; ') || 'none'}`);
    console.log(`- Tests: ${surface.tests.join('; ') || 'none'}`);
    console.log(`- Commands: ${surface.commands.join(' | ') || 'none'}`);
    console.log(
      `- Manual checks: ${surface.manualChecks.join(' | ') || 'none'}`,
    );
    console.log(`- Gaps: ${surface.gaps.join(' | ') || 'none'}`);
  }
}

const filters = parseArgs(process.argv.slice(2));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const matchesList = registry.surfaces.filter((surface) =>
  matches(surface, filters),
);

if (filters.json) {
  console.log(JSON.stringify(matchesList, null, 2));
} else {
  renderMarkdown(matchesList);
}
