/**
 * Tests for the central replay-index writer.
 *
 * Covers the four Central Replay Index Writer spec scenarios:
 *   1. Append preserves existing entries (1 → 2; 100 → 101)
 *   2. Atomic write — simulate crash mid-write (mock fs.rename to throw
 *      after the temp file is written) and verify the original index is
 *      intact AND the orphan temp file is not loaded by the reader
 *   3. Writer creates the index file when absent
 *   4. Concurrent appends produce both entries (Promise.all of two appends)
 *
 * Each test mints a fresh tmpdir so concurrent jest workers cannot stomp.
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GameSide, ReplaySource } from '@/types/gameplay';

import type {
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
  ISwarmReplayManifestEntry,
} from '../types';

import { readReplayIndex } from '../index-reader';
import { appendManifestEntry } from '../index-writer';

// ---------------------------------------------------------------------------
// Tmpdir factory + fixture builders
// ---------------------------------------------------------------------------
async function makeTmpCwd(): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'replay-library-writer-'),
  );
  await fs.mkdir(path.join(dir, 'simulation-reports'), { recursive: true });
  return dir;
}

function indexPath(cwd: string): string {
  return path.join(cwd, 'simulation-reports', 'replay-index.json');
}

async function writeIndexJson(cwd: string, contents: unknown): Promise<void> {
  await fs.writeFile(indexPath(cwd), JSON.stringify(contents, null, 2), 'utf8');
}

function makeSwarmEntry(id: string, seed = 42): ISwarmReplayManifestEntry {
  return {
    id,
    replaySource: ReplaySource.Swarm,
    path: `swarm/${id}.jsonl`,
    createdAt: '2026-05-07T12:00:00.000Z',
    turns: 7,
    winner: GameSide.Player,
    bvTotal: 4500,
    configName: 'duel-3kbv-temperate',
    seed,
    batchTimestamp: '2026-05-07T11-58-00-000Z',
  };
}

function makeQuickEntry(id: string): IQuickReplayManifestEntry {
  return {
    id,
    replaySource: ReplaySource.Quick,
    path: `quick/${id}.jsonl`,
    createdAt: '2026-05-07T12:01:00.000Z',
    turns: 5,
    winner: GameSide.Opponent,
    bvTotal: 3200,
    playerSide: GameSide.Player,
    aiVariant: 'aggressive-v2',
  };
}

describe('appendManifestEntry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('appends to an existing 1-entry index → 2 entries', async () => {
    const cwd = await makeTmpCwd();
    const first = makeSwarmEntry('sim-1');
    await writeIndexJson(cwd, [first]);

    await appendManifestEntry(makeQuickEntry('quick-1'), { cwd });

    const after: IReplayManifestEntry[] = JSON.parse(
      await fs.readFile(indexPath(cwd), 'utf8'),
    );
    expect(after).toHaveLength(2);
    // Existing entry preserved verbatim — round-trip via JSON to mirror what
    // the reader sees, NOT a referential check (the writer rebuilds the array).
    expect(after[0]).toEqual(first);
    expect(after[1].id).toBe('quick-1');
  });

  it('appends to a 100-entry index → 101 entries', async () => {
    const cwd = await makeTmpCwd();
    // 100 existing entries — locks the bulk-preservation path.
    const initial: IReplayManifestEntry[] = Array.from(
      { length: 100 },
      (_, i) => makeSwarmEntry(`sim-${i}`, i),
    );
    await writeIndexJson(cwd, initial);

    await appendManifestEntry(makeQuickEntry('quick-new'), { cwd });

    const after: IReplayManifestEntry[] = JSON.parse(
      await fs.readFile(indexPath(cwd), 'utf8'),
    );
    expect(after).toHaveLength(101);
    // Order preserved + every original entry intact.
    for (let i = 0; i < 100; i += 1) {
      expect(after[i]).toEqual(initial[i]);
    }
    expect(after[100].id).toBe('quick-new');
  });

  it('atomic write — fs.rename failure leaves the original index intact', async () => {
    const cwd = await makeTmpCwd();
    const original = [makeSwarmEntry('sim-original')];
    await writeIndexJson(cwd, original);

    // Snapshot the byte-perfect original content so we can assert it survives.
    const originalBytes = await fs.readFile(indexPath(cwd), 'utf8');

    // Mock fs.promises.rename to throw — simulates a crash AFTER the temp
    // file landed but BEFORE the rename finalized.
    const renameSpy = jest
      .spyOn(fs, 'rename')
      .mockImplementationOnce(() =>
        Promise.reject(new Error('simulated mid-write crash')),
      );

    await expect(
      appendManifestEntry(makeQuickEntry('quick-failed'), { cwd }),
    ).rejects.toThrow('simulated mid-write crash');

    // Original index unchanged byte-for-byte.
    expect(await fs.readFile(indexPath(cwd), 'utf8')).toBe(originalBytes);

    // Reader does not pick up any orphan temp file — only `replay-index.json`
    // is read, and the temp suffix is not the canonical name. The writer
    // best-effort-cleans the temp on rename failure, but the contract is
    // "reader does not load it" not "the temp is guaranteed deleted".
    const entries = await readReplayIndex({ cwd });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('sim-original');

    // Sanity — the rename was attempted exactly once (no retry loop).
    expect(renameSpy).toHaveBeenCalledTimes(1);
  });

  it('creates the index file when absent', async () => {
    const cwd = await makeTmpCwd();
    // Sanity — confirm the file is genuinely absent before invoking.
    await expect(fs.access(indexPath(cwd))).rejects.toThrow();

    await appendManifestEntry(makeSwarmEntry('sim-first'), { cwd });

    const after: IReplayManifestEntry[] = JSON.parse(
      await fs.readFile(indexPath(cwd), 'utf8'),
    );
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('sim-first');
  });

  it('creates the parent simulation-reports/ directory when absent', async () => {
    // Edge case — fresh checkout where the writer is the first surface to
    // materialize `simulation-reports/`. We use a tmpdir that does NOT
    // pre-create the subdir.
    const cwd = await fs.mkdtemp(
      path.join(os.tmpdir(), 'replay-library-writer-fresh-'),
    );
    await expect(
      fs.access(path.join(cwd, 'simulation-reports')),
    ).rejects.toThrow();

    await appendManifestEntry(makeSwarmEntry('sim-genesis'), { cwd });

    const after: IReplayManifestEntry[] = JSON.parse(
      await fs.readFile(indexPath(cwd), 'utf8'),
    );
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('sim-genesis');
  });

  it('concurrent appends serialize — both entries land', async () => {
    const cwd = await makeTmpCwd();
    // Empty starting state — both appends create-or-extend safely.
    await Promise.all([
      appendManifestEntry(makeSwarmEntry('sim-a'), { cwd }),
      appendManifestEntry(makeQuickEntry('quick-b'), { cwd }),
    ]);

    const after: IReplayManifestEntry[] = JSON.parse(
      await fs.readFile(indexPath(cwd), 'utf8'),
    );
    expect(after).toHaveLength(2);
    // Order is deterministic via the per-path mutex (FIFO on the queue).
    // Identity assertion — both ids are present, regardless of order.
    const ids = after.map((e) => e.id).sort();
    expect(ids).toEqual(['quick-b', 'sim-a']);
  });

  // -------------------------------------------------------------------------
  // PT-101 regression: appending an entry whose `id` already exists in the
  // index replaces the existing entry (last-write-wins) instead of
  // accumulating duplicates. Surfaced by the Phase-2 SP smoke run when the
  // swarm matrix was re-executed and the central index grew from 130 to 378
  // entries with only 98 unique IDs — Replay Library renders crashed with
  // duplicate React keys.
  // -------------------------------------------------------------------------
  it('replaces an existing entry with the same id (last-write-wins) — PT-101', async () => {
    const cwd = await makeTmpCwd();

    // First write: seed=42, 7 turns
    const first = makeSwarmEntry('sim-20260520', 42);
    await appendManifestEntry(first, { cwd });

    // Second write: same id, different payload (simulate a re-run that
    // produces an identical id with refreshed metadata)
    const second: ISwarmReplayManifestEntry = {
      ...makeSwarmEntry('sim-20260520', 42),
      turns: 12,
      bvTotal: 6000,
      configName: 'rerun-config',
    };
    await appendManifestEntry(second, { cwd });

    const after = await readReplayIndex({ cwd });
    expect(after).toHaveLength(1);
    // Confirms last-write-wins: the newer entry's fields are present.
    expect(after[0]).toMatchObject({
      id: 'sim-20260520',
      turns: 12,
      bvTotal: 6000,
    });
  });

  it('preserves non-conflicting entries when deduping by id — PT-101', async () => {
    const cwd = await makeTmpCwd();

    await appendManifestEntry(makeSwarmEntry('sim-a', 1), { cwd });
    await appendManifestEntry(makeQuickEntry('quick-b'), { cwd });
    await appendManifestEntry(makeSwarmEntry('sim-c', 2), { cwd });

    // Replace `sim-a` only — `quick-b` and `sim-c` should stay.
    await appendManifestEntry(
      { ...makeSwarmEntry('sim-a', 1), turns: 99 },
      { cwd },
    );

    const after = await readReplayIndex({ cwd });
    expect(after).toHaveLength(3);
    const byId = Object.fromEntries(after.map((e) => [e.id, e]));
    expect(byId['sim-a']?.turns).toBe(99);
    expect(byId['quick-b']).toBeDefined();
    expect(byId['sim-c']).toBeDefined();
  });
});
