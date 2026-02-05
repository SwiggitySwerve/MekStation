/**
 * Vault Identity API
 *
 * GET - Check if identity exists, get public info
 * POST - Create new identity
 * PATCH - Update identity (display name, avatar)
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getIdentityRepository } from '@/services/vault/IdentityRepository';
import { createIdentity } from '@/services/vault/IdentityService';

// =============================================================================
// Request Body Types
// =============================================================================

interface CreateIdentityBody {
  displayName?: unknown;
  password?: unknown;
}

interface UpdateIdentityBody {
  displayName?: unknown;
  avatar?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const repository = getIdentityRepository();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, repository);
    case 'POST':
      return handlePost(req, res, repository);
    case 'PATCH':
      return handlePatch(req, res, repository);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Check if identity exists
 */
async function handleGet(
  _req: NextApiRequest,
  res: NextApiResponse,
  repository: ReturnType<typeof getIdentityRepository>,
) {
  try {
    const hasIdentity = await repository.hasIdentity();

    if (!hasIdentity) {
      return res.status(200).json({
        hasIdentity: false,
        publicIdentity: null,
      });
    }

    const stored = await repository.getActive();
    if (!stored) {
      return res.status(200).json({
        hasIdentity: true,
        publicIdentity: null,
      });
    }

    return res.status(200).json({
      hasIdentity: true,
      publicIdentity: {
        displayName: stored.displayName,
        publicKey: stored.publicKey,
        friendCode: stored.friendCode,
        avatar: stored.avatar,
      },
    });
  } catch (error) {
    console.error('Failed to check identity:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to check identity',
    });
  }
}

/**
 * POST - Create new identity
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  repository: ReturnType<typeof getIdentityRepository>,
) {
  try {
    const body = req.body as CreateIdentityBody;
    const { displayName, password } = body;

    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }

    if (trimmedName.length > 100) {
      return res
        .status(400)
        .json({ error: 'Display name too long (max 100 characters)' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    // Check if identity already exists
    const hasIdentity = await repository.hasIdentity();
    if (hasIdentity) {
      return res.status(409).json({
        error: 'Identity already exists. Use unlock endpoint.',
      });
    }

    // Create new identity
    const stored = await createIdentity(trimmedName, password);
    await repository.save(stored);

    // Return only public identity (private key stays server-side)
    // NOTE: For Phase 1, password-based operations are server-side.
    // Future phases may move decryption client-side for zero-knowledge.
    const publicIdentity = {
      displayName: stored.displayName,
      publicKey: stored.publicKey,
      friendCode: stored.friendCode,
      avatar: stored.avatar,
    };

    return res.status(201).json({
      success: true,
      publicIdentity,
    });
  } catch (error) {
    console.error('Failed to create identity:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to create identity',
    });
  }
}

/**
 * PATCH - Update identity
 */
async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  repository: ReturnType<typeof getIdentityRepository>,
) {
  try {
    const body = req.body as UpdateIdentityBody;
    const { displayName, avatar } = body;

    const stored = await repository.getActive();
    if (!stored) {
      return res.status(404).json({ error: 'No active identity found' });
    }

    const updates: { displayName?: string; avatar?: string } = {};

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid display name' });
      }
      const trimmedName = displayName.trim();
      if (trimmedName.length > 100) {
        return res
          .status(400)
          .json({ error: 'Display name too long (max 100 characters)' });
      }
      updates.displayName = trimmedName;
    }

    if (avatar !== undefined) {
      updates.avatar = typeof avatar === 'string' ? avatar : undefined;
    }

    await repository.update(stored.id, updates);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update identity:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to update identity',
    });
  }
}
