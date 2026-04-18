/* eslint-disable */
/**
 * Custom Next.js server with WebSocket support.
 *
 * Wave 1 of Phase 4 — boots Next.js (dev or prod) AND attaches a `ws`
 * upgrade handler to `/api/multiplayer/socket` on the same HTTP port.
 * Keeps the Pages Router HMR + serverless-style API routes intact.
 *
 * Design notes:
 *   - Only `npm run dev` routes through this file. Production builds
 *     (`next build` / `next start`) keep using the standard server
 *     because we don't yet target a multiplayer-enabled production
 *     deploy in Phase 4. A later wave can add a `npm run mp-start`
 *     script that runs `node server.js` with NODE_ENV=production.
 *   - Upgrade routing: we parse the request URL once, dispatch
 *     /api/multiplayer/socket through the WS server, and call
 *     `socket.destroy()` for any other upgrade path so we don't keep
 *     dangling sockets.
 *   - Auth in Wave 1 is a placeholder: presence of a `token` query
 *     param + a known `matchId`. Wave 2 adds Ed25519 signature
 *     verification.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

const { createServer } = require("node:http");
const { parse } = require("node:url");
const { webcrypto } = require("node:crypto");
const next = require("next");
const { WebSocketServer } = require("ws");

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
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const PLAYER_ID_PREFIX = "pid_";
const PLAYER_ID_BYTES = 20;
const CLOCK_DRIFT_MS = 10_000;

function bytesToBase58(bytes) {
  if (bytes.length === 0) return "";
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
  return out.reverse().join("");
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

function decodeWireToken(wire) {
  if (typeof wire !== "string" || wire.length === 0) return null;
  let json;
  try {
    json = Buffer.from(wire, "base64").toString("utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { playerId, issuedAt, expiresAt, publicKey, signature } = parsed;
  if (
    typeof playerId !== "string" ||
    typeof issuedAt !== "string" ||
    typeof expiresAt !== "string" ||
    typeof publicKey !== "string" ||
    typeof signature !== "string"
  ) {
    return null;
  }
  return { playerId, issuedAt, expiresAt, publicKey, signature };
}

/**
 * Verify a wire-format token. Returns `{ ok: true, playerId }` on
 * success, or `{ ok: false, reason }` on failure.
 */
async function verifyWireToken(wire, nowMs = Date.now()) {
  const token = decodeWireToken(wire);
  if (!token) return { ok: false, reason: "malformed" };

  const expiresMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresMs)) return { ok: false, reason: "malformed" };
  if (expiresMs <= nowMs) return { ok: false, reason: "expired" };

  const issuedMs = Date.parse(token.issuedAt);
  if (!Number.isFinite(issuedMs)) return { ok: false, reason: "malformed" };
  if (issuedMs > nowMs + CLOCK_DRIFT_MS) {
    return { ok: false, reason: "clock-drift" };
  }

  let publicKeyBytes;
  let signatureBytes;
  try {
    publicKeyBytes = new Uint8Array(Buffer.from(token.publicKey, "base64"));
    signatureBytes = new Uint8Array(Buffer.from(token.signature, "base64"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const derivedId = deriveServerPlayerId(publicKeyBytes);
  if (!derivedId || derivedId !== token.playerId) {
    return { ok: false, reason: "pid-mismatch" };
  }

  const payload = canonicalPayload(
    token.playerId,
    token.issuedAt,
    token.expiresAt,
  );
  const payloadBytes = new TextEncoder().encode(payload);
  let verified = false;
  try {
    const key = await webcrypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    verified = await webcrypto.subtle.verify(
      "Ed25519",
      key,
      signatureBytes,
      payloadBytes,
    );
  } catch {
    return { ok: false, reason: "bad-signature" };
  }
  if (!verified) return { ok: false, reason: "bad-signature" };

  return { ok: true, playerId: token.playerId };
}

// =============================================================================
// Boot Next.js
// =============================================================================

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// =============================================================================
// WebSocket setup (lazy — we don't `require` the server lib until the
// `ws` library is installed, which Wave 1 guarantees)
// =============================================================================

const WS_UPGRADE_PATH = "/api/multiplayer/socket";

/**
 * Lazily resolve the multiplayer registry. We use a dynamic import so
 * this server file doesn't fail to start when the multiplayer modules
 * are temporarily broken (e.g., during a partial check-out).
 */
async function loadRegistry() {
  // tsx isn't available in production; in dev Next.js compiles TS for
  // us, but server.js runs as a plain CommonJS file. Node 20+ supports
  // `--experimental-strip-types` but we don't rely on it. Instead, the
  // upgrade handler uses the JSON wire format directly and routes
  // intents into the registry via a fetch into the API layer when
  // needed. For Wave 1 we keep the upgrade handler minimal.
  return null;
}

void loadRegistry; // suppress unused-warning until Wave 2 wires it

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url ?? "/", true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error handling request", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (ws, req) => {
      // The upgrade handler attaches the verified playerId on the
      // request object before emitting the connection. Wave 3 will wire
      // a real ServerMatchHost lookup here; Wave 2 just confirms the
      // handshake succeeded and closes with a Wave 2 marker so the
      // existing Wave 1 client tests keep their close-on-handshake
      // expectations.
      //
      // Wave 3a: the upgrade handler also parses an OPTIONAL `?seed=N`
      // query param and stashes it on `req._mpDiceSeed`. When the host
      // factory wires through to `MatchHostRegistry.getOrCreate`, this
      // value flips the host's dice roller from `CryptoDiceRoller`
      // (production) to a deterministic `SeededDiceRoller` (debug). It
      // is intentionally OFF by default and used only for reproducing
      // bug reports.
      const verifiedPlayerId = req._mpVerifiedPlayerId;
      const diceSeed = req._mpDiceSeed;
      const url = parse(req.url ?? "/", true);
      const matchId = url.query.matchId;
      // eslint-disable-next-line no-console
      console.log(
        `[mp-socket] connection accepted matchId=${matchId} playerId=${verifiedPlayerId}${
          diceSeed != null ? ` diceSeed=${diceSeed}` : ""
        }`,
      );
      ws.send(
        JSON.stringify({
          kind: "Close",
          matchId: matchId ?? "",
          ts: new Date().toISOString(),
          code: "INTERNAL_ERROR",
          reason:
            "WebSocket handler is a Wave 2 stub; full intent dispatch lands in Wave 3",
        }),
      );
      ws.close(1011, "wave-2-stub");
    });

    server.on("upgrade", async (req, socket, head) => {
      try {
        const parsedUrl = parse(req.url ?? "/", true);
        if (parsedUrl.pathname !== WS_UPGRADE_PATH) {
          socket.destroy();
          return;
        }
        const matchId = parsedUrl.query.matchId;
        const token = parsedUrl.query.token;
        if (!matchId || !token) {
          // Missing either parameter — 400 over the raw socket so a
          // browser sees a meaningful error instead of a hung handshake.
          socket.write("HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n");
          socket.destroy();
          return;
        }
        // Wave 2: cryptographically verify the bearer token before
        // upgrading. On failure, return 401 over the raw socket so the
        // client sees a clean rejection (the handshake never completes,
        // so there's no WS frame to send — this is the standard ws
        // server pattern).
        const wireToken = Array.isArray(token) ? token[0] : token;
        const verification = await verifyWireToken(wireToken);
        if (!verification.ok) {
          // eslint-disable-next-line no-console
          console.warn(
            `[mp-socket] upgrade rejected matchId=${matchId} reason=${verification.reason}`,
          );
          socket.write(
            "HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n",
          );
          socket.destroy();
          return;
        }
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
        if (typeof seedString === "string" && seedString.length > 0) {
          const seedValue = Number.parseInt(seedString, 10);
          if (Number.isFinite(seedValue)) {
            req._mpDiceSeed = seedValue;
          }
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Upgrade error", err);
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
    console.error("Failed to prepare Next.js app", err);
    process.exit(1);
  });
