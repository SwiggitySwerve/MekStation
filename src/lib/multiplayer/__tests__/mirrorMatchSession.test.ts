/**
 * mirrorMatchSession unit tests.
 *
 * Per `complete-multiplayer-game-surface` task 1.4: the client mirror
 * built from a fixed event log matches the authoritative session, and
 * a replay-then-live event ordering produces the same mirror as a
 * live-only ordering.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  advancePhase,
  createGameSession,
  declareMovement,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import {
  asGameEvent,
  buildMirrorSession,
  mirrorEvents,
  orderGameEvents,
} from '../mirrorMatchSession';

// =============================================================================
// Fixtures — a real authoritative session, the source of truth.
// =============================================================================

function createConfig(): IGameConfig {
  return {
    mapRadius: 6,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

/**
 * Build an authoritative session through the engine reducer, then a
 * second movement event so the log has a non-trivial derived state.
 */
function buildAuthoritativeSession(): IGameSession {
  let session = createGameSession(createConfig(), createUnits(), {
    id: 'match-fixture',
    createdAt: '2026-05-19T00:00:00.000Z',
  });
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session); // → Movement phase
  const fromHex = session.currentState.units['player-1'].position;
  session = declareMovement(
    session,
    'player-1',
    fromHex,
    { q: fromHex.q + 1, r: fromHex.r },
    Facing.Northeast,
    MovementType.Walk,
    1,
    0,
    [fromHex, { q: fromHex.q + 1, r: fromHex.r }],
  );
  return session;
}

// =============================================================================
// asGameEvent / orderGameEvents
// =============================================================================

describe('asGameEvent', () => {
  it('accepts a structural game event', () => {
    const session = buildAuthoritativeSession();
    expect(asGameEvent(session.events[0])).not.toBeNull();
  });

  it('rejects a lifecycle envelope and non-objects', () => {
    expect(asGameEvent({ kind: 'LobbyUpdated', matchId: 'm' })).toBeNull();
    expect(asGameEvent(null)).toBeNull();
    expect(asGameEvent('not-an-event')).toBeNull();
  });
});

describe('orderGameEvents', () => {
  it('sorts by sequence and de-duplicates repeated sequences', () => {
    const events = buildAuthoritativeSession().events;
    const shuffled = [events[2], events[0], events[1], events[0]];
    const ordered = orderGameEvents(shuffled);
    expect(ordered.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('drops non-event payloads from a mixed stream', () => {
    const events = buildAuthoritativeSession().events;
    const mixed = [events[0], { kind: 'MatchPaused' }, events[1], undefined];
    expect(orderGameEvents(mixed)).toHaveLength(2);
  });
});

// =============================================================================
// buildMirrorSession — task 1.4
// =============================================================================

describe('buildMirrorSession', () => {
  it('returns null until the seed GameCreated event has arrived', () => {
    expect(buildMirrorSession([])).toBeNull();
    const session = buildAuthoritativeSession();
    // A stream missing the GameCreated seed cannot rebuild a roster.
    const noSeed = session.events.slice(1);
    expect(buildMirrorSession(noSeed)).toBeNull();
  });

  it('mirror built from a fixed event log matches the authoritative session', () => {
    const authoritative = buildAuthoritativeSession();
    const mirror = buildMirrorSession(authoritative.events);

    expect(mirror).not.toBeNull();
    // The derived state — phase, turn, per-unit positions — must match
    // the authoritative session at the same sequence.
    expect(mirror?.currentState).toEqual(authoritative.currentState);
    expect(mirror?.config).toEqual(authoritative.config);
    expect(mirror?.units).toEqual(authoritative.units);
  });

  it('replay-then-live ordering produces the same mirror as live-only', () => {
    const authoritative = buildAuthoritativeSession();
    const all = authoritative.events;

    // Live-only: every event arrives in order.
    const liveOnly = buildMirrorSession(all);

    // Replay-then-live: the first three events arrive as a replay burst
    // (interleaved / out of order), the rest live — exactly the join
    // scenario. The builder re-sorts by sequence so the result matches.
    const replayBurst = [all[1], all[0], all[2]];
    const liveTail = all.slice(3);
    const replayThenLive = buildMirrorSession([...replayBurst, ...liveTail]);

    expect(replayThenLive?.currentState).toEqual(liveOnly?.currentState);
    expect(replayThenLive?.events).toEqual(liveOnly?.events);
  });

  it('tolerates a fog-omitted event (sequence gap) without throwing', () => {
    const authoritative = buildAuthoritativeSession();
    // Drop a mid-stream event to simulate a fog-redacted omission — the
    // builder must still produce a coherent mirror from the remainder.
    const withGap = authoritative.events.filter(
      (e) => e.type !== GameEventType.PhaseChanged,
    );
    expect(() => buildMirrorSession(withGap)).not.toThrow();
    const mirror = buildMirrorSession(withGap);
    expect(mirror).not.toBeNull();
  });

  it('tolerates a partially-redacted event payload', () => {
    const authoritative = buildAuthoritativeSession();
    // Server fog redaction collapses some payloads to `{ unitId }`.
    const redacted: IGameEvent[] = authoritative.events.map((event) =>
      event.type === GameEventType.MovementDeclared
        ? { ...event, payload: { unitId: 'player-1' } }
        : event,
    );
    expect(() => buildMirrorSession(redacted)).not.toThrow();
  });
});

// =============================================================================
// mirrorEvents
// =============================================================================

describe('mirrorEvents', () => {
  it('returns the ordered event list the mirror was built from', () => {
    const authoritative = buildAuthoritativeSession();
    const shuffled = [...authoritative.events].reverse();
    const ordered = mirrorEvents(shuffled);
    expect(ordered.map((e) => e.sequence)).toEqual(
      authoritative.events.map((e) => e.sequence),
    );
  });

  it('returns an empty list before any event arrives', () => {
    expect(mirrorEvents([])).toEqual([]);
  });
});

// =============================================================================
// Mirror is never mutated locally — D2 / scenario "Mirror is never
// mutated locally": appendEvent on the authoritative session does NOT
// change the previously-built mirror.
// =============================================================================

describe('mirror immutability', () => {
  it('a later authoritative event does not retroactively mutate a built mirror', () => {
    const authoritative = buildAuthoritativeSession();
    const mirror = buildMirrorSession(authoritative.events);
    const eventCountBefore = mirror?.events.length ?? 0;

    // The authoritative session advances — but the mirror is an
    // immutable value built from a snapshot of the log.
    advancePhase(authoritative);

    expect(mirror?.events.length).toBe(eventCountBefore);
  });
});
