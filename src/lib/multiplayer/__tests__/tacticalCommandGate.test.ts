/**
 * Posture to command gate (umbrella 19.2, finding #37).
 *
 * `deriveTacticalLifecyclePosture` has computed `commandsEnabled` since
 * 19.1 and nothing has ever read it - a grep across
 * `src/components/multiplayer` and `src/components/gameplay` returns zero
 * hits. The only tactical gate was `NetworkedGameSurface`'s
 * `interactionPaused`, firing on `status === 'paused'` or the single
 * posture `blocked`. So commands were dispatchable while the client was
 * mid-gap-recovery, reconnecting, behind the stream, or replaying a
 * rewound projection - every one a state where the client already knows
 * its board is not the server's.
 *
 * THE CARVE-OUT IS THE INTERESTING PART. This gate deliberately does not
 * reuse `commandsEnabled`, which is also false for `pending` and `sealed`.
 * Those are the player's OWN declarations in flight, not a stale view;
 * whether a player may queue a second command while one is unacked is a
 * real tactical-play decision, and 19.2 is about refusing commands the
 * server will not honour. Conflating them would change queuing as a side
 * effect of an accessibility-and-refusals task. The rows below pin both
 * directions so nobody later "simplifies" this into `!commandsEnabled`.
 */

import type { TacticalLifecycleState } from '@/lib/multiplayer/tacticalLifecycleState';

import { tacticalCommandAvailability } from '@/lib/multiplayer/tacticalCommandGate';

/** Postures 19.2 gates: the client's board is not the server's. */
const GATED: readonly TacticalLifecycleState[] = [
  'blocked',
  'rebuilding',
  'rewound',
  'syncing',
  'reconnecting',
  'behind',
];

/** Postures that stay playable - the player's own in-flight state. */
const UNGATED: readonly TacticalLifecycleState[] = [
  'live',
  'finalized',
  'pending',
  'sealed',
];

function posture(state: TacticalLifecycleState) {
  return {
    state,
    commandsEnabled: state === 'live' || state === 'finalized',
    message: `Tactical lifecycle posture: ${state}.`,
  };
}

describe('tactical command gate', () => {
  it.each(GATED)('refuses commands while %s', (state) => {
    expect(tacticalCommandAvailability(posture(state)).available).toBe(false);
  });

  it.each(GATED)('gives %s an actionable reason', (state) => {
    // Unavailable-without-a-reason is unrepresentable here: the gated set
    // IS the key set of the reason map. This row pins that, so a posture
    // added to one and not the other fails rather than shipping a dead
    // button.
    const result = tacticalCommandAvailability(posture(state));

    expect(result.available).toBe(false);
    if (result.available) return;
    expect(result.reason.length).toBeGreaterThan(0);
    // No digits, matching the lifecycle banner's rule: this string is read
    // aloud through `aria-describedby`, and a spoken distance rebuilds the
    // same inference channel a printed one would.
    expect(result.reason).not.toMatch(/\d/);
  });

  it.each(UNGATED)('allows commands while %s', (state) => {
    // The carve-out. `pending` and `sealed` have `commandsEnabled: false`,
    // so a gate written as `!commandsEnabled` would refuse here - and this
    // row is what says that would be wrong.
    expect(tacticalCommandAvailability(posture(state)).available).toBe(true);
  });

  it('is not merely the inverse of commandsEnabled', () => {
    // States the divergence as a fact rather than a comment: there exists
    // a posture the gate allows whose `commandsEnabled` is false.
    const diverging = UNGATED.filter(
      (state) => !posture(state).commandsEnabled,
    );

    expect(diverging).toEqual(['pending', 'sealed']);
    for (const state of diverging) {
      expect(tacticalCommandAvailability(posture(state)).available).toBe(true);
    }
  });

  it('allows commands when no posture is supplied', () => {
    // A surface with no lifecycle behind it keeps its pre-19.2 behaviour
    // rather than silently refusing commands that were always safe.
    expect(tacticalCommandAvailability(undefined).available).toBe(true);
  });

  it('covers every posture the lifecycle can produce', () => {
    // Guards the guard: if a tenth posture is added to the union, it lands
    // in neither list here and this row fails, rather than silently
    // defaulting to "allowed" in production.
    const all: readonly TacticalLifecycleState[] = [...GATED, ...UNGATED];

    expect(new Set(all).size).toBe(10);
  });
});
