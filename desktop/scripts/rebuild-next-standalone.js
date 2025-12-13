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

async function main() {
  const rootDir = path.join(__dirname, '..', '..');
  const nextStandaloneDir = path.join(rootDir, '.next', 'standalone');

  if (!fs.existsSync(nextStandaloneDir)) {
    console.error(
      `[rebuild-next-standalone] Missing Next standalone output at: ${nextStandaloneDir}\n` +
        `Run 'npm run build' in the repo root first (Next output: standalone).`
    );
    process.exit(1);
  }

  // Resolve Electron version from the installed desktop devDependency.
  // This ensures we rebuild against the exact Electron version used for packaging.
  const electronVersion = require('electron/package.json').version;
  const electronBinaryPath = require('electron');

  console.log(
    `[rebuild-next-standalone] Rebuilding native modules in ${nextStandaloneDir}\n` +
      `  electronVersion=${electronVersion} arch=${process.arch}`
  );

  // Rebuild native modules for Electron by running `npm rebuild` with Electron-specific env vars.
  // This ensures `better-sqlite3` is compiled against Electron's NODE_MODULE_VERSION.
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    console.error('[rebuild-next-standalone] Missing npm_execpath; run this script via an npm script.');
    process.exit(1);
  }
  execFileSync(
    process.execPath,
    [
      npmCliPath,
      'rebuild',
      'better-sqlite3',
    ],
    {
      cwd: nextStandaloneDir,
      env: {
        ...process.env,
        npm_config_runtime: 'electron',
        npm_config_target: electronVersion,
        npm_config_disturl: 'https://electronjs.org/headers',
        npm_config_arch: process.arch,
        npm_config_target_arch: process.arch,
      },
      stdio: 'inherit',
    }
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
        "db.close();",
        "console.log('[rebuild-next-standalone] better-sqlite3 runtime check: OK');",
      ].join(' '),
    ],
    {
      cwd: nextStandaloneDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'inherit',
    }
  );

  console.log('[rebuild-next-standalone] Done');
}

main().catch((err) => {
  const message = err && err.message ? err.message : String(err);
  console.error(`[rebuild-next-standalone] Failed: ${message}`);
  process.exit(1);
});


