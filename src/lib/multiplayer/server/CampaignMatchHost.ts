/**
 * CampaignMatchHost — the campaign-tier server-authoritative host (CO1).
 *
 * The campaign analogue of `ServerMatchHost`. Where `ServerMatchHost`
 * owns one match's authoritative `GameSession` and arbitrates combat
 * intents, `CampaignMatchHost` owns one campaign's authoritative ledger
 * state and arbitrates campaign intents — hiring, contracts, spends,
 * salvage, day advancement.
 *
 * It runs the exact `intent → validate → commit → broadcast` loop the
 * Council's DP2 decision mandated (design D1, D4):
 *
 *   1. reject if the session is closed,
 *   2. reject if the intent is malformed (zod parse),
 *   3. validate the intent against current authoritative state
 *      (balance / standing / salvage — `validateCampaignIntent`),
 *   4. on success, apply the mutation to authoritative state and derive
 *      the resulting `ICampaignEvent`(s),
 *   5. append each event to the campaign event log (transactional,
 *      ascending gap-free sequence),
 *   6. broadcast each event to all connected clients.
 *
 * A rejected intent mutates nothing and returns a typed
 * `ICampaignIntentError` (`code: 'INVALID_CAMPAIGN_INTENT'`); the
 * connection stays open so the guest can correct and retry — the same
 * contract `ServerMatchHostIntent` uses for combat.
 *
 * The host is the SINGLE WRITER. Host-initiated events (a host clicking
 * "advance day") and guest-intent-derived events both go through the
 * one `commitEvents` path, so the log is always totally ordered with no
 * gaps — the `IMatchStore` transactional-append guarantee, reused for
 * the campaign tier (design D2 / risk mitigation).
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D1, D2, D4)
 */

import type { ICoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';
import type {
  CampaignIntentResult,
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
  ICampaignIntentError,
  ICampaignSnapshotPublishedPayload,
} from '@/types/campaign/CampaignSync';

import { CampaignEventLog } from '@/lib/campaign/sync/campaignEventLog';
import { type ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';

import type {
  CampaignCommitOutcome,
  ICampaignBatchCommitHost,
} from './campaignHostBatchCommit';
import type {
  CampaignRosterChangeKind,
  ICampaignHostBatchDoors,
  ICampaignRosterUnitChange,
} from './campaignHostDoors';
import type { ICampaignIntentCommandIdentity } from './campaignIntentIdentity';
import type { UnsequencedCampaignEvent } from './CampaignMatchHostIntent';

import {
  commitCampaignEventBatch,
  commitCampaignEventsInSequence,
} from './campaignHostBatchCommit';
import {
  type ICampaignMatchHostLockedContext,
  applyHostIntentLocked,
  applyRosterUnitChangeLocked,
  creditSalvagePoolLocked,
  handleIntentLocked,
  openLocked,
} from './CampaignMatchHost.doors';
import {
  commitCampaignOutcomeConsequences,
  outcomeInboxHostFrom,
  type CampaignOutcomeConsequenceResult,
} from './CampaignMatchHostOutcomeInbox';

/**
 * A connected campaign-sync client. The host broadcasts every committed
 * campaign event to each subscriber. The WebSocket upgrade handler
 * registers one subscriber per socket; tests register a buffer.
 */
export type CampaignEventSubscriber = (event: ICampaignEvent) => void;

export type { CampaignOutcomeConsequenceResult } from './CampaignMatchHostOutcomeInbox';

/** Construction input for a `CampaignMatchHost`. */
export interface ICampaignMatchHostOptions {
  /** Campaign id this host owns. */
  readonly campaignId: string;
  /** The host player's id — stamped as `authorPlayerId` on host events. */
  readonly hostPlayerId: string;
  /** The campaign event log store the host appends to. */
  readonly eventStore: ICampaignEventStore;
  /**
   * The campaign's starting authoritative state. The host commits a
   * `CampaignSnapshotPublished` baseline from this on `open`, so the
   * log always begins with a replayable baseline.
   */
  readonly initialState: ICampaignAuthoritativeState;
}

export class CampaignMatchHost {
  public readonly campaignId: string;
  private readonly hostPlayerId: string;
  private readonly log: CampaignEventLog;
  private readonly eventStore: ICampaignEventStore;
  /** The host's authoritative campaign state — the single source of truth. */
  private state: ICampaignAuthoritativeState;
  private readonly subscribers = new Set<CampaignEventSubscriber>();
  private closed = false;
  /** True once `open` has committed the baseline snapshot. */
  private opened = false;
  /**
   * True after a committed batch's applied digest diverged from its
   * expected digest (D10). The projection was rebuilt from the journal;
   * the flag is diagnostic — it records that a divergence occurred.
   */
  private divergenceDetected = false;
  /**
   * The single-writer lock, as a promise chain.
   *
   * `commitEventsAsBatch` claims the next sequence across an `await`, and
   * validation reads `this.state` before it, so two doors in flight
   * resolve the same base AND validate against the same pre-state. The
   * comment at the collision throw already called this host a single
   * writer; this is where that stops being an assumption.
   *
   * A chain rather than an explicit queue because there is no priority or
   * cancellation to express - the same idiom the persistence store uses
   * to serialize its writes.
   */
  private commitChain: Promise<unknown> = Promise.resolve();
  /**
   * Depth of the held lock. Only doors take it; `commitEvents` asserts on
   * it. A lock reachable without being held is a lock with a hole, and
   * the assert is what makes the single-writer claim enforced rather than
   * remembered.
   */
  private lockDepth = 0;

  constructor(options: ICampaignMatchHostOptions) {
    this.campaignId = options.campaignId;
    this.hostPlayerId = options.hostPlayerId;
    this.eventStore = options.eventStore;
    this.log = new CampaignEventLog(options.campaignId, options.eventStore);
    this.state = options.initialState;
  }

  /** Diagnostic: whether a projection divergence has ever been detected. */
  hasDetectedDivergence = (): boolean => {
    return this.divergenceDetected;
  };

  /**
   * Run one door's whole critical section - validate AND commit - with
   * nothing else from this host interleaved.
   *
   * The SPAN matters more than the lock. A mutex around the commit alone
   * fixes the sequence numbering and leaves the ledger race untouched,
   * because two intents validated against the same pre-state are both
   * approved before either of them appends.
   *
   * The chain is rejection-proof: a door that throws must not wedge every
   * later door behind a permanently rejected promise.
   */
  /**
   * Run a MULTI-DOOR body as one critical section (finding #78).
   *
   * A post-battle reconcile is three doors describing one battle. Walked
   * through the public doors it is three critical sections with two gaps,
   * and a racing writer lands in a gap: a mirror observed the payout
   * applied and the salvage missing. The body is handed the UNLOCKED
   * bodies rather than the public doors - see `campaignHostDoors` for
   * why a re-entrant depth counter would be a hole, not a fix.
   */
  runBatchExclusive = <T>(
    work: (doors: ICampaignHostBatchDoors) => Promise<T>,
  ): Promise<T> => this.runExclusive(() => work(this.batchDoors()));

  private batchDoors(): ICampaignHostBatchDoors {
    const ctx = this.doorContext();
    return {
      applyHostIntent: (intent) => applyHostIntentLocked(ctx, intent),
      creditSalvagePool: (value, reason) =>
        creditSalvagePoolLocked(ctx, value, reason),
      applyRosterUnitChange: (campaignId, change, unit, intentTag) =>
        applyRosterUnitChangeLocked(ctx, campaignId, change, unit, intentTag),
    };
  }

  private doorContext(): ICampaignMatchHostLockedContext {
    return {
      campaignId: this.campaignId,
      hostPlayerId: this.hostPlayerId,
      eventStore: this.eventStore,
      isOpened: () => this.opened,
      isClosed: () => this.closed,
      markOpened: () => {
        this.opened = true;
      },
      readState: () => this.state,
      nextSequence: () => this.log.nextSequence(),
      commitEvents: (events, identity) => this.commitEvents(events, identity),
    };
  }

  private runExclusive<T>(work: () => Promise<T>): Promise<T> {
    const queued = this.commitChain.then(() => {
      this.lockDepth += 1;
      return work().finally(() => {
        this.lockDepth -= 1;
      });
    });
    this.commitChain = queued.catch(() => undefined);
    return queued;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Open the shared campaign: commit a `CampaignSnapshotPublished`
   * baseline as sequence 0 so the log always opens with a replayable
   * whole-state event. Idempotent — calling `open` twice is a no-op.
   *
   * `CampaignSyncSession` calls this when a host opens a campaign for
   * co-op; it then issues the room code.
   */
  open = async (): Promise<void> =>
    this.runExclusive(() => openLocked(this.doorContext()));

  /**
   * Close the campaign session. Idempotent. After close, every intent
   * is rejected with `reason: 'session-closed'` and no event commits —
   * the host-disconnect "session pauses, mirror frozen" contract
   * (design D6).
   */
  close = (): void => {
    this.closed = true;
    this.subscribers.clear();
  };

  /** Whether `close` has run. */
  isClosed = (): boolean => {
    return this.closed;
  };

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Register a subscriber for committed campaign events. Returns an
   * unsubscribe function. The campaign analogue of `attachSocket` —
   * `CampaignSyncSession` wires one subscriber per connected client.
   */
  subscribe = (subscriber: CampaignEventSubscriber): (() => void) => {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  };

  /** Number of currently-subscribed clients. Test/observability. */
  subscriberCount = (): number => {
    return this.subscribers.size;
  };

  // ---------------------------------------------------------------------------
  // Authoritative state access
  // ---------------------------------------------------------------------------

  /**
   * The host's current authoritative campaign state. A defensive copy
   * is unnecessary because `ICampaignAuthoritativeState` is treated as
   * immutable everywhere — the host only ever replaces it wholesale.
   */
  getState = (): ICampaignAuthoritativeState => {
    return this.state;
  };

  getHostPlayerId = (): string => {
    return this.hostPlayerId;
  };

  hasCombatOutcomeInbox = (): boolean =>
    this.eventStore.appendCombatOutcomeBatch !== undefined;

  /**
   * Commit one terminal combat outcome's campaign consequences through the
   * durable inbox. A duplicate returns its prior receipt path without
   * touching projection or fan-out; a different version is a typed conflict.
   */
  commitCombatOutcomeConsequences = async (
    consequences: ICoopBattleConsequences,
  ): Promise<CampaignOutcomeConsequenceResult> =>
    // FINDING #77: this is a writer door like any other. It never goes
    // through `commitEvents`, so the lock-held assert cannot see it, and
    // it reads `nextSequence()` across an await exactly like the doors
    // the serializer already covers. It is reachable only on an
    // inbox-capable store, which is why no row caught it until one was
    // written against a real journal store.
    this.runExclusive(() =>
      commitCampaignOutcomeConsequences(
        outcomeInboxHostFrom(
          this.batchHost(),
          this.hostPlayerId,
          this.eventStore,
        ),
        consequences,
      ),
    );

  /** The campaign event log facade — for the sync-session replay path. */
  getEventLog = (): CampaignEventLog => {
    return this.log;
  };

  /**
   * Build a fresh `CampaignSnapshotPublished` payload from the host's
   * CURRENT authoritative state. The sync session sends this as the
   * baseline a joining (or large-gap-resyncing) guest seeds from.
   */
  buildSnapshotPayload = (): ICampaignSnapshotPublishedPayload => {
    return { state: this.state };
  };

  // ---------------------------------------------------------------------------
  // Intent handling — validate / commit / broadcast
  // ---------------------------------------------------------------------------

  /**
   * Process one campaign intent through the closed-check, malformed-
   * check, validate, commit, broadcast sequence (design D4).
   *
   * `rawIntent` is typed `unknown` because it arrives off the wire — the
   * malformed-check is a real zod parse, not a type assertion. A
   * structurally-invalid envelope is rejected with
   * `reason: 'malformed-intent'` before any state is touched.
   *
   * Returns a `CampaignIntentResult`: on success the committed (and now
   * sequenced) events; on rejection the typed error. The host also
   * broadcasts the committed events to every subscriber before
   * returning, so a test can assert on either the return value or the
   * subscriber buffer.
   */
  handleIntent = async (rawIntent: unknown): Promise<CampaignIntentResult> =>
    this.runExclusive(() => handleIntentLocked(this.doorContext(), rawIntent));

  /**
   * Convenience for the host's OWN actions (e.g. a host UI clicking
   * "advance day"). Takes an `ICampaignIntent` directly — it is already
   * trusted, so the malformed-check is skipped, but it still runs the
   * authoritative-state validation so a host action that breaks the
   * ledger invariant (over-spend) is rejected just like a guest's.
   */
  applyHostIntent = async (
    intent: ICampaignIntent,
  ): Promise<CampaignIntentResult> =>
    this.runExclusive(() => applyHostIntentLocked(this.doorContext(), intent));

  /**
   * Credit the campaign salvage pool — a host-authoritative
   * reconciliation event (CO2 design D8).
   *
   * Post-battle reconciliation needs to GROW the salvage pool (a battle
   * yields salvage / a mission payout). CO1's guest intent set only
   * DRAWS from the pool (`AllocateSalvage`); a credit is not a guest
   * action — it is a host-authoritative consequence of a resolved
   * encounter. This method commits a `SalvageAllocated` event whose
   * `poolRemaining` is the pool AFTER adding `value`, so both mirrors
   * see the larger pool.
   *
   * `value` must be positive; a non-positive credit is a no-op rejection
   * so reconciliation never emits an empty event.
   */
  creditSalvagePool = async (
    value: number,
    reason: string,
  ): Promise<CampaignIntentResult> =>
    this.runExclusive(() =>
      creditSalvagePoolLocked(this.doorContext(), value, reason),
    );

  /**
   * Commit a `RosterUnitChanged` event under host authority — a
   * post-battle reconciliation consequence (CO2 design D8).
   *
   * A co-op battle damages or destroys roster units; the change is a
   * host-authoritative fact, not a guest intent. This commits the event
   * through the single commit path so both mirrors converge on the
   * post-battle roster.
   */
  applyRosterUnitChange = async (
    campaignId: string,
    change: CampaignRosterChangeKind,
    unit: ICampaignRosterUnitChange,
    intentTag: string,
  ): Promise<CampaignIntentResult> =>
    this.runExclusive(() =>
      applyRosterUnitChangeLocked(
        this.doorContext(),
        campaignId,
        change,
        unit,
        intentTag,
      ),
    );

  /**
   * Build the typed error envelope for a rejected intent, carrying the
   * originating `intentId` for guest-side correlation. The transport
   * layer (`CampaignSyncSession`) sends this to the originating client.
   */
  static toIntentError(
    intentId: string,
    rejection: Extract<CampaignIntentResult, { ok: false }>,
  ): ICampaignIntentError {
    // Spread rather than rebuild: the stale-head arm carries a head and
    // a recovery action, and picking fields by hand is how they got
    // dropped on the way to the wire in the first place.
    return { ...rejection, intentId };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * The single commit path. Every event — host-initiated and
   * guest-intent-derived — flows through here, so the campaign event
   * log is always totally ordered with no gaps (design D2 risk
   * mitigation).
   *
   * For each unsequenced event: stamp the next sequence from the log,
   * append it (transactional — a collision throws), advance the host's
   * authoritative state through the shared `applyCampaignEvent` reducer,
   * and broadcast it. Sequence assignment is awaited per-event so two
   * events in one batch get consecutive numbers.
   */
  /**
   * Test-only: commit through the single real path. The scope table's
   * anticipated GM-hidden facts have no production producer yet, and
   * the wire scope boundary must be proven against the REAL commit,
   * hydration, and live fan-out - not a mock. Same seam family as
   * _setApplyCommittedForTests.
   */
  _commitEventsForTests = async (
    events: readonly UnsequencedCampaignEvent[],
  ): Promise<readonly ICampaignEvent[]> =>
    this.runExclusive(async () => {
      const outcome = await this.commitEvents(events);
      if (outcome.kind === 'lost-race') {
        // A test seam has no caller to hand a refusal to, and an empty
        // array would read as "committed nothing".
        throw new Error('commit lost a race to another writer');
      }
      return outcome.events;
    });

  private async commitEvents(
    events: readonly UnsequencedCampaignEvent[],
    identity?: ICampaignIntentCommandIdentity,
  ): Promise<CampaignCommitOutcome> {
    // The enforcement of the single-writer claim the collision throw
    // below already asserts. Reaching a commit without the lock means a
    // door was added that forgot to take it, and the symptom would
    // otherwise be an intermittent sequence collision in production
    // rather than a failure here.
    if (this.lockDepth === 0) {
      throw new Error(
        'CampaignMatchHost.commitEvents reached without the single-writer lock held',
      );
    }
    if (this.eventStore.appendCommandBatch) {
      return commitCampaignEventBatch(
        this.batchHost(),
        events,
        this.eventStore.appendCommandBatch,
        identity,
      );
    }
    return commitCampaignEventsInSequence(
      this.batchHost(),
      (event) => this.log.append(event),
      events,
    );
  }

  /**
   * The D10 command→append pipeline (task 1.2), taken when the store is
   * batch-capable (journal-backed): stamp one contiguous sequence run,
   * derive the whole batch's expected post-state digest BEFORE commit,
   * append batch + digest atomically, re-apply the committed batch to the
   * live projection, verify the applied digest — and only then fan out.
   * On divergence the host publishes no success, rebuilds the projection
   * from the durable journal, and never deletes or compensates the
   * committed batch.
   */
  /** Fan one committed event out to every subscriber. */
  private publish(event: ICampaignEvent): void {
    this.subscribers.forEach((subscriber) => subscriber(event));
  }

  /** The five things the batch pipeline reads and moves, named once. */
  private batchHost(): ICampaignBatchCommitHost {
    return {
      campaignId: this.campaignId,
      nextSequence: () => this.log.nextSequence(),
      readState: () => this.state,
      writeState: (state) => {
        this.state = state;
      },
      rebuildState: () => this.log.reconstructState(),
      markDivergence: () => {
        this.divergenceDetected = true;
      },
      publish: (event) => this.publish(event),
    };
  }
}
