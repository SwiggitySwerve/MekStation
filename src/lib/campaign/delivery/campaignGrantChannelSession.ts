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
 * Upper bound on projections per drain turn. A drain re-projects until
 * the stream is quiet; the bound keeps a pathological wake-per-commit
 * storm from monopolising the event loop, and the leftover signal is
 * carried into the next turn rather than dropped.
 */
const MAX_DRAIN_ITERATIONS = 8;

/**
 * Runs the replay/live handshake for one grant socket. The live
 * subscription is attached BEFORE the replay and its wakeups are
 * buffered, so a commit landing mid-replay cannot fall into the gap
 * between "already read" and "not yet subscribed"; a stale cursor
 * detaches again so it cannot generate live rebaseline spam.
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
  /** A drain loop is running; further wakes join it rather than racing. */
  private draining = false;
  /** At least one wakeup is owed a projection. Collapses a storm to one. */
  private pendingWake = false;
  /** Wakeups are buffered until the replay has handed over to live. */
  private liveReleased = false;
  private detachLive: (() => void) | null = null;

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
    // Subscribed before the first read, so nothing committed during the
    // replay can be missed by BOTH the replay and the live path. Wakeups
    // that arrive now are held, not acted on.
    this.attachLiveSubscription();
    const first =
      this.cursor === null &&
      this.deps.nullCursorBackfill === 'snapshot-plus-tail'
        ? await this.deliverSnapshotJoin()
        : await this.projectCurrentCursor();
    if (!this.active || first === 'closed' || first === 'stale') {
      // A stale cursor gets its rebaseline and nothing else: staying
      // subscribed would re-send that frame on every later commit.
      this.releaseLiveSubscription();
      return;
    }
    // One drain regardless of whether a wakeup arrived, so a join always
    // confirms it is caught up before the socket goes quiet.
    this.liveReleased = true;
    this.pendingWake = true;
    await this.drainLive();
  }

  /**
   * Registers a wakeup on the live source and drops it through the
   * binder's cleanupFns set so disconnect cannot leak the listener.
   */
  private attachLiveSubscription(): void {
    const unsubscribe = this.deps.liveSource.subscribe(() => {
      this.requestPump();
    });
    const stop = (): void => {
      this.active = false;
      unsubscribe();
    };
    this.detachLive = stop;
    this.deps.cleanupFns.add(stop);
  }

  /** Drops the live subscription for a session that will not go live. */
  private releaseLiveSubscription(): void {
    const stop = this.detachLive;
    if (stop === null) return;
    this.detachLive = null;
    this.deps.cleanupFns.delete(stop);
    stop();
  }

  /**
   * Records that a projection is owed and starts a drain if one is not
   * already running. Collapsing to a flag is what makes a burst of
   * wakeups cost one projection instead of one each - and it is also
   * what keeps two projections from reading the same cursor and putting
   * the same sequence on the wire twice.
   */
  private requestPump(): void {
    if (!this.active) return;
    this.pendingWake = true;
    if (!this.liveReleased) return;
    void this.drainLive();
  }

  /**
   * Drains owed projections until the stream is quiet. Re-entrant calls
   * return immediately: the running loop picks up the flag they set.
   */
  private async drainLive(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      let iterations = 0;
      while (
        this.active &&
        this.pendingWake &&
        iterations < MAX_DRAIN_ITERATIONS
      ) {
        this.pendingWake = false;
        iterations += 1;
        const result = await this.projectCurrentCursor();
        if (result === 'stale' || result === 'closed') {
          this.active = false;
          return;
        }
      }
    } catch (error) {
      this.failInternal(error);
    } finally {
      this.draining = false;
    }
    // Hit the bound with work still owed: continue on a later turn so a
    // storm yields the event loop instead of being silently truncated.
    if (this.active && this.pendingWake) {
      void Promise.resolve().then(() => this.drainLive());
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
