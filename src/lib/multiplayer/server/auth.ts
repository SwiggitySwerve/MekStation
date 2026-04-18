/**
 * Server-side player token verification.
 *
 * Wave 2 of Phase 4. The server reads a base64-encoded `IPlayerToken`
 * from either the `Authorization: Bearer <token>` header (REST) or the
 * `?token=...` query string (WebSocket upgrade), decodes it, then
 * cryptographically verifies it via Web Crypto Ed25519.
 *
 * Verification rules (mirror the spec):
 *   1. The wire string decodes to a valid `IPlayerToken` shape.
 *   2. `expiresAt > now`.
 *   3. `issuedAt <= now + CLOCK_DRIFT_MS` (small future tolerance for
 *      clients with a fast clock — spec says 10s).
 *   4. `playerId === derivePlayerId(publicKey)` so the token can't be
 *      retargeted to a different identity.
 *   5. Ed25519 signature over the canonical payload validates under the
 *      embedded `publicKey`.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

import type { NextApiRequest } from 'next';

import {
  decodeTokenFromWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';

import { derivePlayerId } from './playerIdFromPublicKey';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum future-clock drift the server tolerates on `issuedAt`. Spec:
 * 10 seconds. Anything beyond this is treated as a malformed token.
 */
const CLOCK_DRIFT_MS = 10_000;

// =============================================================================
// Crypto helpers (mirror IdentityService — keep compatible)
// =============================================================================

/**
 * Resolve the right Web Crypto implementation for the runtime. Browser
 * uses `window.crypto`; Node uses `crypto.webcrypto`. Both expose
 * `subtle.verify('Ed25519', ...)`.
 */
async function getCrypto(): Promise<Crypto> {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as { crypto?: Crypto };
    if (g.crypto && typeof g.crypto.subtle !== 'undefined') {
      return g.crypto;
    }
  }
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.webcrypto as unknown as Crypto;
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Canonical payload — must be byte-identical between signer and verifier
// =============================================================================

/**
 * Build the canonical signing payload. Object key order is locked
 * lexicographically so JSON.stringify is deterministic across runtimes
 * (V8 preserves insertion order for non-integer keys, but we don't want
 * to lean on that — explicit ordering is the safer contract).
 */
export function canonicalTokenPayload(args: {
  playerId: string;
  issuedAt: string;
  expiresAt: string;
}): string {
  // Keys spelled in alphabetical order — matches the client signer.
  return JSON.stringify({
    expiresAt: args.expiresAt,
    issuedAt: args.issuedAt,
    playerId: args.playerId,
  });
}

// =============================================================================
// Verification
// =============================================================================

/** Reasons verification can fail. Useful for logs + 401 responses. */
export type IVerifyFailureReason =
  | 'malformed'
  | 'expired'
  | 'clock-drift'
  | 'pid-mismatch'
  | 'bad-signature';

export interface IVerifySuccess {
  ok: true;
  playerId: string;
  publicKey: string;
  token: IPlayerToken;
}

export interface IVerifyFailure {
  ok: false;
  reason: IVerifyFailureReason;
}

export type IVerifyResult = IVerifySuccess | IVerifyFailure;

/**
 * Verify a structured token. Returns a discriminated `ok: true|false`
 * result so callers can both branch and log the failure reason. Time is
 * injected via `nowMs` for tests; defaults to `Date.now()`.
 */
export async function verifyPlayerToken(
  token: IPlayerToken | null,
  nowMs: number = Date.now(),
): Promise<IVerifyResult> {
  if (!token) return { ok: false, reason: 'malformed' };

  // 1. Expiry.
  const expiresMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return { ok: false, reason: 'malformed' };
  }
  if (expiresMs <= nowMs) {
    return { ok: false, reason: 'expired' };
  }

  // 2. issuedAt sanity (small future drift allowed).
  const issuedMs = Date.parse(token.issuedAt);
  if (!Number.isFinite(issuedMs)) {
    return { ok: false, reason: 'malformed' };
  }
  if (issuedMs > nowMs + CLOCK_DRIFT_MS) {
    return { ok: false, reason: 'clock-drift' };
  }
  if (issuedMs > expiresMs) {
    return { ok: false, reason: 'malformed' };
  }

  // 3. playerId must be derived from publicKey — prevents id swap.
  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = fromBase64(token.publicKey);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  let derivedId: string;
  try {
    derivedId = derivePlayerId(publicKeyBytes);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (derivedId !== token.playerId) {
    return { ok: false, reason: 'pid-mismatch' };
  }

  // 4. Ed25519 signature check.
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = fromBase64(token.signature);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const payload = canonicalTokenPayload({
    playerId: token.playerId,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  });
  const payloadBytes = new TextEncoder().encode(payload);

  const crypto = await getCrypto();
  let verified: boolean;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    verified = await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureBytes,
      payloadBytes,
    );
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }
  if (!verified) {
    return { ok: false, reason: 'bad-signature' };
  }

  return {
    ok: true,
    playerId: token.playerId,
    publicKey: token.publicKey,
    token,
  };
}

// =============================================================================
// Request extraction helpers
// =============================================================================

/**
 * Pull the wire-format token off an incoming Next.js API request. Looks
 * at the `Authorization: Bearer <token>` header first; falls back to a
 * `token` query param so unit tests + WS-style clients can share the
 * same helper.
 *
 * Returns the decoded `IPlayerToken` or `null` if no token was present
 * or the wire string couldn't be decoded into a structurally valid
 * token. (Cryptographic verification is the caller's job.)
 */
export function extractTokenFromRequest(
  req: NextApiRequest,
): IPlayerToken | null {
  const wire = readBearer(req.headers.authorization) ?? readQueryToken(req);
  if (!wire) return null;
  return decodeTokenFromWire(wire);
}

function readBearer(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  const trimmed = match[1].trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readQueryToken(req: NextApiRequest): string | null {
  const q = req.query?.token;
  if (typeof q === 'string' && q.length > 0) return q;
  if (Array.isArray(q) && q.length > 0 && typeof q[0] === 'string') {
    return q[0];
  }
  return null;
}

/**
 * Convenience wrapper used by REST handlers — grab a token, verify it,
 * and return either the verified result or null. Caller decides on the
 * 401 response shape.
 */
export async function authenticateRequest(
  req: NextApiRequest,
  nowMs?: number,
): Promise<IVerifyResult> {
  const token = extractTokenFromRequest(req);
  return verifyPlayerToken(token, nowMs);
}
