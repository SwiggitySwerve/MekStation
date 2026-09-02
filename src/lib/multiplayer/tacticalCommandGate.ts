/**
 * Turns a tactical lifecycle posture into a command availability answer
 * (umbrella 19.2, finding #37).
 *
 * The dock already speaks `CommandAvailability` - `{available: true}` or
 * `{available: false, reason}` - and already renders that reason through
 * `aria-describedby`. So gating tactical commands on the lifecycle needs
 * no new UI at all: it needs this mapper, and one override at the point
 * the dock asks each command whether it is available.
 *
 * WHY NOT JUST `posture.commandsEnabled`. That field is false for
 * `pending` and `sealed` as well, and those are the player's OWN
 * declarations in flight rather than a stale view of the board. Whether a
 * player may queue a second command while one is unacked is a real
 * product decision about tactical play; 19.2 is about refusing commands
 * the client knows the server will not honour. Conflating the two would
 * change how queuing works as a side effect of an accessibility-and-
 * refusals task, so the gated set below is exactly 19.2's four
 * conditions - rebuild, stale branch, blocked recovery, and required
 * convergence - and nothing else.
 *
 * `commandsEnabled` therefore stays unread by this gate. It is still the
 * right field for a surface that wants "is my view authoritative at all",
 * and the divergence is deliberate rather than an oversight.
 */

import type { ITacticalLifecyclePosture } from '@/lib/multiplayer/tacticalLifecycleState';
import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

/**
 * Why each gated posture refuses commands, in words a player can act on.
 *
 * No digits, matching the lifecycle banner's rule: these strings are read
 * aloud through `aria-describedby`, and a spoken distance rebuilds the
 * same inference channel a printed one would.
 */
const GATE_REASONS = {
  blocked:
    'Tactical updates stopped - commands are refused until the match stream recovers.',
  rebuilding:
    'The projection is being rebuilt from authoritative history. Commands resume when it completes.',
  rewound:
    'The projection was rewound to an authoritative branch. Resync before commanding again.',
  syncing: 'Recovering the match stream. Your board is not current yet.',
  reconnecting:
    'Reconnecting to the match. Commands resume once the connection is back.',
  behind: 'Catching up on match updates. Your board is behind the server.',
} as const;

/** The postures 19.2 gates. Everything else is playable. */
export type GatedTacticalState = keyof typeof GATE_REASONS;

/**
 * Whether commands may be issued in this posture.
 *
 * Returns `available: true` for an absent posture: a surface with no
 * lifecycle behind it - the single-player dock - keeps its pre-19.2
 * behaviour rather than silently refusing commands that were always safe.
 */
export function tacticalCommandAvailability(
  posture: ITacticalLifecyclePosture | undefined,
): CommandAvailability {
  if (posture === undefined) return { available: true };
  const reason = GATE_REASONS[posture.state as GatedTacticalState];
  // Every gated posture has a reason by construction - the gated set IS
  // the key set of the reason map, so a posture cannot be refused without
  // one. That is what makes the dead-button case unrepresentable rather
  // than merely untested.
  return reason === undefined
    ? { available: true }
    : { available: false, reason };
}
