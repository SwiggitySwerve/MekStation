/**
 * Share Link By ID API
 *
 * GET - Get share link details
 * PATCH - Update share link (label, expiry, maxUses, active status)
 * DELETE - Delete share link
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { rejectMissingQueryString } from '@/pages-modules/api/routeHelpers';
import { getShareLinkService } from '@/services/vault/ShareLinkService';

// =============================================================================
// Request Body Types
// =============================================================================

interface UpdateShareLinkBody {
  label?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  isActive?: unknown;
}

type ShareLinkService = ReturnType<typeof getShareLinkService>;

interface MutationResult {
  readonly success: boolean;
  readonly error?: string;
}

function sendBadRequest(res: NextApiResponse, error: string): false {
  res.status(400).json({ error });
  return false;
}

function sendMutationResult(
  res: NextApiResponse,
  result: MutationResult,
): boolean {
  if (result.success) return true;
  res.status(400).json({ error: result.error });
  return false;
}

async function updateLabelField(
  body: UpdateShareLinkBody,
  service: ShareLinkService,
  id: string,
  res: NextApiResponse,
): Promise<boolean> {
  if (body.label === undefined) return true;
  if (body.label !== null && typeof body.label !== 'string') {
    return sendBadRequest(res, 'label must be a string or null');
  }
  const result = await service.updateLabel(
    id,
    body.label === null ? null : body.label.trim() || null,
  );
  return sendMutationResult(res, result);
}

async function updateExpiryField(
  body: UpdateShareLinkBody,
  service: ShareLinkService,
  id: string,
  res: NextApiResponse,
): Promise<boolean> {
  if (body.expiresAt === undefined) return true;
  if (body.expiresAt !== null) {
    if (typeof body.expiresAt !== 'string') {
      return sendBadRequest(res, 'expiresAt must be a string or null');
    }
    if (Number.isNaN(new Date(body.expiresAt).getTime())) {
      return sendBadRequest(res, 'expiresAt must be a valid ISO date');
    }
  }
  const result = await service.updateExpiry(
    id,
    body.expiresAt as string | null,
  );
  return sendMutationResult(res, result);
}

async function updateMaxUsesField(
  body: UpdateShareLinkBody,
  service: ShareLinkService,
  id: string,
  res: NextApiResponse,
): Promise<boolean> {
  if (body.maxUses === undefined) return true;
  if (
    body.maxUses !== null &&
    (typeof body.maxUses !== 'number' || body.maxUses < 1)
  ) {
    return sendBadRequest(res, 'maxUses must be a positive number or null');
  }
  const result = await service.updateMaxUses(
    id,
    body.maxUses === null ? null : Math.floor(body.maxUses),
  );
  return sendMutationResult(res, result);
}

async function updateActiveField(
  body: UpdateShareLinkBody,
  service: ShareLinkService,
  id: string,
  res: NextApiResponse,
): Promise<boolean> {
  if (body.isActive === undefined) return true;
  if (typeof body.isActive !== 'boolean') {
    return sendBadRequest(res, 'isActive must be a boolean');
  }
  const result = body.isActive
    ? await service.reactivate(id)
    : await service.deactivate(id);
  return sendMutationResult(res, result);
}

async function applyShareLinkPatch(
  body: UpdateShareLinkBody,
  service: ShareLinkService,
  id: string,
  res: NextApiResponse,
): Promise<boolean> {
  const updateSteps = [
    updateLabelField,
    updateExpiryField,
    updateMaxUsesField,
    updateActiveField,
  ];

  for (const updateStep of updateSteps) {
    if (!(await updateStep(body, service, id, res))) return false;
  }

  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const id = rejectMissingQueryString(req, res, 'id', 'Invalid share link ID');
  if (!id) return;

  const service = getShareLinkService();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, service, id);
    case 'PATCH':
      return handlePatch(req, res, service, id);
    case 'DELETE':
      return handleDelete(req, res, service, id);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get share link details
 */
async function handleGet(
  _req: NextApiRequest,
  res: NextApiResponse,
  service: ShareLinkService,
  id: string,
) {
  try {
    const link = await service.getById(id);

    if (!link) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    return res.status(200).json({
      link,
      url: service.buildUrl(link.token),
      webUrl: service.buildWebUrl(link.token),
      isValid: service.isLinkValid(link),
      remainingUses: service.getRemainingUses(link),
    });
  } catch (error) {
    console.error('Failed to get share link:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to get share link',
    });
  }
}

/**
 * PATCH - Update share link
 */
async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ShareLinkService,
  id: string,
) {
  try {
    const body = req.body as UpdateShareLinkBody;

    // Check link exists
    const existing = await service.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const updated = await applyShareLinkPatch(body, service, id, res);
    if (!updated) return;

    // Return updated link
    const updatedLink = await service.getById(id);
    return res.status(200).json({
      success: true,
      link: updatedLink,
    });
  } catch (error) {
    console.error('Failed to update share link:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to update share link',
    });
  }
}

/**
 * DELETE - Delete share link
 */
async function handleDelete(
  _req: NextApiRequest,
  res: NextApiResponse,
  service: ShareLinkService,
  id: string,
) {
  try {
    const result = await service.delete(id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to delete share link:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to delete share link',
    });
  }
}
