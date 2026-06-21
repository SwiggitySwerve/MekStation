#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const nextConfigPath = path.join(root, 'next.config.ts');
const customServerPath = path.join(root, 'server.js');
const standaloneServerPath = path.join(root, '.next', 'standalone', 'server.js');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read ${path.relative(root, filePath)}: ${error.message}`,
    );
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function containsAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function main() {
  const packageJson = JSON.parse(readFile(packageJsonPath));
  const nextConfig = readFile(nextConfigPath);
  const customServer = readFile(customServerPath);
  const standaloneServer = readFile(standaloneServerPath);

  const devScript = packageJson.scripts?.dev ?? '';
  const startScript = packageJson.scripts?.start ?? '';
  const nextStandaloneConfigured =
    nextConfig.includes("output: 'standalone'") ||
    nextConfig.includes('output: "standalone"');

  const customServerHasUpgrade =
    customServer.includes("server.on('upgrade'") ||
    customServer.includes('server.on("upgrade"');
  const standaloneMentionsSocket = containsAny(standaloneServer, [
    '/api/multiplayer/socket',
    'WebSocketServer',
    'bindMultiplayerSocketConnection',
    "server.on('upgrade'",
    'server.on("upgrade"',
  ]);
  const standaloneUsesNextStartServer =
    standaloneServer.includes("require('next')") &&
    standaloneServer.includes('startServer');

  assert(
    devScript.includes('node server.js'),
    `Expected package dev script to boot the custom server; saw: ${devScript}`,
  );
  assert(
    startScript === 'next start',
    `Expected package start script to be Next standalone/start path; saw: ${startScript}`,
  );
  assert(
    nextStandaloneConfigured,
    'Expected next.config.ts to keep output: standalone for packaged builds.',
  );
  assert(
    customServerHasUpgrade,
    'Expected root server.js to carry the dev WebSocket upgrade handler.',
  );
  assert(
    standaloneUsesNextStartServer,
    'Expected .next/standalone/server.js to be the generated Next standalone server.',
  );
  assert(
    !standaloneMentionsSocket,
    'Packaged standalone server now appears to contain multiplayer socket upgrade wiring; replace this gap validator with the success smoke from task 4.2.',
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        packagedMultiplayerReachability: 'gap-confirmed',
        evidence: {
          packageDev: devScript,
          packageStart: startScript,
          nextOutput: 'standalone',
          customServerHasUpgrade,
          standaloneServer: path.relative(root, standaloneServerPath),
          standaloneUsesNextStartServer,
          standaloneHasMultiplayerUpgradeHandler: false,
        },
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
        hint: 'Run npm run build first if .next/standalone/server.js is missing.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
