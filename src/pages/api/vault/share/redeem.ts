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

type ShareLinkService = ReturnType<typeof getShareLinkService>;
type RedeemResult = Awaited<ReturnType<ShareLinkService['redeem']>>;

interface RedeemInput {
  readonly type: 'token' | 'url';
  readonly value: string;
}

interface RedeemInputSuccess {
  readonly ok: true;
  readonly input: RedeemInput;
}

interface RedeemInputFailure {
  readonly ok: false;
  readonly error: string;
}

const REDEEM_ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  EXPIRED: 410,
  MAX_USES: 410,
  INACTIVE: 410,
};

function parseRedeemInput(
  body: RedeemShareLinkBody,
): RedeemInputSuccess | RedeemInputFailure {
  if (!body.token && !body.url) {
    return { ok: false, error: 'Either token or url is required' };
  }

  if (body.url && typeof body.url === 'string') {
    return { ok: true, input: { type: 'url', value: body.url } };
  }

  if (body.token && typeof body.token === 'string') {
    return { ok: true, input: { type: 'token', value: body.token } };
  }

  return { ok: false, error: 'token or url must be a string' };
}

function redeemErrorStatus(errorCode: string): number {
  return REDEEM_ERROR_STATUS[errorCode] ?? 400;
}

function redeemShareLink(
  service: ShareLinkService,
  input: RedeemInput,
): Promise<RedeemResult> {
  return input.type === 'url'
    ? service.redeemByUrl(input.value)
    : service.redeem(input.value);
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
    const parsed = parseRedeemInput(body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const result = await redeemShareLink(service, parsed.input);

    if (!result.success) {
      const statusCode = redeemErrorStatus(result.error.errorCode);
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
