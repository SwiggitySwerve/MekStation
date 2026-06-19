import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  GameSide,
  IReplayManifestEntry,
  ReplaySource,
  fs,
  gameCreatedEvent,
  gameEndedEvent,
  makeTmpCwd,
  path,
  scanReplayDirectory,
  setupBackfillScanTestMode,
  teardownBackfillScanTestMode,
  turnStartedEvent,
  writeNDJSON,
} from './backfill-scan.test-helpers';

describe('scanReplayDirectory', () => {
  beforeEach(() => {
    setupBackfillScanTestMode();
  });

  afterEach(() => {
    teardownBackfillScanTestMode();
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
});
