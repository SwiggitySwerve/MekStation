#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PLAYER_ID_PREFIX = 'pid_';
const PLAYER_ID_BYTES = 20;

const defaultPort = 3700 + (process.pid % 1000);
const port = Number.parseInt(process.env.PORT ?? String(defaultPort), 10);
const host =
  process.env.HOSTNAME && process.env.HOSTNAME !== '0.0.0.0'
    ? process.env.HOSTNAME
    : '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const dbPath =
  process.env.MULTIPLAYER_DB_PATH ??
  path.join(os.tmpdir(), `mekstation-mp-packaged-${process.pid}.db`);

function bytesToBase58(bytes) {
  if (bytes.length === 0) return '';
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1;
  }
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  const out = [];
  while (value > 0n) {
    out.push(BASE58_ALPHABET[Number(value % 58n)]);
    value /= 58n;
  }
  for (let i = 0; i < leadingZeros; i += 1) out.push(BASE58_ALPHABET[0]);
  return out.reverse().join('');
}

function derivePlayerId(publicKeyBytes) {
  return (
    PLAYER_ID_PREFIX + bytesToBase58(publicKeyBytes.slice(0, PLAYER_ID_BYTES))
  );
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function canonicalPayload({ playerId, issuedAt, expiresAt }) {
  return JSON.stringify({ expiresAt, issuedAt, playerId });
}

async function issueWireToken() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );
  const publicKeyBytes = new Uint8Array(
    await webcrypto.subtle.exportKey('raw', keyPair.publicKey),
  );
  const playerId = derivePlayerId(publicKeyBytes);
  const nowMs = Date.now();
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();
  const signatureBytes = new Uint8Array(
    await webcrypto.subtle.sign(
      'Ed25519',
      keyPair.privateKey,
      new TextEncoder().encode(
        canonicalPayload({ playerId, issuedAt, expiresAt }),
      ),
    ),
  );
  const token = {
    playerId,
    issuedAt,
    expiresAt,
    publicKey: toBase64(publicKeyBytes),
    signature: toBase64(signatureBytes),
  };
  return {
    playerId,
    wireToken: Buffer.from(JSON.stringify(token), 'utf8').toString('base64'),
  };
}

function assertHydratedStandaloneServer() {
  const serverPath = path.join(
    process.cwd(),
    '.next',
    'standalone',
    'server.js',
  );
  const configPath = path.join(
    process.cwd(),
    '.next',
    'standalone',
    'server.next-config.json',
  );
  const tsxPath = path.join(
    process.cwd(),
    '.next',
    'standalone',
    'node_modules',
    'tsx',
  );
  const wsPath = path.join(
    process.cwd(),
    '.next',
    'standalone',
    'node_modules',
    'ws',
  );
  const sourcePath = path.join(
    process.cwd(),
    '.next',
    'standalone',
    'src',
    'lib',
    'multiplayer',
    'server',
    'bindMultiplayerSocketConnection.ts',
  );

  for (const filePath of [
    serverPath,
    configPath,
    tsxPath,
    wsPath,
    sourcePath,
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Packaged multiplayer server is not hydrated; missing ${path.relative(
          process.cwd(),
          filePath,
        )}. Run npm run build first.`,
      );
    }
  }

  const server = fs.readFileSync(serverPath, 'utf8');
  if (
    !server.includes('/api/multiplayer/socket') ||
    !server.includes("server.on('upgrade'") ||
    !server.includes('bindMultiplayerSocketConnection')
  ) {
    throw new Error(
      'Packaged server exists but does not contain multiplayer upgrade wiring.',
    );
  }
}

function captureServerOutput(child) {
  let output = '';
  const onData = (chunk) => {
    output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code, signal) => {
    output += `\n[validate] npm run start exited code=${code} signal=${signal}\n`;
  });
  return () => output;
}

async function waitForServer(child, getOutput) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for packaged server readiness. Output:\n${getOutput()}`,
        ),
      );
    }, 60_000);

    const onData = (chunk) => {
      const output = getOutput() + chunk.toString();
      if (output.includes('Ready on')) {
        clearTimeout(timeout);
        resolve(output);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `npm run start exited before readiness (code ${code}). Output:\n${getOutput()}`,
        ),
      );
    });
  });
}

async function createMatch(wireToken, playerId, getOutput) {
  let response;
  try {
    response = await fetch(`${baseUrl}/api/multiplayer/matches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${wireToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        config: { mapRadius: 4, turnLimit: 5 },
        displayName: 'Packaged Socket Smoke Host',
        playerIds: [playerId],
        layout: '1v1',
      }),
    });
  } catch (error) {
    throw new Error(
      `Match create request failed: ${
        error instanceof Error ? error.message : String(error)
      }\nServer output:\n${getOutput()}`,
    );
  }
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `Match create failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function openAndJoin(wsUrl, wireToken, playerId, matchId, getOutput) {
  const url = `${wsUrl}&token=${encodeURIComponent(wireToken)}`;
  const messages = [];
  const clientTrace = [];
  const ws = new WebSocket(url, { perMessageDeflate: false });
  ws.once('open', () => {
    if (ws._socket) {
      ws._socket.on('end', () => {
        clientTrace.push('raw end');
      });
      ws._socket.on('close', (hadError) => {
        clientTrace.push(
          `raw close hadError=${hadError} destroyed=${ws._socket?.destroyed}`,
        );
      });
      ws._socket.on('error', (error) => {
        clientTrace.push(`raw error ${error.message}`);
      });
    }
  });

  try {
    const replayPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for ReplayEnd. Messages:\n${JSON.stringify(
              messages,
              null,
              2,
            )}\nClient trace:\n${clientTrace.join(
              '\n',
            )}\nServer output:\n${getOutput()}`,
          ),
        );
      }, 20_000);

      ws.on('message', (raw) => {
        const parsed = JSON.parse(raw.toString());
        messages.push(parsed);
        if (parsed.kind === 'Close' || parsed.kind === 'Error') {
          clearTimeout(timeout);
          reject(
            new Error(
              `Socket failed with ${JSON.stringify(
                parsed,
                null,
                2,
              )}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
          return;
        }
        if (parsed.kind === 'ReplayEnd') {
          clearTimeout(timeout);
          resolve();
        }
      });
      ws.once('close', (code, reason) => {
        clientTrace.push(`close code=${code} reason=${reason.toString()}`);
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket closed before ReplayEnd (${code} ${reason.toString()}). Messages:\n${JSON.stringify(
                messages,
                null,
                2,
              )}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket errored before ReplayEnd: ${
                error instanceof Error ? error.message : String(error)
              }\nUrl: ${url}\nMessages:\n${JSON.stringify(
                messages,
                null,
                2,
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out opening WebSocket')),
        20_000,
      );
      ws.once('open', () => {
        clearTimeout(timeout);
        clientTrace.push('open');
        resolve();
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        setTimeout(() => {
          reject(
            new Error(
              `Socket failed to open: ${
                error instanceof Error ? error.message : String(error)
              }\nUrl: ${url}\nClient trace:\n${clientTrace.join(
                '\n',
              )}\nServer output:\n${getOutput()}`,
            ),
          );
        }, 500);
      });
    });

    clientTrace.push(`send SessionJoin readyState=${ws.readyState}`);
    ws.send(
      JSON.stringify({
        kind: 'SessionJoin',
        matchId,
        ts: new Date().toISOString(),
        playerId,
        token: wireToken,
        lastSeq: 0,
      }),
      (error) => {
        clientTrace.push(
          error
            ? `send callback error ${error.message}`
            : `send callback ok readyState=${ws.readyState}`,
        );
      },
    );
    clientTrace.push('sent SessionJoin');
    await replayPromise;
  } finally {
    ws.close();
  }

  const kinds = messages.map((message) => message.kind);
  if (!kinds.includes('ReplayStart') || !kinds.includes('ReplayEnd')) {
    throw new Error(`Missing replay frames: ${kinds.join(', ')}`);
  }
  return kinds;
}

function runCoopRuntimeSmoke(match) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    executable,
    [
      'tsx',
      'scripts/validate-multiplayer-coop-runtime.ts',
      '--match-id',
      match.matchId,
      '--room-code',
      match.roomCode,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === 'win32',
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Co-op runtime smoke failed (${result.status}). ${result.error?.message ?? ''}\nSTDOUT:\n${result.stdout ?? ''}\nSTDERR:\n${result.stderr ?? ''}`,
    );
  }
  return JSON.parse(result.stdout);
}

function stopServer(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  assertHydratedStandaloneServer();

  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmExecutable, ['run', 'start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
      NODE_ENV: 'production',
      MULTIPLAYER_SOCKET_TRACE: '1',
      MULTIPLAYER_STORE: process.env.MULTIPLAYER_STORE ?? 'durable',
      MULTIPLAYER_DB_PATH: dbPath,
    },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const getOutput = captureServerOutput(child);

  try {
    await waitForServer(child, getOutput);
    const { wireToken, playerId } = await issueWireToken();
    const match = await createMatch(wireToken, playerId, getOutput);
    const kinds = await openAndJoin(
      match.wsUrl,
      wireToken,
      playerId,
      match.matchId,
      getOutput,
    );
    const coopRuntime = runCoopRuntimeSmoke(match);
    console.log(
      JSON.stringify(
        {
          ok: true,
          packagedMultiplayerReachability: 'socket-upgrade-and-replay-ok',
          startScript: 'npm run start',
          baseUrl,
          dbPath,
          matchId: match.matchId,
          roomCode: match.roomCode,
          frames: kinds,
          coopRuntime,
        },
        null,
        2,
      ),
    );
  } finally {
    stopServer(child);
    await delay(100);
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${dbPath}${suffix}`, { force: true });
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
