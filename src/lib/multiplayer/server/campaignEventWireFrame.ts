/**
 * The one campaign event -> wire frame mapping (finding #12 delivery
 * unification).
 *
 * Every join arm used to build this frame for itself, which is how the
 * arms could drift apart. Shared so the host arm, the member arm, and
 * the room-code guest arm serialize a committed event identically: a
 * CampaignSnapshotPublished rides the CampaignSnapshot kind (the client
 * treats it as a baseline), everything else rides CampaignEvent.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { nowIso } from '@/types/multiplayer/Protocol';

/** Builds the client-visible frame for one committed campaign event. */
export function campaignEventWireFrame(
  matchId: string,
  event: ICampaignEvent,
  ts: string = nowIso(),
): Extract<IServerMessage, { kind: 'CampaignSnapshot' | 'CampaignEvent' }> {
  return {
    kind:
      event.type === 'CampaignSnapshotPublished'
        ? 'CampaignSnapshot'
        : 'CampaignEvent',
    matchId,
    ts,
    event,
  };
}
