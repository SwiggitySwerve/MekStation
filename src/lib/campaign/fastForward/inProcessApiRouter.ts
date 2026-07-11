/**
 * In-process API router for the headless campaign fast-forward suites.
 *
 * Why: `materializeCampaignMissionEncounter` (and the fast-forward combat
 * runner it feeds, group 3 of `add-campaign-fast-forward-api`) drive
 * campaign encounter materialization through the real `/api/forces` and
 * `/api/encounters` Pages Router handlers via an injectable `fetchImpl`.
 * Running those handlers behind a live Next.js server would break the
 * "jest-speed, no browser, no live server" contract this capability
 * exists to deliver. This module invokes the *exact* production handler
 * modules in-process via `node-mocks-http`, against the real SQLite
 * service (`:memory:` in jest) — the pattern proven working by
 * `src/__tests__/api/forces/forceMultiAssignment.real.test.ts`.
 *
 * Design D3 (`openspec/changes/add-campaign-fast-forward-api/design.md`):
 * never mocked, never a parallel re-implementation of handler logic. A
 * route this router does not recognize throws naming the method and
 * path — handler drift (a renamed route, a changed payload contract)
 * breaks the fast-forward suite loudly in jest instead of rotting
 * silently as an absorbed 404 (risk R1).
 *
 * Task 1.1 route inventory — every entry below corresponds to one of
 * `materializeCampaignMissionEncounter`'s five call shapes
 * (`materializeCampaignMissionEncounter.ts:94-285`) plus the fast-forward
 * combat runner's force read-back (design D2, group 3):
 *
 * | Method | Path                                | Handler module                                  |
 * |--------|-------------------------------------|--------------------------------------------------|
 * | POST   | /api/forces                         | src/pages/api/forces/index.ts                    |
 * | GET    | /api/forces/:id                     | src/pages/api/forces/[id].ts                     |
 * | PUT    | /api/forces/assignments/:id         | src/pages/api/forces/assignments/[id].ts         |
 * | POST   | /api/encounters                     | src/pages/api/encounters/index.ts                |
 * | GET    | /api/encounters/:id                 | src/pages/api/encounters/[id]/index.ts           |
 * | PATCH  | /api/encounters/:id                 | src/pages/api/encounters/[id]/index.ts           |
 * | PUT    | /api/encounters/:id/player-force    | src/pages/api/encounters/[id]/player-force.ts    |
 * | PUT    | /api/encounters/:id/opponent-force  | src/pages/api/encounters/[id]/opponent-force.ts  |
 *
 * @module lib/campaign/fastForward/inProcessApiRouter
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type RequestMethod } from 'node-mocks-http';

import encounterByIdHandler from '@/pages/api/encounters/[id]/index';
import opponentForceHandler from '@/pages/api/encounters/[id]/opponent-force';
import playerForceHandler from '@/pages/api/encounters/[id]/player-force';
import encountersHandler from '@/pages/api/encounters/index';
import forceByIdHandler from '@/pages/api/forces/[id]';
import assignmentHandler from '@/pages/api/forces/assignments/[id]';
import forcesHandler from '@/pages/api/forces/index';
import { installNodeCanonicalUnitStatsResolver } from '@/services/forces/ForceRepository.helpers.server';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

// =============================================================================
// Route table
// =============================================================================

/** The shape every Pages Router API handler exports as its default. */
type ApiRouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => void | Promise<void>;

interface RouteDefinition {
  readonly method: RequestMethod;
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
  readonly handler: ApiRouteHandler;
}

function defineRoute(
  method: RequestMethod,
  pattern: RegExp,
  paramNames: readonly string[],
  handler: ApiRouteHandler,
): RouteDefinition {
  return { method, pattern, paramNames, handler };
}

// Static method+path -> real handler module table (design D3). Order does
// not matter for correctness — every pattern is anchored (`^…$`) and
// method-scoped, so no two entries can both match the same request.
const ROUTES: readonly RouteDefinition[] = [
  defineRoute('POST', /^\/api\/forces$/, [], forcesHandler),
  defineRoute('GET', /^\/api\/forces\/([^/]+)$/, ['id'], forceByIdHandler),
  defineRoute(
    'PUT',
    /^\/api\/forces\/assignments\/([^/]+)$/,
    ['id'],
    assignmentHandler,
  ),
  defineRoute('POST', /^\/api\/encounters$/, [], encountersHandler),
  defineRoute(
    'GET',
    /^\/api\/encounters\/([^/]+)$/,
    ['id'],
    encounterByIdHandler,
  ),
  defineRoute(
    'PATCH',
    /^\/api\/encounters\/([^/]+)$/,
    ['id'],
    encounterByIdHandler,
  ),
  defineRoute(
    'PUT',
    /^\/api\/encounters\/([^/]+)\/player-force$/,
    ['id'],
    playerForceHandler,
  ),
  defineRoute(
    'PUT',
    /^\/api\/encounters\/([^/]+)\/opponent-force$/,
    ['id'],
    opponentForceHandler,
  ),
];

interface MatchedRoute {
  readonly handler: ApiRouteHandler;
  readonly query: Record<string, string>;
}

/**
 * Resolve method+pathname to a handler and decoded path params. Path
 * segments are decoded here because the materializer builds URLs with
 * `encodeURIComponent` (mirroring what a live browser `fetch` would send),
 * and Next.js decodes dynamic-route segments before handlers see
 * `req.query` — this shim must do the same.
 */
function matchRoute(
  method: string,
  pathname: string,
): MatchedRoute | undefined {
  for (const definition of ROUTES) {
    if (definition.method !== method) continue;
    const match = definition.pattern.exec(pathname);
    if (!match) continue;
    const query: Record<string, string> = {};
    definition.paramNames.forEach((name, index) => {
      const raw = match[index + 1];
      if (raw !== undefined) query[name] = decodeURIComponent(raw);
    });
    return { handler: definition.handler, query };
  }
  return undefined;
}

// =============================================================================
// SQLite bootstrap
// =============================================================================

/**
 * Initialize the real SQLite service at `:memory:` plus the canonical
 * unit-stats resolver the force/encounter handlers need at request time.
 * Mirrors the per-request bootstrap every handler already performs via
 * `routeHelpers.initializeApiDatabase` (`src/pages-modules/api/routeHelpers.ts:24-40`)
 * — called once up front here so fixture/test setup owns it explicitly,
 * the same shape as `forceMultiAssignment.real.test.ts`'s
 * `initializeTestDatabase`.
 */
export function initializeInProcessApiDatabase(): void {
  installNodeCanonicalUnitStatsResolver();
  getSQLiteService({ path: ':memory:' }).initialize();
}

// =============================================================================
// Response shim
// =============================================================================

/**
 * Minimal `fetch` `Response` surface the materializer's `readApiJson`
 * consumes (`status`, `ok`, `json()`) — deliberately not a full `Response`
 * polyfill (risk R1: the shim's job is to match exactly what the one real
 * consumer reads, not to simulate `fetch` generally).
 */
type MinimalFetchResponse = Pick<Response, 'status' | 'ok' | 'json'>;

interface MockResponseLike {
  _getStatusCode(): number;
  _getData(): unknown;
}

function adaptMockResponse(res: MockResponseLike): MinimalFetchResponse {
  const status = res._getStatusCode();
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      const raw = res._getData();
      if (typeof raw !== 'string') return raw;
      if (raw.length === 0) return null;
      return JSON.parse(raw) as unknown;
    },
  };
}

// =============================================================================
// Fetch shim
// =============================================================================

function resolvePathname(input: RequestInfo | URL): string {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return new URL(raw).pathname;
  }
  const queryIndex = raw.indexOf('?');
  return queryIndex === -1 ? raw : raw.slice(0, queryIndex);
}

/** The materializer only ever sends `JSON.stringify(...)` string bodies. */
function parseRequestBody(
  body: BodyInit | null | undefined,
): Record<string, unknown> | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body !== 'string') {
    throw new Error(
      'inProcessApiFetch: only string (JSON) request bodies are supported',
    );
  }
  if (body.length === 0) return undefined;
  return JSON.parse(body) as Record<string, unknown>;
}

/**
 * Build a `fetch`-shaped adapter over the real `/api/forces` and
 * `/api/encounters` Pages Router handlers (design D3). Each call builds a
 * `node-mocks-http` request/response pair, awaits the imported real
 * handler module, and adapts the result into the minimal `Response`
 * surface `readApiJson` consumes. Unmatched routes throw, naming the
 * method and path, so handler drift breaks the fast-forward suite rather
 * than rotting silently.
 */
export function createInProcessApiFetch(): typeof fetch {
  async function inProcessApiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const pathname = resolvePathname(input);

    const matched = matchRoute(method, pathname);
    if (!matched) {
      throw new Error(
        `inProcessApiFetch: no route registered for ${method} ${pathname}`,
      );
    }

    const body = parseRequestBody(init?.body);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: method as RequestMethod,
      query: matched.query,
      body,
    });

    await matched.handler(req, res);

    return adaptMockResponse(res) as Response;
  }

  return inProcessApiFetch as typeof fetch;
}
