/**
 * The session scope a bearer token must carry to act on one campaign.
 *
 * Read from the campaign's OWN stored co-op session, never from the
 * request. A route that let the caller name the scope would be letting
 * them satisfy the check with whatever token they happen to hold - the
 * scope would confirm that a token exists, not that it is for this
 * campaign.
 *
 * `undefined` when the campaign runs no co-op session. A SCOPED token
 * then fails closed in `authenticateRequest` (`scope-unchecked`), and an
 * unscoped one still has to clear whatever seat or grant gate the route
 * applies - which a campaign with no session refuses on its own.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import type { IPlayerTokenScope } from '@/types/multiplayer/Player';

import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';

export function expectedScopeForCampaign(
  campaignId: string,
): IPlayerTokenScope | undefined {
  const read = readCampaign(campaignId);
  if (read.kind !== 'ok') return undefined;
  const matchId = read.record.body.coopSession?.matchId;
  return typeof matchId === 'string' && matchId.length > 0
    ? { kind: 'campaign-session', id: matchId }
    : undefined;
}
