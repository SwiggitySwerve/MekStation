/**
 * Round-trip integration test: client signs -> server verifies.
 *
 * This is the proof that the canonical signing payload, base64
 * encoding, and Ed25519 import/sign/verify pipeline are byte-identical
 * between the client (`issuePlayerToken`) and server
 * (`verifyPlayerToken`).
 *
 * Also covers the in-memory cache: a fresh-enough token is reused;
 * a near-expiry token triggers a re-mint.
 */

import type { IVaultIdentity } from '@/types/vault';

import { verifyPlayerToken } from '@/lib/multiplayer/server/auth';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import { generateKeyPair } from '@/services/vault/IdentityService';

import {
  createTokenCache,
  invalidateTokenCache,
  issuePlayerToken,
  DEFAULT_REFRESH_WINDOW_MS,
} from '../issuePlayerToken';

async function makeIdentity(): Promise<IVaultIdentity> {
  const kp = await generateKeyPair();
  return {
    id: 'identity-id',
    displayName: 'Round-trip Pilot',
    publicKey: Buffer.from(kp.publicKey).toString('base64'),
    privateKey: Buffer.from(kp.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: new Date().toISOString(),
  };
}

describe('issuePlayerToken (round-trip)', () => {
  it('produces a token the server accepts', async () => {
    const identity = await makeIdentity();
    const token = await issuePlayerToken(identity);
    // playerId must be deterministic from the embedded public key.
    const expectedId = derivePlayerId(
      new Uint8Array(Buffer.from(identity.publicKey, 'base64')),
    );
    expect(token.playerId).toBe(expectedId);

    const result = await verifyPlayerToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.playerId).toBe(token.playerId);
  });

  it('reuses a cached token when far from expiry', async () => {
    const identity = await makeIdentity();
    const cache = createTokenCache();
    const t1 = await issuePlayerToken(identity, { cache });
    const t2 = await issuePlayerToken(identity, { cache });
    expect(t2).toBe(t1); // exact same object reference
  });

  it('refreshes the cached token when within the refresh window', async () => {
    const identity = await makeIdentity();
    const cache = createTokenCache();
    // Issue a token whose expiry is INSIDE the refresh window.
    await issuePlayerToken(identity, {
      cache,
      ttlMs: DEFAULT_REFRESH_WINDOW_MS - 1000,
    });
    // Next call should re-mint (different signature/issuedAt).
    const refreshed = await issuePlayerToken(identity, { cache });
    expect(refreshed).toBe(cache.current);
    expect(Date.parse(refreshed.expiresAt)).toBeGreaterThan(
      Date.now() + DEFAULT_REFRESH_WINDOW_MS,
    );
  });

  it('invalidateTokenCache forces a re-mint on next call', async () => {
    const identity = await makeIdentity();
    const cache = createTokenCache();
    const baseTime = Date.now();
    const t1 = await issuePlayerToken(identity, { cache, nowMs: baseTime });
    invalidateTokenCache(cache);
    // Bump the clock by 1s so the canonical payload (and therefore the
    // Ed25519 signature, which is deterministic) differs. Same key +
    // same payload would produce byte-identical signatures.
    const t2 = await issuePlayerToken(identity, {
      cache,
      nowMs: baseTime + 1000,
    });
    expect(t2).not.toBe(t1);
    expect(t2.signature).not.toBe(t1.signature);
    expect(t2.issuedAt).not.toBe(t1.issuedAt);
  });
});
