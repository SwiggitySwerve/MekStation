/**
 * Share Link Redeem API
 *
 * POST - Redeem a share link by token or URL
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getShareLinkService } from '@/services/vault/ShareLinkService';

// =============================================================================
// Request Body Types
// =============================================================================

interface RedeemShareLinkBody {
  token?: unknown;
  url?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const service = getShareLinkService();

  try {
    const body = req.body as RedeemShareLinkBody;

    // Either token or url must be provided
    if (!body.token && !body.url) {
      return res.status(400).json({ error: 'Either token or url is required' });
    }

    let result;

    if (body.url && typeof body.url === 'string') {
      // Redeem by URL
      result = await service.redeemByUrl(body.url);
    } else if (body.token && typeof body.token === 'string') {
      // Redeem by token
      result = await service.redeem(body.token);
    } else {
      return res.status(400).json({ error: 'token or url must be a string' });
    }

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCode =
        result.error.errorCode === 'NOT_FOUND'
          ? 404
          : result.error.errorCode === 'EXPIRED'
            ? 410
            : result.error.errorCode === 'MAX_USES'
              ? 410
              : result.error.errorCode === 'INACTIVE'
                ? 410
                : 400;

      return res.status(statusCode).json({
        success: false,
        error: result.error.message,
        errorCode: result.error.errorCode,
      });
    }

    // Return link info for successful redemption
    return res.status(200).json({
      success: true,
      link: result.data.link,
    });
  } catch (error) {
    console.error('Failed to redeem share link:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to redeem share link',
    });
  }
}
