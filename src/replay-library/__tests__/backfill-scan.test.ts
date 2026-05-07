/**
 * Tests for the backfill scan. Covers the four Backfill Scan spec scenarios:
 *
 *   1. Scan covers new partition layout (one swarm + one quick fixture)
 *   2. Scan covers legacy flat layout (one `games/<ts>/<id>.jsonl` fixture)
 *   3. `GameEnded.turns` optionality fallback (turn_started count, then 0)
 *   4. Scan is idempotent — two runs produce deep-equal arrays
 *
 * Plus several non-spec hardening cases:
 *   - Scan covers BOTH layouts simultaneously
 *   - Files without `GameCreated` are skipped with a debug log (no crash)
 *   - Empty `simulation-reports/` returns empty array
 *
 * Tests stage NDJSON fixtures into `os.tmpdir()` and pass the parent as `cwd`
 * so the scan resolves into a clean tmp tree per-test (jest --runInBand is
 * not assumed).
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GameEventType, GameSide, ReplaySource } from '@/types/gameplay';
import { disableTestMode, enableTestMode } from '@/utils/logger';

import type { IReplayManifestEntry } from '../types';

import { scanReplayDirectory } from '../backfill-scan';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Builds an isolated tmp `cwd` containing an empty `simulation-reports/`.
 * Each test gets its own tmpdir so concurrent runs cannot stomp each other.
 */
async function makeTmpCwd(): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'replay-library-backfill-'),
  );
  await fs.mkdir(path.join(dir, 'simulation-reports'), { recursive: true });
  return dir;
}

/**
 * Tiny helper around `fs.writeFile` that creates the parent directory tree
 * first — every fixture-write needs `recursive: true`.
 */
async function writeNDJSON(
  filePath: string,
  events: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = events.map((e) => JSON.stringify(e)).join('\n');
  await fs.writeFile(filePath, body, 'utf8');
}

/**
 * Synthesizes a minimal `GameCreated` event — only the fields the backfill
 * scan reads. The spec's "stream-read enough lines" pattern means anything
 * we don't reference here is irrelevant to the test.
 */
function gameCreatedEvent(
  gameId: string,
  units: ReadonlyArray<Record<string, unknown>>,
  extraPayload: Record<string, unknown> = {},
  timestamp = '2026-05-07T12:00:00.000Z',
): Record<string, unknown> {
  return {
    id: `${gameId}-evt-1`,
    gameId,
    sequence: 1,
    timestamp,
    type: GameEventType.GameCreated,
    turn: 0,
    phase: 'initiative',
    payload: {
      config: {
        mapRadius: 8,
        turnLimit: 0,
        victoryConditions: [],
        optionalRules: [],
      },
      units,
      ...extraPayload,
    },
  };
}

/**
 * Synthesizes a `GameEnded` event. `turns` is optional so tests can exercise
 * the missing-field fallback.
 */
function gameEndedEvent(
  gameId: string,
  winner: GameSide | 'draw',
  options: { turns?: number } = {},
  timestamp = '2026-05-07T12:30:00.000Z',
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    winner,
    reason: 'destruction',
  };
  if (typeof options.turns === 'number') {
    payload.turns = options.turns;
  }
  return {
    id: `${gameId}-evt-end`,
    gameId,
    sequence: 999,
    timestamp,
    type: GameEventType.GameEnded,
    turn: options.turns ?? 0,
    phase: 'end',
    payload,
  };
}

/**
 * Synthesizes a `TurnStarted` event — used when a fixture wants the
 * `turn_started`-count fallback to bite.
 */
function turnStartedEvent(
  gameId: string,
  turn: number,
  sequence: number,
): Record<string, unknown> {
  return {
    id: `${gameId}-evt-turn-${turn}`,
    gameId,
    sequence,
    timestamp: '2026-05-07T12:10:00.000Z',
    type: GameEventType.TurnStarted,
    turn,
    phase: 'initiative',
    payload: {},
  };
}

// ---------------------------------------------------------------------------
// Spec scenarios
// ---------------------------------------------------------------------------

describe('scanReplayDirectory', () => {
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    enableTestMode();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    disableTestMode();
    jest.restoreAllMocks();
  });

  it('covers new partition layout (swarm + quick)', async () => {
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-1.jsonl'),
      [
        gameCreatedEvent(
          'sim-1',
          [
            { id: 'u1', bv: 1500 },
            { id: 'u2', bv: 2000 },
          ],
          {
            swarmMeta: {
              configName: 'duel-3kbv-temperate',
              seed: 42,
              batchTimestamp: '2026-05-07T11-58-00-000Z',
            },
          },
        ),
        gameEndedEvent('sim-1', GameSide.Player, { turns: 7 }),
      ],
    );

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'quick', 'quick-9.jsonl'),
      [
        gameCreatedEvent('quick-9', [{ id: 'u1', bv: 800 }], {
          quickMeta: {
            playerSide: GameSide.Player,
            aiVariant: 'aggressive-v2',
          },
        }),
        gameEndedEvent('quick-9', GameSide.Opponent, { turns: 5 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });

    expect(entries).toHaveLength(2);

    const byId = new Map(entries.map((e) => [e.id, e]));
    const swarm = byId.get('sim-1');
    const quick = byId.get('quick-9');
    expect(swarm).toBeDefined();
    expect(quick).toBeDefined();

    if (!swarm || swarm.replaySource !== ReplaySource.Swarm) {
      throw new Error('expected swarm narrowing');
    }
    expect(swarm.path).toBe('swarm/sim-1.jsonl');
    expect(swarm.bvTotal).toBe(3500);
    expect(swarm.turns).toBe(7);
    expect(swarm.winner).toBe(GameSide.Player);
    expect(swarm.configName).toBe('duel-3kbv-temperate');
    expect(swarm.seed).toBe(42);
    expect(swarm.batchTimestamp).toBe('2026-05-07T11-58-00-000Z');

    if (!quick || quick.replaySource !== ReplaySource.Quick) {
      throw new Error('expected quick narrowing');
    }
    expect(quick.path).toBe('quick/quick-9.jsonl');
    expect(quick.bvTotal).toBe(800);
    expect(quick.turns).toBe(5);
    expect(quick.winner).toBe(GameSide.Opponent);
    expect(quick.aiVariant).toBe('aggressive-v2');
    expect(quick.playerSide).toBe(GameSide.Player);
  });

  it('covers legacy flat layout (games/<ts>/<id>.jsonl)', async () => {
    const cwd = await makeTmpCwd();
    const ts = '2026-05-01T10-00-00-000Z';

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'games', ts, 'sim-77.jsonl'),
      [
        gameCreatedEvent('sim-77', [{ id: 'u1', bv: 1200 }]),
        gameEndedEvent('sim-77', 'draw', { turns: 4 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.replaySource).toBe(ReplaySource.Swarm);
    if (entry.replaySource !== ReplaySource.Swarm) {
      throw new Error('expected swarm narrowing on legacy entry');
    }
    expect(entry.id).toBe('sim-77');
    expect(entry.path).toBe(`games/${ts}/sim-77.jsonl`);
    expect(entry.batchTimestamp).toBe(ts);
    expect(entry.configName).toBe('');
    expect(entry.seed).toBe(0);
    expect(entry.bvTotal).toBe(1200);
    expect(entry.turns).toBe(4);
    // `'draw'` collapses to null winner — manifest type is `GameSide | null`.
    expect(entry.winner).toBeNull();
  });

  it('covers BOTH layouts simultaneously', async () => {
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-new.jsonl'),
      [
        gameCreatedEvent('sim-new', [{ id: 'u1', bv: 500 }]),
        gameEndedEvent('sim-new', GameSide.Player, { turns: 2 }),
      ],
    );
    await writeNDJSON(
      path.join(
        cwd,
        'simulation-reports',
        'games',
        '2026-04-30T09-00-00-000Z',
        'sim-old.jsonl',
      ),
      [
        gameCreatedEvent('sim-old', [{ id: 'u1', bv: 600 }]),
        gameEndedEvent('sim-old', GameSide.Opponent, { turns: 3 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });

    expect(entries).toHaveLength(2);
    const ids = entries.map((e) => e.id).sort();
    expect(ids).toEqual(['sim-new', 'sim-old']);
    // Both materialize as swarm entries; the new file is partition-layout,
    // the old one is legacy. Path assertions pin the layout discriminant.
    const newOne = entries.find((e) => e.id === 'sim-new');
    const oldOne = entries.find((e) => e.id === 'sim-old');
    expect(newOne?.path).toBe('swarm/sim-new.jsonl');
    expect(oldOne?.path).toBe('games/2026-04-30T09-00-00-000Z/sim-old.jsonl');
  });

  it('falls back to turn_started count when GameEnded.turns is missing', async () => {
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-fallback.jsonl'),
      [
        gameCreatedEvent('sim-fallback', [{ id: 'u1', bv: 1000 }]),
        turnStartedEvent('sim-fallback', 1, 2),
        turnStartedEvent('sim-fallback', 2, 3),
        turnStartedEvent('sim-fallback', 3, 4),
        // GameEnded with NO `turns` field — the fallback must compute 3.
        gameEndedEvent('sim-fallback', GameSide.Player),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].turns).toBe(3);
  });

  it('falls back to 0 when neither GameEnded.turns nor turn_started events are present', async () => {
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-empty.jsonl'),
      [
        gameCreatedEvent('sim-empty', [{ id: 'u1', bv: 100 }]),
        gameEndedEvent('sim-empty', 'draw'),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].turns).toBe(0);
  });

  it('is idempotent — two runs produce deep-equal arrays', async () => {
    const cwd = await makeTmpCwd();

    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-a.jsonl'),
      [
        gameCreatedEvent('sim-a', [{ id: 'u1', bv: 100 }]),
        gameEndedEvent('sim-a', GameSide.Player, { turns: 2 }),
      ],
    );
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'quick', 'quick-b.jsonl'),
      [
        gameCreatedEvent('quick-b', [{ id: 'u1', bv: 200 }]),
        gameEndedEvent('quick-b', GameSide.Opponent, { turns: 4 }),
      ],
    );
    await writeNDJSON(
      path.join(
        cwd,
        'simulation-reports',
        'games',
        '2026-04-30T09-00-00-000Z',
        'sim-c.jsonl',
      ),
      [
        gameCreatedEvent('sim-c', [{ id: 'u1', bv: 300 }]),
        gameEndedEvent('sim-c', 'draw', { turns: 1 }),
      ],
    );

    const first = await scanReplayDirectory({ cwd });
    const second = await scanReplayDirectory({ cwd });

    // Deep-equal across both runs — id-sorted output guarantees stable order.
    expect(second).toEqual(first);
    expect(first.map((e) => e.id)).toEqual(['quick-b', 'sim-a', 'sim-c']);
  });

  it('skips files with no GameCreated event and logs at debug', async () => {
    const cwd = await makeTmpCwd();

    // Corrupt fixture: only TurnStarted + GameEnded, no GameCreated. Per spec
    // the scan must skip without crashing and emit a debug log.
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'corrupt.jsonl'),
      [
        turnStartedEvent('corrupt', 1, 1),
        gameEndedEvent('corrupt', GameSide.Player, { turns: 1 }),
      ],
    );
    // Healthy fixture alongside it — proves the corrupt one was skipped, not
    // the whole scan aborted.
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'healthy.jsonl'),
      [
        gameCreatedEvent('healthy', [{ id: 'u1', bv: 999 }]),
        gameEndedEvent('healthy', GameSide.Opponent, { turns: 3 }),
      ],
    );

    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('healthy');

    const skipLog = consoleDebugSpy.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('without GameCreated event'),
    );
    expect(skipLog).toBeDefined();
    expect(skipLog?.[1]).toMatchObject({ gameId: 'corrupt' });
  });

  it('returns an empty array when simulation-reports/ is empty', async () => {
    const cwd = await makeTmpCwd();
    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toEqual([]);
  });

  it('returns an empty array when simulation-reports/ does not exist', async () => {
    // Use a tmp parent without creating `simulation-reports/` inside.
    const cwd = await fs.mkdtemp(
      path.join(os.tmpdir(), 'replay-library-backfill-missing-'),
    );
    const entries = await scanReplayDirectory({ cwd });
    expect(entries).toEqual([]);
  });

  it('produces typed entries that narrow on replaySource', async () => {
    // Compile-time narrowing check materialized as a runtime assertion. If
    // the discriminated union breaks, the `if`-branches stop type-checking
    // and the test fails to compile.
    const cwd = await makeTmpCwd();
    await writeNDJSON(
      path.join(cwd, 'simulation-reports', 'swarm', 'sim-x.jsonl'),
      [
        gameCreatedEvent('sim-x', [{ id: 'u1', bv: 50 }]),
        gameEndedEvent('sim-x', GameSide.Player, { turns: 2 }),
      ],
    );

    const entries: readonly IReplayManifestEntry[] = await scanReplayDirectory({
      cwd,
    });
    const e = entries[0];
    if (e.replaySource === ReplaySource.Swarm) {
      // `configName` only exists on the swarm variant — references narrowing.
      expect(typeof e.configName).toBe('string');
    } else {
      throw new Error('expected swarm variant');
    }
  });
});
