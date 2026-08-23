/**
 * Resolve-or-issue a campaign-scope grant for a room-code co-op guest.
 *
 * Task 2.2 share UI is not shipped, but a grant is still required so
 * the guest can ride the task-3.3 channel. A room-code guest is a
 * shared-ledger participant, never a GM, so this seam issues only
 * `campaign` scope. Rejoin must not mint a second row: the store's
 * one-active-grant-per-participant-per-campaign pick
 * (selectActiveCampaignGrant) is the idempotency key.
 *
 * Lives in coop/ rather than grants/ so grants does not import delivery
 * (delivery already depends on grants).
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/tasks.md (3.5)
 */

import type {
  ICampaignGrant,
  ICampaignGrantSigner,
  ICampaignGrantStore,
} from '@/lib/campaign/grants/ICampaignGrantStore';

import { selectActiveCampaignGrant } from '@/lib/campaign/delivery/CampaignGrantMembershipSource';
import { canonicalizeGrantScopes } from '@/lib/campaign/grants/campaignGrantGuards';

/** Closed scope set for an auto-issued room-code guest. Never widened. */
export const ROOM_CODE_GUEST_GRANT_SCOPES = canonicalizeGrantScopes([
  'campaign',
]);

/**
 * Far-future expiry for room-code auto-grants. Revocation, not the
 * clock, is the off switch until the share UI can set a real TTL.
 * The string is a literal so this module never constructs a Date.
 */
export const ROOM_CODE_GUEST_GRANT_EXPIRES_AT = '9999-12-31T00:00:00.000Z';

export interface IResolveOrIssueRoomCodeGuestGrantInput {
  readonly grantStore: ICampaignGrantStore;
  readonly campaignId: string;
  readonly participantId: string;
  readonly issuer: Pick<ICampaignGrantSigner, 'publicKey'>;
  readonly issuedAt: string;
  readonly nowIso: string;
  readonly expiresAt?: string;
}

export interface IResolveOrIssueRoomCodeGuestGrantResult {
  readonly grant: ICampaignGrant;
  readonly issued: boolean;
}

/**
 * Returns the active grant for this participant on this campaign, or
 * issues a campaign-scope grant when none exists. An already-active
 * grant of any scope is reused rather than doubled, honoring the
 * one-active-grant invariant. Callers MUST have admitted the principal
 * to the room before invoking this; this function does not check a
 * room code.
 */
export function resolveOrIssueRoomCodeGuestGrant(
  input: IResolveOrIssueRoomCodeGuestGrantInput,
): IResolveOrIssueRoomCodeGuestGrantResult {
  const existing = selectActiveCampaignGrant(
    input.grantStore.listGrants(input.campaignId),
    input.participantId,
    input.nowIso,
  );
  if (existing !== null) {
    return { grant: existing, issued: false };
  }
  const grant = input.grantStore.issueGrant({
    campaignId: input.campaignId,
    participantId: input.participantId,
    issuerPublicKey: input.issuer.publicKey,
    scopes: ROOM_CODE_GUEST_GRANT_SCOPES,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt ?? ROOM_CODE_GUEST_GRANT_EXPIRES_AT,
  });
  return { grant, issued: true };
}
