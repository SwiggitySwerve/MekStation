/**
 * Live grant-channel fan-out for a room-code guest (task 3.5).
 *
 * Grant frames stay off the client wire. Delivery items are ingested
 * into the replica (offset after the hydration snapshot) then emitted
 * as CampaignEvent so proposal/veto/arbitration clients are unchanged.
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { IDeliveryCursor } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignGrantLiveSource } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import type { IProjectCampaignStreamDeps } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import type { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import type { IVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { IErrorCode, IServerMessage } from '@/types/multiplayer/Protocol';

import { offsetProjectorItemsForReplica } from '@/lib/campaign/coop/roomCodeGuestHydration';
import { startCampaignGrantChannelSession } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import { campaignGrantItemToReplayEvent } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import {
  CAMPAIGN_EVENT_TYPES,
  isCampaignEventScope,
} from '@/types/campaign/CampaignSync';

export interface IRoomCodeGuestLiveFanoutDeps {
  readonly matchId: string;
  readonly campaignId: string;
  readonly grantId: string;
  readonly principal: IVerifiedPrincipal;
  readonly projectDeps: IProjectCampaignStreamDeps;
  readonly liveSource: ICampaignGrantLiveSource;
  readonly replica: SQLiteCampaignReplicaStore;
  readonly cleanupFns: Set<() => void>;
  readonly nowIso: () => string;
  readonly send: (message: IServerMessage) => void;
  readonly closeTyped: (code: IErrorCode, reason: string) => void;
}

/**
 * Starts the per-grant live session from an already-hydrated cursor.
 * Ingest is serialized so two wakeups cannot interleave replica writes.
 */
export async function attachRoomCodeGuestLiveSession(
  deps: IRoomCodeGuestLiveFanoutDeps,
  cursor: IDeliveryCursor,
): Promise<void> {
  let ingestChain = Promise.resolve();
  /** Serializes replica writes; a gap/collision closes the socket. */
  const enqueue = function (work: () => Promise<void>): void {
    ingestChain = ingestChain.then(work).catch(function () {
      deps.closeTyped('INTERNAL_ERROR', 'replica-ingest-failed');
    });
  };

  await startCampaignGrantChannelSession(
    {
      socketSend: function (message) {
        enqueue(function () {
          return fanOutGrantFrame(deps, message);
        });
      },
      closeTyped: deps.closeTyped,
      matchId: deps.matchId,
      campaignId: deps.campaignId,
      grantId: deps.grantId,
      principal: deps.principal,
      projectDeps: deps.projectDeps,
      liveSource: deps.liveSource,
      cleanupFns: deps.cleanupFns,
      nowIso: deps.nowIso,
      nullCursorBackfill: 'snapshot-plus-tail',
    },
    cursor,
  );
}

/**
 * Ingests live delivery items and emits CampaignEvent frames. Empty
 * join handshakes and grant-only kinds stay off the client socket.
 */
async function fanOutGrantFrame(
  deps: IRoomCodeGuestLiveFanoutDeps,
  message: IServerMessage,
): Promise<void> {
  if (message.kind !== 'CampaignGrantDelivery') {
    return;
  }
  if (message.items.length === 0) {
    return;
  }
  const items = grantItemsFromWire(message.items);
  if (items === null) {
    deps.closeTyped('INTERNAL_ERROR', 'grant-channel-internal');
    return;
  }
  const ingested = await deps.replica.ingest(deps.campaignId, deps.grantId, {
    deliveryEpochId: message.deliveryEpochId,
    items: offsetProjectorItemsForReplica(items),
  });
  if (ingested.kind !== 'applied' && ingested.kind !== 'duplicate') {
    deps.closeTyped('INTERNAL_ERROR', ingested.reason);
    return;
  }
  const ts = deps.nowIso();
  for (const item of items) {
    deps.send({
      kind: 'CampaignEvent',
      matchId: deps.matchId,
      ts,
      event: campaignGrantItemToReplayEvent(item),
    });
  }
}

const CAMPAIGN_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
  CAMPAIGN_EVENT_TYPES,
);

/** True when value is a non-null object record (not an array). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when the projected event has the grant-wire shape (no source
 * sequence). Rejects a `sequence` key so a journal position cannot
 * leak onto the replica or the guest CampaignEvent frame.
 */
function isProjectedGrantEvent(
  value: unknown,
): value is ICampaignGrantDeliveryItem['event'] {
  if (!isRecord(value)) return false;
  if ('sequence' in value) return false;
  if (typeof value['campaignId'] !== 'string') return false;
  if (typeof value['ts'] !== 'string') return false;
  if (typeof value['authorPlayerId'] !== 'string') return false;
  if (typeof value['type'] !== 'string') return false;
  if (!CAMPAIGN_EVENT_TYPE_SET.has(value['type'])) return false;
  if (!isCampaignEventScope(value['scope'])) return false;
  if (!isRecord(value['payload'])) return false;
  return true;
}

/**
 * Rebuilds typed delivery items from a CampaignGrantDelivery frame.
 * Null means the frame was not a grant page and must not be ingested.
 */
function grantItemsFromWire(
  items: readonly {
    readonly deliverySequence: number;
    readonly event: unknown;
  }[],
): readonly ICampaignGrantDeliveryItem[] | null {
  const parsed: ICampaignGrantDeliveryItem[] = [];
  for (const item of items) {
    if (!Number.isSafeInteger(item.deliverySequence)) return null;
    if (item.deliverySequence < 1) return null;
    if (!isProjectedGrantEvent(item.event)) return null;
    parsed.push({
      deliverySequence: item.deliverySequence,
      event: item.event,
    });
  }
  return parsed;
}
