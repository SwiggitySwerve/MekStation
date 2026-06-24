#!/usr/bin/env node
/**
 * Rebuild native Node modules inside Next.js standalone output for Electron.
 *
 * Why:
 * - Desktop releases run the Next.js server using Electron's Node runtime (ELECTRON_RUN_AS_NODE).
 * - Native modules bundled into `.next/standalone/node_modules` must match Electron's ABI.
 * - electron-builder rebuilds native deps for the desktop app, but NOT for the copied Next standalone output.
 *
 * This script rebuilds only the native modules we rely on at runtime (currently: better-sqlite3)
 * inside the root `.next/standalone` directory using Electron headers.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const nativeModules = [
  {
    name: 'better-sqlite3',
    buildSources: ['binding.gyp', 'deps', 'src'],
  },
];

function hydrateStandaloneBuildSources(rootDir, nextStandaloneDir) {
  for (const nativeModule of nativeModules) {
    const rootModuleDir = path.join(rootDir, 'node_modules', nativeModule.name);
    const standaloneModuleDir = path.join(
      nextStandaloneDir,
      'node_modules',
      nativeModule.name,
    );

    if (!fs.existsSync(rootModuleDir)) {
      throw new Error(`Missing root native module: ${rootModuleDir}`);
    }
    if (!fs.existsSync(standaloneModuleDir)) {
      throw new Error(
        `Missing standalone native module: ${standaloneModuleDir}`,
      );
    }

    for (const sourceName of nativeModule.buildSources) {
      const sourcePath = path.join(rootModuleDir, sourceName);
      const targetPath = path.join(standaloneModuleDir, sourceName);

      if (!fs.existsSync(sourcePath)) {
        throw new Error(
          `Missing ${nativeModule.name} build source: ${sourcePath}`,
        );
      }

      fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    }
  }
}

async function main() {
  const rootDir = path.join(__dirname, '..', '..');
  const nextStandaloneDir = path.join(rootDir, '.next', 'standalone');

  if (!fs.existsSync(nextStandaloneDir)) {
    console.error(
      `[rebuild-next-standalone] Missing Next standalone output at: ${nextStandaloneDir}\n` +
        `Run 'npm run build' in the repo root first (Next output: standalone).`,
    );
    process.exit(1);
  }

  execFileSync(
    process.execPath,
    [
      path.join(
        rootDir,
        'scripts',
        'hydrate-next-standalone-multiplayer-server.mjs',
      ),
    ],
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  );

  // Resolve Electron version from the installed desktop devDependency.
  // This ensures we rebuild against the exact Electron version used for packaging.
  const electronVersion = require('electron/package.json').version;
  const electronBinaryPath = require('electron');

  console.log(
    `[rebuild-next-standalone] Rebuilding native modules in ${nextStandaloneDir}\n` +
      `  electronVersion=${electronVersion} arch=${process.arch}`,
  );

  hydrateStandaloneBuildSources(rootDir, nextStandaloneDir);

  // Rebuild native modules for Electron with the same rebuilder electron-builder uses.
  // `npm rebuild` can silently leave host-Node ABI bindings in the standalone tree.
  const electronRebuildCliPath = require.resolve('@electron/rebuild/lib/cli');
  execFileSync(
    process.execPath,
    [
      electronRebuildCliPath,
      '--version',
      electronVersion,
      '--module-dir',
      nextStandaloneDir,
      '--only',
      'better-sqlite3',
      '--force',
      '--arch',
      process.arch,
      '--dist-url',
      'https://electronjs.org/headers',
    ],
    {
      cwd: path.join(rootDir, 'desktop'),
      stdio: 'inherit',
    },
  );

  // Sanity check: ensure the rebuilt native binding actually loads under Electron's ABI.
  execFileSync(
    electronBinaryPath,
    [
      '-e',
      [
        "const Database = require('better-sqlite3');",
        "const db = new Database(':memory:');",
        "const row = db.prepare('select 1 as x').get();",
        "if (row.x !== 1) throw new Error('Unexpected sqlite result');",
        'db.close();',
        "console.log('[rebuild-next-standalone] better-sqlite3 runtime check: OK');",
      ].join(' '),
    ],
    {
      cwd: nextStandaloneDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'inherit',
    },
  );

  console.log('[rebuild-next-standalone] Done');
}

main().catch((err) => {
  const message = err && err.message ? err.message : String(err);
  console.error(`[rebuild-next-standalone] Failed: ${message}`);
  process.exit(1);
});
