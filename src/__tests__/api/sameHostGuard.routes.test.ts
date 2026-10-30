/**
 * API-SAME-HOST-1: the same-host guard covers every API route and the
 * WebSocket upgrade, proven three ways.
 *
 *  1. A route census pins the 98 route files under src/pages/api, so a new
 *     route fails here until a reviewer has looked at it against the guard.
 *  2. The credential handlers refuse a bad Host, Origin or fetch site
 *     before they parse a body or run a KDF (direct-handler rows).
 *  3. The REAL server.js is spawned with `next` and the multiplayer
 *     runtime stubbed (no build, no database): requests of every route
 *     class and every upgrade are judged before Next or the bearer check,
 *     and the WebSocket server refuses a frame over 1 MiB (S5-03).
 *
 * Not covered here (needs a build): the hydrated standalone layout, where
 * server.js loads the guard from the copied src tree. The packaged-socket
 * validator row and the installer rehearsal own that.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const mockGetActive = jest.fn();
const mockUnlockIdentity = jest.fn();

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => ({ getActive: mockGetActive }),
}));
jest.mock('@/services/vault/IdentityService', () => ({
  fromBase64: jest.fn(),
  signData: jest.fn(),
  unlockIdentity: (...args: readonly unknown[]) => mockUnlockIdentity(...args),
}));

import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import { credentialProtocols } from '@/lib/multiplayer/socketCredentialProtocol';
import localSeatsHandler from '@/pages/api/multiplayer/auth/local-seats';
import tokenHandler from '@/pages/api/multiplayer/auth/token';
import unlockHandler from '@/pages/api/vault/identity/unlock';

/** The entry guard's refusal text. Pinned here so the rows stay behavioural. */
const REFUSAL = 'Same-host requests only';

const repoRoot = path.resolve(__dirname, '../../..');
const routesRoot = path.join(repoRoot, 'src', 'pages', 'api');

// =============================================================================
// 1. Route census
// =============================================================================

/** Every URL a file under src/pages/api serves. Update with a reviewed guard check. */
const PINNED_ROUTE_URLS: readonly string[] = [
  '/api/campaigns',
  '/api/campaigns/[id]',
  '/api/campaigns/[id]/activity',
  '/api/campaigns/[id]/adopt',
  '/api/campaigns/[id]/commands',
  '/api/campaigns/[id]/grants',
  '/api/campaigns/[id]/head',
  '/api/campaigns/[id]/launch-authority',
  '/api/campaigns/[id]/replica-sync',
  '/api/campaigns/[id]/rewind-preview',
  '/api/campaigns/redeem',
  '/api/catalog',
  '/api/chassis',
  '/api/e2e/fault',
  '/api/e2e/performance-probe',
  '/api/e2e/token-ttl',
  '/api/e2e/vault-identity',
  '/api/encounters',
  '/api/encounters/[id]',
  '/api/encounters/[id]/clone',
  '/api/encounters/[id]/launch',
  '/api/encounters/[id]/opponent-force',
  '/api/encounters/[id]/player-force',
  '/api/encounters/[id]/template',
  '/api/encounters/[id]/validate',
  '/api/encounters/seed-samples',
  '/api/equipment',
  '/api/equipment/catalog',
  '/api/equipment/filters',
  '/api/forces',
  '/api/forces/[id]',
  '/api/forces/[id]/clone',
  '/api/forces/[id]/validate',
  '/api/forces/assignments/[id]',
  '/api/forces/assignments/swap',
  '/api/health',
  '/api/matches',
  '/api/matches/[id]',
  '/api/matches/[id]/export',
  '/api/matches/[id]/head',
  '/api/matches/[id]/private-preview',
  '/api/matches/[id]/rewind-commit',
  '/api/matches/[id]/rewind-preview',
  '/api/matches/[id]/timeline',
  '/api/meta/categories',
  '/api/meta/equipment_categories',
  '/api/meta/equipment_eras',
  '/api/meta/equipment_tech_bases',
  '/api/meta/unit_eras',
  '/api/meta/unit_tech_bases',
  '/api/meta/unit_weight_classes',
  '/api/multiplayer/auth/local-seats',
  '/api/multiplayer/auth/token',
  '/api/multiplayer/invites/[roomCode]',
  '/api/multiplayer/lobbies',
  '/api/multiplayer/matches',
  '/api/multiplayer/matches/[id]',
  '/api/multiplayer/matches/[id]/spectate',
  '/api/pilots',
  '/api/pilots/[id]',
  '/api/pilots/[id]/improve-gunnery',
  '/api/pilots/[id]/improve-piloting',
  '/api/pilots/[id]/purchase-ability',
  '/api/replay-library',
  '/api/replay-library/[source]/[gameId]',
  '/api/replay-library/encounter',
  '/api/replay-library/quick',
  '/api/units',
  '/api/units/custom',
  '/api/units/custom/[id]',
  '/api/units/custom/[id]/export',
  '/api/units/custom/[id]/revert/[version]',
  '/api/units/custom/[id]/versions',
  '/api/units/custom/[id]/versions/[version]',
  '/api/units/custom/combat-catalog',
  '/api/units/custom/suggest-name',
  '/api/units/import',
  '/api/vault/contacts',
  '/api/vault/contacts/[id]',
  '/api/vault/folders',
  '/api/vault/folders/[id]',
  '/api/vault/folders/[id]/items',
  '/api/vault/folders/[id]/share',
  '/api/vault/identity',
  '/api/vault/identity/unlock',
  '/api/vault/permissions/bulk',
  '/api/vault/public',
  '/api/vault/share',
  '/api/vault/share/[id]',
  '/api/vault/share/redeem',
  '/api/vault/shared',
  '/api/vault/shared/[scope]/[id]',
  '/api/vault/sign',
  '/api/vault/sync',
  '/api/vault/versions',
  '/api/vault/versions/[id]',
  '/api/vault/versions/diff',
  '/api/vault/versions/rollback',
];

function listRouteUrls(): string[] {
  const urls: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const rel = path
          .relative(routesRoot, full)
          .split(path.sep)
          .join('/')
          .replace(/\.(ts|tsx|js|jsx)$/, '')
          .replace(/(^|\/)index$/, '');
        urls.push(rel === '' ? '/api' : `/api/${rel}`);
      }
    }
  };
  walk(routesRoot);
  return urls.sort();
}

/** A request target a client could send for a route file's URL. */
function concreteTarget(url: string): string {
  return url.replace(/\[[^\]]+\]/g, 'x1');
}

describe('API route census', () => {
  it('pins every route file so a new route is reviewed against the guard', () => {
    const found = listRouteUrls();
    expect(found).toHaveLength(98);
    expect(found).toEqual([...PINNED_ROUTE_URLS].sort());
  });
});

// =============================================================================
// 2. Credential routes refuse before body parsing and KDF
// =============================================================================

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

const CREDENTIAL_ROUTES: ReadonlyArray<readonly [string, Handler, string]> = [
  ['auth/token', tokenHandler as Handler, REFUSAL],
  ['identity/unlock', unlockHandler as Handler, REFUSAL],
  [
    'auth/local-seats',
    localSeatsHandler as Handler,
    'Local seats are same-host only',
  ],
];

const CROSS_SITE_HEADERS: ReadonlyArray<
  readonly [string, Record<string, string>]
> = [
  [
    'a rebinding host with a matching origin',
    { host: 'evil.example:3600', origin: 'http://evil.example:3600' },
  ],
  ['a DNS alias of loopback', { host: '127.0.0.1.nip.io:3600' }],
  [
    'a foreign origin on a loopback host',
    { host: '127.0.0.1:3600', origin: 'http://evil.example' },
  ],
  [
    'a cross-site fetch',
    { host: '127.0.0.1:3600', 'sec-fetch-site': 'cross-site' },
  ],
  [
    'a same-site fetch',
    { host: 'localhost:3600', 'sec-fetch-site': 'same-site' },
  ],
  ['a missing host', {}],
];

describe('credential routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActive.mockResolvedValue(null);
  });

  // Shapes a route would otherwise answer with 200/404, 400 or 405: a refusal
  // must come first for all of them, so it cannot depend on the body or verb.
  const REQUEST_SHAPES: ReadonlyArray<
    readonly [string, 'POST' | 'DELETE', Record<string, unknown> | undefined]
  > = [
    [
      'a valid-looking POST',
      'POST',
      { password: 'correct-password', displayName: 'Host' },
    ],
    ['a malformed POST body', 'POST', {}],
    ['a wrong method', 'DELETE', undefined],
  ];

  describe.each(CREDENTIAL_ROUTES)('%s', (_name, handler, refusal) => {
    describe.each(REQUEST_SHAPES)('%s', (_shape, method, body) => {
      it.each(CROSS_SITE_HEADERS)(
        'refuses %s before the body, the method check or any KDF work',
        async (_label, headers) => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method,
            headers,
            body: body as never,
          });
          await handler(req, res);
          expect(res.statusCode).toBe(403);
          expect(
            JSON.parse((res as never as { _getData(): string })._getData()),
          ).toEqual({ error: refusal });
          expect(mockGetActive).not.toHaveBeenCalled();
          expect(mockUnlockIdentity).not.toHaveBeenCalled();
        },
      );
    });
  });
  it('still lets a same-host request reach the identity lookup', async () => {
    const sameHostBodies: ReadonlyArray<readonly [Handler, object]> = [
      [
        tokenHandler as Handler,
        { password: 'correct-password', displayName: 'Host' },
      ],
      [unlockHandler as Handler, { password: 'correct-password' }],
    ];
    for (const [handler, body] of sameHostBodies) {
      mockGetActive.mockClear();
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { host: '127.0.0.1:3600', origin: 'http://127.0.0.1:3600' },
        body: body as never,
      });
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(mockGetActive).toHaveBeenCalledTimes(1);
    }
  });
});

// =============================================================================
// 3. The real server.js entry
// =============================================================================

jest.setTimeout(120_000);

const STUB_PRELOAD = `
const M = require('node:module');
const realLoad = M._load;
const echo = async ({ socket }) => {
  socket.on('message', (data) => socket.send('ack:' + data.length));
  return { connectionKey: 'stub' };
};
M._load = function (request, ...rest) {
  if (request === 'next') {
    return () => ({
      prepare: async () => {},
      getUpgradeHandler: () => null,
      getRequestHandler: () => (req, res) => {
        res.statusCode = 200;
        res.setHeader('content-type', 'text/plain');
        res.end('NEXT_HANDLED');
      },
    });
  }
  if (process.env.STUB_GUARD_MISSING === '1' && /sameHostGuard\\.ts$/.test(request)) throw new Error('guard missing');
  if (process.env.STUB_TSX_MISSING === '1' && request === 'tsx/cjs') throw new Error('tsx missing');
  if (process.env.STUB_GUARD_FAILS_AFTER_BOOT === '1' && /sameHostGuard\\.ts$/.test(request)) {
    const loaded = realLoad.call(this, request, ...rest);
    return { ...loaded, evaluateEntryRequest: (input) => {
      if (input.headers['x-guard-fail']) throw new Error('guard failed after boot');
      return loaded.evaluateEntryRequest(input);
    } };
  }
  if (/MatchHostRegistry\\.ts$/.test(request)) return { bootstrapMultiplayerServer: async () => {} };
  if (/bindMultiplayerSocketConnection\\.ts$/.test(request)) return { bindMultiplayerSocketConnection: echo };
  if (/bindCampaignSyncConnection\\.ts$/.test(request)) return { bindCampaignSyncConnection: echo };
  if (/campaignSessionMembershipPort\\.ts$/.test(request)) return { createCampaignSessionMembershipPort: () => ({}) };
  if (/campaignForceClaimPort\\.ts$/.test(request)) return { createCampaignForceClaimPort: () => ({}) };
  if (/DurableMatchStore\\.ts$/.test(request)) return { clearStaleE2EFaultSentinels: () => 0 };
  if (/persistence[\\\\/]SQLiteService\\.ts$/.test(request)) return { getSQLiteService: () => ({ initialize() {} }) };
  return realLoad.call(this, request, ...rest);
};
`;

interface IServer {
  readonly child: ChildProcess;
  readonly port: number;
  readonly output: () => string;
  readonly dir: string;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function startServer(
  nodeEnv: 'development' | 'production',
  extraEnv: Record<string, string> = {},
): Promise<IServer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'same-host-entry-'));
  const preload = path.join(dir, 'preload.cjs');
  fs.writeFileSync(preload, STUB_PRELOAD);
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: nodeEnv,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    MULTIPLAYER_SOCKET_TRACE: '0',
    ...extraEnv,
  };
  delete env.MEKSTATION_FAULT_CONTROLS;
  delete env.npm_lifecycle_event;
  const child = spawn(process.execPath, ['--require', preload, 'server.js'], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let text = '';
  child.stdout?.on('data', (chunk) => (text += chunk));
  child.stderr?.on('data', (chunk) => (text += chunk));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`server.js not ready:\n${text}`));
    }, 60_000);
    const poll = setInterval(() => {
      if (text.includes('Ready on')) {
        clearTimeout(timer);
        clearInterval(poll);
        resolve();
      }
    }, 50);
    child.once('exit', (code) => {
      clearTimeout(timer);
      clearInterval(poll);
      reject(new Error(`server.js exited ${code}:\n${text}`));
    });
  });
  return { child, port, output: () => text, dir };
}

async function stopServer(server: IServer): Promise<void> {
  if (server.child.exitCode === null) {
    const exited = new Promise((resolve) => server.child.once('exit', resolve));
    server.child.kill();
    await exited;
  }
  fs.rmSync(server.dir, { recursive: true, force: true });
}

interface IReply {
  readonly status: number;
  readonly body: string;
}

function send(
  server: IServer,
  method: string,
  target: string,
  headers: Record<string, string>,
  body?: string,
): Promise<IReply> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        agent: false,
        host: '127.0.0.1',
        port: server.port,
        method,
        path: target,
        headers,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: text }),
        );
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

/** The status of a raw upgrade attempt, or 'destroyed' when the socket is dropped. */
function upgrade(
  server: IServer,
  target: string,
  headers: Record<string, string>,
): Promise<number | 'destroyed'> {
  return new Promise((resolve) => {
    const req = http.request({
      agent: false,
      host: '127.0.0.1',
      port: server.port,
      path: target,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        ...headers,
      },
    });
    req.on('response', (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('upgrade', (_res, socket) => {
      socket.destroy();
      resolve(101);
    });
    req.on('error', () => resolve('destroyed'));
    req.end();
  });
}

function mintWireToken(): string {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const playerId = derivePlayerId(new Uint8Array(raw));
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const payload = JSON.stringify({ expiresAt, issuedAt, playerId });
  return Buffer.from(
    JSON.stringify({
      playerId,
      issuedAt,
      expiresAt,
      publicKey: raw.toString('base64'),
      signature: sign(null, Buffer.from(payload), privateKey).toString(
        'base64',
      ),
    }),
  ).toString('base64');
}

/**
 * A WebSocket client in a child Node process: inside this jsdom test
 * environment `ws` resolves to its browser stub. Sends one zero-filled binary
 * frame per size and reports each reply ("ack:<bytes>" from the stubbed
 * socket binder, or "close:<code>"); it stops at the first close.
 */
const WS_CLIENT = `
const WebSocket = require('ws');
const [url, protocols, sizes] = process.argv.slice(1);
const ws = new WebSocket(url, JSON.parse(protocols), { perMessageDeflate: false });
ws.once('error', (error) => {
  console.log(JSON.stringify(['error:' + error.message]));
  process.exit(0);
});
ws.once('open', async () => {
  const results = [];
  for (const size of JSON.parse(sizes)) {
    const outcome = await new Promise((resolve) => {
      const onClose = (code) => resolve('close:' + code);
      const onMessage = (data) => {
        ws.off('close', onClose);
        resolve(String(data));
      };
      ws.once('close', onClose);
      ws.once('message', onMessage);
      ws.send(Buffer.alloc(size));
    });
    results.push(outcome);
    if (outcome.startsWith('close:')) break;
  }
  console.log(JSON.stringify(results));
  ws.terminate();
  process.exit(0);
});
`;

function runWsClient(url: string, sizes: number[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '-e',
        WS_CLIENT,
        url,
        JSON.stringify(credentialProtocols(mintWireToken())),
        JSON.stringify(sizes),
      ],
      { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    child.stdout?.on('data', (chunk) => (out += chunk));
    child.stderr?.on('data', (chunk) => (out += chunk));
    child.once('error', reject);
    child.once('close', () => {
      try {
        resolve(JSON.parse(out.trim().split('\n').pop() ?? '[]'));
      } catch {
        reject(new Error(`ws client output was not JSON:\n${out}`));
      }
    });
  });
}
/** One representative per route class, with the method a browser attack would use. */
const ROUTE_CLASSES: ReadonlyArray<readonly [string, string, string]> = [
  ['public read', 'GET', '/api/units'],
  ['health', 'GET', '/api/health'],
  ['private read', 'GET', '/api/vault/share'],
  ['contacts read', 'GET', '/api/vault/contacts'],
  ['campaign read', 'GET', '/api/campaigns/abc'],
  ['form write', 'POST', '/api/vault/identity'],
  ['pilot write', 'POST', '/api/pilots/abc/purchase-ability'],
  ['campaign write', 'PUT', '/api/campaigns/abc'],
  ['delete', 'DELETE', '/api/forces/abc'],
  ['token credential', 'POST', '/api/multiplayer/auth/token'],
  ['unlock credential', 'POST', '/api/vault/identity/unlock'],
  ['local-seats credential', 'POST', '/api/multiplayer/auth/local-seats'],
  ['multiplayer lobby', 'GET', '/api/multiplayer/lobbies'],
  ['multiplayer create', 'POST', '/api/multiplayer/matches'],
  ['match rewind', 'POST', '/api/matches/abc/rewind-commit'],
  ['e2e fault hook', 'POST', '/api/e2e/fault'],
];

const FORM = 'application/x-www-form-urlencoded';

describe.each(['development', 'production'] as const)(
  'server.js entry guard (NODE_ENV=%s)',
  (nodeEnv) => {
    let server: IServer;

    beforeAll(async () => {
      server = await startServer(nodeEnv);
    });
    afterAll(() => stopServer(server));

    const loopback = (): string => `127.0.0.1:${server.port}`;

    describe.each(ROUTE_CLASSES)('%s', (_class, method, target) => {
      const body =
        method === 'GET' || method === 'DELETE'
          ? undefined
          : 'password=attacker';
      const formHeaders = (headers: Record<string, string>) =>
        body === undefined ? headers : { 'content-type': FORM, ...headers };

      it.each([
        [
          'a rebinding host with a matching origin',
          () => ({ host: 'evil.example', origin: 'http://evil.example' }),
        ],
        ['a bare rebinding host', () => ({ host: 'evil.example:3600' })],
        [
          'a DNS alias of loopback',
          () => ({ host: `127.0.0.1.nip.io:${server.port}` }),
        ],
        [
          'a foreign origin',
          () => ({ host: loopback(), origin: 'http://evil.example' }),
        ],
        ['the null origin', () => ({ host: loopback(), origin: 'null' })],
        [
          'a cross-site fetch',
          () => ({ host: loopback(), 'sec-fetch-site': 'cross-site' }),
        ],
        [
          'a same-site fetch',
          () => ({ host: loopback(), 'sec-fetch-site': 'same-site' }),
        ],
      ])('refuses %s before Next sees it', async (_label, headers) => {
        const reply = await send(
          server,
          method,
          target,
          formHeaders(headers()),
          body,
        );
        expect(reply.status).toBe(403);
        expect(reply.body).not.toContain('NEXT_HANDLED');
        expect(JSON.parse(reply.body)).toEqual({
          error: REFUSAL,
        });
      });

      it.each([
        ['no Origin and no fetch metadata', () => ({ host: loopback() })],
        [
          'its own Origin',
          () => ({ host: loopback(), origin: `http://${loopback()}` }),
        ],
        [
          'same-origin fetch metadata',
          () => ({
            host: loopback(),
            origin: `http://${loopback()}`,
            'sec-fetch-site': 'same-origin',
          }),
        ],
        [
          'a user-initiated navigation',
          () => ({ host: loopback(), 'sec-fetch-site': 'none' }),
        ],
        [
          'the localhost spelling',
          () => ({ host: `localhost:${server.port}` }),
        ],
      ])('hands a request with %s to Next', async (_label, headers) => {
        const reply = await send(
          server,
          method,
          target,
          formHeaders(headers()),
          body,
        );
        expect(reply.status).toBe(200);
        expect(reply.body).toBe('NEXT_HANDLED');
      });
    });

    it.each([
      '//api/vault/share',
      '///api/vault/share',
      '/%61pi/vault/share',
      '/%2561pi/vault/share',
      '/api%2Fvault/share',
      '/./api/vault/share',
      '/x/../api/vault/share',
      '/API/vault/share',
      '/api/vault/share?x=1#y',
      `http://evil.example/api/vault/share`,
    ])('refuses the spelling %s of an API path', async (target) => {
      const reply = await send(server, 'GET', target, { host: 'evil.example' });
      expect(reply.status).toBe(403);
      expect(reply.body).not.toContain('NEXT_HANDLED');
    });

    // F1: Next matches these as dynamic API routes and decodes the parameter
    // afterwards; the raw bytes are sent unnormalised (http.request keeps %2F).
    describe.each([
      ['GET', '/api/pilots/%2e%2e%2f%2e%2e'],
      ['GET', '/x/../api/pilots/%2e%2e%2f%2e%2e'],
      ['GET', '/%2e/api/pilots/%2e%2e%2f%2e%2e'],
      ['GET', '/x/%2e%2e/api/pilots/%2e%2e%2f%2e%2e'],
      ['GET', '/./api/campaigns/%2e%2e%2F%2e%2e%2Fx'],
      ['GET', '/api/pilots/%2e%2e%5c%2e%2e'],
      ['GET', '/api/vault/share/abc%2F..%2F..%2F..%2F..%2Fx'],
      ['GET', '/api/campaigns/%2e%2e%2F%2e%2e%2F%2e%2e%2Fx'],
      [
        'GET',
        '/api/units/custom/abc/versions/1%2F..%2F..%2F..%2F..%2F..%2F..%2Fx',
      ],
      [
        'POST',
        '/api/units/custom/abc/revert/1%2F..%2F..%2F..%2F..%2F..%2F..%2Fx',
      ],
      ['POST', '/api/units/custom/abc/revert/1%5C..%5C..%5Cx'],
      ['GET', '/api/replay-library/%2e%2e/%2e%2e'],
      // N1: spellings a decoding static-route lookup would resolve to
      // /api/health and /api/vault/sign. Built Next answers them with its 404
      // page; the entry guard refuses them regardless.
      ['GET', '/a%2fb/../api%2fhealth'],
      ['GET', '/a%2fb/%2e%2e/api%2fhealth'],
      ['GET', '/a%2fb/../api%2fvault%2fidentity'],
      ['POST', '/a%2fb/../api%2fvault%2fsign'],
      ['GET', '/a%2fb/../%61pi%2fhealth'],
    ])('the dynamic-route target %s %s', (method, target) => {
      const body = method === 'POST' ? 'password=attacker' : undefined;
      const formHeaders = (headers: Record<string, string>) =>
        body === undefined ? headers : { 'content-type': FORM, ...headers };

      it('refuses a rebinding Host with a matching Origin', async () => {
        const reply = await send(
          server,
          method,
          target,
          formHeaders({
            host: 'evil.example',
            origin: 'http://evil.example',
          }),
          body,
        );
        expect(reply.status).toBe(403);
        expect(reply.body).not.toContain('NEXT_HANDLED');
      });

      it('refuses a cross-site form on a loopback Host', async () => {
        const reply = await send(
          server,
          method,
          target,
          formHeaders({
            host: loopback(),
            origin: 'http://evil.example',
            'sec-fetch-site': 'cross-site',
          }),
          body,
        );
        expect(reply.status).toBe(403);
        expect(reply.body).not.toContain('NEXT_HANDLED');
      });

      it('still hands the same-host request to Next', async () => {
        const reply = await send(
          server,
          method,
          target,
          formHeaders({ host: loopback() }),
          body,
        );
        expect(reply.status).toBe(200);
        expect(reply.body).toBe('NEXT_HANDLED');
      });
    });

    it.each([
      '/',
      '/gameplay/campaigns',
      '/a%2fb/../gameplay%2fcampaigns',
      '/apiary/%2e%2e%2fx',
      '/gameplay/campaigns/%2e%2e%2f%2e%2e',
      '/x/%2e%2e/gameplay/campaigns/%2e%2e%2f%2e%2e',
      '/_next/static/chunks/a%2fb.js',
    ])(
      'leaves the page control %s to Next with a foreign Host',
      async (target) => {
        const reply = await send(server, 'GET', target, {
          host: 'evil.example',
        });
        expect(reply).toEqual({ status: 200, body: 'NEXT_HANDLED' });
      },
    );

    it('refuses the WebSocket route itself before answering 426', async () => {
      const refused = await send(server, 'GET', '/api/multiplayer/socket', {
        host: 'evil.example',
      });
      expect(refused.status).toBe(403);
      const control = await send(server, 'GET', '/api/multiplayer/socket', {
        host: loopback(),
      });
      expect(control.status).toBe(426);
    });

    it('refuses a rebinding host on every pinned route and serves the same host', async () => {
      for (const url of PINNED_ROUTE_URLS) {
        const target = concreteTarget(url);
        const rebound = await send(server, 'GET', target, {
          host: 'evil.example:3600',
        });
        expect({
          target,
          status: rebound.status,
          handled: rebound.body === 'NEXT_HANDLED',
        }).toEqual({ target, status: 403, handled: false });
        const local = await send(server, 'GET', target, { host: loopback() });
        expect({ target, status: local.status, body: local.body }).toEqual({
          target,
          status: 200,
          body: 'NEXT_HANDLED',
        });
      }
    });
    it('guards the API and upgrades, not page routes', async () => {
      const page = await send(server, 'GET', '/gameplay/campaigns', {
        host: 'evil.example',
      });
      expect(page).toEqual({ status: 200, body: 'NEXT_HANDLED' });
    });

    describe('WebSocket upgrade', () => {
      const socketPath = '/api/multiplayer/socket?matchId=m1';

      it.each([
        [
          'a foreign Origin',
          () => ({ host: loopback(), origin: 'http://evil.example' }),
        ],
        [
          'a rebinding host with a matching Origin',
          () => ({ host: 'evil.example', origin: 'http://evil.example' }),
        ],
        [
          'a cross-site fetch',
          () => ({ host: loopback(), 'sec-fetch-site': 'cross-site' }),
        ],
      ])(
        'refuses %s with 403 before the bearer check',
        async (_label, headers) => {
          // No credential at all: without the guard this is a 400 from the
          // bearer parser, so a 403 shows the guard ran first.
          expect(await upgrade(server, socketPath, headers())).toBe(403);
        },
      );

      it('still reaches the bearer check for a same-host client', async () => {
        expect(await upgrade(server, socketPath, { host: loopback() })).toBe(
          400,
        );
        expect(
          await upgrade(server, socketPath, {
            host: loopback(),
            origin: `http://${loopback()}`,
          }),
        ).toBe(400);
      });

      it('judges the Next HMR upgrade path too', async () => {
        const foreign = await upgrade(server, '/_next/webpack-hmr', {
          host: loopback(),
          origin: 'http://evil.example',
        });
        expect(foreign).toBe(403);
        // Same-host HMR keeps its existing treatment: dropped, never refused with 403.
        expect(
          await upgrade(server, '/_next/webpack-hmr', { host: loopback() }),
        ).not.toBe(403);
      });
    });

    describe('WebSocket frame size (S5-03)', () => {
      const MIB = 1024 * 1024;

      it.each([
        ['combat', ''],
        ['campaign', '&channel=campaign'],
      ])(
        'accepts a frame of exactly 1 MiB and refuses one byte more on the %s channel',
        async (_name, channel) => {
          const outcomes = await runWsClient(
            `ws://127.0.0.1:${server.port}/api/multiplayer/socket?matchId=m1${channel}`,
            [MIB, MIB + 1],
          );
          expect(outcomes).toEqual([`ack:${MIB}`, 'close:1009']);
        },
      );
    });
  },
);

describe('server.js without the guard module or tsx', () => {
  it.each([
    ['the guard module is missing', 'STUB_GUARD_MISSING'],
    ['tsx cannot be loaded', 'STUB_TSX_MISSING'],
  ])('refuses to boot instead of serving unguarded when %s', (_label, flag) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'same-host-missing-'));
    try {
      const preload = path.join(dir, 'preload.cjs');
      fs.writeFileSync(preload, STUB_PRELOAD);
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '0',
        HOSTNAME: '127.0.0.1',
        [flag]: '1',
      };
      delete env.MEKSTATION_FAULT_CONTROLS;
      const result = spawnSync(
        process.execPath,
        ['--require', preload, 'server.js'],
        { cwd: repoRoot, env, encoding: 'utf8', timeout: 30_000 },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('same-host guard unavailable');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('server.js when the guard fails after a good boot', () => {
  let server: IServer;

  beforeAll(async () => {
    server = await startServer('production', {
      STUB_GUARD_FAILS_AFTER_BOOT: '1',
    });
  });
  afterAll(() => stopServer(server));

  const loopback = (): string => `127.0.0.1:${server.port}`;

  it('answers an API request with 500, never handing it to Next unguarded', async () => {
    const control = await send(server, 'GET', '/api/vault/share', {
      host: loopback(),
    });
    expect(control.status).toBe(200);
    const failed = await send(server, 'GET', '/api/vault/share', {
      host: loopback(),
      'x-guard-fail': '1',
    });
    expect(failed.status).toBe(500);
    expect(failed.body).not.toContain('NEXT_HANDLED');
  });

  it('drops an upgrade without a handshake', async () => {
    expect(
      await upgrade(server, '/api/multiplayer/socket?matchId=m1', {
        host: loopback(),
        'x-guard-fail': '1',
      }),
    ).toBe('destroyed');
    // F3: the refusal is deliberate, not a dead server. A same-host upgrade
    // afterwards still reaches the existing bearer check (400).
    expect(
      await upgrade(server, '/api/multiplayer/socket?matchId=m1', {
        host: loopback(),
      }),
    ).toBe(400);
  });
});

describe('packaged-socket validator same-host rows', () => {
  // The rows run against a built server in the packaged proof. Here the
  // checker itself is proven non-vacuous: it passes a server that refuses
  // cross-site traffic and fails a server that leaks on any one row.
  const validator = path.join(
    repoRoot,
    'scripts',
    'validate-multiplayer-packaged-socket.mjs',
  );
  const harness = `import http from 'node:http';
import { assertSameHostGuard } from ${JSON.stringify(pathToFileURL(validator).href)};
const mode = process.argv[1];
const sameHost = (req) => /^127\\.0\\.0\\.1:\\d+$/.test(req.headers.host ?? '') && !req.headers.origin;
// A fake server that behaves like a correct guard unless the mode says otherwise.
// This fake server exercises the validator's specific encoded-target contract;
// the real framework also resolves dot segments before matching API routes.
let created = false;
const isApi = (req) => (req.url ?? '').split('?')[0].split('/')[1]?.toLowerCase() === 'api';
const server = http.createServer((req, res) => {
  const encoded = (req.url ?? '').includes('%2e%2e%2f');
  const leaksThisRequest = mode === 'permissive' || (mode === 'read-leak' && req.method === 'GET') || (mode === 'form-leak' && req.method === 'POST') || (mode === 'encoded-leak' && encoded);
  const judged = isApi(req) || mode === 'page-refuse';
  const refuse = mode === 'refuse-all' || (mode === 'encoded-over-refuse' && encoded) || (!leaksThisRequest && judged && !sameHost(req));
  if (mode === 'identity-after-403' && req.method === 'POST' && refuse) created = true;
  res.statusCode = refuse ? 403 : 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ hasIdentity: created }));
});
server.on('upgrade', (req, socket) => {
  const leaks = mode === 'permissive' || mode === 'api-only';
  const refuse = !leaks && !sameHost(req);
  socket.end('HTTP/1.1 ' + (refuse ? '403 Forbidden' : '400 Bad Request') + '\\r\\nContent-Length: 0\\r\\n\\r\\n');
});
server.listen(0, '127.0.0.1', async () => {
  try {
    await assertSameHostGuard({ hostname: '127.0.0.1', port: server.address().port });
    process.stdout.write('ok');
  } catch (error) {
    process.stdout.write('FAIL ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    server.close();
    server.closeAllConnections();
  }
});`;

  function run(mode: string): string {
    return spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', harness, mode],
      { cwd: repoRoot, encoding: 'utf8', timeout: 15_000 },
    ).stdout;
  }

  it('passes a server that refuses cross-site API and upgrade traffic', () => {
    expect(run('strict')).toBe('ok');
  });

  // Each failure mode must fail on its own named row, not on an earlier one.
  it.each([
    [
      'a server with no guard',
      'permissive',
      'a rebinding Host on /api/health returned 200',
    ],
    [
      'a server that guards the API but not the upgrade',
      'api-only',
      'a foreign-Origin upgrade returned 400',
    ],
    [
      'a server that leaks a rebinding Host read',
      'read-leak',
      'a rebinding Host on /api/health returned 200',
    ],
    [
      'a server that leaks a cross-site form write',
      'form-leak',
      'a cross-site form POST to /api/vault/identity returned 200',
    ],
    [
      'a server that refuses same-host clients too',
      'refuse-all',
      'a same-host identity read returned 403',
    ],
    [
      'a server that refuses the form only after creating an identity',
      'identity-after-403',
      'the refused cross-site POST created an identity',
    ],
    [
      'a server that leaks the encoded dynamic-route target',
      'encoded-leak',
      'a rebinding Host on /api/pilots/%2e%2e%2f%2e%2e returned 200',
    ],
    [
      'a server that refuses the encoded target to a same-host client',
      'encoded-over-refuse',
      'a same-host request to /api/pilots/%2e%2e%2f%2e%2e was refused',
    ],
    [
      'a server that refuses a page route for a foreign Host',
      'page-refuse',
      'a page route was refused for a foreign Host',
    ],
  ])('fails %s', (_label, mode, reason) => {
    const output = run(mode);
    expect(output).toMatch(/^FAIL same-host guard/);
    expect(output).toContain(reason);
  });
});
