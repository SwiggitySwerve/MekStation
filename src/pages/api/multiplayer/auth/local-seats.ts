import type { NextApiRequest, NextApiResponse } from 'next';

import { rejectUnlessSameHost } from '@/lib/api/sameHostGuard';
import { applySecurityHeaders } from '@/lib/api/security';
import { LocalSeatBodySchema } from '@/lib/api/securitySchemas';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import {
  getLocalSeatCredentialService,
  LocalSeatCredentialError,
} from '@/services/vault/LocalSeatCredentialService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  applySecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  if (rejectUnlessSameHost(req, res, 'Local seats are same-host only')) return;
  if (rejectUnexpectedMethod(req, res, ['GET', 'POST'])) return;
  try {
    const service = getLocalSeatCredentialService();
    if (req.method === 'GET') {
      res.status(200).json({ seats: service.listSeats() });
      return;
    }
    const parsed = LocalSeatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Malformed local seat request' });
      return;
    }
    const body = parsed.data;
    let result;
    if (body.action === 'mint') {
      const { action: _action, ...input } = body;
      result = await service.mint(input);
    } else if (body.action === 'provision') {
      const { action: _action, ...input } = body;
      result = await service.provision(input);
    } else {
      const { action: _action, ...input } = body;
      result = await service.revoke(input);
    }
    res.status(200).json(result);
  } catch (error) {
    if (
      !(error instanceof LocalSeatCredentialError) ||
      error.code === 'internal-error'
    ) {
      res.status(500).json({ error: 'Local seat request failed' });
      return;
    }
    if (error.code === 'throttled') {
      res.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((error.detail.retryAfterMs ?? 1000) / 1000)),
      );
      res.status(429).json({
        error: 'Local seat request throttled',
        code: 'LOCAL_SEAT_THROTTLED',
      });
      return;
    }
    const status =
      error.code === 'invalid-credentials' || error.code === 'operator-denied'
        ? 401
        : 409;
    const code =
      error.code === 'invalid-credentials'
        ? 'LOCAL_SEAT_DENIED'
        : error.code === 'operator-unavailable'
          ? 'OPERATOR_IDENTITY_REQUIRED'
          : error.code.replaceAll('-', '_').toUpperCase();
    res.status(status).json({
      error:
        error.code === 'invalid-credentials'
          ? 'Invalid local seat credentials'
          : 'Local seat request refused',
      code,
      ...error.detail,
    });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };
