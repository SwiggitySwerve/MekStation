/**
 * Vault Identity Unlock API
 *
 * POST - Unlock identity with password
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { unlockIdentity } from '@/services/vault/IdentityService';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';

// =============================================================================
// Request Body Types
// =============================================================================

interface UnlockRequestBody {
  password?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as UnlockRequestBody;
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const repository = getIdentityRepository();
    const stored = await repository.getActive();

    if (!stored) {
      return res.status(404).json({ error: 'No identity found' });
    }

    try {
      // Verify password is correct by attempting to decrypt
      // The private key stays server-side; we only confirm unlock success
      await unlockIdentity(stored, password);

      // Return only public identity (private key never leaves server)
      // NOTE: For Phase 1, signing operations happen server-side.
      // The client is considered "unlocked" when password verified.
      return res.status(200).json({
        success: true,
        publicIdentity: {
          displayName: stored.displayName,
          publicKey: stored.publicKey,
          friendCode: stored.friendCode,
          avatar: stored.avatar,
        },
      });
    } catch (_decryptError) {
      // Decryption failed - wrong password
      return res.status(401).json({
        error: 'Invalid password',
      });
    }
  } catch (error) {
    console.error('Failed to unlock identity:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to unlock identity',
    });
  }
}
