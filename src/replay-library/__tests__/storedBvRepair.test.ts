import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GameSide, ReplaySource } from '@/types/gameplay';

import { readReplayIndex } from '../index-reader';
import { appendManifestEntry } from '../index-writer';

it('repairs unknown, missing and unreadable recordings once and preserves confirmed zero', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stored-bv-'));
  try {
    const reports = path.join(cwd, 'simulation-reports');
    await fs.mkdir(path.join(reports, 'quick'), { recursive: true });
    for (const id of ['zero', 'unknown', 'missing', 'unreadable']) {
      await appendManifestEntry(
        {
          id,
          replaySource: ReplaySource.Quick,
          path: `quick/${id}.jsonl`,
          createdAt: '',
          turns: 1,
          winner: null,
          bvTotal: 0,
          playerSide: GameSide.Player,
          aiVariant: 'test',
        },
        { cwd },
      );
      if (id !== 'missing')
        await fs.writeFile(
          path.join(reports, `quick/${id}.jsonl`),
          id === 'unreadable'
            ? 'unreadable'
            : JSON.stringify({
                type: 'game_created',
                payload: {
                  units: [],
                  ...(id === 'zero' ? { quickMeta: { bvTotal: 0 } } : {}),
                },
              }),
        );
    }
    const recordingPaths = ['zero', 'unknown', 'unreadable'].map((id) =>
      path.join(reports, `quick/${id}.jsonl`),
    );
    const originalRecordings = await Promise.all(
      recordingPaths.map((file) => fs.readFile(file, 'utf8')),
    );
    const first = await readReplayIndex({ cwd, repairStoredBv: true });
    expect(
      await Promise.all(
        recordingPaths.map((file) => fs.readFile(file, 'utf8')),
      ),
    ).toEqual(originalRecordings);

    expect(first.find((row) => row.id === 'zero')?.bvTotal).toBe(0);
    for (const id of ['unknown', 'missing', 'unreadable'])
      expect(first.find((row) => row.id === id)?.bvTotal).toBeNull();
    const index = path.join(reports, 'replay-index.json');
    const before = await fs.readFile(index, 'utf8');
    await fs.writeFile(
      path.join(reports, 'quick/zero.jsonl'),
      'now unreadable',
    );
    await fs.writeFile(
      path.join(reports, 'quick/unknown.jsonl'),
      JSON.stringify({
        type: 'game_created',
        payload: { quickMeta: { bvTotal: 999 } },
      }),
    );
    expect(await readReplayIndex({ cwd, repairStoredBv: true })).toEqual(first);
    expect(await fs.readFile(index, 'utf8')).toBe(before);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
