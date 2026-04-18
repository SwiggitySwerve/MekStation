/**
 * Player Identity Types
 *
 * Wave 2 of Phase 4 (multiplayer foundation). Defines the on-the-wire
 * shapes for player references, signed bearer tokens, and stored player
 * profiles. Every shape is paired with a zod schema so REST + WS
 * boundaries can validate before trusting.
 *
 * Token wire format:
 *   - `IPlayerToken` is JSON-serialised then base64-encoded for transport
 *     (header `Authorization: Bearer <base64>` and WS query
 *     `?token=<base64>`).
 *   - `publicKey` and `signature` are themselves base64 strings inside
 *     the JSON so the outer base64 envelope contains plain ASCII.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

import { z } from 'zod';

import { isPlayerIdShape } from '@/lib/multiplayer/server/playerIdFromPublicKey';

// =============================================================================
// IPlayerRef — minimal seat occupant view
// =============================================================================

/**
 * The smallest description of a player the server needs to assign a seat
 * and render lobby UI. `avatarUrl` is optional so a brand-new identity
 * can connect before any avatar is chosen.
 */
export interface IPlayerRef {
  readonly playerId: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

export const PlayerRefSchema = z.object({
  playerId: z.string().refine(isPlayerIdShape, {
    message: 'playerId must match pid_<base58> shape',
  }),
  displayName: z.string().min(1).max(64),
  avatarUrl: z.string().url().optional(),
});

// =============================================================================
// IPlayerToken — signed bearer credential
// =============================================================================

/**
 * Signed bearer token. The signature covers the canonical JSON
 * representation of `{playerId, issuedAt, expiresAt}` (object keys
 * sorted) under the embedded Ed25519 `publicKey`. Both signer and
 * verifier MUST produce byte-identical canonical strings — see
 * `canonicalTokenPayload` in `auth.ts`.
 *
 * `publicKey` is embedded so the server can verify without a key
 * directory lookup. The verifier still cross-checks that `playerId` is
 * derived from `publicKey` so swapping the key invalidates the token.
 */
export interface IPlayerToken {
  readonly playerId: string;
  /** ISO-8601 timestamp the token was minted. */
  readonly issuedAt: string;
  /** ISO-8601 timestamp the token stops being honoured. */
  readonly expiresAt: string;
  /** Ed25519 public key (32 bytes raw), base64-encoded. */
  readonly publicKey: string;
  /** Ed25519 signature over the canonical payload, base64-encoded. */
  readonly signature: string;
}

export const PlayerTokenSchema = z.object({
  playerId: z.string().refine(isPlayerIdShape, {
    message: 'playerId must match pid_<base58> shape',
  }),
  issuedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  publicKey: z.string().min(1),
  signature: z.string().min(1),
});

// =============================================================================
// IPlayerProfile — server-side persisted record
// =============================================================================

/**
 * Server-side persisted view of a player. Built lazily the first time a
 * `playerId` connects; updated on each subsequent connection.
 *
 * `matchHistory` is a chronological list of match ids the player
 * participated in. Wave 2 only writes entries on lobby-ready -> launch
 * transitions (a Wave 3b concern); Wave 2 just keeps the field present
 * so future waves can append without a schema change.
 */
export interface IPlayerProfile {
  readonly playerId: string;
  /** Ed25519 public key, base64-encoded — same form as `IPlayerToken`. */
  readonly publicKey: string;
  readonly displayName: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly avatarUrl?: string;
  readonly matchHistory: readonly string[];
}

export const PlayerProfileSchema = z.object({
  playerId: z.string().refine(isPlayerIdShape, {
    message: 'playerId must match pid_<base58> shape',
  }),
  publicKey: z.string().min(1),
  displayName: z.string().min(1).max(64),
  createdAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  matchHistory: z.array(z.string().min(1)).readonly(),
});

// =============================================================================
// Wire helpers — base64-encoded JSON for headers + query strings
// =============================================================================

/**
 * Encode a token as base64-of-JSON for transport. Used by the client
 * before stamping it into `Authorization` or `?token=`.
 */
export function encodeTokenForWire(token: IPlayerToken): string {
  const json = JSON.stringify(token);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64');
  }
  // Browser fallback — utf8-safe via TextEncoder + binary string round-trip.
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode the wire-format string back into an `IPlayerToken`. Returns
 * null if the input is not valid base64 / JSON / a valid token shape.
 * Verifying the signature is a separate step (`verifyPlayerToken`).
 */
export function decodeTokenFromWire(wire: string): IPlayerToken | null {
  let json: string;
  try {
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(wire, 'base64').toString('utf8');
    } else {
      const binary = atob(wire);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    }
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const result = PlayerTokenSchema.safeParse(parsed);
  return result.success ? (result.data as IPlayerToken) : null;
}
