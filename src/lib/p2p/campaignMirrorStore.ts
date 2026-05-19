/**
 * Campaign Mirror Store — the guest's read-only campaign mirror (CO1).
 *
 * The campaign-tier analogue of `src/lib/p2p/mirrorSession.ts`. In a
 * shared co-op campaign the guest does NOT own campaign state — the host
 * does (design D1). The guest runs a strict read-only mirror, advanced
 * solely by host-broadcast `ICampaignEvent`s through the single
 * `applyCampaignEvent` reducer.
 *
 * The "guest cannot append" contract is enforced exactly like
 * `mirrorSession`'s `describeMirrorAppendRejection` /
 * `assertMirrorAppendForbidden`: any local code path that tries to
 * mutate campaign state on the guest fails loudly with a structured
 * rejection. A guest "spend" button must instead send an
 * `ICampaignIntent` to the host and wait for the resulting broadcast
 * event — CO1 ships the transport; CO2 wires the button.
 *
 * Mirror identification mirrors `isMirrorSession`: the campaign is a
 * mirror when a host peer is recorded, a local guest peer is recorded,
 * and they differ. A solo campaign records no host peer and is never a
 * mirror — its local mutations proceed normally.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D5)
 */

import { create } from 'zustand';

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';

// =============================================================================
// Mirror peer identity
// =============================================================================

/**
 * The peer identity that classifies a campaign as a mirror. Recorded on
 * the guest when it joins a shared campaign; absent for a solo campaign.
 */
export interface ICampaignMirrorPeers {
  /** The host peer's id (the campaign owner / authoritative writer). */
  readonly hostPeerId: string;
  /** The local guest peer's id. */
  readonly guestPeerId: string;
}

/**
 * True when the local peer is the GUEST in a shared campaign — a host
 * peer is recorded, a guest peer is recorded, they differ, and the
 * local peer is the guest. A solo campaign (no peers recorded) returns
 * false, so this helper is safe to call on any campaign.
 *
 * The campaign-tier analogue of `isMirrorSession`.
 */
export function isCampaignMirror(
  peers: ICampaignMirrorPeers | null | undefined,
  localPeerId: string | null | undefined,
): boolean {
  if (!peers || !localPeerId) return false;
  if (!peers.hostPeerId || !peers.guestPeerId) return false;
  if (peers.hostPeerId === peers.guestPeerId) return false;
  if (peers.hostPeerId === localPeerId) return false;
  return peers.guestPeerId === localPeerId;
}

// =============================================================================
// Mirror append guard
// =============================================================================

/**
 * Reasons a campaign mirror rejects a local append/mutation attempt.
 * Stable strings for tests and the guest UI's `peer-rejected` surface.
 */
export type CampaignMirrorRejection = 'mirror-readonly' | 'no-campaign';

/**
 * Thrown by `assertCampaignMirrorWritable` when a local code path tries
 * to mutate a guest mirror directly. Carries the structured `reason` so
 * a consumer can `try / catch` and surface a `peer-rejected` toast
 * without leaking unstructured strings. The campaign-tier analogue of
 * `MirrorAppendForbiddenError`.
 */
export class CampaignMirrorForbiddenError extends Error {
  readonly reason: CampaignMirrorRejection;

  constructor(reason: CampaignMirrorRejection, message?: string) {
    super(message ?? `Campaign mirror cannot be mutated locally: ${reason}`);
    this.name = 'CampaignMirrorForbiddenError';
    this.reason = reason;
  }
}

/**
 * Decision helper: returns `null` when the local peer is allowed to
 * mutate campaign state (solo campaign, or the host), or a structured
 * rejection when the mutation would corrupt a guest mirror. Read-only —
 * it does not throw, so the UI can swap a "Spend" button for "Send to
 * host" rather than crash.
 *
 * The campaign-tier analogue of `describeMirrorAppendRejection`.
 */
export function describeCampaignMirrorRejection(input: {
  readonly campaign: ICampaignAuthoritativeState | null;
  readonly peers: ICampaignMirrorPeers | null | undefined;
  readonly localPeerId: string | null | undefined;
}): CampaignMirrorRejection | null {
  if (!input.campaign) return 'no-campaign';
  if (!isCampaignMirror(input.peers, input.localPeerId)) return null;
  return 'mirror-readonly';
}

/**
 * Hard guard for any local campaign-mutation path on a co-op campaign.
 * Call this at the top of a local commit path; it throws
 * `CampaignMirrorForbiddenError` when the campaign is a guest mirror so
 * the mutation fails loudly (spec scenario "Guest-side local mutation
 * is rejected"). A solo campaign passes the guard silently (spec
 * scenario "Solo campaign is not a mirror").
 *
 * The campaign-tier analogue of `assertMirrorAppendForbidden`.
 */
export function assertCampaignMirrorWritable(input: {
  readonly campaign: ICampaignAuthoritativeState | null;
  readonly peers: ICampaignMirrorPeers | null | undefined;
  readonly localPeerId: string | null | undefined;
}): void {
  const reason = describeCampaignMirrorRejection(input);
  if (reason !== null) {
    throw new CampaignMirrorForbiddenError(reason);
  }
}

// =============================================================================
// Mirror store
// =============================================================================

interface CampaignMirrorState {
  /**
   * The mirrored campaign state, or `null` before the baseline
   * snapshot has arrived. A guest renders a "joining campaign…" state
   * in that window.
   */
  campaign: ICampaignAuthoritativeState | null;
  /** The host/guest peer identity, or `null` for a solo campaign. */
  peers: ICampaignMirrorPeers | null;
  /** The local peer id — the guest's own id when this is a mirror. */
  localPeerId: string | null;
  /** Highest event sequence applied — drives resync from the last seq. */
  lastSequence: number;
  /**
   * True when the host has disconnected: the mirror is frozen (it is
   * already read-only) and the guest UI shows a paused banner (design
   * D6 / spec scenario "Host disconnect pauses the session").
   */
  paused: boolean;
}

interface CampaignMirrorActions {
  /**
   * Enter mirror mode for a joined co-op campaign — record the peer
   * identity. Until `applySnapshot` runs, `campaign` stays `null`.
   */
  beginMirror: (peers: ICampaignMirrorPeers, localPeerId: string) => void;
  /**
   * Seed the mirror from a `CampaignSnapshotPublished` baseline. Used on
   * join and on a large-gap resync — the snapshot REPLACES whatever
   * state the mirror held.
   *
   * The framing baseline carries `sequence: -1`, so a join seeds the
   * mirror and the following log events (sequence 0+) all pass the
   * `applyEvent` ordering guard. For a large-gap resync the caller
   * passes `resumeSequence` — the live stream's next sequence minus one
   * — so `applyEvent` accepts the post-snapshot live events and rejects
   * stale tail events the snapshot already folded in.
   */
  applySnapshot: (snapshot: ICampaignEvent, resumeSequence?: number) => void;
  /**
   * Advance the mirror by ONE host-broadcast campaign event through the
   * shared `applyCampaignEvent` reducer. This is the ONLY way a guest
   * mirror's `campaign` field ever changes. Out-of-order or duplicate
   * events (sequence <= `lastSequence`) are ignored — a replay burst
   * that arrived interleaved with live events still converges.
   */
  applyEvent: (event: ICampaignEvent) => void;
  /**
   * Apply an ordered batch of events (a replay stream or a resync
   * tail). Each event funnels through `applyEvent`, so the same
   * ordering and de-duplication guarantees hold.
   */
  applyEvents: (events: readonly ICampaignEvent[]) => void;
  /** Mark the session paused — the host disconnected (design D6). */
  pause: () => void;
  /** Reset the mirror (leaving a campaign / test teardown). */
  reset: () => void;
}

export type CampaignMirrorStore = CampaignMirrorState & CampaignMirrorActions;

const INITIAL_STATE: CampaignMirrorState = {
  campaign: null,
  peers: null,
  localPeerId: null,
  lastSequence: -1,
  paused: false,
};

/**
 * The guest's campaign mirror store. A guest in a shared co-op campaign
 * binds this store; its `campaign` field is advanced SOLELY by
 * host-broadcast events through `applyEvent` — never by a local
 * mutation. There is intentionally no `updateCampaign` /
 * `spendFunds` / `hirePilot` action: a guest action is an intent to the
 * host, not a local write.
 */
export const useCampaignMirrorStore = create<CampaignMirrorStore>()((set) => ({
  ...INITIAL_STATE,

  beginMirror: (peers: ICampaignMirrorPeers, localPeerId: string): void => {
    set({
      peers,
      localPeerId,
      campaign: null,
      lastSequence: -1,
      paused: false,
    });
  },

  applySnapshot: (snapshot: ICampaignEvent, resumeSequence?: number): void => {
    if (snapshot.type !== 'CampaignSnapshotPublished') {
      // A non-snapshot event cannot seed a mirror — ignore it. The
      // sync session only ever calls `applySnapshot` with a real
      // snapshot, but the guard keeps the contract explicit.
      return;
    }
    set(() => ({
      // The snapshot's payload is the whole authoritative state.
      campaign: snapshot.payload.state,
      // A join baseline carries `sequence: -1`, so the following log
      // events (0+) all pass the `applyEvent` ordering guard. A
      // large-gap resync passes `resumeSequence` so post-snapshot live
      // events are accepted and stale tail events are rejected.
      lastSequence: resumeSequence ?? snapshot.sequence,
      paused: false,
    }));
  },

  applyEvent: (event: ICampaignEvent): void => {
    set((state) => {
      // Out-of-order / duplicate guard — a replayed event the guest
      // also saw live during a reconnect race is dropped.
      if (event.sequence <= state.lastSequence) {
        return {};
      }
      const base =
        event.type === 'CampaignSnapshotPublished' || state.campaign === null
          ? // A snapshot (or the very first event) seeds the mirror.
            applyCampaignEvent(
              {
                campaignId: event.campaignId,
                day: 0,
                balance: 0,
                rosterUnits: {},
                pilots: {},
                contracts: {},
                factionStanding: {},
                salvagePool: 0,
              },
              event,
            )
          : applyCampaignEvent(state.campaign, event);
      return { campaign: base, lastSequence: event.sequence };
    });
  },

  applyEvents: (events: readonly ICampaignEvent[]): void => {
    // Apply in ascending sequence order so an interleaved replay burst
    // still converges. `applyEvent` de-dupes per-event.
    const ordered = [...events].sort(
      (left, right) => left.sequence - right.sequence,
    );
    for (const event of ordered) {
      useCampaignMirrorStore.getState().applyEvent(event);
    }
  },

  pause: (): void => {
    set({ paused: true });
  },

  reset: (): void => {
    set({ ...INITIAL_STATE });
  },
}));
