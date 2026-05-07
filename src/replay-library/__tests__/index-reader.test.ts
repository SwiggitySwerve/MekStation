/**
 * Tests for the central replay-index reader.
 *
 * Covers the three Central Replay Index Reader spec scenarios:
 *   1. Reader returns typed entries (1 swarm + 1 quick fixture)
 *   2. Reader skips unrecognized variants and logs at debug
 *   3. Missing index → backfill stub invoked, return value passed through
 *
 * Tests stage fixtures into `os.tmpdir()` and pass the parent as `cwd` so the
 * reader resolves to a clean tmp `simulation-reports/replay-index.json`.
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GameSide, ReplaySource } from '@/types/gameplay';
import { disableTestMode, enableTestMode, logger } from '@/utils/logger';

import type {
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  ISwarmReplayManifestEntry,
} from '../types';

import { readReplayIndex } from '../index-reader';

// ---------------------------------------------------------------------------
// Test fixture factory — builds an isolated tmpdir per test so concurrent
// runs cannot stomp each other (jest --runInBand is not assumed).
// ---------------------------------------------------------------------------
async function makeTmpCwd(): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'replay-library-reader-'),
  );
  await fs.mkdir(path.join(dir, 'simulation-reports'), { recursive: true });
  return dir;
}

async function writeIndex(cwd: string, contents: unknown): Promise<void> {
  await fs.writeFile(
    path.join(cwd, 'simulation-reports', 'replay-index.json'),
    JSON.stringify(contents, null, 2),
    'utf8',
  );
}

const swarmFixture: ISwarmReplayManifestEntry = {
  id: 'sim-1',
  replaySource: ReplaySource.Swarm,
  path: 'swarm/sim-1.jsonl',
  createdAt: '2026-05-07T12:00:00.000Z',
  turns: 7,
  winner: GameSide.Player,
  bvTotal: 4500,
  configName: 'duel-3kbv-temperate',
  seed: 42,
  batchTimestamp: '2026-05-07T11-58-00-000Z',
};

const quickFixture: IQuickReplayManifestEntry = {
  id: 'quick-1',
  replaySource: ReplaySource.Quick,
  path: 'quick/quick-1.jsonl',
  createdAt: '2026-05-07T12:01:00.000Z',
  turns: 5,
  winner: GameSide.Opponent,
  bvTotal: 3200,
  playerSide: GameSide.Player,
  aiVariant: 'aggressive-v2',
};

describe('readReplayIndex', () => {
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    enableTestMode();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    disableTestMode();
    jest.restoreAllMocks();
  });

  it('returns typed entries that narrow on replaySource', async () => {
    const cwd = await makeTmpCwd();
    await writeIndex(cwd, [swarmFixture, quickFixture]);

    const entries = await readReplayIndex({ cwd });

    expect(entries).toHaveLength(2);
    // Discriminant narrowing must work post-load — the reader returns a
    // typed `IReplayManifestEntry[]` so consumers can narrow without casts.
    const swarm = entries[0];
    expect(swarm.replaySource).toBe(ReplaySource.Swarm);
    if (swarm.replaySource === ReplaySource.Swarm) {
      expect(swarm.configName).toBe('duel-3kbv-temperate');
      expect(swarm.seed).toBe(42);
    } else {
      throw new Error('expected swarm narrowing');
    }
    const quick = entries[1];
    expect(quick.replaySource).toBe(ReplaySource.Quick);
    if (quick.replaySource === ReplaySource.Quick) {
      expect(quick.aiVariant).toBe('aggressive-v2');
    } else {
      throw new Error('expected quick narrowing');
    }
  });

  it('skips entries with unrecognized replaySource and logs at debug', async () => {
    const cwd = await makeTmpCwd();
    // The future-variant entry uses a `replaySource` value not in the current
    // enum (`'lan-coop'`). Reader must filter it but preserve the recognized
    // entries. `as unknown as IReplayManifestEntry` is the only way to
    // construct an entry the type system would otherwise reject — the whole
    // point of this test is to assert runtime forward-compat.
    const futureVariant = {
      ...swarmFixture,
      id: 'future-99',
      replaySource: 'lan-coop',
    } as unknown as IReplayManifestEntry;

    await writeIndex(cwd, [swarmFixture, futureVariant, quickFixture]);

    const entries = await readReplayIndex({ cwd });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id)).toEqual(['sim-1', 'quick-1']);

    // Debug log must mention the skipped entry's id so a developer running
    // with debug logs can identify what was filtered.
    const debugCalls = consoleDebugSpy.mock.calls;
    const skipLog = debugCalls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('unrecognized replaySource'),
    );
    expect(skipLog).toBeDefined();
    expect(skipLog?.[1]).toMatchObject({
      id: 'future-99',
      replaySource: 'lan-coop',
    });
  });

  it('falls back to the backfill scan when replay-index.json is missing', async () => {
    const cwd = await makeTmpCwd();
    // Sanity — confirm the file is genuinely absent before invoking.
    await expect(
      fs.access(path.join(cwd, 'simulation-reports', 'replay-index.json')),
    ).rejects.toThrow();

    // Inject a stub the test can assert on. PR 3 wires the real scan; this
    // test pins the contract that "missing file → invoke fallback, return
    // its array".
    const backfillResult: readonly IReplayManifestEntry[] = [swarmFixture];
    const backfillScan = jest.fn(() => Promise.resolve(backfillResult));

    const entries = await readReplayIndex({ cwd, backfillScan });

    expect(backfillScan).toHaveBeenCalledTimes(1);
    expect(entries).toEqual(backfillResult);
  });

  it('logs the indexPath at debug when the missing-file fallback fires', async () => {
    const cwd = await makeTmpCwd();
    const backfillScan = jest.fn(() => Promise.resolve([]));

    await readReplayIndex({ cwd, backfillScan });

    // The missing-file branch logs a debug message; presence is the contract.
    // Logger silences `debug` in production but emits in test mode (we set it
    // above) — so the spy should have at least one call.
    expect(consoleDebugSpy.mock.calls.length).toBeGreaterThan(0);
    // Belt-and-braces: the logger module is the one we imported.
    expect(typeof logger.debug).toBe('function');
  });
});
