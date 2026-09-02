/**
 * Turns the local P2P match status into a command availability answer
 * (umbrella 19.2, finding #61).
 *
 * WHY THIS EXISTS AT ALL. On the WebSocket surface the server refuses a
 * command the client should not have sent. A peer-to-peer match has no
 * server: when the other peer is gone, a command the player issues is
 * applied LOCALLY, against a session the absent peer will never see.
 * The failure mode is divergence rather than a silent retry, so the
 * refusal has to happen on this side or not at all.
 *
 * WHY NOT `tacticalCommandAvailability` / `ITacticalLifecyclePosture`
 * (the rejected Option B). Two reasons, recorded so the divergence
 * reads as a decision rather than an oversight:
 *
 *   1. LAYERING. That gate lives under `src/lib/multiplayer/`, and the
 *      gameplay surface does not import multiplayer. Reusing it would
 *      make the single-player dock depend on the networked transport.
 *
 *   2. VOCABULARY. Six of the shared lifecycle union's ten members
 *      cannot occur here - `rebuilding` and `rewound` have no P2P
 *      meaning at all, because there is no authoritative history to
 *      rebuild and no branch to rewind - and its refusal strings name
 *      "the match stream", which would tell the player about a server
 *      that is not there. Uniformity of SHAPE is what the dock needs,
 *      and it gets that: this module answers in `CommandAvailability`,
 *      the same type the dock already takes. Uniformity of the STATE
 *      UNION would buy nothing when most of it is unreachable.
 *
 * The nearest P2P analogue of a rewound projection is a match-log
 * mirror prefix divergence. That is a different fact, it is not carried
 * by this status, and it is deliberately not named here.
 */

import type { LocalMatchStatus } from '@/stores/useGameplayStore';
import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

/**
 * Why each status refuses, in words a player can act on.
 *
 * No digits, matching the sibling gate's rule: these strings are read
 * aloud through `aria-describedby`, and a spoken countdown rebuilds the
 * same inference channel a printed one would. Each refusal names WHICH
 * peer is missing, because a host who left and a guest who left are
 * different facts the player acts on differently.
 */
const P2P_GATE_REASONS: Readonly<
  Record<Exclude<LocalMatchStatus, 'live'>, string>
> = {
  hostPending:
    'The host left the match. Commands wait for their return, so the two of you do not play different battles.',
  guestPending:
    'Your opponent left the match. Commands wait for their return, so the two of you do not play different battles.',
  aborted:
    'The match ended without your opponent. Commands are refused because nothing you do here can reach them.',
};

/**
 * Whether tactical commands may be issued in this P2P match status.
 *
 * Total over the store's union by construction - the reason map is
 * keyed by every member except `live`, so a status added to the store
 * fails to compile here rather than silently falling through to
 * "playable".
 */
export function p2pCommandAvailability(
  status: LocalMatchStatus,
): CommandAvailability {
  if (status === 'live') return { available: true };
  return { available: false, reason: P2P_GATE_REASONS[status] };
}
