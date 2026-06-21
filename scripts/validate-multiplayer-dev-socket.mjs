#!/usr/bin/env node

import { spawn } from 'node:child_process';
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

const port = Number.parseInt(process.env.PORT ?? '3617', 10);
const host = process.env.HOSTNAME ?? 'localhost';
const baseUrl = `http://${host}:${port}`;
const dbPath =
  process.env.MULTIPLAYER_DB_PATH ??
  path.join(os.tmpdir(), `mekstation-mp-smoke-${process.pid}.db`);

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

function captureServerOutput(child) {
  let output = '';
  const onData = (chunk) => {
    output += chunk.toString();
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  return () => output;
}

async function waitForServer(child, getOutput) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for server readiness. Output:\n${getOutput()}`,
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
      reject(new Error(`server.js exited before readiness (code ${code})`));
    });
  });
}

async function createMatch(wireToken, playerId) {
  const response = await fetch(`${baseUrl}/api/multiplayer/matches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${wireToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      config: { mapRadius: 4, turnLimit: 5 },
      displayName: 'Socket Smoke Host',
      playerIds: [playerId],
      layout: '1v1',
    }),
  });
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
  const ws = new WebSocket(url);
  let earlyClose = null;
  ws.on('close', (code, reason) => {
    earlyClose = { code, reason: reason.toString() };
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
        clearTimeout(timeout);
        reject(
          new Error(
            `Socket closed before ReplayEnd (${code} ${reason.toString()}). Messages:\n${JSON.stringify(
              messages,
              null,
              2,
            )}\nServer output:\n${getOutput()}`,
          ),
        );
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out opening WebSocket')),
        20_000,
      );
      ws.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const payload = JSON.stringify({
      kind: 'SessionJoin',
      matchId,
      ts: new Date().toISOString(),
      playerId,
      token: wireToken,
      lastSeq: 0,
    });
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        `WebSocket not open before SessionJoin send: readyState=${ws.readyState} earlyClose=${JSON.stringify(
          earlyClose,
        )}\nServer output:\n${getOutput()}`,
      );
    }
    ws.send(payload);
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

async function main() {
  const child = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
      NODE_ENV: 'development',
      MULTIPLAYER_STORE: process.env.MULTIPLAYER_STORE ?? 'durable',
      MULTIPLAYER_DB_PATH: dbPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const getOutput = captureServerOutput(child);

  try {
    await waitForServer(child, getOutput);
    const { wireToken, playerId } = await issueWireToken();
    const match = await createMatch(wireToken, playerId);
    const kinds = await openAndJoin(
      match.wsUrl,
      wireToken,
      playerId,
      match.matchId,
      getOutput,
    );
    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          dbPath,
          matchId: match.matchId,
          roomCode: match.roomCode,
          frames: kinds,
        },
        null,
        2,
      ),
    );
  } finally {
    child.kill();
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
