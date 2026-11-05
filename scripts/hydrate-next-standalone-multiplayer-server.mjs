#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { copyDirectory } from './next/copy-directory.mjs';
import {
  isDeploymentFile,
  pruneDeploymentFiles,
} from './next/deployment-files.mjs';
import {
  collectRuntimePackages,
  collectTurbopackExternals,
  createPackageSourcePreflight,
} from './next/runtime-packages.mjs';

const root = process.cwd();
const nextDir = path.resolve(
  root,
  /^[0-9a-f]{64}$/.test(process.env.CAMP01_RUNTIME_LEASE ?? '')
    ? (process.env.MEKSTATION_NEXT_DIST_DIR ?? '.next')
    : '.next',
);
const standaloneDir = path.join(nextDir, 'standalone');
const generatedServerPath = path.join(standaloneDir, 'server.js');
const standaloneConfigPath = path.join(
  standaloneDir,
  'server.next-config.json',
);
const megaMekBVCacheRelativePath = path.join(
  'scripts',
  'data-migration',
  'megamek-bv-cache.json',
);

// tsx owns its nested compiler and platform binary through its package graph.
const runtimeModuleDirs = ['tsx', 'ws'];

function rel(filePath) {
  return path.relative(root, filePath);
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${rel(filePath)}`);
  }
}

function isPathOutside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  );
}

function assertSafeDestinationPath(boundary, candidate, label) {
  const resolvedBoundary = path.resolve(boundary);
  const resolvedCandidate = path.resolve(candidate);
  if (isPathOutside(resolvedBoundary, resolvedCandidate)) {
    throw new Error(
      `Unsafe hydration destination (${label}) escapes ${rel(resolvedBoundary)}: ${rel(resolvedCandidate)}`,
    );
  }

  let current = resolvedBoundary;
  const relative = path.relative(resolvedBoundary, resolvedCandidate);
  const components = relative ? relative.split(path.sep) : [];
  for (const component of components) {
    current = path.join(current, component);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === 'ENOENT') break;
      throw error;
    }
    if (stats.isSymbolicLink()) {
      throw new Error(
        `Unsafe hydration destination (${label}) contains a symlink or junction: ${rel(current)}`,
      );
    }
  }
}

function assertDistinctRealpaths(source, target, label) {
  const sourceRealpath = fs.realpathSync.native(source);
  let targetRealpath;
  try {
    targetRealpath = fs.realpathSync.native(target);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  const normalize = (value) =>
    process.platform === 'win32' ? value.toLowerCase() : value;
  if (normalize(sourceRealpath) === normalize(targetRealpath)) {
    throw new Error(
      `Unsafe hydration destination (${label}) resolves to its source: ${rel(target)}`,
    );
  }
}

async function copyDir(source, target, label = 'directory') {
  assertExists(source, 'source directory');
  assertSafeDestinationPath(standaloneDir, target, label);
  assertDistinctRealpaths(source, target, label);
  fs.rmSync(target, { recursive: true, force: true });
  await copyDirectory(source, target, {
    filter: (input) => isDeploymentFile(path.relative(root, input)),
  });
}

function extractNextConfig(generatedServer) {
  const match = generatedServer.match(
    /const nextConfig = (\{[\s\S]*?\})\s*\r?\n\s*process\.env\.__NEXT_PRIVATE_STANDALONE_CONFIG/,
  );
  if (!match) {
    throw new Error(
      'Unable to extract resolved Next standalone config from generated server.js.',
    );
  }
  const parsed = JSON.parse(match[1]);
  return JSON.stringify(parsed, null, 2);
}

async function copyRuntimeLoaders(runtimePackages) {
  for (const source of runtimePackages) {
    const relative = path.relative(root, source);
    await copyDir(
      source,
      path.join(standaloneDir, relative),
      `runtime package ${relative}`,
    );
  }
}

async function copyPublicAssets() {
  await copyDir(
    path.join(root, 'public'),
    path.join(standaloneDir, 'public'),
    'public assets',
  );
  assertExists(
    path.join(
      standaloneDir,
      'public',
      'data',
      'units',
      'battlemechs',
      'index.json',
    ),
    'standalone BattleMech unit catalog',
  );
}

function copyRuntimeFile(relative, label) {
  const source = path.join(root, relative);
  const target = path.join(standaloneDir, relative);
  assertExists(source, label);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  assertExists(target, `standalone ${label}`);
}

function copyMegaMekBVCache() {
  copyRuntimeFile(megaMekBVCacheRelativePath, 'MegaMek BV cache');
}

// The custom server loads src through tsx inside the standalone tree, so every
// file src imports from outside src must ship with it (public/ is copied whole).
// #2655's src import of scripts/equipment-catalog/capital-bv.json was missing and
// the multiplayer runtime failed to load (2026-11-04 nightly). Static relative
// imports only; test and story files are not runtime closure.
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE =
  /(?:^|\/)__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$|\.test-helpers\.[cm]?[jt]sx?$|\.stories\.[cm]?[jt]sx?$/;
const RELATIVE_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"](\.{1,2}\/[^'"]+)['"]/gm;
const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'];

function posixRel(filePath) {
  return rel(filePath).replaceAll(path.sep, '/');
}

function listSourceFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

function resolveRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...RESOLVE_SUFFIXES.map((suffix) => base + suffix),
    ...['index.ts', 'index.tsx', 'index.js'].map((name) =>
      path.join(base, name),
    ),
  ];
  return {
    base,
    file: candidates.find((candidate) =>
      fs.statSync(candidate, { throwIfNoEntry: false })?.isFile(),
    ),
  };
}

function collectSourceClosure() {
  const srcDir = path.join(root, 'src');
  const publicDir = path.join(root, 'public');
  const shipped = (file) =>
    !isPathOutside(srcDir, file) || !isPathOutside(publicDir, file);
  const queue = listSourceFiles(srcDir).filter(
    (file) => !TEST_FILE.test(posixRel(file)),
  );
  const outside = new Set();
  while (queue.length > 0) {
    const file = queue.pop();
    for (const match of fs
      .readFileSync(file, 'utf8')
      .matchAll(RELATIVE_IMPORT)) {
      const { base, file: target } = resolveRelativeImport(file, match[1]);
      if (!target) {
        if (!shipped(base))
          throw new Error(
            `${posixRel(file)} imports a missing file outside src: ${posixRel(base)}`,
          );
        continue;
      }
      if (shipped(target) || outside.has(target)) continue;
      if (isPathOutside(root, target))
        throw new Error(
          `${posixRel(file)} imports outside the repository: ${target}`,
        );
      outside.add(target);
      if (SOURCE_FILE.test(target)) queue.push(target);
    }
  }
  return [...outside].sort();
}

function copySourceClosure(files) {
  for (const source of files) {
    const target = path.join(standaloneDir, path.relative(root, source));
    assertSafeDestinationPath(standaloneDir, target, 'source closure file');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

async function copyNextStaticAssets() {
  await copyDir(
    path.join(nextDir, 'static'),
    path.join(standaloneDir, '.next', 'static'),
    'Next static assets',
  );
  assertExists(
    path.join(standaloneDir, '.next', 'static', 'chunks'),
    'standalone Next static chunks',
  );
}

function validateHydrationDestinations(runtimePackages = []) {
  assertSafeDestinationPath(root, standaloneDir, 'Next standalone output');

  const destinations = [
    [standaloneConfigPath, 'standalone config'],
    [generatedServerPath, 'standalone server'],
    [path.join(standaloneDir, 'tsconfig.json'), 'standalone TypeScript config'],
    [path.join(standaloneDir, 'src'), 'standalone source tree'],
    ...runtimeModuleDirs.map((dirName) => [
      path.join(standaloneDir, 'node_modules', dirName),
      `runtime loader ${dirName}`,
    ]),
    ...runtimePackages.map((source) => [
      path.join(standaloneDir, path.relative(root, source)),
      `runtime package ${rel(source)}`,
    ]),
    [path.join(standaloneDir, 'public'), 'public assets'],
    [
      path.join(standaloneDir, megaMekBVCacheRelativePath),
      'standalone MegaMek BV cache',
    ],
    [path.join(standaloneDir, '.next', 'static'), 'Next static assets'],
  ];

  for (const [destination, label] of destinations) {
    assertSafeDestinationPath(standaloneDir, destination, label);
  }

  const sourceTargetPairs = [
    [
      path.join(root, 'src'),
      path.join(standaloneDir, 'src'),
      'standalone source tree',
    ],
    ...runtimeModuleDirs.map((dirName) => [
      path.join(root, 'node_modules', dirName),
      path.join(standaloneDir, 'node_modules', dirName),
      `runtime loader ${dirName}`,
    ]),
    ...runtimePackages.map((source) => [
      source,
      path.join(standaloneDir, path.relative(root, source)),
      `runtime package ${rel(source)}`,
    ]),
    [
      path.join(root, 'public'),
      path.join(standaloneDir, 'public'),
      'public assets',
    ],
    [
      path.join(nextDir, 'static'),
      path.join(standaloneDir, '.next', 'static'),
      'Next static assets',
    ],
  ];
  for (const [source, target, label] of sourceTargetPairs) {
    assertDistinctRealpaths(source, target, label);
  }
}

async function main() {
  if (nextDir === root || !nextDir.startsWith(`${root}${path.sep}`)) {
    throw new Error('Next output directory escaped the repository root.');
  }
  assertExists(standaloneDir, 'Next standalone output');
  assertExists(generatedServerPath, 'generated Next standalone server');
  assertExists(path.join(nextDir, 'static'), 'Next static assets');
  assertExists(path.join(root, 'server.js'), 'custom multiplayer server');
  assertExists(path.join(root, 'tsconfig.json'), 'TypeScript config');
  assertExists(path.join(root, 'public'), 'public assets');
  assertExists(path.join(root, 'src'), 'source tree');
  assertExists(path.join(root, 'node_modules', 'tsx'), 'tsx runtime loader');
  assertExists(path.join(root, 'node_modules', 'ws'), 'WebSocket runtime');
  validateHydrationDestinations();
  const sourceClosure = collectSourceClosure();
  const preflightSource = createPackageSourcePreflight(root);
  const runtimePackages = await collectRuntimePackages(
    root,
    runtimeModuleDirs,
    preflightSource,
  );
  for (const file of runtimePackages.files) {
    if (!isDeploymentFile(rel(file))) {
      throw new Error(
        `Required runtime input excluded by deployment policy: ${rel(file)}`,
      );
    }
    if (!isPathOutside(nextDir, file)) {
      throw new Error(
        `Runtime input comes from generated Next output: ${rel(file)}`,
      );
    }
  }
  validateHydrationDestinations([
    ...runtimePackages.directories,
    ...runtimePackages.files,
  ]);
  const aliasRoot = path.join(
    standaloneDir,
    path.relative(root, nextDir),
    'node_modules',
  );
  assertSafeDestinationPath(
    standaloneDir,
    aliasRoot,
    'Turbopack external aliases',
  );
  const turbopackExternals = collectTurbopackExternals(
    root,
    aliasRoot,
    standaloneDir,
    preflightSource,
  );

  // Match by realpath: Windows cwd keeps typed casing, junction targets do not.
  const closureByRealpath = new Map(
    runtimePackages.directories.map((directory) => [
      fs.realpathSync.native(directory),
      directory,
    ]),
  );
  for (const external of turbopackExternals) {
    if (!external.canForwardNativeEntry) continue;
    external.canonicalDirectory = closureByRealpath.get(
      fs.realpathSync.native(external.source),
    );
    if (!external.canonicalDirectory) {
      throw new Error(
        `Native Turbopack external has no canonical runtime package; refusing a second native copy: ${rel(external.target)}`,
      );
    }
  }

  const generatedServer = fs.readFileSync(generatedServerPath, 'utf8');
  const nextConfigJson =
    generatedServer.includes('const nextConfig =') &&
    generatedServer.includes('startServer')
      ? extractNextConfig(generatedServer)
      : fs.existsSync(standaloneConfigPath)
        ? fs.readFileSync(standaloneConfigPath, 'utf8').trim()
        : null;
  if (!nextConfigJson) {
    throw new Error(
      'Unable to extract or reuse the resolved Next standalone config.',
    );
  }

  fs.writeFileSync(standaloneConfigPath, `${nextConfigJson}\n`);
  fs.copyFileSync(
    path.join(root, 'server.js'),
    path.join(standaloneDir, 'server.js'),
  );
  fs.copyFileSync(
    path.join(root, 'tsconfig.json'),
    path.join(standaloneDir, 'tsconfig.json'),
  );
  await copyDir(
    path.join(root, 'src'),
    path.join(standaloneDir, 'src'),
    'standalone source tree',
  );
  copySourceClosure(sourceClosure);
  await copyRuntimeLoaders(runtimePackages.directories);
  for (const source of runtimePackages.files) {
    copyRuntimeFile(
      path.relative(root, source),
      `runtime repository input ${rel(source)}`,
    );
  }
  for (const {
    source,
    target,
    canForwardNativeEntry,
    canonicalDirectory,
  } of turbopackExternals) {
    // Remove only Next's preflighted link; copyDir then validates a physical
    // destination. Absolute checkout links cannot ship in a portable image.
    fs.unlinkSync(target);
    if (canForwardNativeEntry) {
      // A CommonJS native entry must use the canonical package: Electron
      // rebuilds that one binding, and both imports must load the same ABI.
      assertSafeDestinationPath(standaloneDir, target, 'native external entry');
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(
        path.join(target, 'package.json'),
        JSON.stringify({ private: true, main: 'index.cjs' }),
      );
      const canonical = path.join(
        standaloneDir,
        path.relative(root, canonicalDirectory),
      );
      const request = path
        .relative(target, canonical)
        .replaceAll(path.sep, '/');
      fs.writeFileSync(
        path.join(target, 'index.cjs'),
        `module.exports = require(${JSON.stringify(request)});\n`,
      );
    } else {
      await copyDir(source, target, 'Turbopack external package');
    }
  }
  await copyPublicAssets();
  copyMegaMekBVCache();
  await copyNextStaticAssets();

  pruneDeploymentFiles(standaloneDir);

  const requireStandalone = createRequire(generatedServerPath);
  for (const request of runtimePackages.requests) {
    const resolved = requireStandalone.resolve(request);
    if (isPathOutside(standaloneDir, resolved)) {
      throw new Error(
        `Runtime package ${request} resolved outside standalone output: ${resolved}`,
      );
    }
  }

  const hydratedServer = fs.readFileSync(generatedServerPath, 'utf8');
  if (
    !hydratedServer.includes('/api/multiplayer/socket') ||
    !hydratedServer.includes("server.on('upgrade'")
  ) {
    throw new Error(
      'Hydrated standalone server is missing multiplayer upgrade wiring.',
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        hydratedStandaloneServer: rel(generatedServerPath),
        nextConfig: rel(standaloneConfigPath),
        runtimeLoaders: runtimeModuleDirs,
        runtimePackages: runtimePackages.directories.map(rel),
        publicAssets: rel(path.join(standaloneDir, 'public')),
        megaMekBVCache: rel(
          path.join(standaloneDir, megaMekBVCacheRelativePath),
        ),
        nextStaticAssets: rel(path.join(standaloneDir, '.next', 'static')),
        sourceTree: rel(path.join(standaloneDir, 'src')),
        sourceClosure: sourceClosure.map(posixRel),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        hint: 'Run npm run build first so .next/standalone/server.js exists, then hydrate the standalone multiplayer server.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
