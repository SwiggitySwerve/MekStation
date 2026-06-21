import type { NextApiRequest, NextApiResponse } from 'next';
import type { z } from 'zod';

export interface IRateLimitPolicy {
  readonly maxRequests: number;
  readonly windowMs: number;
}

interface IRateLimitBucket {
  count: number;
  resetAtMs: number;
}

interface IParseBodyOptions {
  readonly includeDetails?: boolean;
}

export type RateLimitResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly retryAfterSeconds: number };

const buckets = new Map<string, IRateLimitBucket>();

export const API_KDF_RATE_LIMIT: IRateLimitPolicy = {
  maxRequests: 5,
  windowMs: 60_000,
};

export const API_MUTATION_RATE_LIMIT: IRateLimitPolicy = {
  maxRequests: 5,
  windowMs: 60_000,
};

export function applySecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

export function parseBody<T>(
  schema: z.ZodType<T>,
  req: NextApiRequest,
  res: NextApiResponse,
  error = 'Malformed body',
  options: IParseBodyOptions = {},
): T | null {
  const result = schema.safeParse(req.body);
  if (result.success) return result.data;

  const payload: {
    error: string;
    details?: { path: string; message: string }[];
  } = { error };
  if (options.includeDetails !== false) {
    payload.details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }

  res.status(400).json(payload);
  return null;
}

export function clientRateLimitKey(
  req: NextApiRequest,
  routeKey: string,
): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwardedFor = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor;
  const client =
    firstForwardedFor?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return `${routeKey}:${client}`;
}

export function rateLimit(
  key: string,
  policy: IRateLimitPolicy,
  nowMs = Date.now(),
): RateLimitResult {
  const current = buckets.get(key);
  if (!current || current.resetAtMs <= nowMs) {
    buckets.set(key, {
      count: 1,
      resetAtMs: nowMs + policy.windowMs,
    });
    return { ok: true };
  }

  if (current.count >= policy.maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAtMs - nowMs) / 1000),
      ),
    };
  }

  current.count += 1;
  return { ok: true };
}

export function rejectRateLimited(
  res: NextApiResponse,
  result: Exclude<RateLimitResult, { ok: true }>,
): void {
  res.setHeader('Retry-After', String(result.retryAfterSeconds));
  res.status(429).json({ error: 'Too many requests' });
}

export function resetApiRateLimitersForTests(): void {
  buckets.clear();
}
