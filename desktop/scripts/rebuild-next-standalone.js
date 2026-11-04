#!/usr/bin/env node
/**
 * Rebuild native Node modules inside an Electron-only Next.js standalone copy.
 *
 * Why:
 * - Desktop releases run the Next.js server using Electron's Node runtime (ELECTRON_RUN_AS_NODE).
 * - Native modules bundled into the packaged Next standalone payload must match Electron's ABI.
 * - The normal service path (`npm run start`) runs root `.next/standalone` with plain Node's ABI.
 * - electron-builder rebuilds native deps for the desktop app, but NOT for the copied Next standalone output.
 *
 * This script creates `desktop/.tmp/next-standalone-electron` from the root
 * standalone output, then rebuilds only the runtime native modules we rely on
 * (currently: better-sqlite3) in that isolated copy using Electron headers.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const {
  nativeBindingCacheKey,
  restoreNativeBinding,
  saveNativeBinding,
} = require('./electron-native-cache');

const { nativeModules } = require('./electron-native-modules');

function resolveElectronStandaloneDir(desktopDir) {
  const override = process.env.MEKSTATION_ELECTRON_STANDALONE_DIR;
  if (override && override.trim().length > 0) {
    return path.isAbsolute(override)
      ? override
      : path.resolve(desktopDir, override);
  }

  return path.join(desktopDir, '.tmp', 'next-standalone-electron');
}

async function copyStandaloneForElectron(sourceDir, targetDir) {
  // The shared copier is ESM; this packaging entry remains CommonJS.
  const { copyDirectory } =
    await import('../../scripts/next/copy-directory.mjs');
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  await copyDirectory(sourceDir, targetDir);
}

function hydrateStandaloneBuildSources(rootDir, electronStandaloneDir) {
  for (const nativeModule of nativeModules) {
    const rootModuleDir = path.join(rootDir, 'node_modules', nativeModule.name);
    const electronStandaloneModuleDir = path.join(
      electronStandaloneDir,
      'node_modules',
      nativeModule.name,
    );

    if (!fs.existsSync(rootModuleDir)) {
      throw new Error(`Missing root native module: ${rootModuleDir}`);
    }
    if (!fs.existsSync(electronStandaloneModuleDir)) {
      throw new Error(
        `Missing Electron standalone native module: ${electronStandaloneModuleDir}`,
      );
    }

    for (const sourceName of nativeModule.buildSources) {
      const sourcePath = path.join(rootModuleDir, sourceName);
      const targetPath = path.join(electronStandaloneModuleDir, sourceName);

      if (!fs.existsSync(sourcePath)) {
        throw new Error(
          `Missing ${nativeModule.name} build source: ${sourcePath}`,
        );
      }

      fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    }
  }
}

function hashFile(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

function snapshotRootNativeBindings(nextStandaloneDir) {
  return nativeModules.map((nativeModule) => {
    const bindingPath = path.join(
      nextStandaloneDir,
      'node_modules',
      nativeModule.name,
      nativeModule.runtimeBinding,
    );
    if (!fs.existsSync(bindingPath)) {
      throw new Error(`Missing root standalone native binding: ${bindingPath}`);
    }
    return {
      bindingPath,
      hash: hashFile(bindingPath),
      name: nativeModule.name,
    };
  });
}

function assertRootNativeBindingsUnchanged(snapshots) {
  for (const snapshot of snapshots) {
    const currentHash = hashFile(snapshot.bindingPath);
    if (currentHash !== snapshot.hash) {
      throw new Error(
        `Root standalone native binding changed during Electron rebuild: ${snapshot.bindingPath}`,
      );
    }
  }
  console.log(
    '[rebuild-next-standalone] root native binding integrity check: OK',
  );
}

function verifyRootNodeRuntime(nextStandaloneDir) {
  try {
    execFileSync(
      process.execPath,
      [
        '-e',
        [
          "const Database = require('better-sqlite3');",
          "const db = new Database(':memory:');",
          "const row = db.prepare('select 1 as x').get();",
          "if (row.x !== 1) throw new Error('Unexpected sqlite result');",
          'db.close();',
          "console.log('[rebuild-next-standalone] root Node better-sqlite3 runtime check: OK');",
        ].join(' '),
      ],
      {
        cwd: nextStandaloneDir,
        stdio: 'inherit',
      },
    );
  } catch (error) {
    const strict =
      process.env.MEKSTATION_STRICT_ROOT_STANDALONE_NODE_CHECK === '1' ||
      !process.env.GITHUB_ACTIONS;
    if (strict) {
      throw error;
    }
    console.warn(
      '[rebuild-next-standalone] root Node runtime check skipped: root standalone artifact is not executable on this CI runner. Integrity hash still proves the Electron rebuild did not mutate it.',
    );
  }
}

function verifyElectronNativeRuntime(electronBinaryPath, directory) {
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
      cwd: directory,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'inherit',
    },
  );
}

function bindingCacheEntries(rootDir, imageDir, electronVersion) {
  const toolchain = {
    rootLock: hashFile(path.join(rootDir, 'package-lock.json')),
    desktopLock: hashFile(path.join(rootDir, 'desktop', 'package-lock.json')),
  };
  return nativeModules.map((nativeModule) => ({
    key: nativeBindingCacheKey(
      path.join(rootDir, 'node_modules', nativeModule.name),
      nativeModule.buildSources,
      electronVersion,
      toolchain,
    ),
    binding: path.join(
      imageDir,
      'node_modules',
      nativeModule.name,
      nativeModule.runtimeBinding,
    ),
  }));
}

async function main() {
  const desktopDir = path.join(__dirname, '..');
  const rootDir = path.join(__dirname, '..', '..');
  const nextStandaloneDir = path.join(rootDir, '.next', 'standalone');
  const electronStandaloneDir = resolveElectronStandaloneDir(desktopDir);

  const cacheKeyOnly = process.argv.includes('--cache-key');
  if (!cacheKeyOnly && !fs.existsSync(nextStandaloneDir)) {
    console.error(
      `[rebuild-next-standalone] Missing Next standalone output at: ${nextStandaloneDir}\n` +
        `Run 'npm run build' in the repo root first (Next output: standalone).`,
    );
    process.exit(1);
  }

  const electronVersion = require('electron/package.json').version;
  const cacheEntries = bindingCacheEntries(
    rootDir,
    electronStandaloneDir,
    electronVersion,
  );
  const cacheDir = path.join(desktopDir, '.electron-native-cache');
  if (cacheKeyOnly) {
    const key = crypto
      .createHash('sha256')
      .update(cacheEntries.map((entry) => entry.key).join('|'))
      .digest('hex');
    console.log(
      `electron-native-v1-${process.platform}-${process.arch}-${key}`,
    );
    return;
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

  console.log(
    `[rebuild-next-standalone] Preparing isolated Electron standalone copy\n` +
      `  source=${nextStandaloneDir}\n` +
      `  target=${electronStandaloneDir}`,
  );
  const rootNativeBindingSnapshots =
    snapshotRootNativeBindings(nextStandaloneDir);
  await copyStandaloneForElectron(nextStandaloneDir, electronStandaloneDir);

  const electronBinaryPath = require('electron');

  console.log(
    `[rebuild-next-standalone] Preparing native modules in ${electronStandaloneDir}\n` +
      `  electronVersion=${electronVersion} arch=${process.arch}`,
  );

  hydrateStandaloneBuildSources(rootDir, electronStandaloneDir);

  // Rebuild native modules for Electron with the same rebuilder electron-builder uses.
  // `npm rebuild` can silently leave host-Node ABI bindings in the standalone tree.
  let cacheHit = false;
  try {
    if (
      cacheEntries.every((entry) =>
        restoreNativeBinding(cacheDir, entry.key, entry.binding),
      )
    ) {
      verifyElectronNativeRuntime(electronBinaryPath, electronStandaloneDir);
      cacheHit = true;
      console.log(
        '[rebuild-next-standalone] Native cache hit; Electron ABI probe passed',
      );
    }
  } catch (error) {
    console.warn(
      '[rebuild-next-standalone] Native cache rejected; rebuilding:',
      error.message,
    );
  }
  if (!cacheHit) {
    const { rebuild } = await import('@electron/rebuild');
    await rebuild({
      arch: process.arch,
      buildPath: electronStandaloneDir,
      electronVersion,
      force: true,
      headerURL: 'https://electronjs.org/headers',
      onlyModules: nativeModules.map(({ name }) => name),
    });
  }

  // Sanity check: the root standalone output must remain usable by plain Node.
  // Electron rebuilds are isolated to the desktop/.tmp copy so service runs and
  // Docker packaging don't inherit Electron ABI native modules.
  assertRootNativeBindingsUnchanged(rootNativeBindingSnapshots);
  verifyRootNodeRuntime(nextStandaloneDir);

  if (!cacheHit) {
    verifyElectronNativeRuntime(electronBinaryPath, electronStandaloneDir);
    for (const entry of cacheEntries) {
      try {
        saveNativeBinding(cacheDir, entry.key, entry.binding);
      } catch (error) {
        console.warn(
          '[rebuild-next-standalone] Native cache write failed; verified build is usable:',
          error.message,
        );
      }
    }
  }

  console.log('[rebuild-next-standalone] Done');
}

main().catch((err) => {
  const message = err && err.message ? err.message : String(err);
  console.error(`[rebuild-next-standalone] Failed: ${message}`);
  process.exit(1);
});
