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
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D6)
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

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
  private roomCode: string | null = null;
  private paused = false;

  constructor(host: CampaignMatchHost) {
    this.host = host;
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
    // The host commits the baseline `CampaignSnapshotPublished` as
    // sequence 0 so the log always opens with a replayable baseline.
    await this.host.open();
    // Room code: same alphabet as `multiplayer-server` (I/O/0/1
    // excluded — `generateRoomCode` already enforces it).
    this.roomCode = roomCode ? normalizeRoomCode(roomCode) : generateRoomCode();
    return this.roomCode;
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
  ): Promise<ICampaignJoinResult> => {
    if (
      this.roomCode === null ||
      normalizeRoomCode(roomCode) !== this.roomCode
    ) {
      return { ok: false, delivered: [], disconnect: () => {} };
    }

    const delivered: ICampaignEvent[] = [];

    // Step 1 — the baseline snapshot. Built from the host's CURRENT
    // authoritative state and stamped as sequence -1 framing so it is
    // unambiguously the baseline and never collides with a log event.
    const baseline = this.buildBaselineEvent();
    delivered.push(baseline);
    sink(baseline);

    // Step 2 — stream the campaign event log from sequence 0.
    const log = await this.host.getEventLog().getCampaignEvents(0);
    for (const event of log) {
      delivered.push(event);
      sink(event);
    }

    // Step 3 — live subscription. Every event the host commits from now
    // on is pushed straight to the guest's sink.
    const unsubscribe = this.host.subscribe((event) => {
      sink(event);
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
   */
  resyncGuest = async (
    lastSeq: number,
    sink: CampaignGuestSink,
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

    if (gap > RESYNC_SNAPSHOT_GAP) {
      // Large-gap path — a fresh baseline is cheaper than the tail.
      const baseline = this.buildBaselineEvent();
      delivered.push(baseline);
      sink(baseline);
      const unsubscribe = this.host.subscribe(sink);
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
    }
    const unsubscribe = this.host.subscribe(sink);
    return { ok: true, delivered, snapshotted: false, disconnect: unsubscribe };
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
  private buildBaselineEvent(): ICampaignEvent<'CampaignSnapshotPublished'> {
    return {
      type: 'CampaignSnapshotPublished',
      sequence: -1,
      campaignId: this.host.campaignId,
      ts: nowIso(),
      authorPlayerId: this.host.getHostPlayerId(),
      payload: this.host.buildSnapshotPayload(),
    };
  }
}
