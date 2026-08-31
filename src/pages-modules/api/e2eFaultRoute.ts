/**
 * E2E-only one-shot fault injector.
 *
 * The acceptance scenarios that prove failure truthfulness (E2E-13's
 * "persistence failure is truthful") need a SCOPED, deterministic fault
 * in the live server - the same explicit-seam discipline the unit
 * suites use (`_setFailAtHeadUpdateForTests`), never an engine-behavior
 * dependency. This route arms the store's head-update crash for exactly
 * one batch append; the arm is consumed at the failure point, so it
 * cannot leak past the append it was armed for.
 *
 * Locked behind the same per-run guard as the vault-identity seam: the
 * route answers 404 unless the dev server was launched by Playwright
 * with a matching per-run token.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  E2E_FAULT_SENTINEL,
  _armFailAtHeadUpdateOnce,
  _isFailAtHeadUpdateArmed,
} from '@/lib/multiplayer/server/DurableMatchStore';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';

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

type ResponseBody = IArmResponse | IStatusResponse | IErrorResponse;

interface IArmBody {
  readonly kind?: unknown;
  readonly mode?: unknown;
  readonly runId?: unknown;
}

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  if (!isAuthorizedE2ERequest(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body as IArmBody;
    if (body.kind !== 'append-head-update' || body.mode !== 'once') {
      res.status(400).json({
        error: 'Only {kind: "append-head-update", mode: "once"} is supported',
      });
      return;
    }
    // Arm BOTH graphs: the module flag serves whatever store instance
    // shares this bundle; the sentinel file reaches the socket host's
    // tsx-graph store, and is consumed (unlinked) at the failure point.
    _armFailAtHeadUpdateOnce();
    mkdirSync(dirname(E2E_FAULT_SENTINEL), { recursive: true });
    writeFileSync(E2E_FAULT_SENTINEL, new Date().toISOString());
    res.status(200).json({ success: true, armed: true });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      armed: _isFailAtHeadUpdateArmed() || existsSync(E2E_FAULT_SENTINEL),
    });
    return;
  }

  rejectUnexpectedMethod(req, res, ['GET', 'POST']);
}

function isAuthorizedE2ERequest(req: NextApiRequest): boolean {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return false;
  const expectedRunId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!expectedRunId) return false;
  return requestRunId(req) === expectedRunId;
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
