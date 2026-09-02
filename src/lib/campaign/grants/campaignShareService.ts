/**
 * Campaign share service (task 2.2).
 *
 * The server-side half of sharing a campaign: issue a grant against a
 * campaign this server actually owns, list the active grants with their
 * scopes, and revoke one.
 *
 * Two laws shape this module.
 *
 * Only a SOURCE may share. A replica holds a scoped copy of someone
 * else's campaign; letting it mint grants would create a second
 * authority for the same campaign and hand out access its own grant may
 * not even cover. Sharing is therefore gated on D2 authority exactly
 * like any other mutation, and refuses with the same typed vocabulary.
 *
 * The private key never reaches this module. The grant row pins the
 * issuer's PUBLIC key at issue time (verification checks a presented
 * token against that pinned key, never against a key the token carries),
 * and the token itself is signed by the holder of the unlocked vault
 * identity on the client. A server that could sign grants would be able
 * to mint access without the owner present.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import type Database from 'better-sqlite3';

import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { isActiveCampaignGm } from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import type { ICampaignGrant } from './ICampaignGrantStore';

import { evaluateSourceMutationGate } from '../authority/campaignAuthority';
import { SQLiteCampaignGrantStore } from './SQLiteCampaignGrantStore';

/** Why a share operation was refused, distinct from a crash. */
export type CampaignShareRefusalReason =
  | 'campaign-not-found'
  | 'campaign-unreadable'
  | 'not-source'
  | 'not-campaign-gm'
  | 'invalid-request';

export type CampaignShareResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | {
      readonly kind: 'refused';
      readonly reason: CampaignShareRefusalReason;
    };

export interface IIssueShareGrantInput {
  readonly campaignId: string;
  /** The verified principal asking to issue. Never a client claim. */
  readonly callerId: string;
  readonly participantId: string;
  readonly issuerPublicKey: string;
  readonly scopes: readonly string[];
  readonly issuedAt: string;
  readonly expiresAt: string;
}

/**
 * Confirms this server owns the campaign as a source before any share
 * operation. Reuses the D2 gate so "a replica cannot share" is the same
 * fact as "a replica cannot write", not a second parallel rule that
 * could drift from it.
 */
function requireSourceCampaign(campaignId: string): CampaignShareResult<true> {
  if (campaignId.trim().length === 0) {
    return { kind: 'refused', reason: 'invalid-request' };
  }
  const read = readCampaign(campaignId);
  if (read.kind === 'not_found') {
    return { kind: 'refused', reason: 'campaign-not-found' };
  }
  if (read.kind !== 'ok') {
    // Corrupt payload or unparseable authority: refuse rather than
    // guess. Sharing a campaign whose authority cannot be read would be
    // exactly the silent inference D2 forbids.
    return { kind: 'refused', reason: 'campaign-unreadable' };
  }
  if (evaluateSourceMutationGate(read.record.authority).kind !== 'ok') {
    return { kind: 'refused', reason: 'not-source' };
  }
  return { kind: 'ok', value: true };
}

/**
 * Confirms the CALLER may administer this campaign's sharing.
 *
 * `requireSourceCampaign` answers a question about the CAMPAIGN - does
 * this server execute commands for it - which is true for every browser
 * this server serves, co-op guests included. It is not, and never was,
 * a statement about who is asking. Listing grants, issuing them and
 * revoking them are the campaign GM's administration surface, so the
 * caller must hold the campaign's ACTIVE `gm` seat. The question is
 * asked ABOUT the caller - `isActiveCampaignGm(campaignId, callerId)` -
 * so no row ordering stands between a seated player and their refusal.
 */
function requireCampaignGm(
  campaignId: string,
  callerId: string,
): CampaignShareResult<true> {
  if (callerId.trim().length === 0) {
    return { kind: 'refused', reason: 'invalid-request' };
  }
  if (!isActiveCampaignGm(campaignId, callerId)) {
    return { kind: 'refused', reason: 'not-campaign-gm' };
  }
  return { kind: 'ok', value: true };
}

/**
 * Issues a grant for a campaign this server owns. The caller supplies
 * the issuer's public key; the private half stays with the client
 * identity that will sign the token.
 */
export function issueShareGrant(
  db: Database.Database,
  input: IIssueShareGrantInput,
): CampaignShareResult<ICampaignGrant> {
  const owned = requireSourceCampaign(input.campaignId);
  if (owned.kind !== 'ok') return owned;
  const authorized = requireCampaignGm(input.campaignId, input.callerId);
  if (authorized.kind !== 'ok') return authorized;
  if (
    input.participantId.trim().length === 0 ||
    input.issuerPublicKey.trim().length === 0 ||
    input.scopes.length === 0
  ) {
    return { kind: 'refused', reason: 'invalid-request' };
  }
  const store = new SQLiteCampaignGrantStore(db);
  return {
    kind: 'ok',
    value: store.issueGrant({
      campaignId: input.campaignId,
      participantId: input.participantId,
      issuerPublicKey: input.issuerPublicKey,
      scopes: input.scopes,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
    }),
  };
}

/**
 * Lists the grants on a campaign this server owns, so the owner can see
 * who currently holds access and at what scope. Revoked rows are
 * included and carry `revokedAt` - hiding them would leave the owner
 * unable to tell "never shared" from "shared and withdrawn".
 */
export function listShareGrants(
  db: Database.Database,
  campaignId: string,
  callerId: string,
): CampaignShareResult<readonly ICampaignGrant[]> {
  const owned = requireSourceCampaign(campaignId);
  if (owned.kind !== 'ok') return owned;
  const authorized = requireCampaignGm(campaignId, callerId);
  if (authorized.kind !== 'ok') return authorized;
  const store = new SQLiteCampaignGrantStore(db);
  return { kind: 'ok', value: store.listGrants(campaignId) };
}

/**
 * Revokes one grant. Revocation is a mutation of who may read the
 * campaign, so it carries the same source-only gate as issuing.
 */
export function revokeShareGrant(
  db: Database.Database,
  campaignId: string,
  grantId: string,
  revokedAt: string,
  callerId: string,
): CampaignShareResult<ICampaignGrant> {
  const owned = requireSourceCampaign(campaignId);
  if (owned.kind !== 'ok') return owned;
  const authorized = requireCampaignGm(campaignId, callerId);
  if (authorized.kind !== 'ok') return authorized;
  if (grantId.trim().length === 0) {
    return { kind: 'refused', reason: 'invalid-request' };
  }
  const store = new SQLiteCampaignGrantStore(db);
  // Ownership is checked BEFORE the write. Revoking first and inspecting
  // afterwards would already have withdrawn access on a campaign this
  // route does not own - a refusal reported after the damage is done.
  const existing = store.getGrant(grantId);
  if (existing === null || existing.campaignId !== campaignId) {
    // Unknown and belongs-to-another are one answer on purpose: telling
    // them apart would let a caller probe which grant ids exist.
    return { kind: 'refused', reason: 'invalid-request' };
  }
  return { kind: 'ok', value: store.revokeGrant(grantId, revokedAt) };
}
