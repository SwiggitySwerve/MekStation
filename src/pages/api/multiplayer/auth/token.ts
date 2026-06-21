/**
 * Multiplayer Token Issuance API.
 *
 * `POST /api/multiplayer/auth/token` — mint a signed `IPlayerToken` for
 * the active vault identity. The client never holds the private key
 * directly; the server unlocks the identity (using the supplied
 * password) and signs the token in-process. The wire-encoded token is
 * returned and the caller can stamp it onto the WebSocket query string
 * via the multiplayer client.
 *
 * Wave 5 of Phase 4 (capstone integration). This endpoint exists so the
 * lobby UI doesn't have to ask the user to expose their vault private
 * key to the browser. A future hardened auth path would mint short-lived
 * tokens against an OAuth provider; for the capstone scope, password +
 * server-side signing is sufficient.
 *
 * Body: `{password, displayName?, ttlMs?}`.
 * Response: `{token: <base64-json>, playerId, displayName, publicKey}`
 *           or `{error}`.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IVaultIdentity } from '@/types/vault';

import {
  API_KDF_RATE_LIMIT,
  applySecurityHeaders,
  clientRateLimitKey,
  parseBody,
  rateLimit,
  rejectRateLimited,
} from '@/lib/api/security';
import { TokenIssueBodySchema } from '@/lib/api/securitySchemas';
import { canonicalTokenPayload } from '@/lib/multiplayer/server/auth';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import { rejectUnexpectedMethod } from '@/pages-modules/api/routeHelpers';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';
import {
  fromBase64,
  signData,
  unlockIdentity,
} from '@/services/vault/IdentityService';
import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours hard cap

// =============================================================================
// Types
// =============================================================================

interface IIssueResponse {
  token: string;
  playerId: string;
  displayName: string;
  publicKey: string;
  expiresAt: string;
}

interface IErrorResponse {
  error: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert a Uint8Array to base64 — mirrors the helper in
 * `client/issuePlayerToken.ts` so the server signs with the same byte
 * encoding the client validators expect.
 */
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IIssueResponse | IErrorResponse>,
): Promise<void> {
  applySecurityHeaders(res);
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const body = parseBody(
    TokenIssueBodySchema,
    req,
    res,
    'Password is required',
  );
  if (!body) return;
  const { password, displayName, ttlMs } = body;

  const limit = rateLimit(
    clientRateLimitKey(req, 'multiplayer-auth-token'),
    API_KDF_RATE_LIMIT,
  );
  if (!limit.ok) {
    rejectRateLimited(res, limit);
    return;
  }
  const ttl = ttlMs ? Math.min(ttlMs, MAX_TTL_MS) : DEFAULT_TTL_MS;

  // Load + unlock the active identity. We never persist the unlocked
  // identity beyond this request — the decrypted private key lives in
  // function scope and is GC'd after `signData` returns.
  const repository = getIdentityRepository();
  const stored = await repository.getActive();
  if (!stored) {
    res.status(404).json({ error: 'No vault identity configured' });
    return;
  }

  let identity: IVaultIdentity;
  try {
    identity = await unlockIdentity(stored, password);
  } catch {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  // Mint the token. Mirrors `client/issuePlayerToken.ts` byte-for-byte
  // so the server-side verification path accepts what we sign here.
  try {
    const publicKeyBytes = fromBase64(identity.publicKey);
    const privateKeyBytes = fromBase64(identity.privateKey);
    const playerId = derivePlayerId(publicKeyBytes);
    const nowMs = Date.now();
    const issuedAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + ttl).toISOString();

    const payload = canonicalTokenPayload({ playerId, issuedAt, expiresAt });
    const payloadBytes = new TextEncoder().encode(payload);
    const signatureBytes = await signData(payloadBytes, privateKeyBytes);

    const token: IPlayerToken = {
      playerId,
      issuedAt,
      expiresAt,
      publicKey: toBase64(publicKeyBytes),
      signature: toBase64(signatureBytes),
    };

    const finalDisplayName = displayName ?? identity.displayName;

    res.status(200).json({
      token: encodeTokenForWire(token),
      playerId,
      displayName: finalDisplayName,
      publicKey: identity.publicKey,
      expiresAt,
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to mint token',
    });
  }
}
