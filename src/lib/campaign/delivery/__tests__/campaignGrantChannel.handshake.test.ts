/**
 * Replay/live handshake boundary on the grant channel (task 5.4, D5/D7).
 *
 * The join handshake replays through a high-water mark and then goes
 * live. The seam between those two is where events get lost or sent
 * twice, and neither failure announces itself: a duplicate is absorbed
 * by the replica's idempotent apply, and a loss only shows up later as a
 * gap. So the boundary is pinned directly here.
 *
 * Every row runs against real SQLite through the shared harness, with
 * the journal gated so a commit can be made to land at a chosen instant
 * inside the handshake rather than hoping a timer lands there.
 */

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { IErrorCode, IServerMessage } from '@/types/multiplayer/Protocol';

import {
  drain,
  ManualLiveSource,
} from '@/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers';

import type { ICampaignGrantDeliveryItem } from '../campaignDeliveryTypes';
import type { IProjectCampaignStreamDeps } from '../projectCampaignStreamForGrant';

import { startCampaignGrantChannelSession } from '../campaignGrantChannelSession';
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

const MATCH_ID = 'match-handshake';
const CAMPAIGN_ID = 'campaign-handshake';

class RecordingSink {
  readonly sent: IServerMessage[] = [];

  public send = (message: IServerMessage): void => {
    this.sent.push(message);
  };
}

/** Every delivered sequence, in the order it went out on the wire. */
function deliveredSequences(sink: RecordingSink): number[] {
  return sink.sent
    .filter(
      (
        message,
      ): message is Extract<
        IServerMessage,
        { kind: 'CampaignGrantDelivery' }
      > => message.kind === 'CampaignGrantDelivery',
    )
    .flatMap((frame) =>
      (frame.items as ICampaignGrantDeliveryItem[]).map(
        (item) => item.deliverySequence,
      ),
    );
}

/**
 * A journal that can hold reads open. `gate()` opens a latch: every
 * subsequent read parks until `release()`, which is what lets a test
 * place a commit INSIDE the handshake instead of racing it.
 */
class GatedJournal {
  private latch: Promise<void> | null = null;
  private open: (() => void) | null = null;
  private gateAfter = 0;
  public reads = 0;

  public constructor(
    private readonly inner: IEventJournal<ICampaignJournalEnvelope>,
  ) {}

  public gate(): void {
    this.gateFromRead(this.reads + 1);
  }

  /**
   * Arms the latch for every read from `index` onward. Arming up front is
   * what lets a test park a read the session issues on its own, without
   * having to win a race against it.
   */
  public gateFromRead(index: number): void {
    this.gateAfter = index;
    this.latch = new Promise<void>((resolve) => {
      this.open = resolve;
    });
  }

  public release(): void {
    this.open?.();
    this.latch = null;
    this.open = null;
    this.gateAfter = 0;
  }

  /** Proxies the journal, parking reads while the latch is closed. */
  public asJournal(): IEventJournal<ICampaignJournalEnvelope> {
    const self = this;
    return new Proxy(this.inner, {
      get(target, property, receiver: unknown) {
        const value = Reflect.get(target, property, receiver) as unknown;
        if (property !== 'readStream' || typeof value !== 'function') {
          return typeof value === 'function'
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        }
        return async (...args: unknown[]): Promise<unknown> => {
          self.reads += 1;
          if (self.latch !== null && self.reads >= self.gateAfter) {
            await self.latch;
          }
          return (value as (...args: unknown[]) => Promise<unknown>).apply(
            target,
            args,
          );
        };
      },
    }) as IEventJournal<ICampaignJournalEnvelope>;
  }
}

/**
 * Wakes at the exact moment of subscription. A commit that lands right
 * as the handshake goes live is the realistic version of this: the
 * source has no idea a session is mid-handover.
 */
class WakeOnSubscribeSource {
  private readonly listeners = new Set<() => void>();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    queueMicrotask(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public wake(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

describe('grant channel replay/live handshake', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
  let live: ManualLiveSource;
  let cleanup: Set<() => void>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    live = new ManualLiveSource();
    cleanup = new Set();
  });

  afterEach(async () => {
    cleanup.forEach((stop) => stop());
    await closeCampaignDeliveryHarness(harness);
  });

  /** Grant + session wiring shared by every row. */
  function sessionDeps(
    sink: RecordingSink,
    grantId: string,
    projectDeps: IProjectCampaignStreamDeps,
  ) {
    return {
      socketSend: sink.send,
      closeTyped: (code: IErrorCode, reason: string): void => {
        throw new Error(`channel closed: ${code} ${reason}`);
      },
      matchId: MATCH_ID,
      campaignId: CAMPAIGN_ID,
      grantId,
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      projectDeps,
      liveSource: live,
      cleanupFns: cleanup,
      nowIso: (): string => EVENT_TS,
      nullCursorBackfill: 'full-stream' as const,
    };
  }

  function grant() {
    return issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
  }

  it('sends each sequence exactly once when a wakeup lands mid-handshake', async () => {
    const issued = grant();
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 0, 'campaign', 'pay-0'),
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'pay-1'),
    );

    const gated = new GatedJournal(harness.journal);
    const sink = new RecordingSink();
    const deps = { ...harness.deps, journal: gated.asJournal() };
    // Read 1 is the join replay and runs free. Read 2 onward - the
    // handover to live, and anything a wakeup starts alongside it - park,
    // which puts every projection racing that boundary in flight at once.
    gated.gateFromRead(2);
    const eager = new WakeOnSubscribeSource();

    const started = startCampaignGrantChannelSession(
      {
        ...sessionDeps(sink, issued.grantId, deps),
        liveSource: eager,
      },
      null,
    );
    await drain(() => gated.reads >= 2);
    // A commit both parked projections will see once released. Each one
    // reads the same cursor, so an unserialised handover puts sequence 3
    // on the wire twice.
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 2, 'campaign', 'pay-2'),
    );
    gated.release();
    await started;
    await drain(() => deliveredSequences(sink).includes(3));

    const sequences = deliveredSequences(sink);
    // The replica absorbs a duplicate silently, which is exactly why
    // nothing downstream would ever report this.
    expect(sequences).toEqual(Array.from(new Set(sequences)));
    expect(sequences).toEqual([1, 2, 3]);
  });

  it('loses nothing committed between the replay and the live subscription', async () => {
    const issued = grant();
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 0, 'campaign', 'pay-0'),
    );

    const gated = new GatedJournal(harness.journal);
    const sink = new RecordingSink();
    const deps = { ...harness.deps, journal: gated.asJournal() };

    // Hold the join replay open, commit underneath it, then let go. The
    // commit is invisible to the replay and fires no wakeup this socket
    // is subscribed to yet - the classic lost-event window.
    gated.gate();
    const started = startCampaignGrantChannelSession(
      sessionDeps(sink, issued.grantId, deps),
      null,
    );
    await drain(() => gated.reads > 0);
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'pay-1'),
    );
    gated.release();
    await started;
    await drain(() => deliveredSequences(sink).length >= 2);

    // Sequence 2 must arrive without anyone waking the socket again: the
    // handshake itself is responsible for closing its own window.
    expect(deliveredSequences(sink)).toEqual([1, 2]);
  });

  it('resumes from a mid-stream cursor without re-sending what it has', async () => {
    const issued = grant();
    for (let i = 0; i < 3; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(CAMPAIGN_ID, i, 'campaign', `pay-${i}`),
      );
    }

    // First connection reads the whole stream and learns its cursor.
    const firstSink = new RecordingSink();
    await startCampaignGrantChannelSession(
      sessionDeps(firstSink, issued.grantId, harness.deps),
      null,
    );
    await drain(() => deliveredSequences(firstSink).length >= 3);
    const firstFrames = firstSink.sent.filter(
      (
        message,
      ): message is Extract<
        IServerMessage,
        { kind: 'CampaignGrantDelivery' }
      > => message.kind === 'CampaignGrantDelivery',
    );
    const epoch = firstFrames[0]?.deliveryEpochId;
    expect(epoch).toBeDefined();
    if (epoch === undefined) return;

    // Reconnect from sequence 2. The overlap - 1 and 2 - must not come
    // back: a resumed socket that re-sends what it already applied is
    // indistinguishable, from the wire, from a source that lost track.
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 3, 'campaign', 'pay-3'),
    );
    const resumeSink = new RecordingSink();
    await startCampaignGrantChannelSession(
      sessionDeps(resumeSink, issued.grantId, harness.deps),
      { deliveryEpochId: epoch, afterSequence: 2 },
    );
    await drain(() => deliveredSequences(resumeSink).length >= 2);

    expect(deliveredSequences(resumeSink)).toEqual([3, 4]);
  });

  it('rebaselines a foreign cursor and then stays off the live path', async () => {
    const issued = grant();
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 0, 'campaign', 'pay-0'),
    );

    const sink = new RecordingSink();
    await startCampaignGrantChannelSession(
      sessionDeps(sink, issued.grantId, harness.deps),
      { deliveryEpochId: 'epoch-from-another-life', afterSequence: 9 },
    );
    await drain(() => sink.sent.length >= 1);

    expect(sink.sent.map((message) => message.kind)).toEqual([
      'CampaignGrantRebaseline',
    ]);
    // The socket stays open but off the live path. Left subscribed, it
    // would answer every later commit with another rebaseline frame -
    // a stale cursor turning into a broadcast storm.
    expect(live.listenerCount).toBe(0);

    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'pay-1'),
    );
    live.wake();
    await drain();

    expect(sink.sent).toHaveLength(1);
  });

  it('collapses a wakeup storm instead of projecting once per wakeup', async () => {
    const issued = grant();
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 0, 'campaign', 'pay-0'),
    );

    const gated = new GatedJournal(harness.journal);
    const sink = new RecordingSink();
    const deps = { ...harness.deps, journal: gated.asJournal() };

    const started = startCampaignGrantChannelSession(
      sessionDeps(sink, issued.grantId, deps),
      null,
    );
    await drain(() => deliveredSequences(sink).length >= 1);
    await started;
    const settled = gated.reads;

    gated.gate();
    for (let i = 0; i < 20; i += 1) live.wake();
    gated.release();
    await drain(() => gated.reads > settled);
    await drain();

    // A quiet campaign under a storm of wakeups must not run 20 SQLite
    // projections; the drain is bounded, not one-per-signal.
    expect(gated.reads - settled).toBeLessThanOrEqual(4);
    expect(deliveredSequences(sink)).toEqual([1]);
  });
});
