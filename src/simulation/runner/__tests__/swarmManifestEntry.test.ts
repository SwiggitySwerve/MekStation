/**
 * Tests for `buildSwarmManifestEntry`. Per `add-replay-library` PR 4
 * (replay-library spec — IReplayManifestEntry Discriminated Union;
 * quick-session spec — Per-Game Event Log Persistence MODIFIED): the
 * helper is the pure derivation function used by `scripts/run-simulation.ts`
 * to build the manifest entry that gets appended to
 * `simulation-reports/replay-index.json` after every successful run.
 *
 * Pure-function unit-testing keeps the spec scenarios for `turns` /
 * `winner` / discriminant correctness verifiable without spinning up
 * filesystem fixtures (those live in the integration test).
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  ReplaySource,
  type IGameEvent,
  type IGameEndedPayload,
  type ITurnStartedPayload,
} from '@/types/gameplay';

import { buildSwarmManifestEntry } from '../swarmManifestEntry';

function createTurnStartedEvent(
  gameId: string,
  sequence: number,
  turn: number,
): IGameEvent {
  const payload: ITurnStartedPayload = {};
  return {
    id: `${gameId}-evt-${sequence}`,
    gameId,
    sequence,
    timestamp: new Date(0).toISOString(),
    type: GameEventType.TurnStarted,
    turn,
    phase: GamePhase.Initiative,
    payload,
  };
}

function createGameEndedEvent(
  gameId: string,
  sequence: number,
  payload: IGameEndedPayload,
): IGameEvent {
  return {
    id: `${gameId}-evt-${sequence}`,
    gameId,
    sequence,
    timestamp: new Date(0).toISOString(),
    type: GameEventType.GameEnded,
    turn: payload.turns ?? 0,
    phase: GamePhase.End,
    payload,
  };
}

describe('buildSwarmManifestEntry', () => {
  const baseInput = {
    gameId: 'sim-7',
    runSeed: 42,
    configName: 'duel-3kbv-temperate',
    batchTimestamp: '2026-05-07T12-00-00-000Z',
    bvTotal: 4500,
    createdAt: '2026-05-07T12-00-30-000Z',
  };

  it('builds an ISwarmReplayManifestEntry with all metadata fields populated', () => {
    const events: IGameEvent[] = [
      createTurnStartedEvent('sim-7', 0, 1),
      createTurnStartedEvent('sim-7', 1, 2),
      createGameEndedEvent('sim-7', 2, {
        winner: GameSide.Player,
        reason: 'destruction',
        turns: 2,
      }),
    ];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry).toEqual({
      id: 'sim-7',
      replaySource: ReplaySource.Swarm,
      path: 'swarm/sim-7.jsonl',
      createdAt: '2026-05-07T12-00-30-000Z',
      turns: 2,
      winner: GameSide.Player,
      bvTotal: 4500,
      configName: 'duel-3kbv-temperate',
      seed: 42,
      batchTimestamp: '2026-05-07T12-00-00-000Z',
    });
  });

  it('extracts winner=Opponent when GameEnded.payload.winner is GameSide.Opponent', () => {
    const events: IGameEvent[] = [
      createTurnStartedEvent('sim-7', 0, 1),
      createGameEndedEvent('sim-7', 1, {
        winner: GameSide.Opponent,
        reason: 'destruction',
        turns: 1,
      }),
    ];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry.winner).toBe(GameSide.Opponent);
  });

  it('collapses GameEnded.payload.winner="draw" to null on the manifest entry', () => {
    // The IGameEndedPayload type lets `winner` be `'draw'` or a `GameSide`
    // value — the manifest entry shape uses `GameSide | null` so draws
    // become null per the manifest contract.
    const events: IGameEvent[] = [
      createTurnStartedEvent('sim-7', 0, 1),
      createGameEndedEvent('sim-7', 1, {
        winner: 'draw',
        reason: 'turn_limit',
        turns: 10,
      }),
    ];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry.winner).toBeNull();
    expect(entry.turns).toBe(10);
  });

  it('falls back to count of turn_started events when GameEnded.turns is missing', () => {
    // Per the spec scenario "GameEnded.turns optionality fallback": if
    // the GameEnded event lacks an explicit `turns` field, derive it
    // from the count of `turn_started` events. Same fallback as the
    // backfill scan from PR 3 so build-time and read-time agree.
    const events: IGameEvent[] = [
      createTurnStartedEvent('sim-7', 0, 1),
      createTurnStartedEvent('sim-7', 1, 2),
      createTurnStartedEvent('sim-7', 2, 3),
      // GameEnded payload without `turns`:
      createGameEndedEvent('sim-7', 3, {
        winner: GameSide.Player,
        reason: 'destruction',
        // turns intentionally omitted
      } as IGameEndedPayload),
    ];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry.turns).toBe(3);
  });

  it('falls back to 0 turns when neither GameEnded.turns nor turn_started events exist', () => {
    // Crashed-mid-init or otherwise empty event log — the helper produces
    // a valid entry with turns=0 rather than throwing.
    const events: IGameEvent[] = [];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry.turns).toBe(0);
    expect(entry.winner).toBeNull();
  });

  it('falls back to null winner when no GameEnded event is present', () => {
    // A run that crashed before the runner emitted GameEnded still
    // gets a manifest entry — useful for debugging mid-run failures
    // through the Library page.
    const events: IGameEvent[] = [
      createTurnStartedEvent('sim-7', 0, 1),
      createTurnStartedEvent('sim-7', 1, 2),
    ];

    const entry = buildSwarmManifestEntry({ ...baseInput, events });

    expect(entry.winner).toBeNull();
    // turns falls through to the turn_started count
    expect(entry.turns).toBe(2);
  });

  it('derives path from gameId using the swarm partition prefix', () => {
    const entry = buildSwarmManifestEntry({
      ...baseInput,
      gameId: 'arbitrary-id-123',
      events: [],
    });

    expect(entry.path).toBe('swarm/arbitrary-id-123.jsonl');
  });

  it('threads runSeed and configName + batchTimestamp through verbatim', () => {
    const entry = buildSwarmManifestEntry({
      ...baseInput,
      runSeed: 999,
      configName: 'lance-on-lance-urban',
      batchTimestamp: '2026-12-31T23-59-59-999Z',
      events: [],
    });

    expect(entry.seed).toBe(999);
    expect(entry.configName).toBe('lance-on-lance-urban');
    expect(entry.batchTimestamp).toBe('2026-12-31T23-59-59-999Z');
  });

  it('preserves the explicit bvTotal — does not lazy-recompute', () => {
    // Council Decision 3 + Momus MUST RESOLVE #1: BV is computed once
    // at write time and stored. The helper takes it as input and stores
    // verbatim; no parsing of payload.units to second-guess the caller.
    const entry = buildSwarmManifestEntry({
      ...baseInput,
      bvTotal: 12345,
      events: [],
    });

    expect(entry.bvTotal).toBe(12345);
  });
});
