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

function surfaceSearchValues(surface) {
  return [
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
}

const surfaceFilterMatchers = [
  [
    'status',
    (surface, value) => surface.coverageStatus.toLowerCase().includes(value),
  ],
  ['level', (surface, value) => surface.level.toLowerCase() === value],
  ['risk', (surface, value) => includesToken(surface.riskTags, value)],
  ['lens', (surface, value) => includesToken(surface.qualityLenses, value)],
  [
    'surface',
    (surface, value) => surface.surfaceId.toLowerCase().includes(value),
  ],
  ['module', (surface, value) => includesToken(surface.modules, value)],
  ['submodule', (surface, value) => includesToken(surface.submodules, value)],
  ['claim', (surface, value) => includesToken(surface.claimIds ?? [], value)],
  [
    'text',
    (surface, value) => includesToken(surfaceSearchValues(surface), value),
  ],
];

function matches(surface, filters) {
  return surfaceFilterMatchers.every(([filter, matcher]) => {
    const value = filters[filter];
    return !value || matcher(surface, value);
  });
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
