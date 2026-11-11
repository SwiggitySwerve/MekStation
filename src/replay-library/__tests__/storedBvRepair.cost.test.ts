import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { persistQuickGame } from '@/components/quickgame/persistQuickGame';
import { createGameSession } from '@/utils/gameplay/gameSession';

import { readReplayIndex } from '../index-reader';
import { appendManifestEntry } from '../index-writer';

it('measures one-time repair of 300 production-written recordings', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'bv-cost-'));
  try {
    for (let i = 0; i < 300; i++) {
      const session = createGameSession(
        {
          mapRadius: 3,
          turnLimit: 1,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        [],
      );
      const result = await persistQuickGame({
        gameId: session.id,
        events: session.events,
        winner: null,
        aiVariant: 'cost',
        cwd,
        ...(i % 2 === 0 ? { bvTotal: 0 } : {}),
      });
      if (!result.manifestEntry)
        throw new Error('Production writer did not persist');
      await appendManifestEntry(
        { ...result.manifestEntry, bvTotal: 0 },
        { cwd },
      );
    }
    const start = performance.now();
    const first = await readReplayIndex({ cwd, repairStoredBv: true });
    const firstMs = performance.now() - start;
    const secondStart = performance.now();
    expect(await readReplayIndex({ cwd, repairStoredBv: true })).toEqual(first);
    const repeatMs = performance.now() - secondStart;
    expect(first.filter((row) => row.bvTotal === 0)).toHaveLength(150);
    expect(first.filter((row) => row.bvTotal === null)).toHaveLength(150);
    console.info(JSON.stringify({ recordings: 300, firstMs, repeatMs }));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}, 30000);
