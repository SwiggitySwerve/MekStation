/**
 * Can a command be DECIDED without advancing the live engine?
 * (adopt-combat-event-journal-authority task 2.2.)
 *
 * PR 2 wants "the smallest decision seam that produces an ordered event
 * batch without advancing the authoritative live engine". Today the
 * host dispatches straight into the live `InteractiveSession` and then
 * reads back whatever appeared past its broadcast cursor — deciding and
 * advancing are the same act, so there is no point at which a batch
 * exists but has not yet been applied.
 *
 * The obvious substitute is a SCRATCH projection: rebuild a session from
 * the live snapshot, dispatch there, and keep the events. This file
 * establishes whether that substitute is sound, because the refactor is
 * not worth starting if it is not.
 *
 * IT IS SOUND FOR SHAPE AND NOT FOR ROLLS, and the distinction decides
 * the design. Measured while writing this: the same command on a
 * scratch projection and on the live engine produced identical event
 * types, order, turns, phases and visibility — and DIFFERENT dice. One
 * run gave `opponentRoll: 8` on the scratch against `opponentRoll: 5`
 * live. `InteractiveSession.fromSessionAsync` re-seeds its dice stream
 * rather than continuing the live one, which is correct for recovery
 * and fatal for "decide here, then re-dispatch there".
 *
 * So a decided batch MUST carry its own rolls and the apply must consume
 * them. A design that decides on a scratch and then re-dispatches on the
 * live engine would commit one set of numbers and apply another, which
 * is precisely the post-apply divergence task 2.4 exists to catch.
 *
 * SCOPE, STATED: zero units on both sides. `fromSessionAsync` re-derives
 * adapted-unit maps from the catalog, and whether a scratch projection
 * stays faithful with units deployed is NOT established here.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';
import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

const MATCH_ID = 'match-scratch-decision';

async function makeHost(): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'host-player',
    playerIds: ['host-player'],
    sideAssignments: [{ playerId: 'host-player', side: 'player' }],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const host = ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [],
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

/**
 * Everything about an event EXCEPT its dice and its identity. This is
 * the part a scratch projection is allowed to be trusted for.
 */
function shapeOf(events: readonly IGameEvent[]) {
  return events.map((event) => ({
    sequence: event.sequence,
    type: event.type,
    turn: event.turn,
    phase: event.phase,
    visibility: event.visibility,
  }));
}

describe('scratch decision projection', () => {
  it('reproduces the command event shape without touching the live engine', async () => {
    const host = await makeHost();
    const live = host.getSessionForTests();
    const before = live.events.length;

    // Decide on a scratch projection built from the live snapshot.
    const scratch = await InteractiveSession.fromSessionAsync(
      JSON.parse(JSON.stringify(live)) as typeof live,
    );
    dispatchToEngine(scratch, { kind: 'AdvancePhase' } as never);
    const decided = scratch.getSession().events.slice(before);

    // The live engine has NOT moved. This is the property the whole
    // seam exists for: a batch now exists that has not been applied.
    expect(host.getSessionForTests().events).toHaveLength(before);
    expect(decided.length).toBeGreaterThan(0);

    // Applying the same command to the live engine yields the same
    // shaped batch.
    await host.handleIntent({
      kind: 'Intent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'host-player',
      intentId: 'apply-1',
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent);
    const applied = host.getSessionForTests().events.slice(before);

    expect(shapeOf(applied)).toEqual(shapeOf(decided));
  });

  it('leaves the live session untouched, deep copy or not', async () => {
    // The deep copy above is defensive, NOT load-bearing, and saying so
    // matters because the obvious explanation is wrong. Handing the
    // LIVE session object straight to `fromSessionAsync` was tried:
    // the host's events and phase still did not move. Isolation comes
    // from the engine REPLACING the session on each step rather than
    // mutating it in place, so the scratch's dispatch swaps the
    // scratch's own reference and the host keeps its old object.
    //
    // The copy stays anyway - it costs nothing and it is the only thing
    // standing between this seam and a future handler that mutates a
    // nested unit state in place.
    const host = await makeHost();
    const live = host.getSessionForTests();
    const before = live.events.length;

    const scratch = await InteractiveSession.fromSessionAsync(
      JSON.parse(JSON.stringify(live)) as typeof live,
    );
    dispatchToEngine(scratch, { kind: 'AdvancePhase' } as never);

    expect(host.getSessionForTests().events).toHaveLength(before);
    expect(host.getSessionForTests().currentState.phase).toBe(
      live.currentState.phase,
    );
  });
});
