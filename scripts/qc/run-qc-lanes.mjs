#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
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

const filterKeys = new Set([
  'status',
  'level',
  'risk',
  'lens',
  'surface',
  'module',
  'submodule',
  'claim',
  'text',
]);

function parseArgs(argv) {
  const filters = {};
  const options = {
    continueOnError: false,
    dryRun: false,
    onlyBrowser: false,
    quick: false,
    skipBrowser: false,
  };

  for (const arg of argv) {
    if (arg === '--continue-on-error') {
      options.continueOnError = true;
      continue;
    }
    if (arg === '--dry-run' || arg === '--list') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--only-browser') {
      options.onlyBrowser = true;
      continue;
    }
    if (arg === '--quick') {
      options.quick = true;
      options.skipBrowser = true;
      continue;
    }
    if (arg === '--skip-browser') {
      options.skipBrowser = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match && filterKeys.has(match[1])) {
      filters[match[1]] = match[2].toLowerCase();
    }
  }

  return { filters, options };
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
  ['status', (surface, value) => surface.coverageStatus.toLowerCase().includes(value)],
  ['level', (surface, value) => surface.level.toLowerCase() === value],
  ['risk', (surface, value) => includesToken(surface.riskTags, value)],
  ['lens', (surface, value) => includesToken(surface.qualityLenses, value)],
  ['surface', (surface, value) => surface.surfaceId.toLowerCase().includes(value)],
  ['module', (surface, value) => includesToken(surface.modules, value)],
  ['submodule', (surface, value) => includesToken(surface.submodules, value)],
  ['claim', (surface, value) => includesToken(surface.claimIds ?? [], value)],
  ['text', (surface, value) => includesToken(surfaceSearchValues(surface), value)],
];

function matches(surface, filters) {
  return surfaceFilterMatchers.every(([filter, matcher]) => {
    const value = filters[filter];
    return !value || matcher(surface, value);
  });
}

function isBrowserCommand(command) {
  return /\b(playwright|test:e2e)\b/i.test(command);
}

function isBroadJestCommand(command) {
  return (
    /^npm\.cmd\s+test\b/i.test(command) && !command.includes('--runTestsByPath')
  );
}

function skipReason(command, options) {
  if (options.onlyBrowser && !isBrowserCommand(command)) {
    return 'not-browser';
  }
  if (options.skipBrowser && isBrowserCommand(command)) {
    return 'browser-skipped';
  }
  if (options.quick && isBroadJestCommand(command)) {
    return 'broad-jest-skipped';
  }
  return null;
}

function collectCommands(surfaces, options) {
  const byCommand = new Map();
  const skipped = [];

  for (const surface of surfaces) {
    for (const command of surface.commands) {
      const reason = skipReason(command, options);
      if (reason) {
        skipped.push({ command, reason, surfaceId: surface.surfaceId });
        continue;
      }

      const entry = byCommand.get(command) ?? {
        command,
        surfaceIds: [],
      };
      entry.surfaceIds.push(surface.surfaceId);
      byCommand.set(command, entry);
    }
  }

  return {
    runnable: [...byCommand.values()],
    skipped,
  };
}

function runCommand(entry, options) {
  console.log(`\n[qc:run] ${entry.command}`);
  console.log(`[qc:run] surfaces: ${entry.surfaceIds.join(', ')}`);

  if (options.dryRun) {
    return 0;
  }

  const result = spawnSync(entry.command, {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    return 1;
  }

  return result.status ?? 1;
}

const { filters, options } = parseArgs(process.argv.slice(2));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const surfaces = registry.surfaces.filter((surface) =>
  matches(surface, filters),
);
const { runnable, skipped } = collectCommands(surfaces, options);

console.log(`[qc:run] matched surfaces: ${surfaces.length}`);

for (const item of skipped) {
  console.log(
    `[qc:run] skipped (${item.reason}) ${item.surfaceId}: ${item.command}`,
  );
}

if (surfaces.length === 0) {
  console.error('[qc:run] no surfaces matched the provided filters.');
  process.exit(1);
}

if (runnable.length === 0) {
  console.error('[qc:run] no runnable commands matched the provided filters.');
  process.exit(options.dryRun ? 0 : 1);
}

let failures = 0;
for (const entry of runnable) {
  const status = runCommand(entry, options);
  if (status !== 0) {
    failures += 1;
    console.error(`[qc:run] failed with exit ${status}: ${entry.command}`);
    if (!options.continueOnError) {
      process.exit(status);
    }
  }
}

console.log(
  `\n[qc:run] complete: ${runnable.length} command(s), ${skipped.length} skipped, ${failures} failed`,
);

process.exit(failures > 0 ? 1 : 0);
