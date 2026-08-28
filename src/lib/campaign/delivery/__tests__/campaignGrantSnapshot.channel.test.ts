/**
 * Late-join snapshot-plus-tail versus full-stream (task 3.4).
 *
 * A null-cursor join on the snapshot path must land the same replica
 * state as the full-stream path, and live items after the snapshot
 * must continue with contiguous per-grant sequences.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IErrorCode, IServerMessage } from '@/types/multiplayer/Protocol';

import {
  drain,
  ManualLiveSource,
} from '@/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers';

import type { ICampaignGrantDeliveryItem } from '../campaignDeliveryTypes';
import type { IScopedCampaignSnapshot } from '../campaignGrantSnapshotTypes';

import { startCampaignGrantChannelSession } from '../campaignGrantChannelSession';
import {
  campaignJsonEquals,
  foldCampaignGrantDeliveryItems,
  hydrateCampaignGrantFromSnapshot,
} from '../foldCampaignGrantDelivery';
import {
  SNAPSHOT_WITHHELD_GM,
  buildInterleavedLedger,
} from './campaignGrantSnapshot.test-helpers';
import {
  EVENT_TS,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from './grantProjectionHarness';

const MATCH_ID = 'match-snapshot-channel';

class RecordingSink {
  readonly sent: IServerMessage[] = [];

  /** Records outbound frames. */
  public send = (message: IServerMessage): void => {
    this.sent.push(message);
  };
}

/** Frames of one kind from a recording sink. */
function framesOf<K extends IServerMessage['kind']>(
  sink: RecordingSink,
  kind: K,
): Extract<IServerMessage, { kind: K }>[] {
  return sink.sent.filter(
    (message): message is Extract<IServerMessage, { kind: K }> =>
      message.kind === kind,
  );
}

/**
 * Reads the authoritative ledger out of a snapshot wire payload.
 * The protocol types the payload as an object; this names the state
 * field the hydrate path requires.
 */
function snapshotStateFromPayload(
  payload: unknown,
): ICampaignAuthoritativeState {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('snapshot payload must be an object');
  }
  if (!('state' in payload)) {
    throw new Error('snapshot payload missing state');
  }
  const state = payload.state;
  if (typeof state !== 'object' || state === null) {
    throw new Error('snapshot state must be an object');
  }
  return state as ICampaignAuthoritativeState;
}

/**
 * Rebuilds the scoped snapshot record from the wire frame so the
 * hydrate helper is the same function the equivalence harness uses.
 */
function snapshotFromFrame(
  frame: Extract<IServerMessage, { kind: 'CampaignGrantSnapshot' }>,
): IScopedCampaignSnapshot {
  return {
    grantId: frame.grantId,
    campaignId: frame.campaignId,
    deliveryEpochId: frame.deliveryEpochId,
    baseline: frame.baseline,
    asOfDeliverySequence: frame.asOfDeliverySequence,
    snapshotScope: frame.event.scope,
    ts: frame.event.ts,
    authorPlayerId: frame.event.authorPlayerId,
    state: snapshotStateFromPayload(frame.event.payload),
  };
}

describe('scoped snapshot channel late-join', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
  let live: ManualLiveSource;
  let cleanup: Set<() => void>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    live = new ManualLiveSource();
    cleanup = new Set();
  });

  afterEach(async () => {
    cleanup.forEach(function (stop) {
      stop();
    });
    await closeCampaignDeliveryHarness(harness);
  });

  it('snapshot-plus-tail agrees with full-stream and continues sequences', async () => {
    const campaignId = 'campaign-snapshot-channel';
    const grant = issueTestGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const ledger = buildInterleavedLedger(campaignId, 2);
    for (const event of ledger) {
      await appendCampaignEvent(harness, event);
    }

    const principal = mintGrantPrincipal(PARTICIPANT_PLAYER);
    const fullSink = new RecordingSink();
    const snapSink = new RecordingSink();

    const shared = {
      closeTyped: (_code: IErrorCode, _reason: string): void => {
        throw new Error(`channel closed: ${_code} ${_reason}`);
      },
      matchId: MATCH_ID,
      campaignId,
      grantId: grant.grantId,
      principal,
      projectDeps: harness.deps,
      liveSource: live,
      cleanupFns: cleanup,
      nowIso: (): string => EVENT_TS,
    };

    await startCampaignGrantChannelSession(
      {
        ...shared,
        socketSend: fullSink.send,
        nullCursorBackfill: 'full-stream',
      },
      null,
    );
    await startCampaignGrantChannelSession(
      {
        ...shared,
        socketSend: snapSink.send,
        nullCursorBackfill: 'snapshot-plus-tail',
      },
      null,
    );

    const fullDelivery = framesOf(fullSink, 'CampaignGrantDelivery');
    expect(fullDelivery).toHaveLength(1);
    const fullItems = (fullDelivery[0]?.items ??
      []) as ICampaignGrantDeliveryItem[];
    expect(fullItems.length).toBeGreaterThanOrEqual(8);

    const snapshots = framesOf(snapSink, 'CampaignGrantSnapshot');
    expect(snapshots).toHaveLength(1);
    const snapFrame = snapshots[0];
    expect(snapFrame).toBeDefined();
    if (snapFrame === undefined) return;
    expect(snapFrame.grantId).toBe(grant.grantId);
    expect(snapFrame.asOfDeliverySequence).toBe(fullItems.length);

    const snapDelivery = framesOf(snapSink, 'CampaignGrantDelivery');
    expect(snapDelivery).toHaveLength(1);
    const tail = (snapDelivery[0]?.items ?? []) as ICampaignGrantDeliveryItem[];
    expect(tail).toEqual([]);

    const fullState = foldCampaignGrantDeliveryItems(campaignId, fullItems);
    const snapState = hydrateCampaignGrantFromSnapshot(
      snapshotFromFrame(snapFrame),
      tail,
    );
    expect(campaignJsonEquals(fullState, snapState)).toBe(true);

    const beforeFull = fullSink.sent.length;
    const beforeSnap = snapSink.sent.length;
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, ledger.length, 'campaign', 'VISIBLE-FUNDS-LIVE'),
    );
    live.wake();
    await drain(
      () =>
        fullSink.sent.length > beforeFull && snapSink.sent.length > beforeSnap,
    );

    const liveFull = framesOf(fullSink, 'CampaignGrantDelivery').flatMap(
      function (frame) {
        return frame.items;
      },
    );
    const liveSnap = framesOf(snapSink, 'CampaignGrantDelivery').flatMap(
      function (frame) {
        return frame.items;
      },
    );
    const nextSequence = fullItems.length + 1;
    const fullLiveItem = liveFull.find(function (item) {
      return item.deliverySequence === nextSequence;
    });
    const snapLiveItem = liveSnap.find(function (item) {
      return item.deliverySequence === nextSequence;
    });
    expect(fullLiveItem).toBeDefined();
    expect(snapLiveItem).toBeDefined();
    expect(snapLiveItem?.deliverySequence).toBe(nextSequence);
    expect(snapLiveItem?.deliverySequence).toBe(
      snapFrame.asOfDeliverySequence + 1,
    );
    expect(JSON.stringify(snapSink.sent)).not.toContain(SNAPSHOT_WITHHELD_GM);
  });
});
