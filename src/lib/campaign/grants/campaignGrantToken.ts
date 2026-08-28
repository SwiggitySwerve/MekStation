/**
 * Campaign grant tokens (design D5, task 2.1).
 *
 * The scope set MUST be inside the signed payload. Verification is
 * signature-valid AND store-says-active. A signature cannot be un-signed,
 * so revocation is always a store lookup. Store errors fail closed as
 * store-unavailable; they are never treated as an authorization.
 *
 * Order: cheap structural checks, then signature (against the embedded
 * public key, same as player tokens), then store lookup. Token scopes
 * that do not equal the stored grant's canonical set fail scope-mismatch
 * (defence in depth against a stored-row edit that bypassed the trigger).
 *
 * Signing uses vault IdentityService.signData on already-unlocked key
 * material, mirroring the multiplayer auth token endpoint (the route
 * unlocks; this module signs). Time is injected via nowMs; this file
 * never reads the system clock.
 *
 * Transport/route/UI wiring is owned by tasks 2.2 and 3.3.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import type { CampaignEventScope } from '@/types/campaign/CampaignSync';

import {
  fromBase64,
  signData,
  toBase64,
  verifySignature,
} from '@/services/vault/IdentityService';

import type {
  CampaignGrantVerifyResult,
  ICampaignGrant,
  ICampaignGrantReadStore,
  ICampaignGrantSigner,
  ICampaignGrantToken,
} from './ICampaignGrantStore';

import {
  canonicalizeGrantScopes,
  isCanonicalScopeArray,
  isNonempty,
  isOpaqueGrantId,
  serializeGrantScopes,
} from './campaignGrantGuards';

/**
 * Canonical signing payload. Object key order is locked lexicographically
 * so JSON.stringify is deterministic across runtimes (same contract as
 * canonicalTokenPayload in multiplayer auth). scopes is the canonical
 * sorted array, not a holder-supplied string.
 */
export function canonicalGrantTokenPayload(args: {
  readonly grantId: string;
  readonly campaignId: string;
  readonly participantId: string;
  readonly scopes: readonly CampaignEventScope[];
  readonly issuedAt: string;
  readonly expiresAt: string;
}): string {
  return JSON.stringify({
    campaignId: args.campaignId,
    expiresAt: args.expiresAt,
    grantId: args.grantId,
    issuedAt: args.issuedAt,
    participantId: args.participantId,
    scopes: args.scopes,
  });
}

/**
 * Signs a grant token with unlocked vault identity keys. Scopes come
 * from the stored grant (already canonical), never from a client field.
 */
export async function signCampaignGrantToken(
  grant: ICampaignGrant,
  signer: ICampaignGrantSigner,
): Promise<ICampaignGrantToken> {
  const payload = canonicalGrantTokenPayload({
    grantId: grant.grantId,
    campaignId: grant.campaignId,
    participantId: grant.participantId,
    scopes: grant.scopes,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
  });
  const payloadBytes = new TextEncoder().encode(payload);
  const signatureBytes = await signData(
    payloadBytes,
    fromBase64(signer.privateKey),
  );
  return {
    grantId: grant.grantId,
    campaignId: grant.campaignId,
    participantId: grant.participantId,
    scopes: grant.scopes,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    publicKey: signer.publicKey,
    signature: toBase64(signatureBytes),
  };
}

/**
 * Verifies a grant token. nowMs is injected so expiry is deterministic
 * in tests. Any store throw is store-unavailable, never revoked or
 * unknown-grant (those are authorization verdicts).
 */
export async function verifyCampaignGrantToken(
  token: unknown,
  store: ICampaignGrantReadStore,
  nowMs: number,
): Promise<CampaignGrantVerifyResult> {
  const parsed = parseGrantToken(token);
  if (parsed === null) return { ok: false, reason: 'malformed' };

  const expiresMs = Date.parse(parsed.expiresAt);
  const issuedMs = Date.parse(parsed.issuedAt);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(issuedMs)) {
    return { ok: false, reason: 'malformed' };
  }
  if (issuedMs >= expiresMs) {
    return { ok: false, reason: 'malformed' };
  }
  if (expiresMs <= nowMs) {
    return { ok: false, reason: 'expired' };
  }

  // The store lookup comes BEFORE the signature check because the
  // trust anchor lives on the stored row: the signature is verified
  // against the issuer key pinned at issue time, never against the key
  // the token carries. Verifying a token-carried key would authorize
  // anyone who learned a grant id, since they could sign with their own
  // keypair - the signature would prove only that the holder can sign,
  // not that the source issued the grant.
  let stored: ICampaignGrant | null;
  try {
    stored = store.getGrant(parsed.grantId);
  } catch {
    return { ok: false, reason: 'store-unavailable' };
  }
  if (stored === null) return { ok: false, reason: 'unknown-grant' };
  if (stored.revokedAt !== null) return { ok: false, reason: 'revoked' };

  const signatureOk = await verifyTokenSignature(
    parsed,
    stored.issuerPublicKey,
  );
  if (!signatureOk) return { ok: false, reason: 'bad-signature' };
  if (!signedClaimsMatchStore(parsed, stored)) {
    return { ok: false, reason: 'scope-mismatch' };
  }
  return { ok: true, grant: stored, token: parsed };
}

/**
 * Structural parse. Non-canonical scope arrays fail here so a holder
 * cannot smuggle a second representation past the signature check.
 */
function parseGrantToken(value: unknown): ICampaignGrantToken | null {
  if (typeof value !== 'object' || value === null) return null;
  const token = value as Partial<ICampaignGrantToken>;
  if (
    typeof token.grantId !== 'string' ||
    !isOpaqueGrantId(token.grantId) ||
    typeof token.campaignId !== 'string' ||
    !isNonempty(token.campaignId) ||
    typeof token.participantId !== 'string' ||
    !isNonempty(token.participantId) ||
    typeof token.issuedAt !== 'string' ||
    !isNonempty(token.issuedAt) ||
    typeof token.expiresAt !== 'string' ||
    !isNonempty(token.expiresAt) ||
    typeof token.publicKey !== 'string' ||
    !isNonempty(token.publicKey) ||
    typeof token.signature !== 'string' ||
    !isNonempty(token.signature) ||
    !Array.isArray(token.scopes) ||
    !isCanonicalScopeArray(token.scopes)
  ) {
    return null;
  }
  return {
    grantId: token.grantId,
    campaignId: token.campaignId,
    participantId: token.participantId,
    scopes: canonicalizeGrantScopes(token.scopes),
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
    publicKey: token.publicKey,
    signature: token.signature,
  };
}

/**
 * Ed25519 check over the canonical payload using the embedded public
 * key. A tamperer who re-signs with a different key can pass this step
 * and then fail the store comparison.
 */
async function verifyTokenSignature(
  token: ICampaignGrantToken,
  issuerPublicKey: string,
): Promise<boolean> {
  // A token that names a different key than the issuing identity is
  // refused outright rather than silently verified against the pinned
  // key, so a mismatch surfaces as bad-signature instead of appearing
  // to succeed under a key the presenter did not claim.
  if (token.publicKey !== issuerPublicKey) return false;
  let publicKeyBytes: Uint8Array;
  let signatureBytes: Uint8Array;
  try {
    publicKeyBytes = fromBase64(issuerPublicKey);
    signatureBytes = fromBase64(token.signature);
  } catch {
    return false;
  }
  const payload = canonicalGrantTokenPayload({
    grantId: token.grantId,
    campaignId: token.campaignId,
    participantId: token.participantId,
    scopes: token.scopes,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  });
  try {
    return await verifySignature(
      new TextEncoder().encode(payload),
      signatureBytes,
      publicKeyBytes,
    );
  } catch {
    return false;
  }
}

/**
 * Defence in depth: every signed claim must equal the stored grant.
 * Scope inequality is the named reason; campaign/participant/time
 * disagreement uses the same reason so a trigger-bypassing row edit
 * cannot authorize.
 */
function signedClaimsMatchStore(
  token: ICampaignGrantToken,
  stored: ICampaignGrant,
): boolean {
  return (
    token.campaignId === stored.campaignId &&
    token.participantId === stored.participantId &&
    token.issuedAt === stored.issuedAt &&
    token.expiresAt === stored.expiresAt &&
    serializeGrantScopes(token.scopes) === serializeGrantScopes(stored.scopes)
  );
}
