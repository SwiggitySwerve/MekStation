/**
 * Source-instance campaign grant contract (design D5, task 2.1).
 *
 * A grant is the durable authorization fact task 3.2 filters by and
 * task 3.3 authenticates with. Scopes are a closed set of
 * CampaignEventScope values; they are canonicalized (sort + dedupe)
 * before persist and sign so the stored row and the signed bytes agree.
 *
 * Live share UI, replica durability, and the campaign-sync channel are
 * owned by tasks 2.2, 2.3, and 3.3. This module is the model only.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import type { CampaignEventScope } from '@/types/campaign/CampaignSync';

/**
 * Canonical grant scope set. Produced only by canonicalizeGrantScopes
 * so callers cannot accidentally persist an unsorted or duplicated
 * representation.
 */
export type CampaignGrantScopes = readonly CampaignEventScope[];

/**
 * Base GM/all-scopes set: gm AND campaign. Team/player members are
 * added by createGmGrantScopes; membership stays exact-string (no
 * prefix wildcards). Task 3.2 enumerates extra scopes at issue time
 * when the GM needs the raw stream over known teams/players.
 */
export const GM_GRANT_BASE_SCOPES: readonly CampaignEventScope[] =
  Object.freeze(['campaign', 'gm']);

export const CAMPAIGN_GRANT_ID_PATTERN = /^[0-9a-f]{32}$/;

export type CampaignGrantErrorCode =
  | 'already-revoked'
  | 'empty-scopes'
  | 'invalid-identity'
  | 'invalid-record'
  | 'invalid-scopes'
  | 'unknown-grant';

export class CampaignGrantError extends Error {
  public readonly name = 'CampaignGrantError';
  /**
   * Typed store refusal. Codes stay closed so callers can branch
   * without parsing messages.
   */
  public constructor(
    public readonly code: CampaignGrantErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** True only for CampaignGrantError instances, not structural copies. */
export function isCampaignGrantError(
  candidate: unknown,
): candidate is CampaignGrantError {
  return candidate instanceof CampaignGrantError;
}

/**
 * Durable grant row. participantId is the participant identity the
 * grant is issued to (task 2.1 participantIdentity). revokedAt is
 * null while active; a signature cannot un-sign, so verifiers MUST
 * read this field from the store, never from the token.
 */
export interface ICampaignGrant {
  readonly grantId: string;
  readonly campaignId: string;
  readonly participantId: string;
  /**
   * The issuing identity's Ed25519 public key, base64. Pinned at issue
   * time and immutable: verification checks a presented token against
   * THIS key. Verifying against a key the token carries would make the
   * grant id a bearer secret - anyone who learned one could sign with
   * their own keypair and pass.
   */
  readonly issuerPublicKey: string;
  readonly scopes: CampaignGrantScopes;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

/**
 * Issue input. scopes may be unsorted or duplicated; the store
 * canonicalizes before persist. Times are caller-injected ISO-8601
 * strings; this seam never reads the system clock.
 */
export interface IIssueCampaignGrant {
  readonly campaignId: string;
  readonly participantId: string;
  /**
   * The issuing identity's Ed25519 public key, base64. Pinned at issue
   * time and immutable: verification checks a presented token against
   * THIS key. Verifying against a key the token carries would make the
   * grant id a bearer secret - anyone who learned one could sign with
   * their own keypair and pass.
   */
  readonly issuerPublicKey: string;
  readonly scopes: readonly string[];
  readonly issuedAt: string;
  readonly expiresAt: string;
}

/**
 * Unlocked vault key material used to sign a grant token. Matches the
 * publicKey/privateKey pair unlockIdentity returns. Routes (task 2.2)
 * unlock in-process; this seam never holds a password.
 */
export interface ICampaignGrantSigner {
  readonly publicKey: string;
  readonly privateKey: string;
}

/**
 * Signed grant token. Scopes sit inside the signed payload so a holder
 * cannot widen them on the wire. publicKey is embedded so signature
 * verification does not consult a holder-influenced key directory;
 * revocation still requires a store lookup.
 */
export interface ICampaignGrantToken {
  readonly grantId: string;
  readonly campaignId: string;
  readonly participantId: string;
  readonly scopes: CampaignGrantScopes;
  readonly issuedAt: string;
  readonly expiresAt: string;
  /**
   * The key the token claims it was signed with. This is NOT the trust
   * anchor: verification requires it to equal the issuer key pinned on
   * the stored grant, and checks the signature against that stored key.
   * A token-carried key alone would make the grant id a bearer secret,
   * since anyone who learned one could sign with their own keypair.
   */
  readonly publicKey: string;
  readonly signature: string;
}

export type CampaignGrantVerifyFailureReason =
  | 'malformed'
  | 'expired'
  | 'bad-signature'
  | 'unknown-grant'
  | 'revoked'
  | 'scope-mismatch'
  | 'store-unavailable';

export interface ICampaignGrantVerifySuccess {
  readonly ok: true;
  readonly grant: ICampaignGrant;
  readonly token: ICampaignGrantToken;
}

export interface ICampaignGrantVerifyFailure {
  readonly ok: false;
  readonly reason: CampaignGrantVerifyFailureReason;
}

export type CampaignGrantVerifyResult =
  | ICampaignGrantVerifySuccess
  | ICampaignGrantVerifyFailure;

/**
 * Minimum store surface verification needs. A throw is store-unavailable
 * (not an authorization verdict); null is unknown-grant.
 */
export interface ICampaignGrantReadStore {
  getGrant(grantId: string): ICampaignGrant | null;
}

/**
 * Durable grant store. Implementations MUST mint opaque grant ids,
 * MUST canonicalize scopes before persist, and MUST NOT delete rows.
 */
export interface ICampaignGrantStore extends ICampaignGrantReadStore {
  issueGrant(input: IIssueCampaignGrant): ICampaignGrant;
  listGrants(campaignId: string): readonly ICampaignGrant[];
  revokeGrant(grantId: string, revokedAt: string): ICampaignGrant;
}
