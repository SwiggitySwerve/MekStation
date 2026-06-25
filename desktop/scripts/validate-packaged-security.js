#!/usr/bin/env node
/**
 * Validate security-critical assumptions against the packaged Electron output.
 *
 * Source-level tests prove the TypeScript behavior. This script proves the
 * built app.asar and extraResources payload still contain those hardened paths.
 */

const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');

const desktopDir = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = {
    appAsar: null,
    json: false,
    outputDir: process.env.MEKSTATION_TEST_BUILD_OUTPUT_DIR ?? 'release-test',
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, value] = match;
    if (key === 'app-asar') options.appAsar = value;
    if (key === 'output-dir') options.outputDir = value;
  }

  return options;
}

function resolveDesktopPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(desktopDir, value);
}

function findAppAsars(rootDir) {
  const found = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'app.asar') {
        found.push(entryPath);
      }
    }
  }

  return found.sort();
}

function normalizeAsarEntry(value) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function hasAsarEntry(entries, entryPath) {
  const expected = normalizeAsarEntry(entryPath);
  return entries.some((entry) => normalizeAsarEntry(entry) === expected);
}

function readAsarText(appAsarPath, entryPath) {
  const variants = [
    entryPath,
    entryPath.replace(/[\\/]/g, path.sep),
    entryPath.replace(/[\\/]/g, '/'),
    entryPath.replace(/[\\/]/g, '\\'),
  ];

  let lastError = null;
  for (const variant of variants) {
    try {
      return asar.extractFile(appAsarPath, variant).toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Unable to read ${entryPath} from app.asar`);
}

function addResult(results, artifact, id, ok, detail) {
  results.push({ artifact, id, ok, detail });
}

function assertContains(results, artifact, id, text, needle, detail) {
  addResult(results, artifact, id, text.includes(needle), detail);
}

function assertNotContains(results, artifact, id, text, needle, detail) {
  addResult(results, artifact, id, !text.includes(needle), detail);
}

function assertFileExists(results, artifact, id, filePath, detail) {
  addResult(results, artifact, id, fs.existsSync(filePath), detail);
}

function validateAsarArtifact(appAsarPath) {
  const artifact = path.relative(desktopDir, appAsarPath) || appAsarPath;
  const results = [];
  const entries = asar.listPackage(appAsarPath);
  const requiredEntries = [
    'dist/electron/main.js',
    'dist/electron/main.window.js',
    'dist/electron/main.ipc.js',
    'dist/electron/pathSandbox.js',
    'dist/electron/preload.js',
    'dist/electron/securityPolicy.js',
  ];

  for (const entryPath of requiredEntries) {
    addResult(
      results,
      artifact,
      `asar-entry:${entryPath}`,
      hasAsarEntry(entries, entryPath),
      `Packaged app.asar includes ${entryPath}.`,
    );
  }

  const mainWindow = readAsarText(appAsarPath, 'dist/electron/main.window.js');
  const mainIpc = readAsarText(appAsarPath, 'dist/electron/main.ipc.js');
  const pathSandbox = readAsarText(appAsarPath, 'dist/electron/pathSandbox.js');
  const preload = readAsarText(appAsarPath, 'dist/electron/preload.js');
  const securityPolicy = readAsarText(
    appAsarPath,
    'dist/electron/securityPolicy.js',
  );

  assertContains(
    results,
    artifact,
    'window:node-integration-disabled',
    mainWindow,
    'nodeIntegration: false',
    'BrowserWindow disables renderer Node integration.',
  );
  assertContains(
    results,
    artifact,
    'window:context-isolation-enabled',
    mainWindow,
    'contextIsolation: true',
    'BrowserWindow keeps context isolation enabled.',
  );
  assertContains(
    results,
    artifact,
    'window:sandbox-enabled',
    mainWindow,
    'sandbox: true',
    'BrowserWindow enables the Electron renderer sandbox.',
  );
  assertContains(
    results,
    artifact,
    'window:web-security-production-bound',
    mainWindow,
    'webSecurity: !config.developmentMode',
    'BrowserWindow keeps webSecurity on outside development mode.',
  );
  assertContains(
    results,
    artifact,
    'navigation:origin-pinned',
    mainWindow,
    'will-navigate',
    'Main window intercepts renderer navigation attempts.',
  );
  assertContains(
    results,
    artifact,
    'navigation:external-window-denied',
    mainWindow,
    'setWindowOpenHandler',
    'Main window denies popup windows after evaluating safe external URLs.',
  );
  assertContains(
    results,
    artifact,
    'navigation:external-opener-limited',
    mainWindow,
    "parsed.protocol === 'https:' || parsed.protocol === 'mailto:'",
    'External opening is limited to https and mailto schemes.',
  );
  assertContains(
    results,
    artifact,
    'packaged-server:resources-path',
    mainWindow,
    "process.resourcesPath, 'next-standalone'",
    'Packaged UI loads the Next standalone server from Electron resources.',
  );
  assertContains(
    results,
    artifact,
    'packaged-server:loopback-host',
    mainWindow,
    "HOSTNAME: '127.0.0.1'",
    'Packaged Next server binds to loopback.',
  );
  assertContains(
    results,
    artifact,
    'packaged-server:loopback-url',
    mainWindow,
    "loadURL('http://127.0.0.1:3001')",
    'Packaged renderer loads the loopback app URL.',
  );

  assertContains(
    results,
    artifact,
    'preload:context-bridge-only',
    preload,
    "contextBridge.exposeInMainWorld('electronAPI', electronAPI)",
    'Preload exposes the public renderer API through contextBridge.',
  );
  assertContains(
    results,
    artifact,
    'preload:dev-api-gated',
    preload,
    "process.env.NODE_ENV === 'development'",
    'Development-only preload API remains gated by NODE_ENV.',
  );
  assertContains(
    results,
    artifact,
    'preload:delete-global',
    preload,
    'delete nodeWindow.global',
    'Preload removes window.global.',
  );
  assertContains(
    results,
    artifact,
    'preload:delete-process',
    preload,
    'delete nodeWindow.process',
    'Preload removes window.process.',
  );
  assertContains(
    results,
    artifact,
    'preload:delete-buffer',
    preload,
    'delete nodeWindow.Buffer',
    'Preload removes window.Buffer.',
  );
  assertNotContains(
    results,
    artifact,
    'preload:no-fs-import',
    preload,
    "require('fs')",
    'Preload bundle does not import fs directly.',
  );
  assertNotContains(
    results,
    artifact,
    'preload:no-child-process-import',
    preload,
    "require('child_process')",
    'Preload bundle does not import child_process directly.',
  );

  assertContains(
    results,
    artifact,
    'ipc:read-file-sandboxed',
    mainIpc,
    "ipcMain.handle('read-file'",
    'IPC read-file handler exists in packaged main process.',
  );
  assertContains(
    results,
    artifact,
    'ipc:write-file-sandboxed',
    mainIpc,
    "ipcMain.handle('write-file'",
    'IPC write-file handler exists in packaged main process.',
  );
  assertContains(
    results,
    artifact,
    'ipc:restore-backup-sandboxed',
    mainIpc,
    "ipcMain.handle('restore-backup'",
    'IPC restore-backup handler exists in packaged main process.',
  );
  assertContains(
    results,
    artifact,
    'ipc:uses-path-sandbox',
    mainIpc,
    'resolveWithinSandbox',
    'File IPC handlers call the path sandbox.',
  );
  assertContains(
    results,
    artifact,
    'sandbox:realpath-containment',
    pathSandbox,
    'fs.realpath',
    'Path sandbox resolves real paths before containment decisions.',
  );
  assertContains(
    results,
    artifact,
    'sandbox:relative-containment',
    pathSandbox,
    'path.relative',
    'Path sandbox validates resolved paths with relative containment.',
  );
  assertContains(
    results,
    artifact,
    'sandbox:outside-error',
    pathSandbox,
    'Path outside sandbox root',
    'Path sandbox returns the shared outside-root error.',
  );

  assertContains(
    results,
    artifact,
    'headers:csp',
    securityPolicy,
    'Content-Security-Policy',
    'Packaged security policy emits Content-Security-Policy.',
  );
  assertContains(
    results,
    artifact,
    'headers:no-referrer',
    securityPolicy,
    'no-referrer',
    'Packaged security policy sets Referrer-Policy.',
  );
  assertContains(
    results,
    artifact,
    'headers:frame-deny',
    securityPolicy,
    'DENY',
    'Packaged security policy denies framing.',
  );
  assertContains(
    results,
    artifact,
    'headers:nosniff',
    securityPolicy,
    'nosniff',
    'Packaged security policy disables content sniffing.',
  );

  const resourcesDir = path.dirname(appAsarPath);
  const nextStandaloneDir = path.join(resourcesDir, 'next-standalone');
  assertFileExists(
    results,
    artifact,
    'resources:next-standalone-dir',
    nextStandaloneDir,
    'Packaged output includes resources/next-standalone.',
  );
  assertFileExists(
    results,
    artifact,
    'resources:next-server',
    path.join(nextStandaloneDir, 'server.js'),
    'Packaged standalone payload includes server.js.',
  );
  assertFileExists(
    results,
    artifact,
    'resources:next-required-files',
    path.join(nextStandaloneDir, '.next', 'required-server-files.json'),
    'Packaged standalone payload includes Next required-server-files manifest.',
  );
  assertFileExists(
    results,
    artifact,
    'resources:better-sqlite3-native',
    path.join(
      nextStandaloneDir,
      'node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node',
    ),
    'Packaged standalone payload includes the Electron-ABI better-sqlite3 native module.',
  );

  return results;
}

function summarize(results) {
  const failed = results.filter((result) => !result.ok);
  return {
    checks: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failures: failed,
  };
}

function printTextReport(appAsars, results) {
  console.log('MekStation packaged security audit');
  console.log(`Artifacts: ${appAsars.length}`);

  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL';
    console.log(`${status} ${result.artifact} ${result.id}`);
    if (!result.ok) console.log(`  ${result.detail}`);
  }

  const summary = summarize(results);
  console.log(
    `Summary: checks=${summary.checks} passed=${summary.passed} failed=${summary.failed}`,
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appAsars = options.appAsar
    ? [resolveDesktopPath(options.appAsar)]
    : findAppAsars(resolveDesktopPath(options.outputDir));

  if (appAsars.length === 0) {
    const outputDir = resolveDesktopPath(options.outputDir);
    const message = `No app.asar artifacts found under ${outputDir}. Run npm run test:build first.`;
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            appAsars: [],
            results: [],
            summary: { failed: 1 },
            message,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const results = appAsars.flatMap((appAsarPath) =>
    validateAsarArtifact(appAsarPath),
  );
  const summary = summarize(results);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: summary.failed === 0,
          appAsars: appAsars.map((appAsarPath) =>
            path.relative(desktopDir, appAsarPath),
          ),
          results,
          summary,
        },
        null,
        2,
      ),
    );
  } else {
    printTextReport(appAsars, results);
  }

  process.exit(summary.failed === 0 ? 0 : 1);
}

main();
