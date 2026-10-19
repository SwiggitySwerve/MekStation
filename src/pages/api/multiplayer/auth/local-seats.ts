import type { NextApiRequest, NextApiResponse } from 'next';

import { applySecurityHeaders } from '@/lib/api/security';
import { LocalSeatBodySchema } from '@/lib/api/securitySchemas';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import {
  getLocalSeatCredentialService,
  LocalSeatCredentialError,
} from '@/services/vault/LocalSeatCredentialService';

/** Literal loopback authority only. No DNS or forwarded headers participate. */
function isLocalRequest(req: NextApiRequest): boolean {
  const host = req.headers.host;
  if (typeof host !== 'string') return false;
  const authority = /^(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/.exec(
    host,
  );
  if (
    !authority ||
    (authority[2] && (Number(authority[2]) < 1 || Number(authority[2]) > 65535))
  )
    return false;
  const origin = req.headers.origin;
  if (
    origin !== undefined &&
    origin !== `http://${host}` &&
    origin !== `https://${host}`
  )
    return false;
  const site = req.headers['sec-fetch-site'];
  return site === undefined || site === 'same-origin' || site === 'none';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  applySecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  if (!isLocalRequest(req)) {
    res.status(403).json({ error: 'Local seats are same-host only' });
    return;
  }
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
