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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid share link ID' });
  }

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
  service: ReturnType<typeof getShareLinkService>,
  id: string
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
      error: error instanceof Error ? error.message : 'Failed to get share link',
    });
  }
}

/**
 * PATCH - Update share link
 */
async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>,
  id: string
) {
  try {
    const body = req.body as UpdateShareLinkBody;

    // Check link exists
    const existing = await service.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    // Update label
    if (body.label !== undefined) {
      if (body.label !== null && typeof body.label !== 'string') {
        return res.status(400).json({ error: 'label must be a string or null' });
      }
      const result = await service.updateLabel(
        id,
        body.label === null ? null : body.label.trim() || null
      );
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
    }

    // Update expiry
    if (body.expiresAt !== undefined) {
      if (body.expiresAt !== null) {
        if (typeof body.expiresAt !== 'string') {
          return res.status(400).json({ error: 'expiresAt must be a string or null' });
        }
        const date = new Date(body.expiresAt);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ error: 'expiresAt must be a valid ISO date' });
        }
      }
      const result = await service.updateExpiry(id, body.expiresAt as string | null);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
    }

    // Update max uses
    if (body.maxUses !== undefined) {
      if (body.maxUses !== null && (typeof body.maxUses !== 'number' || body.maxUses < 1)) {
        return res.status(400).json({ error: 'maxUses must be a positive number or null' });
      }
      const result = await service.updateMaxUses(
        id,
        body.maxUses === null ? null : Math.floor(body.maxUses)
      );
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
    }

    // Update active status
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      const result = body.isActive
        ? await service.reactivate(id)
        : await service.deactivate(id);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
    }

    // Return updated link
    const updatedLink = await service.getById(id);
    return res.status(200).json({
      success: true,
      link: updatedLink,
    });
  } catch (error) {
    console.error('Failed to update share link:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update share link',
    });
  }
}

/**
 * DELETE - Delete share link
 */
async function handleDelete(
  _req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>,
  id: string
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
      error: error instanceof Error ? error.message : 'Failed to delete share link',
    });
  }
}
