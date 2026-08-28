/**
 * CampaignSyncSession — campaign sync session lifecycle (CO1).
 *
 * Wraps a `CampaignMatchHost` with the join / resync / disconnect
 * lifecycle the guest mirror needs (design D6). It is the campaign-tier
 * analogue of the combat replay path (`ReplayStart` / `ReplayChunk` /
 * `ReplayEnd` followed by live `Event`s):
 *
 *   - `open` registers the campaign for sharing and issues or adopts a
 *     6-char room code (the `multiplayer-server` alphabet, excluding
 *     I/O/0/1).
 *   - `joinGuest` accepts a guest with the room code, sends a
 *     `CampaignSnapshotPublished` baseline, streams the campaign event
 *     log from sequence 0, then delivers live events as the host
 *     commits them.
 *   - `resyncGuest` reconnects a guest and streams ONLY the missing
 *     tail; when the gap is larger than `RESYNC_SNAPSHOT_GAP` the host
 *     sends a fresh snapshot and resumes live streaming from there.
 *   - `hostDisconnected` pauses the session — the guest mirror is
 *     frozen and stays read-only; no campaign-tier host migration.
 *   - `evaluateScenarioLaunch` decides whether PROGRESSION (not
 *     delivery) may happen, by checking that every retained participant
 *     has acknowledged the campaign's current revision, and naming the
 *     ones who have not.
 *
 * Socket wiring lives in `bindCampaignSyncConnection`: it passes the
 * verified playerId into `joinMember` / `joinGuest` / `resyncGuest`,
 * records `CampaignAck` frames via `noteParticipantAcknowledged`, and
 * consults `evaluateScenarioLaunch` before committing `AdvanceDay`.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D6)
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 *       (Campaign Progression Requires Convergence)
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { generateRoomCode, normalizeRoomCode } from '@/lib/p2p/roomCodes';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { CampaignMatchHost } from './CampaignMatchHost';

/**
 * The resync gap threshold. When a reconnecting guest is more than this
 * many events behind the current log, the host sends a fresh
 * `CampaignSnapshotPublished` baseline instead of streaming the whole
 * tail (design D6 / spec scenario "Large-gap resync receives a fresh
 * snapshot"). Sized small so the contract is easy to exercise in tests;
 * a production deploy can tune it.
 */
export const RESYNC_SNAPSHOT_GAP = 50;

/**
 * A guest connection's event sink. The session pushes campaign events
 * (replay tail + live) into it. The WebSocket upgrade handler wires one
 * sink per socket; tests wire a buffer.
 */
export type CampaignGuestSink = (event: ICampaignEvent) => void;

/** The outcome of a guest join. */
export interface ICampaignJoinResult {
  /** True when the room code resolved and the join was accepted. */
  readonly ok: boolean;
  /**
   * The baseline + replay events delivered to the guest, in ascending
   * sequence order. Empty when `ok` is false. The first event is always
   * a `CampaignSnapshotPublished` baseline.
   */
  readonly delivered: readonly ICampaignEvent[];
  /** Unsubscribe handle for the guest's live-event subscription. */
  readonly disconnect: () => void;
}

/**
 * A retained participant's place on the campaign's revision line — the
 * highest campaign revision they have reported applying.
 */
export interface ICampaignParticipantConvergence {
  readonly participantId: string;
  readonly acknowledgedRevision: number;
}

/**
 * The one reason this gate refuses a scenario launch. A named constant
 * rather than a free string so the surface that SHOWS the reason cannot
 * drift from the surface that decides it.
 */
export const PROGRESSION_BLOCKED_BEHIND = 'participants-behind' as const;

/**
 * The launch gate's answer. The refusal carries WHO is behind and how
 * far, not merely that someone is: a bare `false` leaves the GM with a
 * disabled button and no way to find out what they are waiting for.
 */
export type CampaignProgressionGate =
  | { readonly ok: true; readonly requiredRevision: number }
  | {
      readonly ok: false;
      readonly reason: typeof PROGRESSION_BLOCKED_BEHIND;
      readonly requiredRevision: number;
      readonly behind: readonly ICampaignParticipantConvergence[];
    };

/** What recording a participant's acknowledgement did. */
export type CampaignAckOutcome =
  | 'applied'
  | 'stale'
  | 'unknown-participant'
  | 'ahead-of-delivery'
  | 'invalid-revision';

/**
 * What the session knows about one retained participant.
 *
 * `delivered` is the highest revision this session has actually HANDED
 * them; `acknowledged` is the highest they have reported applying. Held
 * in ONE record rather than in two maps so they cannot be seeded
 * independently or drift apart.
 *
 * Invariant: `acknowledged <= delivered <= the committed head`. The
 * first half is enforced by the ack guards; the second by the fact that
 * the only thing which raises `delivered` is a frame this session
 * pushed, and every such frame is already committed.
 */
interface IRetainedParticipant {
  readonly acknowledged: number;
  readonly delivered: number;
}

/** The outcome of a guest resync. */
export interface ICampaignResyncResult {
  /** True when the resync was accepted. */
  readonly ok: boolean;
  /**
   * The events streamed to the guest to catch it up — either the
   * missing tail, or a fresh snapshot followed by the post-snapshot
   * tail when the gap was too large.
   */
  readonly delivered: readonly ICampaignEvent[];
  /** True when a fresh snapshot was sent (large-gap path). */
  readonly snapshotted: boolean;
  /** Unsubscribe handle for the guest's live-event subscription. */
  readonly disconnect: () => void;
}

export class CampaignSyncSession {
  private readonly host: CampaignMatchHost;
  private readonly matchId: string;
  private roomCode: string | null = null;
  private paused = false;
  /**
   * How many GM connections are currently attached.
   *
   * A COUNT rather than a flag, because the GM can hold more than one
   * at a time - a second tab, or a reconnect that lands before the old
   * socket's close is processed. With a flag, closing either one paused
   * a session the GM was still sitting in.
   */
  private gmConnections = 0;
  /**
   * Whether `open` has run. Tracked separately from `roomCode` because
   * an open session may legitimately hold no invite, and `roomCode`
   * alone cannot tell "opened without one" from "not opened yet" —
   * conflating them would re-run `open` and mint a fresh code for a
   * campaign whose invite had expired.
   */
  private opened = false;
  /**
   * Retained participants, keyed to what each has been sent and what
   * each has acknowledged applying.
   *
   * A MAP rather than a set of converged/not flags, because the gate has
   * to be able to NAME who it is waiting for. It is also the retained
   * set itself: a participant is in here because they were admitted, and
   * an audited GM removal is what takes them out.
   *
   * NOTHING REMOVES ANYONE TODAY — 9.3's audited-removal command does
   * not exist. That is not merely incomplete, it is a precondition on
   * wiring this gate: a participant who leaves and never returns stays
   * retained and behind, so every subsequent launch is refused for the
   * life of the process. Removal has to land before, or with, the
   * socket wiring — never after it.
   *
   * Held in memory, so a rebuilt session starts with it empty and blocks
   * nobody until participants rejoin. That is the honest statement of
   * what this process knows — a durable retained roster is 9.1's schema
   * work, and a stored roster that disagreed with who is actually here
   * would block launches on ghosts.
   */
  private readonly retained = new Map<string, IRetainedParticipant>();

  constructor(
    host: CampaignMatchHost,
    options: { readonly matchId?: string } = {},
  ) {
    this.host = host;
    this.matchId = options.matchId ?? host.campaignId;
  }

  /**
   * Open the campaign for co-op. Commits the baseline snapshot through
   * the host, registers the campaign for sharing, and issues or adopts
   * a 6-char room code. Returns the issued code. Idempotent — a second
   * `open` returns the already-issued code.
   */
  open = async (roomCode?: string): Promise<string> => {
    if (this.roomCode !== null) {
      return this.roomCode;
    }
    await this.ensureHostOpen();
    // Room code: same alphabet as `multiplayer-server` (I/O/0/1
    // excluded - `generateRoomCode` already enforces it).
    this.roomCode = roomCode ? normalizeRoomCode(roomCode) : generateRoomCode();
    return this.roomCode;
  };

  /**
   * Open a campaign whose invite has ALREADY expired - the state a
   * campaign is in after its match launched and the store cleared the
   * code (`clearRoomCode`).
   *
   * Deliberately a separate entry point rather than a nullable argument
   * to `open`, because `open` always ends with a LIVE invite: minting
   * one here would let rehydrating a launched campaign re-open the door
   * that launching closed. Members still join through `joinMember`;
   * newcomers presenting the old code do not.
   */
  openWithoutInvite = async (): Promise<void> => {
    await this.ensureHostOpen();
  };

  /**
   * Commit the baseline `CampaignSnapshotPublished` as sequence 0 so
   * the log always opens with a replayable baseline. Idempotent, and
   * tracked by `opened` rather than by `roomCode` so an invite-less
   * session still counts as open.
   */
  private ensureHostOpen = async (): Promise<void> => {
    if (this.opened) return;
    await this.host.open();
    this.opened = true;
  };

  /** The issued room code, or `null` before `open`. */
  getRoomCode = (): string | null => {
    return this.roomCode;
  };

  /** Whether the session is paused (host disconnected). */
  isPaused = (): boolean => {
    return this.paused;
  };

  /**
   * The GM's connection arrived. Clears a pause left by their previous
   * one dropping.
   *
   * Only the GM's own reconnection resumes: the caller decides who this
   * is by comparing the connection's VERIFIED principal to the
   * registered host, so a tactical player cannot reach this by claiming
   * to be one.
   */
  noteGmConnected = (): void => {
    this.gmConnections += 1;
    this.paused = false;
  };

  /**
   * The GM's connection dropped. The session pauses; nobody is promoted.
   *
   * Distinct from `hostDisconnected`, which is TERMINAL - it closes the
   * host, so nothing can resume afterwards. This is the recoverable
   * case: authority stays with the absent GM and waits for them, which
   * is the whole point of not promoting anyone.
   *
   * A no-op when no GM connection is attached, so a stray close from a
   * connection that never held GM authority cannot pause the session.
   */
  /**
   * Pause a session that is being rebuilt rather than created - after a
   * restart, or after the registry evicted it.
   *
   * This is what makes the GM-loss pause survive a process restart, and
   * it does so WITHOUT a stored flag. A stored flag can disagree with
   * reality; this cannot, because it states the reality directly: a
   * rebuilt session has no GM connection attached, so the GM is absent,
   * so the campaign is paused. Their next connection clears it.
   *
   * A freshly CREATED session does not call this. The GM is the one
   * creating it and their socket follows immediately, and starting that
   * case paused would refuse a guest who arrives in between.
   */
  pauseUntilGmReturns = (): void => {
    this.paused = true;
  };

  noteGmDisconnected = (): void => {
    if (this.gmConnections === 0) return;
    this.gmConnections -= 1;
    // Paused only when the LAST one goes. The GM is absent when none of
    // their connections remain, not when one of several closes.
    if (this.gmConnections === 0) this.paused = true;
  };

  /**
   * Accept a guest joining with a room code. On success the session:
   *   1. delivers a fresh `CampaignSnapshotPublished` baseline,
   *   2. streams the campaign event log from sequence 0,
   *   3. subscribes the guest's sink for live events.
   *
   * The baseline is delivered FIRST so a guest can seed its mirror
   * before any incremental event lands (spec scenario "Guest join
   * receives a baseline then the log").
   *
   * A wrong room code rejects with `ok: false` and delivers nothing.
   */
  joinGuest = async (
    roomCode: string,
    sink: CampaignGuestSink,
    participantId?: string,
  ): Promise<ICampaignJoinResult> => {
    if (
      this.roomCode === null ||
      normalizeRoomCode(roomCode) !== this.roomCode
    ) {
      return { ok: false, delivered: [], disconnect: () => {} };
    }
    return this.joinMember(sink, participantId);
  };

  /**
   * Admit a participant whose right to be here was established
   * elsewhere — a durable campaign-session membership — and hydrate
   * them exactly as an invited guest.
   *
   * Separate from `joinGuest` because the invite and the membership
   * answer different questions. Expressing the member path in terms of
   * the invite made expiring the invite lock out the people already
   * inside, which is the opposite of what expiry is for.
   *
   * Refuses on a session that never opened, or one paused by the host
   * leaving: there is no live campaign to hydrate from, and that is a
   * different answer from "you are not a member".
   *
   * `participantId` — when the caller has PROVED who this is — retains
   * the participant for the progression gate, and makes this connection
   * the thing that records what they were delivered. Omitting it
   * hydrates exactly as before and retains nobody, so an unidentified
   * sink can never become something a launch waits on.
   */
  joinMember = async (
    sink: CampaignGuestSink,
    participantId?: string,
  ): Promise<ICampaignJoinResult> => {
    if (!this.opened || this.paused) {
      return { ok: false, delivered: [], disconnect: () => {} };
    }

    const delivered: ICampaignEvent[] = [];
    const buffered: ICampaignEvent[] = [];
    const liveUnsub = this.host.subscribe((event) => buffered.push(event));
    const revision = await this.currentRevision();
    const baseline = this.buildBaselineEvent(revision);
    delivered.push(baseline);
    sink(baseline);

    // The highest revision this join actually handed the participant.
    // The baseline IS `revision`; the tail can carry more when the host
    // commits while we are reading it.
    let deliveredRevision = revision;
    const seen = new Set<number>();
    const tail = await this.host.getEventLog().getCampaignEvents(revision + 1);
    for (const event of [...tail, ...buffered]) {
      if (event.sequence <= revision || seen.has(event.sequence)) continue;
      seen.add(event.sequence);
      delivered.push(event);
      sink(event);
      if (event.sequence > deliveredRevision)
        deliveredRevision = event.sequence;
    }
    liveUnsub();

    if (participantId !== undefined) {
      // A member is converged the moment they are hydrated: the baseline
      // they were handed IS `revision`, so seeding here rather than at
      // their first acknowledgement stops someone who just walked in from
      // blocking a launch they are not behind on. AFTER the frames rather
      // than before them, so a sink that throws part-way leaves nobody
      // retained-and-converged for a hydration that never completed.
      //
      // Plain assignment, not a max: a re-join reads the CURRENT head
      // and the head never falls, so rehydration can only raise this.
      // Guarding a fall that cannot happen made a bad value permanent.
      this.retained.set(participantId, {
        acknowledged: revision,
        delivered: deliveredRevision,
      });
    }

    const unsubscribe = this.host.subscribe((event) => {
      sink(event);
      // Delivery is recorded where delivery HAPPENS, and only after the
      // sink took the frame. This is what lets the ack guard refuse a
      // claim about a frame that was never sent.
      if (participantId !== undefined) {
        this.noteDelivered(participantId, event.sequence);
      }
    });

    return { ok: true, delivered, disconnect: unsubscribe };
  };

  /**
   * Resync a reconnecting guest from its last-received sequence.
   *
   *   - Small gap: stream only events with `sequence > lastSeq` (spec
   *     scenario "Guest resync streams only the missing tail").
   *   - Large gap (`> RESYNC_SNAPSHOT_GAP` events behind): send a fresh
   *     `CampaignSnapshotPublished` baseline, then resume live streaming
   *     from after it (spec scenario "Large-gap resync receives a fresh
   *     snapshot").
   *
   * `participantId` — when the caller has PROVED who this is — raises
   * their delivered watermark for the frames this path actually streams.
   * Omitting it leaves the watermark where the previous connection
   * stopped, so an acknowledgement of the tail is refused
   * `ahead-of-delivery`. This path does not reseed `acknowledged`: a
   * reconnecting participant stays behind until they ack the tail.
   */
  resyncGuest = async (
    lastSeq: number,
    sink: CampaignGuestSink,
    participantId?: string,
  ): Promise<ICampaignResyncResult> => {
    if (this.roomCode === null) {
      return {
        ok: false,
        delivered: [],
        snapshotted: false,
        disconnect: () => {},
      };
    }

    const highest = await this.host.getEventLog().nextSequence();
    const gap = highest - 1 - lastSeq;
    const delivered: ICampaignEvent[] = [];
    const liveSink: CampaignGuestSink = (event) => {
      sink(event);
      if (participantId !== undefined) {
        this.noteDelivered(participantId, event.sequence);
      }
    };

    if (gap > RESYNC_SNAPSHOT_GAP) {
      // Large-gap path — a fresh baseline is cheaper than the tail.
      const revision = Math.max(0, highest - 1);
      const baseline = this.buildBaselineEvent(revision);
      delivered.push(baseline);
      sink(baseline);
      if (participantId !== undefined) {
        this.noteDelivered(participantId, revision);
      }
      const unsubscribe = this.host.subscribe(liveSink);
      return {
        ok: true,
        delivered,
        snapshotted: true,
        disconnect: unsubscribe,
      };
    }

    // Small-gap path — stream only the missing tail (sequence > lastSeq).
    const tail = await this.host.getEventLog().getCampaignEvents(lastSeq + 1);
    for (const event of tail) {
      delivered.push(event);
      sink(event);
      if (participantId !== undefined) {
        this.noteDelivered(participantId, event.sequence);
      }
    }
    const unsubscribe = this.host.subscribe(liveSink);
    return { ok: true, delivered, snapshotted: false, disconnect: unsubscribe };
  };

  /**
   * Raise a retained participant's delivered watermark. Called after a
   * frame is handed to an identified sink from `joinMember` or
   * `resyncGuest`.
   *
   * A no-op for someone not retained: an unidentified sink and a departed
   * participant both have no ledger row to raise, and inventing one here
   * would put somebody into the set a launch waits on without anybody
   * having admitted them.
   *
   * No monotonic clamp, because a fall cannot happen: the host commits
   * sequences in ascending order and this only ever sees the sequence it
   * was just handed, so a second connection for the same participant
   * re-sets the same number rather than a lower one. A clamp here would
   * be unreachable code that no test could ever turn red — which is the
   * shape of the `Math.max` this file used to carry.
   */
  private noteDelivered = (participantId: string, sequence: number): void => {
    const entry = this.retained.get(participantId);
    if (entry === undefined) return;
    this.retained.set(participantId, { ...entry, delivered: sequence });
  };

  /**
   * Record that a retained participant has applied campaign revision
   * `revision`. Monotonic — a late frame from a superseded connection
   * cannot un-converge a participant who has already caught up.
   *
   * Refused in three cases, each of which would otherwise turn the
   * launch gate into advice:
   *
   *   - `unknown-participant` — the caller is not in the retained set, so
   *     a stranger cannot add themselves to the set a launch waits on.
   *   - `invalid-revision` — the claim is not a revision number at all.
   *     `NaN` is the case that matters: every comparison against it is
   *     false, so without this check it slipped BOTH remaining guards,
   *     was stored, and then compared false against the required
   *     revision forever — a participant who had acknowledged nothing
   *     read as permanently converged, and no rejoin could repair it.
   *   - `ahead-of-delivery` — the claim runs past the highest revision
   *     this session actually HANDED that participant.
   *
   * The ceiling is the per-participant watermark, not the commit head,
   * and the name is honest again because of it. Against the head — which
   * is what it checked while still called `ahead-of-delivery` — a
   * participant this session had sent nothing at all converged by naming
   * a number every client knows. Delivery is the strongest fact a server
   * has: it can witness what it sent, never what a client applied. The
   * watermark is always at or below the head, so this subsumes the old
   * check rather than sitting beside it.
   *
   * The caller is responsible for having PROVED the participant's
   * identity first; this records a cursor, it does not authorize one.
   */
  noteParticipantAcknowledged = (
    participantId: string,
    revision: number,
  ): CampaignAckOutcome => {
    const entry = this.retained.get(participantId);
    if (entry === undefined) return 'unknown-participant';
    if (!Number.isInteger(revision) || revision < 0) return 'invalid-revision';
    if (revision > entry.delivered) return 'ahead-of-delivery';
    if (revision <= entry.acknowledged) return 'stale';
    this.retained.set(participantId, { ...entry, acknowledged: revision });
    return 'applied';
  };

  /**
   * Decide whether the campaign may progress to the next scenario.
   *
   * Committed events keep flowing to whoever can take them — this gate
   * is deliberately not consulted anywhere on the delivery path — but a
   * scenario launch requires every RETAINED participant to have reached
   * the campaign's current revision, and the refusal names them so the
   * reason is showable rather than a disabled button with no
   * explanation.
   *
   * What actually blocks is narrower than "reconnecting or behind": a
   * participant who reconnects through `joinMember` is re-hydrated at
   * the current head and so converges with no acknowledgement at all.
   * What blocks is a participant who is ABSENT while the campaign moves
   * on, or present and short of the head.
   *
   * This answers CONVERGENCE ONLY. It does not consult `paused` or
   * `opened`, so it returns `ok` on a session whose GM has gone — the
   * GM-loss refusal is its own guard (`refusedWhilePaused` in
   * `bindCampaignSyncConnection.ts`, umbrella 9.3) and duplicating it
   * here would give two places to keep in step. A caller must apply
   * BOTH.
   *
   * The required revision is read LIVE from the log head rather than
   * cached, for the same reason `getParticipationRecords` filters
   * against current roster state: a stored copy is a claim that has to
   * be kept in step with reality, and this states the reality directly.
   *
   * WIRING — the revision the acknowledgement carries must live in the
   * log-head number space this gate reads (`nextSequence() - 1`). The
   * two sources that do are the baseline event's `payload.revision`
   * handed back by `joinMember`, and the `sequence` of each campaign
   * event the client then applies. `ICampaignHostRegistryEntry.revision`
   * — and so the `revision` captured by
   * `captureCampaignConnectionBaseline` — is NOT one: it is sampled once
   * at registration and only `advanceRevision` moves it, which no
   * production code calls (`campaignParticipationFreshness.ts` records
   * the same fact for participation admission). Feeding the gate that
   * number refuses every launch from the first committed event onward.
   */
  evaluateScenarioLaunch = async (): Promise<CampaignProgressionGate> => {
    const requiredRevision = await this.currentRevision();
    const behind: ICampaignParticipantConvergence[] = [];
    this.retained.forEach((entry, participantId) => {
      if (entry.acknowledged < requiredRevision) {
        behind.push({
          participantId,
          acknowledgedRevision: entry.acknowledged,
        });
      }
    });
    if (behind.length === 0) return { ok: true, requiredRevision };
    return {
      ok: false,
      reason: PROGRESSION_BLOCKED_BEHIND,
      requiredRevision,
      behind,
    };
  };

  /**
   * The highest sequence the host has committed — the campaign's current
   * revision. `nextSequence` is the NEXT number to be handed out, so the
   * committed head is one below it, floored at 0 for a log that has not
   * opened yet.
   */
  private currentRevision = async (): Promise<number> => {
    return Math.max(0, (await this.host.getEventLog().nextSequence()) - 1);
  };

  /**
   * The host disconnected. The session pauses: the room code stops
   * resolving for new joins, the host is closed (rejecting any further
   * intent with `session-closed`), and the guest mirror — already
   * read-only — is frozen. No campaign-tier host migration (design D6).
   */
  hostDisconnected = (): void => {
    this.paused = true;
    this.roomCode = null;
    this.host.close();
  };

  /**
   * Build the framing `CampaignSnapshotPublished` event delivered as a
   * guest's baseline. It carries the host's current authoritative
   * state. The framing `sequence` is `-1` so it is unambiguously a
   * baseline frame and can never collide with a real log event
   * (sequence 0+) — the guest's `applySnapshot` adopts the payload
   * wholesale regardless of sequence.
   */
  private buildBaselineEvent(
    revision: number,
  ): ICampaignEvent<'CampaignSnapshotPublished'> {
    return freezeCampaignEvent({
      type: 'CampaignSnapshotPublished',
      sequence: -1,
      campaignId: this.host.campaignId,
      ts: nowIso(),
      authorPlayerId: this.host.getHostPlayerId(),
      // Delivery baseline of the shared ledger; filtered snapshots are task 3.4.
      scope: 'campaign',
      payload: {
        ...this.host.buildSnapshotPayload(),
        matchId: this.matchId,
        revision,
      },
    });
  }
}
