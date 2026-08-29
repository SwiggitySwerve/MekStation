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
 *   - Auth: an Ed25519-signed wire token carried in the
 *     `Sec-WebSocket-Protocol` header, plus a known `matchId`. A token
 *     in the query string is refused rather than accepted.
 *   - The `?seed=N` debug dice seed is refused in production: it is
 *     client-supplied and would let the caller pick the server's dice.
 *
 * @spec openspec/specs/multiplayer-server/spec.md
 */

const { createPublicKey, verify: verifySignature } = require('node:crypto');
const fs = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { parse } = require('node:url');

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ??= 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= 'true';

const STANDALONE_NEXT_CONFIG_PATH = path.join(
  __dirname,
  'server.next-config.json',
);
const nextDir = path.join(__dirname, '.next');
const hasPackagedConfig = fs.existsSync(STANDALONE_NEXT_CONFIG_PATH);
const hasNextDir = fs.existsSync(nextDir) && fs.statSync(nextDir).isDirectory();
if (hasPackagedConfig && !hasNextDir) {
  console.error('[mp-boot] packaged layout incomplete');
  process.exit(1);
}
const isStandaloneRuntime = hasPackagedConfig && hasNextDir;
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

function resolveListenerHostname() {
  const raw = process.env.HOSTNAME;
  // prettier-ignore
  if (isStandaloneRuntime ? raw !== undefined && raw !== '127.0.0.1' : raw !== undefined && raw !== 'localhost' && raw !== '127.0.0.1') {
    console.error(`[mp-boot] invalid HOSTNAME ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return isStandaloneRuntime ? '127.0.0.1' : (raw ?? 'localhost');
}
/**
 * Refuse to boot a non-test process that carries fault configuration
 * (umbrella task 20.2).
 *
 * server.js is plain CommonJS and cannot import the TS module, so this
 * mirrors `assertNoFaultControlsConfigured` in
 * `src/lib/testing/faultControls.ts` — that module is the source of
 * truth and its unit tests own the semantics. The mirror can drift,
 * which is why a sibling test spawns THIS file rather than trusting it.
 *
 * Exiting rather than ignoring is the point. A process that boots and
 * merely declines to honour fault config is one refactor away from
 * honouring it; a process that refuses to start cannot rot that way.
 */
/**
 * Read the `?seed=N` debug dice seed, and REFUSE it in production.
 *
 * This parameter selects `SeededDiceRoller` for the whole match, and it
 * arrives on the WebSocket upgrade URL - which means the actor who sets
 * it is a CLIENT, not an operator. `SeededRandom` is Mulberry32, so a
 * client that chose the seed can compute every subsequent server d6
 * locally: initiative, to-hit, hit location, crits. Whoever opens the
 * first socket on a match would decide its dice, and the opponent would
 * have no way to notice.
 *
 * That is precisely what the crypto-backed default exists to prevent -
 * `openspec/specs/multiplayer-server/spec.md` requires the server to be
 * the sole source of randomness, to never trust a value claimed by a
 * client, and permits the seed only in a debug mode that is "never
 * permitted in production".
 *
 * IGNORE, DO NOT EXIT. The sibling `assertNoFaultControlsConfigured`
 * kills the process, and that is right for an operator-set env var
 * read once at boot. This one is client-set and read per connection, so
 * exiting would hand any client a one-request kill switch. The seed is
 * simply not an affordance that exists in production; the warning is
 * there so a misconfigured deployment is still visible.
 */
function readDebugDiceSeed(parsedUrl, matchId) {
  const rawSeed = parsedUrl.query.seed;
  const seedString = Array.isArray(rawSeed) ? rawSeed[0] : rawSeed;
  if (typeof seedString !== 'string' || seedString.length === 0) {
    return undefined;
  }
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[mp-socket] DICE_SEED_REFUSED_IN_PRODUCTION matchId=${
        typeof matchId === 'string' ? matchId : ''
      }`,
    );
    return undefined;
  }
  // Parse a finite integer; ignore anything else so a malformed query
  // cannot destabilize the handler.
  const seedValue = Number.parseInt(seedString, 10);
  return Number.isFinite(seedValue) ? seedValue : undefined;
}

function assertNoFaultControlsConfigured() {
  const configured = process.env.MEKSTATION_FAULT_CONTROLS;
  if (configured === undefined || configured.trim() === '') return;
  if (process.env.NODE_ENV === 'test') return;
  console.error(
    `[mp-boot] FAULT_CONTROLS_IN_PRODUCTION MEKSTATION_FAULT_CONTROLS=${configured}`,
  );
  process.exit(1);
}
assertNoFaultControlsConfigured();

const hostname = resolveListenerHostname();
const next = require('next');
const { WebSocketServer } = require('ws');
const {
  serveDevClientMiddlewareManifest,
} = require('./src/lib/server/devClientMiddlewareManifest.js');

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

function canonicalPayload(playerId, issuedAt, expiresAt, scope) {
  // Object key order MUST be alphabetical — matches TS auth.ts canonicalTokenPayload.
  if (
    scope &&
    typeof scope === 'object' &&
    (scope.kind === 'match' || scope.kind === 'campaign-session') &&
    typeof scope.id === 'string' &&
    scope.id.length > 0
  ) {
    return JSON.stringify({
      expiresAt,
      issuedAt,
      playerId,
      scope: { id: scope.id, kind: scope.kind },
    });
  }
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
  const { playerId, issuedAt, expiresAt, publicKey, signature, scope } = parsed;
  if (
    typeof playerId !== 'string' ||
    typeof issuedAt !== 'string' ||
    typeof expiresAt !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof signature !== 'string'
  ) {
    return null;
  }
  if (scope !== undefined) {
    if (
      !scope ||
      typeof scope !== 'object' ||
      (scope.kind !== 'match' && scope.kind !== 'campaign-session') ||
      typeof scope.id !== 'string' ||
      scope.id.length === 0
    ) {
      return null;
    }
  }
  return {
    playerId,
    issuedAt,
    expiresAt,
    publicKey,
    signature,
    ...(scope !== undefined
      ? { scope: { kind: scope.kind, id: scope.id } }
      : {}),
  };
}

// Inlined mirror of src/lib/multiplayer/socketCredentialProtocol.ts.
// server.js is plain CommonJS at the repo root and cannot import the
// TypeScript module, so the constants and the decode are duplicated
// here and pinned by a test that reads BOTH files.
const WS_PROTOCOL_VERSION = 'mekstation.v1';
const WS_CREDENTIAL_PREFIX = 'mekstation.token.';

/** Reverse the base64url transform applied to the wire token. */
function fromBase64Url(base64url) {
  const restored = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = restored.length % 4;
  if (remainder === 0 || remainder === 1) return restored;
  return restored + '='.repeat(4 - remainder);
}

/**
 * Pull the wire token out of `Sec-WebSocket-Protocol`. Returns null
 * when no credential subprotocol was offered, which the caller must
 * treat as unauthenticated - never as allow.
 */
function readCredentialProtocol(header) {
  if (!header) return null;
  for (const raw of String(header).split(',')) {
    const entry = raw.trim();
    if (!entry.startsWith(WS_CREDENTIAL_PREFIX)) continue;
    const encoded = entry.slice(WS_CREDENTIAL_PREFIX.length);
    if (encoded.length === 0) return null;
    return fromBase64Url(encoded);
  }
  return null;
}

/**
 * Verify a wire-format token. Returns `{ ok: true, playerId }` on
 * success, or `{ ok: false, reason }` on failure.
 */
function verifyWireToken(wire, nowMs = Date.now(), expectedScope) {
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
    token.scope,
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

  // A token with no scope is still accepted when expectedScope was
  // passed — transition residual; cutover is future work (reject
  // scopeless socket tokens).
  if (token.scope) {
    if (!expectedScope) return { ok: false, reason: 'scope-unchecked' };
    if (
      token.scope.kind !== expectedScope.kind ||
      token.scope.id !== expectedScope.id
    ) {
      return { ok: false, reason: 'scope-mismatch' };
    }
  }

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
const appDir = isStandaloneRuntime ? __dirname : process.cwd();

const app = next({
  dev,
  hostname,
  port,
  dir: appDir,
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
      hint: `Open a WebSocket connection to ${WS_UPGRADE_PATH}?matchId=... with the credential in the Sec-WebSocket-Protocol header`,
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
  const campaignSocketModule = require('./src/lib/multiplayer/server/bindCampaignSyncConnection.ts');
  const membershipModule = require('./src/lib/multiplayer/server/campaignSessionMembershipPort.ts');
  const forceClaimModule = require('./src/lib/multiplayer/server/campaignForceClaimPort.ts');
  // The socket graph holds its OWN copy of the SQLite singleton - the
  // tsx require hook builds a module graph separate from Next's API
  // bundle, and only the API side ever called initialize(). The
  // membership and force-claim ports read durable rows on every
  // campaign join, so the first dispatch threw "Database not
  // initialized" and closed the socket. initialize() is idempotent and
  // shares DATABASE_PATH with the API side; WAL makes the two graphs'
  // connections to the same file safe.
  const sqliteModule = require('./src/services/persistence/SQLiteService.ts');
  sqliteModule.getSQLiteService().initialize();
  multiplayerRuntime = {
    bootstrapMultiplayerServer: registryModule.bootstrapMultiplayerServer,
    bindMultiplayerSocketConnection:
      socketModule.bindMultiplayerSocketConnection,
    bindCampaignSyncConnection: campaignSocketModule.bindCampaignSyncConnection,
    // Supplied here rather than defaulted inside the bind function: a
    // default would reach for SQLite from every test that binds a
    // socket, and those tests have no database (umbrella 6.2).
    campaignSessionMembership:
      membershipModule.createCampaignSessionMembershipPort(),
    // Same reasoning as the membership port above: supplied here so a
    // socket test never reaches for SQLite just by binding.
    campaignForceClaims: forceClaimModule.createCampaignForceClaimPort(),
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
        if (
          serveDevClientMiddlewareManifest({
            dev,
            method: req.method,
            pathname: parsedUrl.pathname,
            response: res,
            rootDir: appDir,
          })
        ) {
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
      // Echo ONLY the version marker. Selecting the credential
      // subprotocol would put the token straight back into a response
      // header, undoing the reason it left the URL. `ws` only calls
      // this when the client offered protocols at all.
      handleProtocols: (protocols) =>
        protocols.has(WS_PROTOCOL_VERSION) ? WS_PROTOCOL_VERSION : false,
    });

    wss.on('connection', (ws, req) => {
      const verifiedPlayerId = req._mpVerifiedPlayerId;
      const diceSeed = req._mpDiceSeed;
      const url = parse(req.url ?? '/', true);
      const matchId = firstQueryValue(url.query.matchId);
      const channel = firstQueryValue(url.query.channel);
      const isCampaignSync = channel === 'campaign';
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
        `[mp-socket] connection accepted matchId=${matchId} channel=${
          isCampaignSync ? 'campaign' : 'combat'
        } playerId=${verifiedPlayerId}${
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
        const runtime = loadMultiplayerRuntime();
        const bindPromise = isCampaignSync
          ? runtime.bindCampaignSyncConnection({
              socket: ws,
              matchId,
              verifiedPlayerId,
              logger: console,
              membership: runtime.campaignSessionMembership,
              forceClaims: runtime.campaignForceClaims,
            })
          : runtime.bindMultiplayerSocketConnection({
              socket: ws,
              matchId,
              verifiedPlayerId,
              ...(diceSeed != null ? { diceSeed } : {}),
              logger: console,
            });
        void bindPromise
          .then((bound) => {
            if (bound) {
              // eslint-disable-next-line no-console
              console.log(
                `[mp-socket] bound matchId=${matchId} channel=${
                  isCampaignSync ? 'campaign' : 'combat'
                }${
                  'connectionKey' in bound
                    ? ` connection=${bound.connectionKey}`
                    : ''
                }`,
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

    /**
     * Delegate approved non-multiplayer upgrades to Next.js or destroy them.
     */
    function delegateOrDestroyNonMpUpgrade(req, socket, head, parsedUrl) {
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
        return;
      }
      socket.destroy();
    }

    /**
     * Apply the raw-socket settings required before a multiplayer upgrade.
     */
    function configureMpUpgradeSocket(socket) {
      socket.setTimeout(0);
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 30_000);
    }

    /**
     * Send a raw HTTP rejection and close the upgrade socket.
     */
    function rejectUpgrade(socket, statusLine) {
      socket.write(`HTTP/1.1 ${statusLine}\r\nContent-Length: 0\r\n\r\n`);
      socket.destroy();
    }

    /**
     * Verify a multiplayer token, attach request metadata, and complete WS setup.
     */
    function attachVerifiedMpUpgrade(
      req,
      socket,
      head,
      parsedUrl,
      matchId,
      token,
    ) {
      if (!matchId || !token) {
        // Missing either parameter — 400 over the raw socket so a
        // browser sees a meaningful error instead of a hung handshake.
        rejectUpgrade(socket, '400 Bad Request');
        return;
      }
      // Wave 2: cryptographically verify the bearer token before
      // upgrading. On failure, return 401 over the raw socket so the
      // client sees a clean rejection (the handshake never completes,
      // so there's no WS frame to send — this is the standard ws
      // server pattern).
      const channel = firstQueryValue(parsedUrl.query.channel);
      const expectedScope =
        channel === 'campaign'
          ? { kind: 'campaign-session', id: matchId }
          : { kind: 'match', id: matchId };
      const verification = verifyWireToken(token, Date.now(), expectedScope);
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
        rejectUpgrade(socket, '401 Unauthorized');
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
      // Wave 3a: optional debug seed for bug reproduction, gated below.
      const debugSeed = readDebugDiceSeed(parsedUrl, matchId);
      if (debugSeed !== undefined) {
        req._mpDiceSeed = debugSeed;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }

    server.on('upgrade', async (req, socket, head) => {
      try {
        const parsedUrl = parse(req.url ?? '/', true);
        if (parsedUrl.pathname !== WS_UPGRADE_PATH) {
          delegateOrDestroyNonMpUpgrade(req, socket, head, parsedUrl);
          return;
        }
        const matchId = firstQueryValue(parsedUrl.query.matchId);
        const token = readCredentialProtocol(
          req.headers['sec-websocket-protocol'],
        );
        configureMpUpgradeSocket(socket);
        // A credential in the query string is REFUSED, not accepted as
        // a fallback. Accepting both would leave every caller free to
        // keep logging the token, so the header would be an option
        // rather than a guarantee.
        if (firstQueryValue(parsedUrl.query.token)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mp-socket] upgrade rejected matchId=${
              typeof matchId === 'string' ? matchId : ''
            } reason=token-in-url`,
          );
          rejectUpgrade(socket, '400 Bad Request');
          return;
        }
        // eslint-disable-next-line no-console
        console.log(
          `[mp-socket] upgrade requested matchId=${
            typeof matchId === 'string' ? matchId : ''
          } hasToken=${typeof token === 'string' && token.length > 0}`,
        );
        attachVerifiedMpUpgrade(req, socket, head, parsedUrl, matchId, token);
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
    server.listen({ port, host: hostname }, () => {
      if (isStandaloneRuntime) {
        const addr = server.address();
        // prettier-ignore
        if (!addr || typeof addr === 'string' || addr.address !== hostname || addr.port !== port) process.exit(1);
        const family =
          addr.family === 6 || addr.family === 'IPv6' ? 'IPv6' : 'IPv4';
        // prettier-ignore
        const line = `MEKSTATION_LISTENER_READY ${JSON.stringify({ schema: 'mekstation-packaged-listener-ready/v1', configuredHostname: hostname, boundAddress: addr.address, family, port: addr.port })}\n`;
        if (family !== 'IPv4' || Buffer.byteLength(line) > 1024)
          process.exit(1);
        process.stdout.write(line);
      }
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
