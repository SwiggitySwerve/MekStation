/**
 * Redeeming a share on the consuming device (task 2.2, design D2).
 *
 * This is the flow that finally PRODUCES a `role: 'replica'` campaign
 * record. Until now every stored campaign was a source, because a
 * replica is created only by an explicit replica flow - this one.
 *
 * What redeem does and deliberately does not do:
 *
 * - It verifies the token's SIGNATURE against the public key the token
 *   carries, which proves the payload (including its scopes) was not
 *   edited in transit. It cannot check revocation: the grant store lives
 *   on the SOURCE, and this device does not have it. That check happens
 *   where it belongs - the sync channel re-verifies against the pinned
 *   issuer key and the live store on every connect, so a grant revoked
 *   after redemption stops delivering even though a stale local record
 *   exists.
 * - It records full provenance (sourceInstanceId, grantId, scopes) so
 *   the replica KNOWS it is not the source and can say so, rather than
 *   inferring it from whether a socket happens to be connected.
 * - It never claims source authority. A redeemed record is a replica,
 *   full stop; the D2 command gate then refuses local mutation.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { verifySignature } from '@/services/vault/IdentityService';

import type { ICampaignGrantToken } from './ICampaignGrantStore';

import { canonicalGrantTokenPayload } from './campaignGrantToken';

/** Why a redemption was refused. Each is a distinct user-facing cause. */
export type RedeemRefusalReason =
  | 'malformed-token'
  | 'bad-signature'
  | 'expired'
  | 'missing-source-instance'
  | 'already-redeemed';

export type RedeemCampaignGrantResult =
  | { readonly kind: 'ok'; readonly record: SerializedCampaign }
  | { readonly kind: 'refused'; readonly reason: RedeemRefusalReason };

export interface IRedeemCampaignGrantInput {
  /** The signed grant token, as produced by the sharing client. */
  readonly token: unknown;
  /**
   * The sharing server's instance id, carried alongside the token in the
   * share payload. Provenance requires knowing WHICH host is the source;
   * the token alone does not identify it.
   */
  readonly sourceInstanceId: string;
  /** This consuming host's instance id. */
  readonly localInstanceId: string;
  /** The campaign body to seed the replica with, if the share carried one. */
  readonly body: SerializedCampaign['body'];
  readonly redeemedAt: string;
  /** Existing local record for this campaign id, when one is present. */
  readonly existing: SerializedCampaign | null;
}

/** Narrow an unknown value to the token shape without trusting it. */
function asToken(value: unknown): ICampaignGrantToken | null {
  if (typeof value !== 'object' || value === null) return null;
  const t = value as Record<string, unknown>;
  const strings = [
    'grantId',
    'campaignId',
    'participantId',
    'issuedAt',
    'expiresAt',
    'publicKey',
    'signature',
  ];
  for (const key of strings) {
    const v = t[key];
    if (typeof v !== 'string' || v.length === 0) return null;
  }
  if (!Array.isArray(t.scopes) || t.scopes.length === 0) return null;
  for (const scope of t.scopes) {
    if (typeof scope !== 'string' || scope.length === 0) return null;
  }
  return value as ICampaignGrantToken;
}

/** Base64 to bytes without assuming a browser or Node-only global. */
function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

/**
 * Verifies a share and builds the local replica record.
 *
 * `nowMs` is injected so expiry is deterministic under test; this module
 * never reads the system clock.
 */
export async function redeemCampaignGrant(
  input: IRedeemCampaignGrantInput,
  nowMs: number,
): Promise<RedeemCampaignGrantResult> {
  const token = asToken(input.token);
  if (token === null) {
    return { kind: 'refused', reason: 'malformed-token' };
  }
  if (input.sourceInstanceId.trim().length === 0) {
    // Without the source's identity the replica could not name what it
    // is a copy OF, which is half of the provenance D2 requires.
    return { kind: 'refused', reason: 'missing-source-instance' };
  }
  if (input.sourceInstanceId === input.localInstanceId) {
    // Redeeming a share issued by this very host would turn a campaign
    // this server SOURCES into a replica of itself.
    return { kind: 'refused', reason: 'missing-source-instance' };
  }
  if (input.existing !== null && input.existing.authority.role === 'source') {
    // This host already owns that campaign id. Overwriting a source
    // with a replica would silently destroy local authority.
    return { kind: 'refused', reason: 'already-redeemed' };
  }

  const expiresMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) {
    return { kind: 'refused', reason: 'expired' };
  }

  // Signature proves the payload - crucially INCLUDING the scopes - was
  // not widened in transit. Verified against the key the token carries;
  // the authoritative pinned-key check happens at the source on connect.
  const payload = canonicalGrantTokenPayload({
    grantId: token.grantId,
    campaignId: token.campaignId,
    participantId: token.participantId,
    scopes: token.scopes,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  });
  let signatureValid = false;
  try {
    signatureValid = await verifySignature(
      new TextEncoder().encode(payload),
      fromBase64(token.signature),
      fromBase64(token.publicKey),
    );
  } catch {
    // Undecodable key or signature material is a malformed token, not a
    // crash surface.
    return { kind: 'refused', reason: 'malformed-token' };
  }
  if (!signatureValid) {
    return { kind: 'refused', reason: 'bad-signature' };
  }

  return {
    kind: 'ok',
    record: {
      schemaVersion: input.existing?.schemaVersion ?? 2,
      campaignId: token.campaignId,
      savedAt: input.redeemedAt,
      originDeviceId: input.localInstanceId,
      // A freshly redeemed replica starts at version 0: it holds no
      // local writes, and its content arrives over the scoped stream.
      version: input.existing?.version ?? 0,
      instanceId: input.localInstanceId,
      authority: {
        role: 'replica',
        sourceInstanceId: input.sourceInstanceId,
        grantId: token.grantId,
        scopes: token.scopes,
      },
      body: input.body,
    },
  };
}
