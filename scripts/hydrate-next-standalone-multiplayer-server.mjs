#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const generatedServerPath = path.join(standaloneDir, 'server.js');
const standaloneConfigPath = path.join(
  standaloneDir,
  'server.next-config.json',
);

const runtimeModuleDirs = ['tsx', 'esbuild', 'ws'];
const runtimeScopedDirs = ['@esbuild'];

function rel(filePath) {
  return path.relative(root, filePath);
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${rel(filePath)}`);
  }
}

function copyDir(source, target) {
  assertExists(source, 'source directory');
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, force: true });
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

function copyRuntimeLoaders() {
  for (const dirName of runtimeModuleDirs) {
    copyDir(
      path.join(root, 'node_modules', dirName),
      path.join(standaloneDir, 'node_modules', dirName),
    );
  }
  for (const dirName of runtimeScopedDirs) {
    copyDir(
      path.join(root, 'node_modules', dirName),
      path.join(standaloneDir, 'node_modules', dirName),
    );
  }
}

function copyPublicAssets() {
  copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'));
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

function main() {
  assertExists(standaloneDir, 'Next standalone output');
  assertExists(generatedServerPath, 'generated Next standalone server');
  assertExists(path.join(root, 'server.js'), 'custom multiplayer server');
  assertExists(path.join(root, 'tsconfig.json'), 'TypeScript config');
  assertExists(path.join(root, 'public'), 'public assets');
  assertExists(path.join(root, 'src'), 'source tree');
  assertExists(path.join(root, 'node_modules', 'tsx'), 'tsx runtime loader');
  assertExists(path.join(root, 'node_modules', 'esbuild'), 'esbuild runtime');
  assertExists(path.join(root, 'node_modules', 'ws'), 'WebSocket runtime');
  assertExists(
    path.join(root, 'node_modules', '@esbuild'),
    'esbuild native package scope',
  );

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
  copyDir(path.join(root, 'src'), path.join(standaloneDir, 'src'));
  copyRuntimeLoaders();
  copyPublicAssets();

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
        runtimeLoaders: [...runtimeModuleDirs, ...runtimeScopedDirs],
        publicAssets: rel(path.join(standaloneDir, 'public')),
        sourceTree: rel(path.join(standaloneDir, 'src')),
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
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
}
