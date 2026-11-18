import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

import type { IGameEvent } from '@/types/gameplay';

import { replayBvTotal } from './eventMetadata';

/** Read only: missing, unreadable, or unrecorded BV is unknown. */
export async function readRecordedBv(
  reportsRoot: string,
  recordingPath: string,
): Promise<number | null> {
  const absolute = path.resolve(reportsRoot, recordingPath);
  const relative = path.relative(reportsRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const stream = createReadStream(absolute, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      const event: unknown = JSON.parse(line);
      if (
        event !== null &&
        typeof event === 'object' &&
        'type' in event &&
        event.type === 'game_created'
      ) {
        return replayBvTotal(event as IGameEvent) ?? null;
      }
    }
    return null;
  } catch {
    // A damaged/unavailable recording cannot establish a historical value.
    return null;
  } finally {
    lines.close();
    stream.destroy();
  }
}
