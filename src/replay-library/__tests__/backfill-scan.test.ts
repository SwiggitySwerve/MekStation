import './backfill-scan.01.layouts.fragment';
import './backfill-scan.02.hardening.fragment';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { scanReplayDirectory } from '../backfill-scan';
import {
  gameCreatedEvent,
  makeTmpCwd,
  writeNDJSON,
} from './backfill-scan.test-helpers';

it('recovers event turn and preserved quick BV metadata without TurnStarted events', async () => {
  const cwd = await makeTmpCwd();
  try {
    await writeNDJSON(
      path.join(cwd, 'simulation-reports/quick/metadata.jsonl'),
      [
        gameCreatedEvent('metadata', [], { quickMeta: { bvTotal: 3909 } }),
        { type: 'phase_changed', turn: 4, payload: {} },
      ],
    );
    const rows = await scanReplayDirectory({ cwd });
    expect(rows[0]).toMatchObject({ turns: 4, bvTotal: 3909 });
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
