/* eslint-disable */
/**
 * Custom Next.js server with WebSocket support.
 *
 * Wave 1 of Phase 4 — boots Next.js (dev or prod) AND attaches a `ws`
 * upgrade handler to `/api/multiplayer/socket` on the same HTTP port.
 * Keeps the Pages Router HMR + serverless-style API routes intact.
 *
 * Design notes:
 *   - `npm run dev` routes through this file. Production/package
 *     reachability is tracked separately because `next start` and the
 *     standalone build can still shadow this custom upgrade handler.
 *   - Upgrade routing: we parse the request URL once, dispatch
 *     /api/multiplayer/socket through the WS server, and call
 *     `socket.destroy()` for any other upgrade path so we don't keep
 *     dangling sockets.
 *   - Auth in Wave 1 is a placeholder: presence of a `token` query
 *     param + a known `matchId`. Wave 2 adds Ed25519 signature
 *     verification.
 *
 * @spec openspec/specs/multiplayer-server/spec.md
 */

const { createPublicKey, verify: verifySignature } = require('node:crypto');
const fs = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { parse } = require('node:url');
const next = require('next');
const { WebSocketServer } = require('ws');

const STANDALONE_NEXT_CONFIG_PATH = path.join(
  __dirname,
  'server.next-config.json',
);
const isStandaloneRuntime =
  fs.existsSync(path.join(__dirname, '.next')) &&
  fs.existsSync(STANDALONE_NEXT_CONFIG_PATH);
let standaloneNextConfig = null;
const traceMultiplayerSocket = process.env.MULTIPLAYER_SOCKET_TRACE === '1';

function traceSocket(message) {
  if (!traceMultiplayerSocket) return;
  // eslint-disable-next-line no-console
  console.log(`[mp-socket:trace] ${message}`);
}

if (isStandaloneRuntime) {
  process.env.NODE_ENV = 'production';
  process.chdir(__dirname);
  try {
    standaloneNextConfig = JSON.parse(
      fs.readFileSync(STANDALONE_NEXT_CONFIG_PATH, 'utf8'),
    );
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG =
      JSON.stringify(standaloneNextConfig);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mp-boot] failed to read standalone Next config', err);
    process.exit(1);
  }
}

// =============================================================================
// Inlined Wave 2 token verification (mirror of src/lib/multiplayer/server/auth.ts)
//
// server.js is plain CommonJS so it can't import the TS verification path
// directly. The logic below is intentionally a small mirror of `auth.ts`
// — both must produce byte-identical canonical signing payloads or
// every upgrade will fail. If you change the canonical payload or the
// playerId derivation here, also change the TS side (and vice versa).
// =============================================================================

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PLAYER_ID_PREFIX = 'pid_';
const PLAYER_ID_BYTES = 20;
const CLOCK_DRIFT_MS = 10_000;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

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

function deriveServerPlayerId(publicKeyBytes) {
  if (publicKeyBytes.length < PLAYER_ID_BYTES) return null;
  return (
    PLAYER_ID_PREFIX + bytesToBase58(publicKeyBytes.slice(0, PLAYER_ID_BYTES))
  );
}

function canonicalPayload(playerId, issuedAt, expiresAt) {
  // Object key order MUST be alphabetical — matches TS auth.ts canonicalTokenPayload.
  return JSON.stringify({ expiresAt, issuedAt, playerId });
}

function createEd25519PublicKey(publicKeyBytes) {
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
    format: 'der',
    type: 'spki',
  });
}

function decodeWireToken(wire) {
  if (typeof wire !== 'string' || wire.length === 0) return null;
  let json;
  try {
    json = Buffer.from(wire, 'base64').toString('utf8');
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { playerId, issuedAt, expiresAt, publicKey, signature } = parsed;
  if (
    typeof playerId !== 'string' ||
    typeof issuedAt !== 'string' ||
    typeof expiresAt !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof signature !== 'string'
  ) {
    return null;
  }
  return { playerId, issuedAt, expiresAt, publicKey, signature };
}

/**
 * Verify a wire-format token. Returns `{ ok: true, playerId }` on
 * success, or `{ ok: false, reason }` on failure.
 */
function verifyWireToken(wire, nowMs = Date.now()) {
  traceSocket('verify start');
  const token = decodeWireToken(wire);
  if (!token) return { ok: false, reason: 'malformed' };
  traceSocket(`verify decoded playerId=${token.playerId}`);

  const expiresMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresMs)) return { ok: false, reason: 'malformed' };
  if (expiresMs <= nowMs) return { ok: false, reason: 'expired' };

  const issuedMs = Date.parse(token.issuedAt);
  if (!Number.isFinite(issuedMs)) return { ok: false, reason: 'malformed' };
  if (issuedMs > nowMs + CLOCK_DRIFT_MS) {
    return { ok: false, reason: 'clock-drift' };
  }

  let publicKeyBytes;
  let signatureBytes;
  try {
    publicKeyBytes = new Uint8Array(Buffer.from(token.publicKey, 'base64'));
    signatureBytes = new Uint8Array(Buffer.from(token.signature, 'base64'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  traceSocket(
    `verify bytes publicKey=${publicKeyBytes.length} signature=${signatureBytes.length}`,
  );
  const derivedId = deriveServerPlayerId(publicKeyBytes);
  if (!derivedId || derivedId !== token.playerId) {
    return { ok: false, reason: 'pid-mismatch' };
  }

  const payload = canonicalPayload(
    token.playerId,
    token.issuedAt,
    token.expiresAt,
  );
  const payloadBytes = Buffer.from(payload, 'utf8');
  let verified = false;
  try {
    traceSocket('verify create public key');
    const key = createEd25519PublicKey(publicKeyBytes);
    traceSocket('verify signature');
    verified = verifySignature(
      null,
      payloadBytes,
      key,
      Buffer.from(signatureBytes),
    );
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }
  traceSocket(`verify complete ok=${verified}`);
  if (!verified) return { ok: false, reason: 'bad-signature' };

  return { ok: true, playerId: token.playerId };
}

// =============================================================================
// Boot Next.js
// =============================================================================

const dev =
  process.env.NODE_ENV !== 'production' &&
  !isStandaloneRuntime &&
  process.env.npm_lifecycle_event !== 'start';
const port = parseInt(process.env.PORT ?? '3600', 10);
const hostname = process.env.HOSTNAME ?? 'localhost';

const app = next({
  dev,
  hostname,
  port,
  dir: isStandaloneRuntime ? __dirname : process.cwd(),
  ...(standaloneNextConfig ? { conf: standaloneNextConfig } : {}),
});
const handle = app.getRequestHandler();

// =============================================================================
// WebSocket setup (lazy — we don't `require` the server lib until the
// `ws` library is installed, which Wave 1 guarantees)
// =============================================================================

const WS_UPGRADE_PATH = '/api/multiplayer/socket';
const E2E_READY_PATH = '/__playwright_e2e_ready__';

function isE2EReadyRequest(parsedUrl) {
  if (parsedUrl.pathname !== E2E_READY_PATH) return false;
  const requestRunId = Array.isArray(parsedUrl.query.runId)
    ? parsedUrl.query.runId[0]
    : parsedUrl.query.runId;
  return (
    process.env.NEXT_PUBLIC_E2E_MODE === 'true' &&
    typeof process.env.PLAYWRIGHT_E2E_RUN_ID === 'string' &&
    process.env.PLAYWRIGHT_E2E_RUN_ID.length > 0 &&
    requestRunId === process.env.PLAYWRIGHT_E2E_RUN_ID
  );
}

function sendWebSocketUpgradeRequired(res) {
  res.statusCode = 426;
  res.setHeader('Connection', 'Upgrade');
  res.setHeader('Upgrade', 'websocket');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      error: 'Upgrade Required',
      hint: `Open a WebSocket connection to ${WS_UPGRADE_PATH}?matchId=...&token=...`,
    }),
  );
}

let multiplayerRuntime = null;

/**
 * Lazily resolve the multiplayer runtime. `server.js` is CommonJS while
 * the authoritative host/registry live in TypeScript with `@/` aliases,
 * so the custom server installs the repo-local or hydrated standalone
 * `tsx` require hook before loading those modules.
 */
function loadMultiplayerRuntime() {
  if (multiplayerRuntime) return multiplayerRuntime;
  require('tsx/cjs');
  const registryModule = require('./src/lib/multiplayer/server/MatchHostRegistry.ts');
  const socketModule = require('./src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts');
  multiplayerRuntime = {
    bootstrapMultiplayerServer: registryModule.bootstrapMultiplayerServer,
    bindMultiplayerSocketConnection:
      socketModule.bindMultiplayerSocketConnection,
  };
  return multiplayerRuntime;
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sendTerminalSocketFrame(ws, matchId, code, reason, closeCode = 1011) {
  try {
    ws.send(
      JSON.stringify({
        kind: 'Error',
        matchId: matchId ?? '',
        ts: new Date().toISOString(),
        code,
        reason,
      }),
    );
    ws.send(
      JSON.stringify({
        kind: 'Close',
        matchId: matchId ?? '',
        ts: new Date().toISOString(),
        code,
        reason,
      }),
    );
  } catch {
    // Socket may already be half-closed.
  } finally {
    try {
      ws.close(closeCode, reason);
    } catch {
      // already closed
    }
  }
}

app
  .prepare()
  .then(async () => {
    try {
      await loadMultiplayerRuntime().bootstrapMultiplayerServer();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mp-boot] runtime load failed', err);
    }

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url ?? '/', true);
        if (parsedUrl.pathname === E2E_READY_PATH) {
          if (isE2EReadyRequest(parsedUrl)) {
            res.statusCode = 204;
          } else {
            res.statusCode = 404;
          }
          res.end();
          return;
        }
        if (parsedUrl.pathname === WS_UPGRADE_PATH) {
          sendWebSocketUpgradeRequired(res);
          return;
        }
        await handle(req, res, parsedUrl);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling request', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    server.timeout = 0;
    server.keepAliveTimeout = 0;
    server.requestTimeout = 0;
    server.headersTimeout = 0;
    server.on('connection', (socket) => {
      socket.setTimeout(0);
    });

    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    });

    wss.on('connection', (ws, req) => {
      const verifiedPlayerId = req._mpVerifiedPlayerId;
      const diceSeed = req._mpDiceSeed;
      const url = parse(req.url ?? '/', true);
      const matchId = firstQueryValue(url.query.matchId);
      if (typeof matchId !== 'string' || matchId.length === 0) {
        sendTerminalSocketFrame(ws, '', 'UNKNOWN_MATCH', 'missing-match', 1008);
        return;
      }
      if (
        typeof verifiedPlayerId !== 'string' ||
        verifiedPlayerId.length === 0
      ) {
        sendTerminalSocketFrame(
          ws,
          matchId,
          'AUTH_REJECTED',
          'missing-verified-player',
          1008,
        );
        return;
      }
      // eslint-disable-next-line no-console
      console.log(
        `[mp-socket] connection accepted matchId=${matchId} playerId=${verifiedPlayerId}${
          diceSeed != null ? ` diceSeed=${diceSeed}` : ''
        }`,
      );
      ws.on('close', (code, reason) => {
        // eslint-disable-next-line no-console
        console.log(
          `[mp-socket] socket closed matchId=${matchId} code=${code} reason=${reason.toString()}`,
        );
        traceSocket(
          `close details matchId=${matchId} closeFrameReceived=${ws._closeFrameReceived} closeFrameSent=${ws._closeFrameSent} socketDestroyed=${ws._socket?.destroyed}`,
        );
      });
      ws.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(`[mp-socket] socket error matchId=${matchId}`, err);
      });
      if (ws._socket) {
        ws._socket.on('end', () => {
          traceSocket(`raw socket end matchId=${matchId}`);
        });
        ws._socket.on('close', (hadError) => {
          traceSocket(
            `raw socket close matchId=${matchId} hadError=${hadError} destroyed=${ws._socket?.destroyed}`,
          );
        });
        ws._socket.on('error', (err) => {
          traceSocket(`raw socket error matchId=${matchId} ${err.message}`);
        });
      }
      try {
        void loadMultiplayerRuntime()
          .bindMultiplayerSocketConnection({
            socket: ws,
            matchId,
            verifiedPlayerId,
            ...(diceSeed != null ? { diceSeed } : {}),
            logger: console,
          })
          .then((bound) => {
            if (bound) {
              // eslint-disable-next-line no-console
              console.log(
                `[mp-socket] bound matchId=${matchId} connection=${bound.connectionKey}`,
              );
            }
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[mp-socket] bind failed', err);
            sendTerminalSocketFrame(
              ws,
              matchId,
              'INTERNAL_ERROR',
              'bind-failed',
            );
          });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[mp-socket] runtime load failed', err);
        sendTerminalSocketFrame(
          ws,
          matchId,
          'INTERNAL_ERROR',
          'runtime-unavailable',
        );
      }
    });

    // Cache Next.js's upgrade handler so we can delegate non-MP WS upgrades
    // to it (HMR uses /_next/webpack-hmr in dev). PT-005: without this,
    // every browser-loaded page in `npm run dev` logged a critical
    // WebSocket connection failure, which broke the e2e baseline gate
    // `app-routes.spec.ts:4` ("homepage loads without errors").
    const nextUpgradeHandler =
      typeof app.getUpgradeHandler === 'function'
        ? app.getUpgradeHandler()
        : null;

    // Path-prefix whitelist for upgrades that we should pass through to
    // Next.js instead of destroying. Currently just the webpack-HMR endpoint
    // (`/_next/webpack-hmr`). Keep this list tight — anything not on it
    // still gets `socket.destroy()` so a hostile path can't open a long-
    // lived socket on the multiplayer port.
    function isNextInternalUpgradePath(pathname) {
      return pathname === '/_next/webpack-hmr';
    }

    server.on('upgrade', async (req, socket, head) => {
      try {
        const parsedUrl = parse(req.url ?? '/', true);
        if (parsedUrl.pathname !== WS_UPGRADE_PATH) {
          // Delegate the HMR upgrade to Next.js when we're running the dev
          // server. Anything else (unknown path) is still destroyed.
          if (
            dev &&
            nextUpgradeHandler &&
            isNextInternalUpgradePath(parsedUrl.pathname)
          ) {
            try {
              const ret = nextUpgradeHandler(req, socket, head);
              if (ret && typeof ret.catch === 'function') {
                ret.catch((err) => {
                  // eslint-disable-next-line no-console
                  console.error('[next-upgrade] handler error', err);
                  try {
                    socket.destroy();
                  } catch {
                    /* socket already closed */
                  }
                });
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('[next-upgrade] sync error', err);
              socket.destroy();
            }
          } else {
            socket.destroy();
          }
          return;
        }
        const matchId = firstQueryValue(parsedUrl.query.matchId);
        const token = firstQueryValue(parsedUrl.query.token);
        socket.setTimeout(0);
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 30_000);
        // eslint-disable-next-line no-console
        console.log(
          `[mp-socket] upgrade requested matchId=${
            typeof matchId === 'string' ? matchId : ''
          } hasToken=${typeof token === 'string' && token.length > 0}`,
        );
        if (!matchId || !token) {
          // Missing either parameter — 400 over the raw socket so a
          // browser sees a meaningful error instead of a hung handshake.
          socket.write('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n');
          socket.destroy();
          return;
        }
        // Wave 2: cryptographically verify the bearer token before
        // upgrading. On failure, return 401 over the raw socket so the
        // client sees a clean rejection (the handshake never completes,
        // so there's no WS frame to send — this is the standard ws
        // server pattern).
        const verification = verifyWireToken(token);
        // eslint-disable-next-line no-console
        console.log(
          `[mp-socket] upgrade verification result matchId=${matchId} ok=${verification.ok}${
            verification.ok ? '' : ` reason=${verification.reason}`
          }`,
        );
        if (!verification.ok) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mp-socket] upgrade rejected matchId=${matchId} reason=${verification.reason}`,
          );
          socket.write(
            'HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n',
          );
          socket.destroy();
          return;
        }
        // eslint-disable-next-line no-console
        console.log(
          `[mp-socket] upgrade verified matchId=${matchId} playerId=${verification.playerId}`,
        );
        // Stash the verified id on the request so the connection
        // handler can attach it to the per-socket bookkeeping. Using a
        // private-prefixed property avoids collisions with existing
        // request fields.
        req._mpVerifiedPlayerId = verification.playerId;
        // Wave 3a: optional debug seed for bug reproduction. Parse a
        // finite integer from `?seed=N`; ignore anything else so a
        // malformed query can't destabilize production. Off by default.
        const rawSeed = parsedUrl.query.seed;
        const seedString = Array.isArray(rawSeed) ? rawSeed[0] : rawSeed;
        if (typeof seedString === 'string' && seedString.length > 0) {
          const seedValue = Number.parseInt(seedString, 10);
          if (Number.isFinite(seedValue)) {
            req._mpDiceSeed = seedValue;
          }
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Upgrade error', err);
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      }
    });
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(
        `> Ready on http://${hostname}:${port} (multiplayer socket: ${WS_UPGRADE_PATH})`,
      );
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to prepare Next.js app', err);
    process.exit(1);
  });
