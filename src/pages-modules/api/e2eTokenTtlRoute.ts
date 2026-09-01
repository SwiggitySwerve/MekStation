/**
 * Playwright-only, single-use token TTL override.
 *
 * The normal token issuance route deliberately keeps its production
 * one-hour default. E2E-16 needs a token to expire during a live match,
 * so this guarded route supplies a short lifetime to the next ordinary
 * vault mint only. It never accepts a bearer credential and cannot be
 * reached outside the per-run Playwright server.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const MIN_TOKEN_TTL_MS = 1_000;
const MAX_TOKEN_TTL_MS = 120_000;

interface IArmResponse {
  readonly success: true;
  readonly armed: true;
}

interface IStatusResponse {
  readonly success: true;
  readonly armed: boolean;
}

interface IErrorResponse {
  readonly error: string;
}

interface IArmBody {
  readonly ttlMs?: unknown;
  readonly runId?: unknown;
}

type ResponseBody = IArmResponse | IStatusResponse | IErrorResponse;

let nextTokenTtlMs: number | null = null;

/** Consume the armed override exactly once, at normal token issuance. */
export function consumeE2ETokenTtlOverride(): number | null {
  const ttlMs = nextTokenTtlMs;
  nextTokenTtlMs = null;
  return ttlMs;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  if (!isAuthorizedE2ERequest(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.method === 'POST') {
    const ttlMs = readTokenTtlMs(req.body);
    if (ttlMs === null) {
      res.status(400).json({
        error: `ttlMs must be an integer from ${MIN_TOKEN_TTL_MS} to ${MAX_TOKEN_TTL_MS}`,
      });
      return;
    }
    nextTokenTtlMs = ttlMs;
    res.status(200).json({ success: true, armed: true });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ success: true, armed: nextTokenTtlMs !== null });
    return;
  }

  rejectUnexpectedMethod(req, res, ['GET', 'POST']);
}

function isAuthorizedE2ERequest(req: NextApiRequest): boolean {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return false;
  const expectedRunId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  return expectedRunId !== undefined && requestRunId(req) === expectedRunId;
}

function requestRunId(req: NextApiRequest): string | null {
  const header = req.headers[RUN_ID_HEADER];
  if (typeof header === 'string') return header;
  if (Array.isArray(header)) return header[0] ?? null;

  const query = req.query.runId;
  if (typeof query === 'string') return query;
  if (Array.isArray(query)) return query[0] ?? null;

  const body = req.body as IArmBody | undefined;
  return typeof body?.runId === 'string' ? body.runId : null;
}

function readTokenTtlMs(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const ttlMs = (body as IArmBody).ttlMs;
  if (
    typeof ttlMs !== 'number' ||
    !Number.isInteger(ttlMs) ||
    ttlMs < MIN_TOKEN_TTL_MS ||
    ttlMs > MAX_TOKEN_TTL_MS
  ) {
    return null;
  }
  return ttlMs;
}
