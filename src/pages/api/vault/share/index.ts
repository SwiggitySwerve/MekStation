/**
 * Share Links API
 *
 * GET - List all share links
 * POST - Create a new share link
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getShareLinkService } from '@/services/vault/ShareLinkService';
import type { PermissionLevel, PermissionScopeType, ContentCategory } from '@/types/vault';

// =============================================================================
// Request Body Types
// =============================================================================

interface CreateShareLinkBody {
  scopeType?: unknown;
  scopeId?: unknown;
  scopeCategory?: unknown;
  level?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  label?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const service = getShareLinkService();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, service);
    case 'POST':
      return handlePost(req, res, service);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - List all share links
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>
) {
  try {
    const { active } = req.query;

    const links = active === 'true'
      ? await service.getActiveLinks()
      : await service.getAllLinks();

    return res.status(200).json({
      links,
      count: links.length,
    });
  } catch (error) {
    console.error('Failed to list share links:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list share links',
    });
  }
}

/**
 * POST - Create a new share link
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>
) {
  try {
    const body = req.body as CreateShareLinkBody;

    // Validate required fields
    if (!body.scopeType || typeof body.scopeType !== 'string') {
      return res.status(400).json({ error: 'scopeType is required' });
    }

    if (!['item', 'folder', 'category', 'all'].includes(body.scopeType)) {
      return res.status(400).json({
        error: 'scopeType must be one of: item, folder, category, all',
      });
    }

    if (!body.level || typeof body.level !== 'string') {
      return res.status(400).json({ error: 'level is required' });
    }

    if (!['read', 'write', 'admin'].includes(body.level)) {
      return res.status(400).json({
        error: 'level must be one of: read, write, admin',
      });
    }

    // Validate scope-specific requirements
    const scopeType = body.scopeType as PermissionScopeType;
    const level = body.level as PermissionLevel;

    let scopeId: string | null = null;
    let scopeCategory: ContentCategory | null = null;

    if (scopeType === 'item' || scopeType === 'folder') {
      if (!body.scopeId || typeof body.scopeId !== 'string') {
        return res.status(400).json({ error: 'scopeId is required for item/folder scope' });
      }
      scopeId = body.scopeId;
    }

    if (scopeType === 'category') {
      if (!body.scopeCategory || typeof body.scopeCategory !== 'string') {
        return res.status(400).json({ error: 'scopeCategory is required for category scope' });
      }
      if (!['units', 'pilots', 'forces', 'encounters'].includes(body.scopeCategory)) {
        return res.status(400).json({
          error: 'scopeCategory must be one of: units, pilots, forces, encounters',
        });
      }
      scopeCategory = body.scopeCategory as ContentCategory;
    }

    // Validate optional fields
    let expiresAt: string | null = null;
    if (body.expiresAt !== undefined) {
      if (typeof body.expiresAt !== 'string') {
        return res.status(400).json({ error: 'expiresAt must be a string' });
      }
      const date = new Date(body.expiresAt);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'expiresAt must be a valid ISO date' });
      }
      expiresAt = body.expiresAt;
    }

    let maxUses: number | null = null;
    if (body.maxUses !== undefined) {
      if (typeof body.maxUses !== 'number' || body.maxUses < 1) {
        return res.status(400).json({ error: 'maxUses must be a positive number' });
      }
      maxUses = Math.floor(body.maxUses);
    }

    let label: string | undefined;
    if (body.label !== undefined) {
      if (typeof body.label !== 'string') {
        return res.status(400).json({ error: 'label must be a string' });
      }
      label = body.label.trim() || undefined;
    }

    // Create the share link
    const result = await service.create({
      scopeType,
      scopeId,
      scopeCategory,
      level,
      expiresAt,
      maxUses,
      label,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      link: result.link,
      url: result.url,
    });
  } catch (error) {
    console.error('Failed to create share link:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create share link',
    });
  }
}
