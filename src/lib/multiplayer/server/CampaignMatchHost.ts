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

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { CampaignEventLog } from '@/lib/campaign/sync/campaignEventLog';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import {
  CampaignEventSequenceCollisionError,
  CampaignProjectionDivergenceError,
  type ICampaignEventStore,
} from '@/lib/campaign/sync/ICampaignEventStore';
import { computeCampaignStateDigest } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { INVALID_CAMPAIGN_INTENT } from '@/types/campaign/CampaignSync';
import { parseCampaignIntent } from '@/types/campaign/campaignSyncSchemas';
import { nowIso } from '@/types/multiplayer/Protocol';

import type {
  CampaignIntentValidation,
  UnsequencedCampaignEvent,
} from './CampaignMatchHostIntent';

import { validateCampaignIntent } from './CampaignMatchHostIntent';
import {
  commitCampaignOutcomeConsequences,
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
  open = async (): Promise<void> => {
    if (this.opened || this.closed) return;
    this.opened = true;
    // A recovered durable campaign already has its baseline and tail. Do not
    // append a second genesis snapshot merely because a new host instance
    // opened around it.
    if ((await this.log.nextSequence()) > 0) return;
    await this.commitEvents([
      {
        type: 'CampaignSnapshotPublished',
        campaignId: this.campaignId,
        authorPlayerId: this.hostPlayerId,
        ts: nowIso(),
        // Shared ledger baseline for every co-op participant, not GM-only.
        scope: 'campaign',
        payload: { state: this.state },
      },
    ]);
  };

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
    commitCampaignOutcomeConsequences(
      {
        campaignId: this.campaignId,
        hostPlayerId: this.hostPlayerId,
        eventStore: this.eventStore,
        getState: () => this.state,
        setState: (state) => {
          this.state = state;
        },
        nextSequence: () => this.log.nextSequence(),
        reconstructState: () => this.log.reconstructState(),
        markDivergence: () => {
          this.divergenceDetected = true;
        },
        publish: (event) => {
          this.subscribers.forEach((subscriber) => subscriber(event));
        },
      },
      consequences,
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
  handleIntent = async (rawIntent: unknown): Promise<CampaignIntentResult> => {
    // Step 1 — closed check.
    if (this.closed) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'session-closed',
      };
    }

    // Step 2 — malformed check (zod parse at the boundary, task 1.3).
    const intent = parseCampaignIntent(rawIntent);
    if (intent === null) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'malformed-intent',
      };
    }

    // Step 3 — validate against CURRENT authoritative state. A rejected
    // intent mutates nothing — `validation` simply carries no events.
    // `handleIntent` is the GUEST-facing path (the host uses
    // `applyHostIntent`), so the derived events are attributed to the
    // guest author.
    const ts = nowIso();
    const validation: CampaignIntentValidation = validateCampaignIntent(
      intent,
      this.state,
      this.guestAuthor(intent),
      ts,
    );
    if (!validation.ok) {
      return validation;
    }

    // Steps 4-6 — apply, append, broadcast through the single commit
    // path so host-driven and guest-driven events share one ordering.
    const committed = await this.commitEvents(validation.events);
    return { ok: true, events: committed };
  };

  /**
   * Convenience for the host's OWN actions (e.g. a host UI clicking
   * "advance day"). Takes an `ICampaignIntent` directly — it is already
   * trusted, so the malformed-check is skipped, but it still runs the
   * authoritative-state validation so a host action that breaks the
   * ledger invariant (over-spend) is rejected just like a guest's.
   */
  applyHostIntent = async (
    intent: ICampaignIntent,
  ): Promise<CampaignIntentResult> => {
    if (this.closed) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'session-closed',
      };
    }
    const ts = nowIso();
    const validation = validateCampaignIntent(
      intent,
      this.state,
      this.hostPlayerId,
      ts,
    );
    if (!validation.ok) {
      return validation;
    }
    const committed = await this.commitEvents(validation.events);
    return { ok: true, events: committed };
  };

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
  ): Promise<CampaignIntentResult> => {
    if (this.closed) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'session-closed',
      };
    }
    if (!(value > 0) || !Number.isFinite(value)) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'malformed-intent',
      };
    }
    void reason;
    const committed = await this.commitEvents([
      {
        type: 'SalvageAllocated',
        campaignId: this.campaignId,
        authorPlayerId: this.hostPlayerId,
        ts: nowIso(),
        // Post-battle salvage is a shared ledger fact.
        scope: 'campaign',
        payload: {
          value,
          poolRemaining: this.state.salvagePool + value,
        },
      },
    ]);
    return { ok: true, events: committed };
  };

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
    change: 'added' | 'removed' | 'repaired',
    unit: {
      readonly unitId: string;
      readonly designation: string;
      readonly status: 'operational' | 'damaged' | 'destroyed';
    },
    intentTag: string,
  ): Promise<CampaignIntentResult> => {
    if (this.closed) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'session-closed',
      };
    }
    if (campaignId !== this.campaignId) {
      return {
        ok: false,
        code: INVALID_CAMPAIGN_INTENT,
        reason: 'campaign-mismatch',
      };
    }
    void intentTag;
    const committed = await this.commitEvents([
      {
        type: 'RosterUnitChanged',
        campaignId: this.campaignId,
        authorPlayerId: this.hostPlayerId,
        ts: nowIso(),
        // Roster mutations are shared ledger facts.
        scope: 'campaign',
        payload: { change, unit },
      },
    ]);
    return { ok: true, events: committed };
  };

  /**
   * Build the typed error envelope for a rejected intent, carrying the
   * originating `intentId` for guest-side correlation. The transport
   * layer (`CampaignSyncSession`) sends this to the originating client.
   */
  static toIntentError(
    intentId: string,
    rejection: Extract<CampaignIntentResult, { ok: false }>,
  ): ICampaignIntentError {
    return {
      ok: false,
      code: rejection.code,
      reason: rejection.reason,
      intentId,
    };
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
  ): Promise<readonly ICampaignEvent[]> => {
    return this.commitEvents(events);
  };

  private async commitEvents(
    events: readonly UnsequencedCampaignEvent[],
  ): Promise<readonly ICampaignEvent[]> {
    if (this.eventStore.appendCommandBatch) {
      return this.commitEventsAsBatch(
        events,
        this.eventStore.appendCommandBatch,
      );
    }
    const committed: ICampaignEvent[] = [];
    for (const unsequenced of events) {
      const sequence = await this.log.nextSequence();
      // Re-attach the host-assigned sequence. The spread of one
      // unsequenced union member plus `sequence` is exactly the
      // corresponding `ICampaignEvent` variant; TS cannot correlate the
      // spread across the union, so the assertion makes the (sound)
      // intent explicit at this single chokepoint.
      const event = freezeCampaignEvent({
        ...unsequenced,
        sequence,
      } as ICampaignEvent);
      // Append FIRST — a sequence collision rejects here and the host's
      // authoritative state is left untouched (no partial commit).
      await this.log.append(event);
      // Advance authoritative state through the SHARED reducer — the
      // same function the guest mirror uses, so host and guest can
      // never drift.
      this.state = applyCampaignEvent(this.state, event);
      // Broadcast to every connected client.
      this.subscribers.forEach((subscriber) => {
        subscriber(event);
      });
      committed.push(event);
    }
    return committed;
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
  private async commitEventsAsBatch(
    events: readonly UnsequencedCampaignEvent[],
    appendCommandBatch: NonNullable<ICampaignEventStore['appendCommandBatch']>,
  ): Promise<readonly ICampaignEvent[]> {
    const base = await this.log.nextSequence();
    const sequenced = events.map((unsequenced, index) =>
      freezeCampaignEvent({
        ...unsequenced,
        sequence: base + index,
      } as ICampaignEvent),
    );
    // Derive the expected post-state on a scratch projection — the live
    // state is untouched until the batch is durably committed.
    let expected = this.state;
    for (const event of sequenced) {
      expected = applyCampaignEvent(expected, event);
    }
    const expectedDigest = computeCampaignStateDigest(expected);
    const result = await appendCommandBatch(this.campaignId, {
      // Deterministic per position: a retried identical batch replays the
      // journal's cached commit; a racing different batch at the same
      // head loses with a typed conflict and nothing applied.
      commandId: `campaign-cmd:${this.campaignId}:${base}`,
      events: sequenced,
      expectedPostStateDigest: expectedDigest,
    });
    if (result.kind !== 'committed') {
      // Single-writer host: a lost race or duplicate command here is a
      // server bug, surfaced exactly like the legacy path's collision.
      throw new CampaignEventSequenceCollisionError(this.campaignId, base);
    }
    // Verify-after-apply: re-apply the COMMITTED batch to the live
    // projection and compare digests. Inequality means the projection
    // can no longer be trusted (nondeterministic reducer, concurrent
    // mutation): publish no success, rebuild from the journal, keep the
    // committed batch untouched.
    let applied = this.state;
    for (const event of sequenced) {
      applied = applyCampaignEvent(applied, event);
    }
    const appliedDigest = computeCampaignStateDigest(applied);
    if (appliedDigest !== expectedDigest) {
      this.divergenceDetected = true;
      this.state = await this.log.reconstructState();
      throw new CampaignProjectionDivergenceError(
        this.campaignId,
        expectedDigest,
        appliedDigest,
      );
    }
    this.state = applied;
    for (const event of sequenced) {
      this.subscribers.forEach((subscriber) => {
        subscriber(event);
      });
    }
    return sequenced;
  }

  /**
   * The `authorPlayerId` to stamp on a guest-driven event. CO1 has a
   * single host/guest pair and the campaign intent carries no player
   * id, so the guest's events are attributed to a stable
   * `guest:<campaignId>` author. CO2 threads the real guest player id
   * through the GM intent surface.
   */
  private guestAuthor(intent: ICampaignIntent): string {
    return `guest:${intent.campaignId}`;
  }
}
