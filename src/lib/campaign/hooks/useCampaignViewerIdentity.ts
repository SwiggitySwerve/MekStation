/**
 * Who is asking to read a campaign, as a participant — never as a role.
 *
 * The activity route binds a feed to a durable membership row. That row
 * is keyed by (sessionId, participantId). A role label is not a key:
 * `getCoopLocalPlayerId` returns `host` or `guest`, which name a chair
 * in the room, not the person sitting in it. Sending those strings as
 * participantId would either 403 or collide with a real participant.
 * The campaign owner, hostPlayerId, and grant tokens are the same class
 * of mistake — they identify the campaign or a capability, not the
 * viewer.
 */

import { useStore } from 'zustand';

import type { ICoopSession } from '@/types/campaign/CoopSession';

import { getActiveCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { getCoopMatchId } from '@/lib/campaign/coop/coopRuntimeSession';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export type CampaignViewerIdentity =
  | { readonly kind: 'none' }
  | { readonly kind: 'needs-identity'; readonly sessionId: string }
  | {
      readonly kind: 'pair';
      readonly sessionId: string;
      readonly participantId: string;
    };

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Live socket playerId first — that is who this browser is speaking as
 * right now. The stored co-op token is the same id after a refresh,
 * used only when the socket is not up.
 */
function resolveViewerParticipantId(sessionId: string): string | undefined {
  const liveId = getActiveCampaignSyncTransport(sessionId)?.playerId;
  if (isNonEmptyString(liveId)) return liveId;
  const storedId = readCoopCampaignToken(sessionId)?.playerId;
  if (isNonEmptyString(storedId)) return storedId;
  return undefined;
}

/**
 * Pure resolution so the hook stays a store subscription. No coopSession
 * means solo: the journal feed is a membership read, and a solo campaign
 * has no membership row to name, so we do not invent a viewer.
 */
export function resolveCampaignViewerIdentity(
  coopSession: ICoopSession | undefined,
): CampaignViewerIdentity {
  if (!coopSession) return { kind: 'none' };
  const sessionId = getCoopMatchId(coopSession);
  if (!isNonEmptyString(sessionId)) return { kind: 'none' };
  const participantId = resolveViewerParticipantId(sessionId);
  if (!isNonEmptyString(participantId)) {
    return { kind: 'needs-identity', sessionId };
  }
  return { kind: 'pair', sessionId, participantId };
}

export function useCampaignViewerIdentity(): CampaignViewerIdentity {
  const store = useCampaignStore();
  const coopSession = useStore(store, (state) => state.campaign?.coopSession);
  return resolveCampaignViewerIdentity(coopSession);
}
