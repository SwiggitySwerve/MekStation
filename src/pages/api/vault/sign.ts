/**
 * Vault Sign API
 *
 * POST - Sign a bundle with the active identity
 *
 * NOTE: For Phase 1, all signing happens server-side.
 * The private key never leaves the server.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';
import {
  unlockIdentity,
  signMessage,
  getPublicIdentity,
} from '@/services/vault/IdentityService';
import type {
  IBundleMetadata,
  IShareableBundle,
  ShareableContentType,
} from '@/types/vault';

// =============================================================================
// Request Body Types
// =============================================================================

interface SignRequestBody {
  password?: unknown;
  contentType?: unknown;
  items?: unknown;
  description?: unknown;
  tags?: unknown;
}

interface BundleItem {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

/** Current bundle format version */
const BUNDLE_VERSION = '1.0.0';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as SignRequestBody;
    const {
      password,
      contentType,
      items,
      description,
      tags,
    } = body;

    // Validate required fields
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (typeof contentType !== 'string' || !['unit', 'pilot', 'force', 'encounter'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Type-safe items array
    const typedItems = items as BundleItem[];

    // Get active identity
    const repository = getIdentityRepository();
    const stored = await repository.getActive();

    if (!stored) {
      return res.status(404).json({ error: 'No identity found' });
    }

    // Unlock identity to get private key for signing
    let identity;
    try {
      identity = await unlockIdentity(stored, password);
    } catch {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create bundle metadata
    const metadata: IBundleMetadata = {
      version: BUNDLE_VERSION,
      contentType: contentType as ShareableContentType,
      itemCount: typedItems.length,
      author: getPublicIdentity(identity),
      createdAt: new Date().toISOString(),
      description: typeof description === 'string' ? description : undefined,
      tags: Array.isArray(tags) ? (tags as string[]) : undefined,
      appVersion: process.env.npm_package_version ?? '0.1.0',
    };

    // Serialize payload
    const payload = JSON.stringify(typedItems);

    // Create message to sign (metadata + payload)
    const messageToSign = JSON.stringify(metadata) + payload;

    // Sign the message
    const signature = await signMessage(messageToSign, identity);

    // Create bundle
    const bundle: IShareableBundle = {
      metadata,
      payload,
      signature,
    };

    // Generate suggested filename
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let name: string;
    const firstItem = typedItems[0];
    if (typedItems.length === 1 && firstItem?.name && typeof firstItem.name === 'string') {
      name = firstItem.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
    } else {
      name = `${contentType}s-${typedItems.length}`;
    }
    const suggestedFilename = `${name}-${date}.mekbundle`;

    return res.status(200).json({
      success: true,
      bundle,
      suggestedFilename,
    });
  } catch (error) {
    console.error('Failed to sign bundle:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to sign bundle',
    });
  }
}
