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
  /** Whether a `restoreActiveId` was found and reactivated. */
  readonly restored?: boolean;
}

interface IActiveIdentityResponse {
  readonly success: true;
  readonly activeId: string | null;
}

interface IErrorResponse {
  readonly error: string;
}

type ResponseBody =
  | ISeedIdentityResponse
  | IDeleteIdentityResponse
  | IActiveIdentityResponse
  | IErrorResponse;

interface ISeedIdentityBody {
  readonly displayName?: unknown;
  readonly password?: unknown;
  readonly runId?: unknown;
}

interface IDeleteIdentityBody {
  readonly ids?: unknown;
  readonly runId?: unknown;
  /**
   * Identity to make active again after the deletes (task 20.5).
   *
   * Seeding an identity calls `setActive`, which deactivates EVERY other
   * identity - so a harness that seeds and then deletes its own leaves
   * the machine with no active identity at all, silently logging out
   * whoever was using it. The caller reads the prior active id before
   * seeding and hands it back here so cleanup restores what it found.
   */
  readonly restoreActiveId?: unknown;
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

  if (req.method === 'GET') {
    await handleGetActive(req, res);
    return;
  }

  rejectUnexpectedMethod(req, res, ['GET', 'POST', 'DELETE']);
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

/**
 * Reports which identity is active, so a harness can put it back.
 *
 * Read-only and id-only: the caller needs to RESTORE the prior active
 * identity, not to learn anything about it.
 */
async function handleGetActive(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const repository = getIdentityRepository();
  const active = await repository.getActive();
  res.status(200).json({ success: true, activeId: active?.id ?? null });
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

  // Restore AFTER the deletes: reactivating first would just be undone
  // by nothing, but doing it last means the final state is the one the
  // caller asked for even if it named an id it also deleted.
  const restoreActiveId =
    typeof body.restoreActiveId === 'string' ? body.restoreActiveId : null;
  if (restoreActiveId === null) {
    // Response shape stays exactly as it was for callers that did not
    // ask for a restore - adding a field they never requested would
    // change their contract for no benefit.
    res.status(200).json({ success: true, deleted });
    return;
  }

  let restored = false;
  {
    // A restore target that no longer exists is reported, not thrown:
    // the harness cannot know whether the identity it saw at start was
    // removed by something else meanwhile, and failing teardown over it
    // would turn a tidy-up into a test failure.
    const existing = await repository.getById(restoreActiveId);
    if (existing) {
      await repository.setActive(restoreActiveId);
      restored = true;
    }
  }

  res.status(200).json({ success: true, deleted, restored });
}
