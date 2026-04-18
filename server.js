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

const { createServer } = require('node:http');
const { parse } = require('node:url');
const next = require('next');
const { WebSocketServer } = require('ws');

// =============================================================================
// Boot Next.js
// =============================================================================

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME ?? 'localhost';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// =============================================================================
// WebSocket setup (lazy — we don't `require` the server lib until the
// `ws` library is installed, which Wave 1 guarantees)
// =============================================================================

const WS_UPGRADE_PATH = '/api/multiplayer/socket';

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
        const parsedUrl = parse(req.url ?? '/', true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error handling request', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws, req) => {
      // Wave 1 stub: log the connection + close it immediately with a
      // friendly message. Wave 2 will wire `ServerMatchHost` lookups
      // through the registry and start the SessionJoin handshake.
      const url = parse(req.url ?? '/', true);
      const matchId = url.query.matchId;
      const token = url.query.token;
      // eslint-disable-next-line no-console
      console.log(
        `[mp-socket] connection accepted matchId=${matchId} hasToken=${!!token}`,
      );
      ws.send(
        JSON.stringify({
          kind: 'Close',
          matchId: matchId ?? '',
          ts: new Date().toISOString(),
          code: 'INTERNAL_ERROR',
          reason:
            'WebSocket handler is a Wave 1 stub; full intent dispatch lands in Wave 2',
        }),
      );
      ws.close(1011, 'wave-1-stub');
    });

    server.on('upgrade', (req, socket, head) => {
      try {
        const parsedUrl = parse(req.url ?? '/', true);
        if (parsedUrl.pathname !== WS_UPGRADE_PATH) {
          socket.destroy();
          return;
        }
        const matchId = parsedUrl.query.matchId;
        const token = parsedUrl.query.token;
        if (!matchId || !token) {
          // Reject the upgrade — return a 400 over the raw socket so a
          // browser sees a meaningful error instead of a hung handshake.
          socket.write('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n');
          socket.destroy();
          return;
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
