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

import type { IP2PMirrorDivergence } from './p2pMirrorStore';

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
 * Why a diverged mirror refuses.
 *
 * Its own words, and deliberately not the peer-loss wording: a peer who
 * left may come back, and that refusal says so. A board that disagreed
 * with the peer's history does not heal by waiting, so telling the
 * player to wait would be a lie. No digits, like its siblings - the
 * position the prefix broke at is a diagnostic, not something a player
 * can act on, and it is read aloud through `aria-describedby`.
 */
const P2P_DIVERGENCE_REASON =
  "Your copy of this battle disagreed with your opponent's and was rebuilt from theirs. Rejoin the match to pick up their version before commanding again.";

/**
 * Whether tactical commands may be issued in this P2P match.
 *
 * DIVERGENCE OUTRANKS A MISSING PEER. Both can be true at once - a
 * divergence is detected on a replay the peer just streamed, and that
 * peer can drop a moment later - and of the two, "what you are looking
 * at is not what they have" is the fact that must be said, because it
 * is the one that does not resolve on its own.
 *
 * Total over the store's union by construction - the reason map is
 * keyed by every member except `live`, so a status added to the store
 * fails to compile here rather than silently falling through to
 * "playable".
 */
export function p2pCommandAvailability(
  status: LocalMatchStatus,
  divergence: IP2PMirrorDivergence | null = null,
): CommandAvailability {
  if (divergence !== null) {
    return { available: false, reason: P2P_DIVERGENCE_REASON };
  }
  if (status === 'live') return { available: true };
  return { available: false, reason: P2P_GATE_REASONS[status] };
}
