/**
 * E2E-only vault identity activator.
 *
 * Playwright needs two real vault identities to prove host/guest
 * multiplayer auth. The production identity endpoint intentionally only
 * creates the first identity, so this route provides a locked test seam
 * that is unreachable unless the dev server was launched by Playwright
 * with a matching per-run token.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';
import { createIdentity } from '@/services/vault/IdentityService';

interface ISeedIdentityResponse {
  readonly success: true;
  readonly id: string;
  readonly displayName: string;
  readonly publicKey: string;
  readonly friendCode: string;
}

interface IDeleteIdentityResponse {
  readonly success: true;
  readonly deleted: number;
}

interface IErrorResponse {
  readonly error: string;
}

type ResponseBody =
  | ISeedIdentityResponse
  | IDeleteIdentityResponse
  | IErrorResponse;

interface ISeedIdentityBody {
  readonly displayName?: unknown;
  readonly password?: unknown;
  readonly runId?: unknown;
}

interface IDeleteIdentityBody {
  readonly ids?: unknown;
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
    await handlePost(req, res);
    return;
  }

  if (req.method === 'DELETE') {
    await handleDelete(req, res);
    return;
  }

  rejectUnexpectedMethod(req, res, ['POST', 'DELETE']);
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

  const body = req.body as ISeedIdentityBody | IDeleteIdentityBody | undefined;
  return typeof body?.runId === 'string' ? body.runId : null;
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const body = req.body as ISeedIdentityBody;
  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!displayName) {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }
  if (displayName.length > 100) {
    res.status(400).json({ error: 'Display name too long' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({
      error: 'Password must be at least 8 characters',
    });
    return;
  }

  const repository = getIdentityRepository();
  const identity = await createIdentity(displayName, password);
  await repository.save(identity);
  await repository.setActive(identity.id);

  res.status(201).json({
    success: true,
    id: identity.id,
    displayName: identity.displayName,
    publicKey: identity.publicKey,
    friendCode: identity.friendCode,
  });
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const body = req.body as IDeleteIdentityBody;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === 'string')
    : [];

  const repository = getIdentityRepository();
  let deleted = 0;
  for (const id of ids) {
    await repository.delete(id);
    deleted += 1;
  }

  res.status(200).json({ success: true, deleted });
}
