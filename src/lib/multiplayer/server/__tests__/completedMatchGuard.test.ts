/**
 * Engine-mutating intents are refused once the match is completed.
 *
 * They were accepted, and it was not harmless. MEASURED on a real
 * one-sided victory (player has a unit, opponent has none, so the game
 * genuinely ends): the committed log continued past `game_ended` with
 * `movement_locked`, `attack_locked` and `attacks_revealed`, and
 * `deriveCombatOutcome` - the value the campaign consumes for salvage
 * and damage - came out DIFFERENT before and after those extra
 * intents. The zero-unit setup the report used was not the cause; a
 * real victory behaves the same and commits more.
 *
 * Nothing legitimate is refused. The only production caller of
 * `handleIntent` is the raw client wire frame, GM corrections never
 * touch this host, and the designed rewind is a replacement branch
 * rather than a command on a finished match.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH_ID = 'match-completed-guard';

function unit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  } as IGameUnit;
}

/** One side only, so the game genuinely ends on the first advance. */
async function completedHost(): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1'],
    sideAssignments: [{ playerId: 'p1', side: 'player' }],
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
    gameUnits: [unit('solo-player', GameSide.Player)],
    diceSeed: 42,
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

function intent(intentId: string): IIntent {
  return {
    kind: 'Intent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: 'p1',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

describe('completed-match intent guard', () => {
  it('refuses an engine-mutating intent after the game ended', async () => {
    const host = await completedHost();

    const first = await host.handleIntent(intent('win'));
    expect(host.getSessionForTests().currentState.status).toBe('completed');
    // The winning command itself is NOT refused - only what comes after.
    expect(first.some((m) => m.kind === 'Error')).toBe(false);

    const after = await host.handleIntent(intent('after'));

    expect(after).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        reason: 'match-already-completed',
      }),
    ]);
  });

  it('commits nothing after game_ended', async () => {
    // The durable log is the system of record. Before the guard it
    // carried movement locks and revealed attacks AFTER the game ended.
    const host = await completedHost();
    await host.handleIntent(intent('win'));
    const atCompletion = (await host.getEventsFromSeq(0)).map(
      (e) => `${e.sequence}:${e.type}`,
    );

    for (const id of ['x', 'y', 'z']) {
      await host.handleIntent(intent(id));
    }
    const afterwards = (await host.getEventsFromSeq(0)).map(
      (e) => `${e.sequence}:${e.type}`,
    );

    expect(afterwards).toEqual(atCompletion);
    expect(atCompletion[atCompletion.length - 1]).toBe(
      `${atCompletion.length - 1}:game_ended`,
    );
  });

  it('does not move the derived state once completed', async () => {
    // What made this harmful rather than untidy: the post-battle
    // consumers re-derive from live state, so a state that keeps moving
    // is a result that keeps moving.
    const host = await completedHost();
    await host.handleIntent(intent('win'));
    const at = JSON.stringify(host.getSessionForTests().currentState);

    await host.handleIntent(intent('more'));

    expect(JSON.stringify(host.getSessionForTests().currentState)).toBe(at);
  });
});
