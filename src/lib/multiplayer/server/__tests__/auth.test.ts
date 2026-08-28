/**
 * Server-side token verification tests.
 *
 * Covers all rejection reasons (malformed, expired, clock-drift,
 * pid-mismatch, bad-signature) plus the happy path.
 *
 * Round-trip path (client signs -> server verifies) is exercised in
 * `src/lib/multiplayer/client/__tests__/issuePlayerToken.test.ts` so
 * this file can stay focused on the verifier branch logic.
 */

import type {
  IPlayerToken,
  IPlayerTokenScope,
} from '@/types/multiplayer/Player';

import { generateKeyPair, signData } from '@/services/vault/IdentityService';
import {
  decodeTokenFromWire,
  encodeTokenForWire,
} from '@/types/multiplayer/Player';

import { canonicalTokenPayload, verifyPlayerToken } from '../auth';
import { derivePlayerId } from '../playerIdFromPublicKey';

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

async function mintToken(opts?: {
  ttlMs?: number;
  issuedOffsetMs?: number;
  scope?: IPlayerTokenScope;
}): Promise<{
  token: IPlayerToken;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  const kp = await generateKeyPair();
  const playerId = derivePlayerId(kp.publicKey);
  const now = Date.now();
  const issuedAt = new Date(now + (opts?.issuedOffsetMs ?? 0)).toISOString();
  const expiresAt = new Date(now + (opts?.ttlMs ?? 60_000)).toISOString();
  const payload = canonicalTokenPayload({
    playerId,
    issuedAt,
    expiresAt,
    scope: opts?.scope,
  });
  const signature = await signData(
    new TextEncoder().encode(payload),
    kp.privateKey,
  );
  const token: IPlayerToken = {
    playerId,
    issuedAt,
    expiresAt,
    publicKey: toBase64(kp.publicKey),
    signature: toBase64(signature),
    ...(opts?.scope ? { scope: opts.scope } : {}),
  };
  return { token, publicKey: kp.publicKey, privateKey: kp.privateKey };
}

describe('verifyPlayerToken', () => {
  it('accepts a freshly minted token (round-trip happy path)', async () => {
    const { token } = await mintToken();
    const result = await verifyPlayerToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.playerId).toBe(token.playerId);
    }
  });

  it('rejects null input as malformed', async () => {
    const result = await verifyPlayerToken(null);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects expired tokens', async () => {
    const { token } = await mintToken({ ttlMs: -1000, issuedOffsetMs: -2000 });
    const result = await verifyPlayerToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('expired');
  });

  it('tolerates small clock drift on issuedAt (5s in the future)', async () => {
    const { token } = await mintToken({ issuedOffsetMs: 5_000, ttlMs: 60_000 });
    const result = await verifyPlayerToken(token);
    expect(result.ok).toBe(true);
  });

  it('rejects clock drift beyond the tolerance window', async () => {
    const { token } = await mintToken({
      issuedOffsetMs: 60_000,
      ttlMs: 120_000,
    });
    const result = await verifyPlayerToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('clock-drift');
  });

  it('rejects a token whose playerId does not match the public key', async () => {
    const { token } = await mintToken();
    const tampered = { ...token, playerId: 'pid_imposter' };
    const result = await verifyPlayerToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('pid-mismatch');
  });

  it('rejects a token whose payload was altered after signing (tampering)', async () => {
    const { token } = await mintToken();
    // Push the expiry out by 1h — signature is now over the original
    // expiry, so verification MUST fail. We don't change `playerId`
    // here so we hit the signature branch (not pid-mismatch).
    const tampered: IPlayerToken = {
      ...token,
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
    const result = await verifyPlayerToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bad-signature');
  });

  it('rejects a token with a corrupted signature', async () => {
    const { token } = await mintToken();
    const sigBytes = Buffer.from(token.signature, 'base64');
    sigBytes[0] ^= 0xff;
    const corrupted: IPlayerToken = {
      ...token,
      signature: sigBytes.toString('base64'),
    };
    const result = await verifyPlayerToken(corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bad-signature');
  });

  const MATCH_A: IPlayerTokenScope = { kind: 'match', id: 'match-AAAA' };
  const MATCH_B: IPlayerTokenScope = { kind: 'match', id: 'match-BBBB' };

  it('(a) rejects a token scoped to match A when expectedScope is match B', async () => {
    const { token } = await mintToken({ scope: MATCH_A });
    const result = await verifyPlayerToken(token, Date.now(), MATCH_B);
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
  });

  it('(c) accepts a scopeless token when expectedScope is passed (transition)', async () => {
    const { token } = await mintToken();
    const result = await verifyPlayerToken(token, Date.now(), MATCH_A);
    expect(result.ok).toBe(true);
  });

  it('(d) rejects a scoped token when the caller omitted expectedScope', async () => {
    const { token } = await mintToken({ scope: MATCH_A });
    const result = await verifyPlayerToken(token);
    expect(result).toEqual({ ok: false, reason: 'scope-unchecked' });
  });

  it('(e) flipping the scope id on the wire fails signature verification', async () => {
    const { token } = await mintToken({ scope: MATCH_A });
    const honest = await verifyPlayerToken(token, Date.now(), MATCH_A);
    expect(honest.ok).toBe(true);

    const wire = encodeTokenForWire(token);
    const json = Buffer.from(wire, 'base64').toString('utf8');
    const flippedJson = json.replace(MATCH_A.id, MATCH_B.id);
    expect(flippedJson).not.toBe(json);
    const flipped = decodeTokenFromWire(
      Buffer.from(flippedJson, 'utf8').toString('base64'),
    );
    expect(flipped).not.toBeNull();
    expect(flipped?.scope?.id).toBe(MATCH_B.id);

    const result = await verifyPlayerToken(flipped, Date.now(), MATCH_A);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('bad-signature');
  });

  it('rejects a match-scoped token presented as a campaign-session', async () => {
    const { token } = await mintToken({ scope: MATCH_A });
    const result = await verifyPlayerToken(token, Date.now(), {
      kind: 'campaign-session',
      id: MATCH_A.id,
    });
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
  });
});
