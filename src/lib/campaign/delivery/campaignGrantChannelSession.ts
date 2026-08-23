/**
 * Per-socket grant delivery session (design D5 + D7, task 3.3).
 *
 * Backfill and live items both come from projectCampaignStreamForGrant
 * so scope filtering and sequence assignment share one path. Live
 * fan-out is a wakeup after durable append; the host event is never
 * forwarded. An out-of-scope wakeup sends nothing. Time is injected.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5, D7)
 */

import type { IVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type {
  IDeliveryCursor,
  IDeliveryEpochBaseline,
} from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { IErrorCode, IServerMessage } from '@/types/multiplayer/Protocol';

import type {
  CampaignGrantNullCursorBackfill,
  ICampaignGrantDeliveryItem,
} from './campaignDeliveryTypes';
import type { IScopedCampaignSnapshot } from './campaignGrantSnapshotTypes';
import type { IProjectCampaignStreamDeps } from './projectCampaignStreamForGrant';

import {
  buildScopedCampaignSnapshot,
  serveScopedCampaignSnapshot,
} from './buildScopedCampaignSnapshot';
import {
  grantChannelInternalFrame,
  grantDeliveryRefusedFrame,
  grantSnapshotMismatchFrame,
} from './campaignGrantChannelAuth';
import { scopedSnapshotWireEvent } from './foldCampaignGrantDelivery';
import { projectCampaignStreamForGrant } from './projectCampaignStreamForGrant';

/**
 * Wakeup source for live delivery. The listener takes no event so a
 * caller cannot accidentally forward journal-bearing host events.
 */
export interface ICampaignGrantLiveSource {
  subscribe(listener: () => void): () => void;
}

export interface ICampaignGrantChannelSessionDeps {
  readonly socketSend: (message: IServerMessage) => void;
  readonly closeTyped: (code: IErrorCode, reason: string) => void;
  readonly matchId: string;
  readonly campaignId: string;
  readonly grantId: string;
  readonly principal: IVerifiedPrincipal;
  readonly projectDeps: IProjectCampaignStreamDeps;
  readonly liveSource: ICampaignGrantLiveSource;
  readonly cleanupFns: Set<() => void>;
  readonly nowIso: () => string;
  /**
   * Null-cursor backfill policy. Required so snapshot-plus-tail cannot
   * silently replace the full-stream join proven by task 3.3.
   */
  readonly nullCursorBackfill: CampaignGrantNullCursorBackfill;
}

/**
 * Runs backfill then live re-projection for one grant socket. Subscribe
 * happens only after a successful page so a stale cursor does not
 * generate live rebaseline spam.
 */
export async function startCampaignGrantChannelSession(
  deps: ICampaignGrantChannelSessionDeps,
  joinCursor: IDeliveryCursor | null,
): Promise<void> {
  const session = new CampaignGrantChannelSession(deps, joinCursor);
  await session.start();
}

class CampaignGrantChannelSession {
  private cursor: IDeliveryCursor | null;
  private sentJoinDelivery = false;
  private active = true;
  private pumpQueue: Promise<void> = Promise.resolve();

  /**
   * Binds wire callbacks, projection deps, and the starting cursor.
   * Cursor is replaced after each non-empty page; it is never a
   * journal position.
   */
  public constructor(
    private readonly deps: ICampaignGrantChannelSessionDeps,
    joinCursor: IDeliveryCursor | null,
  ) {
    this.cursor = joinCursor;
  }

  /**
   * Projects the join cursor first. A stale epoch sends rebaseline and
   * leaves the socket open without a live subscription. A page streams
   * items, then subscribes for durable-append wakeups.
   */
  public async start(): Promise<void> {
    const first =
      this.cursor === null &&
      this.deps.nullCursorBackfill === 'snapshot-plus-tail'
        ? await this.deliverSnapshotJoin()
        : await this.projectCurrentCursor();
    if (!this.active) return;
    if (first === 'closed') return;
    if (first === 'stale') return;
    this.attachLiveSubscription();
    await this.pumpLive();
  }

  /**
   * Registers a wakeup on the live source and drops it through the
   * binder's cleanupFns set so disconnect cannot leak the listener.
   */
  private attachLiveSubscription(): void {
    const unsubscribe = this.deps.liveSource.subscribe(() => {
      if (!this.active) return;
      this.enqueuePump();
    });
    const stop = (): void => {
      this.active = false;
      unsubscribe();
    };
    this.deps.cleanupFns.add(stop);
  }

  /**
   * Serializes live pumps so two rapid commits cannot interleave
   * re-projection and double-send the same sequence.
   */
  private enqueuePump(): void {
    this.pumpQueue = this.pumpQueue
      .then(() => this.pumpLive())
      .catch((error: unknown) => {
        this.failInternal(error);
      });
  }

  /**
   * Re-projects from the last delivered cursor. Empty item lists after
   * join are withheld (out of scope or already delivered).
   */
  private async pumpLive(): Promise<void> {
    if (!this.active) return;
    const result = await this.projectCurrentCursor();
    if (result === 'stale' || result === 'closed') {
      this.active = false;
    }
  }

  /**
   * Null-cursor join on the snapshot path: scoped snapshot as-of the
   * projected head, then the remaining tail (empty at a quiet head),
   * then the cursor sits at asOf so live items continue contiguously.
   * Does not call advanceCursor on an empty tail, which would reset a
   * null cursor to sequence 0 and re-send the whole stream live.
   */
  private async deliverSnapshotJoin(): Promise<'page' | 'stale' | 'closed'> {
    let built;
    try {
      built = await buildScopedCampaignSnapshot(this.deps.projectDeps, {
        principal: this.deps.principal,
        grantId: this.deps.grantId,
        nowIso: this.deps.nowIso(),
      });
    } catch (error) {
      this.failInternal(error);
      return 'closed';
    }

    if (built.kind === 'refused') {
      const frame = grantDeliveryRefusedFrame();
      this.deps.closeTyped(frame.code, frame.reason);
      return 'closed';
    }
    if (built.kind === 'stale-epoch') {
      this.sendRebaseline(built.newBaseline);
      return 'stale';
    }
    if (built.kind === 'cut-rejected') {
      this.failInternal(new Error(built.reason));
      return 'closed';
    }

    const served = serveScopedCampaignSnapshot(
      built.snapshot,
      this.deps.grantId,
    );
    if (served.kind === 'refused') {
      const frame = grantSnapshotMismatchFrame();
      this.deps.closeTyped(frame.code, frame.reason);
      return 'closed';
    }

    this.sendSnapshot(served.snapshot);
    this.cursor = {
      deliveryEpochId: served.snapshot.deliveryEpochId,
      afterSequence: served.snapshot.asOfDeliverySequence,
    };
    this.sendDelivery(
      built.page.deliveryEpochId,
      built.page.baseline,
      built.tail,
    );
    this.sentJoinDelivery = true;
    if (built.tail.length > 0) {
      this.advanceCursor(built.page.deliveryEpochId, built.tail);
    }
    return 'page';
  }

  /**
   * Sends the grant-keyed snapshot frame. asOfDeliverySequence is the
   * per-grant high water; the nested event has no source sequence.
   */
  private sendSnapshot(snapshot: IScopedCampaignSnapshot): void {
    this.deps.socketSend({
      kind: 'CampaignGrantSnapshot',
      matchId: this.deps.matchId,
      ts: this.deps.nowIso(),
      campaignId: this.deps.campaignId,
      grantId: this.deps.grantId,
      deliveryEpochId: snapshot.deliveryEpochId,
      baseline: {
        deliveryEpochId: snapshot.baseline.deliveryEpochId,
        effectiveGeneration: snapshot.baseline.effectiveGeneration,
      },
      asOfDeliverySequence: snapshot.asOfDeliverySequence,
      event: scopedSnapshotWireEvent(snapshot),
    });
  }

  /**
   * Single projection. Join handshake always sends a delivery frame
   * (possibly empty) so the replica learns the baseline. Later empty
   * pages send nothing.
   */
  private async projectCurrentCursor(): Promise<'page' | 'stale' | 'closed'> {
    let projected;
    try {
      projected = await projectCampaignStreamForGrant(this.deps.projectDeps, {
        principal: this.deps.principal,
        grantId: this.deps.grantId,
        cursor: this.cursor,
      });
    } catch (error) {
      this.failInternal(error);
      return 'closed';
    }

    if (projected.kind === 'refused') {
      const frame = grantDeliveryRefusedFrame();
      this.deps.closeTyped(frame.code, frame.reason);
      return 'closed';
    }

    if (projected.kind === 'stale-epoch') {
      this.sendRebaseline(projected.newBaseline);
      return 'stale';
    }

    this.advanceCursor(projected.deliveryEpochId, projected.items);
    if (!this.sentJoinDelivery || projected.items.length > 0) {
      this.sendDelivery(
        projected.deliveryEpochId,
        projected.baseline,
        projected.items,
      );
      this.sentJoinDelivery = true;
    }
    return 'page';
  }

  /**
   * Moves the exclusive cursor to the last delivered sequence, or to
   * sequence 0 of the current epoch when the page is empty.
   */
  private advanceCursor(
    deliveryEpochId: string,
    items: readonly ICampaignGrantDeliveryItem[],
  ): void {
    const last = items[items.length - 1];
    if (last !== undefined) {
      this.cursor = {
        deliveryEpochId,
        afterSequence: last.deliverySequence,
      };
      return;
    }
    if (this.cursor === null) {
      this.cursor = { deliveryEpochId, afterSequence: 0 };
    }
  }

  /**
   * Sends a delivery frame. Items are already stripped of journal
   * fields by projectCampaignStreamForGrant.
   */
  private sendDelivery(
    deliveryEpochId: string,
    baseline: IDeliveryEpochBaseline,
    items: readonly ICampaignGrantDeliveryItem[],
  ): void {
    this.deps.socketSend({
      kind: 'CampaignGrantDelivery',
      matchId: this.deps.matchId,
      ts: this.deps.nowIso(),
      campaignId: this.deps.campaignId,
      grantId: this.deps.grantId,
      deliveryEpochId,
      baseline: {
        deliveryEpochId: baseline.deliveryEpochId,
        effectiveGeneration: baseline.effectiveGeneration,
      },
      items: items.map(function (item) {
        return {
          deliverySequence: item.deliverySequence,
          event: item.event,
        };
      }),
    });
  }

  /**
   * Sends the stale-epoch frame with a fresh baseline and no events.
   */
  private sendRebaseline(baseline: IDeliveryEpochBaseline): void {
    this.deps.socketSend({
      kind: 'CampaignGrantRebaseline',
      matchId: this.deps.matchId,
      ts: this.deps.nowIso(),
      campaignId: this.deps.campaignId,
      grantId: this.deps.grantId,
      baseline: {
        deliveryEpochId: baseline.deliveryEpochId,
        effectiveGeneration: baseline.effectiveGeneration,
      },
    });
  }

  /**
   * Closes as infrastructure. A store throw must not become AUTH_REJECTED.
   */
  private failInternal(_error: unknown): void {
    this.active = false;
    const frame = grantChannelInternalFrame();
    this.deps.closeTyped(frame.code, frame.reason);
  }
}
