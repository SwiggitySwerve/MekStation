/**
 * Co-op campaign session metadata (`wire-coop-campaign-route`, design Wave 6.1).
 *
 * A campaign with a `coopSession` is a shared co-op campaign — the host's
 * authoritative copy or a guest's read-mostly mirror. Every co-op surface in
 * the campaign page tree (the host-as-GM review surface on the dashboard,
 * the guest-proposal overlays on the mutation routes, the `Co-op session`
 * navigation badge, the `CoopParticipationPicker` on the mission launch
 * route) reads this field to decide whether to render.
 *
 * A campaign without a `coopSession` (the `undefined` case) is a normal
 * single-player campaign and SHALL NOT render any of those surfaces — that
 * gating is what keeps the single-player path untouched.
 *
 * Wave 5 (`add-coop-campaign-play`) shipped the entire authority model —
 * `CampaignMatchHost`, `CampaignGmArbiter`, `IGuestProposal`, the React
 * components — but no campaign carried the bit that said "I am a co-op
 * campaign". This module adds that bit.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

// =============================================================================
// Co-op session role
// =============================================================================

/**
 * The local user's role in a co-op campaign session.
 *
 * - `host` — the user owns authoritative campaign state. `CampaignMatchHost`
 *   runs locally and accepts guest joins. The host SHALL see
 *   `HostGmReviewSurface` on the dashboard when arbitration mode is
 *   `host-review`.
 * - `guest` — the user is connected to a remote host's campaign. The local
 *   campaign is a read-mostly mirror; every mutation control SHALL submit an
 *   `IGuestProposal` instead of mutating campaign state directly.
 */
export type CoopSessionMode = 'host' | 'guest';

/** True iff `value` is one of the two `CoopSessionMode` strings. */
export function isCoopSessionMode(value: unknown): value is CoopSessionMode {
  return value === 'host' || value === 'guest';
}

// =============================================================================
// Co-op session
// =============================================================================

/**
 * Per-campaign co-op session metadata. Stamped on `campaign.coopSession`
 * at creation by the "Create co-op campaign" entry point (host) or by the
 * "Join co-op campaign" entry point (guest). Absent means single-player.
 *
 * - `roomCode` is set on the host side at creation (from
 *   `CampaignMatchHost.open` / the multiplayer invite endpoint) and on the
 *   guest side from the code the guest typed into the join prompt; the
 *   navigation badge reads it back to the user.
 * - `hostMatchId` is set on the guest side from the invite response and
 *   pins the guest's mirror to one specific host match.
 * - `matchId` is set on the host side from `POST /api/multiplayer/matches`;
 *   production route surfaces use it to bind the campaign to the registered
 *   invite and campaign arbiter.
 *
 * The shape is JSON-safe so persistence round-trips it through the existing
 * `useCampaignStore` `partialize` path with no special handling.
 */
export interface ICoopSession {
  /** The local user's role in this campaign's co-op session. */
  readonly mode: CoopSessionMode;
  /**
   * Human-friendly room code (host: minted at creation; guest: the code the
   * guest used to join). Surfaced on the `CampaignNavigation` co-op badge.
   * Optional only for backward-compatibility on shapes constructed before
   * the navigation badge landed — new code SHOULD always set it.
   */
  readonly roomCode?: string;
  /**
   * The server-registered multiplayer match id for this host campaign.
   * Optional for backward compatibility with older local-only co-op saves.
   */
  readonly matchId?: string;
  /**
   * The host's match id, captured from the multiplayer invite endpoint when
   * the guest joins. Pins this mirror to one specific host match so a stale
   * invite cannot route to the wrong host. `undefined` on the host side.
   */
  readonly hostMatchId?: string;
}

// =============================================================================
// Convenience constructors
// =============================================================================

/**
 * Build a host-side co-op session — used by `createCampaign` when the user
 * clicks "Create co-op campaign" on the list page.
 */
export function createHostCoopSession(
  roomCode?: string,
  matchId?: string,
): ICoopSession {
  return { mode: 'host', roomCode, matchId };
}

/**
 * Build a guest-side co-op session — used by `createGuestMirrorCampaign`
 * when the user joins via a room code.
 */
export function createGuestCoopSession(
  hostMatchId: string,
  roomCode: string,
): ICoopSession {
  return { mode: 'guest', roomCode, hostMatchId };
}
