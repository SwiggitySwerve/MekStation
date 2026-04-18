/**
 * Client-side token issuer.
 *
 * Wave 2 of Phase 4. Takes the user's vault `IVaultIdentity` (which
 * contains the unlocked Ed25519 keypair), derives the network player id,
 * and signs a self-issued bearer token. The token can then be stamped
 * onto every REST request and WebSocket upgrade.
 *
 * Token issuance is local: the client never contacts the server. The
 * server verifies independently via the embedded public key + signature
 * (`verifyPlayerToken`).
 *
 * Caching: callers typically want to reuse the same token until it
 * approaches expiry. `issuePlayerToken` accepts an optional cache; the
 * cache returns the stored token unless we're within `refreshWindowMs`
 * of expiry, in which case it mints a fresh one.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

import type { IPlayerToken } from '@/types/multiplayer/Player';
import type { IVaultIdentity } from '@/types/vault';

import { canonicalTokenPayload } from '@/lib/multiplayer/server/auth';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import {
  signData,
  fromBase64 as vaultFromBase64,
} from '@/services/vault/IdentityService';

// =============================================================================
// Constants
// =============================================================================

/** Default token lifetime — spec says 1 hour. */
export const DEFAULT_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Refresh threshold — spec says 5 minutes before expiry. */
export const DEFAULT_REFRESH_WINDOW_MS = 5 * 60 * 1000;

// =============================================================================
// Cache
// =============================================================================

/**
 * Per-identity cache. The caller is expected to keep one of these per
 * vault identity (most apps have exactly one). Cache holds the most
 * recent unexpired token; if the cached token is within
 * `refreshWindowMs` of `expiresAt`, the next call mints a new one.
 */
export interface ITokenCache {
  current: IPlayerToken | null;
}

/** Make a fresh empty cache. */
export function createTokenCache(): ITokenCache {
  return { current: null };
}

// =============================================================================
// Issue
// =============================================================================

export interface IIssueTokenOptions {
  /** Token lifetime in ms. Default 1h. */
  ttlMs?: number;
  /** Refresh threshold — return cached token if expiry is further than this away. */
  refreshWindowMs?: number;
  /** Optional cache for reuse across calls. */
  cache?: ITokenCache;
  /** Inject a clock for tests. */
  nowMs?: number;
}

/**
 * Convert a Uint8Array to base64. Mirrors `IdentityService.toBase64`
 * but kept inline to avoid widening the surface we depend on.
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

/**
 * Mint a fresh bearer token for the supplied identity. Will return a
 * cached token if `options.cache` is supplied AND the cached token is
 * not within `refreshWindowMs` of expiry.
 */
export async function issuePlayerToken(
  identity: IVaultIdentity,
  options: IIssueTokenOptions = {},
): Promise<IPlayerToken> {
  const ttlMs = options.ttlMs ?? DEFAULT_TOKEN_TTL_MS;
  const refreshWindowMs = options.refreshWindowMs ?? DEFAULT_REFRESH_WINDOW_MS;
  const nowMs = options.nowMs ?? Date.now();

  // Cache hit path — reuse the existing token if it's not near expiry.
  if (options.cache?.current) {
    const cached = options.cache.current;
    const expiresMs = Date.parse(cached.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs - nowMs > refreshWindowMs) {
      return cached;
    }
  }

  // Mint fresh.
  const publicKeyBytes = vaultFromBase64(identity.publicKey);
  const privateKeyBytes = vaultFromBase64(identity.privateKey);
  const playerId = derivePlayerId(publicKeyBytes);
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + ttlMs).toISOString();

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

  if (options.cache) {
    options.cache.current = token;
  }
  return token;
}

/**
 * Force-clear a cache entry. Used by clients that observe a server
 * `UNAUTHORIZED` response and want the next call to mint fresh.
 */
export function invalidateTokenCache(cache: ITokenCache): void {
  cache.current = null;
}
